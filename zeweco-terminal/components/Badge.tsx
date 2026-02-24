
import React from 'react';
import { Stage, Status, Health } from '../types';

export const StageBadge: React.FC<{ stage: Stage }> = ({ stage }) => {
  const colors: Record<Stage, string> = {
    Foundation: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    Design: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
    Prototype: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
    Launch: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/50',
    Traction: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50',
    Scale: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50',
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border rounded-md whitespace-nowrap transition-colors ${colors[stage]}`}>
      {stage}
    </span>
  );
};

export const StatusPill: React.FC<{ status: Status }> = ({ status }) => {
  const styles: Record<Status, string> = {
    'On Track': 'border-green-500/30 text-green-700 dark:text-green-500 bg-green-500/5',
    'At Risk': 'border-yellow-500/30 text-yellow-700 dark:text-yellow-500 bg-yellow-500/5',
    'Overdue': 'border-red-500/30 text-red-700 dark:text-red-500 bg-red-500/10 font-bold',
    'Stale': 'border-orange-500/30 text-orange-700 dark:text-orange-500 bg-orange-500/5',
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] border rounded-full whitespace-nowrap transition-colors ${styles[status]}`}>
      {status}
    </span>
  );
};

export const HealthIndicator: React.FC<{ health: Health }> = ({ health }) => {
  const color = health === 'Green' ? 'bg-green-500' : health === 'Yellow' ? 'bg-yellow-500' : 'bg-red-500';
  const shadow = health === 'Red' ? 'shadow-[0_0_8px_rgba(239,68,68,0.3)] dark:shadow-[0_0_8px_rgba(239,68,68,0.6)]' : '';
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${color} ${shadow} transition-all`} />
      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 transition-colors uppercase tracking-widest">{health}</span>
    </div>
  );
};
