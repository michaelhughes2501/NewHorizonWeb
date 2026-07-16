import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { PROVIDERS, loadTokens, clearTokens, isExpired, startConnect, refreshIfExpired } from "../lib/integrations.js";

const palette = {
  bg: "#FAF8F4", cream: "#F5F0E8", charcoal: "#1C1C1E", slate: "#4A4A52",
  mist: "#E8E4DC", gold: "#B8975A", success: "#3D7A5F", rose: "#8B4A5A",
  serif: "'Cormorant Garamond', 'Georgia', serif",
  sans: "'DM Sans', system-ui, sans-serif",
};

function IntegrationCard({ provider, connected, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const btn = {
    flex: 1, padding: "10px 14px", border: `1px solid ${palette.mist}`,
    background: "transparent", color: palette.charcoal, fontFamily: palette.sans,
    fontSize: 14, cursor: "pointer", borderRadius: 6,
  };
  const primary = { ...btn, background: palette.gold, color: "#fff", border: `1px solid ${palette.gold}` };
  return (
    <article style={{
      background: "#fff", border: `1px solid ${palette.mist}`, borderRadius: 10,
      padding: 18, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontFamily: palette.serif, fontSize: 20, color: palette.charcoal }}>
          {provider.label}
        </h3>
        <span style={{
          fontFamily: palette.sans, fontSize: 11, textTransform: "uppercase",
          letterSpacing: ".08em", padding: "2px 8px", borderRadius: 999,
          background: connected ? "rgba(61,122,95,.12)" : palette.cream,
          color: connected ? palette.success : palette.slate,
        }}>{connected ? "Connected" : "Not connected"}</span>
      </div>
      <p style={{ margin: 0, color: palette.slate, fontFamily: palette.sans, fontSize: 13, flex: 1 }}>
        {provider.description}
      </p>
      {err ? <p style={{ margin: 0, color: palette.rose, fontFamily: palette.sans, fontSize: 12 }}>{err}</p> : null}
      <div style={{ display: "flex", gap: 8 }}>
        {connected ? (
          <button type="button" style={btn} onClick={() => {
            clearTokens(provider.id); onChange && onChange();
          }}>Disconnect</button>
        ) : (
          <button type="button" style={primary} disabled={busy} onClick={async () => {
            try { setBusy(true); setErr(""); await startConnect(provider.id); }
            catch (e) { setBusy(false); setErr(e?.message || String(e)); }
          }}>{busy ? "Redirecting…" : "Connect"}</button>
        )}
      </div>
    </article>
  );
}

export default function Integrations() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => { refreshIfExpired().then(refresh); }, [refresh]);
  useEffect(() => {
    const onStorage = (e) => { if (e.key && e.key.startsWith("newhorizonweb_integration_tokens:")) refresh(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.charcoal, fontFamily: palette.sans }}>
      <nav style={{
        padding: "16px 24px", borderBottom: `1px solid ${palette.mist}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff",
      }}>
        <Link to="/" style={{ fontFamily: palette.serif, fontSize: 20, color: palette.charcoal, textDecoration: "none" }}>
          New Horizon
        </Link>
        <span style={{ color: palette.slate, fontSize: 13 }}>Integrations</span>
      </nav>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontFamily: palette.serif, fontSize: 40, fontWeight: 400 }}>Integrations</h1>
          <p style={{ margin: "8px 0 0", color: palette.slate, maxWidth: 640 }}>
            Connect your Google account so resource updates and forms can flow into the tools you already use.
          </p>
        </header>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {PROVIDERS.map((p) => {
            const t = loadTokens(p.id);
            return <IntegrationCard key={p.id} provider={p} connected={!!t && !isExpired(t)} onChange={refresh} />;
          })}
        </section>
      </main>
    </div>
  );
}
