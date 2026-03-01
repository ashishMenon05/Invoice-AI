export type UserRole = "client" | "admin";

export type InvoiceStatus = "processing" | "review" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  company?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ValidationResult {
  mathValid: boolean;
  schemaValid: boolean;
  fraudCheck: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  vendor: string;
  invoiceNumber: string;
  amount: number;
  status: InvoiceStatus;
  submittedDate: string;
  processedDate?: string;
  confidenceScore: number;
  fraudScore: number;
  lineItems: LineItem[];
  validation: ValidationResult;
  timeline: TimelineEvent[];
  rejectionReason?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  totalInvoices: number;
  approved: number;
  rejected: number;
  pending: number;
  status: "active" | "inactive";
}

export interface AnalyticsData {
  approvalRate: number;
  avgProcessingTime: string;
  fraudDetectionRate: number;
  dailyVolume: { date: string; count: number }[];
  approvalDistribution: { name: string; value: number }[];
  topClients: { name: string; invoices: number }[];
}
