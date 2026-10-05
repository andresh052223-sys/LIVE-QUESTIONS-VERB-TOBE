import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Question, Participant, GameSettings, PublicSessionState, FinalGameSummary } from '../types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SESSIONS_TMP_FILE = path.join(DATA_DIR, 'sessions.tmp.json');

export interface StoredGameSession {
  sessionId: string;
  gamePin: string;
  pin: string;
  instructorId: string;
  instructorSecret: string;
  status: 'WAITING' | 'PLAYING' | 'REVEALED' | 'LEADERBOARD' | 'FINISHED';
  questionCount: number;
  category: string;
  timePerQuestion: number;
  selectionMode: 'random' | 'sequential';
  settings: GameSettings;
  questions: Question[];
  currentQuestionIndex: number;
  participants: Participant[];
  leaderboard: {
    id: string;
    name: string;
    ficha?: string;
    score: number;
    streak: number;
    rank: number;
    lastPoints: number;
  }[];
  timeRemaining: number;
  questionStartedAt: number;
  isPaused: boolean;
  finalSummary: FinalGameSummary | null;
  createdAt: string;
  updatedAt: string;
}

// In-memory master source of truth for ultra-fast, non-blocking concurrent operations
const sessionCache = new Map<string, StoredGameSession>();
let persistTimeout: NodeJS.Timeout | null = null;
let isWriting = false;

// Ensure storage directory exists
function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SESSIONS_FILE)) {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[SessionStore] Error initializing storage directory:', err);
  }
}

// Load sessions from disk on server startup
export function loadSessionsFromDisk() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    Object.keys(parsed).forEach(pin => {
      sessionCache.set(pin, parsed[pin]);
    });
    console.log(`[SessionStore] Loaded ${sessionCache.size} sessions from persistent storage.`);
  } catch (err) {
    console.warn('[SessionStore] Could not read sessions.json, starting with clean memory store:', err);
  }
}

// Asynchronous atomic disk flush (prevents event loop blocking during concurrent student answers)
export function schedulePersist() {
  if (persistTimeout) return;

  persistTimeout = setTimeout(async () => {
    persistTimeout = null;
    if (isWriting) {
      schedulePersist();
      return;
    }

    isWriting = true;
    try {
      const obj: Record<string, StoredGameSession> = {};
      sessionCache.forEach((sess, pin) => {
        obj[pin] = sess;
      });

      const dataStr = JSON.stringify(obj, null, 2);
      // Atomic write: write to temp file then rename
      await fs.promises.writeFile(SESSIONS_TMP_FILE, dataStr, 'utf-8');
      await fs.promises.rename(SESSIONS_TMP_FILE, SESSIONS_FILE);
    } catch (err) {
      console.error('[SessionStore] Atomic write error:', err);
    } finally {
      isWriting = false;
    }
  }, 80); // Debounce by 80ms to batch rapid answer bursts
}

export function getSession(pin: string): StoredGameSession | undefined {
  if (!sessionCache.has(pin)) {
    loadSessionsFromDisk();
  }
  return sessionCache.get(pin);
}

export function saveSession(session: StoredGameSession): void {
  session.updatedAt = new Date().toISOString();
  sessionCache.set(session.gamePin, session);
  schedulePersist();
}

export function getAllSessions(): StoredGameSession[] {
  return Array.from(sessionCache.values());
}

export function isPinTaken(pin: string): boolean {
  return sessionCache.has(pin);
}

// Convert StoredGameSession to sanitized PublicSessionState
export function toPublicState(session: StoredGameSession): PublicSessionState {
  const currentQ = session.questions[session.currentQuestionIndex];
  const answeredCount = session.participants.filter(p => p.hasAnswered).length;

  const distribution: [number, number, number, number] = [0, 0, 0, 0];
  if (session.status === 'REVEALED' || session.status === 'LEADERBOARD' || session.status === 'FINISHED') {
    session.participants.forEach(p => {
      if (p.selectedOption !== null && p.selectedOption >= 0 && p.selectedOption <= 3) {
        distribution[p.selectedOption]++;
      }
    });
  }

  let sanitizedQuestion: PublicSessionState['currentQuestion'] = undefined;
  if (currentQ) {
    const showAnswers = session.status === 'REVEALED' || session.status === 'LEADERBOARD' || session.status === 'FINISHED';
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

  let clientStatus: PublicSessionState['status'] = 'lobby';
  if (session.status === 'WAITING') clientStatus = 'lobby';
  else if (session.status === 'PLAYING') clientStatus = 'question_active';
  else if (session.status === 'REVEALED') clientStatus = 'question_ended';
  else if (session.status === 'LEADERBOARD') clientStatus = 'leaderboard';
  else if (session.status === 'FINISHED') clientStatus = 'finished';

  return {
    pin: session.gamePin,
    status: clientStatus,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.questions.length,
    currentQuestion: sanitizedQuestion,
    timeRemaining: session.timeRemaining,
    totalTimerSeconds: session.timePerQuestion,
    isPaused: session.isPaused,
    participantsCount: session.participants.length,
    answeredCount,
    answerDistribution: distribution,
    leaderboard: session.leaderboard
  };
}
