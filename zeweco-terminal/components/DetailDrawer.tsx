
import React from 'react';
import { X, CheckCircle2, Clock, Activity, Target } from 'lucide-react';
import { Business } from '../types';
import { StageBadge, HealthIndicator } from './Badge';

interface DetailDrawerProps {
  business: Business | null;
  onClose: () => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ business, onClose }) => {
  if (!business) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] z-40 transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center bg-zinc-50/50 dark:bg-transparent">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 leading-tight">
              {business.name}
              <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono font-normal">({business.code})</span>
            </h2>
            <div className="flex gap-3 mt-2">
              <StageBadge stage={business.stage} />
              <HealthIndicator health={business.health} />
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Main Focus */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              <Target size={14} className="text-blue-500" />
              Next Milestone
            </div>
            <p className="text-xl font-medium text-zinc-900 dark:text-white leading-tight">
              {business.nextMilestone}
            </p>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-zinc-400" />
                ETA: <span className="text-zinc-700 dark:text-zinc-200 font-medium">{business.eta}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-zinc-400" />
                Updated: <span className="text-zinc-700 dark:text-zinc-200 font-medium">{business.updated}</span>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
              <CheckCircle2 size={14} className="text-green-500" />
              Timeline History
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full border ${i === 0 ? 'border-green-500 bg-green-500' : 'border-zinc-300 dark:border-zinc-700'}`} />
                    {i !== 4 && <div className="w-[1px] flex-1 bg-zinc-100 dark:bg-zinc-800 my-1" />}
                  </div>
                  <div className="pb-1">
                    <p className={`text-sm leading-none ${i === 0 ? 'text-zinc-900 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
                      {i === 0 ? business.nextMilestone : `Historical Milestone ${5-i} Completed`}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1.5 font-medium uppercase tracking-wider">Feb {10-i}, 2024</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Quick Actions */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20 grid grid-cols-2 gap-3">
          <button className="col-span-2 bg-zinc-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-[0.98]">
            Mark Milestone Done
          </button>
          <button className="bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700/50 transition-colors shadow-sm active:scale-[0.98]">
            Update ETA
          </button>
          <button className="bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700/50 transition-colors shadow-sm active:scale-[0.98]">
            Set Health
          </button>
        </div>
      </div>
    </>
  );
};
