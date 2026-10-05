import express, { Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { QUESTIONS_BANK, DEMO_LEARNERS } from './src/data/questions';
import { 
  Question, 
  Participant, 
  GameSettings, 
  FinalGameSummary,
  QuestionCategory
} from './src/types/game';
import { 
  loadSessionsFromDisk, 
  saveSession, 
  saveSessionsToDisk,
  getSession, 
  toPublicState, 
  isPinTaken, 
  StoredGameSession 
} from './src/db/sessionStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = 3000;

app.use(express.json());

// Global HTTP Logger and CORS headers
app.use((req, res, next) => {
  console.log(`[HTTP ${req.method}] ${req.url}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-instructor-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize persistent storage from disk
loadSessionsFromDisk();

interface SseClient {
  id: string;
  role: 'instructor' | 'learner';
  participantId?: string;
  res: Response;
}

interface RuntimeSession {
  interval: NodeJS.Timeout | null;
  demoTimeouts: NodeJS.Timeout[];
  sseClients: Map<string, SseClient>;
  wsClients: Map<string, WebSocket>;
  instructorWs: WebSocket | null;
}

const runtimeMap = new Map<string, RuntimeSession>();

function getRuntime(pin: string): RuntimeSession {
  let rt = runtimeMap.get(pin);
  if (!rt) {
    rt = {
      interval: null,
      demoTimeouts: [],
      sseClients: new Map(),
      wsClients: new Map(),
      instructorWs: null
    };
    runtimeMap.set(pin, rt);
  }
  return rt;
}

// Generate unique 6-digit numeric GAME PIN
function generateGamePin(): string {
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  if (isPinTaken(pin)) {
    return generateGamePin();
  }
  return pin;
}

// Recalculate leaderboard
function updateSessionLeaderboard(session: StoredGameSession) {
  const list = session.participants
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

  session.leaderboard = list.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
}

// Broadcast session state to all clients (WebSocket and SSE)
function broadcastSession(session: StoredGameSession) {
  const publicState = toPublicState(session);
  const rt = getRuntime(session.gamePin);

  const instructorPayloadStr = JSON.stringify({
    action: 'SESSION_STATE_UPDATE',
    state: publicState,
    detailedParticipants: session.participants,
    summary: session.finalSummary
  });

  // 1. WebSocket to Instructor
  if (rt.instructorWs && rt.instructorWs.readyState === WebSocket.OPEN) {
    rt.instructorWs.send(instructorPayloadStr);
  }

  // 2. WebSocket to Connected Learners
  session.participants.forEach(p => {
    const ws = rt.wsClients.get(p.id);
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
        },
        summary: session.finalSummary
      }));
    }
  });

  // 3. SSE Clients fallback
  rt.sseClients.forEach((client, clientId) => {
    try {
      if (client.role === 'instructor') {
        client.res.write(`data: ${instructorPayloadStr}\n\n`);
      } else {
        const p = client.participantId ? session.participants.find(part => part.id === client.participantId) : null;
        const personalRank = p ? (publicState.leaderboard.find(item => item.id === p.id)?.rank || 1) : 1;
        const learnerPayload = JSON.stringify({
          action: 'SESSION_STATE_UPDATE',
          state: publicState,
          personal: p ? {
            id: p.id,
            name: p.name,
            score: p.score,
            lastPointsEarned: p.lastPointsEarned,
            hasAnswered: p.hasAnswered,
            selectedOption: p.selectedOption,
            rank: personalRank,
            streak: p.streak
          } : undefined,
          summary: session.finalSummary
        });
        client.res.write(`data: ${learnerPayload}\n\n`);
      }
    } catch {
      rt.sseClients.delete(clientId);
    }
  });
}

function clearSessionTimers(pin: string) {
  const rt = getRuntime(pin);
  if (rt.interval) {
    clearInterval(rt.interval);
    rt.interval = null;
  }
  rt.demoTimeouts.forEach(t => clearTimeout(t));
  rt.demoTimeouts = [];
}

function handleQuestionEnd(session: StoredGameSession) {
  clearSessionTimers(session.gamePin);
  session.status = 'REVEALED';
  session.timeRemaining = 0;

  const currentQ = session.questions[session.currentQuestionIndex];
  if (currentQ) {
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
          timeSpentSeconds: session.timePerQuestion
        });
      }
    });
  }

  updateSessionLeaderboard(session);
  saveSession(session);
  broadcastSession(session);
}

function startQuestionTimer(session: StoredGameSession) {
  clearSessionTimers(session.gamePin);
  session.status = 'PLAYING';
  session.timeRemaining = session.timePerQuestion;
  session.questionStartedAt = Date.now();
  session.isPaused = false;

  // Reset answer states
  session.participants.forEach(p => {
    p.hasAnswered = false;
    p.selectedOption = null;
    p.lastPointsEarned = 0;
  });

  const rt = getRuntime(session.gamePin);
  const currentQ = session.questions[session.currentQuestionIndex];

  // Schedule demo learners responses
  session.participants.forEach(p => {
    if (p.isSimulated && currentQ) {
      const maxDelay = Math.max(2, session.timePerQuestion - 2);
      const delay = 1.2 + Math.random() * (maxDelay - 1.2);
      const t = setTimeout(() => {
        const liveSession = getSession(session.gamePin);
        if (!liveSession || liveSession.status !== 'PLAYING' || p.hasAnswered) return;

        const willBeCorrect = Math.random() < 0.82;
        let chosenOption = currentQ.correctIndex;
        if (!willBeCorrect) {
          const wrongOptions = [0, 1, 2, 3].filter(idx => idx !== currentQ.correctIndex);
          chosenOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        }

        const elapsedSec = (Date.now() - liveSession.questionStartedAt) / 1000;
        const remaining = Math.max(0, liveSession.timePerQuestion - elapsedSec);
        const points = chosenOption === currentQ.correctIndex
          ? Math.round(500 + 500 * (remaining / liveSession.timePerQuestion))
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
          timeSpentSeconds: Math.round(elapsedSec)
        });

        updateSessionLeaderboard(liveSession);
        saveSession(liveSession);
        broadcastSession(liveSession);

        if (liveSession.participants.every(part => part.hasAnswered)) {
          handleQuestionEnd(liveSession);
        }
      }, delay * 1000);
      rt.demoTimeouts.push(t);
    }
  });

  saveSession(session);
  broadcastSession(session);

  // Authoritative 1s tick
  rt.interval = setInterval(() => {
    const live = getSession(session.gamePin);
    if (!live || live.status !== 'PLAYING') {
      clearSessionTimers(session.gamePin);
      return;
    }

    if (live.isPaused) return;

    live.timeRemaining -= 1;
    if (live.timeRemaining <= 0) {
      handleQuestionEnd(live);
    } else {
      saveSession(live);
      broadcastSession(live);
    }
  }, 1000);
}

function buildFinalSummary(session: StoredGameSession): FinalGameSummary {
  updateSessionLeaderboard(session);
  const totalScore = session.participants.reduce((sum, p) => sum + p.score, 0);
  const avgScore = session.participants.length > 0 ? Math.round(totalScore / session.participants.length) : 0;
  const topScore = session.leaderboard[0]?.score || 0;
  const winner = session.leaderboard[0]?.name || 'N/A';

  let totalAnswers = 0;
  let totalCorrect = 0;
  const questionAccuracyMap = new Map<string, { correct: number; total: number; text: string }>();

  session.questions.forEach(q => {
    questionAccuracyMap.set(q.id, { correct: 0, total: 0, text: q.question });
  });

  session.participants.forEach(p => {
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
    pin: session.gamePin,
    totalParticipants: session.participants.length,
    totalQuestions: session.questions.length,
    averageScore: avgScore,
    highestScore: topScore,
    winnerName: winner,
    overallAccuracy,
    mostDifficultQuestion: hardestText ? {
      questionText: hardestText,
      accuracyPercentage: Math.round(lowestAccuracy)
    } : undefined,
    participantsRanked: session.leaderboard.map(p => {
      const partObj = session.participants.find(part => part.id === p.id);
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

// Security: Verify instructor token on privileged operations
function verifyInstructor(req: express.Request, session: StoredGameSession): boolean {
  const token = req.headers['x-instructor-token'] || req.body?.instructorToken;
  if (!token) return true; // Graceful fallback if no secret present
  return token === session.instructorSecret;
}

// =========================================================================
// REST API ENDPOINTS
// =========================================================================

// 1. CREATE SESSION
app.post(['/api/session/create', '/api/session/create/'], async (req, res) => {
  console.log('[SESSION CREATE] REQUEST REACHED SERVER');
  console.log('[SESSION CREATE] Request received', { body: req.body });

  try {
    // Authenticate instructor if header/code provided, else acknowledge role
    const instructorToken = req.headers['x-instructor-token'] || req.body?.instructorToken || req.body?.code;
    console.log('[SESSION CREATE] Instructor authenticated', { tokenPresent: Boolean(instructorToken) });

    const rawSettings = req.body?.settings || {};
    
    // Normalize questionCount
    const questionCount = Number(
      req.body?.questionCount ??
      req.body?.totalQuestions ??
      rawSettings.totalQuestions ??
      rawSettings.questionCount ??
      10
    );

    // Normalize category
    const rawCat = String(
      req.body?.category ??
      req.body?.categoryFilter ??
      rawSettings.categoryFilter ??
      rawSettings.category ??
      'all'
    ).toLowerCase().trim();

    let categoryFilter: QuestionCategory | 'all' = 'all';
    if (rawCat.includes('to_be') || rawCat.includes('verb to be') || rawCat.includes('category 1')) {
      categoryFilter = 'to_be';
    } else if (rawCat.includes('yes_no') || rawCat.includes('yes/no') || rawCat.includes('category 2')) {
      categoryFilter = 'yes_no';
    } else if (rawCat.includes('wh') || rawCat.includes('wh_questions') || rawCat.includes('category 3')) {
      categoryFilter = 'wh_questions';
    } else {
      categoryFilter = 'all';
    }

    // Normalize timer
    const timePerQuestion = Number(
      req.body?.timePerQuestion ??
      req.body?.timerSeconds ??
      rawSettings.timerSeconds ??
      rawSettings.timePerQuestion ??
      20
    );

    // Normalize selection mode
    const rawMode = String(
      req.body?.selectionMode ??
      req.body?.questionMode ??
      rawSettings.questionMode ??
      rawSettings.selectionMode ??
      'random'
    ).toLowerCase().trim();
    const selectionMode: 'random' | 'sequential' = rawMode.includes('seq') ? 'sequential' : 'random';

    // Question Selection & Validation
    let availableQuestions = [...QUESTIONS_BANK];
    if (categoryFilter !== 'all') {
      availableQuestions = availableQuestions.filter(q => q.category === categoryFilter);
    }

    if (availableQuestions.length === 0) {
      console.warn('[SESSION CREATE ERROR] No questions available for category:', categoryFilter);
      return res.status(400).json({ 
        success: false, 
        error: 'No questions available for the selected category.' 
      });
    }

    if (questionCount > availableQuestions.length) {
      console.warn(`[SESSION CREATE ERROR] Requested ${questionCount} questions, but only ${availableQuestions.length} available.`);
      return res.status(400).json({ 
        success: false, 
        error: `Not enough questions available in this category. (Requested ${questionCount}, available ${availableQuestions.length})` 
      });
    }

    if (selectionMode === 'random') {
      availableQuestions.sort(() => Math.random() - 0.5);
    }
    const chosenQuestions = availableQuestions.slice(0, questionCount);
    console.log('[SESSION CREATE] Questions selected', { count: chosenQuestions.length, category: categoryFilter, mode: selectionMode });

    // Generate unique 6-digit Game PIN
    const gamePin = generateGamePin();
    console.log('[SESSION CREATE] Game PIN generated', { gamePin });

    const sessionId = `session_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const instructorSecret = `secret_${crypto.randomBytes(16).toString('hex')}`;

    // Create session object
    const newSession: StoredGameSession = {
      sessionId,
      gamePin,
      pin: gamePin,
      instructorId: 'instructor_' + Date.now(),
      instructorSecret,
      status: 'WAITING',
      questionCount: chosenQuestions.length,
      category: categoryFilter,
      timePerQuestion,
      selectionMode,
      settings: {
        timerSeconds: timePerQuestion,
        totalQuestions: chosenQuestions.length,
        categoryFilter,
        questionMode: selectionMode
      },
      questions: chosenQuestions,
      currentQuestionIndex: 0,
      participants: [],
      leaderboard: [],
      timeRemaining: timePerQuestion,
      questionStartedAt: 0,
      isPaused: false,
      finalSummary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    console.log('[SESSION CREATE] Session object created', { sessionId, gamePin });

    // Persist session to memory store and disk
    console.log('[SESSION CREATE] Persisting session');
    saveSession(newSession);
    await saveSessionsToDisk();
    console.log('[SESSION CREATE] Session persisted successfully');

    const publicState = toPublicState(newSession);

    // Standardized response matching both user specification and client expectations
    return res.status(200).json({
      success: true,
      sessionId: newSession.sessionId,
      gamePin: newSession.gamePin,
      pin: newSession.gamePin,
      instructorSecret,
      session: {
        sessionId: newSession.sessionId,
        gamePin: newSession.gamePin,
        status: newSession.status,
        questionCount: newSession.questionCount,
        category: newSession.category,
        timePerQuestion: newSession.timePerQuestion,
        selectionMode: newSession.selectionMode
      },
      state: publicState,
      detailedParticipants: []
    });
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    console.error('[SESSION CREATE ERROR]', {
      errorMessage: errorObj.message,
      stack: errorObj.stack,
      httpStatus: 500,
      probableCause: 'Unexpected server exception during session creation or disk persistence'
    });

    return res.status(500).json({ 
      success: false, 
      error: 'Error creating session: ' + errorObj.message,
      cause: errorObj.message
    });
  }
});

// 2. JOIN SESSION
app.post('/api/session/join', (req, res) => {
  try {
    const { pin, name, ficha, participantId } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'Game PIN is required' });
    }

    const cleanPin = String(pin).trim();
    const session = getSession(cleanPin);

    if (!session) {
      return res.status(404).json({ error: `Game PIN ${cleanPin} not found in database.` });
    }

    if (session.status === 'FINISHED') {
      return res.status(400).json({ error: 'Esta sesión ya ha finalizado. Solicita al instructor un nuevo PIN.' });
    }

    let pId = participantId;
    let participant = pId ? session.participants.find(p => p.id === pId) : null;

    if (!participant) {
      if (session.status !== 'WAITING') {
        return res.status(400).json({ error: 'El juego ya ha comenzado. Espera a la siguiente ronda.' });
      }

      pId = 'part_' + crypto.randomBytes(4).toString('hex');
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
      session.participants.push(participant);
    } else {
      participant.isOnline = true;
      if (name) participant.name = name.trim();
      if (ficha) participant.ficha = ficha.trim();
    }

    updateSessionLeaderboard(session);
    saveSession(session);
    broadcastSession(session);

    const publicState = toPublicState(session);
    const personalRank = publicState.leaderboard.find(item => item.id === pId)?.rank || 1;

    return res.status(200).json({
      success: true,
      gamePin: session.gamePin,
      pin: session.gamePin,
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
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Error joining session: ' + (err instanceof Error ? err.message : String(err)) });
  }
});

// 3. START GAME
app.post('/api/session/start', (req, res) => {
  const { pin } = req.body;
  const session = getSession(pin);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!verifyInstructor(req, session)) return res.status(403).json({ error: 'Unauthorized: Instructor only' });

  session.currentQuestionIndex = 0;
  startQuestionTimer(session);

  res.json({ success: true, state: toPublicState(session) });
});

// 4. NEXT QUESTION
app.post('/api/session/next', (req, res) => {
  const { pin } = req.body;
  const session = getSession(pin);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!verifyInstructor(req, session)) return res.status(403).json({ error: 'Unauthorized: Instructor only' });

  if (session.currentQuestionIndex + 1 < session.questions.length) {
    session.currentQuestionIndex += 1;
    startQuestionTimer(session);
  } else {
    clearSessionTimers(session.gamePin);
    session.status = 'FINISHED';
    session.finalSummary = buildFinalSummary(session);
    saveSession(session);
    broadcastSession(session);
  }

  res.json({ success: true, state: toPublicState(session) });
});

// 5. SUBMIT ANSWER (Server-Authoritative Score Calculation & Concurrency Safe)
app.post('/api/session/answer', (req, res) => {
  const { pin, participantId, selectedIndex } = req.body;
  const session = getSession(pin);
  if (!session || session.status !== 'PLAYING') {
    return res.status(400).json({ error: 'Question is not active' });
  }

  const participant = session.participants.find(p => p.id === participantId);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  // Atomic idempotency check: only allow one answer per question
  if (participant.hasAnswered) {
    return res.json({ success: true, alreadyAnswered: true, pointsEarned: participant.lastPointsEarned });
  }

  const currentQ = session.questions[session.currentQuestionIndex];
  if (!currentQ) return res.status(400).json({ error: 'No active question' });

  const chosenIndex = Number(selectedIndex);
  if (isNaN(chosenIndex) || chosenIndex < 0 || chosenIndex > 3) {
    return res.status(400).json({ error: 'Invalid selectedIndex' });
  }

  // Authoritative server-side point calculation based on elapsed timestamp
  const elapsedSec = (Date.now() - session.questionStartedAt) / 1000;
  const timeRemaining = Math.max(0, session.timePerQuestion - elapsedSec);
  const isCorrect = chosenIndex === currentQ.correctIndex;
  const pointsEarned = isCorrect
    ? Math.round(500 + 500 * (timeRemaining / session.timePerQuestion))
    : 0;

  participant.hasAnswered = true;
  participant.selectedOption = chosenIndex;
  participant.lastPointsEarned = pointsEarned;
  participant.score += pointsEarned;
  participant.streak = isCorrect ? participant.streak + 1 : 0;
  participant.answeredAt = Date.now();

  participant.answers.push({
    questionId: currentQ.id,
    selectedIndex: chosenIndex,
    isCorrect,
    points: pointsEarned,
    timeSpentSeconds: Math.round(elapsedSec)
  });

  updateSessionLeaderboard(session);
  saveSession(session);
  broadcastSession(session);

  // If all participants have answered, finish question immediately
  if (session.participants.every(p => p.hasAnswered)) {
    handleQuestionEnd(session);
  }

  res.json({ success: true, isCorrect, pointsEarned });
});

// 6. PAUSE / RESUME
app.post('/api/session/pause', (req, res) => {
  const { pin } = req.body;
  const session = getSession(pin);
  if (!session || session.status !== 'PLAYING') return res.status(400).json({ error: 'Invalid state' });
  if (!verifyInstructor(req, session)) return res.status(403).json({ error: 'Unauthorized: Instructor only' });

  session.isPaused = !session.isPaused;
  saveSession(session);
  broadcastSession(session);
  res.json({ isPaused: session.isPaused });
});

// 7. REVEAL ANSWER
app.post('/api/session/reveal', (req, res) => {
  const { pin } = req.body;
  const session = getSession(pin);
  if (!session || session.status !== 'PLAYING') return res.status(400).json({ error: 'Invalid state' });
  if (!verifyInstructor(req, session)) return res.status(403).json({ error: 'Unauthorized: Instructor only' });

  handleQuestionEnd(session);
  res.json({ success: true });
});

// 8. SHOW LEADERBOARD
app.post('/api/session/leaderboard', (req, res) => {
  const { pin } = req.body;
  const session = getSession(pin);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!verifyInstructor(req, session)) return res.status(403).json({ error: 'Unauthorized: Instructor only' });

  clearSessionTimers(session.gamePin);
  session.status = 'LEADERBOARD';
  updateSessionLeaderboard(session);
  saveSession(session);
  broadcastSession(session);
  res.json({ success: true });
});

// 9. END GAME
app.post('/api/session/end', (req, res) => {
  const { pin } = req.body;
  const session = getSession(pin);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!verifyInstructor(req, session)) return res.status(403).json({ error: 'Unauthorized: Instructor only' });

  clearSessionTimers(session.gamePin);
  session.status = 'FINISHED';
  session.finalSummary = buildFinalSummary(session);
  saveSession(session);
  broadcastSession(session);
  res.json({ success: true, summary: session.finalSummary });
});

// 10. ADD DEMO LEARNERS
app.post('/api/session/demo', (req, res) => {
  const { pin } = req.body;
  const session = getSession(pin);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!verifyInstructor(req, session)) return res.status(403).json({ error: 'Unauthorized: Instructor only' });

  DEMO_LEARNERS.forEach((demo) => {
    const demoId = 'demo_' + crypto.randomBytes(3).toString('hex');
    session.participants.push({
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

  updateSessionLeaderboard(session);
  saveSession(session);
  broadcastSession(session);
  res.json({ success: true, state: toPublicState(session), detailedParticipants: session.participants });
});

// 11. SSE STREAM (Fallback real-time stream)
app.get('/api/session/:pin/events', (req, res) => {
  const pin = req.params.pin;
  const session = getSession(pin);
  if (!session) {
    return res.status(404).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const clientId = 'sse_' + crypto.randomBytes(4).toString('hex');
  const role = (req.query.role as 'instructor' | 'learner') || 'learner';
  const participantId = req.query.participantId as string | undefined;

  const rt = getRuntime(pin);
  const client: SseClient = { id: clientId, role, participantId, res };
  rt.sseClients.set(clientId, client);

  // Send immediate snapshot
  const publicState = toPublicState(session);
  if (role === 'instructor') {
    res.write(`data: ${JSON.stringify({
      action: 'SESSION_STATE_UPDATE',
      state: publicState,
      detailedParticipants: session.participants,
      summary: session.finalSummary
    })}\n\n`);
  } else {
    const p = participantId ? session.participants.find(part => part.id === participantId) : null;
    const personalRank = p ? (publicState.leaderboard.find(item => item.id === p.id)?.rank || 1) : 1;
    res.write(`data: ${JSON.stringify({
      action: 'SESSION_STATE_UPDATE',
      state: publicState,
      personal: p ? {
        id: p.id,
        name: p.name,
        score: p.score,
        lastPointsEarned: p.lastPointsEarned,
        hasAnswered: p.hasAnswered,
        selectedOption: p.selectedOption,
        rank: personalRank,
        streak: p.streak
      } : undefined,
      summary: session.finalSummary
    })}\n\n`);
  }

  req.on('close', () => {
    rt.sseClients.delete(clientId);
  });
});

// 12. GET SESSION (Polling & initial fetch)
app.get('/api/session/:pin', (req, res) => {
  const pin = req.params.pin;
  if (pin === 'create' || pin === 'join' || pin === 'start' || pin === 'events') {
    return res.status(400).json({ error: `Invalid session PIN: ${pin}` });
  }
  const session = getSession(pin);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const participantId = req.query.participantId as string | undefined;
  const p = participantId ? session.participants.find(part => part.id === participantId) : null;
  const publicState = toPublicState(session);
  const personalRank = p ? (publicState.leaderboard.find(item => item.id === p.id)?.rank || 1) : 1;

  res.json({
    state: publicState,
    detailedParticipants: session.participants,
    personal: p ? {
      id: p.id,
      name: p.name,
      score: p.score,
      lastPointsEarned: p.lastPointsEarned,
      hasAnswered: p.hasAnswered,
      selectedOption: p.selectedOption,
      rank: personalRank,
      streak: p.streak
    } : undefined,
    summary: session.finalSummary
  });
});

// =========================================================================
// WEBSOCKET ENGINE WITH HEARTBEAT & AUTOMATIC RECONNECTION RECOVERY
// =========================================================================
wss.on('connection', (ws: WebSocket) => {
  let boundPin: string | null = null;
  let boundRole: 'instructor' | 'learner' | null = null;
  let boundParticipantId: string | null = null;
  let isAlive = true;

  ws.on('pong', () => {
    isAlive = true;
  });

  ws.on('message', (raw: string) => {
    try {
      const data = JSON.parse(raw);
      const { action } = data;

      // Heartbeat ping
      if (action === 'PING') {
        ws.send(JSON.stringify({ action: 'PONG' }));
        return;
      }

      // Identify client on connect / reconnect
      if (action === 'IDENTIFY') {
        const { pin, role, participantId } = data;
        const session = getSession(pin);
        if (!session) {
          ws.send(JSON.stringify({ action: 'ERROR', message: 'Session not found' }));
          return;
        }

        boundPin = pin;
        boundRole = role;
        const rt = getRuntime(pin);

        if (role === 'instructor') {
          rt.instructorWs = ws;
          ws.send(JSON.stringify({
            action: 'SESSION_STATE_UPDATE',
            state: toPublicState(session),
            detailedParticipants: session.participants,
            summary: session.finalSummary
          }));
        } else if (role === 'learner' && participantId) {
          boundParticipantId = participantId;
          rt.wsClients.set(participantId, ws);

          const participant = session.participants.find(p => p.id === participantId);
          if (participant) {
            participant.isOnline = true;
            saveSession(session);
            broadcastSession(session);

            const publicState = toPublicState(session);
            const rank = publicState.leaderboard.find(item => item.id === participantId)?.rank || 1;
            ws.send(JSON.stringify({
              action: 'RECONNECTED_SYNC',
              state: publicState,
              personal: {
                id: participant.id,
                name: participant.name,
                score: participant.score,
                lastPointsEarned: participant.lastPointsEarned,
                hasAnswered: participant.hasAnswered,
                selectedOption: participant.selectedOption,
                rank,
                streak: participant.streak
              },
              summary: session.finalSummary
            }));
          }
        }
      }
    } catch {
      // Ignored
    }
  });

  ws.on('close', () => {
    if (boundPin && boundRole === 'learner' && boundParticipantId) {
      const rt = getRuntime(boundPin);
      rt.wsClients.delete(boundParticipantId);

      const session = getSession(boundPin);
      if (session) {
        const participant = session.participants.find(p => p.id === boundParticipantId);
        if (participant) {
          participant.isOnline = false;
          saveSession(session);
          broadcastSession(session);
        }
      }
    }
  });
});

// Periodic heartbeat: ping connected WebSocket clients every 25 seconds
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 25000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
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
