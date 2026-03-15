# Xtract Environmental CRM API

Complete REST API implementation for the Xtract Environmental CRM module using Next.js 14 App Router.

## Quick Start

All 9 API route files have been created and are ready to use. The API integrates with the existing Prisma-like JSON data store at `/src/lib/prisma.ts`.

### File Locations

```
src/app/api/
├── companies/
│   ├── route.ts                    # List & Create companies
│   └── [id]/route.ts               # Get, Update, Delete company
├── contacts/
│   ├── route.ts                    # List & Create contacts
│   └── [id]/route.ts               # Get, Update, Delete contact
├── leads/
│   ├── route.ts                    # List & Create leads (with activity logging)
│   └── [id]/route.ts               # Get, Update (with auto-activity), Delete lead
├── estimates/
│   ├── route.ts                    # List & Create estimates (with auto-numbering)
│   └── [id]/route.ts               # Get, Update, Delete estimate
└── activities/
    └── route.ts                    # List & Create activity logs
```

## API Endpoints Summary

### Companies (10 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List all companies |
| POST | `/api/companies` | Create company |
| GET | `/api/companies/{id}` | Get company details |
| PUT | `/api/companies/{id}` | Update company |
| DELETE | `/api/companies/{id}` | Delete company |

**Query Parameters:** `search`, `type`
**Response Includes:** `contactsCount`, `leadsCount`

### Contacts (10 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List all contacts |
| POST | `/api/contacts` | Create contact |
| GET | `/api/contacts/{id}` | Get contact details |
| PUT | `/api/contacts/{id}` | Update contact |
| DELETE | `/api/contacts/{id}` | Delete contact |

**Query Parameters:** `companyId`, `search`
**Response Includes:** `company` object

### Leads (10 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List all leads |
| POST | `/api/leads` | Create lead (auto-logs) |
| GET | `/api/leads/{id}` | Get lead details |
| PUT | `/api/leads/{id}` | Update lead (auto-logs status changes) |
| DELETE | `/api/leads/{id}` | Delete lead |

**Query Parameters:** `status`, `projectType`, `assignedTo`
**Response Includes:** `company`, `contact`, `estimates[]`
**Auto-Activity Logging:**
- Lead creation → `type: "lead_created"`
- Status change → `type: "status_changed"`

### Estimates (10 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/estimates` | List all estimates |
| POST | `/api/estimates` | Create estimate (auto-numbered) |
| GET | `/api/estimates/{id}` | Get estimate details |
| PUT | `/api/estimates/{id}` | Update estimate |
| DELETE | `/api/estimates/{id}` | Delete estimate |

**Query Parameters:** `status`, `companyId`
**Response Includes:** `company`, `contact`, `lead`
**Auto-numbering:** EST-YYYY-### format

### Activities (2 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activities` | List activities (by parent) |
| POST | `/api/activities` | Create activity log entry |

**Query Parameters:** `parentType`, `parentId`
**Returns:** Activities sorted newest first

## Usage Examples

### Create a Company
```bash
POST /api/companies
Content-Type: application/json

{
  "name": "Acme Corp",
  "type": "client",
  "address": "123 Main St",
  "city": "Boston",
  "state": "MA",
  "zip": "02101",
  "phone": "617-555-0100",
  "email": "info@acmecorp.com",
  "website": "acmecorp.com",
  "industry": "Manufacturing",
  "notes": "Key client"
}
```

### Create a Contact
```bash
POST /api/contacts
Content-Type: application/json

{
  "companyId": "company-uuid",
  "name": "John Smith",
  "title": "VP of Operations",
  "email": "john@acmecorp.com",
  "phone": "617-555-0101",
  "mobile": "617-555-0102"
}
```

### Create a Lead (Auto-Creates Activity)
```bash
POST /api/leads
Content-Type: application/json

{
  "companyId": "company-uuid",
  "contactId": "contact-uuid",
  "title": "Site Remediation Project",
  "description": "Full property remediation needed",
  "status": "new",
  "projectType": "abatement",
  "assignedTo": "user-uuid",
  "estimatedValue": 50000,
  "priority": "high",
  "dueDate": "2024-03-15",
  "userId": "user-uuid"
}
```
Automatically creates activity log entry:
```json
{
  "type": "lead_created",
  "description": "Lead \"Site Remediation Project\" was created"
}
```

### Update Lead Status (Auto-Creates Activity)
```bash
PUT /api/leads/{id}
Content-Type: application/json

{
  "status": "qualified",
  "userId": "user-uuid"
}
```
Automatically creates activity log entry:
```json
{
  "type": "status_changed",
  "description": "Status changed from \"new\" to \"qualified\""
}
```

### Create Estimate (Auto-Numbered)
```bash
POST /api/estimates
Content-Type: application/json

{
  "companyId": "company-uuid",
  "leadId": "lead-uuid",
  "title": "Abatement Services",
  "amount": 45000,
  "status": "draft",
  "lineItems": [
    { "description": "Labor", "quantity": 40, "unitPrice": 150 },
    { "description": "Materials", "quantity": 1, "unitPrice": 5000 }
  ]
}
```
Returns estimate with auto-generated `estimateNumber: "EST-2026-001"`

### List Activities for a Lead
```bash
GET /api/activities?parentType=lead&parentId={lead-uuid}
```

## Key Features

✓ **Complete CRUD Operations** - All resources support Create, Read, Update, Delete
✓ **Smart Filtering** - Query parameters for searching and filtering
✓ **Related Data** - Automatic inclusion of related objects
✓ **Activity Logging** - Automatic logging for lead operations
✓ **Auto-numbering** - Estimate numbers auto-generated
✓ **Error Handling** - Proper 404 responses for missing resources
✓ **Timestamps** - Automatic createdAt/updatedAt management
✓ **Cascading Deletes** - Deleting company removes related contacts
✓ **Partial Updates** - PUT requests support partial data updates
✓ **TypeScript** - Full type safety with Next.js

## Integration with Prisma

The API uses the Prisma-like JSON data store at `/src/lib/prisma.ts`:

```typescript
import { prisma } from "@/lib/prisma";

// All operations automatically persist to JSON
const company = await prisma.company.create({ data: {...} });
const companies = await prisma.company.findMany({ where: {...}, include: {...} });
const updated = await prisma.company.update({ where: {...}, data: {...} });
await prisma.company.delete({ where: {...} });
```

## Response Codes

- **200 OK** - Successful GET or PUT request
- **201 Created** - Successful POST request
- **404 Not Found** - Resource does not exist
- **400 Bad Request** - Invalid request data (return in error responses)

## Data Models

### Company
```typescript
{
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  industry: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  contacts?: Contact[];
  leads?: Lead[];
}
```

### Contact
```typescript
{
  id: string;
  companyId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
}
```

### Lead
```typescript
{
  id: string;
  companyId: string;
  contactId?: string;
  title: string;
  description: string;
  status: string;
  projectType: string;
  assignedTo: string;
  estimatedValue: number;
  priority: string;
  dueDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  contact?: Contact;
  estimates?: Estimate[];
}
```

### Estimate
```typescript
{
  id: string;
  estimateNumber: string;
  companyId: string;
  leadId?: string;
  contactId?: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  validUntil?: string;
  lineItems: any[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  contact?: Contact;
  lead?: Lead;
}
```

### Activity
```typescript
{
  id: string;
  parentType: string;
  parentId: string;
  type: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
}
```

## Testing the API

### Using curl

```bash
# List companies
curl http://localhost:3000/api/companies

# Create company
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Corp","type":"client"}'

# Get company
curl http://localhost:3000/api/companies/{id}

# Update company
curl -X PUT http://localhost:3000/api/companies/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Delete company
curl -X DELETE http://localhost:3000/api/companies/{id}
```

### Using Postman or Insomnia

1. Import the endpoints from the API documentation
2. Set up environment variables for IDs
3. Create test sequences for complete workflows
4. Verify activity logs are created automatically

## Documentation Files

- **API_STRUCTURE.txt** - Visual overview of the API structure
- **API_USAGE_EXAMPLES.md** - Detailed usage examples for each endpoint
- **IMPLEMENTATION_SUMMARY.md** - Technical implementation details
- **CRM_API_ROUTES_SUMMARY.md** - Summary of all 9 route files

## Code Examples Location

All route files are in `/src/app/api/` with consistent patterns:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Extract query params
  // Call prisma methods
  // Return JSON response
}

export async function POST(req: NextRequest) {
  // Parse request body
  // Create new item
  // Return with 201 status
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // Parse request body
  // Update item
  // Return updated item
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // Delete item
  // Return success response
}
```

## Next Steps

1. Test all endpoints using curl or Postman
2. Verify activity logging with lead operations
3. Integrate with frontend components
4. Add authentication/authorization as needed
5. Implement pagination if needed
6. Add advanced filtering features

## Support

All route implementations follow Next.js 14 App Router best practices and are fully compatible with the existing Prisma JSON store. See the implementation summary for technical details.
