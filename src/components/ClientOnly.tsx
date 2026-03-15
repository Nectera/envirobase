"use client";

import { useState, useEffect, ReactNode } from "react";

/**
 * Wrapper that only renders children on the client after mount.
 * Prevents ALL hydration mismatches by skipping SSR for wrapped content.
 */
export default function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
