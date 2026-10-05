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
  createSession: (settings: GameSettings) => Promise<PublicSessionState>;
  reconnectInstructor: (pin: string) => Promise<void>;
  joinSession: (pin: string, name: string, ficha?: string, participantId?: string) => Promise<void>;
  addDemoLearners: () => Promise<void>;
  startGame: () => Promise<void>;
  submitAnswer: (selectedIndex: number) => Promise<void>;
  pauseResume: () => Promise<void>;
  revealAnswer: () => Promise<void>;
  showLeaderboard: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  endGame: () => Promise<void>;
  clearError: () => void;
}

export function useGameSocket(): UseGameSocketReturn {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [sessionState, setSessionState] = useState<PublicSessionState | null>(null);
  const [detailedParticipants, setDetailedParticipants] = useState<Participant[]>([]);
  const [personalInfo, setPersonalInfo] = useState<UseGameSocketReturn['personalInfo']>(null);
  const [finalSummary, setFinalSummary] = useState<FinalGameSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastStateStatusRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Apply incoming session state update
  const applyStateUpdate = useCallback((
    newState: PublicSessionState, 
    detailedParts?: Participant[], 
    personal?: UseGameSocketReturn['personalInfo'],
    summary?: FinalGameSummary | null
  ) => {
    // Audio triggers
    if (lastStateStatusRef.current !== newState.status) {
      if (newState.status === 'question_active') {
        sounds.playTick();
      } else if (newState.status === 'question_ended') {
        if (personal) {
          if (personal.lastPointsEarned > 0) {
            sounds.playCorrect();
          } else {
            sounds.playIncorrect();
          }
        }
      } else if (newState.status === 'finished') {
        sounds.playFanfare();
      }
      lastStateStatusRef.current = newState.status;
    }

    // Tick on last 3s
    if (newState.status === 'question_active' && newState.timeRemaining <= 3 && newState.timeRemaining > 0) {
      sounds.playTick();
    }

    setSessionState(newState);
    if (detailedParts) {
      setDetailedParticipants(detailedParts);
    }
    if (personal) {
      setPersonalInfo(prev => ({
        ...prev,
        ...personal
      }));
    }
    if (summary) {
      setFinalSummary(summary);
    }
  }, []);

  // Real-time synchronization (SSE stream + fallback polling)
  useEffect(() => {
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    if (!pin) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const role = localStorage.getItem('to_be_role') || 'learner';
    const participantId = personalInfo?.id || localStorage.getItem('to_be_participant_id') || '';

    // Connect SSE
    const sseUrl = `/api/session/${pin}/events?role=${role}&participantId=${encodeURIComponent(participantId)}`;
    const es = new EventSource(sseUrl);

    es.onopen = () => {
      setIsConnected(true);
      setErrorMessage(null);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === 'SESSION_STATE_UPDATE') {
          applyStateUpdate(data.state, data.detailedParticipants, data.personal, data.summary);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    eventSourceRef.current = es;

    // Polling every 1200ms
    const poll = async () => {
      try {
        const res = await fetch(`/api/session/${pin}?participantId=${encodeURIComponent(participantId)}`);
        if (res.ok) {
          const data = await res.json();
          setIsConnected(true);
          applyStateUpdate(data.state, data.detailedParticipants, data.personal, data.summary);
        }
      } catch {
        // Network polling error
      }
    };

    pollingIntervalRef.current = setInterval(poll, 1200);

    return () => {
      es.close();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [sessionState?.pin, personalInfo?.id, applyStateUpdate]);

  // Initial load check
  useEffect(() => {
    const savedPin = localStorage.getItem('to_be_active_pin');
    const savedRole = localStorage.getItem('to_be_role');
    const savedPartId = localStorage.getItem('to_be_participant_id');
    const savedName = localStorage.getItem('to_be_learner_name');

    if (savedPin && savedRole) {
      fetch(`/api/session/${savedPin}?participantId=${savedPartId || ''}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Not found');
        })
        .then(data => {
          applyStateUpdate(data.state, data.detailedParticipants, data.personal, data.summary);
          if (data.personal) {
            setPersonalInfo(data.personal);
          } else if (savedPartId && savedName) {
            setPersonalInfo({
              id: savedPartId,
              name: savedName,
              score: 0,
              lastPointsEarned: 0,
              hasAnswered: false,
              selectedOption: null,
              rank: 1,
              streak: 0
            });
          }
        })
        .catch(() => {
          // Stale session
          localStorage.removeItem('to_be_active_pin');
        });
    }
  }, [applyStateUpdate]);

  // 1. CREATE SESSION
  const createSession = useCallback(async (settings: GameSettings): Promise<PublicSessionState> => {
    setErrorMessage(null);
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          settings,
          questionCount: settings.totalQuestions,
          category: settings.categoryFilter,
          timePerQuestion: settings.timerSeconds,
          selectionMode: settings.questionMode
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.error || `Error al crear la sesión (HTTP ${res.status})`;
        console.error('[useGameSocket] Error creating session:', res.status, errorData);
        setErrorMessage(message);
        throw new Error(message);
      }

      const data = await res.json();
      if (!data.success) {
        const message = data.error || 'Error desconocido al crear la sesión';
        console.error('[useGameSocket] Session creation unsuccessful:', message);
        setErrorMessage(message);
        throw new Error(message);
      }

      const pin = data.gamePin || data.pin || data.session?.gamePin;
      if (pin) {
        localStorage.setItem('to_be_active_pin', pin);
      }
      if (data.instructorSecret) {
        localStorage.setItem('to_be_instructor_secret', data.instructorSecret);
      }

      const state: PublicSessionState = data.state || {
        pin: pin || '',
        status: 'lobby',
        currentQuestionIndex: 0,
        totalQuestions: data.session?.questionCount || settings.totalQuestions || 10,
        timeRemaining: data.session?.timePerQuestion || settings.timerSeconds || 20,
        totalTimerSeconds: data.session?.timePerQuestion || settings.timerSeconds || 20,
        isPaused: false,
        participantsCount: 0,
        answeredCount: 0,
        answerDistribution: [0, 0, 0, 0],
        leaderboard: []
      };

      setSessionState(state);
      setDetailedParticipants(data.detailedParticipants || []);
      return state;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al crear sesión';
      setErrorMessage(msg);
      throw err;
    }
  }, []);

  // 2. RECONNECT INSTRUCTOR
  const reconnectInstructor = useCallback(async (pin: string) => {
    try {
      const res = await fetch(`/api/session/${pin}`);
      if (!res.ok) throw new Error('Sesión no encontrada');
      const data = await res.json();
      localStorage.setItem('to_be_active_pin', pin);
      applyStateUpdate(data.state, data.detailedParticipants, undefined, data.summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo reconectar';
      setErrorMessage(msg);
    }
  }, [applyStateUpdate]);

  // 3. JOIN SESSION
  const joinSession = useCallback(async (pin: string, name: string, ficha?: string, participantId?: string) => {
    try {
      setErrorMessage(null);
      const res = await fetch('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, name, ficha, participantId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Game PIN no encontrado o sesión inválida');
      }

      const data = await res.json();
      localStorage.setItem('to_be_active_pin', data.gamePin || data.pin);
      if (data.participantId) {
        localStorage.setItem('to_be_participant_id', data.participantId);
      }
      setSessionState(data.state);
      setPersonalInfo(data.personal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al unirse a la sala';
      setErrorMessage(msg);
      throw err;
    }
  }, []);

  // 4. ADD DEMO LEARNERS
  const addDemoLearners = useCallback(async () => {
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    if (!pin) return;
    try {
      const res = await fetch('/api/session/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionState(data.state);
        setDetailedParticipants(data.detailedParticipants || []);
      }
    } catch (err) {
      console.error('Error adding demo learners:', err);
    }
  }, [sessionState?.pin]);

  // 5. START GAME
  const startGame = useCallback(async () => {
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    if (!pin) return;
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionState(data.state);
      }
    } catch (err) {
      console.error('Error starting game:', err);
    }
  }, [sessionState?.pin]);

  // 6. SUBMIT ANSWER
  const submitAnswer = useCallback(async (selectedIndex: number) => {
    sounds.playSelect();
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    const participantId = personalInfo?.id || localStorage.getItem('to_be_participant_id');
    if (!pin || !participantId) return;

    setPersonalInfo(prev => prev ? {
      ...prev,
      hasAnswered: true,
      selectedOption: selectedIndex
    } : null);

    try {
      await fetch('/api/session/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, participantId, selectedIndex })
      });
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  }, [sessionState?.pin, personalInfo?.id]);

  // 7. PAUSE / RESUME
  const pauseResume = useCallback(async () => {
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    if (!pin) return;
    try {
      await fetch('/api/session/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
    } catch (err) {
      console.error('Error toggling pause:', err);
    }
  }, [sessionState?.pin]);

  // 8. REVEAL ANSWER
  const revealAnswer = useCallback(async () => {
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    if (!pin) return;
    try {
      await fetch('/api/session/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
    } catch (err) {
      console.error('Error revealing answer:', err);
    }
  }, [sessionState?.pin]);

  // 9. SHOW LEADERBOARD
  const showLeaderboard = useCallback(async () => {
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    if (!pin) return;
    try {
      await fetch('/api/session/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
    } catch (err) {
      console.error('Error showing leaderboard:', err);
    }
  }, [sessionState?.pin]);

  // 10. NEXT QUESTION
  const nextQuestion = useCallback(async () => {
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    if (!pin) return;
    try {
      await fetch('/api/session/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
    } catch (err) {
      console.error('Error moving to next question:', err);
    }
  }, [sessionState?.pin]);

  // 11. END GAME
  const endGame = useCallback(async () => {
    const pin = sessionState?.pin || localStorage.getItem('to_be_active_pin');
    if (!pin) return;
    try {
      const res = await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) {
        const data = await res.json();
        setFinalSummary(data.summary);
      }
    } catch (err) {
      console.error('Error ending game:', err);
    }
  }, [sessionState?.pin]);

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
