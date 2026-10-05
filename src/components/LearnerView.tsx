import React, { useState, useEffect } from 'react';
import { 
  PublicSessionState 
} from '../types/game';
import confetti from 'canvas-confetti';
import { 
  Clock, 
  Flame, 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Volume2, 
  VolumeX, 
  LogOut,
  Sparkles,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface LearnerViewProps {
  sessionState: PublicSessionState | null;
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
  onJoinSession: (pin: string, name: string, ficha?: string, participantId?: string) => void;
  onSubmitAnswer: (selectedIndex: number) => void;
  onLogout: () => void;
  errorMessage: string | null;
}

const OPTION_STYLES = [
  {
    bg: 'from-rose-500 to-red-600',
    hover: 'hover:from-rose-400 hover:to-red-500',
    border: 'border-red-400/30',
    selected: 'ring-4 ring-rose-400 border-white',
    badge: 'bg-red-700/80 text-white',
    icon: '▲',
    label: 'A'
  },
  {
    bg: 'from-sky-500 to-blue-600',
    hover: 'hover:from-sky-400 hover:to-blue-500',
    border: 'border-blue-400/30',
    selected: 'ring-4 ring-sky-400 border-white',
    badge: 'bg-blue-700/80 text-white',
    icon: '◆',
    label: 'B'
  },
  {
    bg: 'from-amber-500 to-orange-600',
    hover: 'hover:from-amber-400 hover:to-orange-500',
    border: 'border-amber-400/30',
    selected: 'ring-4 ring-amber-400 border-white',
    badge: 'bg-amber-700/80 text-white',
    icon: '●',
    label: 'C'
  },
  {
    bg: 'from-emerald-500 to-green-600',
    hover: 'hover:from-emerald-400 hover:to-green-500',
    border: 'border-emerald-400/30',
    selected: 'ring-4 ring-emerald-400 border-white',
    badge: 'bg-emerald-700/80 text-white',
    icon: '■',
    label: 'D'
  }
];

export const LearnerView: React.FC<LearnerViewProps> = ({
  sessionState,
  personalInfo,
  onJoinSession,
  onSubmitAnswer,
  onLogout,
  errorMessage
}) => {
  const [name, setName] = useState(localStorage.getItem('to_be_learner_name') || '');
  const [ficha, setFicha] = useState(localStorage.getItem('to_be_learner_ficha') || '');
  const [pin, setPin] = useState(localStorage.getItem('to_be_active_pin') || '');
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [hasConfettied, setHasConfettied] = useState(false);

  // Trigger confetti if top 3 on game finish
  useEffect(() => {
    if (sessionState?.status === 'finished' && personalInfo && personalInfo.rank <= 3 && !hasConfettied) {
      setHasConfettied(true);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Fallback
      }
    }
  }, [sessionState?.status, personalInfo, hasConfettied]);

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!pin.trim()) return;

    localStorage.setItem('to_be_learner_name', name.trim());
    if (ficha.trim()) {
      localStorage.setItem('to_be_learner_ficha', ficha.trim());
    }
    const savedPartId = localStorage.getItem('to_be_participant_id') || undefined;
    onJoinSession(pin.trim(), name.trim(), ficha.trim(), savedPartId);
  };

  // If learner is not in a session yet, show Join Form
  if (!sessionState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              Perfil Aprendiz
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Unirse al Desafío
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Ingresa tu nombre y el PIN de 6 dígitos compartido por tu instructor.
            </p>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Enter your name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre completo o apodo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Ficha o Grupo <span className="text-slate-500 lowercase">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ficha 2718290 o Grupo B"
                  value={ficha}
                  onChange={(e) => setFicha(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Game PIN *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6 dígitos (ej: 482931)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white font-mono text-center tracking-widest text-2xl font-bold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-base shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-[0.99]"
              >
                <span>JOIN GAME</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cambiar de perfil o cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active in room
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
            <span className="text-xs text-slate-400">PIN:</span>
            <span className="font-mono font-bold text-sm text-indigo-300">{sessionState.pin}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{sessionState.participantsCount} conectados</span>
          </div>
        </div>

        {/* User stats pill */}
        <div className="flex items-center gap-3">
          {personalInfo && (
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 px-3 py-1 rounded-full">
              <span className="text-xs font-semibold text-slate-200">{personalInfo.name}</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                {personalInfo.score.toLocaleString()} pts
              </span>
              {personalInfo.streak > 1 && (
                <span className="flex items-center text-xs font-bold text-orange-400">
                  <Flame className="w-3.5 h-3.5 inline mr-0.5 fill-orange-400 text-orange-500" />
                  {personalInfo.streak}
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleToggleSound}
            aria-label="Toggle Sound"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onLogout}
            aria-label="Cerrar sesión"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* ============================================================== */}
        {/* STATE 1: LOBBY */}
        {/* ============================================================== */}
        {sessionState.status === 'lobby' && (
          <div className="text-center py-10 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center relative">
              <Sparkles className="w-10 h-10 text-indigo-400 animate-bounce" />
              <div className="absolute inset-0 rounded-full border border-indigo-400 animate-ping opacity-25" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Welcome, {personalInfo?.name || 'Learner'}!
              </h2>
              {ficha && (
                <p className="text-sm text-indigo-300 font-mono">
                  {ficha}
                </p>
              )}
              <p className="text-lg text-slate-400 animate-pulse font-medium">
                Waiting for instructor to start...
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>
                <strong className="text-white">{sessionState.participantsCount}</strong> aprendices en la sala
              </span>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-400">
              💡 <strong>Tip:</strong> Responde rápido y de forma correcta para ganar la máxima puntuación en cada pregunta.
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STATE 2: QUESTION ACTIVE */}
        {/* ============================================================== */}
        {sessionState.status === 'question_active' && sessionState.currentQuestion && (
          <div className="space-y-6 animate-fadeIn">
            {/* Question Header & Countdown */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                  Question {sessionState.currentQuestionIndex + 1} / {sessionState.totalQuestions}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium">
                  {sessionState.currentQuestion.categoryLabel}
                </span>
              </div>

              {/* Countdown badge */}
              <div className={`flex items-center gap-2 px-3.5 py-1 rounded-xl font-mono font-bold text-base transition-colors ${
                sessionState.timeRemaining <= 3 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : sessionState.timeRemaining <= 5 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-slate-800 text-emerald-400 border border-slate-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{sessionState.timeRemaining}s</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 linear ${
                  sessionState.timeRemaining <= 3 ? 'bg-rose-500' : sessionState.timeRemaining <= 5 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${(sessionState.timeRemaining / sessionState.totalTimerSeconds) * 100}%`
                }}
              />
            </div>

            {/* Question Text Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-xl">
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-relaxed">
                {sessionState.currentQuestion.question}
              </p>
            </div>

            {/* Response status message if answered */}
            {personalInfo?.hasAnswered && (
              <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>Answer submitted! Waiting for time or instructor...</span>
              </div>
            )}

            {/* 4 Interactive Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {sessionState.currentQuestion.options.map((option, idx) => {
                const style = OPTION_STYLES[idx];
                const isSelected = personalInfo?.selectedOption === idx;
                const isAnswered = !!personalInfo?.hasAnswered;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => onSubmitAnswer(idx)}
                    className={`relative p-5 rounded-2xl text-left font-bold text-lg sm:text-xl text-white transition-all transform flex items-center gap-3.5 shadow-lg ${
                      isSelected 
                        ? `bg-gradient-to-r ${style.bg} ${style.selected} scale-[1.02] shadow-2xl`
                        : isAnswered 
                          ? 'opacity-40 bg-slate-900 border border-slate-800 cursor-not-allowed' 
                          : `bg-gradient-to-r ${style.bg} ${style.hover} border ${style.border} active:scale-95 cursor-pointer hover:shadow-xl`
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${style.badge}`}>
                      {style.icon}
                    </span>
                    <span className="flex-1 truncate">{option}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-6 h-6 text-white shrink-0 animate-bounce" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STATE 3: QUESTION ENDED (REVEAL ANSWER & FEEDBACK) */}
        {/* ============================================================== */}
        {sessionState.status === 'question_ended' && sessionState.currentQuestion && (
          <div className="space-y-6 animate-fadeIn">
            {/* Feedback Banner */}
            {personalInfo && (
              <div className={`p-6 rounded-2xl border text-center shadow-2xl ${
                personalInfo.lastPointsEarned > 0
                  ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900 border-emerald-500/50 text-white'
                  : 'bg-gradient-to-b from-rose-950/80 to-slate-900 border-rose-500/50 text-white'
              }`}>
                <div className="inline-flex p-3 rounded-full mb-3 bg-slate-900/60 border border-slate-800">
                  {personalInfo.lastPointsEarned > 0 ? (
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  ) : (
                    <XCircle className="w-10 h-10 text-rose-400" />
                  )}
                </div>

                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {personalInfo.lastPointsEarned > 0 ? 'Correct!' : 'Incorrect.'}
                </h3>

                <p className="text-lg font-mono font-bold mt-1 text-emerald-400">
                  +{personalInfo.lastPointsEarned.toLocaleString()} points
                </p>

                <div className="mt-4 flex items-center justify-center gap-4 text-xs sm:text-sm text-slate-300">
                  <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                    Your answer: <strong className="text-white">
                      {personalInfo.selectedOption !== null && personalInfo.selectedOption >= 0 
                        ? sessionState.currentQuestion.options[personalInfo.selectedOption] 
                        : 'No response'}
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Position: <strong className="text-amber-400 font-mono">#{personalInfo.rank}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Pedagogical Explanation Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4" />
                <span>Respuesta Correcta & Explicación</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-base">
                Correct Answer: {sessionState.currentQuestion.correctIndex !== undefined 
                  ? sessionState.currentQuestion.options[sessionState.currentQuestion.correctIndex] 
                  : ''}
              </div>

              {sessionState.currentQuestion.explanation && (
                <p className="text-slate-300 text-sm leading-relaxed">
                  {sessionState.currentQuestion.explanation}
                </p>
              )}
            </div>

            <div className="text-center text-slate-400 text-sm font-medium animate-pulse">
              Waiting for next question...
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STATE 4: INTERMEDIATE LEADERBOARD */}
        {/* ============================================================== */}
        {sessionState.status === 'leaderboard' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Trophy className="w-3.5 h-3.5" />
                Live Standings
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Tabla de Clasificación
              </h2>
            </div>

            {/* Top 5 list */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="divide-y divide-slate-800">
                {sessionState.leaderboard.slice(0, 5).map((player) => {
                  const isMe = personalInfo?.id === player.id;
                  return (
                    <div 
                      key={player.id} 
                      className={`p-4 flex items-center justify-between transition-colors ${
                        isMe ? 'bg-indigo-600/20 border-l-4 border-indigo-500 font-bold' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
                          player.rank === 1 ? 'bg-amber-400 text-slate-950' : player.rank === 2 ? 'bg-slate-300 text-slate-950' : player.rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {player.rank}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{player.name}</span>
                            {isMe && <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded">TÚ</span>}
                          </div>
                          {player.ficha && <span className="text-[11px] text-slate-400">{player.ficha}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-base text-amber-400">
                          {player.score.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* If user is below top 5, show their personal rank card */}
            {personalInfo && personalInfo.rank > 5 && (
              <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-sm">
                    {personalInfo.rank}
                  </span>
                  <div>
                    <span className="text-sm font-bold text-white">Tu Posición Actual</span>
                    <p className="text-xs text-slate-300">¡Sigue así en la siguiente pregunta!</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-lg text-amber-400">
                  {personalInfo.score.toLocaleString()} pts
                </span>
              </div>
            )}

            <div className="text-center text-slate-400 text-sm font-medium animate-pulse">
              Waiting for instructor...
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STATE 5: FINISHED GAME */}
        {/* ============================================================== */}
        {sessionState.status === 'finished' && (
          <div className="text-center py-6 space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-4xl">🏆</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Game Over!
              </h2>
              <p className="text-slate-400 text-sm">
                ¡Gran trabajo practicando el verbo TO BE hoy!
              </p>
            </div>

            {/* Personal Result Card */}
            {personalInfo && (
              <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-1">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Final Standing</span>
                  <div className="text-4xl font-black text-white font-mono mt-1">
                    #{personalInfo.rank}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    de {sessionState.participantsCount} participantes
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Puntaje Total</span>
                    <span className="text-lg font-mono font-bold text-amber-400">
                      {personalInfo.score.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Racha Máxima</span>
                    <span className="text-lg font-mono font-bold text-orange-400 flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
                      {personalInfo.streak}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition cursor-pointer"
            >
              Salir o Jugar Otra Ronda
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-2.5 px-4 text-center text-xs text-slate-400 border-t border-slate-800/60">
        TO BE LIVE CHALLENGE • Inglés SENA 2026
      </footer>
    </div>
  );
};
