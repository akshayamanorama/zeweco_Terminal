
export type Stage = 'Foundation' | 'Design' | 'Prototype' | 'Launch' | 'Traction' | 'Scale';
export type Health = 'Green' | 'Yellow' | 'Red';
export type Status = 'On Track' | 'At Risk' | 'Overdue' | 'Stale';
export type UserRole = 'CXO' | 'Manager';

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
  stage: Stage;
  health: Health;
  routeProgress: number; // Calculated as (tasks_done / total_tasks) * 12
  nextMilestone: string;
  eta: string;
  updated: string;
  status: Status;
  responsible?: string;
  checklists: Checklist[];
}

export type FilterType = 'All' | 'Red' | 'Stale' | 'Due Soon' | 'Green';
