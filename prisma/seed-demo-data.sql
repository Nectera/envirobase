-- ============================================
-- EnviroBase Demo Data Seed
-- Run against the production DB for demo account
-- ============================================

-- Companies
INSERT INTO companies (id, name, type, phone, email, city, state, "createdAt", "updatedAt") VALUES
('demo-co-1', 'Front Range Property Management', 'property_manager', '(970) 555-1200', 'info@frpm.example.com', 'Greeley', 'CO', NOW(), NOW()),
('demo-co-2', 'Summit Builders LLC', 'general_contractor', '(970) 555-3400', 'bids@summitbuilders.example.com', 'Fort Collins', 'CO', NOW(), NOW()),
('demo-co-3', 'Mountain West Insurance', 'insurance_company', '(303) 555-7800', 'claims@mwinsurance.example.com', 'Denver', 'CO', NOW(), NOW()),
('demo-co-4', 'Western Slope Realty', 'property_manager', '(970) 555-9100', 'maintenance@wsrealty.example.com', 'Grand Junction', 'CO', NOW(), NOW()),
('demo-co-5', 'Poudre School District', 'government', '(970) 555-2200', 'facilities@psd.example.com', 'Fort Collins', 'CO', NOW(), NOW()),
('demo-co-6', 'Weld County Housing Authority', 'government', '(970) 555-4400', 'projects@weldhousing.example.com', 'Greeley', 'CO', NOW(), NOW()),
('demo-co-7', 'Alpine Construction Group', 'general_contractor', '(970) 555-6600', 'estimating@alpineconst.example.com', 'Loveland', 'CO', NOW(), NOW()),
('demo-co-8', 'State Farm - Dan Mitchell', 'insurance_company', '(303) 555-8800', 'dan.mitchell@statefarm.example.com', 'Greeley', 'CO', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Leads at various pipeline stages
-- NEW leads
INSERT INTO leads (id, "companyId", "firstName", "lastName", email, phone, status, "projectType", source, "estimatedValue", address, city, state, zip, office, "createdAt", "updatedAt") VALUES
('demo-lead-1', 'demo-co-1', 'Sarah', 'Chen', 'schen@frpm.example.com', '(970) 555-1201', 'new', 'ASBESTOS', 'referral', 28000, '1420 10th Ave', 'Greeley', 'CO', '80631', 'greeley', NOW() - INTERVAL '2 days', NOW()),
('demo-lead-2', 'demo-co-4', 'Mike', 'Rodriguez', 'mrodriguez@wsrealty.example.com', '(970) 555-9102', 'new', 'MOLD', 'website', 12000, '2850 Patterson Rd', 'Grand Junction', 'CO', '81506', 'grand_junction', NOW() - INTERVAL '1 day', NOW()),
('demo-lead-3', NULL, 'Karen', 'White', 'kwhite@gmail.example.com', '(970) 555-3301', 'new', 'LEAD', 'cold_call', 8500, '731 Maple St', 'Fort Collins', 'CO', '80521', 'greeley', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- CONTACTED leads
INSERT INTO leads (id, "companyId", "firstName", "lastName", email, phone, status, "projectType", source, "estimatedValue", address, city, state, zip, office, "createdAt", "updatedAt") VALUES
('demo-lead-4', 'demo-co-2', 'James', 'Thompson', 'jthompson@summitbuilders.example.com', '(970) 555-3401', 'contacted', 'ASBESTOS,SELECT_DEMO', 'referral', 45000, '900 Remington St', 'Fort Collins', 'CO', '80524', 'greeley', NOW() - INTERVAL '5 days', NOW()),
('demo-lead-5', 'demo-co-6', 'Linda', 'Garcia', 'lgarcia@weldhousing.example.com', '(970) 555-4401', 'contacted', 'LEAD', 'repeat_client', 22000, '1800 8th Ave Unit 12', 'Greeley', 'CO', '80631', 'greeley', NOW() - INTERVAL '4 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- SITE_VISIT leads
INSERT INTO leads (id, "companyId", "firstName", "lastName", email, phone, status, "projectType", source, "estimatedValue", address, city, state, zip, office, "siteVisitDate", "siteVisitTime", "createdAt", "updatedAt") VALUES
('demo-lead-6', 'demo-co-5', 'Robert', 'Kim', 'rkim@psd.example.com', '(970) 555-2201', 'site_visit', 'ASBESTOS', 'repeat_client', 67000, '2540 Laporte Ave - Building C', 'Fort Collins', 'CO', '80521', 'greeley', '2026-03-18', '09:00 AM', NOW() - INTERVAL '8 days', NOW()),
('demo-lead-7', 'demo-co-4', 'Teresa', 'Olson', 'tolson@wsrealty.example.com', '(970) 555-9103', 'site_visit', 'METH', 'referral', 35000, '415 N 7th St', 'Grand Junction', 'CO', '81501', 'grand_junction', '2026-03-17', '10:30 AM', NOW() - INTERVAL '6 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- PROPOSAL_SENT leads
INSERT INTO leads (id, "companyId", "firstName", "lastName", email, phone, status, "projectType", source, "estimatedValue", address, city, state, zip, office, "isInsuranceJob", "insuranceCarrier", "createdAt", "updatedAt") VALUES
('demo-lead-8', 'demo-co-3', 'David', 'Nguyen', 'dnguyen@mwinsurance.example.com', '(303) 555-7801', 'proposal_sent', 'ASBESTOS,MOLD', 'referral', 89000, '3200 W 10th St', 'Greeley', 'CO', '80634', 'greeley', true, 'Mountain West Insurance', NOW() - INTERVAL '12 days', NOW()),
('demo-lead-9', 'demo-co-7', 'Amy', 'Foster', 'afoster@alpineconst.example.com', '(970) 555-6601', 'proposal_sent', 'SELECT_DEMO,REBUILD', 'referral', 52000, '1105 Cleveland Ave', 'Loveland', 'CO', '80537', 'greeley', false, NULL, NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- NEGOTIATION leads
INSERT INTO leads (id, "companyId", "firstName", "lastName", email, phone, status, "projectType", source, "estimatedValue", address, city, state, zip, office, "isInsuranceJob", "insuranceCarrier", "createdAt", "updatedAt") VALUES
('demo-lead-10', 'demo-co-8', 'Brian', 'Martinez', 'bmartinez@statefarm.example.com', '(303) 555-8801', 'negotiation', 'ASBESTOS', 'referral', 115000, '4500 W 20th St - Warehouse', 'Greeley', 'CO', '80634', 'greeley', true, 'State Farm', NOW() - INTERVAL '18 days', NOW()),
('demo-lead-11', 'demo-co-1', 'Jessica', 'Park', 'jpark@frpm.example.com', '(970) 555-1202', 'negotiation', 'MOLD,LEAD', 'repeat_client', 41000, '820 13th St Units 4-8', 'Greeley', 'CO', '80631', 'greeley', false, NULL, NOW() - INTERVAL '15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- WON leads (these feed the pipeline)
INSERT INTO leads (id, "companyId", "firstName", "lastName", email, phone, status, "projectType", source, "estimatedValue", address, city, state, zip, office, "wonDate", "pipelineStage", "isInsuranceJob", "createdAt", "updatedAt") VALUES
('demo-lead-12', 'demo-co-2', 'Tom', 'Baker', 'tbaker@summitbuilders.example.com', '(970) 555-3402', 'won', 'ASBESTOS', 'referral', 78000, '2200 S College Ave', 'Fort Collins', 'CO', '80525', 'greeley', '2026-02-20', 'scheduled', false, NOW() - INTERVAL '30 days', NOW()),
('demo-lead-13', 'demo-co-5', 'Nancy', 'Lee', 'nlee@psd.example.com', '(970) 555-2202', 'won', 'ASBESTOS,LEAD', 'repeat_client', 145000, '1600 Lancer Dr - Gym Bldg', 'Fort Collins', 'CO', '80521', 'greeley', '2026-02-15', 'invoiced', false, NOW() - INTERVAL '35 days', NOW()),
('demo-lead-14', 'demo-co-6', 'Carlos', 'Rivera', 'crivera@weldhousing.example.com', '(970) 555-4402', 'won', 'METH', 'repeat_client', 32000, '1450 N 11th Ave Unit 7', 'Greeley', 'CO', '80631', 'greeley', '2026-01-25', 'paid', false, NOW() - INTERVAL '50 days', NOW()),
('demo-lead-15', 'demo-co-3', 'Rachel', 'Adams', 'radams@mwinsurance.example.com', '(303) 555-7802', 'won', 'ASBESTOS', 'referral', 56000, '815 9th St', 'Greeley', 'CO', '80631', 'greeley', '2026-03-01', 'estimating', true, NOW() - INTERVAL '20 days', NOW()),
('demo-lead-16', 'demo-co-7', 'Steve', 'Wilson', 'swilson@alpineconst.example.com', '(970) 555-6602', 'won', 'SELECT_DEMO,REBUILD', 'referral', 93000, '740 S Lincoln Ave', 'Loveland', 'CO', '80537', 'greeley', '2026-02-28', 'scheduled', false, NOW() - INTERVAL '22 days', NOW()),
('demo-lead-17', 'demo-co-4', 'Maria', 'Santos', 'msantos@wsrealty.example.com', '(970) 555-9104', 'won', 'MOLD', 'website', 18500, '1325 N 1st St', 'Grand Junction', 'CO', '81501', 'grand_junction', '2026-03-05', 'estimating', false, NOW() - INTERVAL '14 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- LOST leads (for conversion rate)
INSERT INTO leads (id, "companyId", "firstName", "lastName", status, "projectType", source, "estimatedValue", address, city, state, zip, office, "lostDate", "lostReason", "createdAt", "updatedAt") VALUES
('demo-lead-18', NULL, 'Greg', 'Hall', 'lost', 'ASBESTOS', 'website', 24000, '500 E Mulberry St', 'Fort Collins', 'CO', '80524', 'greeley', '2026-02-10', 'Price too high', NOW() - INTERVAL '40 days', NOW()),
('demo-lead-19', NULL, 'Diana', 'Price', 'lost', 'LEAD', 'cold_call', 15000, '310 Main St', 'Grand Junction', 'CO', '81501', 'grand_junction', '2026-02-22', 'Went with competitor', NOW() - INTERVAL '25 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Consultation Estimates (for the Pending Estimates section)
INSERT INTO consultation_estimates (id, "leadId", "customerName", address, city, state, zip, status, "totalCost", "createdAt", "updatedAt") VALUES
('demo-ce-1', 'demo-lead-8', 'Mountain West Insurance - Nguyen Claim', '3200 W 10th St', 'Greeley', 'CO', '80634', 'sent', 89000, NOW() - INTERVAL '10 days', NOW()),
('demo-ce-2', 'demo-lead-9', 'Alpine Construction - Cleveland Ave Demo', '1105 Cleveland Ave', 'Loveland', 'CO', '80537', 'draft', 52000, NOW() - INTERVAL '8 days', NOW()),
('demo-ce-3', 'demo-lead-15', 'MW Insurance - Adams Claim', '815 9th St', 'Greeley', 'CO', '80631', 'draft', NULL, NOW() - INTERVAL '5 days', NOW()),
('demo-ce-4', 'demo-lead-17', 'Western Slope Realty - Santos', '1325 N 1st St', 'Grand Junction', 'CO', '81501', 'draft', 18500, NOW() - INTERVAL '3 days', NOW()),
('demo-ce-5', 'demo-lead-6', 'Poudre School District - Building C', '2540 Laporte Ave - Building C', 'Fort Collins', 'CO', '80521', 'sent', 67000, NOW() - INTERVAL '6 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Done! Summary:
-- 8 companies
-- 19 leads across all stages (3 new, 2 contacted, 2 site_visit, 2 proposal_sent, 2 negotiation, 6 won, 2 lost)
-- 5 consultation estimates
-- Pipeline: 2 estimating, 2 scheduled, 1 invoiced, 1 paid
-- Conversion rate: 6 won / (6 won + 2 lost) = 75%
-- Open pipeline value: ~$370K
