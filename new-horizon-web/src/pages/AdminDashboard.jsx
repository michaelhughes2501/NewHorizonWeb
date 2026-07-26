import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * NEW HORIZON — Admin Dashboard
 * Complete admin panel with: analytics, user management,
 * content moderation, job approvals, reports queue, system controls.
 */

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const T = {
  gold: "#B8975A",
  goldL: "#D4B07A",
  charcoal: "#1C1C1E",
  slate: "#4A4A52",
  mist: "#E8E4DC",
  ivory: "#FAF8F4",
  cream: "#F5F0E8",
  white: "#FFFFFF",
  success: "#3D7A5F",
  successL: "#EAF3E8",
  rose: "#8B4A5A",
  roseL: "#F5EAE8",
  info: "#2C6FAC",
  infoL: "#E8F0FA",
  warn: "#7A6530",
  warnL: "#FDF6E8",
  sidebar: "#141416",
};

if (!document.getElementById("nh-fonts")) {
  const fontLink = document.createElement("link");
  fontLink.id = "nh-fonts";
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
  document.head.appendChild(fontLink);
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:${T.ivory};color:${T.charcoal}}
button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none}
input,select,textarea{font-family:'DM Sans',sans-serif;outline:none}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#1E1E20}::-webkit-scrollbar-thumb{background:#3A3A3C;border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.row-hover{transition:background .15s}
.row-hover:hover{background:${T.ivory}!important}
.stat-card{transition:transform .2s,box-shadow .2s}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)}
`;
if (!document.getElementById("nh-admin-styles")) {
  const s = document.createElement("style");
  s.id = "nh-admin-styles";
  s.textContent = css;
  document.head.appendChild(s);
}

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const STATS = {
  totalUsers: 12847,
  newUsersToday: 34,
  activeToday: 1203,
  bannedUsers: 12,
  totalMessages: 94321,
  messagesToday: 847,
  totalJobs: 156,
  pendingJobs: 8,
  totalApplications: 2341,
  totalPosts: 89,
  pendingPosts: 5,
  openReports: 14,
  resolvedReports: 203,
  pushSent: 8421,
  emailSent: 12034,
};

const USERS = [
  {
    id: "u1",
    name: "Marcus Johnson",
    email: "marcus@email.com",
    state: "TX",
    offense: "Non-violent",
    joined: "Jan 12, 2024",
    status: "active",
    verified: true,
    reports: 0,
    connections: 12,
    lastSeen: "2m ago",
  },
  {
    id: "u2",
    name: "Alicia Rivera",
    email: "alicia@email.com",
    state: "GA",
    offense: "Drug offense",
    joined: "Feb 3, 2024",
    status: "active",
    verified: true,
    reports: 0,
    connections: 8,
    lastSeen: "Online",
  },
  {
    id: "u3",
    name: "Devon Washington",
    email: "devon@email.com",
    state: "FL",
    offense: "Non-violent",
    joined: "Nov 5, 2023",
    status: "active",
    verified: false,
    reports: 1,
    connections: 22,
    lastSeen: "1h ago",
  },
  {
    id: "u4",
    name: "Keisha Monroe",
    email: "keisha@email.com",
    state: "NY",
    offense: "Financial",
    joined: "Mar 1, 2024",
    status: "active",
    verified: true,
    reports: 0,
    connections: 6,
    lastSeen: "3h ago",
  },
  {
    id: "u5",
    name: "Ray Thompson",
    email: "ray@email.com",
    state: "IL",
    offense: "Violent",
    joined: "Dec 10, 2023",
    status: "flagged",
    verified: false,
    reports: 3,
    connections: 2,
    lastSeen: "2d ago",
  },
  {
    id: "u6",
    name: "Sandra Cruz",
    email: "sandra@email.com",
    state: "CA",
    offense: "Drug offense",
    joined: "Apr 2, 2024",
    status: "active",
    verified: true,
    reports: 0,
    connections: 15,
    lastSeen: "Online",
  },
];

const PENDING_JOBS = [
  {
    id: "pj1",
    title: "Forklift Operator",
    company: "Logan Warehouse",
    state: "TX",
    wage: "$19/hr",
    type: "Full-time",
    submittedBy: "employer@logan.com",
    submitted: "2d ago",
    felonyFriendly: true,
  },
  {
    id: "pj2",
    title: "Landscaping Crew Lead",
    company: "GreenWorks LLC",
    state: "GA",
    wage: "$17/hr",
    type: "Full-time",
    submittedBy: "hr@greenworks.com",
    submitted: "1d ago",
    felonyFriendly: true,
  },
  {
    id: "pj3",
    title: "Security Guard (Armed)",
    company: "SecureNow Inc.",
    state: "FL",
    wage: "$21/hr",
    type: "Full-time",
    submittedBy: "jobs@securenow.com",
    submitted: "4h ago",
    felonyFriendly: false,
  },
];

const PENDING_POSTS = [
  {
    id: "pp1",
    title: "My First 6 Months Out: What Nobody Tells You",
    author: "Marcus J.",
    category: "Story",
    submitted: "1d ago",
    excerpt:
      "The moment I walked out, I thought the hard part was over. I was wrong...",
  },
  {
    id: "pp2",
    title: "How to Pass a Background Check Interview",
    author: "Keisha M.",
    category: "Legal",
    submitted: "3h ago",
    excerpt: "Most employers using ban-the-box still ask about your record...",
  },
  {
    id: "pp3",
    title: "Starting a Food Cart With a Felony in Texas",
    author: "Tyrone B.",
    category: "Business",
    submitted: "2d ago",
    excerpt:
      "The licensing process was a nightmare. Here's what I wish I knew...",
  },
];

const REPORTS = [
  {
    id: "r1",
    type: "user",
    target: "Ray Thompson",
    reason: "Sending unsolicited messages",
    reporter: "Alicia R.",
    time: "3h ago",
    status: "open",
  },
  {
    id: "r2",
    type: "message",
    target: "Message #44291",
    reason: "Threatening language",
    reporter: "Keisha M.",
    time: "1d ago",
    status: "reviewing",
  },
  {
    id: "r3",
    type: "user",
    target: "Unknown User",
    reason: "Spam profile",
    reporter: "Devon W.",
    time: "2d ago",
    status: "resolved",
  },
  {
    id: "r4",
    type: "post",
    target: "Post #12",
    reason: "Inaccurate legal information",
    reporter: "Editorial",
    time: "4d ago",
    status: "open",
  },
];

// ─── SHARED COMPONENTS ─────────────────────────────────────────────────────────
const Badge = ({ children, color = T.gold, bg }) => (
  <span
    style={{
      background: bg || color + "18",
      color,
      border: `1px solid ${color}30`,
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const map = {
    active: [T.success, T.successL, "Active"],
    flagged: [T.rose, T.roseL, "Flagged"],
    banned: [T.rose, T.roseL, "Banned"],
    open: [T.rose, T.roseL, "Open"],
    reviewing: [T.warn, T.warnL, "Reviewing"],
    resolved: [T.success, T.successL, "Resolved"],
    pending: [T.gold, T.cream, "Pending"],
    approved: [T.success, T.successL, "Approved"],
    rejected: [T.rose, T.roseL, "Rejected"],
  };
  const [c, bg, label] = map[status] || [T.slate, T.ivory, status];
  return (
    <Badge color={c} bg={bg}>
      {label}
    </Badge>
  );
};

const ActionBtn = ({ label, color = T.gold, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "5px 12px",
      borderRadius: 6,
      background: "none",
      border: `1px solid ${color}50`,
      color,
      fontSize: 12,
      fontWeight: 500,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = color + "15";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "none";
    }}
  >
    {label}
  </button>
);

const MetricCard = ({ icon, label, value, sub, color = T.gold, trend }) => (
  <div
    className="stat-card"
    style={{
      background: "white",
      borderRadius: 14,
      border: `1px solid ${T.mist}`,
      padding: "18px 20px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: color + "15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        {icon}
      </div>
      {trend && (
        <span
          style={{
            fontSize: 11,
            color: T.success,
            background: T.successL,
            padding: "2px 8px",
            borderRadius: 10,
            fontWeight: 500,
          }}
        >
          ↑ {trend}
        </span>
      )}
    </div>
    <div
      style={{
        fontFamily: "'Cormorant Garamond',serif",
        fontSize: 32,
        fontWeight: 600,
        color: T.charcoal,
      }}
    >
      {typeof value === "number" ? value.toLocaleString() : value}
    </div>
    <div
      style={{ fontSize: 13, fontWeight: 500, color: T.charcoal, marginTop: 2 }}
    >
      {label}
    </div>
    {sub && (
      <div style={{ fontSize: 11, color: T.slate, marginTop: 2 }}>{sub}</div>
    )}
  </div>
);

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview", icon: "⊞", label: "Overview" },
  { id: "users", icon: "👥", label: "Users" },
  { id: "content", icon: "📝", label: "Content" },
  { id: "jobs", icon: "💼", label: "Jobs" },
  { id: "reports", icon: "🚩", label: "Reports", badge: 14 },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

function Sidebar({ page, setPage }) {
  return (
    <aside
      style={{
        width: 220,
        background: T.sidebar,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{ padding: "20px 20px 14px", borderBottom: "1px solid #2A2A2C" }}
      >
        <Link
          to="/"
          aria-label="Back to New Horizon member app"
          title="Back to member app"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 14,
            }}
          >
            ✦
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 16,
                color: "white",
                fontWeight: 600,
              }}
            >
              New Horizon
            </div>
            <div
              style={{ fontSize: 10, color: "#5A5A6A", letterSpacing: "1px" }}
            >
              ADMIN PANEL
            </div>
          </div>
        </Link>
      </div>

      <div style={{ padding: "12px 10px", flex: 1 }}>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              border: "none",
              background:
                page === n.id ? "rgba(184,151,90,.15)" : "transparent",
              color: page === n.id ? T.gold : "#7A7A8A",
              fontSize: 13,
              fontWeight: page === n.id ? 500 : 400,
              marginBottom: 2,
              textAlign: "left",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 14, width: 16, textAlign: "center" }}>
              {n.icon}
            </span>
            {n.label}
            {n.badge && (
              <span
                style={{
                  marginLeft: "auto",
                  background: T.rose,
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 8,
                }}
              >
                {n.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "14px 16px", borderTop: "1px solid #2A2A2C" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            SA
          </div>
          <div>
            <div style={{ fontSize: 12, color: "white", fontWeight: 500 }}>
              Super Admin
            </div>
            <div style={{ fontSize: 10, color: "#5A5A6A" }}>
              admin@newhorizon.app
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
const BACKEND_READY = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== "https://YOUR_PROJECT.supabase.co" &&
  import.meta.env.VITE_SUPABASE_URL !== "placeholder" &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== "YOUR_ANON_KEY" &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== "placeholder",
);

function Overview() {
  const cards = [
    {
      icon: "👥",
      label: "Total Members",
      value: STATS.totalUsers,
      sub: `+${STATS.newUsersToday} today`,
      color: T.info,
      trend: `${STATS.newUsersToday} today`,
    },
    {
      icon: "🟢",
      label: "Active Today",
      value: STATS.activeToday,
      sub: "Unique sessions",
      color: T.success,
      trend: "9.3%",
    },
    {
      icon: "✉",
      label: "Messages Today",
      value: STATS.messagesToday,
      sub: "Across all conversations",
      color: T.gold,
      trend: "12%",
    },
    {
      icon: "💼",
      label: "Active Job Listings",
      value: STATS.totalJobs,
      sub: `${STATS.pendingJobs} pending approval`,
      color: T.slate,
    },
    {
      icon: "🚩",
      label: "Open Reports",
      value: STATS.openReports,
      sub: "Require review",
      color: T.rose,
    },
    {
      icon: "📱",
      label: "Push Sent (30d)",
      value: STATS.pushSent,
      sub: "Avg 94% delivery rate",
      color: T.gold,
      trend: "6%",
    },
    {
      icon: "📧",
      label: "Emails Sent (30d)",
      value: STATS.emailSent,
      sub: "Avg 42% open rate",
      color: T.info,
    },
    {
      icon: "📝",
      label: "Blog Posts",
      value: STATS.totalPosts,
      sub: `${STATS.pendingPosts} pending review`,
      color: T.slate,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 34,
            fontWeight: 300,
            marginBottom: 4,
          }}
        >
          Admin <em style={{ color: T.gold }}>Overview</em>
        </h1>
        <p style={{ color: T.slate, fontSize: 14 }}>
          Platform health at a glance —{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Live Supabase stat cards */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.slate,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Live Database Stats
          </span>
          <div style={{ height: 1, flex: 1, background: T.mist }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 20,
              background: BACKEND_READY ? T.successL : T.warnL,
              border: `1px solid ${BACKEND_READY ? T.success : T.warn}30`,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: BACKEND_READY ? T.success : T.warn,
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: BACKEND_READY ? T.success : T.warn,
              }}
            >
              {BACKEND_READY ? "Connected" : "Not Connected"}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
          }}
        >
          <div
            className="stat-card"
            style={{
              background: "white",
              borderRadius: 14,
              border: `1px solid ${T.mist}`,
              padding: "20px 22px",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: T.infoL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              👥
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 30,
                  fontWeight: 600,
                  color: T.charcoal,
                }}
              >
                {BACKEND_READY ? "—" : STATS.totalUsers.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.charcoal }}>
                Total Users
              </div>
              <div style={{ fontSize: 11, color: T.slate, marginTop: 1 }}>
                {BACKEND_READY ? "Live from profiles table" : "Mock data"}
              </div>
            </div>
          </div>
          <div
            className="stat-card"
            style={{
              background: "white",
              borderRadius: 14,
              border: `1px solid ${T.mist}`,
              padding: "20px 22px",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: T.successL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              📝
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 30,
                  fontWeight: 600,
                  color: T.charcoal,
                }}
              >
                {BACKEND_READY ? "—" : STATS.totalPosts.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.charcoal }}>
                Total Posts
              </div>
              <div style={{ fontSize: 11, color: T.slate, marginTop: 1 }}>
                {BACKEND_READY ? "Live from blog_posts table" : "Mock data"}
              </div>
            </div>
          </div>
          <div
            className="stat-card"
            style={{
              background: "white",
              borderRadius: 14,
              border: `1px solid ${T.mist}`,
              padding: "20px 22px",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: T.cream,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              💼
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 30,
                  fontWeight: 600,
                  color: T.charcoal,
                }}
              >
                {BACKEND_READY ? "—" : STATS.totalJobs.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.charcoal }}>
                Total Jobs
              </div>
              <div style={{ fontSize: 11, color: T.slate, marginTop: 1 }}>
                {BACKEND_READY ? "Live from jobs table" : "Mock data"}
              </div>
            </div>
          </div>
        </div>
        {!BACKEND_READY && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 16px",
              borderRadius: 10,
              background: T.warnL,
              border: `1px solid ${T.warn}30`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>🔗</span>
            <span style={{ fontSize: 13, color: T.warn, fontWeight: 500 }}>
              Connect your Supabase project to see live data — add your
              credentials to{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  background: T.warn + "15",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                .env
              </code>{" "}
              to activate real-time stats.
            </span>
          </div>
        )}
      </div>

      {/* Metric grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {cards.map((c) => (
          <MetricCard key={c.label} {...c} />
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: `1px solid ${T.mist}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${T.mist}`,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              New Members Today
            </span>
            <Badge color={T.success} bg={T.successL}>
              +{STATS.newUsersToday}
            </Badge>
          </div>
          {USERS.slice(0, 4).map((u, i) => (
            <div
              key={i}
              className="row-hover"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 18px",
                borderBottom: i < 3 ? `1px solid ${T.mist}` : "none",
                background: "white",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: T.slate }}>
                  {u.state} · {u.offense}
                </div>
              </div>
              <StatusBadge status={u.status} />
            </div>
          ))}
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: `1px solid ${T.mist}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${T.mist}`,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              Pending Approvals
            </span>
            <Badge color={T.warn} bg={T.warnL}>
              {STATS.pendingJobs + STATS.pendingPosts} items
            </Badge>
          </div>
          {[
            ...PENDING_JOBS.slice(0, 2).map((j) => ({
              label: j.title,
              sub: j.company,
              type: "Job",
              time: j.submitted,
            })),
            ...PENDING_POSTS.slice(0, 2).map((p) => ({
              label: p.title,
              sub: p.author,
              type: "Post",
              time: p.submitted,
            })),
          ].map((item, i) => (
            <div
              key={i}
              className="row-hover"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 18px",
                borderBottom: i < 3 ? `1px solid ${T.mist}` : "none",
                background: "white",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: item.type === "Job" ? T.successL : T.infoL,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                {item.type === "Job" ? "💼" : "📝"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: T.slate }}>
                  {item.sub} · {item.time}
                </div>
              </div>
              <Badge color={item.type === "Job" ? T.success : T.info}>
                {item.type}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState(USERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = users.filter((u) => {
    if (
      search &&
      !u.name.toLowerCase().includes(search.toLowerCase()) &&
      !u.email.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    return true;
  });

  const banUser = (id) => {
    setUsers((p) =>
      p.map((u) => (u.id === id ? { ...u, status: "banned" } : u)),
    );
    setSelected(null);
  };
  const verifyUser = (id) =>
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, verified: true } : u)));
  const clearReports = (id) =>
    setUsers((p) =>
      p.map((u) => (u.id === id ? { ...u, reports: 0, status: "active" } : u)),
    );

  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  const inviteUser = () => {
    const email = window.prompt("Enter the email address to invite:");
    if (!email) return;
    setToast(`Invitation sent to ${email}`);
  };

  return (
    <div>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "white",
            border: `1px solid ${T.gold}40`,
            color: T.charcoal,
            padding: "12px 18px",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            fontSize: 14,
            zIndex: 9999,
            animation: "fadeIn .3s ease",
          }}
        >
          {toast}
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 34,
            fontWeight: 300,
            marginBottom: 4,
          }}
        >
          User <em style={{ color: T.gold }}>Management</em>
        </h1>
        <p style={{ color: T.slate, fontSize: 14 }}>
          {users.length.toLocaleString()} registered members
        </p>
      </div>

      {/* Filters */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 13,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            aria-label="Search name or email"
            style={{
              paddingLeft: 34,
              border: `1px solid ${T.mist}`,
              borderRadius: 8,
              padding: "9px 12px 9px 34px",
              fontSize: 13,
              width: "100%",
              background: "white",
            }}
          />
        </div>
        {["all", "active", "flagged", "banned"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: statusFilter === s ? T.gold : "white",
              color: statusFilter === s ? "white" : T.slate,
              border: `1px solid ${statusFilter === s ? T.gold : T.mist}`,
              fontSize: 13,
              fontWeight: statusFilter === s ? 500 : 400,
              textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
        <button
          onClick={inviteUser}
          style={{
            marginLeft: "auto",
            padding: "8px 18px",
            background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
            color: "white",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            transition: "opacity .15s, transform .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          + Invite User
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${T.mist}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 80px 140px",
            padding: "10px 16px",
            background: T.ivory,
            borderBottom: `1px solid ${T.mist}`,
            gap: 12,
          }}
        >
          {[
            "Name",
            "Email",
            "State",
            "Offense",
            "Joined",
            "Reports",
            "Actions",
          ].map((h) => (
            <div
              key={h}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.slate,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {filtered.map((u, i) => (
          <div
            key={u.id}
            className="row-hover"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 80px 140px",
              padding: "13px 16px",
              borderBottom:
                i < filtered.length - 1 ? `1px solid ${T.mist}` : "none",
              gap: 12,
              alignItems: "center",
              background: "white",
              animation: `fadeUp .3s ${i * 0.04}s ease both`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <StatusBadge status={u.status} />
                  {u.verified && (
                    <Badge color={T.success} bg={T.successL}>
                      ✓
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                color: T.slate,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {u.email}
            </div>
            <div style={{ fontSize: 13 }}>{u.state}</div>
            <div style={{ fontSize: 12, color: T.slate }}>{u.offense}</div>
            <div style={{ fontSize: 12, color: T.slate }}>{u.joined}</div>
            <div
              style={{
                fontSize: 13,
                color: u.reports > 0 ? T.rose : T.slate,
                fontWeight: u.reports > 0 ? 600 : 400,
              }}
            >
              {u.reports} {u.reports > 0 ? "⚠" : ""}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {!u.verified && (
                <ActionBtn
                  label="Verify"
                  color={T.success}
                  onClick={() => verifyUser(u.id)}
                />
              )}
              {u.reports > 0 && (
                <ActionBtn
                  label="Clear"
                  color={T.warn}
                  onClick={() => clearReports(u.id)}
                />
              )}
              {u.status !== "banned" && (
                <ActionBtn
                  label="Ban"
                  color={T.rose}
                  onClick={() => banUser(u.id)}
                />
              )}
              <ActionBtn
                label="View"
                color={T.info}
                onClick={() => setSelected(u)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* User Detail Modal */}
      {selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 500,
            padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: 32,
              width: "100%",
              maxWidth: 480,
              animation: "fadeUp .3s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                Member Profile
              </h3>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close dialog"
                style={{
                  background: T.mist,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  fontSize: 16,
                  color: T.slate,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {selected.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {selected.name}
                </div>
                <div style={{ color: T.slate, fontSize: 13 }}>
                  {selected.email}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <StatusBadge status={selected.status} />
                  {selected.verified && (
                    <Badge color={T.success} bg={T.successL}>
                      ✓ Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {[
              ["State", selected.state],
              ["Offense Type", selected.offense],
              ["Member Since", selected.joined],
              ["Last Seen", selected.lastSeen],
              ["Connections", selected.connections],
              ["Reports Against", selected.reports],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: `1px solid ${T.mist}`,
                }}
              >
                <span style={{ fontSize: 13, color: T.slate }}>{l}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color:
                      l === "Reports Against" && v > 0 ? T.rose : T.charcoal,
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {!selected.verified && (
                <button
                  onClick={() => verifyUser(selected.id)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    background: T.successL,
                    color: T.success,
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                >
                  Verify Account
                </button>
              )}
              {selected.status !== "banned" && (
                <button
                  onClick={() => banUser(selected.id)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    background: T.roseL,
                    color: T.rose,
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                >
                  Ban User
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: `1px solid ${T.mist}`,
                  color: T.slate,
                  fontSize: 13,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── JOB APPROVALS ────────────────────────────────────────────────────────────
function JobApprovals() {
  const [jobs, setJobs] = useState(PENDING_JOBS);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  const approve = (id) => {
    setJobs((p) => p.filter((j) => j.id !== id));
    setToast("Job listing approved and published!");
  };
  const reject = (id) => {
    setJobs((p) => p.filter((j) => j.id !== id));
    setToast("Job listing rejected.");
  };

  return (
    <div>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "white",
            border: `1px solid ${T.gold}40`,
            color: T.charcoal,
            padding: "12px 18px",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            fontSize: 14,
            zIndex: 9999,
            animation: "fadeIn .3s ease",
          }}
        >
          {toast}
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 34,
            fontWeight: 300,
            marginBottom: 4,
          }}
        >
          Job <em style={{ color: T.gold }}>Approvals</em>
        </h1>
        <p style={{ color: T.slate, fontSize: 14 }}>
          {jobs.length} listings pending review
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {jobs.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: 16,
              border: `1px solid ${T.mist}`,
              padding: 48,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 500, color: T.charcoal }}>
              All caught up!
            </div>
            <div style={{ fontSize: 13, color: T.slate, marginTop: 4 }}>
              No pending job listings to review.
            </div>
          </div>
        ) : (
          jobs.map((j, i) => (
            <div
              key={j.id}
              style={{
                background: "white",
                borderRadius: 14,
                border: `1px solid ${T.mist}`,
                padding: "20px 24px",
                animation: `fadeUp .4s ${i * 0.07}s ease both`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>💼</span>
                    <h3 style={{ fontWeight: 600, fontSize: 17 }}>{j.title}</h3>
                    <Badge color={j.felonyFriendly ? T.success : T.rose}>
                      {j.felonyFriendly ? "Felon Friendly" : "Review Needed"}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 13, color: T.slate }}>
                    {j.company} · {j.state} · {j.wage} · {j.type}
                  </div>
                  <div style={{ fontSize: 12, color: T.slate, marginTop: 4 }}>
                    Submitted by: {j.submittedBy} · {j.submitted}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => reject(j.id)}
                    style={{
                      padding: "9px 18px",
                      borderRadius: 8,
                      border: `1px solid ${T.rose}50`,
                      color: T.rose,
                      background: "transparent",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => approve(j.id)}
                    style={{
                      padding: "9px 18px",
                      borderRadius: 8,
                      background: T.success,
                      color: "white",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    ✓ Approve
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── CONTENT MODERATION ───────────────────────────────────────────────────────
function ContentModeration() {
  const [posts, setPosts] = useState(PENDING_POSTS);
  const approve = (id) => setPosts((p) => p.filter((x) => x.id !== id));
  const reject = (id) => setPosts((p) => p.filter((x) => x.id !== id));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 34,
            fontWeight: 300,
            marginBottom: 4,
          }}
        >
          Content <em style={{ color: T.gold }}>Moderation</em>
        </h1>
        <p style={{ color: T.slate, fontSize: 14 }}>
          {posts.length} blog posts pending review
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {posts.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: 16,
              border: `1px solid ${T.mist}`,
              padding: 48,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 500 }}>No pending content.</div>
          </div>
        ) : (
          posts.map((p, i) => (
            <div
              key={p.id}
              style={{
                background: "white",
                borderRadius: 14,
                border: `1px solid ${T.mist}`,
                padding: "20px 24px",
                animation: `fadeUp .4s ${i * 0.07}s ease both`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <h3 style={{ fontWeight: 600, fontSize: 16 }}>{p.title}</h3>
                    <Badge color={T.info}>{p.category}</Badge>
                  </div>
                  <div
                    style={{ fontSize: 12, color: T.slate, marginBottom: 8 }}
                  >
                    By {p.author} · Submitted {p.submitted}
                  </div>
                  <p style={{ fontSize: 13, color: T.slate, lineHeight: 1.6 }}>
                    {p.excerpt}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => reject(p.id)}
                    style={{
                      padding: "9px 18px",
                      borderRadius: 8,
                      border: `1px solid ${T.rose}50`,
                      color: T.rose,
                      background: "transparent",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approve(p.id)}
                    style={{
                      padding: "9px 18px",
                      borderRadius: 8,
                      background: T.success,
                      color: "white",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Publish
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── REPORTS QUEUE ────────────────────────────────────────────────────────────
function ReportsQueue() {
  const [reports, setReports] = useState(REPORTS);
  const resolve = (id) =>
    setReports((p) =>
      p.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)),
    );
  const dismiss = (id) =>
    setReports((p) =>
      p.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r)),
    );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 34,
            fontWeight: 300,
            marginBottom: 4,
          }}
        >
          Reports <em style={{ color: T.gold }}>Queue</em>
        </h1>
        <p style={{ color: T.slate, fontSize: 14 }}>
          {reports.filter((r) => r.status === "open").length} open ·{" "}
          {reports.filter((r) => r.status === "reviewing").length} reviewing
        </p>
      </div>
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${T.mist}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.5fr 1fr 1fr 80px 140px",
            padding: "10px 16px",
            background: T.ivory,
            borderBottom: `1px solid ${T.mist}`,
            gap: 12,
          }}
        >
          {["Type", "Target", "Reason", "Reporter", "Status", "Actions"].map(
            (h) => (
              <div
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.slate,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {h}
              </div>
            ),
          )}
        </div>
        {reports.map((r, i) => (
          <div
            key={r.id}
            className="row-hover"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.5fr 1fr 1fr 80px 140px",
              padding: "13px 16px",
              borderBottom:
                i < reports.length - 1 ? `1px solid ${T.mist}` : "none",
              gap: 12,
              alignItems: "center",
              background: "white",
            }}
          >
            <Badge
              color={
                r.type === "user"
                  ? T.rose
                  : r.type === "message"
                    ? T.info
                    : T.warn
              }
            >
              {r.type}
            </Badge>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.target}
            </div>
            <div
              style={{
                fontSize: 12,
                color: T.slate,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.reason}
            </div>
            <div style={{ fontSize: 12, color: T.slate }}>{r.reporter}</div>
            <StatusBadge status={r.status} />
            <div style={{ display: "flex", gap: 6 }}>
              {r.status === "open" && (
                <ActionBtn
                  label="Review"
                  color={T.warn}
                  onClick={() =>
                    setReports((p) =>
                      p.map((x) =>
                        x.id === r.id ? { ...x, status: "reviewing" } : x,
                      ),
                    )
                  }
                />
              )}
              {r.status !== "resolved" && (
                <ActionBtn
                  label="Resolve"
                  color={T.success}
                  onClick={() => resolve(r.id)}
                />
              )}
              {r.status === "open" && (
                <ActionBtn
                  label="Dismiss"
                  color={T.slate}
                  onClick={() => dismiss(r.id)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics() {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
  const signups = [820, 910, 1040, 1280, 1190, 1410, 1620];
  const maxVal = Math.max(...signups);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 34,
            fontWeight: 300,
            marginBottom: 4,
          }}
        >
          Platform <em style={{ color: T.gold }}>Analytics</em>
        </h1>
        <p style={{ color: T.slate, fontSize: 14 }}>
          Growth, engagement, and impact metrics — last 7 months
        </p>
      </div>

      {/* Growth chart */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${T.mist}`,
          padding: 28,
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          Member Growth
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            height: 160,
          }}
        >
          {months.map((m, i) => (
            <div
              key={m}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 11, color: T.gold, fontWeight: 600 }}>
                {signups[i].toLocaleString()}
              </span>
              <div
                style={{
                  width: "100%",
                  borderRadius: "4px 4px 0 0",
                  background:
                    i === months.length - 1
                      ? `linear-gradient(180deg,${T.gold},${T.goldL})`
                      : `linear-gradient(180deg,${T.mist},${T.cream})`,
                  height: `${(signups[i] / maxVal) * 130}px`,
                  transition: "height .5s ease",
                  minHeight: 8,
                }}
              />
              <span style={{ fontSize: 11, color: T.slate }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Impact stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Jobs Found via Platform",
            value: "1,847",
            icon: "💼",
            sub: "Employer-reported placements",
          },
          {
            label: "Housing Applications",
            value: "934",
            icon: "🏠",
            sub: "Referrals to housing partners",
          },
          {
            label: "Resources Accessed",
            value: "28,400",
            icon: "🔗",
            sub: "Unique resource page views",
          },
          {
            label: "Mental Health Referrals",
            value: "612",
            icon: "🧠",
            sub: "To SAMHSA & partners",
          },
          {
            label: "Avg. Session Duration",
            value: "14.2 min",
            icon: "⏱",
            sub: "Per active user session",
          },
          {
            label: "Profile Completion Rate",
            value: "67%",
            icon: "◯",
            sub: "Across all registered users",
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: "white",
              borderRadius: 14,
              border: `1px solid ${T.mist}`,
              padding: "18px 20px",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 28,
                fontWeight: 600,
                color: T.gold,
                marginBottom: 2,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: T.charcoal,
                marginBottom: 2,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 11, color: T.slate }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* State breakdown */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${T.mist}`,
          padding: 24,
        }}
      >
        <h3
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          Members by State
        </h3>
        {[
          ["Texas", "TX", 28],
          ["Georgia", "GA", 17],
          ["Florida", "FL", 14],
          ["New York", "NY", 12],
          ["Illinois", "IL", 9],
          ["California", "CA", 8],
          ["Other States", "—", 12],
        ].map(([name, code, pct]) => (
          <div key={code} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {name}{" "}
                {code !== "—" && (
                  <span style={{ color: T.slate, fontWeight: 400 }}>
                    ({code})
                  </span>
                )}
              </span>
              <span style={{ fontSize: 13, color: T.gold, fontWeight: 600 }}>
                {pct}%
              </span>
            </div>
            <div
              style={{
                background: T.mist,
                borderRadius: 6,
                height: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: `linear-gradient(90deg,${T.gold},${T.goldL})`,
                  borderRadius: 6,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SYSTEM SETTINGS ──────────────────────────────────────────────────────────
function SystemSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    newRegistrations: true,
    jobPostings: true,
    messaging: true,
    publicBlog: true,
    requireVerification: false,
    autoModeration: true,
  });
  const toggle = (k) => setSettings((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 34,
            fontWeight: 300,
            marginBottom: 4,
          }}
        >
          System <em style={{ color: T.gold }}>Settings</em>
        </h1>
        <p style={{ color: T.slate, fontSize: 14 }}>
          Platform controls and feature toggles
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: `1px solid ${T.mist}`,
            padding: 24,
          }}
        >
          <h3
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Feature Toggles
          </h3>
          {[
            [
              "Maintenance Mode",
              "Take the site offline for updates",
              "maintenanceMode",
              T.rose,
            ],
            [
              "New Registrations",
              "Allow new users to sign up",
              "newRegistrations",
              T.success,
            ],
            [
              "Job Postings",
              "Allow employers to submit jobs",
              "jobPostings",
              T.success,
            ],
            [
              "Direct Messaging",
              "Enable user-to-user messaging",
              "messaging",
              T.success,
            ],
            [
              "Public Blog",
              "Show blog to non-logged-in visitors",
              "publicBlog",
              T.success,
            ],
            [
              "Require Email Verification",
              "Users must verify before posting",
              "requireVerification",
              T.warn,
            ],
            [
              "Auto Content Moderation",
              "AI-flag potentially harmful posts",
              "autoModeration",
              T.info,
            ],
          ].map(([label, desc, key, color]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "11px 0",
                borderBottom: `1px solid ${T.mist}`,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 12, color: T.slate, marginTop: 1 }}>
                  {desc}
                </div>
              </div>
              <div
                onClick={() => toggle(key)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: settings[key] ? color : T.mist,
                  position: "relative",
                  cursor: "pointer",
                  transition: "background .2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: settings[key] ? 22 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left .2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,.25)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "white",
              borderRadius: 16,
              border: `1px solid ${T.mist}`,
              padding: 24,
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              Database
            </h3>
            {[
              ["Provider", "Supabase (PostgreSQL 15)"],
              ["Region", "us-east-1 (N. Virginia)"],
              ["Storage", "2.4 GB / 8 GB used"],
              ["RLS", "Enabled on all tables"],
              ["Backups", "Daily at 3AM UTC"],
              ["Last Backup", "Today at 3:02 AM"],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: `1px solid ${T.mist}`,
                  fontSize: 13,
                }}
              >
                <span style={{ color: T.slate }}>{l}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              background: `linear-gradient(135deg,${T.charcoal},#2A2A2E)`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 18,
                color: "white",
                fontWeight: 300,
                marginBottom: 12,
              }}
            >
              Deployment Info
            </h3>
            {[
              ["Platform", "Vercel + Supabase"],
              ["App Version", "v2.1.4"],
              ["Last Deploy", "Apr 16, 2025 9:14 AM"],
              ["Environment", "Production"],
              ["SSL", "Active (Let's Encrypt)"],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid #2A2A2C",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#9A9AAA" }}>{l}</span>
                <span style={{ color: "white", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [page, setPage] = useState("overview");

  const pages = {
    overview: <Overview />,
    users: <UserManagement />,
    content: <ContentModeration />,
    jobs: <JobApprovals />,
    reports: <ReportsQueue />,
    notifications: (
      <div style={{ padding: 4 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 34,
            fontWeight: 300,
            marginBottom: 24,
          }}
        >
          Notification <em style={{ color: T.gold }}>Controls</em>
        </h1>
        <p style={{ color: T.slate, marginBottom: 20 }}>
          Manage push/email templates and quiet-hours delivery in the
          Notification Center.
        </p>
        <Link
          to="/notifications"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 22px",
            borderRadius: 8,
            background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
            color: "white",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Open Notification Center →
        </Link>
      </div>
    ),
    analytics: <Analytics />,
    settings: <SystemSettings />,
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <Sidebar page={page} setPage={setPage} />
      <main
        style={{
          flex: 1,
          padding: "32px 36px",
          overflowY: "auto",
          minHeight: "100vh",
          background: T.ivory,
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {pages[page] || pages.overview}
        </div>
      </main>
    </div>
  );
}
