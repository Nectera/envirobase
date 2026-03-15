const fs = require('fs');
const crypto = require('crypto');
const db = JSON.parse(fs.readFileSync('db/data.json', 'utf8'));

// Add a Project Coordinator worker
const coordId = crypto.randomUUID();
db.workers.push({
  id: coordId,
  name: 'Sarah Mitchell',
  email: 'sarah@xtractenv.com',
  phone: '970-555-0192',
  role: 'OFFICE',
  position: 'Project Coordinator',
  status: 'active',
  hireDate: '2024-03-15',
  payRate: 28,
  emergencyContact: 'Tom Mitchell',
  emergencyPhone: '970-555-0193',
  address: '820 Laporte Ave, Fort Collins, CO',
  notes: '',
  certifications: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Update existing permits with startDate/endDate
const docs = db.documents || [];
const permits = docs.filter(d => d.docType === 'state_permit');
permits.forEach(doc => {
  const proj = db.projects.find(p => p.id === doc.projectId);
  if (proj) {
    doc.startDate = proj.startDate || '2026-01-15';
    // Make older in-progress projects have expired permits to demo the overdue feature
    if (proj.status === 'in_progress' && proj.startDate && proj.startDate < '2026-02-01') {
      doc.endDate = '2026-02-28'; // expired
    } else {
      doc.endDate = proj.estEndDate || '2026-04-30';
    }
  }
});

fs.writeFileSync('db/data.json', JSON.stringify(db, null, 2));
console.log('Added Project Coordinator:', coordId);
console.log('Updated', permits.length, 'permits with start/end dates');
permits.forEach(d => console.log('  ', d.title, ':', d.startDate, '->', d.endDate));
