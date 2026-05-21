import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import NotFound from "./pages/NotFound.jsx";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter.jsx"));

function ProjectRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/app" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
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
