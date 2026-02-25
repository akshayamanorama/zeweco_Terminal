import React, { useState } from 'react';
import { X, LayoutGrid, Plus, ChevronUp, ChevronDown, User as UserIcon, Check, Building2 } from 'lucide-react';
import { Business, Checklist, Stage, Status, Health } from '../types';

interface BusinessEntitiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  onReorder?: (reordered: Business[]) => void;
  activeIds?: Set<string>;
  onToggleActive?: (id: string) => void;
  onAddBusiness?: (business: Business) => void;
  /** When user clicks an entity, open its details (e.g. DetailDrawer) for editing */
  onSelectEntity?: (business: Business) => void;
  /** When false, archive/hide toggle is hidden (CXO setting) */
  entityArchivingEnabled?: boolean;
  /** Stage order from company settings (for add-entity dropdown) */
  defaultStages?: Stage[];
  /** Company context from Company Settings (name, logo, industry, category) */
  companyName?: string;
  companyLogoUrl?: string;
  companyIndustry?: string;
  companyCategory?: string;
}

const defaultChecklists = (): Checklist[] => [
  { id: `cl-${Date.now()}-1`, title: 'Core Foundation', tasks: [{ id: `t-${Date.now()}-1`, text: 'Initial setup', completed: false }] },
  { id: `cl-${Date.now()}-2`, title: 'Operational Readiness', tasks: [{ id: `t-${Date.now()}-2`, text: 'MVP scope', completed: false }] },
];

const stagePillClass: Record<string, string> = {
  Traction: 'bg-amber-600 text-white',
  Prototype: 'bg-blue-500 text-white',
  Launch: 'bg-emerald-500 text-white',
  Design: 'bg-purple-500 text-white',
  Foundation: 'bg-zinc-600 text-white',
  Scale: 'bg-green-500 text-white',
};

const STAGES: Stage[] = ['Foundation', 'Design', 'Prototype', 'Launch', 'Traction', 'Scale'];

export const BusinessEntitiesPanel: React.FC<BusinessEntitiesPanelProps> = ({
  isOpen,
  onClose,
  businesses,
  onReorder,
  activeIds: activeIdsProp,
  onToggleActive,
  onAddBusiness,
  onSelectEntity,
  entityArchivingEnabled = true,
  defaultStages,
  companyName,
  companyLogoUrl,
  companyIndustry,
  companyCategory,
}) => {
  const stageOptions = defaultStages?.length ? defaultStages : STAGES;
  const [order, setOrder] = useState<Business[]>(() => [...businesses]);
  const [localActiveIds, setLocalActiveIds] = useState<Set<string>>(() => new Set(businesses.map(b => b.id)));
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newStage, setNewStage] = useState<Stage>('Foundation');
  const [newResponsible, setNewResponsible] = useState('');
  const isControlledActive = activeIdsProp !== undefined && onToggleActive !== undefined;
  const activeIds = isControlledActive ? activeIdsProp : localActiveIds;

  React.useEffect(() => {
    if (isOpen) {
      setOrder([...businesses]);
      if (!isControlledActive) setLocalActiveIds(new Set(businesses.map(b => b.id)));
    }
  }, [isOpen, businesses, isControlledActive]);

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= order.length) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[next]] = [newOrder[next], newOrder[index]];
    setOrder(newOrder);
    onReorder?.(newOrder);
  };

  const toggleActive = (id: string) => {
    if (isControlledActive) {
      onToggleActive?.(id);
    } else {
      setLocalActiveIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const code = (newCode.trim() || name.slice(0, 2).toUpperCase()).toUpperCase();
    if (!name || !onAddBusiness) return;
    const id = `entity-${Date.now()}`;
    const newEntity: Business = {
      id,
      name,
      code: code.slice(0, 6),
      stage: newStage,
      health: 'Yellow',
      routeProgress: 1,
      nextMilestone: 'Define initial scope',
      eta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      updated: 'Today',
      status: 'At Risk',
      responsible: newResponsible.trim() || 'NA',
      checklists: defaultChecklists(),
    };
    onAddBusiness(newEntity);
    setOrder(prev => [...prev, newEntity]);
    if (!isControlledActive) setLocalActiveIds(prev => new Set([...prev, id]));
    setNewName('');
    setNewCode('');
    setNewStage('Foundation');
    setNewResponsible('');
    setIsAdding(false);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewName('');
    setNewCode('');
    setNewStage('Foundation');
    setNewResponsible('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-[60]" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed top-0 right-0 h-full w-full sm:max-w-[480px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-[70] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Business Entities"
      >
        <header className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
              {companyLogoUrl?.trim() ? (
                <img src={companyLogoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 size={22} className="text-zinc-500 dark:text-zinc-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {companyName ? `${companyName} · Business Entities` : 'Business Entities'}
              </h2>
              <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.18em] mt-1">
                {companyIndustry || companyCategory
                  ? `Add, Remove & Manage Entities · ${[companyIndustry, companyCategory].filter(Boolean).join(' · ')}`
                  : 'Add, Remove &amp; Manage Entities'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-zinc-500 dark:text-zinc-400">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isAdding ? (
            <form onSubmit={handleAddSubmit} className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">New Business Entity</span>
                <button type="button" onClick={cancelAdd} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <X size={16} />
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="e.g. ACME (optional)"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Stage</label>
                <select
                  value={newStage}
                  onChange={e => setNewStage(e.target.value as Stage)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  {stageOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Responsible</label>
                <input
                  type="text"
                  value={newResponsible}
                  onChange={e => setNewResponsible(e.target.value)}
                  placeholder="e.g. Manager name (optional)"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={cancelAdd} className="flex-1 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5">
                  <Check size={14} /> Add Entity
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 transition-all text-sm font-semibold cursor-pointer"
            >
              <Plus size={18} /> Add Business Entity
            </button>
          )}

          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em]">
              Drag Order = Terminal Order
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Use ↑↓ to change sequence; main terminal follows this order.
            </p>
          </div>

          <div className="space-y-2">
            {order.map((biz, index) => {
              const isActive = activeIds.has(biz.id);
              const stageClass = stagePillClass[biz.stage] ?? 'bg-zinc-500 text-white';
              return (
                <div
                  key={biz.id}
                  className={`flex items-center gap-3 p-4 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-all ${onSelectEntity ? 'hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer' : ''}`}
                  onClick={onSelectEntity ? () => { onSelectEntity(biz); onClose(); } : undefined}
                  role={onSelectEntity ? 'button' : undefined}
                >
                  <div className="flex flex-col text-zinc-400 dark:text-zinc-500 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); move(index, -1); }}
                      className="p-0.5 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 cursor-pointer touch-manipulation"
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); move(index, 1); }}
                      className="p-0.5 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 cursor-pointer touch-manipulation"
                      disabled={index === order.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0 overflow-hidden">
                    {biz.logoUrl?.trim() ? <img src={biz.logoUrl} alt="" className="w-full h-full object-cover" /> : biz.code.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{biz.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${stageClass}`}>
                        {biz.stage}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <UserIcon size={12} /> {biz.responsible ?? 'Manager'}
                      </span>
                    </div>
                  </div>
                  {entityArchivingEnabled && onToggleActive && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      title={isActive ? 'Visible on dashboard' : 'Hidden (archived)'}
                      onClick={(e) => { e.stopPropagation(); toggleActive(biz.id); }}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 touch-manipulation ${isActive ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                    >
                      <span className={`pointer-events-none absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
