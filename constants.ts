
import { Business, Checklist, CompanySettings, Stage, CompanyProfile, HealthStatusLabel } from './types';

const STAGES: Stage[] = ['Foundation', 'Design', 'Prototype', 'Launch', 'Traction', 'Scale'];
const HEALTH_LABELS: HealthStatusLabel[] = ['On Track', 'At Risk', 'Stale'];

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Zeweco',
  companyCode: 'ZWC',
  logoUrl: '',
  industry: 'Technology',
  category: 'Portfolio & Innovation',
  establishedYear: undefined,
  fiscalYearStartMonth: 4,
  defaultTimezone: 'Asia/Kolkata',
  reportingCycle: 'weekly',

  defaultManagerPermissions: ['can_edit_entity_profile', 'can_raise_escalation', 'can_update_milestones'],

  defaultStages: [...STAGES],
  healthStatusLabels: [...HEALTH_LABELS],
  escalationThresholdOverdue: 3,
  defaultMilestoneCountTemplate: 6,
  entityArchivingEnabled: true,
  entityPriorityLevels: ['High', 'Medium', 'Low'],

  kpiUpdateFrequency: 'weekly',
  requireWeeklyManagerReport: true,
  weeklyReportTemplateFields: ['Progress', 'Blockers', 'Next week focus'],
  lockKpiTargetEditing: false,
  enableKpiCommentary: true,
  autoReminderManagerUpdates: true,

  financialModuleEnabled: false,
  budgetApprovalRequired: true,
  budgetAlertThresholdPercent: 10,
  managerFinancialVisibility: false,

  riskAlertNotifications: true,
  overdueAlerts: true,
  deadlineAlerts: true,
  escalationAlerts: true,
  dailyExecutiveSummary: false,
  summaryDeliveryTime: '09:00',
  notificationMethod: 'in-app',
};

export function createDefaultCompanyProfile(id: string, name?: string): CompanyProfile {
  return {
    id,
    ...DEFAULT_COMPANY_SETTINGS,
    companyName: name || DEFAULT_COMPANY_SETTINGS.companyName,
    defaultStages: [...DEFAULT_COMPANY_SETTINGS.defaultStages],
    defaultManagerPermissions: [...DEFAULT_COMPANY_SETTINGS.defaultManagerPermissions],
    healthStatusLabels: [...DEFAULT_COMPANY_SETTINGS.healthStatusLabels],
    weeklyReportTemplateFields: [...DEFAULT_COMPANY_SETTINGS.weeklyReportTemplateFields],
  };
}

const generateMockChecklists = (): Checklist[] => [
  {
    id: 'cl-1',
    title: 'Core Foundation',
    tasks: [
      { id: 't1', text: 'Market Research Analysis', completed: true },
      { id: 't2', text: 'Financial Projection Model', completed: false },
      { id: 't3', text: 'Brand Identity Draft', completed: false },
    ]
  },
  {
    id: 'cl-2',
    title: 'Operational Readiness',
    tasks: [
      { id: 't4', text: 'Legal Compliance Audit', completed: false },
      { id: 't5', text: 'Supply Chain Vendor Selection', completed: false },
      { id: 't6', text: 'MVP Feature Roadmap', completed: false },
    ]
  }
];

export const BUSINESS_DATA: Business[] = [
  { id: '1', name: 'Co-X', code: 'COX', stage: 'Traction', health: 'Yellow', routeProgress: 7, nextMilestone: 'Close 2 retainer clients', eta: '18 Feb', updated: '1d ago', status: 'At Risk', responsible: 'KIRTII', checklists: generateMockChecklists() },
  { id: '2', name: '124Solution', code: '124', stage: 'Traction', health: 'Red', routeProgress: 5, nextMilestone: 'Finalize offer + pricing page', eta: '10 Feb', updated: 'Today', status: 'Overdue', responsible: 'KIRTII', checklists: generateMockChecklists() },
  { id: '3', name: 'Mei-Shi', code: 'MEI', stage: 'Prototype', health: 'Yellow', routeProgress: 4, nextMilestone: 'Store assembly SOP locked', eta: '16 Feb', updated: '3d ago', status: 'At Risk', responsible: 'KIRTII', checklists: generateMockChecklists() },
  { id: '4', name: 'Urban Bhog', code: 'UB', stage: 'Launch', health: 'Green', routeProgress: 8, nextMilestone: 'Franchise kit v1 draft', eta: '25 Feb', updated: 'Today', status: 'On Track', responsible: 'KIRTII', checklists: generateMockChecklists() },
  { id: '5', name: 'Crunch Waffle', code: 'CW', stage: 'Prototype', health: 'Yellow', routeProgress: 3, nextMilestone: 'Finalize menu engineering', eta: '14 Feb', updated: '6d ago', status: 'At Risk', responsible: 'KIRTII', checklists: generateMockChecklists() },
  { id: '6', name: 'Frozzo', code: 'FRZ', stage: 'Design', health: 'Yellow', routeProgress: 2, nextMilestone: 'Lab trial batch #1', eta: '20 Feb', updated: '8d ago', status: 'Stale', responsible: 'KIRTII', checklists: generateMockChecklists() },
  { id: '7', name: 'Zeweco Innovation', code: 'ZWC', stage: 'Foundation', health: 'Yellow', routeProgress: 1, nextMilestone: 'Define 3 flagship bets', eta: '28 Feb', updated: '4d ago', status: 'At Risk', responsible: 'Akshaya', checklists: generateMockChecklists() },
  { id: '8', name: 'Weston Mark', code: 'WM', stage: 'Design', health: 'Green', routeProgress: 3, nextMilestone: 'Brand system + SKU map', eta: '22 Feb', updated: '2d ago', status: 'On Track', responsible: 'SONAM JAIN', checklists: generateMockChecklists() },
  { id: '9', name: 'BLISS-FiNN', code: 'BFIN', stage: 'Foundation', health: 'Yellow', routeProgress: 1, nextMilestone: 'MVP scope freeze', eta: '19 Feb', updated: '5d ago', status: 'At Risk', responsible: 'NA', checklists: generateMockChecklists() },
  { id: '10', name: 'Wolio', code: 'WOLIO', stage: 'Prototype', health: 'Green', routeProgress: 6, nextMilestone: 'Student/Parent flow clickable', eta: '17 Feb', updated: 'Today', status: 'On Track', responsible: 'JUHI', checklists: generateMockChecklists() },
  { id: '11', name: 'WioSky', code: 'WSKY', stage: 'Design', health: 'Yellow', routeProgress: 2, nextMilestone: 'Digital prototype scenes', eta: '26 Feb', updated: '7d ago', status: 'At Risk', responsible: 'NA', checklists: generateMockChecklists() },
  { id: '12', name: 'Homeoc Smart Kitchen', code: 'H-KIT', stage: 'Prototype', health: 'Red', routeProgress: 3, nextMilestone: 'Prototype BOM + vendor shortlist', eta: '11 Feb', updated: '10d ago', status: 'Stale', responsible: 'NA', checklists: generateMockChecklists() },
  { id: '13', name: 'Homeoc Smart Home', code: 'H-SYS', stage: 'Foundation', health: 'Yellow', routeProgress: 1, nextMilestone: 'Define core modules', eta: '24 Feb', updated: '3d ago', status: 'At Risk', responsible: 'NA', checklists: generateMockChecklists() },
];
