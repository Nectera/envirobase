# CRM API Routes - Xtract Environmental

All 9 CRM API route files have been successfully created for the Xtract Environmental Next.js 14 App Router application using the Prisma-like JSON data store.

## Files Created

### 1. Companies API

**`/src/app/api/companies/route.ts`**
- `GET`: List all companies with optional search and type filter. Includes contact and leads counts.
- `POST`: Create a new company with name, type, address, city, state, zip, phone, email, website, industry, and notes.

**`/src/app/api/companies/[id]/route.ts`**
- `GET`: Retrieve a single company with contacts and leads (including estimates for leads).
- `PUT`: Update company fields.
- `DELETE`: Delete company and cascade delete related contacts.

### 2. Contacts API

**`/src/app/api/contacts/route.ts`**
- `GET`: List contacts with optional companyId and search filters. Includes company information.
- `POST`: Create a new contact linked to a company, with name, title, email, phone, mobile, and notes.

**`/src/app/api/contacts/[id]/route.ts`**
- `GET`: Retrieve single contact with company information.
- `PUT`: Update contact fields.
- `DELETE`: Delete contact.

### 3. Leads API

**`/src/app/api/leads/route.ts`**
- `GET`: List leads with optional status, projectType, and assignedTo filters. Includes company, contact, and estimates.
- `POST`: Create a new lead with automatic activity log entry "Lead created".

**`/src/app/api/leads/[id]/route.ts`**
- `GET`: Retrieve single lead with company, contact, and estimates.
- `PUT`: Update lead fields. If status changed, automatically creates activity log entry "Status changed from X to Y".
- `DELETE`: Delete lead.

### 4. Estimates API

**`/src/app/api/estimates/route.ts`**
- `GET`: List estimates with optional status and companyId filters. Includes company, lead, and contact.
- `POST`: Create a new estimate with auto-generated estimate number (EST-YYYY-###).

**`/src/app/api/estimates/[id]/route.ts`**
- `GET`: Retrieve single estimate with company, contact, and lead.
- `PUT`: Update estimate fields.
- `DELETE`: Delete estimate.

### 5. Activities API

**`/src/app/api/activities/route.ts`**
- `GET`: List activities filtered by parentType and parentId query parameters. Returns sorted newest first.
- `POST`: Create activity log entry with parentType, parentId, type, title, description, and userId.

## Key Features

✓ All routes follow Next.js 14 App Router pattern with NextRequest/NextResponse
✓ Query parameter extraction using `req.nextUrl.searchParams`
✓ Dynamic rendering enabled with `export const dynamic = "force-dynamic"`
✓ Error handling with 404 status for missing resources
✓ Automatic timestamps (createdAt, updatedAt) managed by prisma.ts
✓ Activity logging integrated for lead creation and status changes
✓ Cascading deletes (e.g., deleting company removes related contacts)
✓ Include patterns for related data (contacts with company, leads with estimates)
✓ Counting functionality (contactsCount, leadsCount on companies)
✓ Search and filter support across all resources

## Data Models Supported

- **Company**: name, type, address, city, state, zip, phone, email, website, industry, notes
- **Contact**: companyId, name, title, email, phone, mobile, notes
- **Lead**: companyId, contactId, title, description, status, projectType, assignedTo, estimatedValue, priority, dueDate, notes
- **Estimate**: companyId, leadId, contactId, title, description, amount, status, validUntil, lineItems, notes, estimateNumber (auto-generated)
- **Activity**: parentType, parentId, type, title, description, userId, createdAt

## Integration with Prisma

All routes use the `prisma` object from `/src/lib/prisma.ts` which provides:
- JSON-based data persistence via getDb/saveDb functions
- Prisma-like API with findMany, findUnique, create, update, delete methods
- Automatic ID generation using UUID
- Include patterns for related data fetching
