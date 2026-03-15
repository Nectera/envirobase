"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type DuplicateMatch = {
  id: string;
  type: "lead" | "contact" | "company";
  name: string;
  email?: string | null;
  phone?: string | null;
  subtitle?: string;
  companyId?: string | null;
  companyName?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  companyType?: string | null;
  status?: string | null;
  matchedFields: string[];
};

type DuplicateCheckFields = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
};

type UseDuplicateCheckReturn = {
  matches: DuplicateMatch[];
  isChecking: boolean;
  showWarning: boolean;
  dismissWarning: () => void;
  resetMatches: () => void;
};

export function useDuplicateCheck(
  entityType: "lead" | "contact" | "company",
  fields: DuplicateCheckFields,
  excludeId?: string
): UseDuplicateCheckReturn {
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef("");

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    setDismissed(true);
  }, []);

  const resetMatches = useCallback(() => {
    setMatches([]);
    setShowWarning(false);
    setDismissed(false);
  }, []);

  useEffect(() => {
    // Build query string from fields
    const params = new URLSearchParams();
    params.set("type", entityType);
    if (fields.firstName) params.set("firstName", fields.firstName);
    if (fields.lastName) params.set("lastName", fields.lastName);
    if (fields.email) params.set("email", fields.email);
    if (fields.phone) params.set("phone", fields.phone);
    if (fields.companyName) params.set("companyName", fields.companyName);
    if (excludeId) params.set("excludeId", excludeId);

    const queryStr = params.toString();

    // Check if we have at least one meaningful field
    const hasValue =
      (entityType === "company" && (fields.companyName || "").trim().length >= 2) ||
      (entityType !== "company" && (
        (fields.email || "").trim().length >= 3 ||
        (fields.phone || "").replace(/\D/g, "").length >= 7 ||
        ((fields.firstName || "").trim().length >= 2 && (fields.lastName || "").trim().length >= 2)
      ));

    if (!hasValue || queryStr === lastQueryRef.current) {
      if (!hasValue) {
        setMatches([]);
        setShowWarning(false);
      }
      return;
    }

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Debounce 500ms
    timerRef.current = setTimeout(async () => {
      lastQueryRef.current = queryStr;

      // Abort previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsChecking(true);
      try {
        const res = await fetch(`/api/duplicates/check?${queryStr}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setMatches(data.matches || []);
        if (data.matches?.length > 0 && !dismissed) {
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setMatches([]);
          setShowWarning(false);
        }
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [entityType, fields.firstName, fields.lastName, fields.email, fields.phone, fields.companyName, excludeId, dismissed]);

  return { matches, isChecking, showWarning, dismissWarning, resetMatches };
}
