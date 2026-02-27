import React from 'react';
import { X, User as UserIcon, Mail, Shield, Calendar } from 'lucide-react';
import { User } from '../types';

interface ManagerProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const ManagerProfile: React.FC<ManagerProfileProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  const lastLoginDisplay = user?.lastLogin
    ? new Date(user.lastLogin).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            {user?.role === 'Manager' ? 'Profile' : 'Profile & Settings'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{user.name}</h3>
                  <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{user.role}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 py-2 px-0">
                  <Mail size={14} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Email</p>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 py-2 px-0">
                  <Shield size={14} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Role</p>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{user.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 py-2 px-0">
                  <Calendar size={14} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Last login</p>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{lastLoginDisplay}</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 pt-1">
                Account and password managed by CXO in Team Management.
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No user data.</p>
          )}
        </div>
      </div>
    </>
  );
};
