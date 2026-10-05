import fs from 'fs';
import path from 'path';
import { Question, Participant, GameSettings, PublicSessionState, FinalGameSummary } from '../types/game';

// Robust, absolute storage location based on project root (process.cwd())
export function getDataDir(): string {
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR);
  }
  return path.resolve(process.cwd(), 'data');
}

export function getSessionsFilePath(): string {
  return path.join(getDataDir(), 'sessions.json');
}

export function getSessionsTmpFilePath(): string {
  return path.join(getDataDir(), 'sessions.tmp.json');
}

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

// Ensure storage directory and file exist automatically
export function ensureStorage(): void {
  try {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const sessionsFile = getSessionsFilePath();
    if (!fs.existsSync(sessionsFile)) {
      fs.writeFileSync(sessionsFile, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[SessionStore] Error ensuring storage directory and file:', err);
  }
}

// Load sessions from disk on server startup
export function loadSessionsFromDisk(): void {
  ensureStorage();
  try {
    const sessionsFile = getSessionsFilePath();
    if (!fs.existsSync(sessionsFile)) {
      return;
    }
    const raw = fs.readFileSync(sessionsFile, 'utf-8');
    const parsed = JSON.parse(raw);
    Object.keys(parsed).forEach(pin => {
      sessionCache.set(pin, parsed[pin]);
    });
    console.log(`[SessionStore] Loaded ${sessionCache.size} sessions from persistent storage (${sessionsFile}).`);
  } catch (err) {
    console.warn('[SessionStore] Could not read sessions.json, starting with clean memory store:', err);
  }
}

// Explicit disk write function with atomic rename and direct write fallback
export async function saveSessionsToDisk(): Promise<boolean> {
  const dataDir = getDataDir();
  const sessionsFile = getSessionsFilePath();
  const tmpFile = getSessionsTmpFilePath();

  try {
    await fs.promises.mkdir(dataDir, { recursive: true });
    const obj: Record<string, StoredGameSession> = {};
    sessionCache.forEach((sess, pin) => {
      obj[pin] = sess;
    });

    const dataStr = JSON.stringify(obj, null, 2);

    try {
      await fs.promises.writeFile(tmpFile, dataStr, 'utf-8');
      await fs.promises.rename(tmpFile, sessionsFile);
      return true;
    } catch (atomicErr) {
      // Fallback: direct write if rename fails (e.g. cross-filesystem or OS lock)
      console.warn('[SessionStore] Atomic rename failed, falling back to direct write:', atomicErr);
      await fs.promises.writeFile(sessionsFile, dataStr, 'utf-8');
      try {
        if (fs.existsSync(tmpFile)) {
          await fs.promises.unlink(tmpFile);
        }
      } catch {
        // ignore unlink error
      }
      return true;
    }
  } catch (err) {
    console.error('[SessionStore] Fatal error writing sessions to disk:', err);
    return false;
  }
}

// Asynchronous debounced disk flush
export function schedulePersist(): void {
  if (persistTimeout) return;

  persistTimeout = setTimeout(async () => {
    persistTimeout = null;
    if (isWriting) {
      schedulePersist();
      return;
    }

    isWriting = true;
    try {
      await saveSessionsToDisk();
    } finally {
      isWriting = false;
    }
  }, 80);
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

export function createSession(session: StoredGameSession): StoredGameSession {
  saveSession(session);
  return session;
}

export function updateSession(session: StoredGameSession): StoredGameSession {
  saveSession(session);
  return session;
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
