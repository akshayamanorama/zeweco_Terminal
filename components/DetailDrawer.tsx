import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Activity, Target, AlertTriangle, ArrowUpCircle, Calendar, HelpCircle, Plus, Trash2, Shield, MessageSquare } from 'lucide-react';
import { Business, Risk, RiskSeverity, Health, User, UserRole } from '../types';
import { StageBadge, HealthIndicator, SeverityBadge } from './Badge';

const SEVERITY_OPTIONS: RiskSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

interface DetailDrawerProps {
  business: Business | null;
  onClose: () => void;
  onUpdateBusiness?: (updated: Business) => void;
  /** Managers list for "escalate to manager" selector */
  managers?: User[];
  /** Viewer role: Manager sees edit form, CXO sees review/response options */
  role?: UserRole;
  /** Company name from Company Settings (shown in entity context) */
  companyName?: string;
  /** Company logo from Company Settings */
  companyLogoUrl?: string;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ business, onClose, onUpdateBusiness, managers = [], role = 'Manager', companyName, companyLogoUrl }) => {
  const isCXO = role === 'CXO';
  const [newRiskDesc, setNewRiskDesc] = useState('');
  const [newRiskSeverity, setNewRiskSeverity] = useState<RiskSeverity>('Medium');
  const [escalationNote, setEscalationNote] = useState(business?.escalationNote ?? '');
  const [nextWeekFocus, setNextWeekFocus] = useState(business?.nextWeekFocus ?? '');
  const [supportNeeded, setSupportNeeded] = useState(business?.supportNeededFromCXO ?? '');
  const [cxoSupportResponse, setCxoSupportResponse] = useState(business?.cxoSupportResponse ?? '');
  const [editingEta, setEditingEta] = useState(false);
  const [tempEta, setTempEta] = useState(business?.eta ?? '');
  const [editingHealth, setEditingHealth] = useState(false);
  const [lastSavedFeedback, setLastSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setEscalationNote(business.escalationNote ?? '');
      setNextWeekFocus(business.nextWeekFocus ?? '');
      setSupportNeeded(business.supportNeededFromCXO ?? '');
      setCxoSupportResponse(business.cxoSupportResponse ?? '');
      setTempEta(business.eta ?? '');
    }
  }, [business?.id, business?.escalationNote, business?.nextWeekFocus, business?.supportNeededFromCXO, business?.cxoSupportResponse, business?.eta, business?.escalatedToManagerId]);

  if (!business) return null;

  const risks: Risk[] = business.risks ?? [];
  const escalationRequested = business.escalationRequested ?? false;

  const applyUpdate = (updates: Partial<Business>, feedback?: string) => {
    if (!onUpdateBusiness) return;
    const updated = { ...business, ...updates };
    onUpdateBusiness(updated);
    if (feedback) {
      setLastSavedFeedback(feedback);
      setTimeout(() => setLastSavedFeedback(null), 2500);
    }
  };

  const handleAddRisk = () => {
    const trimmed = newRiskDesc.trim();
    if (!trimmed) return;
    const newRisk: Risk = {
      id: `risk-${Date.now()}`,
      description: trimmed,
      severity: newRiskSeverity,
      createdAt: new Date().toISOString(),
    };
    applyUpdate({ risks: [...risks, newRisk] });
    setNewRiskDesc('');
    setNewRiskSeverity('Medium');
  };

  const handleRemoveRisk = (riskId: string) => {
    applyUpdate({ risks: risks.filter(r => r.id !== riskId) });
  };

  const handleEscalationToggle = (requested: boolean) => {
    applyUpdate({
      escalationRequested: requested,
      escalationNote: requested ? escalationNote : undefined,
      escalatedToManagerId: requested ? business.escalatedToManagerId : undefined,
    });
  };

  const handleEscalatedToManagerChange = (managerId: string) => {
    applyUpdate({ escalatedToManagerId: managerId || undefined });
  };

  const handleEscalationNoteBlur = () => {
    if (escalationRequested) {
      applyUpdate({ escalationNote: escalationNote.trim() || undefined });
    }
  };

  const handleNextWeekFocusBlur = () => {
    applyUpdate({ nextWeekFocus: nextWeekFocus.trim() || undefined });
  };

  const handleSupportNeededBlur = () => {
    applyUpdate({ supportNeededFromCXO: supportNeeded.trim() || undefined });
  };

  const handleMarkMilestoneDone = () => {
    if (business.routeProgress >= 12) {
      applyUpdate({ updated: 'Today' }, 'Updated');
      return;
    }
    const nextProgress = Math.min(12, business.routeProgress + 1);
    applyUpdate({
      routeProgress: nextProgress,
      status: 'On Track',
      updated: 'Today',
      nextMilestone: nextProgress >= 12 ? 'All phases complete' : business.nextMilestone,
    }, 'Milestone marked done');
  };

  const handleSaveEta = () => {
    const value = tempEta.trim();
    if (value) applyUpdate({ eta: value, updated: 'Today' }, 'ETA updated');
    setEditingEta(false);
  };

  const handleSetHealth = (health: Health) => {
    applyUpdate({ health, updated: 'Today' }, 'Health updated');
    setEditingHealth(false);
  };

  const handleSaveAllChanges = () => {
    applyUpdate({
      escalationNote: escalationRequested ? (escalationNote.trim() || undefined) : undefined,
      nextWeekFocus: nextWeekFocus.trim() || undefined,
      supportNeededFromCXO: supportNeeded.trim() || undefined,
      updated: 'Today',
    }, 'All changes saved');
  };

  const handleResolveEscalation = () => {
    applyUpdate({
      escalationRequested: false,
      escalationNote: undefined,
      escalatedToManagerId: undefined,
      updated: 'Today',
    }, 'Escalation resolved');
  };

  const handleSaveCxoSupportResponse = () => {
    applyUpdate({
      cxoSupportResponse: cxoSupportResponse.trim() || undefined,
      updated: 'Today',
    }, 'Response saved');
  };

  const canEditActions = Boolean(onUpdateBusiness);
  const canManagerEdit = canEditActions && !isCXO;
  const canCXOAct = canEditActions && isCXO;
  const hasUnsavedText = !isCXO && (
    (escalationNote !== (business.escalationNote ?? '')) ||
    (nextWeekFocus !== (business.nextWeekFocus ?? '')) ||
    (supportNeeded !== (business.supportNeededFromCXO ?? ''))
  );
  const hasUnsavedCxoResponse = isCXO && (cxoSupportResponse !== (business.cxoSupportResponse ?? ''));

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center bg-zinc-50/50 dark:bg-transparent shrink-0">
          <div className="min-w-0">
            {(companyName || companyLogoUrl) && (
              <div className="flex items-center gap-2 mb-2">
                {companyLogoUrl?.trim() ? (
                  <img src={companyLogoUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                ) : null}
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                  {companyName ? `${companyName}` : ''}
                </span>
              </div>
            )}
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 leading-tight">
              {business.logoUrl?.trim() ? (
                <img src={business.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              ) : null}
              {business.name}
              <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono font-normal">({business.code})</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <StageBadge stage={business.stage} />
              <HealthIndicator health={business.health} />
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                Progress: {business.routeProgress}/12
              </span>
            </div>
            {lastSavedFeedback && (
              <p className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
                ✓ {lastSavedFeedback}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Next Milestone */}
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

          {/* Risks: Manager can add/remove, CXO read-only */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              <AlertTriangle size={14} className="text-amber-500" />
              Risks
              {isCXO && <span className="text-[10px] font-normal normal-case text-zinc-500">(from manager)</span>}
            </div>
            <div className="space-y-2">
              {risks.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No risks added yet.</p>
              ) : (
                risks.map((risk) => (
                  <div
                    key={risk.id}
                    className="flex items-start gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800"
                  >
                    <SeverityBadge severity={risk.severity} />
                    <p className="flex-1 text-sm text-zinc-800 dark:text-zinc-200 min-w-0">{risk.description}</p>
                    {canManagerEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRisk(risk.id)}
                        className="shrink-0 p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                        aria-label="Remove risk"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            {canManagerEdit && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newRiskDesc}
                  onChange={(e) => setNewRiskDesc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRisk()}
                  placeholder="Describe risk..."
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <select
                  value={newRiskSeverity}
                  onChange={(e) => setNewRiskSeverity(e.target.value as RiskSeverity)}
                  className="px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddRisk}
                  disabled={!newRiskDesc.trim()}
                  className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  title="Add risk"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
          </section>

          {/* Escalation: Manager requests, CXO reviews and can resolve */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              <ArrowUpCircle size={14} className="text-blue-500" />
              {isCXO ? 'Escalation request (from manager)' : 'Request Escalation to CXO'}
            </div>
            {isCXO ? (
              <>
                {escalationRequested ? (
                  <div className="space-y-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Manager requested escalation</p>
                    {business.escalationNote && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Reason: {business.escalationNote}</p>
                    )}
                    {business.escalatedToManagerId && managers.length > 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        Assigned to: {managers.find(m => m.id === business.escalatedToManagerId)?.name ?? 'Manager'}
                      </p>
                    )}
                    {canCXOAct && (
                      <button
                        type="button"
                        onClick={handleResolveEscalation}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                      >
                        <Shield size={14} /> Resolve escalation
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No escalation requested.</p>
                )}
              </>
            ) : (
              <>
                <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={escalationRequested}
                    onChange={(e) => handleEscalationToggle(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Escalate this entity to CXO
                  </span>
                </label>
                {escalationRequested && (
                  <>
                    <div className="mt-3">
                      <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                        Select manager to escalate to
                      </label>
                      <select
                        value={business.escalatedToManagerId ?? ''}
                        onChange={(e) => handleEscalatedToManagerChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="">— Choose manager —</option>
                        {managers.filter(m => m.role === 'Manager').map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={escalationNote}
                      onChange={(e) => setEscalationNote(e.target.value)}
                      onBlur={handleEscalationNoteBlur}
                      placeholder="Reason or note for escalation..."
                      rows={2}
                      className="mt-2 w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    />
                  </>
                )}
              </>
            )}
          </section>

          {/* Next week focus: Manager edits, CXO read-only */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              <Calendar size={14} className="text-green-500" />
              Next Week Focus
              {isCXO && <span className="text-[10px] font-normal normal-case text-zinc-500">(from manager)</span>}
            </div>
            {canManagerEdit ? (
              <textarea
                value={nextWeekFocus}
                onChange={(e) => setNextWeekFocus(e.target.value)}
                onBlur={handleNextWeekFocusBlur}
                placeholder="What should be the focus next week?"
                rows={3}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            ) : (
              <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                {business.nextWeekFocus || '—'}
              </p>
            )}
          </section>

          {/* Support needed: Manager submits, CXO sees and can add response */}
          <section>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              <HelpCircle size={14} className="text-amber-500" />
              Support Needed from CXO
              {isCXO && <span className="text-[10px] font-normal normal-case text-zinc-500">(manager request)</span>}
            </div>
            {isCXO ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  {business.supportNeededFromCXO || '—'}
                </p>
                {canCXOAct && (
                  <>
                    <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <MessageSquare size={12} className="inline mr-1" /> Your response
                    </label>
                    <textarea
                      value={cxoSupportResponse}
                      onChange={(e) => setCxoSupportResponse(e.target.value)}
                      placeholder="Add your response or follow-up..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                    {hasUnsavedCxoResponse && (
                      <button
                        type="button"
                        onClick={handleSaveCxoSupportResponse}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                      >
                        Save response
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              canManagerEdit ? (
                <textarea
                  value={supportNeeded}
                  onChange={(e) => setSupportNeeded(e.target.value)}
                  onBlur={handleSupportNeededBlur}
                  placeholder="Describe support or resources needed from CXO..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              ) : (
                <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                  {business.supportNeededFromCXO || '—'}
                </p>
              )
            )}
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
                      {i === 0 ? business.nextMilestone : `Historical Milestone ${5 - i} Completed`}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1.5 font-medium uppercase tracking-wider">Feb {10 - i}, 2024</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Quick Actions: Manager = full actions; CXO = ETA, Health, optional Mark milestone */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20 grid grid-cols-2 gap-3 shrink-0">
          {canManagerEdit && hasUnsavedText && (
            <button
              type="button"
              onClick={handleSaveAllChanges}
              className="col-span-2 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm border-2 border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:border-blue-600 active:scale-[0.98]"
            >
              Save all changes
            </button>
          )}
          {!isCXO && (
            <button
              type="button"
              onClick={() => canManagerEdit && handleMarkMilestoneDone()}
              disabled={!canManagerEdit}
              className="col-span-2 py-3 rounded-lg text-sm font-bold transition-all shadow-md border-2 border-green-600 bg-green-600 text-white hover:bg-green-500 hover:border-green-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
            >
              Mark Milestone Done
            </button>
          )}
          {isCXO && (
            <button
              type="button"
              onClick={() => canCXOAct && handleMarkMilestoneDone()}
              disabled={!canCXOAct}
              className="col-span-2 py-2.5 rounded-lg text-sm font-semibold border-2 border-green-600 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              Mark Milestone Done (override)
            </button>
          )}

          {editingEta ? (
            <div className="col-span-2 flex gap-2">
              <input
                type="text"
                value={tempEta}
                onChange={(e) => setTempEta(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEta()}
                placeholder="e.g. 25 Feb"
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                autoFocus
              />
              <button type="button" onClick={handleSaveEta} className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500">
                Save
              </button>
              <button type="button" onClick={() => { setEditingEta(false); setTempEta(business.eta); }} className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-medium rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600">
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (canManagerEdit || canCXOAct) && setEditingEta(true)}
              disabled={!canManagerEdit && !canCXOAct}
              className="bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700/50 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              Update ETA
            </button>
          )}

          {editingHealth ? (
            <div className="col-span-2 flex gap-2">
              {(['Green', 'Yellow', 'Red'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSetHealth(h)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    h === 'Green' ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50' :
                    h === 'Yellow' ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/50' :
                    'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50'
                  }`}
                >
                  {h}
                </button>
              ))}
              <button type="button" onClick={() => setEditingHealth(false)} className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-medium rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600">
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (canManagerEdit || canCXOAct) && setEditingHealth(true)}
              disabled={!canManagerEdit && !canCXOAct}
              className="bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700/50 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              Set Health
            </button>
          )}
        </div>
      </div>
    </>
  );
};
