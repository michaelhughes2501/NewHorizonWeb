import React, { Suspense, lazy, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
<<<<<<< HEAD
import NotFound from "./pages/NotFound.jsx";
=======
import { AuthService } from "./services/database-service.js";
>>>>>>> origin/main

const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter.jsx"));
const Integrations = lazy(() => import("./pages/Integrations.jsx"));
const IntegrationsCallback = lazy(() => import("./pages/IntegrationsCallback.jsx"));

function ProjectRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/integrations/callback" element={<IntegrationsCallback />} />
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
        const email = session?.user?.email?.trim().toLowerCase();
        const hash = email ? await sha256Hex(email) : "";
        if (cancelled) return;
        setAllowed(Boolean(hash) && ADMIN_EMAIL_HASHES.includes(hash));
        setReady(true);
      })
      .catch((err) => {
        console.error("[AdminGuard] Failed to fetch session:", err);
        if (!cancelled) setReady(true);
      });
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ProjectRouter />
  </React.StrictMode>,
);
