import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Building2,
  Shield,
  LayoutGrid,
  BarChart3,
  Wallet,
  Bell,
  Check,
  ChevronRight,
  Users,
} from 'lucide-react';
import type {
  CompanySettings,
  ReportingCycle,
  CompanyProfile,
  Business,
  ManagerPermissionKey,
  KpiUpdateFrequency,
  EntityPriorityLevel,
  SettingsAuditEntry,
} from '../types';
import { DEFAULT_COMPANY_SETTINGS } from '../constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'UTC', 'Asia/Singapore', 'Australia/Sydney'];

type SettingsSectionId = 'organization' | 'role-access' | 'entity-governance' | 'kpi-reporting' | 'financial' | 'notifications';

const SECTIONS: { id: SettingsSectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'organization', label: 'Organization', icon: <Building2 size={18} /> },
  { id: 'role-access', label: 'Role & Access', icon: <Shield size={18} /> },
  { id: 'entity-governance', label: 'Entity Governance', icon: <LayoutGrid size={18} /> },
  { id: 'kpi-reporting', label: 'KPI & Reporting', icon: <BarChart3 size={18} /> },
  { id: 'financial', label: 'Financial Control', icon: <Wallet size={18} /> },
  { id: 'notifications', label: 'Notifications & Alerts', icon: <Bell size={18} /> },
];

const MANAGER_PERMISSIONS: { key: ManagerPermissionKey; label: string; desc: string }[] = [
  { key: 'can_manage_team', label: 'Manage Team Members', desc: 'Can add or remove other managers' },
  { key: 'can_delete_tasks', label: 'Delete Tasks', desc: 'Can delete tasks' },
  { key: 'can_edit_entity_profile', label: 'Edit Entity Profile', desc: 'Can edit entity name, logo, industry' },
  { key: 'can_view_financial_data', label: 'View Financial Data', desc: 'Can view financial data' },
  { key: 'can_raise_escalation', label: 'Raise Escalation', desc: 'Can escalate to CXO' },
  { key: 'can_update_milestones', label: 'Update Milestones', desc: 'Can update milestones' },
];

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
  onAudit?: (entry: SettingsAuditEntry) => void;
  currentUserName?: string;
}

function mergeWithDefaults(s: CompanySettings): CompanySettings {
  return { ...DEFAULT_COMPANY_SETTINGS, ...s } as CompanySettings;
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
  onOpenMemberManagement,
  onAudit,
  currentUserName = 'CXO',
}) => {
  const [form, setForm] = useState<CompanySettings>(() => mergeWithDefaults(settings));
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('organization');
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setForm(mergeWithDefaults(settings));
  }, [isOpen, settings, activeCompanyId]);

  if (!isOpen) return null;

  const recordAudit = (section: string, previousValue: unknown, newValue: unknown) => {
    onAudit?.({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      section,
      changedBy: currentUserName,
      timestamp: new Date().toISOString(),
      previousValue,
      newValue,
    });
  };

  const saveSection = (sectionId: SettingsSectionId, sectionName: string) => {
    const prev = { ...form };
    onSave(form);
    recordAudit(sectionName, prev, form);
    setSaveSuccess(`${sectionName} saved.`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const togglePermission = (key: ManagerPermissionKey) => {
    setForm((f) => ({
      ...f,
      defaultManagerPermissions: f.defaultManagerPermissions.includes(key)
        ? f.defaultManagerPermissions.filter((p) => p !== key)
        : [...f.defaultManagerPermissions, key],
    }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">CXO Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left sidebar */}
          <nav className="w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col py-2">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeSection === s.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {s.icon}
                <span className="flex-1">{s.label}</span>
                <ChevronRight size={14} className={activeSection === s.id ? 'opacity-100' : 'opacity-40'} />
              </button>
            ))}
          </nav>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-5">
            {saveSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-2 text-sm">
                <Check size={16} /> {saveSuccess}
              </div>
            )}

            {/* 1. Organization (reporting only; edit company/entity in Zeweco · Business Entities) */}
            {activeSection === 'organization' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={18} /> Organization
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">To edit company/entity name, logo, industry and category, open <strong>Zeweco · Business Entities</strong> and click an entity to view and edit its details.</p>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Calendar size={14} /> Reporting</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Fiscal start</label>
                      <select value={form.fiscalYearStartMonth} onChange={(e) => setForm({ ...form, fiscalYearStartMonth: Number(e.target.value) })} className="w-full px-2 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Timezone</label>
                      <select value={form.defaultTimezone} onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })} className="w-full px-2 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Cycle</label>
                      <select value={form.reportingCycle} onChange={(e) => setForm({ ...form, reportingCycle: e.target.value as ReportingCycle })} className="w-full px-2 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => saveSection('organization', 'Organization')} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  Save Organization
                </button>
              </div>
            )}

            {/* 2. Role & Access */}
            {activeSection === 'role-access' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Shield size={18} /> Role & Access Control
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Default permissions for new managers. Existing managers are edited in Team Management.</p>
                {onOpenMemberManagement && (
                  <button
                    type="button"
                    onClick={onOpenMemberManagement}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <Users size={16} /> Manage managers & assign entities
                  </button>
                )}
                <div className="space-y-3">
                  {MANAGER_PERMISSIONS.map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.defaultManagerPermissions.includes(key)}
                        onChange={() => togglePermission(key)}
                        className="mt-1 rounded border-zinc-300 dark:border-zinc-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{label}</span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button type="button" onClick={() => saveSection('role-access', 'Role & Access')} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  Save Role & Access
                </button>
              </div>
            )}

            {/* 3. Entity Governance */}
            {activeSection === 'entity-governance' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <LayoutGrid size={18} /> Entity Governance Rules
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Escalation threshold (overdue count → At Risk)</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.escalationThresholdOverdue}
                      onChange={(e) => setForm({ ...form, escalationThresholdOverdue: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)) })}
                      className="w-full max-w-[100px] px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Default milestone count template</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={form.defaultMilestoneCountTemplate}
                      onChange={(e) => setForm({ ...form, defaultMilestoneCountTemplate: Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 6)) })}
                      className="w-full max-w-[100px] px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.entityArchivingEnabled}
                      onChange={(e) => setForm({ ...form, entityArchivingEnabled: e.target.checked })}
                      className="rounded border-zinc-300 dark:border-zinc-600"
                    />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Allow entity archive</span>
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Priority levels (system-wide)</label>
                    <div className="flex flex-wrap gap-2">
                      {(['High', 'Medium', 'Low'] as EntityPriorityLevel[]).map((level) => (
                        <label key={level} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.entityPriorityLevels.includes(level)}
                            onChange={(e) => {
                              if (e.target.checked) setForm({ ...form, entityPriorityLevels: [...form.entityPriorityLevels, level] });
                              else setForm({ ...form, entityPriorityLevels: form.entityPriorityLevels.filter((l) => l !== level) });
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-600"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => saveSection('entity-governance', 'Entity Governance')} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  Save Entity Governance
                </button>
              </div>
            )}

            {/* 4. KPI & Reporting */}
            {activeSection === 'kpi-reporting' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={18} /> KPI & Reporting Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">KPI update frequency</label>
                    <select value={form.kpiUpdateFrequency} onChange={(e) => setForm({ ...form, kpiUpdateFrequency: e.target.value as KpiUpdateFrequency })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.requireWeeklyManagerReport} onChange={(e) => setForm({ ...form, requireWeeklyManagerReport: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Require weekly manager report</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.lockKpiTargetEditing} onChange={(e) => setForm({ ...form, lockKpiTargetEditing: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Lock KPI target editing</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.enableKpiCommentary} onChange={(e) => setForm({ ...form, enableKpiCommentary: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Enable KPI commentary</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.autoReminderManagerUpdates} onChange={(e) => setForm({ ...form, autoReminderManagerUpdates: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Auto reminder for manager updates</span>
                  </label>
                </div>
                <button type="button" onClick={() => saveSection('kpi-reporting', 'KPI & Reporting')} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  Save KPI & Reporting
                </button>
              </div>
            )}

            {/* 5. Financial Control */}
            {activeSection === 'financial' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Wallet size={18} /> Financial Control (MVP)
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.financialModuleEnabled}
                      onChange={(e) => {
                        const next = e.target.checked;
                        if (next) setForm({ ...form, financialModuleEnabled: next });
                        else setConfirmModal({
                          message: 'Disable financial module? Managers will lose financial visibility.',
                          onConfirm: () => {
                            const nextForm = { ...form, financialModuleEnabled: false };
                            setForm(nextForm);
                            onSave(nextForm);
                            recordAudit('Financial Control', form, nextForm);
                            setConfirmModal(null);
                            setSaveSuccess('Financial Control saved.');
                            setTimeout(() => setSaveSuccess(null), 3000);
                          },
                        });
                      }}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Enable financial module</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.budgetApprovalRequired} onChange={(e) => setForm({ ...form, budgetApprovalRequired: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Budget approval required</span>
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Budget alert threshold (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.budgetAlertThresholdPercent}
                      onChange={(e) => setForm({ ...form, budgetAlertThresholdPercent: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) })}
                      className="w-full max-w-[100px] px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.managerFinancialVisibility} onChange={(e) => setForm({ ...form, managerFinancialVisibility: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Allow manager financial visibility</span>
                  </label>
                </div>
                <button type="button" onClick={() => saveSection('financial', 'Financial Control')} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  Save Financial Control
                </button>
              </div>
            )}

            {/* 6. Notifications & Alerts */}
            {activeSection === 'notifications' && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Bell size={18} /> Notifications & Alerts
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.riskAlertNotifications} onChange={(e) => setForm({ ...form, riskAlertNotifications: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Risk alerts</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.overdueAlerts} onChange={(e) => setForm({ ...form, overdueAlerts: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Overdue alerts</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.deadlineAlerts} onChange={(e) => setForm({ ...form, deadlineAlerts: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Deadline alerts</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.escalationAlerts} onChange={(e) => setForm({ ...form, escalationAlerts: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Escalation alerts</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={form.dailyExecutiveSummary} onChange={(e) => setForm({ ...form, dailyExecutiveSummary: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">Daily executive summary</span>
                  </label>
                  {form.dailyExecutiveSummary && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Summary delivery time</label>
                      <input
                        type="text"
                        value={form.summaryDeliveryTime}
                        onChange={(e) => setForm({ ...form, summaryDeliveryTime: e.target.value })}
                        placeholder="09:00"
                        className="w-full max-w-[100px] px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Delivery method</label>
                    <select value={form.notificationMethod} onChange={(e) => setForm({ ...form, notificationMethod: e.target.value as 'email' | 'in-app' | 'both' })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                      <option value="email">Email</option>
                      <option value="in-app">In-App</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => saveSection('notifications', 'Notifications & Alerts')} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
                  Save Notifications
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setConfirmModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 shadow-xl z-[61] max-w-sm">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">{confirmModal.message}</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmModal(null)} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                Cancel
              </button>
              <button type="button" onClick={() => { confirmModal.onConfirm(); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg">
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
