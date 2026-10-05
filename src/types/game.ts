export type QuestionCategory = 'to_be' | 'yes_no' | 'wh_questions';

export interface Question {
  id: string;
  category: QuestionCategory;
  categoryLabel: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0, 1, 2, 3
  explanation: string;
  difficulty: 'easy' | 'medium';
}

export type SessionStatus = 
  | 'lobby' 
  | 'question_active' 
  | 'question_ended' 
  | 'leaderboard' 
  | 'finished';

export interface ParticipantAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  points: number;
  timeSpentSeconds: number;
}

export interface Participant {
  id: string;
  name: string;
  ficha?: string;
  score: number;
  lastPointsEarned: number;
  streak: number;
  isOnline: boolean;
  hasAnswered: boolean;
  selectedOption: number | null;
  answeredAt: number | null;
  answers: ParticipantAnswer[];
  isSimulated?: boolean;
}

export interface GameSettings {
  timerSeconds: number; // 10, 20, 30, 45
  totalQuestions: number; // 5, 10, 15, 20, or all
  categoryFilter: 'all' | QuestionCategory;
  questionMode: 'random' | 'sequential';
}

export interface PublicSessionState {
  pin: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion?: {
    id: string;
    category: QuestionCategory;
    categoryLabel: string;
    question: string;
    options: [string, string, string, string];
    correctIndex?: number; // Only sent when status is question_ended or finished
    explanation?: string;
    difficulty: 'easy' | 'medium';
  };
  timeRemaining: number;
  totalTimerSeconds: number;
  isPaused: boolean;
  participantsCount: number;
  answeredCount: number;
  answerDistribution?: [number, number, number, number]; // How many picked 0, 1, 2, 3
  leaderboard: {
    id: string;
    name: string;
    ficha?: string;
    score: number;
    streak: number;
    rank: number;
    lastPoints: number;
  }[];
}

export interface QuestionStats {
  questionId: string;
  questionText: string;
  category: string;
  correctAnswersCount: number;
  totalAnswersCount: number;
  accuracyPercentage: number;
}

export interface FinalGameSummary {
  pin: string;
  totalParticipants: number;
  totalQuestions: number;
  averageScore: number;
  highestScore: number;
  winnerName: string;
  overallAccuracy: number;
  mostDifficultQuestion?: {
    questionText: string;
    accuracyPercentage: number;
  };
  participantsRanked: {
    rank: number;
    id: string;
    name: string;
    ficha?: string;
    score: number;
    correctCount: number;
    incorrectCount: number;
    accuracy: number;
  }[];
}
