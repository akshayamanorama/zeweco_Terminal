import React from 'react';
import { X, LayoutGrid, Users } from 'lucide-react';
import type { CompanySettings, CompanyProfile, Business } from '../types';

interface CompanySettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyProfile[];
  activeCompanyId: string;
  onSwitchCompany: (id: string) => void;
  onAddCompany: () => void;
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
  businesses: Business[];
  onUpdateBusiness: (updated: Business) => void;
  onOpenMemberManagement?: () => void;
  onOpenBusinessEntities?: () => void;
}

/** Settings tab is shortcuts only. Terminal name & photo: edit in the header (click logo). */
export const CompanySettingsPanel: React.FC<CompanySettingsPanelProps> = ({
  isOpen,
  onClose,
  onOpenMemberManagement,
  onOpenBusinessEntities,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            <strong>Terminal name & photo:</strong> click the logo or name in the header to edit. Easy peasy.
          </p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-3">Shortcuts</p>
          <div className="space-y-2">
            {onOpenBusinessEntities && (
              <button
                type="button"
                onClick={() => { onOpenBusinessEntities(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <LayoutGrid size={20} className="text-blue-500 shrink-0" />
                <span className="font-medium">Business Entities</span>
              </button>
            )}
            {onOpenMemberManagement && (
              <button
                type="button"
                onClick={() => { onOpenMemberManagement(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <Users size={20} className="text-blue-500 shrink-0" />
                <span className="font-medium">Team Management</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
