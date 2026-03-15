"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type SidebarCollapseCtx = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarCollapseContext = createContext<SidebarCollapseCtx>({
  collapsed: false,
  toggle: () => {},
});

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext);
}

export default function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}
