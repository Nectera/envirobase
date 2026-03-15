"use client";

import { useState, useEffect, useRef } from "react";
import {
  Package,
  Plus,
  Camera,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  Link2,
  Copy,
  Check,
  Lock,
  Image as ImageIcon,
} from "lucide-react";

interface Photo {
  id: string;
  url: string;
  fileName?: string;
  fileSize?: number;
  order: number;
}

interface InventoryItem {
  id: string;
  brand: string | null;
  model: string | null;
  description: string;
  location: string | null;
  status: string;
  customerNote: string | null;
  addedByName: string;
  createdAt: string;
  photos: Photo[];
}

interface ReviewInfo {
  id: string;
  token: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  sentAt: string | null;
  completedAt: string | null;
}

export default function ContentInventoryTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<ReviewInfo | null>(null);

  // Add item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<Array<{ url: string; fileName: string; fileSize: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded item
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCustomerName, setShareCustomerName] = useState("");
  const [shareCustomerEmail, setShareCustomerEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchReview();
  }, [projectId]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/inventory`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReview = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/inventory/review`);
      if (res.ok) {
        const data = await res.json();
        setReview(data);
      }
    } catch (err) {
      console.error("Failed to fetch review:", err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/projects/${projectId}/inventory/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setPendingPhotos((prev) => [...prev, { url: data.url, fileName: data.fileName, fileSize: data.fileSize }]);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddItem = async () => {
    if (!description.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand.trim() || null,
          model: model.trim() || null,
          description: description.trim(),
          location: location.trim() || null,
          photoUrls: pendingPhotos,
        }),
      });

      if (res.ok) {
        setBrand("");
        setModel("");
        setDescription("");
        setLocation("");
        setPendingPhotos([]);
        setShowAddForm(false);
        fetchItems();
      }
    } catch (err) {
      console.error("Failed to add item:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this inventory item?")) return;
    try {
      await fetch(`/api/projects/${projectId}/inventory/${itemId}`, { method: "DELETE" });
      fetchItems();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleAddPhotoToItem = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemId", itemId);

      try {
        await fetch(`/api/projects/${projectId}/inventory/upload`, {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    fetchItems();
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/inventory/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: shareCustomerName.trim() || null,
          customerEmail: shareCustomerEmail.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReview(data);
        if (shareCustomerEmail.trim()) {
          setShowShareModal(false);
        }
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setSharing(false);
    }
  };

  const copyLink = () => {
    if (!review?.token) return;
    const url = `${window.location.origin}/review/${review.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "keep":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Keep</span>;
      case "dispose":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Dispose</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  const keepCount = items.filter((i) => i.status === "keep").length;
  const disposeCount = items.filter((i) => i.status === "dispose").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Review Status Banner */}
      {review && (
        <div className={`rounded-2xl border p-4 ${
          review.status === "completed"
            ? "bg-green-50 border-green-200"
            : review.status === "in_progress"
            ? "bg-blue-50 border-blue-200"
            : "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {review.status === "completed" ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <Link2 size={16} className={review.status === "in_progress" ? "text-blue-600" : "text-amber-600"} />
              )}
              <span className="text-sm font-medium">
                {review.status === "completed"
                  ? `Review completed${review.customerName ? ` by ${review.customerName}` : ""}`
                  : review.status === "in_progress"
                  ? "Customer is reviewing items..."
                  : `Review link sent${review.customerName ? ` to ${review.customerName}` : ""}`}
              </span>
            </div>
            {review.status !== "completed" && review.token && (
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            )}
          </div>
          {review.status === "completed" && (
            <div className="mt-2 flex gap-4 text-xs text-slate-600">
              <span>Keep: <strong className="text-green-700">{keepCount}</strong></span>
              <span>Dispose: <strong className="text-red-700">{disposeCount}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">
            {items.length} Item{items.length !== 1 ? "s" : ""}
          </h3>
          {items.length > 0 && (
            <div className="flex gap-2 ml-2 text-xs text-slate-500">
              {pendingCount > 0 && <span>{pendingCount} pending</span>}
              {keepCount > 0 && <span className="text-green-600">{keepCount} keep</span>}
              {disposeCount > 0 && <span className="text-red-600">{disposeCount} dispose</span>}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Send size={13} />
              Send to Customer
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            <Plus size={13} />
            Add Item
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">New Inventory Item</h4>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Samsung, Whirlpool"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., RF28R7351SR"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Location / Room</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Kitchen, Master Bedroom"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Photos</label>
            <div className="flex flex-wrap gap-2">
              {pendingPhotos.map((photo, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                  <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPendingPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                <span className="text-[10px] mt-1">{uploading ? "..." : "Add"}</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              disabled={saving || !description.trim()}
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Add Item"}
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No inventory items yet</p>
          <p className="text-xs mt-1">Add items to start building the content inventory</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {/* Item Summary Row */}
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                {/* Thumbnail */}
                {item.photos.length > 0 ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200">
                    <img src={item.photos[0].url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <ImageIcon size={16} className="text-slate-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {item.brand && item.model
                        ? `${item.brand} ${item.model}`
                        : item.brand || item.description.slice(0, 50)}
                    </p>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {item.location && `${item.location} · `}{item.description.slice(0, 60)}{item.description.length > 60 ? "..." : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {item.photos.length > 0 && (
                    <span className="text-xs text-slate-400 flex items-center gap-0.5">
                      <Camera size={11} /> {item.photos.length}
                    </span>
                  )}
                  {expandedId === item.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded Detail */}
              {expandedId === item.id && (
                <div className="px-4 pb-4 border-t border-slate-50">
                  {/* Photo Gallery */}
                  {item.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.photos.map((photo) => (
                        <a
                          key={photo.id}
                          href={photo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors"
                        >
                          <img src={photo.url} alt={photo.fileName || ""} className="w-full h-full object-cover" />
                        </a>
                      ))}
                      {/* Add more photos button */}
                      <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 cursor-pointer transition-colors">
                        <Camera size={16} />
                        <span className="text-[10px] mt-1">Add Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleAddPhotoToItem(item.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {/* Details */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {item.brand && (
                      <div><span className="text-slate-500">Brand:</span> <span className="text-slate-800 font-medium">{item.brand}</span></div>
                    )}
                    {item.model && (
                      <div><span className="text-slate-500">Model:</span> <span className="text-slate-800 font-medium">{item.model}</span></div>
                    )}
                    {item.location && (
                      <div><span className="text-slate-500">Location:</span> <span className="text-slate-800 font-medium">{item.location}</span></div>
                    )}
                    <div><span className="text-slate-500">Added by:</span> <span className="text-slate-800 font-medium">{item.addedByName}</span></div>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{item.description}</p>

                  {item.customerNote && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-xs text-amber-800"><strong>Customer note:</strong> {item.customerNote}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Send to Customer</h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-500">
              Share a link with your customer so they can review each item and decide whether to <strong>Keep</strong> or <strong>Dispose</strong>.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name</label>
              <input
                type="text"
                value={shareCustomerName}
                onChange={(e) => setShareCustomerName(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Email</label>
              <input
                type="email"
                value={shareCustomerEmail}
                onChange={(e) => setShareCustomerEmail(e.target.value)}
                placeholder="customer@example.com (optional — send link via email)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {review?.token && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Review Link</span>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-slate-700 mt-1 break-all font-mono">
                  {window.location.origin}/review/{review.token}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {sharing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {review?.token ? (shareCustomerEmail.trim() ? "Send Email" : "Update Link") : "Generate Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
