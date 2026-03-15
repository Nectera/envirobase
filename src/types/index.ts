// Manual type definitions (replaces Prisma-generated types)

export type Project = {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  status: string;
  priority: string;
  address: string;
  client: string;
  projectNumber?: string;
  startDate: string | null;
  estEndDate?: string | null;
  endDate: string | null;
  permitNumber: string | null;
  permitExpiry: string | null;
  estimatedCost: number | null;
  estimatedDays: number | null;
  estimatedLaborHours: number | null;
  notes: string | null;
  createdAt: string;
  [key: string]: any; // allow extra fields from JSON store
};

export type ProjectTask = {
  id: string;
  projectId: string;
  name: string;
  status: string;
  date: string | null;
  sortOrder: number;
};

export type Worker = {
  id: string;
  userId: string | null;
  name: string;
  role: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  address: string | null;
  homeCity: string | null;
  homeState: string | null;
  homeZip: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  city: string | null;
  state: string | null;
  types: string[];
  skillRating?: number;
  status: "active" | "inactive";
  createdAt: string;
};

export type Certification = {
  id: string;
  workerId: string;
  name: string;
  number: string | null;
  issued: string | null;
  expires: string | null;
  status: string;
  createdAt: string;
};

export type MedicalRecord = {
  id: string;
  workerId: string;
  examDate: string;
  nextExamDate: string | null;
  respiratorFitDate: string | null;
  bll: number | null;
  notes: string | null;
};

export type Alert = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  date: string;
  projectId: string | null;
  workerId: string | null;
  dismissed: boolean;
  createdAt: string;
};

export type ProjectWithRelations = Project & {
  tasks: ProjectTask[];
  workers: ProjectWorkerWithWorker[];
  alerts: Alert[];
};

export type ProjectWorkerWithWorker = {
  id: string;
  projectId: string;
  workerId: string;
  role: string | null;
  worker: Worker;
};

export type WorkerWithRelations = Worker & {
  certifications: Certification[];
  medicalRecords: MedicalRecord[];
};

export type DailyFieldReport = {
  id: string;
  projectId: string;
  date: string;
  supervisorName: string;
  projectManagerName: string;

  // Scope of Work
  scopeReceived: boolean;
  scopeDate: string | null;
  scopeDescription: string | null;
  workAreaLocations: string[];

  // Timeline
  estimatedCompletionDate: string | null;
  daysRemaining: number | null;
  estimatedHoursTotal: number | null;

  // Work
  workCompletedToday: string;
  workflow: string;

  // End of Shift Review
  shiftReview: string;
  incident: boolean;
  incidentDetails: string | null;
  stopWork: boolean;
  stopWorkDetails: string | null;

  // Goals
  goalsForTomorrow: string;
  goalsForWeek: string;

  // Notes
  projectNotes: string;
  meetingLog: string;
  visitors: string;

  // Equipment & Monitoring
  negativeAirMachineCount: number | null;
  equipmentMalfunctions: string;
  negativeAirEstablished: boolean;
  manometerPhoto: string;

  // Asbestos in Work Area
  asbestosInWorkArea: string;

  // Photos
  photos: { filename: string; caption: string }[];

  // Meta
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyFieldReportWithProject = DailyFieldReport & {
  project: Project;
};

// Time Clock
export type TimeEntry = {
  id: string;
  projectId: string;
  workerId: string;
  workerName: string;
  role: 'supervisor' | 'technician';
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO timestamp
  clockOut: string | null; // ISO timestamp or null if still clocked in
  breakMinutes: number;
  totalHours: number | null; // computed on clock-out
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TimeEntryWithProject = TimeEntry & {
  project: Project;
};

export type TimeEntryWithWorker = TimeEntry & {
  worker: Worker;
};

export type DailyTimeReport = {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  entries: TimeEntry[];
  totalSupervisorHours: number;
  totalTechnicianHours: number;
  totalHours: number;
  generatedAt: string;
};

// PSI / JHA / SPA
export type PsiJhaSpa = {
  id: string;
  projectId: string;
  date: string;
  time: string; // HH:MM

  // Job Info
  jobNumber: string;
  permitNumber: string;
  taskLocation: string;
  musterPoint: string;
  jobSiteAddress: string;
  nearestHospital: string;
  nearestHospitalAddress: string;

  // Hazard Checklists (arrays of checked item keys)
  environmentHazards: string[];
  ergonomicsHazards: string[];
  heightHazards: string[];
  activityHazards: string[];
  accessEgressHazards: string[];
  personalLimitationsHazards: string[];
  ppeRequirements: string[];
  otherHazards: string;

  // Task Steps (JHA table)
  taskSteps: {
    step: string;
    hazard: string;
    control: string;
    riskRating: number;
  }[];

  // Weather
  weatherCurrentTemp: string;
  weatherCurrentWind: string;
  weatherCurrentCondition: string;
  weatherCurrentHumidity: string;
  weatherCurrentHeatIndex: string;
  weatherForecastTemp: string;
  weatherForecastWind: string;
  weatherForecastCondition: string;
  weatherForecastHumidity: string;
  weatherForecastHeatIndex: string;
  reviewedWeather: boolean;
  reviewedRoadConditions: boolean;
  reviewedOshaHeatIndex: boolean;

  // Sign-off
  workerSignoffs: { workerId: string; workerName: string; verified: boolean; timestamp: string }[];
  supervisorName: string;
  supervisorVerified: boolean;
  supervisorTimestamp: string;

  // Adequacy
  taskDescriptionAdequate: boolean;
  hazardIdentificationAdequate: boolean;
  reviewedByLead: boolean;

  // Comments & Evacuation
  comments: string;
  evacuationPlan: string;

  // Meta
  status: string; // draft | submitted | reviewed
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PsiJhaSpaWithProject = PsiJhaSpa & {
  project: Project;
};

// Pre-Abatement Visual Inspection Checklist
export type PreAbatementInspection = {
  id: string;
  projectId: string;
  date: string;
  inspector: string;
  contractorSupervisor: string;
  projectManager: string;
  removalTechnique: string[]; // ['wet_gross', 'glove_bag', 'primary_enclosure', 'secondary_enclosure']

  // Checklist items — each is 'yes' | 'no' | 'na'
  checklistItems: Record<string, 'yes' | 'no' | 'na'>;

  // Comments
  comments: string;

  // Meta
  status: string; // draft | submitted | reviewed
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PreAbatementInspectionWithProject = PreAbatementInspection & {
  project: Project;
};

// Certificate of Completion
export type CertificateOfCompletion = {
  id: string;
  projectId: string;
  workSiteAddress: string;
  policyNumber: string;
  claimNumber: string;
  purchaseOrderNumber: string;
  jobNumber: string;
  demobilizationDate: string;
  propertyOwnerName: string;
  propertyOwnerSignDate: string;
  companyRepName: string;
  companyRepSignDate: string;

  // Meta
  status: string; // draft | submitted | signed
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CertificateOfCompletionWithProject = CertificateOfCompletion & {
  project: Project;
};

// Respirator Fit Test
export type RespiratorFitTest = {
  id: string;
  workerId: string;
  projectId: string | null; // optional project link
  branchLocation: string;
  jobAddress: string;
  projectName: string;
  projectSupervisor: string;
  projectManager: string;
  projectNumber: string;

  // General
  supervisor: string;
  testDate: string;

  // Employee info
  employeeName: string;
  respiratorType: string;
  respiratorSize: string;

  // Test results — each is 'pass' | 'fail' | 'na'
  testResults: Record<string, 'pass' | 'fail' | 'na'>;

  comments: string;

  // Inspection performed by
  performedByName: string;
  performedByDate: string;

  // Employee attestation
  employeeSignDate: string;

  // Expiry tracking (yearly)
  expiresDate: string; // testDate + 1 year

  // Meta
  status: string; // draft | completed | expired
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type RespiratorFitTestWithWorker = RespiratorFitTest & {
  worker: Worker;
};

export type RespiratorFitTestWithProject = RespiratorFitTest & {
  project: Project | null;
};

// Post Project Inspection Guide (Project Manager)
export type PostProjectInspection = {
  id: string;
  projectId: string;
  clientName: string;
  clientAddress: string;
  inspectionDate: string;
  inspectionTime: string;
  projectManagerName: string;

  // Checklist items — each is 'yes' | 'no' | 'na'
  checklistItems: Record<string, 'yes' | 'no' | 'na'>;

  // Damage details (free text if damages exist)
  damageNotes: string;

  // Comments
  comments: string;

  // Meta
  status: string; // draft | submitted | reviewed
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PostProjectInspectionWithProject = PostProjectInspection & {
  project: Project;
};

// Company Info
export type CompanyInfo = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  ownerName: string;
  ein: string; // Employer Identification Number
  updatedAt: string;
};

// Company License
export type CompanyLicense = {
  id: string;
  type: string; // cdphe_asbestos | cdphe_lead | epa_lead | osha | contractors_license | insurance_gl | insurance_wc | other
  name: string;
  licenseNumber: string;
  issuingAuthority: string;
  issuedDate: string;
  expirationDate: string;
  status: string; // active | expired | pending_renewal
  notes: string;
  createdAt: string;
  updatedAt: string;
};

// Schedule Entry
export type ScheduleEntry = {
  id: string;
  workerId: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  shift: 'full' | 'morning' | 'afternoon';
  hours: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleEntryWithRelations = ScheduleEntry & {
  worker: Worker;
  project: Project;
};

// Project Documents (permits, sampling reports, etc.)
export type ProjectDocument = {
  id: string;
  projectId: string;
  docType: string; // state_permit | initial_sampling | air_monitoring | waste_manifest | other
  title: string;
  referenceNumber: string;
  date: string;
  notes: string;
  status: string; // pending | received | approved | filed
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// ─── CRM Types ────────────────────────────────────────────────────────────────

export type Company = {
  id: string;
  name: string;
  type: string; // property_mgmt | school_district | insurance | general_contractor | homeowner | government | commercial | other
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  companyId: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactWithCompany = Contact & {
  company: Company;
};

export type Lead = {
  id: string;
  // Contact info
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  // Location
  address: string | null;
  city: string | null;
  state: string | null;
  locationNotes: string | null;
  // Company & project
  companyId: string;
  contactId: string | null;
  source: string; // referral | website | cold_call | repeat_client | other
  projectType: string; // ASBESTOS | LEAD | METH | MOLD | SELECT_DEMO | REBUILD
  status: string; // new | contacted | site_visit | proposal_sent | negotiation | won | lost
  estimatedValue: number | null;
  notes: string | null;
  // Insurance
  isInsuranceJob: boolean;
  insuranceCarrier: string | null;
  claimNumber: string | null;
  adjusterName: string | null;
  adjusterContact: string | null;
  dateOfLoss: string | null;
  // Office / Region
  office: string | null; // "greeley" | "grand_junction"
  // Referral
  referralSource: string | null;
  // Testing referral
  referredForTesting: boolean;
  referredTestingTo: string | null;
  // Linked records (set when lead is won)
  projectId: string | null;
  // System
  assignedTo: string | null; // userId
  lostReason: string | null;
  wonDate: string | null;
  lostDate: string | null;
  createdAt: string;
  updatedAt: string;
};

// Tasks
export type Task = {
  id: string;
  title: string;
  description: string;
  status: "to_do" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignedTo: string | null; // worker id
  createdBy: string | null; // user id
  linkedEntityType: "lead" | "project" | "estimate" | null;
  linkedEntityId: string | null;
  autoCreated: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskWithRelations = Task & {
  worker?: { id: string; name: string } | null;
  lead?: { id: string; firstName: string; lastName: string; company?: { name: string } | null } | null;
  project?: { id: string; name: string } | null;
  estimate?: { id: string; estimateNumber: string } | null;
};

// Task Automation
export type TaskAutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: "lead_status_change";
  triggerValue: string;
  taskTitle: string;
  taskDescription: string;
  taskPriority: "low" | "medium" | "high";
  assignToField: "lead_assignee" | "worker_role" | "specific_worker" | "none";
  assignToValue: string | null;
  linkedEntity: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskTemplate = {
  id: string;
  name: string;
  description: string;
  tasks: TaskTemplateItem[];
  createdAt: string;
  updatedAt: string;
};

export type TaskTemplateItem = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  dayOffset: number;
};

export type LeadWithRelations = Lead & {
  company: Company;
  contact: Contact | null;
  estimates: Estimate[];
};

export type EstimateLineItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string; // sq_ft | linear_ft | hour | day | each | lump_sum
  unitPrice: number;
  total: number;
};

export type Estimate = {
  id: string;
  leadId: string | null;
  companyId: string;
  contactId: string | null;
  estimateNumber: string; // EST-2026-001
  projectType: string; // ASBESTOS | LEAD | METH | MOLD | SELECT_DEMO | REBUILD
  status: string; // draft | sent | accepted | rejected | revised
  lineItems: EstimateLineItem[];
  laborHours: number | null;
  materialsCost: number | null;
  subtotal: number;
  markupPercent: number;
  total: number;
  scope: string | null;
  validUntil: string | null;
  sentDate: string | null;
  acceptedDate: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EstimateWithRelations = Estimate & {
  company: Company;
  contact: Contact | null;
  lead: Lead | null;
};

export type Activity = {
  id: string;
  parentType: string; // lead | company | contact | estimate | project
  parentId: string;
  type: string; // note | call | email | site_visit | status_change | meeting
  title: string | null;
  description: string;
  createdBy: string | null;
  createdAt: string;
  date?: string;
  updatedAt?: string;
};

// Consultation Estimate — combines field checklist + pre-cost calculator
export type ConsultationCOGSItem = {
  item: string;
  qty: number;
  cost: number;
  notes: string;
};

export type ConsultationMaterialItem = {
  material: string;
  unit: string;
  qty: number;
  unitPrice: number;
};

export type ConsultationEstimate = {
  id: string;
  leadId: string | null;
  estimateId: string | null; // linked after conversion
  createdBy: string | null;
  status: string; // draft | costed | converted
  createdAt: string;
  updatedAt: string;

  // Step 1: Site Info
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  milesFromShop: number;
  projectDate: string | null;

  // Step 2: Field Consultation Checklist
  siteVisitRequirements: string[];
  daysNeeded: number;
  crewSize: number;
  scopeOfWork: string;
  paymentType: string; // insurance | self_pay
  lossType: string;
  septicSystem: boolean;
  vacateProperty: string;
  driveTimeHours: number;
  wasteDescription: string;
  permitNeeded: string;
  airClearances: string;
  projectDesign: string;
  deconLocation: string;
  namsCount: number;
  ductCleaning: string;
  asbestosDumpster: boolean;
  directLoadOut: string;
  openDumpster: string;
  dumpsterPlacement: string;
  portableBathroom: boolean;
  flooringLayers: string;
  drywallLayers: string;
  hvacDucting: string;
  spillQuantity: string;
  contentsRemoval: string;
  furnitureAppliances: string;
  customerResponsible: string;
  powerAvailable: boolean;
  waterSource: boolean;
  difficultyRating: number; // 1-5
  fieldNotes: string;

  // Step 3: Labor
  supervisorHours: number;
  supervisorOtHours: number;
  technicianHours: number;
  technicianOtHours: number;

  // Step 4: COGS
  cogs: ConsultationCOGSItem[];

  // Step 5: Materials
  materials: ConsultationMaterialItem[];

  // Calculated totals
  laborCost: number;
  cogsCost: number;
  materialCost: number;
  totalCost: number;
};

// Invoice — customer-facing document generated from consultation estimate
export type InvoiceLineItem = {
  id: string;
  category: string; // labor | cogs | materials | custom
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string; // INV-2026-001
  consultationEstimateId: string | null;
  projectId: string | null;
  leadId: string | null;
  contactId: string | null;
  companyId: string | null;

  // Customer info
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerZip: string;
  customerEmail: string;
  customerPhone: string;

  // Invoice details
  status: string; // draft | sent | paid | overdue | void
  issueDate: string;
  dueDate: string;
  paymentTerms: string; // net_30 | net_15 | due_on_receipt | custom

  // Line items
  lineItems: InvoiceLineItem[];

  // Pricing
  subtotal: number;
  markupPercent: number;
  markupAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;

  // Cost tracking (internal, not shown to customer)
  internalCost: number; // total cost from consultation estimate
  profitMargin: number; // (total - internalCost) / total

  // Notes
  scope: string;
  notes: string;
  internalNotes: string;
  paymentInstructions: string;

  // Metadata
  createdBy: string | null;
  sentDate: string | null;
  paidDate: string | null;
  paidAmount: number;
  // QuickBooks integration
  qbInvoiceId: string | null;
  qbSyncStatus: "synced" | "failed" | null;
  qbSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceWithRelations = Invoice & {
  consultationEstimate?: ConsultationEstimate | null;
  contact?: Contact | null;
  company?: Company | null;
  lead?: Lead | null;
};

// ─── Calendar Types ─────────────────────────────────────────────────────────

export type TimeOff = {
  id: string;
  workerId: string;
  type: "vacation" | "sick" | "personal" | "jury_duty" | "bereavement" | "unpaid";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
  status: "pending" | "approved" | "denied";
  reason: string | null;
  notes: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  deniedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TimeOffWithWorker = TimeOff & {
  worker: Worker;
};

export type CalendarEvent = {
  id: string;
  title: string;
  type: "holiday" | "training" | "meeting" | "inspection" | "company_event" | "other";
  description: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
  allDay: boolean;
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  office: string | null; // null = company-wide, 'greeley' | 'grand_junction'
  color: string; // hex code
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};
