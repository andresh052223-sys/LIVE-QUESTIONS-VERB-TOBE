import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, GraduationCap, Users } from 'lucide-react';

interface AccessGateProps {
  onRoleGranted: (role: 'learner' | 'instructor') => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onRoleGranted }) => {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = accessCode.trim().toUpperCase();

    if (clean === 'SENA2026') {
      localStorage.setItem('to_be_role', 'learner');
      onRoleGranted('learner');
    } else if (clean === 'TEACHER2026') {
      localStorage.setItem('to_be_role', 'instructor');
      onRoleGranted('instructor');
    } else {
      setError('Código de acceso no válido. Por favor verifica e intenta nuevamente.');
    }
  };

  const handleQuickCode = (code: string) => {
    setAccessCode(code);
    setError(null);
    if (code === 'SENA2026') {
      localStorage.setItem('to_be_role', 'learner');
      onRoleGranted('learner');
    } else if (code === 'TEACHER2026') {
      localStorage.setItem('to_be_role', 'instructor');
      onRoleGranted('instructor');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            Interactive Live Learning
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            TO BE <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">LIVE CHALLENGE</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Plataforma interactiva en vivo para dominar el verbo TO BE y preguntas en inglés.
          </p>
        </div>

        {/* Access Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="code" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Enter your access code
              </label>
              <div className="relative">
                <input
                  id="code"
                  type="text"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ej: SENA2026 o TEACHER2026"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white font-mono text-center tracking-widest text-lg uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  autoFocus
                />
              </div>
              {error && (
                <p className="mt-2 text-xs text-rose-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all cursor-pointer active:scale-[0.99]"
            >
              <span>Ingresar a la plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access Badges for convenience */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-xs text-center text-slate-400 mb-3 font-medium">
              Acceso rápido para prueba:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickCode('SENA2026')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-0.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Aprendiz</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-200">
                  SENA2026
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickCode('TEACHER2026')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-0.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Instructor</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-200">
                  TEACHER2026
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & System Info Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Sesión segura • Conexión en vivo para 20-30 aprendices</span>
        </div>
      </div>
    </div>
  );
};
