import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface AccessGateProps {
  onRoleGranted: (role: 'learner' | 'instructor') => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onRoleGranted }) => {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = accessCode.trim().toUpperCase();

    if (clean === 'SENA2026' || clean === 'SENA60') {
      localStorage.setItem('to_be_role', 'learner');
      onRoleGranted('learner');
    } else if (clean === 'TEACHER2026' || clean === '60') {
      localStorage.setItem('to_be_role', 'instructor');
      onRoleGranted('instructor');
    } else {
      setError('Código de acceso no válido. Por favor verifica e intenta nuevamente.');
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
                  type="password"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ingresa tu código de acceso"
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
