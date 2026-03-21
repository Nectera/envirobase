import { prisma } from "@/lib/prisma";
import { calculateWorkerScores } from "@/lib/schedule-scoring";

// Admin-only tools — only available to ADMIN and SUPERVISOR roles
export const ADMIN_ONLY_TOOLS = new Set([
  "swap_schedule_entries",
  "create_schedule_entry",
  "delete_schedule_entry",
  "reassign_schedule_entry",
  "update_lead",
  "update_contact",
  "update_company",
  "update_worker",
  "update_project",
  "delete_lead",
  "delete_task",
]);

// Tool definitions for Claude function calling
export const toolDefinitions = [
  // ── READ TOOLS ──
  {
    name: "get_projects",
    description: "List projects. Optionally filter by status or type.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "Filter by status: planning, in_progress, completed, on_hold" },
        type: { type: "string", description: "Filter by type: ASBESTOS, LEAD, METH, MOLD, SELECT_DEMO, REBUILD" },
      },
    },
  },
  {
    name: "get_project_details",
    description: "Get detailed info for a single project including tasks and assigned workers.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string", description: "Project ID" } },
      required: ["id"],
    },
  },
  {
    name: "get_leads",
    description: "List leads. Optionally filter by status, office, project type, or search by name. Use the 'search' parameter to find leads by first/last name.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "Filter: new, contacted, site_visit, proposal_sent, negotiation, won, lost" },
        office: { type: "string", description: "Filter: greeley, grand_junction" },
        projectType: { type: "string", description: "Filter: ASBESTOS, LEAD, METH, MOLD, SELECT_DEMO, REBUILD" },
        search: { type: "string", description: "Search leads by name (first or last name). Use this when looking for a specific person." },
      },
    },
  },
  {
    name: "get_lead_details",
    description: "Get full details for a single lead including company, contact, estimates, and activities.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string", description: "Lead ID" } },
      required: ["id"],
    },
  },
  {
    name: "get_workers",
    description: "List all team members with their roles, certifications, and status.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_tasks",
    description: "List tasks. Optionally filter by status, assignee, or linked entity.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "Filter: to_do, in_progress, completed" },
        assignedTo: { type: "string", description: "Worker ID" },
        linkedEntityType: { type: "string", description: "lead, project, or estimate" },
      },
    },
  },
  {
    name: "get_schedule",
    description: "Get schedule entries. Optionally filter by date range or worker.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
        workerId: { type: "string", description: "Worker ID" },
      },
    },
  },
  {
    name: "get_alerts",
    description: "Get active (undismissed) alerts.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_companies",
    description: "List all companies in the CRM.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_invoices",
    description: "List invoices. Optionally filter by status.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "Filter: draft, sent, paid, overdue, void" },
      },
    },
  },
  {
    name: "get_metrics",
    description: "Get business metrics for a given year (financial, leads, etc).",
    input_schema: {
      type: "object" as const,
      properties: {
        year: { type: "number", description: "Year to fetch metrics for (defaults to current year)" },
      },
    },
  },
  {
    name: "get_time_entries",
    description: "Get recent time clock entries. Optionally filter by worker or date.",
    input_schema: {
      type: "object" as const,
      properties: {
        workerId: { type: "string", description: "Worker ID" },
        date: { type: "string", description: "Date (YYYY-MM-DD)" },
      },
    },
  },

  // ── WRITE TOOLS (all users) ──
  {
    name: "create_lead",
    description: "Create a new lead in the CRM.",
    input_schema: {
      type: "object" as const,
      properties: {
        firstName: { type: "string", description: "Lead's first name" },
        lastName: { type: "string", description: "Lead's last name" },
        phone: { type: "string", description: "Phone number" },
        email: { type: "string", description: "Email address" },
        address: { type: "string", description: "Property address" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State (default CO)" },
        office: { type: "string", description: "Office: greeley or grand_junction" },
        projectType: { type: "string", description: "ASBESTOS, LEAD, METH, MOLD, SELECT_DEMO, or REBUILD" },
        source: { type: "string", description: "Lead source: referral, website, cold_call, repeat_client, insurance, property_manager, realtor, other" },
        referralSource: { type: "string", description: "Who referred them" },
        estimatedValue: { type: "number", description: "Estimated dollar value" },
        notes: { type: "string", description: "Any notes" },
        companyId: { type: "string", description: "Company ID (optional)" },
      },
      required: ["firstName", "lastName", "projectType", "office"],
    },
  },
  {
    name: "create_task",
    description: "Create a new task, optionally linked to a lead or project.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        priority: { type: "string", description: "low, medium, or high" },
        dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
        assignedTo: { type: "string", description: "Worker ID to assign to" },
        linkedEntityType: { type: "string", description: "lead, project, or estimate" },
        linkedEntityId: { type: "string", description: "ID of the linked entity" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_lead_status",
    description: "Update a lead's status (e.g., move to contacted, won, lost).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Lead ID" },
        status: { type: "string", description: "New status: new, contacted, site_visit, proposal_sent, negotiation, won, lost" },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "update_task_status",
    description: "Update a task's status.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Task ID" },
        status: { type: "string", description: "New status: to_do, in_progress, completed" },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "update_project_status",
    description: "Update a project's status.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Project ID" },
        status: { type: "string", description: "New status: planning, in_progress, completed, on_hold" },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "create_activity",
    description: "Log an activity (note, call, email, site_visit) on a lead or contact.",
    input_schema: {
      type: "object" as const,
      properties: {
        parentType: { type: "string", description: "lead, company, or contact" },
        parentId: { type: "string", description: "ID of the lead/company/contact" },
        type: { type: "string", description: "note, call, email, or site_visit" },
        description: { type: "string", description: "Activity description" },
      },
      required: ["parentType", "parentId", "type", "description"],
    },
  },

  // ── SCHEDULING TOOLS ──
  {
    name: "suggest_optimal_schedule",
    description: "Suggest the best workers to assign to a project based on proximity (employee home address vs project location), availability (not already scheduled), certifications, and crew size needed. Provide a project ID and date range. Returns ranked worker recommendations with distances and drive times.",
    input_schema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "Project ID to schedule for" },
        startDate: { type: "string", description: "Start date for the assignment (YYYY-MM-DD)" },
        endDate: { type: "string", description: "End date for the assignment (YYYY-MM-DD). If omitted, uses project's estimatedDays from the start date." },
        crewSize: { type: "number", description: "Number of workers needed. If omitted, uses the estimate's crewSize or defaults to the project's worker count." },
      },
      required: ["projectId", "startDate"],
    },
  },

  // ── ADMIN-ONLY MUTATION TOOLS ──
  {
    name: "swap_schedule_entries",
    description: "Swap two workers' schedule assignments for a date range. Finds all schedule entries for Worker A and Worker B in the given range, then swaps their assignments. Perfect for requests like 'switch Brenda and Sarah on the schedule this week'.",
    input_schema: {
      type: "object" as const,
      properties: {
        workerAId: { type: "string", description: "First worker's ID" },
        workerBId: { type: "string", description: "Second worker's ID" },
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
      },
      required: ["workerAId", "workerBId", "startDate", "endDate"],
    },
  },
  {
    name: "create_schedule_entry",
    description: "Create a new schedule entry assigning a worker to a project for one or more dates.",
    input_schema: {
      type: "object" as const,
      properties: {
        workerId: { type: "string", description: "Worker ID" },
        projectId: { type: "string", description: "Project ID" },
        dates: {
          type: "array",
          items: { type: "string" },
          description: "Array of dates (YYYY-MM-DD) to schedule the worker",
        },
        shift: { type: "string", description: "Shift: day, night, or swing (default: day)" },
        hours: { type: "number", description: "Hours per day (default: 8)" },
        notes: { type: "string", description: "Optional notes" },
      },
      required: ["workerId", "projectId", "dates"],
    },
  },
  {
    name: "delete_schedule_entry",
    description: "Delete a schedule entry by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Schedule entry ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "reassign_schedule_entry",
    description: "Reassign a schedule entry from one worker to another. Changes the worker on an existing schedule entry without deleting/recreating it.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Schedule entry ID to reassign" },
        newWorkerId: { type: "string", description: "New worker ID to assign" },
      },
      required: ["id", "newWorkerId"],
    },
  },
  {
    name: "update_lead",
    description: "Edit any fields on a lead record (name, phone, email, address, notes, estimatedValue, projectType, office, source, etc).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Lead ID" },
        firstName: { type: "string", description: "First name" },
        lastName: { type: "string", description: "Last name" },
        phone: { type: "string", description: "Phone number" },
        email: { type: "string", description: "Email address" },
        address: { type: "string", description: "Property address" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State" },
        office: { type: "string", description: "Office: greeley or grand_junction" },
        projectType: { type: "string", description: "ASBESTOS, LEAD, METH, MOLD, SELECT_DEMO, or REBUILD" },
        source: { type: "string", description: "Lead source" },
        referralSource: { type: "string", description: "Referral source" },
        estimatedValue: { type: "number", description: "Estimated value" },
        notes: { type: "string", description: "Notes" },
        priority: { type: "string", description: "Priority: low, medium, or high" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_contact",
    description: "Edit contact fields (name, phone, email, title, etc).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Contact ID" },
        firstName: { type: "string", description: "First name" },
        lastName: { type: "string", description: "Last name" },
        phone: { type: "string", description: "Phone" },
        email: { type: "string", description: "Email" },
        title: { type: "string", description: "Job title" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_company",
    description: "Edit company fields (name, phone, email, address, type, etc).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Company ID" },
        name: { type: "string", description: "Company name" },
        phone: { type: "string", description: "Phone" },
        email: { type: "string", description: "Email" },
        address: { type: "string", description: "Address" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State" },
        type: { type: "string", description: "Company type" },
        website: { type: "string", description: "Website" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_worker",
    description: "Edit worker info (phone, email, position, status, homeCity, etc).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Worker ID" },
        phone: { type: "string", description: "Phone" },
        email: { type: "string", description: "Email" },
        position: { type: "string", description: "Position/title" },
        status: { type: "string", description: "Status: active, inactive, on_leave" },
        homeCity: { type: "string", description: "Home city for scheduling proximity" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_project",
    description: "Edit project fields (name, address, client, priority, dates, notes, status, etc).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Project ID" },
        name: { type: "string", description: "Project name" },
        address: { type: "string", description: "Address" },
        city: { type: "string", description: "City" },
        client: { type: "string", description: "Client name" },
        priority: { type: "string", description: "Priority: low, medium, high, urgent" },
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
        notes: { type: "string", description: "Notes" },
        status: { type: "string", description: "Status: planning, in_progress, completed, on_hold" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_lead",
    description: "Permanently delete a lead from the CRM.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Lead ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a task.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Task ID to delete" },
      },
      required: ["id"],
    },
  },

  // ── MEMORY TOOLS ──
  {
    name: "save_memory",
    description: "Save an important fact, user preference, or workflow detail to remember for future conversations. Use this proactively when the user shares preferences, important context, or recurring patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        content: { type: "string", description: "The fact or preference to remember" },
        category: { type: "string", description: "Category: preference, fact, workflow, person" },
      },
      required: ["content", "category"],
    },
  },
  {
    name: "recall_memories",
    description: "Search stored memories by keyword to recall previously saved facts and preferences.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Keyword to search memories for" },
      },
      required: ["query"],
    },
  },
];

// Tool execution functions
export async function executeTool(name: string, input: any, role?: string): Promise<string> {
  try {
    // Role guard — reject admin-only tools for non-admin/supervisor users
    if (ADMIN_ONLY_TOOLS.has(name)) {
      const allowed = role === "ADMIN" || role === "PROJECT_MANAGER" || role === "SUPERVISOR";
      if (!allowed) {
        return JSON.stringify({ error: "Permission denied. This action requires admin or supervisor privileges." });
      }
    }

    switch (name) {
      // ── READ ──
      case "get_projects": {
        const where: any = {};
        if (input.status) where.status = input.status;
        if (input.type) where.type = input.type;
        const projects = await prisma.project.findMany({ where });
        return JSON.stringify(projects.map((p: any) => ({
          id: p.id, name: p.name, type: p.type, status: p.status,
          client: p.client, address: p.address, projectNumber: p.projectNumber,
          startDate: p.startDate, priority: p.priority,
        })));
      }
      case "get_project_details": {
        const project = await prisma.project.findUnique({ where: { id: input.id }, include: { tasks: true, workers: true } });
        if (!project) return JSON.stringify({ error: "Project not found" });
        return JSON.stringify(project);
      }
      case "get_leads": {
        const where: any = {};
        if (input.status) where.status = input.status;
        if (input.projectType) where.projectType = input.projectType;
        if (input.search) {
          const terms = input.search.trim().split(/\s+/);
          where.OR = terms.map((term: string) => ({
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
            ],
          }));
        }
        const leads = await prisma.lead.findMany({
          where,
          include: { company: true },
          take: input.search ? 20 : 100,
          orderBy: { createdAt: "desc" },
        });
        let filtered = leads;
        if (input.office) filtered = filtered.filter((l: any) => l.office === input.office);
        return JSON.stringify(filtered.map((l: any) => ({
          id: l.id, name: `${l.firstName} ${l.lastName}`, status: l.status,
          projectType: l.projectType, office: l.office, estimatedValue: l.estimatedValue,
          company: l.company?.name, source: l.source, referralSource: l.referralSource,
          address: l.address, city: l.city, phone: l.phone, email: l.email,
          createdAt: l.createdAt,
        })));
      }
      case "get_lead_details": {
        const lead = await prisma.lead.findUnique({ where: { id: input.id }, include: { company: true, contact: true, estimates: true } });
        if (!lead) return JSON.stringify({ error: "Lead not found" });
        const activities = await prisma.activity.findMany({ where: { parentType: "lead", parentId: input.id } });
        return JSON.stringify({ ...lead, activities });
      }
      case "get_workers": {
        const workers = await prisma.worker.findMany({ include: { certifications: true } });
        return JSON.stringify(workers.map((w: any) => ({
          id: w.id, name: w.name, role: w.role, position: w.position,
          status: w.status, phone: w.phone, email: w.email, types: w.types,
          certCount: w.certifications?.length || 0,
        })));
      }
      case "get_tasks": {
        const where: any = {};
        if (input.status) where.status = input.status;
        if (input.assignedTo) where.assignedTo = input.assignedTo;
        if (input.linkedEntityType) where.linkedEntityType = input.linkedEntityType;
        const tasks = await prisma.task.findMany({ where });
        return JSON.stringify(tasks);
      }
      case "get_schedule": {
        const entries = await prisma.scheduleEntry.findMany();
        let filtered = entries;
        if (input.workerId) filtered = filtered.filter((e: any) => e.workerId === input.workerId);
        if (input.startDate) filtered = filtered.filter((e: any) => e.date >= input.startDate);
        if (input.endDate) filtered = filtered.filter((e: any) => e.date <= input.endDate);
        return JSON.stringify(filtered);
      }
      case "get_alerts": {
        const alerts = await prisma.alert.findMany({ where: { dismissed: false } });
        return JSON.stringify(alerts);
      }
      case "get_companies": {
        const companies = await prisma.company.findMany();
        return JSON.stringify(companies.map((c: any) => ({
          id: c.id, name: c.name, type: c.type, city: c.city, phone: c.phone,
        })));
      }
      case "get_invoices": {
        const where: any = {};
        if (input.status) where.status = input.status;
        const invoices = await prisma.invoice.findMany({ where });
        return JSON.stringify(invoices.map((i: any) => ({
          id: i.id, invoiceNumber: i.invoiceNumber, customerName: i.customerName,
          status: i.status, total: i.total, issueDate: i.issueDate, dueDate: i.dueDate,
        })));
      }
      case "get_metrics": {
        const year = input.year || new Date().getFullYear();
        const metrics = await prisma.metric.findMany({ where: { year } });
        return JSON.stringify(metrics);
      }
      case "get_time_entries": {
        const entries = await prisma.timeEntry.findMany();
        let filtered = entries;
        if (input.workerId) filtered = filtered.filter((e: any) => e.workerId === input.workerId);
        if (input.date) filtered = filtered.filter((e: any) => e.date === input.date);
        return JSON.stringify(filtered.slice(-50));
      }

      // ── WRITE (all users) ──
      case "create_lead": {
        const lead = await prisma.lead.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone || null,
            email: input.email || null,
            address: input.address || null,
            city: input.city || null,
            state: input.state || "CO",
            office: input.office || "greeley",
            projectType: input.projectType,
            source: input.source || "other",
            referralSource: input.referralSource || null,
            estimatedValue: input.estimatedValue || 0,
            notes: input.notes || "",
            companyId: input.companyId || "",
            status: "new",
            title: `${input.firstName} ${input.lastName} - ${input.projectType}`,
            description: input.notes || "",
            isInsuranceJob: false,
            assignedTo: "",
            priority: "medium",
          },
        });
        return JSON.stringify({ success: true, lead: { id: lead.id, name: `${lead.firstName} ${lead.lastName}` } });
      }
      case "create_task": {
        const task = await prisma.task.create({
          data: {
            title: input.title,
            description: input.description || "",
            status: "to_do",
            priority: input.priority || "medium",
            dueDate: input.dueDate || null,
            assignedTo: input.assignedTo || null,
            linkedEntityType: input.linkedEntityType || null,
            linkedEntityId: input.linkedEntityId || null,
            createdBy: "assistant",
          },
        });
        return JSON.stringify({ success: true, task: { id: task.id, title: task.title } });
      }
      case "update_lead_status": {
        const updateData: any = { status: input.status };
        if (input.status === "won") updateData.wonDate = new Date().toISOString().split("T")[0];
        if (input.status === "lost") updateData.lostDate = new Date().toISOString().split("T")[0];
        const lead = await prisma.lead.update({ where: { id: input.id }, data: updateData });
        return JSON.stringify({ success: true, lead: { id: lead.id, status: lead.status } });
      }
      case "update_task_status": {
        const taskData: any = { status: input.status };
        if (input.status === "completed") taskData.completedAt = new Date().toISOString();
        const task = await prisma.task.update({ where: { id: input.id }, data: taskData });
        return JSON.stringify({ success: true, task: { id: task.id, status: task.status } });
      }
      case "update_project_status": {
        const project = await prisma.project.update({ where: { id: input.id }, data: { status: input.status } });
        return JSON.stringify({ success: true, project: { id: project.id, status: project.status } });
      }
      case "create_activity": {
        const activity = await prisma.activity.create({
          data: {
            parentType: input.parentType,
            parentId: input.parentId,
            type: input.type,
            content: input.description,
            user: "assistant",
          },
        });
        return JSON.stringify({ success: true, activity: { id: activity.id } });
      }

      // ── SCHEDULING ──
      case "suggest_optimal_schedule": {
        const result = await calculateWorkerScores(
          input.projectId,
          input.startDate,
          input.endDate,
          input.crewSize
        );
        return JSON.stringify(result);
      }

      // ── ADMIN-ONLY MUTATIONS ──
      case "swap_schedule_entries": {
        const entries = await prisma.scheduleEntry.findMany();
        const inRange = entries.filter((e: any) =>
          e.date >= input.startDate && e.date <= input.endDate
        );
        const workerAEntries = inRange.filter((e: any) => e.workerId === input.workerAId);
        const workerBEntries = inRange.filter((e: any) => e.workerId === input.workerBId);

        if (workerAEntries.length === 0 && workerBEntries.length === 0) {
          return JSON.stringify({ error: "Neither worker has schedule entries in the given date range." });
        }

        let swapped = 0;
        for (const entry of workerAEntries) {
          await prisma.scheduleEntry.update({
            where: { id: entry.id },
            data: { workerId: input.workerBId },
          });
          swapped++;
        }
        for (const entry of workerBEntries) {
          await prisma.scheduleEntry.update({
            where: { id: entry.id },
            data: { workerId: input.workerAId },
          });
          swapped++;
        }

        return JSON.stringify({
          success: true,
          swapped,
          details: {
            workerAToB: workerAEntries.length,
            workerBToA: workerBEntries.length,
            dateRange: `${input.startDate} to ${input.endDate}`,
          },
        });
      }

      case "create_schedule_entry": {
        const created: any[] = [];
        const dates = input.dates || [];
        for (const date of dates) {
          const entry = await prisma.scheduleEntry.create({
            data: {
              workerId: input.workerId,
              projectId: input.projectId,
              date,
              shift: input.shift || "day",
              hours: input.hours || 8,
              notes: input.notes || "",
            },
          });
          created.push({ id: entry.id, date });
        }
        return JSON.stringify({ success: true, created, count: created.length });
      }

      case "delete_schedule_entry": {
        await prisma.scheduleEntry.delete({ where: { id: input.id } });
        return JSON.stringify({ success: true, deleted: input.id });
      }

      case "reassign_schedule_entry": {
        const entry = await prisma.scheduleEntry.update({
          where: { id: input.id },
          data: { workerId: input.newWorkerId },
        });
        return JSON.stringify({ success: true, entry: { id: entry.id, workerId: entry.workerId, date: (entry as any).date } });
      }

      case "update_lead": {
        const { id, ...fields } = input;
        const updatedLead = await prisma.lead.update({ where: { id }, data: fields });
        return JSON.stringify({ success: true, lead: { id: updatedLead.id, name: `${(updatedLead as any).firstName} ${(updatedLead as any).lastName}` } });
      }

      case "update_contact": {
        const { id: contactId, ...contactFields } = input;
        const updatedContact = await prisma.contact.update({ where: { id: contactId }, data: contactFields });
        return JSON.stringify({ success: true, contact: { id: updatedContact.id, name: `${(updatedContact as any).firstName} ${(updatedContact as any).lastName}` } });
      }

      case "update_company": {
        const { id: companyId, ...companyFields } = input;
        const updatedCompany = await prisma.company.update({ where: { id: companyId }, data: companyFields });
        return JSON.stringify({ success: true, company: { id: updatedCompany.id, name: (updatedCompany as any).name } });
      }

      case "update_worker": {
        const { id: workerId, ...workerFields } = input;
        const updatedWorker = await prisma.worker.update({ where: { id: workerId }, data: workerFields });
        return JSON.stringify({ success: true, worker: { id: updatedWorker.id, name: (updatedWorker as any).name } });
      }

      case "update_project": {
        const { id: projectId, ...projectFields } = input;
        const updatedProject = await prisma.project.update({ where: { id: projectId }, data: projectFields });
        return JSON.stringify({ success: true, project: { id: updatedProject.id, name: (updatedProject as any).name } });
      }

      case "delete_lead": {
        await prisma.lead.delete({ where: { id: input.id } });
        return JSON.stringify({ success: true, deleted: input.id });
      }

      case "delete_task": {
        await prisma.task.delete({ where: { id: input.id } });
        return JSON.stringify({ success: true, deleted: input.id });
      }

      // ── MEMORY ──
      case "save_memory": {
        const memory = await prisma.assistantMemory.create({
          data: { content: input.content, category: input.category },
        });
        return JSON.stringify({ success: true, memory: { id: memory.id, content: memory.content } });
      }
      case "recall_memories": {
        const allMemories = await prisma.assistantMemory.findMany();
        const query = input.query.toLowerCase();
        const matches = allMemories.filter((m: any) => m.content.toLowerCase().includes(query));
        return JSON.stringify(matches);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || "Tool execution failed" });
  }
}
