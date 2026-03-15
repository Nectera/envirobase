"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logger } from "@/lib/logger";
import {
  ArrowLeft,
  Plus,
  X,
  Trash2,
  Pencil,
  ChevronRight,
} from "lucide-react";

const STAGES = [
  { key: "new", label: "New", color: "bg-slate-100 text-slate-700" },
  { key: "contacted", label: "Contacted", color: "bg-blue-50 text-blue-700" },
  { key: "site_visit", label: "Site Visit", color: "bg-amber-50 text-amber-700" },
  {
    key: "proposal_sent",
    label: "Proposal Sent",
    color: "bg-purple-50 text-purple-700",
  },
  {
    key: "negotiation",
    label: "Negotiation",
    color: "bg-indigo-50 text-indigo-700",
  },
  { key: "won", label: "Won", color: "bg-emerald-50 text-emerald-700" },
  { key: "lost", label: "Lost", color: "bg-red-50 text-red-700" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

type AutomationsViewProps = {
  rules: any[];
  templates: any[];
  workers: any[];
};

export default function AutomationsView({
  rules: initialRules,
  templates: initialTemplates,
  workers,
}: AutomationsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"rules" | "templates">("rules");
  const [rules, setRules] = useState(initialRules);
  const [templates, setTemplates] = useState(initialTemplates);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const [ruleForm, setRuleForm] = useState({
    name: "",
    trigger: "new",
    taskTitle: "",
    taskDescription: "",
    taskPriority: "medium" as "low" | "medium" | "high",
    assignToField: "lead_assignee" as
      | "lead_assignee"
      | "worker_role"
      | "specific_worker"
      | "none",
    assignToValue: "",
    linkedEntity: true,
    enabled: true,
    dueDateOffsetDays: null as number | null,
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    tasks: [{ title: "", description: "", priority: "medium", dayOffset: 0 }],
  });

  const [applyForm, setApplyForm] = useState({
    startDate: new Date().toISOString().split("T")[0],
    assignedTo: "",
  });

  const getStageLabel = (key: string) => {
    return STAGES.find((s) => s.key === key)?.label || key;
  };

  const getStageColor = (key: string) => {
    return STAGES.find((s) => s.key === key)?.color || "";
  };

  const getAssignmentText = (assignToField: string, assignToValue: string | null) => {
    if (assignToField === "lead_assignee") return "Lead's Assignee";
    if (assignToField === "worker_role") return `Role: ${assignToValue}`;
    if (assignToField === "specific_worker") {
      const worker = workers.find((w) => w.id === assignToValue);
      return worker?.name || assignToValue || "Unknown";
    }
    return "Unassigned";
  };

  const openRuleModal = (rule?: any) => {
    if (rule) {
      setRuleForm({
        name: rule.name || "",
        trigger: rule.triggerValue || rule.trigger || "new",
        taskTitle: rule.taskTitle || "",
        taskDescription: rule.taskDescription || "",
        taskPriority: rule.taskPriority || "medium",
        assignToField: rule.assignToField || "lead_assignee",
        assignToValue: rule.assignToValue || "",
        linkedEntity: rule.linkedEntity ?? true,
        enabled: rule.enabled ?? true,
        dueDateOffsetDays: rule.dueDateOffsetDays ?? null,
      });
      setEditingRule(rule);
    } else {
      setRuleForm({
        name: "",
        trigger: "new",
        taskTitle: "",
        taskDescription: "",
        taskPriority: "medium",
        assignToField: "lead_assignee",
        assignToValue: "",
        linkedEntity: true,
        enabled: true,
        dueDateOffsetDays: null,
      });
      setEditingRule(null);
    }
    setRuleModalOpen(true);
  };

  const openTemplateModal = (template?: any) => {
    if (template) {
      setTemplateForm(template);
      setEditingTemplate(template);
    } else {
      setTemplateForm({
        name: "",
        description: "",
        tasks: [{ title: "", description: "", priority: "medium", dayOffset: 0 }],
      });
      setEditingTemplate(null);
    }
    setTemplateModalOpen(true);
  };

  const openApplyModal = (template: any) => {
    setSelectedTemplate(template);
    setApplyForm({
      startDate: new Date().toISOString().split("T")[0],
      assignedTo: "",
    });
    setApplyModalOpen(true);
  };

  const saveRule = async () => {
    try {
      const url = editingRule
        ? `/api/task-automation-rules/${editingRule.id}`
        : "/api/task-automation-rules";
      const method = editingRule ? "PUT" : "POST";

      // Map the form's "trigger" (which is the stage key) to the API's triggerValue
      const payload = {
        ...ruleForm,
        trigger: "lead_status_change",
        triggerValue: ruleForm.trigger,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setRuleModalOpen(false);
        router.refresh();
      }
    } catch (error) {
      logger.error("Error saving rule:", { error: String(error) });
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    try {
      await fetch(`/api/task-automation-rules/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (error) {
      logger.error("Error deleting rule:", { error: String(error) });
    }
  };

  const toggleRuleEnabled = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/task-automation-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      router.refresh();
    } catch (error) {
      logger.error("Error toggling rule:", { error: String(error) });
    }
  };

  const saveTemplate = async () => {
    try {
      const url = editingTemplate
        ? `/api/task-templates/${editingTemplate.id}`
        : "/api/task-templates";
      const method = editingTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateForm),
      });

      if (response.ok) {
        setTemplateModalOpen(false);
        router.refresh();
      }
    } catch (error) {
      logger.error("Error saving template:", { error: String(error) });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/task-templates/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (error) {
      logger.error("Error deleting template:", { error: String(error) });
    }
  };

  const applyTemplate = async () => {
    try {
      const response = await fetch(
        `/api/task-templates/${selectedTemplate.id}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: applyForm.startDate,
            assignedTo: applyForm.assignedTo || undefined,
          }),
        }
      );

      if (response.ok) {
        setApplyModalOpen(false);
        router.refresh();
      }
    } catch (error) {
      logger.error("Error applying template:", { error: String(error) });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/tasks"
            className="p-2 hover:bg-slate-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Task Automations</h1>
            <p className="text-slate-600 mt-1">
              Configure pipeline triggers, auto-assignment rules, and reusable task templates
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2 rounded-full font-medium transition ${
              activeTab === "rules"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Pipeline Rules
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 rounded-full font-medium transition ${
              activeTab === "templates"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Task Templates
          </button>
        </div>

        {activeTab === "rules" && (
          <div className="space-y-4">
            <button
              onClick={() => openRuleModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> New Rule
            </button>

            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Trigger
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Task Title
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Assign To
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Enabled
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {rule.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStageColor(
                            rule.triggerValue || rule.trigger
                          )}`}
                        >
                          {getStageLabel(rule.triggerValue || rule.trigger)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {rule.taskTitle}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {getAssignmentText(rule.assignToField, rule.assignToValue)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                            PRIORITY_COLORS[rule.taskPriority]
                          }`}
                        >
                          {rule.taskPriority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            toggleRuleEnabled(rule.id, rule.enabled)
                          }
                          className={`w-10 h-6 rounded-full transition ${
                            rule.enabled
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => openRuleModal(rule)}
                          className="p-2 hover:bg-slate-200 rounded transition"
                        >
                          <Pencil className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 hover:bg-slate-200 rounded transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="space-y-4">
            <button
              onClick={() => openTemplateModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border border-slate-200 p-4"
                >
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-3">
                    {template.description}
                  </p>
                  <div className="mb-3 flex gap-2">
                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      {template.tasks.length} tasks
                    </span>
                  </div>
                  <div className="space-y-1 mb-4">
                    {(template.tasks || []).slice(0, 3).map((task: any, idx: number) => (
                      <div
                        key={idx}
                        className="text-sm text-slate-600 flex items-start gap-2"
                      >
                        <span className="text-slate-400">•</span>
                        <span>
                          {task.title}
                          {task.dayOffset > 0 && (
                            <span className="text-slate-400">
                              {" "}
                              (+{task.dayOffset}d)
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    {(template.tasks || []).length > 3 && (
                      <div className="text-sm text-slate-400 text-center">
                        +{(template.tasks || []).length - 3} more
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openApplyModal(template)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => openTemplateModal(template)}
                      className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-sm rounded hover:bg-slate-200 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="px-3 py-2 hover:bg-slate-100 rounded transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {ruleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingRule ? "Edit Rule" : "New Rule"}
              </h2>
              <button
                onClick={() => setRuleModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Trigger Stage
                </label>
                <select
                  value={ruleForm.trigger}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, trigger: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {STAGES.map((stage) => (
                    <option key={stage.key} value={stage.key}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Task Title Template
                </label>
                <input
                  type="text"
                  value={ruleForm.taskTitle}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, taskTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Available: {"{leadName}"}, {"{companyName}"}, {"{address}"},
                  {"{phone}"}, {"{email}"}, {"{notes}"}, {"{siteVisitDate}"},
                  {"{siteVisitTime}"}, {"{siteVisitNotes}"}, {"{projectType}"},
                  {"{office}"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Task Description
                </label>
                <textarea
                  value={ruleForm.taskDescription}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      taskDescription: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Priority
                </label>
                <select
                  value={ruleForm.taskPriority}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      taskPriority: e.target.value as
                        | "low"
                        | "medium"
                        | "high",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Due Date (days after trigger)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  placeholder="e.g. 3 = due in 3 days"
                  value={ruleForm.dueDateOffsetDays ?? ""}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      dueDateOffsetDays: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Assign To
                </label>
                <select
                  value={ruleForm.assignToField}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      assignToField: e.target.value as
                        | "lead_assignee"
                        | "worker_role"
                        | "specific_worker"
                        | "none",
                      assignToValue: "",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="lead_assignee">Lead's Assignee</option>
                  <option value="worker_role">Worker by Role</option>
                  <option value="specific_worker">Specific Worker</option>
                  <option value="none">Unassigned</option>
                </select>

                {ruleForm.assignToField === "worker_role" && (
                  <input
                    type="text"
                    placeholder="e.g., Sales Manager"
                    value={ruleForm.assignToValue || ""}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        assignToValue: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-2"
                  />
                )}

                {ruleForm.assignToField === "specific_worker" && (
                  <select
                    value={ruleForm.assignToValue || ""}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        assignToValue: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-2"
                  >
                    <option value="">Select Worker</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="linkedEntity"
                  checked={ruleForm.linkedEntity}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      linkedEntity: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <label htmlFor="linkedEntity" className="text-sm font-medium text-slate-900">
                  Link to Lead
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={ruleForm.enabled}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, enabled: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-slate-900">
                  Enabled
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {editingRule && (
                <button
                  onClick={() => {
                    deleteRule(editingRule.id);
                    setRuleModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setRuleModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {templateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingTemplate ? "Edit Template" : "New Template"}
              </h2>
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Description
                </label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Tasks
                </label>
                <div className="space-y-3">
                  {templateForm.tasks.map((task, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Task title"
                          value={task.title}
                          onChange={(e) => {
                            const newTasks = [...templateForm.tasks];
                            newTasks[idx].title = e.target.value;
                            setTemplateForm({
                              ...templateForm,
                              tasks: newTasks,
                            });
                          }}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm"
                        />
                        <button
                          onClick={() => {
                            const newTasks = templateForm.tasks.filter(
                              (_, i) => i !== idx
                            );
                            setTemplateForm({
                              ...templateForm,
                              tasks: newTasks,
                            });
                          }}
                          className="p-2 hover:bg-slate-200 rounded"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      <textarea
                        placeholder="Task description"
                        value={task.description}
                        onChange={(e) => {
                          const newTasks = [...templateForm.tasks];
                          newTasks[idx].description = e.target.value;
                          setTemplateForm({
                            ...templateForm,
                            tasks: newTasks,
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <select
                          value={task.priority}
                          onChange={(e) => {
                            const newTasks = [...templateForm.tasks];
                            newTasks[idx].priority = e.target.value as
                              | "low"
                              | "medium"
                              | "high";
                            setTemplateForm({
                              ...templateForm,
                              tasks: newTasks,
                            });
                          }}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Day offset"
                          value={task.dayOffset}
                          onChange={(e) => {
                            const newTasks = [...templateForm.tasks];
                            newTasks[idx].dayOffset = parseInt(
                              e.target.value
                            );
                            setTemplateForm({
                              ...templateForm,
                              tasks: newTasks,
                            });
                          }}
                          className="w-20 px-3 py-2 border border-slate-200 rounded text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setTemplateForm({
                      ...templateForm,
                      tasks: [
                        ...templateForm.tasks,
                        { title: "", description: "", priority: "medium", dayOffset: 0 },
                      ],
                    });
                  }}
                  className="mt-2 px-3 py-2 bg-slate-100 text-slate-700 text-sm rounded hover:bg-slate-200 transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {editingTemplate && (
                <button
                  onClick={() => {
                    deleteTemplate(editingTemplate.id);
                    setTemplateModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {applyModalOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Apply Template</h2>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 mb-4">
              {selectedTemplate.name} - {selectedTemplate.tasks.length} tasks
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={applyForm.startDate}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Assignee (optional)
                </label>
                <select
                  value={applyForm.assignedTo}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, assignedTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">No assignment</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setApplyModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={applyTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
