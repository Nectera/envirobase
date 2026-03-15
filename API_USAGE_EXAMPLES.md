# CRM API Usage Examples

## Companies

### List Companies
```bash
GET /api/companies
GET /api/companies?search=acme
GET /api/companies?type=client
GET /api/companies?search=acme&type=client
```

Response includes: `contactsCount`, `leadsCount`

### Create Company
```bash
POST /api/companies
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

### Get Company
```bash
GET /api/companies/{id}
```

Returns company with full contacts array and leads array (including estimates).

### Update Company
```bash
PUT /api/companies/{id}
{
  "name": "Acme Corp Updated",
  "type": "prospect"
}
```

### Delete Company
```bash
DELETE /api/companies/{id}
```

Cascades: Deletes all related contacts.

---

## Contacts

### List Contacts
```bash
GET /api/contacts
GET /api/contacts?companyId={id}
GET /api/contacts?search=john
GET /api/contacts?companyId={id}&search=john
```

### Create Contact
```bash
POST /api/contacts
{
  "companyId": "uuid",
  "name": "John Smith",
  "title": "VP of Operations",
  "email": "john@acmecorp.com",
  "phone": "617-555-0101",
  "mobile": "617-555-0102",
  "notes": "Primary contact"
}
```

### Get Contact
```bash
GET /api/contacts/{id}
```

Returns contact with company details.

### Update Contact
```bash
PUT /api/contacts/{id}
{
  "title": "SVP of Operations",
  "phone": "617-555-0103"
}
```

### Delete Contact
```bash
DELETE /api/contacts/{id}
```

---

## Leads

### List Leads
```bash
GET /api/leads
GET /api/leads?status=new
GET /api/leads?status=qualified
GET /api/leads?projectType=abatement
GET /api/leads?assignedTo=user-id
GET /api/leads?status=new&projectType=abatement&assignedTo=user-id
```

### Create Lead (Auto-creates Activity Log)
```bash
POST /api/leads
{
  "companyId": "uuid",
  "contactId": "uuid",
  "title": "Lead Title",
  "description": "Project description",
  "status": "new",
  "projectType": "abatement",
  "assignedTo": "user-id",
  "estimatedValue": 50000,
  "priority": "high",
  "dueDate": "2024-03-15",
  "notes": "Initial notes",
  "userId": "user-id"
}
```

Automatically creates activity: `{ type: "lead_created", description: "Lead \"...\" was created" }`

### Get Lead
```bash
GET /api/leads/{id}
```

Returns lead with company, contact, and estimates.

### Update Lead (Auto-logs Status Changes)
```bash
PUT /api/leads/{id}
{
  "status": "qualified",
  "priority": "urgent",
  "userId": "user-id"
}
```

If status changes, automatically creates activity: `{ type: "status_changed", description: "Status changed from \"new\" to \"qualified\"" }`

### Delete Lead
```bash
DELETE /api/leads/{id}
```

---

## Estimates

### List Estimates
```bash
GET /api/estimates
GET /api/estimates?status=draft
GET /api/estimates?status=approved
GET /api/estimates?companyId={id}
GET /api/estimates?status=approved&companyId={id}
```

### Create Estimate (Auto-numbered)
```bash
POST /api/estimates
{
  "companyId": "uuid",
  "leadId": "uuid",
  "contactId": "uuid",
  "title": "Site Remediation Estimate",
  "description": "Full project scope",
  "amount": 45000,
  "status": "draft",
  "validUntil": "2024-03-15",
  "lineItems": [
    { "description": "Abatement labor", "quantity": 40, "unitPrice": 150 },
    { "description": "Materials", "quantity": 1, "unitPrice": 5000 }
  ],
  "notes": "Pending client review"
}
```

Generates estimate number: `EST-2026-001`

### Get Estimate
```bash
GET /api/estimates/{id}
```

Returns estimate with company, contact, and lead details.

### Update Estimate
```bash
PUT /api/estimates/{id}
{
  "status": "approved",
  "amount": 46000
}
```

### Delete Estimate
```bash
DELETE /api/estimates/{id}
```

---

## Activities

### List Activities for Parent
```bash
GET /api/activities?parentType=lead&parentId={lead-id}
GET /api/activities?parentType=company&parentId={company-id}
```

Returns activities sorted newest first.

### Create Activity Log Entry
```bash
POST /api/activities
{
  "parentType": "lead",
  "parentId": "uuid",
  "type": "note",
  "title": "Client Feedback",
  "description": "Client wants timeline adjusted",
  "userId": "user-id"
}
```

### Activity Types
- `lead_created` - Created when new lead is created
- `status_changed` - Created when lead status changes
- `note` - Manual note added
- (extensible - add more as needed)

---

## Response Codes

- **200 OK** - Successful GET/PUT
- **201 Created** - Successful POST
- **404 Not Found** - Resource not found
- **400 Bad Request** - Invalid request data

---

## Data Models

### Company
```typescript
{
  id: string;
  name: string;
  type: string; // "client", "prospect", etc
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
  contactsCount?: number;
  leadsCount?: number;
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
  status: string; // "new", "qualified", "proposal", "won", "lost"
  projectType: string; // "abatement", "remediation", etc
  assignedTo: string;
  estimatedValue: number;
  priority: string; // "low", "medium", "high"
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
  estimateNumber: string; // Auto-generated: EST-YYYY-###
  companyId: string;
  leadId?: string;
  contactId?: string;
  title: string;
  description: string;
  amount: number;
  status: string; // "draft", "sent", "approved", "rejected"
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
  parentType: string; // "lead", "company", "contact", "estimate"
  parentId: string;
  type: string; // "lead_created", "status_changed", "note"
  title: string;
  description: string;
  userId: string;
  createdAt: string;
}
```
