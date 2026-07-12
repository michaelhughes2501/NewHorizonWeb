import React, { Suspense, lazy, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import { AuthService } from "./services/database-service.js";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter.jsx"));

function ProjectRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/app" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// SHA-256 hashes of admin emails. Storing hashes (not plain text) so the
// admin list does not leak into the client bundle. This is UX gating only —
// real authorization still has to be enforced server-side via RLS.
const ADMIN_EMAIL_HASHES = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

async function sha256Hex(input) {
  if (!globalThis.crypto?.subtle) {
    // Web Crypto is only available in secure contexts (HTTPS or localhost).
    // Fail closed and warn so an operator hitting this in production knows why
    // /admin is denying access, instead of silently redirecting.
    console.warn(
      "[AdminGuard] crypto.subtle unavailable — /admin denied. " +
        "Serve the app over HTTPS (or from localhost) for admin access.",
    );
    return "";
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function AdminGuard({ children }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AuthService.getSession()
      .then(async (session) => {
        const email = session?.user?.email?.toLowerCase();
        const hash = email ? await sha256Hex(email) : "";
        if (cancelled) return;
        setAllowed(Boolean(hash) && ADMIN_EMAIL_HASHES.includes(hash));
        setReady(true);
      })
      .catch(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);
  if (!ready) return <LoadingScreen />;
  return allowed ? children : <Navigate to="/" replace />;
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FAF8F4", color: "#1C1C1E", fontFamily: "'DM Sans', sans-serif" }}>
      <div>Loading New Horizon...</div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FAF8F4", color: "#1C1C1E", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 400, marginBottom: 12 }}>New Horizon</h1>
        <p style={{ marginBottom: 20, lineHeight: 1.6 }}>
          This route does not exist. Use one of the project areas below.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" style={linkStyle}>Member App</Link>
          <Link to="/admin" style={linkStyle}>Admin Dashboard</Link>
          <Link to="/notifications" style={linkStyle}>Notifications</Link>
        </div>
      </div>
    </div>
  );
}

const linkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 18px",
  borderRadius: 10,
  background: "#B8975A",
  color: "white",
  textDecoration: "none",
  fontWeight: 500,
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ProjectRouter />
  </React.StrictMode>,
);
