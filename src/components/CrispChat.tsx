"use client";

import { useEffect } from "react";

const CRISP_WEBSITE_ID = "969d6d20-1991-45e9-8216-dffb136163ff";

export default function CrispChat() {
  useEffect(() => {
    // Set Crisp website ID before loading the script
    (window as any).$crisp = [];
    (window as any).CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // Load Crisp script
    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      script.remove();
      delete (window as any).$crisp;
      delete (window as any).CRISP_WEBSITE_ID;
    };
  }, []);

  return null;
}
