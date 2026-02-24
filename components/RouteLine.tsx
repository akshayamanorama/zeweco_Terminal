
import React from 'react';
import { Health } from '../types';

interface RouteLineProps {
  progress: number; // 1 to 12
  health: Health;
}

export const RouteLine: React.FC<RouteLineProps> = ({ progress, health }) => {
  const dots = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const getDotColor = (dot: number) => {
    if (dot < progress) {
      if (health === 'Red') return 'bg-red-500';
      if (health === 'Yellow') return 'bg-yellow-500';
      return 'bg-green-500';
    }
    if (dot === progress) {
      if (health === 'Red') return 'border-red-500';
      if (health === 'Yellow') return 'border-yellow-500';
      return 'border-green-500';
    }
    return 'border-zinc-300 dark:border-zinc-700';
  };

  const getHealthColorClass = () => {
    if (health === 'Red') return 'bg-red-500';
    if (health === 'Yellow') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-2.5 w-full">
      <span className="dashboard-route-label shrink-0">Start</span>
      <div className="relative flex-1 flex items-center h-4">
        {/* Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-200 dark:bg-zinc-800 -translate-y-1/2" />
        
        {/* Filled Progress Line */}
        <div 
          className={`absolute top-1/2 left-0 h-[1px] -translate-y-1/2 transition-all duration-700 ${health === 'Red' ? 'bg-red-500/30 dark:bg-red-500/50' : health === 'Yellow' ? 'bg-yellow-500/30 dark:bg-yellow-500/50' : 'bg-green-500/30 dark:bg-green-500/50'}`}
          style={{ width: `${((progress - 1) / 11) * 100}%` }}
        />

        {/* Dots */}
        <div className="relative w-full flex justify-between items-center">
          {dots.map((dot) => {
            const isCompleted = dot < progress;
            const isNext = dot === progress;
            
            return (
              <div key={dot} className="relative flex items-center justify-center">
                {isNext && (
                  <div className={`absolute w-3 h-3 rounded-full animate-ping opacity-30 ${getHealthColorClass()}`} />
                )}
                <div 
                  className={`
                    w-1.5 h-1.5 rounded-full border transition-all duration-300
                    ${isCompleted ? `${getDotColor(dot)} border-transparent` : isNext ? `w-2 h-2 border-[1.5px] ${getDotColor(dot)} bg-white dark:bg-black` : `bg-white dark:bg-black ${getDotColor(dot)}`}
                  `}
                />
              </div>
            );
          })}
        </div>
      </div>
      <span className="dashboard-route-label shrink-0">Goal</span>
    </div>
  );
};
