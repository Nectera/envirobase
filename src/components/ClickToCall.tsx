"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ClickToCallProps {
  phoneNumber: string;
  parentType?: string;
  parentId?: string;
  contactName?: string;
  size?: "sm" | "md";
}

export default function ClickToCall({
  phoneNumber,
  parentType,
  parentId,
  contactName,
  size = "sm",
}: ClickToCallProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "calling" | "success" | "error">("idle");

  const handleCall = async () => {
    setStatus("calling");
    try {
      const res = await fetch("/api/ringcentral/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          parentType,
          parentId,
          contactName,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        router.refresh();
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const sizeClasses = size === "sm" ? "p-1" : "p-1.5";
  const iconSize = size === "sm" ? 12 : 14;

  if (status === "calling") {
    return (
      <span className={`inline-flex items-center ${sizeClasses} text-amber-500`}>
        <Loader2 size={iconSize} className="animate-spin" />
      </span>
    );
  }

  if (status === "success") {
    return (
      <span className={`inline-flex items-center ${sizeClasses} text-emerald-500`}>
        <CheckCircle size={iconSize} />
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className={`inline-flex items-center ${sizeClasses} text-red-500`} title="Call failed">
        <AlertCircle size={iconSize} />
      </span>
    );
  }

  return (
    <button
      onClick={handleCall}
      className={`inline-flex items-center ${sizeClasses} text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition`}
      title={`Call ${contactName || phoneNumber}`}
    >
      <Phone size={iconSize} />
    </button>
  );
}
