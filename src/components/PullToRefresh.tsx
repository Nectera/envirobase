"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Global pull-to-refresh for PWA standalone mode.
 * In standalone mode (saved to home screen), the browser's native
 * pull-to-refresh is disabled. This component adds it back by
 * listening for touch gestures on the main scrollable area.
 */
export default function PullToRefresh() {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);
  const isPulling = useRef(false);
  const threshold = 80;

  const isStandalone = useCallback(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  useEffect(() => {
    // Only activate in standalone (PWA) mode
    if (!isStandalone()) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger when scrolled to the top of the page
      const mainEl = document.querySelector("main");
      if (!mainEl || mainEl.scrollTop > 5) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const distance = e.touches[0].clientY - startY.current;
      if (distance > 0) {
        // Pulling down — apply resistance
        const dampened = Math.min(distance * 0.4, threshold * 1.5);
        setPullDistance(dampened);
        setPulling(true);
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        isPulling.current = false;
        setPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistance >= threshold * 0.8) {
        setRefreshing(true);
        setPullDistance(threshold * 0.5);
        try {
          router.refresh();
          // Small delay to show the spinner
          await new Promise((r) => setTimeout(r, 800));
        } catch {}
        setRefreshing(false);
      }

      setPulling(false);
      setPullDistance(0);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isStandalone, pullDistance, router]);

  if (!pulling && !refreshing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: refreshing ? 48 : pullDistance }}
    >
      <RefreshCw
        size={20}
        className={`text-[#7BC143] transition-transform ${refreshing ? "animate-spin" : ""}`}
        style={{
          transform: `rotate(${pullDistance * 4}deg)`,
          opacity: Math.min(pullDistance / (threshold * 0.6), 1),
        }}
      />
    </div>
  );
}
