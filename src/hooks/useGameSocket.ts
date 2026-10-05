import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PublicSessionState, 
  Participant, 
  GameSettings, 
  FinalGameSummary 
} from '../types/game';
import { sounds } from '../utils/sound';

interface UseGameSocketReturn {
  isConnected: boolean;
  sessionState: PublicSessionState | null;
  detailedParticipants: Participant[];
  personalInfo: {
    id: string;
    name: string;
    score: number;
    lastPointsEarned: number;
    hasAnswered: boolean;
    selectedOption: number | null;
    rank: number;
    streak: number;
  } | null;
  finalSummary: FinalGameSummary | null;
  errorMessage: string | null;
  createSession: (settings: GameSettings) => void;
  reconnectInstructor: (pin: string) => void;
  joinSession: (pin: string, name: string, ficha?: string, participantId?: string) => void;
  addDemoLearners: () => void;
  startGame: () => void;
  submitAnswer: (selectedIndex: number) => void;
  pauseResume: () => void;
  revealAnswer: () => void;
  showLeaderboard: () => void;
  nextQuestion: () => void;
  endGame: () => void;
  clearError: () => void;
}

export function useGameSocket(): UseGameSocketReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [sessionState, setSessionState] = useState<PublicSessionState | null>(null);
  const [detailedParticipants, setDetailedParticipants] = useState<Participant[]>([]);
  const [personalInfo, setPersonalInfo] = useState<UseGameSocketReturn['personalInfo']>(null);
  const [finalSummary, setFinalSummary] = useState<FinalGameSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateStatusRef = useRef<string | null>(null);

  const send = useCallback((payload: object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setErrorMessage(null);

      // Check if we need to restore instructor or learner session
      const savedPin = localStorage.getItem('to_be_active_pin');
      const savedRole = localStorage.getItem('to_be_role');
      const savedPartId = localStorage.getItem('to_be_participant_id');
      const savedLearnerName = localStorage.getItem('to_be_learner_name');
      const savedLearnerFicha = localStorage.getItem('to_be_learner_ficha') || undefined;

      if (savedPin) {
        if (savedRole === 'instructor') {
          ws.send(JSON.stringify({ action: 'RECONNECT_INSTRUCTOR', pin: savedPin }));
        } else if (savedRole === 'learner' && savedLearnerName) {
          ws.send(JSON.stringify({
            action: 'JOIN_SESSION',
            pin: savedPin,
            name: savedLearnerName,
            ficha: savedLearnerFicha,
            participantId: savedPartId || undefined
          }));
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { action } = data;

        switch (action) {
          case 'SESSION_CREATED': {
            setSessionState(data.state);
            setDetailedParticipants(data.detailedParticipants || []);
            localStorage.setItem('to_be_active_pin', data.pin);
            break;
          }

          case 'SESSION_RECONNECTED': {
            setSessionState(data.state);
            setDetailedParticipants(data.detailedParticipants || []);
            break;
          }

          case 'JOIN_SUCCESS': {
            setSessionState(data.state);
            setPersonalInfo(data.personal);
            localStorage.setItem('to_be_active_pin', data.pin);
            if (data.participantId) {
              localStorage.setItem('to_be_participant_id', data.participantId);
            }
            break;
          }

          case 'JOIN_ERROR': {
            setErrorMessage(data.message || 'Error joining game session.');
            break;
          }

          case 'SESSION_STATE_UPDATE': {
            const newState: PublicSessionState = data.state;
            
            // Audio cue triggers when status changes
            if (lastStateStatusRef.current !== newState.status) {
              if (newState.status === 'question_active') {
                sounds.playTick();
              } else if (newState.status === 'question_ended') {
                if (data.personal) {
                  if (data.personal.lastPointsEarned > 0) {
                    sounds.playCorrect();
                  } else {
                    sounds.playIncorrect();
                  }
                }
              }
              lastStateStatusRef.current = newState.status;
            }

            // Countdown tick on final 3 seconds
            if (newState.status === 'question_active' && newState.timeRemaining <= 3 && newState.timeRemaining > 0) {
              sounds.playTick();
            }

            setSessionState(newState);
            if (data.detailedParticipants) {
              setDetailedParticipants(data.detailedParticipants);
            }
            if (data.personal) {
              setPersonalInfo(data.personal);
            }
            break;
          }

          case 'ANSWER_RECEIVED': {
            setPersonalInfo(prev => prev ? {
              ...prev,
              hasAnswered: true,
              selectedOption: data.selectedIndex
            } : null);
            break;
          }

          case 'GAME_FINISHED': {
            setSessionState(data.state);
            setFinalSummary(data.summary);
            sounds.playFanfare();
            break;
          }

          case 'ERROR': {
            setErrorMessage(data.message);
            break;
          }

          default:
            break;
        }
      } catch (e) {
        console.error('Failed to parse socket message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
      // Exponential auto-reconnect
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error:', err);
    };

    socketRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // Public Actions
  const createSession = useCallback((settings: GameSettings) => {
    send({ action: 'CREATE_SESSION', settings });
  }, [send]);

  const reconnectInstructor = useCallback((pin: string) => {
    send({ action: 'RECONNECT_INSTRUCTOR', pin });
  }, [send]);

  const joinSession = useCallback((pin: string, name: string, ficha?: string, participantId?: string) => {
    send({ action: 'JOIN_SESSION', pin, name, ficha, participantId });
  }, [send]);

  const addDemoLearners = useCallback(() => {
    send({ action: 'ADD_DEMO_LEARNERS' });
  }, [send]);

  const startGame = useCallback(() => {
    send({ action: 'START_GAME' });
  }, [send]);

  const submitAnswer = useCallback((selectedIndex: number) => {
    sounds.playSelect();
    const pin = sessionState?.pin;
    const participantId = personalInfo?.id;
    send({ action: 'SUBMIT_ANSWER', pin, participantId, selectedIndex });
  }, [send, sessionState?.pin, personalInfo?.id]);

  const pauseResume = useCallback(() => {
    send({ action: 'PAUSE_RESUME' });
  }, [send]);

  const revealAnswer = useCallback(() => {
    send({ action: 'REVEAL_ANSWER' });
  }, [send]);

  const showLeaderboard = useCallback(() => {
    send({ action: 'SHOW_LEADERBOARD' });
  }, [send]);

  const nextQuestion = useCallback(() => {
    send({ action: 'NEXT_QUESTION' });
  }, [send]);

  const endGame = useCallback(() => {
    send({ action: 'END_GAME' });
  }, [send]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    isConnected,
    sessionState,
    detailedParticipants,
    personalInfo,
    finalSummary,
    errorMessage,
    createSession,
    reconnectInstructor,
    joinSession,
    addDemoLearners,
    startGame,
    submitAnswer,
    pauseResume,
    revealAnswer,
    showLeaderboard,
    nextQuestion,
    endGame,
    clearError
  };
}
