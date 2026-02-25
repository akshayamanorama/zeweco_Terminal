
export type Stage = 'Foundation' | 'Design' | 'Prototype' | 'Launch' | 'Traction' | 'Scale';
export type Health = 'Green' | 'Yellow' | 'Red';
export type Status = 'On Track' | 'At Risk' | 'Overdue' | 'Stale';
export type UserRole = 'CXO' | 'Manager';

/** Severity for risks: Low, Medium, High, Critical */
export type RiskSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Risk {
  id: string;
  description: string;
  severity: RiskSeverity;
  createdAt?: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  tasks: Task[];
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
  lastLogin: string;
  permissions?: string[];
}

export interface Business {
  id: string;
  name: string;
  code: string;
  /** Entity logo/photo (from gallery in Company Settings) */
  logoUrl?: string;
  /** Entity-level industry/category (editable in Company Settings) */
  industry?: string;
  category?: string;
  /** Year established (e.g. 2020) */
  establishedYear?: number;
  /** Date established (e.g. 2020-01-15 or "Jan 2020") */
  establishedDate?: string;
  stage: Stage;
  health: Health;
  routeProgress: number; // Calculated as (tasks_done / total_tasks) * 12
  nextMilestone: string;
  eta: string;
  updated: string;
  status: Status;
  responsible?: string;
  checklists: Checklist[];
  /** Risks with tagged severity */
  risks?: Risk[];
  /** Manager requested escalation to CXO */
  escalationRequested?: boolean;
  /** Note when requesting escalation */
  escalationNote?: string;
  /** Manager to escalate to (id when selecting a manager) */
  escalatedToManagerId?: string;
  /** Next week focus (editable by manager) */
  nextWeekFocus?: string;
  /** Support needed from CXO (editable) */
  supportNeededFromCXO?: string;
  /** CXO's response to support request (set by CXO) */
  cxoSupportResponse?: string;
}

export type FilterType = 'All' | 'Red' | 'Stale' | 'Due Soon' | 'Green';

export type ReportingCycle = 'weekly' | 'monthly';
export type NotificationMethod = 'email' | 'in-app' | 'both';
export type EntityPriorityLevel = 'High' | 'Medium' | 'Low';

/** Permission keys for managers (toggle-based in Role & Access) */
export type ManagerPermissionKey =
  | 'can_manage_team'
  | 'can_delete_tasks'
  | 'can_edit_entity_profile'
  | 'can_view_financial_data'
  | 'can_raise_escalation'
  | 'can_update_milestones';

export type KpiUpdateFrequency = 'daily' | 'weekly' | 'monthly';

/** Health/status labels for entity governance (display names) */
export type HealthStatusLabel = 'On Track' | 'At Risk' | 'Stale';

/** CXO company and governance settings (MVP) */
export interface CompanySettings {
  // --- Organization ---
  companyName: string;
  companyCode: string;
  logoUrl: string;
  industry: string;
  category: string;
  /** Year established (e.g. 2020) */
  establishedYear?: number;
  fiscalYearStartMonth: number;
  defaultTimezone: string;
  reportingCycle: ReportingCycle;

  // --- Role & Access (default permissions for new managers) ---
  defaultManagerPermissions: ManagerPermissionKey[];

  // --- Entity Governance ---
  defaultStages: Stage[];
  /** Health status labels shown in UI */
  healthStatusLabels: HealthStatusLabel[];
  /** Overdue count that triggers "At Risk" */
  escalationThresholdOverdue: number;
  /** Default number of milestones per entity template */
  defaultMilestoneCountTemplate: number;
  entityArchivingEnabled: boolean;
  entityPriorityLevels: EntityPriorityLevel[];

  // --- KPI & Reporting ---
  kpiUpdateFrequency: KpiUpdateFrequency;
  requireWeeklyManagerReport: boolean;
  weeklyReportTemplateFields: string[];
  lockKpiTargetEditing: boolean;
  enableKpiCommentary: boolean;
  autoReminderManagerUpdates: boolean;

  // --- Financial Control (MVP) ---
  financialModuleEnabled: boolean;
  budgetApprovalRequired: boolean;
  budgetAlertThresholdPercent: number;
  managerFinancialVisibility: boolean;

  // --- Notifications & Alerts ---
  riskAlertNotifications: boolean;
  overdueAlerts: boolean;
  deadlineAlerts: boolean;
  escalationAlerts: boolean;
  dailyExecutiveSummary: boolean;
  /** Time for daily summary e.g. "09:00" */
  summaryDeliveryTime: string;
  notificationMethod: NotificationMethod;
}

/** Company profile with id for multi-company support */
export interface CompanyProfile extends CompanySettings {
  id: string;
}

/** Audit entry for settings changes (backend-ready shape) */
export interface SettingsAuditEntry {
  id: string;
  section: string;
  changedBy: string;
  timestamp: string;
  previousValue: unknown;
  newValue: unknown;
}
