"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Download, Upload, ArrowLeft, Building2, Users, Target,
  FileText, Receipt, Activity, AlertTriangle, CheckCircle,
  Loader2, Database, ArrowRight, X, ChevronDown, Shuffle,
  BookOpen, Plus, Search, Edit2, Trash2, Tag, Brain,
  DollarSign, ArrowUpRight, ArrowDownRight, Minus, FileUp,
} from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

const DATA_TYPES = [
  { key: "companies", labelKey: "dataManagement.companies", icon: Building2, color: "bg-blue-100 text-blue-700" },
  { key: "contacts", labelKey: "dataManagement.contacts", icon: Users, color: "bg-green-100 text-green-700" },
  { key: "leads", labelKey: "dataManagement.leads", icon: Target, color: "bg-amber-100 text-amber-700" },
  { key: "estimates", labelKey: "dataManagement.estimates", icon: FileText, color: "bg-violet-100 text-violet-700" },
  { key: "invoices", labelKey: "dataManagement.invoices", icon: Receipt, color: "bg-rose-100 text-rose-700" },
  { key: "activities", labelKey: "dataManagement.activities", icon: Activity, color: "bg-slate-100 text-slate-700" },
] as const;

const KB_CATEGORIES = [
  { key: "training_manual", labelKey: "knowledgeBase.category.training_manual", color: "bg-blue-100 text-blue-700" },
  { key: "employee_handbook", labelKey: "knowledgeBase.category.employee_handbook", color: "bg-indigo-100 text-indigo-700" },
  { key: "safety_procedures", labelKey: "knowledgeBase.category.safety_procedures", color: "bg-red-100 text-red-700" },
  { key: "tips", labelKey: "knowledgeBase.category.tips", color: "bg-emerald-100 text-emerald-700" },
  { key: "regulations", labelKey: "knowledgeBase.category.regulations", color: "bg-amber-100 text-amber-700" },
  { key: "general", labelKey: "knowledgeBase.category.general", color: "bg-slate-100 text-slate-700" },
  { key: "material_invoice", labelKey: "knowledgeBase.category.material_invoice", color: "bg-orange-100 text-orange-700" },
] as const;

// Xtract target fields per data type
const XTRACT_FIELDS: Record<string, { key: string; label: string; required?: boolean }[]> = {
  companies: [
    { key: "name", label: "Company Name", required: true },
    { key: "type", label: "Type" },
    { key: "address", label: "Street Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "Zip Code" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "website", label: "Website" },
    { key: "notes", label: "Notes" },
  ],
  contacts: [
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
    { key: "title", label: "Job Title" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Street Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "Zip Code" },
    { key: "companyName", label: "Company Name" },
    { key: "notes", label: "Notes" },
  ],
  leads: [
    { key: "title", label: "Lead Title", required: true },
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "Postal Code" },
    { key: "status", label: "Status" },
    { key: "estimatedValue", label: "Estimated Value" },
    { key: "source", label: "Source" },
    { key: "companyName", label: "Company Name" },
    { key: "projectType", label: "Project Type" },
    { key: "description", label: "Description" },
    { key: "notes", label: "Project Notes" },
    { key: "locationNotes", label: "Location Notes" },
    { key: "insuranceCarrier", label: "Insurance Carrier" },
    { key: "adjusterName", label: "Adjuster Name" },
    { key: "adjusterPhone", label: "Adjuster Phone" },
    { key: "adjusterEmail", label: "Adjuster Email" },
    { key: "claimNumber", label: "Claim #" },
    { key: "dateOfLoss", label: "Date of Loss" },
    { key: "siteVisitDate", label: "Site Visit Date" },
    { key: "siteVisitTime", label: "Site Visit Time" },
    { key: "siteVisitNotes", label: "Site Visit Notes" },
    { key: "office", label: "Office" },
    { key: "referralSource", label: "Referral Source" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "isInsuranceJob", label: "Insurance Job (Y/N)" },
  ],
  estimates: [
    { key: "estimateNumber", label: "Estimate Number", required: true },
    { key: "status", label: "Status" },
    { key: "total", label: "Total Amount" },
    { key: "companyName", label: "Company" },
    { key: "notes", label: "Notes" },
  ],
  invoices: [
    { key: "invoiceNumber", label: "Invoice Number", required: true },
    { key: "status", label: "Status" },
    { key: "total", label: "Total Amount" },
    { key: "companyName", label: "Company" },
    { key: "notes", label: "Notes" },
  ],
  activities: [
    { key: "type", label: "Activity Type", required: true },
    { key: "title", label: "Title", required: true },
    { key: "description", label: "Description" },
    { key: "date", label: "Date" },
    { key: "notes", label: "Notes" },
  ],
};

interface PreviewData {
  headers: string[];
  sampleRows: Record<string, any>[];
  totalRows: number;
  fileName: string;
}

interface KBArticle {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  counts: Record<string, number>;
  initialArticles?: KBArticle[];
}

export default function DataManagementView({ counts, initialArticles = [] }: Props) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";

  // Tab state
  const [activeTab, setActiveTab] = useState<"import-export" | "knowledge-base">("import-export");

  // Import/Export state
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState("companies");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importResult, setImportResult] = useState<{ success?: boolean; message: string; details?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStep, setImportStep] = useState<"select" | "mapping" | "importing">("select");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Knowledge Base state
  const [articles, setArticles] = useState<KBArticle[]>(initialArticles);
  const [kbSearch, setKbSearch] = useState("");
  const [kbCategoryFilter, setKbCategoryFilter] = useState<string>("all");
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [articleForm, setArticleForm] = useState({ title: "", category: "general", tags: "", content: "" });
  const [articleSaving, setArticleSaving] = useState(false);
  const [articleError, setArticleError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Invoice upload state
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<{
    id: string;
    vendor: string | null;
    invoiceDate: string | null;
    invoiceNumber: string | null;
    itemCount: number;
    priceUpdates: { name: string; currentPrice: number; invoicePrice: number; confidence: string }[];
    appliedCount: number;
  } | null>(null);
  const [invoiceError, setInvoiceError] = useState("");

  // ── Import/Export handlers ──

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: string, format?: string) => {
    const fmt = format || exportFormat;
    const exportKey = `${type}-${fmt}`;
    setExporting(exportKey);
    try {
      const res = await fetch(`/api/data/export?type=${type}&format=${fmt}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const ext = fmt === "xlsx" ? "xlsx" : fmt === "json" ? "json" : "csv";
      const dateStr = new Date().toISOString().split("T")[0];
      triggerDownload(blob, `${type === "all" ? "crm_export_all" : `${type}_export`}_${dateStr}.${ext}`);
    } catch {
      alert(t("dataManagement.exportFailed"));
    } finally {
      setExporting(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/data/import/preview", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ success: false, message: data.error || "Failed to read file" });
        setPreviewLoading(false);
        return;
      }
      setPreviewData(data);
      setUploadedFile(file);
      const targetFieldsList = XTRACT_FIELDS[importType] || [];
      const autoMapping: Record<string, string> = {};
      for (const header of data.headers) {
        const headerLower = header.toLowerCase().replace(/[_\s]+/g, "").replace(/[^a-z0-9]/g, "");
        let bestMatch = "__skip__";
        for (const tf of targetFieldsList) {
          const tfLower = tf.key.toLowerCase().replace(/[_\s]+/g, "");
          const tfLabelLower = tf.label.toLowerCase().replace(/[_\s]+/g, "").replace(/[^a-z0-9]/g, "");
          if (headerLower === tfLower || headerLower === tfLabelLower) { bestMatch = tf.key; break; }
          if (headerLower.includes(tfLower) || tfLower.includes(headerLower)) bestMatch = tf.key;
        }
        autoMapping[header] = bestMatch;
      }
      setFieldMapping(autoMapping);
      setImportStep("mapping");
    } catch {
      setImportResult({ success: false, message: "Failed to read file. Please check the format and try again." });
    } finally {
      setPreviewLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImportWithMapping = async () => {
    if (!uploadedFile) return;
    if (importMode === "replace") {
      const dataTypeLabel = t(DATA_TYPES.find(dt => dt.key === importType)?.labelKey || "dataManagement.companies").toLowerCase();
      if (!confirm(`${t("dataManagement.importConfirm")} ${dataTypeLabel} ${t("dataManagement.importConfirmEnd")}`)) return;
    }
    setImportStep("importing");
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("type", importType);
      formData.append("mode", importMode);
      formData.append("fieldMapping", JSON.stringify(fieldMapping));
      const res = await fetch("/api/data/import", { method: "POST", body: formData });
      let data: any;
      try {
        data = await res.json();
      } catch {
        setImportResult({ success: false, message: `Server returned status ${res.status} with non-JSON response` });
        setImportStep("mapping");
        return;
      }
      if (!res.ok) {
        setImportResult({ success: false, message: data.error || `Import failed (${res.status})`, details: data.details });
        setImportStep("mapping");
      } else {
        const skippedMsg = data.skipped > 0 ? ` (${data.skipped} ${t("dataManagement.rowsSkipped")})` : "";
        const errorMsg = data.errors?.length > 0 ? `. Errors: ${data.errors[0]}` : "";
        if (data.imported === 0 && data.errors?.length > 0) {
          setImportResult({ success: false, message: `Import failed — 0 rows imported${errorMsg}`, details: data.errors });
          setImportStep("mapping");
        } else {
          setImportResult({ success: true, message: `${t("dataManagement.successImport")} ${data.imported} ${t(DATA_TYPES.find(dt => dt.key === importType)?.labelKey || "dataManagement.companies")} (${data.mode} mode)${skippedMsg}${errorMsg}` });
          setTimeout(() => window.location.reload(), 2000);
        }
      }
    } catch (err: any) {
      setImportResult({ success: false, message: err?.message || "Import failed. Please check your file and try again." });
      setImportStep("mapping");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportStep("select");
    setPreviewData(null);
    setFieldMapping({});
    setUploadedFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const targetFields = XTRACT_FIELDS[importType] || [];
  const requiredFields = targetFields.filter((f) => f.required);
  const mappedRequiredFields = requiredFields.filter((f) => Object.values(fieldMapping).includes(f.key));
  const allRequiredMapped = mappedRequiredFields.length === requiredFields.length;
  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  // ── Knowledge Base handlers ──

  const filteredArticles = articles.filter((a) => {
    if (kbCategoryFilter !== "all" && a.category !== kbCategoryFilter) return false;
    if (kbSearch) {
      const q = kbSearch.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingArticle(null);
    setArticleForm({ title: "", category: "general", tags: "", content: "" });
    setArticleError("");
    setShowArticleModal(true);
  };

  const openEditModal = (article: KBArticle) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      category: article.category,
      tags: (article.tags || []).join(", "),
      content: article.content,
    });
    setArticleError("");
    setShowArticleModal(true);
  };

  const handleSaveArticle = async () => {
    if (!articleForm.title.trim() || !articleForm.content.trim()) {
      setArticleError(t("knowledgeBase.requiredError"));
      return;
    }
    setArticleSaving(true);
    setArticleError("");
    const tags = articleForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingArticle) {
        const res = await fetch(`/api/knowledge-base/${editingArticle.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: articleForm.title, category: articleForm.category, tags, content: articleForm.content }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const res = await fetch("/api/knowledge-base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: articleForm.title, category: articleForm.category, tags, content: articleForm.content }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        setArticles((prev) => [created, ...prev]);
      }
      setShowArticleModal(false);
    } catch {
      setArticleError(editingArticle ? t("knowledgeBase.updateError") : t("knowledgeBase.createError"));
    } finally {
      setArticleSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm(t("knowledgeBase.confirmDelete"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert(t("knowledgeBase.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryInfo = (key: string) => KB_CATEGORIES.find((c) => c.key === key) || KB_CATEGORIES[5];

  // ── Invoice upload handler ──
  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInvoiceUploading(true);
    setInvoiceError("");
    setInvoiceResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("autoApply", "false"); // Don't auto-apply — show results first
      const res = await fetch("/api/knowledge-base/upload-invoice", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json();
        setInvoiceError(data.error || "Upload failed");
        return;
      }
      const data = await res.json();
      setInvoiceResult(data);
      // Refresh articles list
      const articlesRes = await fetch("/api/knowledge-base");
      if (articlesRes.ok) {
        const arts = await articlesRes.json();
        setArticles(arts);
      }
    } catch {
      setInvoiceError(t("dataManagement.exportFailed"));
    } finally {
      setInvoiceUploading(false);
      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    }
  };

  const handleApplyPriceUpdates = async (updates: { name: string; invoicePrice: number }[]) => {
    try {
      // Load current prices
      const settingsRes = await fetch("/api/settings");
      const settings = settingsRes.ok ? await settingsRes.json() : {};
      let materialPrices: { name: string; price: number }[] = [];
      try { materialPrices = JSON.parse(settings.materialPrices || "[]"); } catch {}

      // Apply updates
      for (const u of updates) {
        const idx = materialPrices.findIndex((p) => p.name === u.name);
        if (idx >= 0) {
          materialPrices[idx].price = u.invoicePrice;
        } else {
          materialPrices.push({ name: u.name, price: u.invoicePrice });
        }
      }

      // Save
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialPrices: JSON.stringify(materialPrices) }),
      });

      setInvoiceResult((prev) => prev ? { ...prev, appliedCount: updates.length } : null);
    } catch {
      setInvoiceError("Failed to apply price updates");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("dataManagement.title")}</h1>
          <p className="text-sm text-slate-500">{t("dataManagement.subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("import-export")}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "import-export"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Database size={16} />
          {t("dataManagement.tabs.importExport")}
        </button>
        <button
          onClick={() => setActiveTab("knowledge-base")}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "knowledge-base"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Brain size={16} />
          {t("dataManagement.tabs.knowledgeBase")}
          {articles.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">
              {articles.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════ IMPORT / EXPORT TAB ═══════════════ */}
      {activeTab === "import-export" && (
        <>
          {/* Overview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <Database className="w-4.5 h-4.5 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{t("dataManagement.crmDatabaseTitle")}</h3>
                <p className="text-xs text-slate-500">{totalRecords} {t("dataManagement.totalRecords")} {DATA_TYPES.length} tables</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {DATA_TYPES.map((dt) => {
                const Icon = dt.icon;
                return (
                  <div key={dt.key} className="text-center p-3 bg-slate-50 rounded-xl">
                    <Icon size={18} className="mx-auto text-slate-400 mb-1" />
                    <p className="text-lg font-bold text-slate-900">{counts[dt.key] || 0}</p>
                    <p className="text-[11px] text-slate-500">{t(dt.labelKey)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <Download className="w-4.5 h-4.5 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{t("dataManagement.exportDataTitle")}</h3>
                <p className="text-xs text-slate-500">{t("dataManagement.downloadYourData")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
                <div className="flex bg-slate-100 rounded-full p-0.5 mr-2">
                  <button onClick={() => setExportFormat("csv")} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${exportFormat === "csv" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>CSV</button>
                  <button onClick={() => setExportFormat("xlsx")} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${exportFormat === "xlsx" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Excel</button>
                </div>
                <button onClick={() => handleExport("all")} disabled={!!exporting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700 disabled:opacity-50">
                  {exporting === `all-${exportFormat}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {t("dataManagement.exportAll")} ({exportFormat === "xlsx" ? t("dataManagement.excel") : t("dataManagement.csv")})
                </button>
                <button onClick={() => handleExport("all", "json")} disabled={!!exporting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 disabled:opacity-50">
                  {exporting === "all-json" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {t("dataManagement.exportAll")} ({t("dataManagement.json")})
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {DATA_TYPES.map((dt) => {
                  const Icon = dt.icon;
                  const count = counts[dt.key] || 0;
                  const isExporting = exporting === `${dt.key}-${exportFormat}`;
                  return (
                    <button key={dt.key} onClick={() => handleExport(dt.key)} disabled={!!exporting || count === 0} className="flex items-center gap-3 px-3 py-2.5 text-sm text-left border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dt.color}`}>
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon size={15} />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{t(dt.labelKey)}</p>
                        <p className="text-[11px] text-slate-400">{count} {t("dataManagement.records")} • {exportFormat === "xlsx" ? ".xlsx" : ".csv"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Upload className="w-4.5 h-4.5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{t("dataManagement.importDataTitle")}</h3>
                  <p className="text-xs text-slate-500">
                    {importStep === "select" && t("dataManagement.uploadCsv")}
                    {importStep === "mapping" && `${t("dataManagement.mappingFieldsFor")} ${previewData?.fileName}`}
                    {importStep === "importing" && t("dataManagement.importingData")}
                  </p>
                </div>
              </div>
              {importStep !== "select" && (
                <button onClick={resetImport} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                  <X className="w-3 h-3" /> {t("dataManagement.startOver")}
                </button>
              )}
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-5">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${importStep === "select" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">1</span>
                {t("dataManagement.step1Upload")}
              </div>
              <ArrowRight className="w-3 h-3 text-slate-300" />
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${importStep === "mapping" ? "bg-amber-100 text-amber-800" : importStep === "importing" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">2</span>
                {t("dataManagement.step2Map")}
              </div>
              <ArrowRight className="w-3 h-3 text-slate-300" />
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${importStep === "importing" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"}`}>
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">3</span>
                {t("dataManagement.step3Import")}
              </div>
            </div>

            {/* Step 1: File Selection */}
            {importStep === "select" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("dataManagement.dataType")}</label>
                    <select value={importType} onChange={(e) => setImportType(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                      {DATA_TYPES.map((dt) => (<option key={dt.key} value={dt.key}>{t(dt.labelKey)}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t("dataManagement.importMode")}</label>
                    <select value={importMode} onChange={(e) => setImportMode(e.target.value as "append" | "replace")} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                       <option value="append">{t("dataManagement.appendMode")}</option>
                       <option value="replace">{t("dataManagement.replaceMode")}</option>
                    </select>
                  </div>
                </div>
                {importMode === "replace" && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700"><strong>{t("common.warning")}:</strong> {t("dataManagement.replaceWarning")} {t(DATA_TYPES.find(dt => dt.key === importType)?.labelKey || "dataManagement.companies")} {t("dataManagement.replaceModeText")}</p>
                  </div>
                )}
                <div>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} disabled={previewLoading} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors ${previewLoading ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {previewLoading ? (<><Loader2 className="w-4 h-4 animate-spin" />{t("dataManagement.readingFile")}</>) : (<><Upload className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{t("dataManagement.clickToSelect")}</span></>)}
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Field Mapping */}
            {importStep === "mapping" && previewData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{previewData.fileName}</span>
                    <span className="text-xs text-slate-400">• {previewData.totalRows} {t("dataManagement.rows")} • {previewData.headers.length} {t("dataManagement.columns")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shuffle className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{Object.values(fieldMapping).filter((v) => v !== "__skip__").length} {t("dataManagement.of")} {previewData.headers.length} {t("dataManagement.mapped")}</span>
                  </div>
                </div>
                {!allRequiredMapped && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700"><strong>{t("dataManagement.missingRequiredFields")}</strong> {requiredFields.filter((f) => !Object.values(fieldMapping).includes(f.key)).map((f) => f.label).join(", ")}. {t("dataManagement.mapTheseFields")}</p>
                  </div>
                )}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr,auto,1fr] bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("dataManagement.sourceColumn")}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-8 text-center">&rarr;</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("dataManagement.xtractField")}</p>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                    {previewData.headers.map((header) => {
                      const currentMapping = fieldMapping[header] || "__skip__";
                      const sampleValue = previewData.sampleRows[0]?.[header] || "";
                      const mappedTarget = targetFields.find((f) => f.key === currentMapping);
                      const isRequired = mappedTarget?.required;
                      return (
                        <div key={header} className="grid grid-cols-[1fr,auto,1fr] items-center px-4 py-2.5 hover:bg-slate-50/50">
                          <div>
                            <p className="text-sm font-medium text-slate-800 truncate">{header}</p>
                            {sampleValue && <p className="text-[11px] text-slate-400 truncate mt-0.5" title={String(sampleValue)}>e.g. {String(sampleValue).substring(0, 50)}</p>}
                          </div>
                          <div className="w-8 flex justify-center">
                            <ArrowRight className={`w-3.5 h-3.5 ${currentMapping === "__skip__" ? "text-slate-200" : "text-green-500"}`} />
                          </div>
                          <div className="relative">
                            <select value={currentMapping} onChange={(e) => setFieldMapping((prev) => ({ ...prev, [header]: e.target.value }))} className={`w-full px-3 py-1.5 pr-8 text-sm border rounded-lg appearance-none cursor-pointer transition-colors ${currentMapping === "__skip__" ? "border-slate-200 text-slate-400 bg-white" : isRequired ? "border-green-300 text-green-800 bg-green-50" : "border-green-200 text-slate-700 bg-green-50/50"} focus:outline-none focus:ring-2 focus:ring-green-500`}>
                              <option value="__skip__">{t("dataManagement.skipColumn")}</option>
                              {targetFields.map((tf) => (<option key={tf.key} value={tf.key}>{tf.label}{tf.required ? " *" : ""}</option>))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {previewData.sampleRows.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{t("dataManagement.dataPreview")} {previewData.sampleRows.length} {t("dataManagement.rows")})</p>
                    <div className="border border-slate-200 rounded-xl overflow-auto max-h-48">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-50 border-b border-slate-200">{previewData.headers.slice(0, 8).map((h) => (<th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>))}{previewData.headers.length > 8 && <th className="px-3 py-2 text-left font-semibold text-slate-400">+{previewData.headers.length - 8} more</th>}</tr></thead>
                        <tbody>{previewData.sampleRows.map((row, i) => (<tr key={i} className="border-b border-slate-100 last:border-0">{previewData.headers.slice(0, 8).map((h) => (<td key={h} className="px-3 py-1.5 text-slate-600 whitespace-nowrap max-w-[200px] truncate">{String(row[h] || "").substring(0, 60)}</td>))}{previewData.headers.length > 8 && <td className="px-3 py-1.5 text-slate-300">...</td>}</tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={handleImportWithMapping} disabled={!allRequiredMapped || importing} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {t("dataManagement.importRecords")} {previewData.totalRows} {t(DATA_TYPES.find(dt => dt.key === importType)?.labelKey || "dataManagement.companies")}
                  </button>
                  <button onClick={resetImport} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">{t("common.cancel")}</button>
                  {importMode === "replace" && <span className="text-xs text-red-500 font-medium">{t("dataManagement.replaceModeWarning")}</span>}
                </div>
              </div>
            )}

            {importResult && (
              <div className={`mt-4 flex items-start gap-2 p-3 rounded-xl border ${importResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                {importResult.success ? <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />}
                <div>
                  <p className={`text-sm font-medium ${importResult.success ? "text-green-800" : "text-red-800"}`}>{importResult.message}</p>
                  {importResult.details && (<ul className="mt-1 text-xs text-red-600 space-y-0.5">{importResult.details.map((d, i) => (<li key={i}>{d}</li>))}</ul>)}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════ AI KNOWLEDGE BASE TAB ═══════════════ */}
      {activeTab === "knowledge-base" && (
        <>
          {/* Search, filters & actions */}
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder={t("knowledgeBase.searchPlaceholder")}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                />
              </div>
              {isAdmin && (
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-full transition-colors flex-shrink-0"
                  style={{ backgroundColor: "#7BC143" }}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">{t("knowledgeBase.addArticle")}</span>
                   <span className="sm:hidden">{t("common.addShort")}</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setKbCategoryFilter("all")}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  kbCategoryFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t("knowledgeBase.allCategories")}
              </button>
              {KB_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setKbCategoryFilter(cat.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    kbCategoryFilter === cat.key ? "bg-slate-900 text-white" : `${cat.color} hover:opacity-80`
                  }`}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Material Invoice Upload ─── */}
          {isAdmin && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4 text-orange-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">{t("dataManagement.materialInvoiceUploadTitle")}</h3>
                    <p className="text-[11px] text-slate-400 hidden sm:block">{t("dataManagement.materialInvoiceDesc")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <input
                    ref={invoiceInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleInvoiceUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => invoiceInputRef.current?.click()}
                    disabled={invoiceUploading}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 rounded-full transition-colors"
                  >
                    {invoiceUploading ? (
                       <><Loader2 size={14} className="animate-spin" /> {t("dataManagement.parsing")}</>
                    ) : (
                       <><FileUp size={14} /> {t("dataManagement.uploadInvoiceButton")}</>
                    )}
                  </button>
                </div>
              </div>

              {invoiceError && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} /> {invoiceError}
                </div>
              )}

              {/* Parsed results */}
              {invoiceResult && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span className="text-slate-700">
                      <strong>{invoiceResult.vendor || "Invoice"}</strong>
                      {invoiceResult.invoiceNumber && ` #${invoiceResult.invoiceNumber}`}
                      {invoiceResult.invoiceDate && ` — ${invoiceResult.invoiceDate}`}
                      {" · "}
                      {invoiceResult.itemCount} {t("dataManagement.itemsExtracted")}
                    </span>
                  </div>

                  {invoiceResult.priceUpdates.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {t("dataManagement.priceChangesDetected")} ({invoiceResult.priceUpdates.length})
                      </div>
                      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">{t("dataManagement.material")}</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">{t("dataManagement.current")}</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">{t("dataManagement.invoice")}</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">{t("dataManagement.change")}</th>
                              <th className="text-center px-4 py-2 text-xs font-medium text-slate-500">{t("dataManagement.match")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {invoiceResult.priceUpdates.map((u, i) => {
                              const diff = u.invoicePrice - u.currentPrice;
                              const pct = u.currentPrice > 0 ? Math.round((diff / u.currentPrice) * 100) : 0;
                              return (
                                <tr key={i} className="hover:bg-white">
                                  <td className="px-4 py-2 font-medium text-slate-800">{u.name}</td>
                                  <td className="px-4 py-2 text-right text-slate-500">${u.currentPrice.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-right font-medium text-slate-900">${u.invoicePrice.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-right">
                                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? "text-red-600" : diff < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                                      {diff > 0 ? <ArrowUpRight size={12} /> : diff < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                                      {diff !== 0 ? `${diff > 0 ? "+" : ""}${pct}%` : "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      u.confidence === "high" ? "bg-emerald-100 text-emerald-700"
                                        : u.confidence === "medium" ? "bg-amber-100 text-amber-700"
                                        : "bg-red-100 text-red-700"
                                    }`}>
                                      {u.confidence}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {invoiceResult.appliedCount > 0 ? (
                        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          <CheckCircle size={14} />
                          {invoiceResult.appliedCount} {t("dataManagement.priceUpdated")}
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            onClick={() => handleApplyPriceUpdates(
                              invoiceResult.priceUpdates.filter((u) => u.confidence !== "low")
                            )}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#7BC143] hover:bg-[#6aad38] rounded-full transition-colors"
                          >
                            <DollarSign size={14} />
                             {t("dataManagement.applyUpdates")} {invoiceResult.priceUpdates.filter((u) => u.confidence !== "low").length} {t("dataManagement.priceUpdatesCount")}
                          </button>
                           <span className="text-xs text-slate-500">{t("dataManagement.lowConfidenceExcluded")}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                      {t("dataManagement.noPriceChanges")} {t("dataManagement.allInvoices")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Articles list */}
          {filteredArticles.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <BookOpen className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{kbSearch || kbCategoryFilter !== "all" ? t("knowledgeBase.noResults") : t("knowledgeBase.noArticles")}</p>
              {isAdmin && !kbSearch && kbCategoryFilter === "all" && (
                <button onClick={openCreateModal} className="mt-3 text-sm font-medium text-green-600 hover:text-green-700">
                  {t("knowledgeBase.addFirstArticle")}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => {
                const catInfo = getCategoryInfo(article.category);
                return (
                  <div key={article.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${catInfo.color}`}>
                            {t(catInfo.labelKey)}
                          </span>
                          {(article.tags || []).slice(0, 3).map((tag: string) => (
                            <span key={tag} className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-slate-500 bg-slate-100 rounded-full">
                              <Tag size={9} />
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1">{article.title}</h4>
                        <p className="text-sm text-slate-600 line-clamp-2">{article.content}</p>
                        <p className="text-[11px] text-slate-400 mt-2">
                          {article.createdBy && `${article.createdBy} • `}
                          {new Date(article.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {article.updatedAt !== article.createdAt && ` • Updated ${new Date(article.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditModal(article)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t("common.edit")}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(article.id)}
                            disabled={deletingId === article.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title={t("common.delete")}
                          >
                            {deletingId === article.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ ARTICLE MODAL ═══════════════ */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowArticleModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingArticle ? t("knowledgeBase.editArticle") : t("knowledgeBase.addArticle")}
              </h3>
              <button onClick={() => setShowArticleModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("knowledgeBase.articleTitle")} *</label>
                <input
                  type="text"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Asbestos Safety Training Procedures"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("knowledgeBase.category.label")} *</label>
                <select
                  value={articleForm.category}
                  onChange={(e) => setArticleForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {KB_CATEGORIES.map((cat) => (
                       <option key={cat.key} value={cat.key}>{t(cat.labelKey)}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("knowledgeBase.tags")}</label>
                <input
                  type="text"
                  value={articleForm.tags}
                  onChange={(e) => setArticleForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. safety, asbestos, training"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">{t("knowledgeBase.tagsHint")}</p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("knowledgeBase.content")} *</label>
                <textarea
                  value={articleForm.content}
                  onChange={(e) => setArticleForm((f) => ({ ...f, content: e.target.value }))}
                  rows={10}
                  placeholder="Enter the full article content here. This content will be available to all employees through the AI assistant..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
                />
              </div>

              {articleError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-xs text-red-700">{articleError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200">
              <button
                onClick={() => setShowArticleModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                {t("knowledgeBase.cancel")}
              </button>
              <button
                onClick={handleSaveArticle}
                disabled={articleSaving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-full transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#7BC143" }}
              >
                {articleSaving && <Loader2 size={14} className="animate-spin" />}
                {editingArticle ? t("knowledgeBase.save") : t("knowledgeBase.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
