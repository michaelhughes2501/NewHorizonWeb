import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeCallback } from "../lib/integrations.js";

export default function IntegrationsCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const promiseRef = useRef(null);

  useEffect(() => {
    if (!promiseRef.current) promiseRef.current = completeCallback(window.location.search);
    let cancelled = false;
    promiseRef.current
      .then(({ returnTo }) => { if (!cancelled) navigate(returnTo || "/integrations", { replace: true }); })
      .catch((err) => { if (!cancelled) setError(err?.message || String(err)); });
    return () => { cancelled = true; };
  }, [navigate]);

  const p = {
    bg: "#FAF8F4", charcoal: "#1C1C1E", slate: "#4A4A52", mist: "#E8E4DC",
    gold: "#B8975A", rose: "#8B4A5A",
    serif: "'Cormorant Garamond', Georgia, serif",
    sans: "'DM Sans', system-ui, sans-serif",
  };
  return (
    <div style={{ minHeight: "100vh", background: p.bg, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", padding: 32, border: `1px solid ${p.mist}`, background: "#fff", borderRadius: 12, textAlign: "center", fontFamily: p.sans, color: p.charcoal }}>
        {error ? (
          <>
            <h1 style={{ margin: "0 0 8px", fontFamily: p.serif, color: p.rose }}>Connection failed</h1>
            <p style={{ margin: "0 0 16px", color: p.slate, fontSize: 14 }}>{error}</p>
            <a href="/integrations" style={{ display: "inline-block", padding: "10px 16px", background: p.gold, color: "#fff", textDecoration: "none", borderRadius: 6 }}>Back to integrations</a>
          </>
        ) : (
          <>
            <div style={{
              width: 36, height: 36, margin: "0 auto 16px", borderRadius: "50%",
              border: `3px solid ${p.mist}`, borderTopColor: p.gold, animation: "spin .9s linear infinite",
            }} />
            <h1 style={{ margin: 0, fontFamily: p.serif, fontSize: 22 }}>Finishing connection…</h1>
            <p style={{ margin: "8px 0 0", color: p.slate, fontSize: 14 }}>Talking to Google. Hang tight.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </div>
    </div>
  );
}
