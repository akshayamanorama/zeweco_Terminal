
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

/** CXO company and governance settings */
export interface CompanySettings {
  companyName: string;
  /** Logo image: URL or data URL (from gallery upload) */
  logoUrl: string;
  industry: string;
  category: string;
  fiscalYearStartMonth: number; // 1-12
  defaultTimezone: string;
  reportingCycle: ReportingCycle;
  defaultStages: Stage[]; // order/labels for entity stages
  /** Overdue items count that triggers "At Risk" */
  escalationThresholdOverdue: number;
  entityArchivingEnabled: boolean;
  entityPriorityLevels: EntityPriorityLevel[];
  riskAlertNotifications: boolean;
  overdueAlerts: boolean;
  deadlineAlerts: boolean;
  notificationMethod: NotificationMethod;
}

/** Company profile with id for multi-company support */
export interface CompanyProfile extends CompanySettings {
  id: string;
}
