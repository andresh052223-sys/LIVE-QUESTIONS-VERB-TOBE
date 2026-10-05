import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { QUESTIONS_BANK, DEMO_LEARNERS } from './src/data/questions';
import { 
  Question, 
  Participant, 
  GameSettings, 
  SessionStatus, 
  PublicSessionState, 
  FinalGameSummary,
  QuestionCategory
} from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

app.use(express.json());

interface ServerGameSession {
  pin: string;
  instructorWs: WebSocket | null;
  instructorId: string;
  status: SessionStatus;
  settings: GameSettings;
  questions: Question[];
  currentQuestionIndex: number;
  participants: Map<string, Participant>;
  participantSockets: Map<string, WebSocket>;
  timeRemaining: number;
  timerInterval: NodeJS.Timeout | null;
  isPaused: boolean;
  demoTimeouts: NodeJS.Timeout[];
}

const activeSessions = new Map<string, ServerGameSession>();

// Generate unique 6-digit PIN
function generateGamePin(): string {
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  if (activeSessions.has(pin)) {
    return generateGamePin();
  }
  return pin;
}

// Compute ranked leaderboard
function calculateLeaderboard(session: ServerGameSession) {
  const list = Array.from(session.participants.values())
    .map(p => ({
      id: p.id,
      name: p.name,
      ficha: p.ficha,
      score: p.score,
      streak: p.streak,
      lastPoints: p.lastPointsEarned,
      isOnline: p.isOnline
    }))
    .sort((a, b) => b.score - a.score);

  return list.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
}

// Build public session state for broadcast
function buildPublicState(session: ServerGameSession, forLearner: boolean = false): PublicSessionState {
  const currentQ = session.questions[session.currentQuestionIndex];
  const participantsArr = Array.from(session.participants.values());
  const answeredCount = participantsArr.filter(p => p.hasAnswered).length;
  
  // Calculate distribution
  const distribution: [number, number, number, number] = [0, 0, 0, 0];
  if (session.status === 'question_ended' || session.status === 'leaderboard' || session.status === 'finished') {
    participantsArr.forEach(p => {
      if (p.selectedOption !== null && p.selectedOption >= 0 && p.selectedOption <= 3) {
        distribution[p.selectedOption]++;
      }
    });
  }

  let sanitizedQuestion: PublicSessionState['currentQuestion'] = undefined;
  if (currentQ) {
    const showAnswers = session.status === 'question_ended' || session.status === 'leaderboard' || session.status === 'finished';
    sanitizedQuestion = {
      id: currentQ.id,
      category: currentQ.category,
      categoryLabel: currentQ.categoryLabel,
      question: currentQ.question,
      options: currentQ.options,
      correctIndex: showAnswers ? currentQ.correctIndex : undefined,
      explanation: showAnswers ? currentQ.explanation : undefined,
      difficulty: currentQ.difficulty
    };
  }

  return {
    pin: session.pin,
    status: session.status,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.questions.length,
    currentQuestion: sanitizedQuestion,
    timeRemaining: session.timeRemaining,
    totalTimerSeconds: session.settings.timerSeconds,
    isPaused: session.isPaused,
    participantsCount: session.participants.size,
    answeredCount,
    answerDistribution: distribution,
    leaderboard: calculateLeaderboard(session)
  };
}

// Broadcast to all participants and instructor
function broadcastSessionState(session: ServerGameSession) {
  const publicState = buildPublicState(session);
  const instructorPayload = JSON.stringify({
    action: 'SESSION_STATE_UPDATE',
    state: publicState,
    detailedParticipants: Array.from(session.participants.values())
  });

  if (session.instructorWs && session.instructorWs.readyState === WebSocket.OPEN) {
    session.instructorWs.send(instructorPayload);
  }

  session.participants.forEach((p, pId) => {
    const ws = session.participantSockets.get(pId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const personalRank = publicState.leaderboard.find(item => item.id === p.id)?.rank || 1;
      ws.send(JSON.stringify({
        action: 'SESSION_STATE_UPDATE',
        state: publicState,
        personal: {
          id: p.id,
          name: p.name,
          score: p.score,
          lastPointsEarned: p.lastPointsEarned,
          hasAnswered: p.hasAnswered,
          selectedOption: p.selectedOption,
          rank: personalRank,
          streak: p.streak
        }
      }));
    }
  });
}

function clearSessionTimers(session: ServerGameSession) {
  if (session.timerInterval) {
    clearInterval(session.timerInterval);
    session.timerInterval = null;
  }
  session.demoTimeouts.forEach(t => clearTimeout(t));
  session.demoTimeouts = [];
}

// End the current question and reveal answers
function handleQuestionEnd(session: ServerGameSession) {
  clearSessionTimers(session);
  session.status = 'question_ended';
  session.timeRemaining = 0;

  const currentQ = session.questions[session.currentQuestionIndex];
  if (currentQ) {
    // Check any unanswered active participants
    session.participants.forEach(p => {
      if (!p.hasAnswered) {
        p.hasAnswered = true;
        p.selectedOption = null;
        p.lastPointsEarned = 0;
        p.streak = 0;
        p.answers.push({
          questionId: currentQ.id,
          selectedIndex: -1,
          isCorrect: false,
          points: 0,
          timeSpentSeconds: session.settings.timerSeconds
        });
      }
    });
  }

  broadcastSessionState(session);
}

// Start timer for question
function startQuestionTimer(session: ServerGameSession) {
  clearSessionTimers(session);
  session.status = 'question_active';
  session.timeRemaining = session.settings.timerSeconds;
  session.isPaused = false;

  // Reset participant response state for this question
  session.participants.forEach(p => {
    p.hasAnswered = false;
    p.selectedOption = null;
    p.lastPointsEarned = 0;
  });

  const currentQ = session.questions[session.currentQuestionIndex];

  // Schedule simulated demo learners
  session.participants.forEach((p, pId) => {
    if (p.isSimulated && currentQ) {
      // Delay between 1.5s and timerSeconds - 1s
      const maxDelay = Math.max(2, session.settings.timerSeconds - 2);
      const delaySeconds = 1.2 + Math.random() * (maxDelay - 1.2);
      const timeout = setTimeout(() => {
        if (session.status !== 'question_active' || p.hasAnswered) return;
        // 80% correct answer
        const willBeCorrect = Math.random() < 0.82;
        let chosenOption = currentQ.correctIndex;
        if (!willBeCorrect) {
          const wrongOptions = [0, 1, 2, 3].filter(idx => idx !== currentQ.correctIndex);
          chosenOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        }

        const remaining = Math.max(1, session.timeRemaining);
        const points = chosenOption === currentQ.correctIndex
          ? Math.round(500 + 500 * (remaining / session.settings.timerSeconds))
          : 0;

        p.hasAnswered = true;
        p.selectedOption = chosenOption;
        p.lastPointsEarned = points;
        p.score += points;
        p.streak = points > 0 ? p.streak + 1 : 0;
        p.answers.push({
          questionId: currentQ.id,
          selectedIndex: chosenOption,
          isCorrect: points > 0,
          points,
          timeSpentSeconds: session.settings.timerSeconds - remaining
        });

        broadcastSessionState(session);

        // Check if all answered
        const allAnswered = Array.from(session.participants.values()).every(part => part.hasAnswered);
        if (allAnswered) {
          handleQuestionEnd(session);
        }
      }, delaySeconds * 1000);

      session.demoTimeouts.push(timeout);
    }
  });

  broadcastSessionState(session);

  // Authoritative 1s tick
  session.timerInterval = setInterval(() => {
    if (session.isPaused) return;

    session.timeRemaining -= 1;
    if (session.timeRemaining <= 0) {
      handleQuestionEnd(session);
    } else {
      broadcastSessionState(session);
    }
  }, 1000);
}

// Compute final game summary report
function buildFinalSummary(session: ServerGameSession): FinalGameSummary {
  const participants = Array.from(session.participants.values());
  const ranked = calculateLeaderboard(session);
  const totalScore = participants.reduce((sum, p) => sum + p.score, 0);
  const avgScore = participants.length > 0 ? Math.round(totalScore / participants.length) : 0;
  const topScore = ranked[0]?.score || 0;
  const winner = ranked[0]?.name || 'N/A';

  // Overall accuracy
  let totalAnswers = 0;
  let totalCorrect = 0;

  // Track per-question difficulty
  const questionAccuracyMap = new Map<string, { correct: number; total: number; text: string }>();

  session.questions.forEach(q => {
    questionAccuracyMap.set(q.id, { correct: 0, total: 0, text: q.question });
  });

  participants.forEach(p => {
    p.answers.forEach(a => {
      totalAnswers++;
      if (a.isCorrect) totalCorrect++;

      const qStat = questionAccuracyMap.get(a.questionId);
      if (qStat) {
        qStat.total++;
        if (a.isCorrect) qStat.correct++;
      }
    });
  });

  const overallAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  // Find most difficult question (lowest accuracy with at least 1 answer)
  let lowestAccuracy = 101;
  let hardestText = '';
  questionAccuracyMap.forEach((stat) => {
    if (stat.total > 0) {
      const acc = (stat.correct / stat.total) * 100;
      if (acc < lowestAccuracy) {
        lowestAccuracy = acc;
        hardestText = stat.text;
      }
    }
  });

  return {
    pin: session.pin,
    totalParticipants: participants.length,
    totalQuestions: session.questions.length,
    averageScore: avgScore,
    highestScore: topScore,
    winnerName: winner,
    overallAccuracy,
    mostDifficultQuestion: hardestText ? {
      questionText: hardestText,
      accuracyPercentage: Math.round(lowestAccuracy)
    } : undefined,
    participantsRanked: ranked.map(p => {
      const partObj = session.participants.get(p.id);
      const pAnswers = partObj?.answers || [];
      const correct = pAnswers.filter(a => a.isCorrect).length;
      const incorrect = pAnswers.length - correct;
      const accuracy = pAnswers.length > 0 ? Math.round((correct / pAnswers.length) * 100) : 0;
      return {
        rank: p.rank,
        id: p.id,
        name: p.name,
        ficha: p.ficha,
        score: p.score,
        correctCount: correct,
        incorrectCount: incorrect,
        accuracy
      };
    })
  };
}

// WebSocket Connection Router
wss.on('connection', (ws: WebSocket) => {
  let boundPin: string | null = null;
  let boundRole: 'instructor' | 'learner' | null = null;
  let boundParticipantId: string | null = null;

  ws.on('message', (raw: string) => {
    try {
      const data = JSON.parse(raw);
      const { action } = data;

      switch (action) {
        // ==========================================
        // INSTRUCTOR: Create Session
        // ==========================================
        case 'CREATE_SESSION': {
          const settings: GameSettings = data.settings || {
            timerSeconds: 20,
            totalQuestions: 10,
            categoryFilter: 'all',
            questionMode: 'random'
          };

          // Filter questions according to settings
          let availableQuestions = [...QUESTIONS_BANK];
          if (settings.categoryFilter && settings.categoryFilter !== 'all') {
            availableQuestions = availableQuestions.filter(q => q.category === settings.categoryFilter);
          }

          // Randomize or sequential
          if (settings.questionMode === 'random') {
            availableQuestions.sort(() => Math.random() - 0.5);
          }

          // Slice questions
          const count = Math.min(settings.totalQuestions || 10, availableQuestions.length);
          const chosenQuestions = availableQuestions.slice(0, count);

          const pin = generateGamePin();
          const session: ServerGameSession = {
            pin,
            instructorWs: ws,
            instructorId: 'inst-' + Date.now(),
            status: 'lobby',
            settings,
            questions: chosenQuestions,
            currentQuestionIndex: 0,
            participants: new Map(),
            participantSockets: new Map(),
            timeRemaining: settings.timerSeconds,
            timerInterval: null,
            isPaused: false,
            demoTimeouts: []
          };

          activeSessions.set(pin, session);
          boundPin = pin;
          boundRole = 'instructor';

          ws.send(JSON.stringify({
            action: 'SESSION_CREATED',
            pin,
            state: buildPublicState(session),
            detailedParticipants: []
          }));
          break;
        }

        // ==========================================
        // INSTRUCTOR: Reconnect
        // ==========================================
        case 'RECONNECT_INSTRUCTOR': {
          const { pin } = data;
          const session = activeSessions.get(pin);
          if (!session) {
            ws.send(JSON.stringify({ action: 'ERROR', message: 'Session not found or expired.' }));
            return;
          }
          session.instructorWs = ws;
          boundPin = pin;
          boundRole = 'instructor';

          ws.send(JSON.stringify({
            action: 'SESSION_RECONNECTED',
            pin,
            state: buildPublicState(session),
            detailedParticipants: Array.from(session.participants.values())
          }));
          break;
        }

        // ==========================================
        // LEARNER: Join Session
        // ==========================================
        case 'JOIN_SESSION': {
          const { pin, name, ficha, participantId } = data;
          const session = activeSessions.get(pin);

          if (!session) {
            ws.send(JSON.stringify({ action: 'JOIN_ERROR', message: 'Game PIN not found. Please verify the code.' }));
            return;
          }

          let pId = participantId;
          let participant = pId ? session.participants.get(pId) : null;

          if (!participant) {
            pId = 'part-' + Math.random().toString(36).substring(2, 9);
            participant = {
              id: pId,
              name: (name || 'Learner').trim(),
              ficha: ficha ? ficha.trim() : undefined,
              score: 0,
              lastPointsEarned: 0,
              streak: 0,
              isOnline: true,
              hasAnswered: false,
              selectedOption: null,
              answeredAt: null,
              answers: []
            };
            session.participants.set(pId, participant);
          } else {
            participant.isOnline = true;
            if (name) participant.name = name.trim();
            if (ficha) participant.ficha = ficha.trim();
          }

          session.participantSockets.set(pId, ws);
          boundPin = pin;
          boundRole = 'learner';
          boundParticipantId = pId;

          const publicState = buildPublicState(session);
          const personalRank = publicState.leaderboard.find(item => item.id === pId)?.rank || 1;

          ws.send(JSON.stringify({
            action: 'JOIN_SUCCESS',
            pin,
            participantId: pId,
            state: publicState,
            personal: {
              id: participant.id,
              name: participant.name,
              score: participant.score,
              lastPointsEarned: participant.lastPointsEarned,
              hasAnswered: participant.hasAnswered,
              selectedOption: participant.selectedOption,
              rank: personalRank,
              streak: participant.streak
            }
          }));

          broadcastSessionState(session);
          break;
        }

        // ==========================================
        // INSTRUCTOR: Add Demo Learners
        // ==========================================
        case 'ADD_DEMO_LEARNERS': {
          if (!boundPin) return;
          const session = activeSessions.get(boundPin);
          if (!session) return;

          DEMO_LEARNERS.forEach((demo) => {
            const demoId = 'demo-' + Math.random().toString(36).substring(2, 8);
            session.participants.set(demoId, {
              id: demoId,
              name: demo.name,
              ficha: demo.ficha,
              score: 0,
              lastPointsEarned: 0,
              streak: 0,
              isOnline: true,
              hasAnswered: false,
              selectedOption: null,
              answeredAt: null,
              answers: [],
              isSimulated: true
            });
          });

          broadcastSessionState(session);
          break;
        }

        // ==========================================
        // INSTRUCTOR: Start Game
        // ==========================================
        case 'START_GAME': {
          if (!boundPin) return;
          const session = activeSessions.get(boundPin);
          if (!session) return;

          session.currentQuestionIndex = 0;
          startQuestionTimer(session);
          break;
        }

        // ==========================================
        // LEARNER: Submit Answer
        // ==========================================
        case 'SUBMIT_ANSWER': {
          const { pin, participantId, selectedIndex } = data;
          const session = activeSessions.get(pin || boundPin);
          if (!session || session.status !== 'question_active') return;

          const participant = session.participants.get(participantId || boundParticipantId);
          if (!participant || participant.hasAnswered) return;

          const currentQ = session.questions[session.currentQuestionIndex];
          if (!currentQ) return;

          const isCorrect = selectedIndex === currentQ.correctIndex;
          const remaining = Math.max(1, session.timeRemaining);
          const pointsEarned = isCorrect
            ? Math.round(500 + 500 * (remaining / session.settings.timerSeconds))
            : 0;

          participant.hasAnswered = true;
          participant.selectedOption = selectedIndex;
          participant.lastPointsEarned = pointsEarned;
          participant.score += pointsEarned;
          participant.streak = isCorrect ? participant.streak + 1 : 0;
          participant.answeredAt = Date.now();

          participant.answers.push({
            questionId: currentQ.id,
            selectedIndex,
            isCorrect,
            points: pointsEarned,
            timeSpentSeconds: session.settings.timerSeconds - remaining
          });

          // Immediate response to learner
          ws.send(JSON.stringify({
            action: 'ANSWER_RECEIVED',
            selectedIndex,
            hasAnswered: true
          }));

          // Notify room
          broadcastSessionState(session);

          // If all answered, end question automatically
          const allAnswered = Array.from(session.participants.values()).every(p => p.hasAnswered);
          if (allAnswered) {
            handleQuestionEnd(session);
          }
          break;
        }

        // ==========================================
        // INSTRUCTOR: Pause / Resume
        // ==========================================
        case 'PAUSE_RESUME': {
          if (!boundPin) return;
          const session = activeSessions.get(boundPin);
          if (!session || session.status !== 'question_active') return;

          session.isPaused = !session.isPaused;
          broadcastSessionState(session);
          break;
        }

        // ==========================================
        // INSTRUCTOR: Reveal Answer
        // ==========================================
        case 'REVEAL_ANSWER': {
          if (!boundPin) return;
          const session = activeSessions.get(boundPin);
          if (!session || session.status !== 'question_active') return;

          handleQuestionEnd(session);
          break;
        }

        // ==========================================
        // INSTRUCTOR: Show Leaderboard
        // ==========================================
        case 'SHOW_LEADERBOARD': {
          if (!boundPin) return;
          const session = activeSessions.get(boundPin);
          if (!session) return;

          clearSessionTimers(session);
          session.status = 'leaderboard';
          broadcastSessionState(session);
          break;
        }

        // ==========================================
        // INSTRUCTOR: Next Question
        // ==========================================
        case 'NEXT_QUESTION': {
          if (!boundPin) return;
          const session = activeSessions.get(boundPin);
          if (!session) return;

          if (session.currentQuestionIndex + 1 < session.questions.length) {
            session.currentQuestionIndex += 1;
            startQuestionTimer(session);
          } else {
            // Finished game!
            clearSessionTimers(session);
            session.status = 'finished';
            const finalSummary = buildFinalSummary(session);
            
            // Broadcast finished state
            const finishPayload = JSON.stringify({
              action: 'GAME_FINISHED',
              state: buildPublicState(session),
              summary: finalSummary
            });

            if (session.instructorWs && session.instructorWs.readyState === WebSocket.OPEN) {
              session.instructorWs.send(finishPayload);
            }
            session.participants.forEach((p, pId) => {
              const pSocket = session.participantSockets.get(pId);
              if (pSocket && pSocket.readyState === WebSocket.OPEN) {
                pSocket.send(finishPayload);
              }
            });
          }
          break;
        }

        // ==========================================
        // INSTRUCTOR: End Game
        // ==========================================
        case 'END_GAME': {
          if (!boundPin) return;
          const session = activeSessions.get(boundPin);
          if (!session) return;

          clearSessionTimers(session);
          session.status = 'finished';
          const finalSummary = buildFinalSummary(session);

          const finishPayload = JSON.stringify({
            action: 'GAME_FINISHED',
            state: buildPublicState(session),
            summary: finalSummary
          });

          if (session.instructorWs && session.instructorWs.readyState === WebSocket.OPEN) {
            session.instructorWs.send(finishPayload);
          }
          session.participants.forEach((p, pId) => {
            const pSocket = session.participantSockets.get(pId);
            if (pSocket && pSocket.readyState === WebSocket.OPEN) {
              pSocket.send(finishPayload);
            }
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling socket message:', err);
    }
  });

  ws.on('close', () => {
    if (boundPin && boundRole === 'learner' && boundParticipantId) {
      const session = activeSessions.get(boundPin);
      if (session) {
        const participant = session.participants.get(boundParticipantId);
        if (participant) {
          participant.isOnline = false;
        }
        session.participantSockets.delete(boundParticipantId);
        broadcastSessionState(session);
      }
    }
  });
});

// REST API endpoint to retrieve session state
app.get('/api/session/:pin', (req, res) => {
  const pin = req.params.pin;
  const session = activeSessions.get(pin);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(buildPublicState(session));
});

// Vite Middleware for Dev and Static Serving for Prod
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[TO BE LIVE CHALLENGE] Server running at http://localhost:${PORT}`);
  });
}

startServer();
