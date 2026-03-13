import { Invoice, Client, AnalyticsData, InvoiceStatus } from "@/types";

const statuses: InvoiceStatus[] = ["approved", "review", "rejected", "processing"];

const vendors = [
  "Acme Corp", "TechFlow Inc", "DataStream Ltd", "CloudBase Systems",
  "NetPrime Solutions", "DigitalEdge Co", "CoreStack Technologies",
  "ByteWave Analytics", "PulseNet Services", "InfraCore Partners",
];

const makeTimeline = (status: InvoiceStatus) => {
  const events = [
    { id: "1", timestamp: "2025-02-15T09:00:00Z", action: "Invoice submitted", actor: "System" },
    { id: "2", timestamp: "2025-02-15T09:01:00Z", action: "AI processing started", actor: "InvoiceAI" },
    { id: "3", timestamp: "2025-02-15T09:02:00Z", action: "Extraction complete", actor: "InvoiceAI" },
  ];
  if (status === "approved") events.push({ id: "4", timestamp: "2025-02-15T10:00:00Z", action: "Approved by admin", actor: "Admin" });
  if (status === "rejected") events.push({ id: "4", timestamp: "2025-02-15T10:00:00Z", action: "Rejected by admin", actor: "Admin" });
  if (status === "review") events.push({ id: "4", timestamp: "2025-02-15T09:03:00Z", action: "Flagged for manual review", actor: "InvoiceAI" });
  return events;
};

export const mockInvoices: Invoice[] = Array.from({ length: 24 }, (_, i) => {
  const status = statuses[i % 4];
  return {
    id: `INV-${String(1000 + i).padStart(4, "0")}`,
    clientId: `client-${(i % 5) + 1}`,
    clientName: ["Apex Industries", "Stellar Labs", "Quantum Corp", "Nova Dynamics", "Orbit Solutions"][i % 5],
    vendor: vendors[i % vendors.length],
    invoiceNumber: `#${2024000 + i}`,
    amount: Math.round((Math.random() * 45000 + 5000) * 100) / 100,
    status,
    submittedDate: `2025-02-${String(1 + (i % 28)).padStart(2, "0")}`,
    processedDate: status !== "processing" ? `2025-02-${String(2 + (i % 27)).padStart(2, "0")}` : undefined,
    confidenceScore: Math.round(Math.random() * 30 + 70),
    fraudScore: Math.round(Math.random() * 25),
    lineItems: [
      { id: "li-1", description: "Consulting Services", quantity: 1, unitPrice: 2500, total: 2500 },
      { id: "li-2", description: "Software License", quantity: 3, unitPrice: 1200, total: 3600 },
      { id: "li-3", description: "Cloud Hosting", quantity: 1, unitPrice: 850, total: 850 },
    ],
    validation: { mathValid: true, schemaValid: Math.random() > 0.1, fraudCheck: Math.random() > 0.15 },
    timeline: makeTimeline(status),
    rejectionReason: status === "rejected" ? "Invoice amount does not match purchase order. Line item discrepancy detected." : undefined,
  };
});

export const mockClients: Client[] = [
  { id: "client-1", name: "Apex Industries", email: "finance@apex.com", company: "Apex Industries Ltd", totalInvoices: 48, approved: 32, rejected: 4, pending: 12, status: "active" },
  { id: "client-2", name: "Stellar Labs", email: "accounts@stellar.io", company: "Stellar Labs Inc", totalInvoices: 35, approved: 28, rejected: 2, pending: 5, status: "active" },
  { id: "client-3", name: "Quantum Corp", email: "billing@quantum.co", company: "Quantum Corp", totalInvoices: 22, approved: 15, rejected: 3, pending: 4, status: "active" },
  { id: "client-4", name: "Nova Dynamics", email: "finance@nova.tech", company: "Nova Dynamics LLC", totalInvoices: 19, approved: 14, rejected: 1, pending: 4, status: "inactive" },
  { id: "client-5", name: "Orbit Solutions", email: "ap@orbit.dev", company: "Orbit Solutions", totalInvoices: 41, approved: 30, rejected: 5, pending: 6, status: "active" },
];

export const mockAnalytics: AnalyticsData = {
  approvalRate: 82.4,
  avgProcessingTime: "2.3 min",
  fraudDetectionRate: 4.7,
  dailyVolume: [
    { date: "Mon", count: 42 }, { date: "Tue", count: 38 }, { date: "Wed", count: 55 },
    { date: "Thu", count: 47 }, { date: "Fri", count: 61 }, { date: "Sat", count: 18 }, { date: "Sun", count: 12 },
  ],
  approvalDistribution: [
    { name: "Approved", value: 65 }, { name: "Under Review", value: 18 }, { name: "Rejected", value: 10 }, { name: "Processing", value: 7 },
  ],
  topClients: [
    { name: "Apex Industries", invoices: 48 }, { name: "Orbit Solutions", invoices: 41 },
    { name: "Stellar Labs", invoices: 35 }, { name: "Quantum Corp", invoices: 22 }, { name: "Nova Dynamics", invoices: 19 },
  ],
};

// Mock API functions
export const getInvoices = (clientId?: string): Promise<Invoice[]> =>
  Promise.resolve(clientId ? mockInvoices.filter((i) => i.clientId === clientId) : mockInvoices);

export const getInvoiceById = (id: string): Promise<Invoice | undefined> =>
  Promise.resolve(mockInvoices.find((i) => i.id === id));

export const getClients = (): Promise<Client[]> => Promise.resolve(mockClients);

export const uploadInvoice = (_files: File[]): Promise<{ success: boolean }> =>
  new Promise((resolve) => setTimeout(() => resolve({ success: true }), 2000));

export const approveInvoice = (id: string): Promise<{ success: boolean }> =>
  new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));

export const rejectInvoice = (id: string, _reason: string): Promise<{ success: boolean }> =>
  new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
