"use client";

import Script from "next/script";

declare global {
  interface Window {
    __googleMapsLoaded?: boolean;
    __googleMapsCallbacks?: (() => void)[];
  }
}

export default function GoogleMapsScript() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) return null;

  return (
    <Script
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
      strategy="afterInteractive"
      onLoad={() => {
        window.__googleMapsLoaded = true;
        // Notify any waiting components
        if (window.__googleMapsCallbacks) {
          window.__googleMapsCallbacks.forEach((cb) => cb());
          window.__googleMapsCallbacks = [];
        }
      }}
    />
  );
}
