"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export default function RedocPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.css"
      />
      <div id="redoc-container" style={{ height: "100vh" }} />
      <Script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js" strategy="afterInteractive" />
      <Script id="redoc-init" strategy="afterInteractive">
        {`
          Redoc.init('/openapi.json', {
            scrollYOffset: 0,
            hideDownloadButton: false,
            expandResponses: "200",
          }, document.getElementById('redoc-container'));
        `}
      </Script>
    </>
  );
}
