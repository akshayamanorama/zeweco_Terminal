
import React, { useState } from 'react';
import { ShieldCheck, Loader2, Briefcase, BarChart3, ChevronRight, Lock, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../src/api/client';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

type LoginView = 'selection' | 'credentials' | 'forgot-request' | 'forgot-reset';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<LoginView>('selection');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'CXO' | 'Manager' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password flow
  const [resetEmail, setResetEmail] = useState('');
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleRoleSelect = (role: 'CXO' | 'Manager') => {
    setSelectedRole(role);
    setEmail(role === 'CXO' ? 'akshaya@zeweco.com' : 'kirtii@zeweco.com');
    setView('credentials');
    setError(null);
    setSuccessMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email?.trim() || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const user = await api.login(email.trim(), password);
      onLogin(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setError('Cannot reach server. Start backend: cd server && npm run dev');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = resetEmail.trim();
    if (!em) {
      setError('Enter your email');
      return;
    }
    setIsSendingCode(true);
    setError(null);
    try {
      await api.requestPasswordReset(em);
      setSuccessMessage('Check your email for a 6-digit code.');
      setEmail(em);
      setView('forgot-reset');
    } catch (err: unknown) {
      const res = err instanceof Error ? err.message : String(err);
      if (res.includes('Failed to send email') || res.includes('SMTP') || res.includes('Configure')) {
        setError('Email not set up. Add SMTP_USER and SMTP_PASS to server/.env to send reset codes.');
      } else if (res.includes('Cannot reach server') || res.includes('Failed to fetch')) {
        setError('Cannot reach server. Start the backend: cd server && npm run dev');
      } else {
        setError(res.length > 80 ? 'Request failed. Try again.' : res);
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = resetEmail.trim();
    if (!em || !pin.trim() || !newPassword || !confirmPassword) {
      setError('Fill all fields');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsResettingPassword(true);
    setError(null);
    try {
      await api.resetPasswordWithPin(em, pin.trim(), newPassword);
      setSuccessMessage('Password updated. Log in with your new password.');
      setPassword('');
      setPin('');
      setNewPassword('');
      setConfirmPassword('');
      setView('credentials');
    } catch (err: unknown) {
      const res = err instanceof Error ? err.message : String(err);
      if (res.includes('Invalid or expired')) {
        setError('Invalid or expired code. Request a new one.');
      } else {
        setError('Reset failed. Try again.');
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const goBack = () => {
    if (view === 'forgot-request') {
      setView('credentials');
      setResetEmail(email);
    } else if (view === 'forgot-reset') {
      setView('forgot-request');
    } else {
      setView('selection');
    }
    setError(null);
    setSuccessMessage(null);
  };

  const showBackButton = view === 'credentials' || view === 'forgot-request' || view === 'forgot-reset';
  const subtitle =
    view === 'selection'
      ? 'Select Authorization Level'
      : view === 'credentials'
        ? `Secure ${selectedRole} Login`
        : view === 'forgot-request'
          ? 'Send reset code to your email'
          : 'Enter code and set new password';

  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-black flex items-center justify-center p-6 transition-colors">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="bg-white/80 dark:bg-zinc-950/40 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500">

          {showBackButton && (
            <button
              type="button"
              onClick={goBack}
              className="absolute left-6 top-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-14 h-14 bg-zinc-900 dark:bg-zinc-800 rounded-2xl border border-zinc-800 dark:border-zinc-700 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden">
              {(isAuthenticating || isSendingCode || isResettingPassword) ? (
                <Loader2 className="text-white animate-spin" size={28} />
              ) : (
                <ShieldCheck className="text-white" size={28} />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2 uppercase tracking-widest">Zeweco Terminal</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em]">{subtitle}</p>
          </div>

          {view === 'selection' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                type="button"
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
                type="button"
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
          )}

          {view === 'credentials' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@zeweco.com"
                    autoComplete="email"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResetEmail(email.trim() || '');
                  setView('forgot-request');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </button>

              {successMessage && <p className="text-[10px] text-green-600 dark:text-green-400 font-medium text-center">{successMessage}</p>}
              {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider text-center">{error}</p>}

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

          {view === 'forgot-request' && (
            <form onSubmit={handleForgotRequest} className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Your email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@zeweco.com"
                    autoComplete="email"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">We’ll send a 6-digit code to this email. The code expires in 15 minutes.</p>
              {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider text-center">{error}</p>}
              <button
                type="submit"
                disabled={isSendingCode}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSendingCode ? <Loader2 size={18} className="animate-spin" /> : 'Send code'}
              </button>
            </form>
          )}

          {view === 'forgot-reset' && (
            <form onSubmit={handleForgotReset} className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  readOnly
                  className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Code from email</label>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all tracking-widest"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">New password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    autoComplete="new-password"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Confirm password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider text-center">{error}</p>}
              <button
                type="submit"
                disabled={isResettingPassword}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResettingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Set new password'}
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
