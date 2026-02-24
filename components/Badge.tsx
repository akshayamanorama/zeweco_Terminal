
import React from 'react';
import { Stage, Status, Health } from '../types';

/* Screenshot: stage pills = colored text on light tint background (rectangular, rounded) */
export const StageBadge: React.FC<{ stage: Stage }> = ({ stage }) => {
  const colors: Record<Stage, string> = {
    Foundation: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-300',
    Design: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    Prototype: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    Launch: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    Traction: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    Scale: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };

  return (
    <span className={`dashboard-label-sm px-2 py-0.5 rounded whitespace-nowrap ${colors[stage]}`}>
      {stage}
    </span>
  );
};

/* Status: small label, first letter capital (title case) */
export const StatusPill: React.FC<{ status: Status }> = ({ status }) => {
  const styles: Record<Status, string> = {
    'On Track': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'At Risk': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Overdue': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500 font-medium',
    'Stale': 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-500',
  };

  return (
    <span className={`dashboard-label-sm px-2 py-0.5 rounded-full whitespace-nowrap ${styles[status]}`}>
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
