"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle, AlertCircle, Send, Eye, EyeOff } from "lucide-react";

interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpSecure: boolean;
  configured: boolean;
}

export default function SmtpSettings() {
  const [config, setConfig] = useState<SmtpConfig>({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFromName: "",
    smtpFromEmail: "",
    smtpSecure: false,
    configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch("/api/settings/email")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load email settings");
        return r.json();
      })
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setConfig((prev) => ({ ...prev, configured: data.configured }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const updateField = (field: keyof SmtpConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setTestResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-500">
        <Loader2 className="animate-spin" size={16} />
        Loading email settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Email / SMTP Configuration</h3>
        <p className="text-sm text-slate-500">
          Configure your organization&apos;s email server for sending notifications, password resets, and welcome emails.
          Emails will be sent from your own domain.
        </p>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        {config.configured ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle size={12} /> SMTP Configured
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle size={12} /> Not Configured
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SMTP Server Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
          <input
            type="text"
            value={config.smtpHost}
            onChange={(e) => updateField("smtpHost", e.target.value)}
            placeholder="smtp.gmail.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-400">e.g., smtp.gmail.com, smtp.office365.com</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
          <input
            type="number"
            value={config.smtpPort}
            onChange={(e) => updateField("smtpPort", parseInt(e.target.value) || 587)}
            placeholder="587"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-400">587 for STARTTLS, 465 for SSL</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Username</label>
          <input
            type="text"
            value={config.smtpUser}
            onChange={(e) => updateField("smtpUser", e.target.value)}
            placeholder="your-email@company.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={config.smtpPassword}
              onChange={(e) => updateField("smtpPassword", e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">For Gmail, use an App Password</p>
        </div>
      </div>

      {/* SSL toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.smtpSecure}
            onChange={(e) => updateField("smtpSecure", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
        <div>
          <span className="text-sm font-medium text-slate-700">Use SSL (port 465)</span>
          <p className="text-xs text-slate-400">Enable for SSL connections. Leave off for STARTTLS (port 587).</p>
        </div>
      </div>

      {/* From details */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Sender Identity</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
            <input
              type="text"
              value={config.smtpFromName}
              onChange={(e) => updateField("smtpFromName", e.target.value)}
              placeholder="Your Company Name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-400">Display name recipients will see</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Email</label>
            <input
              type="email"
              value={config.smtpFromEmail}
              onChange={(e) => updateField("smtpFromEmail", e.target.value)}
              placeholder="noreply@company.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-400">Defaults to SMTP username if left blank</p>
          </div>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`p-3 rounded-lg text-sm border ${testResult.success ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {testResult.success ? (
            <span className="flex items-center gap-2"><CheckCircle size={14} /> SMTP connection successful!</span>
          ) : (
            <span className="flex items-center gap-2"><AlertCircle size={14} /> Connection failed: {testResult.error}</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Settings"}
        </button>

        <button
          onClick={handleTest}
          disabled={testing || !config.smtpHost || !config.smtpUser}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors border border-slate-300"
        >
          {testing ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
          {testing ? "Testing..." : "Test Connection"}
        </button>

        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
            <CheckCircle size={14} /> Saved!
          </span>
        )}
      </div>
    </div>
  );
}
