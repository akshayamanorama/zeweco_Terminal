import React, { useState, useEffect, useRef } from 'react';
import { X, Image, Calendar, Globe, RotateCcw, Layers, AlertTriangle, Archive, Flag, Bell, ChevronUp, ChevronDown, LayoutGrid } from 'lucide-react';
import type { CompanySettings, Stage, ReportingCycle, NotificationMethod, EntityPriorityLevel, CompanyProfile, Business } from '../types';

const STAGES: Stage[] = ['Foundation', 'Design', 'Prototype', 'Launch', 'Traction', 'Scale'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'UTC', 'Asia/Singapore', 'Australia/Sydney'];

interface CompanySettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyProfile[];
  activeCompanyId: string;
  onSwitchCompany: (id: string) => void;
  onAddCompany: () => void;
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
  /** Business entities from dashboard – choose one to edit name, photo, settings */
  businesses: Business[];
  onUpdateBusiness: (updated: Business) => void;
}

export const CompanySettingsPanel: React.FC<CompanySettingsPanelProps> = ({
  isOpen,
  onClose,
  companies,
  activeCompanyId,
  onSwitchCompany,
  onAddCompany,
  settings,
  onSave,
  businesses,
  onUpdateBusiness,
}) => {
  const [form, setForm] = useState<CompanySettings>(settings);
  const entityPhotoInputRef = useRef<HTMLInputElement>(null);

  const [selectedEntityId, setSelectedEntityId] = useState<string>(() => businesses[0]?.id ?? '');
  const selectedEntity = businesses.find((b) => b.id === selectedEntityId) ?? businesses[0];
  const [entityName, setEntityName] = useState(selectedEntity?.name ?? '');
  const [entityCode, setEntityCode] = useState(selectedEntity?.code ?? '');
  const [entityLogoUrl, setEntityLogoUrl] = useState(selectedEntity?.logoUrl ?? '');
  const [entityIndustry, setEntityIndustry] = useState(selectedEntity?.industry ?? '');
  const [entityCategory, setEntityCategory] = useState(selectedEntity?.category ?? '');

  useEffect(() => {
    if (businesses.length > 0 && !businesses.some((b) => b.id === selectedEntityId)) {
      setSelectedEntityId(businesses[0].id);
    }
  }, [businesses, selectedEntityId]);

  useEffect(() => {
    if (isOpen) setForm(settings);
  }, [isOpen, settings, activeCompanyId]);

  useEffect(() => {
    if (selectedEntity) {
      setEntityName(selectedEntity.name);
      setEntityCode(selectedEntity.code);
      setEntityLogoUrl(selectedEntity.logoUrl ?? '');
      setEntityIndustry(selectedEntity.industry ?? '');
      setEntityCategory(selectedEntity.category ?? '');
    }
  }, [selectedEntityId, selectedEntity]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const handleEntityPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setEntityLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveEntity = () => {
    if (!selectedEntity) return;
    onUpdateBusiness({
      ...selectedEntity,
      name: entityName.trim() || selectedEntity.name,
      code: (entityCode.trim() || selectedEntity.code).toUpperCase().slice(0, 6),
      logoUrl: entityLogoUrl.trim() || undefined,
      industry: entityIndustry.trim() || undefined,
      category: entityCategory.trim() || undefined,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Company settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Business entity: choose company → name, profile photo, industry, category */}
          <section className="pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <LayoutGrid size={14} /> Business entity
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Choose company</label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30 font-medium text-zinc-900 dark:text-white"
                >
                  {businesses.length === 0 ? (
                    <option value="">No business entities yet</option>
                  ) : (
                    businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))
                  )}
                </select>
              </div>
              {selectedEntity && (
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Name</label>
                    <input
                      type="text"
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                      placeholder="Entity name"
                      className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Code</label>
                    <input
                      type="text"
                      value={entityCode}
                      onChange={(e) => setEntityCode(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="e.g. COX"
                      className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30 font-mono max-w-[120px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Image size={12} /> Logo (from gallery)
                    </label>
                    <input
                      ref={entityPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEntityPhotoSelect}
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {entityLogoUrl ? (
                          <img src={entityLogoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image size={24} className="text-zinc-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => entityPhotoInputRef.current?.click()}
                          className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                        >
                          Choose from gallery
                        </button>
                        {entityLogoUrl && (
                          <button type="button" onClick={() => setEntityLogoUrl('')} className="text-sm font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                            Remove logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Industry</label>
                      <input
                        type="text"
                        value={entityIndustry}
                        onChange={(e) => setEntityIndustry(e.target.value)}
                        placeholder="e.g. Technology"
                        className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Category</label>
                      <input
                        type="text"
                        value={entityCategory}
                        onChange={(e) => setEntityCategory(e.target.value)}
                        placeholder="e.g. Portfolio"
                        className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveEntity}
                    className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                  >
                    Save this entity
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Fiscal & time */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar size={14} /> Fiscal year & time
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Fiscal year start</label>
                <select
                  value={form.fiscalYearStartMonth}
                  onChange={(e) => setForm({ ...form, fiscalYearStartMonth: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Globe size={12} /> Default timezone</label>
                <select
                  value={form.defaultTimezone}
                  onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1"><RotateCcw size={12} /> Reporting cycle</label>
                <select
                  value={form.reportingCycle}
                  onChange={(e) => setForm({ ...form, reportingCycle: e.target.value as ReportingCycle })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </section>

          {/* Default entity stages */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers size={14} /> Default entity stages
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">Order of stages used for entities. Use ↑↓ to reorder.</p>
            <div className="space-y-1">
              {form.defaultStages.map((s, idx) => (
                <div key={s} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-col text-zinc-400">
                    <button type="button" onClick={() => { const arr = [...form.defaultStages]; if (idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setForm({ ...form, defaultStages: arr }); } }} className="p-0.5 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30" disabled={idx === 0}><ChevronUp size={14} /></button>
                    <button type="button" onClick={() => { const arr = [...form.defaultStages]; if (idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; setForm({ ...form, defaultStages: arr }); } }} className="p-0.5 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30" disabled={idx === form.defaultStages.length - 1}><ChevronDown size={14} /></button>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex-1">{s}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Health & escalation */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle size={14} /> Health & escalation
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Escalation threshold (overdue items → At Risk)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.escalationThresholdOverdue}
                  onChange={(e) => setForm({ ...form, escalationThresholdOverdue: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30"
                />
                <p className="text-[10px] text-zinc-500 mt-1">e.g. 3 = entity marked At Risk when 3+ items overdue</p>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Health rules: On Track / At Risk / Overdue / Stale applied per entity from status and thresholds.</p>
            </div>
          </section>

          {/* Entity options */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Archive size={14} /> Entity options
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.entityArchivingEnabled}
                  onChange={(e) => setForm({ ...form, entityArchivingEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-800 dark:text-zinc-200">Enable entity archiving</span>
              </label>
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Flag size={12} /> Entity priority levels</label>
                <div className="flex flex-wrap gap-2">
                  {form.entityPriorityLevels.map((p) => (
                    <span key={p} className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell size={14} /> Notifications
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 cursor-pointer">
                <input type="checkbox" checked={form.riskAlertNotifications} onChange={(e) => setForm({ ...form, riskAlertNotifications: e.target.checked })} className="w-4 h-4 rounded border-zinc-300 text-blue-600" />
                <span className="text-sm text-zinc-800 dark:text-zinc-200">Risk alert notifications</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 cursor-pointer">
                <input type="checkbox" checked={form.overdueAlerts} onChange={(e) => setForm({ ...form, overdueAlerts: e.target.checked })} className="w-4 h-4 rounded border-zinc-300 text-blue-600" />
                <span className="text-sm text-zinc-800 dark:text-zinc-200">Overdue alerts</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 cursor-pointer">
                <input type="checkbox" checked={form.deadlineAlerts} onChange={(e) => setForm({ ...form, deadlineAlerts: e.target.checked })} className="w-4 h-4 rounded border-zinc-300 text-blue-600" />
                <span className="text-sm text-zinc-800 dark:text-zinc-200">Deadline alerts</span>
              </label>
              <div className="pt-2">
                <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Notification method</label>
                <select
                  value={form.notificationMethod}
                  onChange={(e) => setForm({ ...form, notificationMethod: e.target.value as NotificationMethod })}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="email">Email</option>
                  <option value="in-app">In-app</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          </section>
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Save settings
          </button>
        </div>
      </div>
    </>
  );
};
