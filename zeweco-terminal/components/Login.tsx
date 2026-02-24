
import React, { useState } from 'react';
import { ShieldCheck, User, Loader2, Briefcase, BarChart3, ChevronRight, Lock, Mail, ArrowLeft } from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../src/api/client';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

type LoginView = 'selection' | 'credentials' | 'forgot-request' | 'forgot-pin';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<LoginView>('selection');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'CXO' | 'Manager' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetSentPin, setResetSentPin] = useState<string | null>(null);

  const handleRoleSelect = (role: 'CXO' | 'Manager') => {
    setSelectedRole(role);
    setEmail(role === 'CXO' ? 'akshaya@zeweco.com' : 'manager@zeweco.com');
    setView('credentials');
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide all credentials');
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const user = await api.login(email, password);
      onLogin(user);
    } catch (err) {
      setError('Invalid credentials');
      setIsAuthenticating(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) { setError('Enter your email'); return; }
    setError(null); setResetMessage(null); setResetSentPin(null);
    setIsAuthenticating(true);
    try {
      const res = await api.requestPasswordReset(resetEmail.trim());
      setResetMessage(res.message || 'Check your email for the reset PIN.');
      if (res.pin) setResetSentPin(res.pin);
      setView('forgot-pin');
    } catch (err) {
      setError('Request failed. Try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleResetWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetPin.trim() || resetPassword.length < 4) {
      setError('Email, 6-digit PIN, and new password (min 4 chars) required');
      return;
    }
    setError(null);
    setIsAuthenticating(true);
    try {
      await api.resetPasswordWithPin(resetEmail.trim(), resetPin.trim(), resetPassword);
      setResetMessage('Password reset. You can log in now.');
      setView('credentials');
      setResetPin(''); setResetPassword(''); setResetSentPin(null);
    } catch (err) {
      setError('Reset failed. Check PIN and try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-black flex items-center justify-center p-6 transition-colors">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="bg-white/80 dark:bg-zinc-950/40 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500">

          {(view === 'credentials' || view === 'forgot-request' || view === 'forgot-pin') && (
            <button
              onClick={() => { setView(view === 'credentials' ? 'selection' : 'credentials'); setError(null); setResetMessage(null); setResetSentPin(null); }}
              className="absolute left-6 top-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-14 h-14 bg-zinc-900 dark:bg-zinc-800 rounded-2xl border border-zinc-800 dark:border-zinc-700 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden">
              {isAuthenticating ? (
                <Loader2 className="text-white animate-spin" size={28} />
              ) : (
                <ShieldCheck className="text-white" size={28} />
              )}
              {isAuthenticating && (
                <div className="absolute inset-0 bg-blue-500/20 animate-pulse" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2 uppercase tracking-widest">Zeweco Terminal</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em]">
              {view === 'selection' && 'Select Authorization Level'}
              {view === 'credentials' && `Secure ${selectedRole} Login`}
              {view === 'forgot-request' && 'Request password reset'}
              {view === 'forgot-pin' && 'Enter PIN and new password'}
            </p>
          </div>

          {view === 'selection' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                onClick={() => handleRoleSelect('CXO')}
                className="w-full group flex items-center gap-4 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 hover:border-blue-400 dark:hover:border-zinc-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  <BarChart3 size={20} className="text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">Log-in as CXO</p>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 opacity-60">Full Portfolio Access</p>
                </div>
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all" />
              </button>

              <button
                onClick={() => handleRoleSelect('Manager')}
                className="w-full group flex items-center gap-4 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 hover:border-blue-400 dark:hover:border-zinc-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  <Briefcase size={20} className="text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">Log-in as Manager</p>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 opacity-60">Operational Workspace</p>
                </div>
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            </div>
          ) : view === 'forgot-request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="your@zeweco.com" required
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              {error && <p className="text-[10px] text-red-500 text-center">{error}</p>}
              <button type="submit" disabled={isAuthenticating} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isAuthenticating ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : 'Send reset PIN'}
              </button>
            </form>
          ) : view === 'forgot-pin' ? (
            <form onSubmit={handleResetWithPin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              {resetMessage && <p className="text-[10px] text-green-600 dark:text-green-400 text-center">{resetMessage}</p>}
              {resetSentPin && <p className="text-[10px] font-mono text-zinc-500 text-center">PIN (dev): {resetSentPin}</p>}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">6-digit PIN</label>
                <input type="text" value={resetPin} onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} required
                  className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 px-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">New password (min 4 chars)</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="••••••••" minLength={4} required
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              {error && <p className="text-[10px] text-red-500 text-center">{error}</p>}
              <button type="submit" disabled={isAuthenticating} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isAuthenticating ? <><Loader2 size={18} className="animate-spin" /> Resetting...</> : 'Reset password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Terminal Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@zeweco.com"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Key-Code</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {error && (
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider text-center animate-pulse">{error}</p>
              )}

              <button
                type="button"
                onClick={() => { setView('forgot-request'); setResetEmail(email); setError(null); setResetMessage(null); setResetSentPin(null); }}
                className="text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 underline underline-offset-2"
              >
                Forgot password?
              </button>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-zinc-200 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Authorize Access'
                )}
              </button>
            </form>
          )}

          <div className="mt-10 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">System Online • Build 4.2.1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
