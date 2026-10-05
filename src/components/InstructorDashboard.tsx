import React, { useState, useEffect } from 'react';
import { 
  PublicSessionState, 
  Participant, 
  GameSettings, 
  FinalGameSummary,
  QuestionCategory 
} from '../types/game';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Eye, 
  Trophy, 
  Square, 
  Users, 
  Clock, 
  Download, 
  CheckCircle2, 
  RotateCcw, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  LogOut, 
  Sparkles, 
  Bot,
  HelpCircle,
  BarChart3,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/sound';
import { downloadResultsCsv } from '../utils/exportCsv';

interface InstructorDashboardProps {
  sessionState: PublicSessionState | null;
  detailedParticipants: Participant[];
  finalSummary: FinalGameSummary | null;
  onCreateSession: (settings: GameSettings) => void;
  onAddDemoLearners: () => void;
  onStartGame: () => void;
  onPauseResume: () => void;
  onRevealAnswer: () => void;
  onShowLeaderboard: () => void;
  onNextQuestion: () => void;
  onEndGame: () => void;
  onLogout: () => void;
}

const OPTION_THEMES = [
  { bg: 'bg-rose-500/20 border-rose-500/40 text-rose-300', badge: 'bg-rose-600 text-white', icon: '▲', label: 'A' },
  { bg: 'bg-blue-500/20 border-blue-500/40 text-blue-300', badge: 'bg-blue-600 text-white', icon: '◆', label: 'B' },
  { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300', badge: 'bg-amber-600 text-white', icon: '●', label: 'C' },
  { bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', badge: 'bg-emerald-600 text-white', icon: '■', label: 'D' }
];

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  sessionState,
  detailedParticipants,
  finalSummary,
  onCreateSession,
  onAddDemoLearners,
  onStartGame,
  onPauseResume,
  onRevealAnswer,
  onShowLeaderboard,
  onNextQuestion,
  onEndGame,
  onLogout
}) => {
  // Settings for session creation
  const [timerSeconds, setTimerSeconds] = useState<number>(20);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [categoryFilter, setCategoryFilter] = useState<'all' | QuestionCategory>('all');
  const [questionMode, setQuestionMode] = useState<'random' | 'sequential'>('random');
  const [copiedPin, setCopiedPin] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [activeTab, setActiveTab] = useState<'live' | 'participants'>('live');

  // Trigger confetti when game finishes
  useEffect(() => {
    if (sessionState?.status === 'finished') {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch {
        // Fallback
      }
    }
  }, [sessionState?.status]);

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleCopyPin = () => {
    if (sessionState?.pin) {
      navigator.clipboard.writeText(sessionState.pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateSession({
      timerSeconds,
      totalQuestions,
      categoryFilter,
      questionMode
    });
  };

  // If no session created yet
  if (!sessionState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Instructor Control Panel
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Crear Nueva Sesión en Vivo
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Configura los parámetros para tu grupo de aprendices (20–30 simultáneos).
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Question Count */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Cantidad de Preguntas
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTotalQuestions(num)}
                      className={`py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                        totalQuestions === num
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Categoría Temática
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'Todas las Categorías' },
                    { id: 'to_be', label: 'Category 1: Verb TO BE' },
                    { id: 'yes_no', label: 'Category 2: Yes/No Questions' },
                    { id: 'wh_questions', label: 'Category 3: WH Questions' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id as 'all' | QuestionCategory)}
                      className={`p-3 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                        categoryFilter === cat.id
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Seconds */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Tiempo por Pregunta
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 30, 45].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTimerSeconds(sec)}
                      className={`py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                        timerSeconds === sec
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {sec} seg
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Mode */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Modo de Selección
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionMode('random')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      questionMode === 'random'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    🎲 Preguntas Aleatorias
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionMode('sequential')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      questionMode === 'sequential'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    📋 Orden Secuencial
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-base shadow-xl shadow-indigo-600/30 cursor-pointer transition-all active:scale-[0.99]"
              >
                CREATE SESSION
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <button
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión de instructor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Session View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
              LIVE SESSION
            </span>
          </div>

          {/* Large PIN display */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-indigo-500/30 px-3 py-1 rounded-xl">
            <span className="text-xs text-indigo-400 font-semibold">GAME PIN:</span>
            <span className="font-mono font-black text-lg text-white tracking-wider">
              {sessionState.pin}
            </span>
            <button
              onClick={handleCopyPin}
              title="Copiar PIN"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Participant count */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs font-semibold text-emerald-400">
            <Users className="w-3.5 h-3.5" />
            <span>{sessionState.participantsCount} Aprendices</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            aria-label="Toggle Sound"
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ============================================================== */}
        {/* VIEW 1: LOBBY */}
        {/* ============================================================== */}
        {sessionState.status === 'lobby' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Big PIN Presentation Card */}
            <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="w-64 h-64 text-indigo-400" />
              </div>

              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
                Pide a los aprendices ingresar a la aplicación con el código SENA2026
              </span>

              <div className="my-6">
                <span className="text-xs text-slate-400 uppercase tracking-widest block font-bold mb-1">
                  GAME PIN DE LA SALA
                </span>
                <div className="text-6xl sm:text-8xl font-black font-mono text-white tracking-widest drop-shadow-md">
                  {sessionState.pin}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleCopyPin}
                  className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition"
                >
                  {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPin ? 'PIN Copiado!' : 'Copiar PIN'}</span>
                </button>

                <button
                  onClick={onAddDemoLearners}
                  className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-2 cursor-pointer transition"
                >
                  <Bot className="w-4 h-4" />
                  <span>DEMO MODE (+10 Aprendices Simulados)</span>
                </button>
              </div>
            </div>

            {/* Connected Learners Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-lg">
                    Aprendices Conectados ({sessionState.participantsCount})
                  </h3>
                </div>

                <button
                  onClick={onStartGame}
                  disabled={sessionState.participantsCount === 0}
                  className={`px-8 py-3 rounded-xl font-extrabold text-base flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                    sessionState.participantsCount > 0
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/30 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START GAME</span>
                </button>
              </div>

              {sessionState.participantsCount === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <p className="animate-pulse">Esperando a que los aprendices ingresen con el PIN...</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Tip: Puedes presionar el botón <strong>"DEMO MODE"</strong> para simular 10 jugadores automáticamente.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {detailedParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-semibold text-xs text-slate-200 truncate">{p.name}</p>
                        {p.ficha && <p className="text-[10px] text-slate-400 truncate">{p.ficha}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: QUESTION ACTIVE */}
        {/* ============================================================== */}
        {sessionState.status === 'question_active' && sessionState.currentQuestion && (
          <div className="space-y-6 animate-fadeIn">
            {/* Control Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 font-extrabold text-sm border border-indigo-500/30">
                  Pregunta {sessionState.currentQuestionIndex + 1} de {sessionState.totalQuestions}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {sessionState.currentQuestion.categoryLabel}
                </span>
              </div>

              {/* Timer indicator */}
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono font-black text-lg ${
                sessionState.timeRemaining <= 3 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : sessionState.timeRemaining <= 5 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-slate-800 text-emerald-400 border border-slate-700'
              }`}>
                <Clock className="w-5 h-5" />
                <span>{sessionState.timeRemaining}s</span>
              </div>

              {/* Instructor Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onPauseResume}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{sessionState.isPaused ? 'Reanudar' : 'Pausar'}</span>
                </button>

                <button
                  onClick={onRevealAnswer}
                  className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Reveal Answer</span>
                </button>

                <button
                  onClick={onEndGame}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End Game</span>
                </button>
              </div>
            </div>

            {/* Answering Progress Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Respuestas Recibidas:</span>
                <span className="text-emerald-400 font-mono">
                  {sessionState.answeredCount} / {sessionState.participantsCount} ({
                    sessionState.participantsCount > 0 
                      ? Math.round((sessionState.answeredCount / sessionState.participantsCount) * 100) 
                      : 0
                  }%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{
                    width: `${sessionState.participantsCount > 0 ? (sessionState.answeredCount / sessionState.participantsCount) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Question Text Box */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
              <p className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-relaxed">
                {sessionState.currentQuestion.question}
              </p>
            </div>

            {/* 4 Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessionState.currentQuestion.options.map((opt, idx) => {
                const theme = OPTION_THEMES[idx];
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border ${theme.bg} flex items-center gap-3.5`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${theme.badge}`}>
                      {theme.icon}
                    </span>
                    <span className="font-bold text-lg text-white">{opt}</span>
                  </div>
                );
              })}
            </div>

            {/* Live Participants Answering Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Live Participants Status</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {detailedParticipants.map((p) => (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      p.hasAnswered
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] font-mono shrink-0 ml-2">
                      {p.hasAnswered ? '🟢 Answered' : '⏳ Waiting'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: QUESTION ENDED (REVEAL ANSWER & STATS) */}
        {/* ============================================================== */}
        {sessionState.status === 'question_ended' && sessionState.currentQuestion && (
          <div className="space-y-6 animate-fadeIn">
            {/* Control Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs">
                  Respuesta Revelada
                </span>
                <span className="text-xs text-slate-400">
                  Pregunta {sessionState.currentQuestionIndex + 1} de {sessionState.totalQuestions}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onShowLeaderboard}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>SHOW LEADERBOARD</span>
                </button>

                <button
                  onClick={onNextQuestion}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>NEXT QUESTION</span>
                </button>

                <button
                  onClick={onEndGame}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End Game</span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white">
                {sessionState.currentQuestion.question}
              </p>
            </div>

            {/* Options with Answer Distribution & Correct Checkmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessionState.currentQuestion.options.map((opt, idx) => {
                const isCorrect = idx === sessionState.currentQuestion?.correctIndex;
                const count = sessionState.answerDistribution ? sessionState.answerDistribution[idx] : 0;
                const total = sessionState.participantsCount || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCorrect
                        ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/50 shadow-xl shadow-emerald-950/50'
                        : 'bg-slate-900 border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {OPTION_THEMES[idx].icon}
                        </span>
                        <span className={`font-bold text-lg ${isCorrect ? 'text-white' : 'text-slate-300'}`}>
                          {opt}
                        </span>
                      </div>

                      {isCorrect && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct</span>
                        </span>
                      )}
                    </div>

                    {/* Tally Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                        <span>{count} aprendices</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className={`h-full ${isCorrect ? 'bg-emerald-400' : 'bg-slate-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation box */}
            {sessionState.currentQuestion.explanation && (
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                    Explicación Pedagógica
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {sessionState.currentQuestion.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: INTERMEDIATE LEADERBOARD */}
        {/* ============================================================== */}
        {sessionState.status === 'leaderboard' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Ranking en Vivo
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Tabla de Clasificación
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onNextQuestion}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>NEXT QUESTION</span>
                </button>

                <button
                  onClick={onEndGame}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End Game</span>
                </button>
              </div>
            </div>

            {/* Podium for Top 3 */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl mx-auto pt-6 pb-2 items-end">
              {/* 2nd Place */}
              {sessionState.leaderboard[1] && (
                <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-4 text-center transform hover:scale-105 transition shadow-lg">
                  <span className="text-2xl">🥈</span>
                  <div className="font-bold text-white text-sm truncate mt-1">
                    {sessionState.leaderboard[1].name}
                  </div>
                  <div className="font-mono font-extrabold text-slate-300 text-base mt-1">
                    {sessionState.leaderboard[1].score.toLocaleString()} pts
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 block">2nd Place</span>
                </div>
              )}

              {/* 1st Place */}
              {sessionState.leaderboard[0] && (
                <div className="bg-gradient-to-b from-amber-950/60 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-5 text-center transform scale-110 shadow-2xl relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Líder
                  </div>
                  <span className="text-3xl">🥇</span>
                  <div className="font-black text-white text-base truncate mt-1">
                    {sessionState.leaderboard[0].name}
                  </div>
                  <div className="font-mono font-black text-amber-400 text-lg mt-1">
                    {sessionState.leaderboard[0].score.toLocaleString()} pts
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-1 block">1st Place</span>
                </div>
              )}

              {/* 3rd Place */}
              {sessionState.leaderboard[2] && (
                <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-4 text-center transform hover:scale-105 transition shadow-lg">
                  <span className="text-2xl">🥉</span>
                  <div className="font-bold text-white text-sm truncate mt-1">
                    {sessionState.leaderboard[2].name}
                  </div>
                  <div className="font-mono font-extrabold text-amber-600 text-base mt-1">
                    {sessionState.leaderboard[2].score.toLocaleString()} pts
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 block">3rd Place</span>
                </div>
              )}
            </div>

            {/* Scrollable Leaderboard List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="divide-y divide-slate-800">
                {sessionState.leaderboard.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                        item.rank === 1 ? 'bg-amber-400 text-slate-950' : item.rank === 2 ? 'bg-slate-300 text-slate-950' : item.rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.rank}
                      </span>
                      <div>
                        <span className="font-bold text-sm text-white">{item.name}</span>
                        {item.ficha && <span className="text-xs text-slate-400 ml-2 font-mono">({item.ficha})</span>}
                      </div>
                    </div>

                    <div className="font-mono font-bold text-base text-amber-400">
                      {item.score.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: FINISHED GAME REPORT & RESULTS */}
        {/* ============================================================== */}
        {sessionState.status === 'finished' && finalSummary && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header with Download & Restart */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-2xl">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Actividad Completada
                </span>
                <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">
                  GAME RESULTS REPORT
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Resumen general del rendimiento de los aprendices en el desafío.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadResultsCsv(finalSummary)}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>DOWNLOAD RESULTS (CSV)</span>
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem('to_be_active_pin');
                    window.location.reload();
                  }}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>NUEVA SESIÓN</span>
                </button>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Total Participantes</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {finalSummary.totalParticipants}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Total Preguntas</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {finalSummary.totalQuestions}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Puntaje Promedio</span>
                <span className="text-2xl font-black text-indigo-400 font-mono mt-1 block">
                  {finalSummary.averageScore.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Puntaje Más Alto</span>
                <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                  {finalSummary.highestScore.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                  {finalSummary.winnerName}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Precisión Global</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  {finalSummary.overallAccuracy}%
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold block">Pregunta Más Difícil</span>
                <span className="text-xs font-bold text-rose-400 mt-1 line-clamp-2 block">
                  {finalSummary.mostDifficultQuestion ? finalSummary.mostDifficultQuestion.questionText : 'N/A'}
                </span>
                {finalSummary.mostDifficultQuestion && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {finalSummary.mostDifficultQuestion.accuracyPercentage}% de acierto
                  </span>
                )}
              </div>
            </div>

            {/* Detailed Learners Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-white text-base">
                    Tabla Detallada por Aprendiz
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-3.5 pl-6">Posición</th>
                      <th className="p-3.5">Nombre</th>
                      <th className="p-3.5">Ficha/Grupo</th>
                      <th className="p-3.5">Puntaje Final</th>
                      <th className="p-3.5 text-center">Correctas</th>
                      <th className="p-3.5 text-center">Incorrectas</th>
                      <th className="p-3.5 text-right pr-6">Precisión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {finalSummary.participantsRanked.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 pl-6 font-mono font-bold">
                          <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs ${
                            p.rank === 1 ? 'bg-amber-400 text-slate-950' : p.rank === 2 ? 'bg-slate-300 text-slate-950' : p.rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {p.rank}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-white">{p.name}</td>
                        <td className="p-3.5 text-slate-400 text-xs font-mono">{p.ficha || 'N/A'}</td>
                        <td className="p-3.5 font-mono font-extrabold text-amber-400">
                          {p.score.toLocaleString()} pts
                        </td>
                        <td className="p-3.5 text-center text-emerald-400 font-mono font-bold">
                          {p.correctCount}
                        </td>
                        <td className="p-3.5 text-center text-rose-400 font-mono font-bold">
                          {p.incorrectCount}
                        </td>
                        <td className="p-3.5 text-right pr-6 font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            p.accuracy >= 80 ? 'bg-emerald-500/20 text-emerald-400' : p.accuracy >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {p.accuracy}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-2.5 px-4 text-center text-xs text-slate-400 border-t border-slate-800/60">
        TO BE LIVE CHALLENGE • Panel Instructor • SENA 2026
      </footer>
    </div>
  );
};
