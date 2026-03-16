"use client";

import { useState, useEffect, ReactNode } from "react";
import Providers from "./Providers";

/**
 * Client-only app wrapper. Prevents ALL hydration mismatches by
 * rendering a simple loading state during SSR, then mounting the
 * real app tree only after the client is ready.
 */
export default function ClientApp({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={process.env.NEXT_PUBLIC_LOGO_URL || "/logo.png"} alt={process.env.NEXT_PUBLIC_APP_NAME || "EnviroBase"} width={40} height={40} />
          <div className="h-2 w-24 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return <Providers>{children}</Providers>;
}
