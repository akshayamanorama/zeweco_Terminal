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
    ? new Date(user.lastLogin).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Profile &amp; Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {user ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">
                  {user.name}
                </h3>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                  {user.role}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                  <Mail size={18} className="text-zinc-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Email
                    </p>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                  <Shield size={18} className="text-zinc-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Role
                    </p>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {user.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                  <Calendar size={18} className="text-zinc-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Last login
                    </p>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {lastLoginDisplay}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2">
                Account and password changes are managed by your CXO in Team Management.
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No user data.</p>
          )}
        </div>
      </div>
    </>
  );
};
