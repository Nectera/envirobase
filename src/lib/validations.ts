import { z } from "zod";

// ===== LEADS =====
export const createLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email("Invalid email").max(200).nullable().optional().or(z.literal("")),
  address: z.string().max(300).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  locationNotes: z.string().max(1000).nullable().optional(),
  companyId: z.string().optional().default(""),
  contactId: z.string().nullable().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["new", "contacted", "site_visit", "proposal_sent", "negotiation", "won", "lost"]).optional(),
  projectType: z.string().min(1).max(200).optional(),
  source: z.enum(["referral", "website", "cold_call", "repeat_client", "insurance", "property_manager", "realtor", "other"]).optional(),
  estimatedValue: z.number().min(0).max(100000000).optional(),
  notes: z.string().max(5000).optional(),
  isInsuranceJob: z.boolean().optional(),
  insuranceCarrier: z.string().max(200).nullable().optional(),
  claimNumber: z.string().max(100).nullable().optional(),
  adjusterName: z.string().max(200).nullable().optional(),
  adjusterContact: z.string().max(200).nullable().optional(),
  dateOfLoss: z.string().nullable().optional(),
  office: z.enum(["greeley", "grand_junction"]).nullable().optional(),
  siteVisitDate: z.string().nullable().optional(),
  siteVisitTime: z.string().nullable().optional(),
  siteVisitNotes: z.string().max(2000).nullable().optional(),
  projectStartDate: z.string().nullable().optional(),
  referralSource: z.string().max(200).nullable().optional(),
  referredForTesting: z.boolean().optional(),
  referredTestingTo: z.string().max(200).nullable().optional(),
  assignedTo: z.string().max(100).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  wonDate: z.string().nullable().optional(),
  lostDate: z.string().nullable().optional(),
  lostReason: z.string().max(1000).nullable().optional(),
  pipelineStage: z.string().max(100).nullable().optional(),
  projectId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  userId: z.string().optional(),
  siteVisitAssignee: z.string().nullable().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

// ===== PROJECTS =====
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  type: z.string().min(1).max(200),
  subtype: z.string().max(100).nullable().optional(),
  status: z.enum(["planning", "assessment", "in_progress", "completed", "on_hold"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  address: z.string().min(1, "Address is required").max(300),
  client: z.string().min(1, "Client is required").max(200),
  startDate: z.string().nullable().optional(),
  estEndDate: z.string().nullable().optional(),
  notificationDate: z.string().nullable().optional(),
  permitNumber: z.string().max(100).nullable().optional(),
  acmQuantity: z.string().max(200).nullable().optional(),
  compliance: z.any().optional(),
  estimatedDays: z.number().min(0).max(3650).nullable().optional(),
  estimatedLaborHours: z.number().min(0).max(100000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  projectNumber: z.string().max(50).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// ===== WORKERS =====
export const createWorkerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  role: z.string().min(1, "Role is required").max(50),
  position: z.string().max(100).nullable().optional(),
  types: z.union([z.string(), z.array(z.string())]).optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email("Invalid email").max(200).nullable().optional().or(z.literal("")),
  photoUrl: z.string().max(500).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  homeCity: z.string().max(100).nullable().optional(),
  homeState: z.string().max(50).nullable().optional(),
  homeZip: z.string().max(20).nullable().optional(),
  emergencyContactName: z.string().max(200).nullable().optional(),
  emergencyContactPhone: z.string().max(30).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  status: z.enum(["active", "inactive", "terminated"]).optional(),
});

export const updateWorkerSchema = createWorkerSchema.partial();

// ===== TASKS =====
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(5000).optional(),
  status: z.enum(["to_do", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.string().max(100).nullable().optional(),
  createdBy: z.string().max(100).nullable().optional(),
  linkedEntityType: z.enum(["project", "lead", "estimate", ""]).nullable().optional(),
  linkedEntityId: z.string().nullable().optional(),
  autoCreated: z.boolean().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// ===== COMPANIES =====
export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  type: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email("Invalid email").max(200).optional().or(z.literal("")),
  website: z.string().max(300).optional(),
  industry: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  referralFeeEnabled: z.boolean().optional(),
  referralFeePercent: z.number().min(0).max(100).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// ===== CONTACTS =====
export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().max(100).nullable().optional(),
  companyId: z.string().nullable().optional(),
  title: z.string().max(200).optional(),
  email: z.string().email("Invalid email").max(200).optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  mobile: z.string().max(30).optional(),
  notes: z.string().max(5000).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  locationNotes: z.string().max(1000).optional(),
  isInsuranceJob: z.boolean().optional(),
  insuranceCarrier: z.string().max(200).optional(),
  claimNumber: z.string().max(100).optional(),
  adjusterName: z.string().max(200).optional(),
  adjusterContact: z.string().max(200).optional(),
  dateOfLoss: z.string().nullable().optional(),
  source: z.string().max(100).optional(),
  referralSource: z.string().max(200).optional(),
  referredForTesting: z.boolean().optional(),
  referredTestingTo: z.string().max(200).optional(),
  office: z.string().max(100).optional(),
});

export const updateContactSchema = createContactSchema.partial();

// ===== INVOICES =====
export const createInvoiceSchema = z.object({
  consultationEstimateId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  customerName: z.string().max(200).optional(),
  customerAddress: z.string().max(300).optional(),
  customerCity: z.string().max(100).optional(),
  customerState: z.string().max(50).optional(),
  customerZip: z.string().max(20).optional(),
  customerEmail: z.string().max(200).optional(),
  customerPhone: z.string().max(30).optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  paymentTerms: z.enum(["due_on_receipt", "net_15", "net_30", "net_60"]).optional(),
  lineItems: z.array(z.any()).optional(),
  subtotal: z.number().min(0).optional(),
  markupPercent: z.number().min(0).max(100).optional(),
  markupAmount: z.number().min(0).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  taxAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  internalCost: z.number().min(0).optional(),
  profitMargin: z.number().optional(),
  scope: z.string().max(10000).optional(),
  notes: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
  paymentInstructions: z.string().max(2000).optional(),
  createdBy: z.string().nullable().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

// ===== KNOWLEDGE BASE =====
export const createKnowledgeBaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  category: z.enum(["training_manual", "employee_handbook", "safety_procedures", "tips", "regulations", "general", "material_invoice"]),
  content: z.string().max(50000).optional(),
});

export const updateKnowledgeBaseSchema = createKnowledgeBaseSchema.partial();

// ===== BATCH OPERATIONS =====
export const batchLeadActionSchema = z.object({
  action: z.enum(["updateStatus", "delete", "bulkUpdate"]),
  ids: z.array(z.string()).min(1, "At least one ID required").max(5000),
  status: z.enum(["new", "contacted", "site_visit", "proposal_sent", "negotiation", "won", "lost"]).optional(),
  fields: z.record(z.any()).optional(),
});

// ===== HELPER =====
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    const field = firstError.path.join(".");
    return { success: false, error: field ? `${field}: ${firstError.message}` : firstError.message };
  }
  return { success: true, data: result.data };
}
