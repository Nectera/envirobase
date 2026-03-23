-- ============================================================
-- Insurance & Estimating Tables for EnviroBase
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Xactimate Line Item Library
CREATE TABLE IF NOT EXISTS xact_line_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  "defaultRate" DOUBLE PRECISION,
  "projectTypes" TEXT[] DEFAULT '{}',
  notes TEXT,
  favorite BOOLEAN NOT NULL DEFAULT false,
  "organizationId" TEXT REFERENCES organizations(id),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xact_line_items_category ON xact_line_items(category);
CREATE INDEX IF NOT EXISTS idx_xact_line_items_code ON xact_line_items(code);
CREATE INDEX IF NOT EXISTS idx_xact_line_items_org ON xact_line_items("organizationId");

-- 2. Project Estimates (originals + supplements)
CREATE TABLE IF NOT EXISTS project_estimates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'original',
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "approvedAmount" DOUBLE PRECISION,
  notes TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "deniedAt" TIMESTAMP(3),
  "denialReason" TEXT,
  "organizationId" TEXT REFERENCES organizations(id),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_estimates_project ON project_estimates("projectId");
CREATE INDEX IF NOT EXISTS idx_project_estimates_org ON project_estimates("organizationId");

-- 3. Estimate Line Items
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "estimateId" TEXT NOT NULL REFERENCES project_estimates(id) ON DELETE CASCADE,
  "xactItemId" TEXT REFERENCES xact_line_items(id),
  "xactCode" TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  room TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_estimate ON estimate_line_items("estimateId");

-- 4. Carrier Info
CREATE TABLE IF NOT EXISTS carrier_info (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "carrierName" TEXT NOT NULL,
  "adjusterName" TEXT,
  "adjusterEmail" TEXT,
  "adjusterPhone" TEXT,
  "claimNumber" TEXT,
  "policyNumber" TEXT,
  "dateOfLoss" TEXT,
  deductible DOUBLE PRECISION,
  notes TEXT,
  "organizationId" TEXT REFERENCES organizations(id),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_carrier_info_project ON carrier_info("projectId");
CREATE INDEX IF NOT EXISTS idx_carrier_info_org ON carrier_info("organizationId");

-- 5. Carrier Communications
CREATE TABLE IF NOT EXISTS carrier_communications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "carrierId" TEXT NOT NULL REFERENCES carrier_info(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  "contactName" TEXT,
  date TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_carrier_comms_carrier ON carrier_communications("carrierId");
