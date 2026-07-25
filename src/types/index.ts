// Shared TypeScript types for Youistic OS

export type UserRole = "ADMIN" | "BDE" | "EDITOR" | "SUPPORT" | "VIEWER";
export type ServiceType = "FBP" | "TECH" | "HYBRID";
export type ClientStatus = "ACTIVE" | "CHURNED" | "RENEWAL_DUE" | "ONBOARDING";
export type DealStage = "LEAD" | "PROSPECT" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type ExpenseCategory = "AD_SPEND" | "SERVER_EMI" | "SALARY" | "TOOLS" | "OFFICE" | "MISC";
export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";
export type ProjectType = "FBP" | "TECH" | "HYBRID";
export type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "REVIEW" | "DELIVERED" | "ON_HOLD";
export type TaskStage = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  joiningDate?: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email?: string | null;
  phone?: string | null;
  serviceType: ServiceType;
  billingModel?: "ONE_TIME" | "RECURRING";
  contractValue: number;
  renewalAmount?: number;
  salesCloseDate?: Date | null;
  renewalDate?: Date | null;
  status: ClientStatus;
  notes?: string | null;
  industry?: string | null;
  website?: string | null;
  assignedBdeId?: string | null;
  assignedBde?: User | null;
  createdAt: Date;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  closeDate?: Date | null;
  notes?: string | null;
  probability: number;
  clientId: string;
  client?: Client;
  bdeId: string;
  bde?: User;
  createdAt: Date;
}

export interface SupportTicket {
  id: string;
  title: string;
  description?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  resolvedAt?: Date | null;
  tags: string[];
  clientId: string;
  client?: Client;
  assignedToId?: string | null;
  assignedTo?: User | null;
  createdAt: Date;
}

export interface RevenueEntry {
  id: string;
  amount: number;
  paymentDate: Date;
  revenueType: ServiceType;
  invoiceNumber?: string | null;
  paymentStatus: PaymentStatus;
  description?: string | null;
  clientId: string;
  client?: Client;
  createdAt: Date;
}

export interface ExpenseEntry {
  id: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: Date;
  description?: string | null;
  vendor?: string | null;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  type: ProjectType;
  status: ProjectStatus;
  startDate?: Date | null;
  deadline?: Date | null;
  progress: number;
  clientId: string;
  client?: Client;
  tasks?: Task[];
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  stage: TaskStage;
  priority: TaskPriority;
  dueDate?: Date | null;
  kanbanOrder: number;
  tags: string[];
  projectId: string;
  project?: Project;
  assignedToId?: string | null;
  assignedTo?: User | null;
  createdAt: Date;
}

export interface DailyReport {
  id: string;
  reportDate: Date;
  tasksCompleted: string[] | null;
  callsMade: number;
  leadsGenerated: number;
  meetingsHeld: number;
  notes?: string | null;
  userId: string;
  user?: User;
  submittedAt: Date;
}

export interface PerformanceMetric {
  id: string;
  periodMonth: Date;
  dealsClosedCount: number;
  revenueGenerated: number;
  ticketsResolved: number;
  tasksCompleted: number;
  closingRatio: number;
  leadsGenerated: number;
  userId: string;
  user?: User;
}

// Dashboard stat card type
export interface StatCard {
  title: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: string;
  color?: string;
}
