import { useState, useEffect, useRef, createContext, useContext, useMemo } from "react";
import {
  AuthService,
  BlogService,
  JobService,
  MessageService,
  NotificationService,
  ProfileService,
} from "./services/database-service.js";

if (!document.getElementById("nh-fonts")) {
  const fontLink = document.createElement("link");
  fontLink.id = "nh-fonts";
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
  document.head.appendChild(fontLink);
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  cream: "#F5F0E8",
  ivory: "#FAF8F4",
  gold: "#B8975A",
  goldL: "#D4B07A",
  charcoal: "#1C1C1E",
  slate: "#4A4A52",
  mist: "#E8E4DC",
  white: "#FFFFFF",
  success: "#3D7A5F",
  successL: "#EAF3E8",
  rose: "#8B4A5A",
  roseL: "#F5EAE8",
  info: "#2C6FAC",
  infoL: "#E8F0FA",
  warn: "#7A6530",
  warnL: "#FDF6E8",
};

const injectCSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif;background:${T.ivory};color:${T.charcoal};overflow-x:hidden;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;background-image:radial-gradient(circle at 0% 0%,${T.gold}0d,transparent 42%),radial-gradient(circle at 100% 0%,${T.goldL}0a,transparent 38%);background-attachment:fixed}
::-webkit-scrollbar{width:7px;height:7px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.gold}66;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:${T.gold}}
::selection{background:${T.gold}33;color:${T.charcoal}}
input,textarea,select{font-family:'DM Sans',sans-serif;outline:none;border:1px solid ${T.mist};background:white;color:${T.charcoal};padding:11px 14px;border-radius:10px;font-size:14px;transition:border-color .2s,box-shadow .2s;width:100%}
input:focus,textarea:focus,select:focus{border-color:${T.gold};box-shadow:0 0 0 3px ${T.gold}26}
input::placeholder,textarea::placeholder{color:${T.slate}99}
button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;transition:all .18s}
button:focus-visible,a:focus-visible{outline:2px solid ${T.gold};outline-offset:2px}
a{text-decoration:none;color:inherit}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes ripple{0%{transform:scale(0);opacity:1}100%{transform:scale(2.5);opacity:0}}
@keyframes notifBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.fade-up{animation:fadeUp .55s cubic-bezier(.16,1,.3,1) both}
.fade-in{animation:fadeIn .4s ease both}
.slide-in{animation:slideIn .35s ease both}
.hover-lift{transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s cubic-bezier(.16,1,.3,1)}
.hover-lift:hover{transform:translateY(-4px);box-shadow:0 18px 40px -12px ${T.charcoal}26}
.hover-gold:hover{color:${T.gold}!important}
.nh-btn:not(:disabled):hover{transform:translateY(-2px);filter:brightness(1.04)}
.nh-btn:not(:disabled):active{transform:translateY(0)}
.gold-text{background:linear-gradient(120deg,${T.gold},${T.goldL});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.nav-item{position:relative;transition:background .18s,color .18s}
.nav-item::before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%) scaleY(0);height:60%;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(${T.gold},${T.goldL});transition:transform .22s cubic-bezier(.16,1,.3,1)}
.nav-item:hover{background:${T.gold}0f}
.nav-item.active::before{transform:translateY(-50%) scaleY(1)}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;
if (!document.getElementById("nh-styles")) {
  const s = document.createElement("style");
  s.id = "nh-styles";
  s.textContent = injectCSS;
  document.head.appendChild(s);
}

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// ─── MOCK DATABASE ────────────────────────────────────────────────────────────
const USERS_DB = {
  "demo@newhorizon.com": {
    id: "u1",
    password: "demo123",
    name: "Marcus Johnson",
    avatar: "MJ",
    age: 34,
    state: "TX",
    bio: "Construction worker and father of 2. Looking for genuine connections and support on this journey.",
    offense: "Non-violent",
    releaseYear: 2022,
    interests: ["Cooking", "Sports", "Music", "Faith"],
    verified: true,
    joined: "Jan 2024",
    connections: 12,
    messageCount: 47,
    jobApps: 3,
  },
};

const COMMUNITY = [
  {
    id: "u2",
    name: "Alicia Rivera",
    avatar: "AR",
    age: 29,
    state: "GA",
    bio: "Certified nursing assistant. Believe in second chances and new beginnings.",
    offense: "Drug offense",
    releaseYear: 2023,
    interests: ["Wellness", "Reading", "Travel"],
    online: true,
    lastSeen: "now",
  },
  {
    id: "u3",
    name: "Devon Washington",
    avatar: "DW",
    age: 42,
    state: "FL",
    bio: "Electrician. Mentor in my community. Faith drives everything I do.",
    offense: "Non-violent",
    releaseYear: 2021,
    interests: ["Faith", "Mentoring", "DIY"],
    online: false,
    lastSeen: "2h ago",
  },
  {
    id: "u4",
    name: "Keisha Monroe",
    avatar: "KM",
    age: 31,
    state: "NY",
    bio: "Paralegal student. Turning experience into advocacy for others.",
    offense: "Financial",
    releaseYear: 2022,
    interests: ["Law", "Advocacy", "Art"],
    online: true,
    lastSeen: "now",
  },
  {
    id: "u5",
    name: "Tyrone Bell",
    avatar: "TB",
    age: 38,
    state: "IL",
    bio: "Chef and small business owner. Cooking saved my life.",
    offense: "Non-violent",
    releaseYear: 2020,
    interests: ["Cooking", "Business", "Family"],
    online: false,
    lastSeen: "1d ago",
  },
  {
    id: "u6",
    name: "Sandra Cruz",
    avatar: "SC",
    age: 33,
    state: "CA",
    bio: "Recovery advocate and motivational speaker.",
    offense: "Drug offense",
    releaseYear: 2021,
    interests: ["Advocacy", "Fitness", "Music"],
    online: true,
    lastSeen: "now",
  },
];

const JOBS = [
  {
    id: "j1",
    title: "Warehouse Associate",
    company: "Amazon Logistics",
    logo: "📦",
    location: "Dallas, TX",
    state: "TX",
    type: "Full-time",
    wage: "$18–$21/hr",
    felonyFriendly: true,
    banTheBox: true,
    posted: "2d ago",
    desc: "Receive, store, and ship products. No background disqualification for non-violent offenses.",
    tags: ["Physical", "Team", "Benefits"],
    saved: false,
  },
  {
    id: "j2",
    title: "Electrician Apprentice",
    company: "City Electric Co.",
    logo: "⚡",
    location: "Orlando, FL",
    state: "FL",
    type: "Full-time",
    wage: "$22–$26/hr",
    felonyFriendly: true,
    banTheBox: false,
    posted: "1d ago",
    desc: "Learn the trade under licensed electricians. Union job with full benefits.",
    tags: ["Trade", "Union", "Growth"],
    saved: false,
  },
  {
    id: "j3",
    title: "Culinary Assistant",
    company: "Fresh Start Kitchens",
    logo: "🍳",
    location: "Atlanta, GA",
    state: "GA",
    type: "Part-time",
    wage: "$15–$17/hr",
    felonyFriendly: true,
    banTheBox: true,
    posted: "3d ago",
    desc: "Founded by formerly incarcerated chefs. All backgrounds welcome.",
    tags: ["Nonprofit", "Flexible", "Community"],
    saved: true,
  },
  {
    id: "j4",
    title: "CDL-A Truck Driver",
    company: "Horizon Transport",
    logo: "🚛",
    location: "Houston, TX",
    state: "TX",
    type: "Full-time",
    wage: "$28–$34/hr",
    felonyFriendly: true,
    banTheBox: true,
    posted: "5h ago",
    desc: "Home weekly. We sponsor CDL licensing for qualified candidates.",
    tags: ["License", "Travel", "Benefits"],
    saved: false,
  },
  {
    id: "j5",
    title: "Construction Laborer",
    company: "BuildRight LLC",
    logo: "🏗️",
    location: "New York, NY",
    state: "NY",
    type: "Full-time",
    wage: "$20–$24/hr",
    felonyFriendly: true,
    banTheBox: false,
    posted: "1w ago",
    desc: "Site work, demolition, and general labor. OSHA training provided.",
    tags: ["Physical", "Outdoor", "Training"],
    saved: false,
  },
  {
    id: "j6",
    title: "Data Entry / Admin",
    company: "RemoteWork Inc.",
    logo: "💻",
    location: "Remote",
    state: "Remote",
    type: "Part-time",
    wage: "$14–$16/hr",
    felonyFriendly: true,
    banTheBox: true,
    posted: "2d ago",
    desc: "Flexible hours, fully remote. Laptop provided. Perfect for parole restrictions.",
    tags: ["Remote", "Flexible", "WFH"],
    saved: false,
  },
  {
    id: "j7",
    title: "Peer Support Specialist",
    company: "Hope Reentry Center",
    logo: "🤝",
    location: "Chicago, IL",
    state: "IL",
    type: "Full-time",
    wage: "$17–$20/hr",
    felonyFriendly: true,
    banTheBox: true,
    posted: "4d ago",
    desc: "Lived experience required. Help others navigate the system you know.",
    tags: ["Purpose", "Social Work", "Cert"],
    saved: false,
  },
];

const RESOURCES = {
  parole: [
    {
      name: "National Parole Resource Center",
      url: "https://nationalparoleresource.org",
      tag: "Federal",
      desc: "State-by-state guidelines, rights, and parole board contacts.",
      icon: "⚖️",
    },
    {
      name: "Justice.gov Reentry Hub",
      url: "https://www.justice.gov/reentry",
      tag: "Federal",
      desc: "Official federal programs and financial reentry assistance.",
      icon: "🏛️",
    },
    {
      name: "CSOSA Supervision Services",
      url: "https://www.csosa.gov",
      tag: "DC/Federal",
      desc: "Court supervision, drug testing locations, and case manager contacts.",
      icon: "📋",
    },
    {
      name: "Restore Justice Foundation",
      url: "https://restorejustice.org",
      tag: "Nonprofit",
      desc: "Legal aid, expungement help, and parole board preparation.",
      icon: "🔓",
    },
  ],
  mental: [
    {
      name: "SAMHSA National Helpline",
      url: "https://www.samhsa.gov/find-help/national-helpline",
      tag: "24/7 Free",
      desc: "Free, confidential treatment referrals. Call 1-800-662-4357.",
      icon: "📞",
      urgent: true,
    },
    {
      name: "Crisis Text Line",
      url: "https://www.crisistextline.org",
      tag: "24/7 Text",
      desc: "Text HOME to 741741. Free crisis counseling anytime.",
      icon: "💬",
      urgent: true,
    },
    {
      name: "988 Suicide & Crisis Lifeline",
      url: "https://988lifeline.org",
      tag: "Emergency",
      desc: "Call or text 988. Chat available at 988lifeline.org.",
      icon: "🆘",
      urgent: true,
    },
    {
      name: "Prison Policy Mental Health",
      url: "https://www.prisonpolicy.org/mental-health",
      tag: "Resource",
      desc: "Evidence-based mental health resources for the formerly incarcerated.",
      icon: "🧠",
    },
    {
      name: "Authentic Connections",
      url: "#",
      tag: "Peer Support",
      desc: "Peer-led support groups run by returning citizens, for returning citizens.",
      icon: "🤝",
    },
  ],
  housing: [
    {
      name: "HUD Reentry Housing Program",
      url: "https://www.hud.gov/reentry",
      tag: "Federal",
      desc: "Federal rental and transitional housing assistance.",
      icon: "🏠",
    },
    {
      name: "Volunteers of America",
      url: "https://www.voa.org",
      tag: "National",
      desc: "Transitional housing and long-term reentry programs nationwide.",
      icon: "🏘️",
    },
    {
      name: "Homeward Bound Network",
      url: "#",
      tag: "National",
      desc: "Directory of sober living and transitional homes by state.",
      icon: "📍",
    },
  ],
  education: [
    {
      name: "Pell Grants for Incarcerated",
      url: "https://studentaid.gov/understand-aid/types/grants/pell",
      tag: "Federal Aid",
      desc: "Pell Grant eligibility restored for currently and formerly incarcerated students.",
      icon: "🎓",
    },
    {
      name: "College & Community Fellowship",
      url: "https://collegeandcommunityfellowship.org",
      tag: "Nonprofit",
      desc: "Supporting women with criminal legal histories in higher education.",
      icon: "📚",
    },
    {
      name: "Defy Ventures",
      url: "https://defyventures.org",
      tag: "Business",
      desc: "Entrepreneurship, employment, and character training for returning citizens.",
      icon: "💡",
    },
  ],
};

const SENTENCING = {
  TX: {
    min: 0.25,
    max: 0.5,
    note: "Texas allows 25–50% reduction with good conduct. Violent offenses typically serve 50%+.",
  },
  CA: {
    min: 0.33,
    max: 0.5,
    note: "California: 33–50% with good conduct and completion of CDCR programs.",
  },
  FL: {
    min: 0.15,
    max: 0.85,
    note: "Florida has limited good-time. Most serve 85% of sentence for most offenses.",
  },
  NY: {
    min: 0.33,
    max: 0.5,
    note: "New York: Merit time and good behavior can reduce sentence by up to 1/3.",
  },
  GA: {
    min: 0.5,
    max: 0.9,
    note: "Georgia requires 90% served for violent offenses, 50% for non-violent.",
  },
  IL: {
    min: 0.5,
    max: 0.5,
    note: "Illinois day-for-day: most offenders serve exactly 50% of their sentence.",
  },
  OH: {
    min: 0.35,
    max: 0.5,
    note: "Ohio good-time credit varies by felony class, typically 35–50% reduction.",
  },
  PA: {
    min: 0.33,
    max: 0.5,
    note: "Pennsylvania: minimum must be served before parole eligibility.",
  },
  NC: {
    min: 0.5,
    max: 0.85,
    note: "North Carolina: structured sentencing with presumptive ranges per class.",
  },
  MI: {
    min: 0.33,
    max: 0.5,
    note: "Michigan: parole eligibility at minimum, good time affects max date.",
  },
};

const BLOG_POSTS = [
  {
    id: 1,
    title: "How I Rebuilt My Life After 7 Years Inside",
    author: "Marcus J.",
    authorAvatar: "MJ",
    date: "Apr 2, 2025",
    category: "Story",
    readTime: "6 min",
    likes: 247,
    comments: 34,
    img: "✊",
    excerpt:
      "Nobody tells you how hard the first 90 days are. The world moved on without you — and now you have to catch up while everyone watches.",
  },
  {
    id: 2,
    title: "Know Your Rights: Parole Violations Explained",
    author: "Keisha M.",
    authorAvatar: "KM",
    date: "Mar 18, 2025",
    category: "Legal",
    readTime: "8 min",
    likes: 189,
    comments: 22,
    img: "⚖️",
    excerpt:
      "Understanding what constitutes a true violation — versus what doesn't — can be the difference between freedom and revocation. A paralegal student breaks it down.",
  },
  {
    id: 3,
    title: "5 Companies That Truly Hire Felons in 2025",
    author: "Editorial",
    authorAvatar: "NH",
    date: "Apr 10, 2025",
    category: "Jobs",
    readTime: "5 min",
    likes: 412,
    comments: 58,
    img: "💼",
    excerpt:
      "Beyond the checkbox. These companies have cultures of second chances — not just policies — and their employees prove it every day.",
  },
  {
    id: 4,
    title: "Managing Trauma After Incarceration: What Research Shows",
    author: "Dr. A. Williams",
    authorAvatar: "AW",
    date: "Feb 28, 2025",
    category: "Mental Health",
    readTime: "10 min",
    likes: 321,
    comments: 41,
    img: "🧠",
    excerpt:
      "Post-Incarceration Syndrome is real. Here's what the science actually says about trauma responses, and what actually helps versus what doesn't.",
  },
  {
    id: 5,
    title: "Getting Your Record Expunged: A State-by-State Guide",
    author: "Legal Aid Team",
    authorAvatar: "LA",
    date: "Mar 5, 2025",
    category: "Legal",
    readTime: "12 min",
    likes: 534,
    comments: 67,
    img: "📜",
    excerpt:
      "Expungement can open doors to housing, employment, and more. This guide covers eligibility criteria, timelines, and costs for all 50 states.",
  },
  {
    id: 6,
    title: "Building a Small Business from a Felony Record",
    author: "Tyrone B.",
    authorAvatar: "TB",
    date: "Jan 15, 2025",
    category: "Business",
    readTime: "7 min",
    likes: 178,
    comments: 29,
    img: "🍳",
    excerpt:
      "They said no one would hire me. So I hired myself. Here's exactly how I got my restaurant license and first loan with a felony on my record.",
  },
];

const DEMO_MESSAGES = {
  u2: [
    {
      from: "them",
      text: "Hey! I saw you're in Texas too. How long have you been out?",
      time: "2:14 PM",
    },
  ],
  u3: [
    {
      from: "them",
      text: "Brother, faith is what kept me going. Stay strong.",
      time: "Yesterday",
    },
  ],
  u4: [
    {
      from: "them",
      text: "Check out this legal resource — might help with your expungement!",
      time: "Mon",
    },
  ],
};

const hasConfiguredValue = (value, placeholder) =>
  Boolean(value && value !== placeholder);
const BACKEND_READY =
  hasConfiguredValue(
    import.meta.env.VITE_SUPABASE_URL,
    "https://YOUR_PROJECT.supabase.co",
  ) &&
  (hasConfiguredValue(
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    "YOUR_ANON_KEY",
  ) ||
    hasConfiguredValue(
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "sb_publishable_xxxxxxxxxxxxxxxxxxxx",
    ));

const initialsFromName = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "NH";

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return "now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShortDate(value);
}

function normalizeProfile(profile = {}) {
  return {
    id: profile.id || profile.auth_id || `u_${Date.now()}`,
    email: profile.email || "",
    name: profile.name || "New Horizon Member",
    avatar: profile.avatar || initialsFromName(profile.name),
    age: profile.age || "",
    state: profile.state || "",
    bio: profile.bio || "",
    offense: profile.offense || profile.offense_type || "Prefer not to say",
    releaseYear: profile.releaseYear || profile.release_year || "",
    interests: profile.interests || [],
    verified: Boolean(profile.verified || profile.is_verified),
    joined: profile.joined || formatShortDate(profile.created_at) || "Recently",
    connections: profile.connections || 0,
    messageCount: profile.messageCount || 0,
    jobApps: profile.jobApps || 0,
    notifications: profile.notifications ?? true,
    publicProfile: profile.publicProfile ?? profile.public_profile ?? true,
    showState: profile.showState ?? true,
  };
}

function normalizeCommunityMember(profile = {}) {
  return {
    id: profile.id,
    name: profile.name || "Community Member",
    avatar: profile.avatar || initialsFromName(profile.name),
    age: profile.age || "",
    state: profile.state || "",
    bio: profile.bio || "Building a new chapter with the community.",
    offense: profile.offense || profile.offense_type || "Prefer not to say",
    releaseYear: profile.releaseYear || profile.release_year || "",
    interests: profile.interests || [],
    online: Boolean(profile.online),
    lastSeen: profile.lastSeen || formatRelative(profile.last_seen),
  };
}

function normalizeJob(job = {}, savedIds = new Set()) {
  return {
    id: job.id,
    title: job.title || "Untitled Role",
    company: job.company || "New Horizon Partner",
    logo: job.logo || "💼",
    location:
      job.location ||
      [job.city, job.state].filter(Boolean).join(", ") ||
      job.state ||
      "Remote",
    state: job.state || "Remote",
    type: job.type || job.job_type || "Full-time",
    wage: job.wage || job.compensation || "Competitive pay",
    felonyFriendly: job.felonyFriendly ?? job.felony_friendly ?? true,
    banTheBox: job.banTheBox ?? job.ban_the_box ?? false,
    posted: job.posted || formatRelative(job.created_at),
    desc:
      job.desc || job.description || "Open opportunity for returning citizens.",
    tags: job.tags || [job.job_type, job.state].filter(Boolean),
    saved: savedIds.has(job.id),
  };
}

function normalizeBlogPost(post = {}) {
  return {
    id: post.id,
    title: post.title || "Untitled Story",
    author: post.author?.name || post.author || "New Horizon",
    authorAvatar: post.author?.avatar || post.authorAvatar || "NH",
    date: post.date || formatShortDate(post.published_at || post.created_at),
    category: post.category || "Story",
    readTime:
      post.readTime ||
      `${Math.max(4, Math.ceil((post.content?.length || post.excerpt?.length || 500) / 250))} min`,
    likes: post.likes ?? post.like_count ?? 0,
    comments: post.comments ?? post.comment_count ?? 0,
    img: post.img || "📰",
    excerpt:
      post.excerpt ||
      post.summary ||
      post.content?.slice(0, 180) ||
      "Community insight from New Horizon.",
  };
}

// ─── UTILITY COMPONENTS ───────────────────────────────────────────────────────
const Avatar = ({ initials, size = 40, color = T.gold, online = false }) => (
  <div style={{ position: "relative", flexShrink: 0 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg,${color},${T.goldL})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 600,
        fontSize: size * 0.3,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
    {online && (
      <div
        style={{
          position: "absolute",
          bottom: 1,
          right: 1,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: T.success,
          border: "2px solid white",
        }}
      />
    )}
  </div>
);

const Btn = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  full = false,
  disabled = false,
  loading = false,
}) => {
  const styles = {
    primary: {
      background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
      color: "white",
      border: "none",
      boxShadow: `0 8px 20px -8px ${T.gold}99`,
    },
    outline: {
      background: "transparent",
      color: T.gold,
      border: `1.5px solid ${T.gold}`,
    },
    ghost: {
      background: "transparent",
      color: T.slate,
      border: `1px solid ${T.mist}`,
    },
    danger: {
      background: T.rose,
      color: "white",
      border: "none",
      boxShadow: `0 8px 20px -8px ${T.rose}80`,
    },
    success: {
      background: T.success,
      color: "white",
      border: "none",
      boxShadow: `0 8px 20px -8px ${T.success}80`,
    },
  };
  const sizes = { sm: "7px 14px", md: "10px 22px", lg: "13px 30px" };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="nh-btn"
      style={{
        ...styles[variant],
        padding: sizes[size],
        borderRadius: 10,
        fontWeight: 500,
        fontSize: size === "sm" ? 12 : 14,
        width: full ? "100%" : "auto",
        opacity: disabled || loading ? 0.6 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      {loading && (
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: `2px solid rgba(255,255,255,.3)`,
            borderTopColor: "white",
            animation: "spin .7s linear infinite",
            display: "inline-block",
          }}
        />
      )}
      {children}
    </button>
  );
};

const Badge = ({ children, color = T.gold, bg }) => (
  <span
    style={{
      background: bg || color + "18",
      color,
      border: `1px solid ${color}30`,
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 500,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const Card = ({ children, style = {}, className = "" }) => (
  <div
    className={`hover-lift ${className}`}
    style={{
      background: "white",
      borderRadius: 16,
      border: `1px solid ${T.mist}`,
      padding: 24,
      ...style,
    }}
  >
    {children}
  </div>
);

const Toast = ({ msg, type = "success", onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = {
    success: [T.success, T.successL],
    error: [T.rose, T.roseL],
    info: [T.info, T.infoL],
  };
  const [fg, bg] = colors[type] || colors.success;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        background: bg,
        border: `1px solid ${fg}40`,
        color: fg,
        padding: "14px 20px",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,.12)",
        fontSize: 14,
        fontWeight: 500,
        animation: "slideIn .3s ease",
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 320,
      }}
    >
      <span>{type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          color: fg,
          fontSize: 16,
          padding: "0 4px",
        }}
      >
        ×
      </button>
    </div>
  );
};

const Modal = ({ children, onClose, title }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 500,
      background: "rgba(0,0,0,.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      style={{
        background: "white",
        borderRadius: 20,
        padding: 32,
        width: "100%",
        maxWidth: 480,
        animation: "fadeUp .3s ease",
        boxShadow: "0 24px 64px rgba(0,0,0,.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          {title}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: T.mist,
            border: "none",
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
      {children}
    </div>
  </div>
);

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: `3px solid ${T.mist}`,
        borderTopColor: T.gold,
        animation: "spin .8s linear infinite",
      }}
    />
  </div>
);

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthPage({ onAuth, backendReady }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      await onAuth({ mode, form });
    } catch (error) {
      if (!backendReady) {
        try {
          const u = USERS_DB[form.email];
          if (mode === "login") {
            if (!u || u.password !== form.password)
              throw new Error("Invalid email or password.");
            await onAuth({ mode: "demo-login", user: u });
            return;
          }
          if (!form.name || !form.email || !form.password)
            throw new Error("All fields required.");
          if (form.password !== form.confirmPassword)
            throw new Error("Passwords don't match.");
          const newUser = normalizeProfile({
            id: `u_${Date.now()}`,
            name: form.name,
            email: form.email,
            avatar: initialsFromName(form.name),
            offense: "Prefer not to say",
            joined: "Apr 2025",
          });
          await onAuth({ mode: "demo-register", user: newUser });
          return;
        } catch (demoError) {
          setErr(demoError.message || "Something went wrong.");
          return;
        }
      }
      setErr(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: T.ivory }}>
      {/* Left panel */}
      <div
        style={{
          flex: 1,
          background: `linear-gradient(160deg,${T.charcoal},#2C2C30)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {[280, 440, 600].map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: s,
              height: s,
              borderRadius: "50%",
              border: `1px solid ${T.gold}${i === 0 ? "25" : i === 1 ? "15" : "08"}`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
            }}
          />
        ))}
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 48,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 18,
                boxShadow: `0 8px 20px -6px ${T.gold}80`,
                animation: "float 5s ease-in-out infinite",
              }}
            >
              ✦
            </div>
            <span
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 22,
                color: "white",
                fontWeight: 600,
              }}
            >
              New Horizon
            </span>
          </div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 44,
              fontWeight: 300,
              color: "white",
              lineHeight: 1.15,
              marginBottom: 20,
            }}
          >
            Your Next Chapter
            <br />
            <em className="gold-text">Begins Today</em>
          </h2>
          <p
            style={{
              color: "#9A9AAA",
              fontSize: 15,
              lineHeight: 1.8,
              maxWidth: 360,
            }}
          >
            A dignified space for returning citizens to connect, find work,
            access resources, and rebuild — without judgment.
          </p>
          <div
            style={{
              marginTop: 40,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {[
              ["12,400+", "Members"],
              ["850+", "Jobs Posted"],
              ["48", "States"],
              ["94%", "Found Help"],
            ].map(([n, l]) => (
              <div
                key={l}
                className="hover-lift"
                style={{
                  background: "rgba(255,255,255,.06)",
                  borderRadius: 12,
                  padding: "14px 18px",
                  border: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 26,
                    fontWeight: 600,
                    color: T.gold,
                  }}
                >
                  {n}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#7A7A8A",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          width: 460,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 48px",
          background: "white",
        }}
      >
        <h3
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 30,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {mode === "login" ? "Welcome Back" : "Join New Horizon"}
        </h3>
        <p style={{ color: T.slate, fontSize: 14, marginBottom: 32 }}>
          {mode === "login"
            ? "Sign in to your account to continue."
            : "Create your free account today."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Full Name
              </label>
              <input
                placeholder="Your full name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
          )}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          {mode === "register" && (
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
              />
            </div>
          )}

          {err && (
            <div
              style={{
                background: T.roseL,
                color: T.rose,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}

          <Btn onClick={submit} loading={loading} full size="lg">
            {mode === "login" ? "Sign In" : "Create Account"}
          </Btn>
        </div>

        {mode === "login" && (
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <span style={{ fontSize: 12, color: T.slate }}>Demo: </span>
            <button
              onClick={() => {
                set("email", "demo@newhorizon.com");
                set("password", "demo123");
              }}
              style={{
                background: "none",
                color: T.gold,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Use demo account
            </button>
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 14,
            color: T.slate,
          }}
        >
          {mode === "login"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErr("");
            }}
            style={{ background: "none", color: T.gold, fontWeight: 500 }}
          >
            {mode === "login" ? "Sign Up Free" : "Sign In"}
          </button>
        </div>

        <div
          style={{
            marginTop: 28,
            padding: "14px 16px",
            background: T.ivory,
            borderRadius: 10,
            border: `1px solid ${T.mist}`,
            fontSize: 12,
            color: T.slate,
            lineHeight: 1.6,
            display: "flex",
            gap: 8,
          }}
        >
          <span>🔒</span>
          <span>
            {backendReady
              ? "Your data is encrypted and synced to your New Horizon account."
              : "Demo mode is active until Supabase keys are added. Background check history is private and never shown publicly."}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "Dashboard", icon: "⊞", label: "Dashboard" },
  { id: "Connect", icon: "♡", label: "Connect" },
  { id: "Messages", icon: "✉", label: "Messages" },
  { id: "Jobs", icon: "💼", label: "Jobs" },
  { id: "Resources", icon: "🔗", label: "Resources" },
  { id: "Calculator", icon: "📊", label: "Calculator" },
  { id: "Blog", icon: "📰", label: "Blog" },
  { id: "Profile", icon: "◯", label: "Profile" },
];

function SideNav({ page, setPage, user, notifs }) {
  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: "white",
        borderRight: `1px solid ${T.mist}`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div
        style={{
          padding: "20px 20px 12px",
          borderBottom: `1px solid ${T.mist}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `linear-gradient(135deg,${T.gold},${T.goldL})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 16,
            }}
          >
            ✦
          </div>
          <span
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            New Horizon
          </span>
        </div>
      </div>

      <div style={{ padding: "12px 10px", flex: 1, overflowY: "auto" }}>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            className={`nav-item${page === n.id ? " active" : ""}`}
            aria-current={page === n.id ? "page" : undefined}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              background: page === n.id ? T.gold + "14" : "transparent",
              color: page === n.id ? T.gold : T.slate,
              fontWeight: page === n.id ? 600 : 400,
              fontSize: 14,
              marginBottom: 2,
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>
              {n.icon}
            </span>
            {n.label}
            {n.id === "Messages" && notifs > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: T.rose,
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 10,
                }}
              >
                {notifs}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.mist}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar initials={user?.avatar || "?"} size={32} />
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: T.slate }}>Active member</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, setPage, unread }) {
  const stats = [
    {
      label: "Profile Views",
      val: 142,
      icon: "👁",
      trend: "+12 this week",
      color: T.info,
    },
    {
      label: "Connections",
      val: user?.connections || 12,
      icon: "🤝",
      trend: "3 new matches",
      color: T.success,
    },
    {
      label: "Job Applications",
      val: user?.jobApps || 3,
      icon: "💼",
      trend: "1 interview set",
      color: T.gold,
    },
    {
      label: "Messages",
      val: user?.messageCount || 47,
      icon: "✉",
      trend: `${unread || 0} unread`,
      color: T.rose,
    },
  ];
  const quickLinks = [
    {
      label: "Complete Profile",
      desc: "80% done — finish for more matches",
      icon: "◯",
      page: "Profile",
      urgent: true,
    },
    {
      label: "Apply to Jobs",
      desc: "6 new listings match your profile",
      icon: "💼",
      page: "Jobs",
    },
    {
      label: "Sentence Calculator",
      desc: "Estimate your release timeline",
      icon: "📊",
      page: "Calculator",
    },
    {
      label: "Find Support",
      desc: "Mental health & parole resources",
      icon: "🔗",
      page: "Resources",
    },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1000, margin: "0 auto" }}>
      <div
        className="fade-up"
        style={{
          marginBottom: 32,
          background: `linear-gradient(135deg,${T.charcoal},#2C2C30)`,
          borderRadius: 18,
          padding: "30px 32px",
          position: "relative",
          overflow: "hidden",
          boxShadow: `0 18px 40px -16px ${T.charcoal}40`,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -60,
            top: "50%",
            transform: "translateY(-50%)",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: `radial-gradient(circle,${T.gold}33,transparent 70%)`,
          }}
        />
        <div style={{ position: "relative" }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: T.goldL,
              fontWeight: 500,
            }}
          >
            New Horizon
          </span>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 38,
              fontWeight: 300,
              margin: "8px 0 6px",
              color: "white",
            }}
          >
            {greeting},{" "}
            <em className="gold-text">{user?.name?.split(" ")[0]}</em>
          </h1>
          <p style={{ color: "#B6B6C4", fontSize: 15 }}>
            Here's what's happening in your community today.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="hover-lift"
            style={{
              background: "white",
              borderRadius: 14,
              padding: "18px 20px",
              border: `1px solid ${T.mist}`,
              boxShadow: `0 4px 14px -8px ${T.charcoal}1f`,
              animation: `fadeUp .5s ${i * 0.08}s ease both`,
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
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span
                style={{
                  fontSize: 11,
                  color: s.color,
                  background: s.color + "15",
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontWeight: 500,
                }}
              >
                ↑
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 32,
                fontWeight: 600,
                color: T.charcoal,
                marginBottom: 2,
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: T.charcoal,
                marginBottom: 2,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 11, color: T.slate }}>{s.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Quick Links */}
        <div>
          <h3
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            Quick Actions
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {quickLinks.map((q, i) => (
              <button
                key={i}
                onClick={() => setPage(q.page)}
                style={{
                  background: "white",
                  border: `1px solid ${q.urgent ? T.gold + "60" : T.mist}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  cursor: "pointer",
                  textAlign: "left",
                  animation: `fadeUp .5s ${i * 0.07}s ease both`,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: q.urgent ? T.gold + "15" : T.ivory,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {q.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 2,
                      color: q.urgent ? T.gold : T.charcoal,
                    }}
                  >
                    {q.label}
                  </div>
                  <div style={{ fontSize: 12, color: T.slate }}>{q.desc}</div>
                </div>
                <span
                  style={{ marginLeft: "auto", color: T.slate, fontSize: 16 }}
                >
                  →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Community Activity */}
        <div>
          <h3
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            Community Activity
          </h3>
          <div
            style={{
              background: "white",
              borderRadius: 14,
              border: `1px solid ${T.mist}`,
              overflow: "hidden",
            }}
          >
            {[
              {
                avatar: "KM",
                name: "Keisha M.",
                action: "posted a new legal guide",
                time: "2m ago",
                color: "#6B4A8A",
              },
              {
                avatar: "DW",
                name: "Devon W.",
                action: "is now connected with 3 people",
                time: "14m ago",
                color: "#2C6FAC",
              },
              {
                avatar: "AR",
                name: "Alicia R.",
                action: "shared a job at Fresh Start Kitchens",
                time: "1h ago",
                color: "#3D7A5F",
              },
              {
                avatar: "TB",
                name: "Tyrone B.",
                action: "published a new blog post",
                time: "3h ago",
                color: "#B8975A",
              },
              {
                avatar: "SC",
                name: "Sandra C.",
                action: "found housing through our Resources page",
                time: "5h ago",
                color: "#8B4A5A",
              },
            ].map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < 4 ? `1px solid ${T.mist}` : "none",
                }}
              >
                <Avatar initials={a.avatar} size={32} color={a.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {a.name}
                  </span>
                  <span style={{ fontSize: 13, color: T.slate }}>
                    {" "}
                    {a.action}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: T.slate, flexShrink: 0 }}>
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motivational banner */}
      <div
        style={{
          marginTop: 24,
          padding: "24px 28px",
          borderRadius: 16,
          background: `linear-gradient(135deg,${T.charcoal},#2A2A2E)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          animation: "fadeUp .6s .3s ease both",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 20,
              color: "white",
              fontWeight: 300,
              fontStyle: "italic",
              marginBottom: 6,
            }}
          >
            "Every day above ground is a good day."
          </div>
          <div style={{ fontSize: 12, color: "#7A7A8A" }}>
            New Horizon Community · Daily Affirmation
          </div>
        </div>
        <Btn variant="outline" size="sm" onClick={() => setPage("Connect")}>
          Find Your People →
        </Btn>
      </div>
    </div>
  );
}

// ─── CONNECT / DATING ─────────────────────────────────────────────────────────
function ConnectPage({ setPage, setChatUser, community, user, backendReady }) {
  const [filter, setFilter] = useState({ state: "All", interest: "All" });
  const [liked, setLiked] = useState(new Set());
  const [toast, setToast] = useState(null);
  const people = community.filter((u) => u.id !== user?.id);
  const allInterests = useMemo(
    () => ["All", ...new Set(people.flatMap((u) => u.interests || []))],
    [people],
  );
  const stateOptions = useMemo(
    () => ["All", ...new Set(people.map((u) => u.state).filter(Boolean))],
    [people],
  );
  const filtered = people.filter(
    (u) =>
      (filter.state === "All" || u.state === filter.state) &&
      (filter.interest === "All" || u.interests.includes(filter.interest)),
  );

  const like = (u) => {
    setLiked((p) => {
      const n = new Set(p);
      n.has(u.id) ? n.delete(u.id) : n.add(u.id);
      return n;
    });
    if (!liked.has(u.id))
      setToast(`You liked ${u.name.split(" ")[0]}'s profile!`);
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 38,
            fontWeight: 300,
            marginBottom: 6,
          }}
        >
          Connect with <em style={{ color: T.gold }}>Others</em>
        </h1>
        <p style={{ color: T.slate }}>
          Meet people who understand your journey. Filter by state or shared
          interests.
        </p>
      </div>

      {/* Filters */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "white",
            padding: 4,
            borderRadius: 10,
            border: `1px solid ${T.mist}`,
          }}
        >
          {stateOptions.map((s) => (
            <button
              key={s}
              onClick={() => setFilter((f) => ({ ...f, state: s }))}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                border: "none",
                background: filter.state === s ? T.gold : "transparent",
                color: filter.state === s ? "white" : T.slate,
                fontSize: 13,
                fontWeight: filter.state === s ? 500 : 400,
              }}
            >
              {s === "All" ? "All States" : s}
            </button>
          ))}
        </div>
        <select
          style={{ width: "auto", padding: "8px 14px", borderRadius: 10 }}
          value={filter.interest}
          onChange={(e) =>
            setFilter((f) => ({ ...f, interest: e.target.value }))
          }
        >
          {allInterests.map((i) => (
            <option key={i}>{i === "All" ? "All Interests" : i}</option>
          ))}
        </select>
      </div>

      {backendReady && (
        <div
          style={{
            marginBottom: 18,
            padding: "10px 14px",
            background: T.infoL,
            border: `1px solid ${T.info}25`,
            color: T.info,
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          Community profiles are loading from Supabase.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 18,
        }}
      >
        {filtered.map((u, i) => (
          <div
            key={u.id}
            style={{
              background: "white",
              borderRadius: 16,
              border: `1px solid ${T.mist}`,
              overflow: "hidden",
              animation: `fadeUp .5s ${i * 0.07}s ease both`,
              transition: "transform .22s,box-shadow .22s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            {/* Card header */}
            <div
              style={{
                height: 64,
                background: `linear-gradient(135deg,${T.cream},${T.mist})`,
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", bottom: -22, left: 18 }}>
                <Avatar initials={u.avatar} size={48} online={u.online} />
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 12,
                  fontSize: 11,
                  color: T.slate,
                  background: "white",
                  padding: "3px 8px",
                  borderRadius: 10,
                  border: `1px solid ${T.mist}`,
                }}
              >
                {u.online ? (
                  <span style={{ color: T.success }}>● Online</span>
                ) : (
                  u.lastSeen
                )}
              </div>
            </div>
            <div style={{ padding: "28px 18px 18px" }}>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: T.slate }}>
                  {u.age} · {u.state} · Out since {u.releaseYear}
                </div>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: T.slate,
                  lineHeight: 1.6,
                  marginBottom: 12,
                  minHeight: 52,
                }}
              >
                {u.bio}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 5,
                  marginBottom: 14,
                }}
              >
                {u.interests.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  size="sm"
                  onClick={() => {
                    setChatUser(u);
                    setPage("Messages");
                  }}
                >
                  Message
                </Btn>
                <button
                  onClick={() => like(u)}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 8,
                    border: `1px solid ${liked.has(u.id) ? T.rose : T.mist}`,
                    background: liked.has(u.id) ? T.roseL : "transparent",
                    color: liked.has(u.id) ? T.rose : T.slate,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {liked.has(u.id) ? "♥ Liked" : "♡ Like"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div
          style={{ textAlign: "center", padding: "40px 24px", color: T.slate }}
        >
          No community profiles match the current filters yet.
        </div>
      )}
    </div>
  );
}

// ─── MESSAGES / REAL-TIME CHAT ────────────────────────────────────────────────
function MessagesPage({
  user,
  chatUser,
  setChatUser,
  community,
  backendReady,
  refreshUnread,
}) {
  const [conversations, setConversations] = useState(DEMO_MESSAGES);
  const [conversationList, setConversationList] = useState(
    community.slice(0, 4),
  );
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);
  const activePeer = chatUser || conversationList[0] || community[0];
  const msgs = conversations[activePeer?.id] || [];

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, activePeer]);

  useEffect(() => {
    setConversationList(community.slice(0, 8));
  }, [community]);

  useEffect(() => {
    if (!backendReady || !user?.id || !activePeer?.id) return;
    let cancelled = false;
    const loadConversation = async () => {
      setLoading(true);
      try {
        const data = await MessageService.getMessages(user.id, activePeer.id);
        if (cancelled) return;
        setConversations((p) => ({
          ...p,
          [activePeer.id]: (data || []).map((m) => ({
            from: m.sender_id === user.id ? "me" : "them",
            text: m.content,
            time: formatRelative(m.created_at),
          })),
        }));
        refreshUnread?.();
      } catch {
        if (!cancelled) {
          setConversations((p) => ({
            ...p,
            [activePeer.id]:
              p[activePeer.id] || DEMO_MESSAGES[activePeer.id] || [],
          }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadConversation();
    return () => {
      cancelled = true;
    };
  }, [activePeer?.id, backendReady, refreshUnread, user?.id]);

  const sendMsg = async () => {
    if (!input.trim()) return;
    const draft = input;
    const newMsg = { from: "me", text: draft, time: "Now" };
    setConversations((p) => ({
      ...p,
      [activePeer.id]: [...(p[activePeer.id] || []), newMsg],
    }));
    setInput("");
    if (backendReady && user?.id && activePeer?.id) {
      try {
        await MessageService.sendMessage(user.id, activePeer.id, draft);
        refreshUnread?.();
        return;
      } catch {
        setConversations((p) => ({
          ...p,
          [activePeer.id]: (p[activePeer.id] || []).slice(0, -1),
        }));
      }
    }
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const replies = [
        "That's really encouraging to hear!",
        "I totally understand. Keep your head up.",
        "Let's connect sometime this week!",
        "That resource was super helpful for me too.",
        "You've got this. One day at a time.",
      ];
      setConversations((p) => ({
        ...p,
        [activePeer.id]: [
          ...(p[activePeer.id] || []),
          {
            from: "them",
            text: replies[Math.floor(Math.random() * replies.length)],
            time: "Now",
          },
        ],
      }));
    }, 1500);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 0px)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 280,
          borderRight: `1px solid ${T.mist}`,
          background: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 16px 12px",
            borderBottom: `1px solid ${T.mist}`,
          }}
        >
          <h2
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            Messages
          </h2>
          <div style={{ marginTop: 10, position: "relative" }}>
            <input
              placeholder="Search conversations..."
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.slate,
                fontSize: 13,
              }}
            >
              🔍
            </span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversationList.map((u) => (
            <button
              key={u.id}
              onClick={() => setChatUser(u)}
              style={{
                width: "100%",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background:
                  activePeer?.id === u.id ? T.gold + "10" : "transparent",
                border: "none",
                borderBottom: `1px solid ${T.mist}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Avatar initials={u.avatar} size={38} online={u.online} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontSize: 14, fontWeight: 500, color: T.charcoal }}
                  >
                    {u.name.split(" ")[0]}
                  </span>
                  <span style={{ fontSize: 11, color: T.slate }}>
                    {(conversations[u.id] || []).slice(-1)[0]?.time || ""}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: T.slate,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {(conversations[u.id] || []).slice(-1)[0]?.text ||
                    "Start a conversation"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: T.ivory,
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: "14px 20px",
            background: "white",
            borderBottom: `1px solid ${T.mist}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Avatar
            initials={activePeer?.avatar || "?"}
            size={40}
            online={activePeer?.online}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {activePeer?.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: activePeer?.online ? T.success : T.slate,
              }}
            >
              {activePeer?.online
                ? "● Online now"
                : `Last seen ${activePeer?.lastSeen}`}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              style={{
                background: T.ivory,
                border: `1px solid ${T.mist}`,
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                color: T.slate,
              }}
            >
              View Profile
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {loading && (
            <div style={{ color: T.slate, fontSize: 13 }}>
              Loading conversation...
            </div>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.from === "me" ? "flex-end" : "flex-start",
                animation: "fadeIn .3s ease",
              }}
            >
              {m.from === "them" && (
                <div style={{ marginRight: 8, alignSelf: "flex-end" }}>
                  <Avatar initials={activePeer?.avatar || "?"} size={28} />
                </div>
              )}
              <div>
                <div
                  style={{
                    background:
                      m.from === "me"
                        ? `linear-gradient(135deg,${T.gold},${T.goldL})`
                        : "white",
                    color: m.from === "me" ? "white" : T.charcoal,
                    padding: "10px 16px",
                    borderRadius:
                      m.from === "me"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    maxWidth: 360,
                    fontSize: 14,
                    lineHeight: 1.55,
                    boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                  }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.slate,
                    marginTop: 3,
                    textAlign: m.from === "me" ? "right" : "left",
                  }}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar initials={activePeer?.avatar || "?"} size={28} />
              <div
                style={{
                  background: "white",
                  padding: "10px 16px",
                  borderRadius: "18px 18px 18px 4px",
                  boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                }}
              >
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: T.slate,
                        animation: `pulse .8s ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "12px 20px",
            background: "white",
            borderTop: `1px solid ${T.mist}`,
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${activePeer?.name?.split(" ")[0]}...`}
            rows={1}
            style={{
              resize: "none",
              flex: 1,
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 14,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMsg();
              }
            }}
          />
          <Btn onClick={sendMsg} size="sm">
            Send ↑
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── JOBS PAGE ────────────────────────────────────────────────────────────────
function JobsPage({ user, jobs, setJobs, backendReady }) {
  const [filters, setFilters] = useState({
    state: "All",
    type: "All",
    search: "",
  });
  const [applying, setApplying] = useState(null);
  const [applied, setApplied] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const filtered = jobs.filter((j) => {
    if (
      filters.state !== "All" &&
      j.state !== filters.state &&
      j.state !== "Remote"
    )
      return false;
    if (filters.type !== "All" && j.type !== filters.type) return false;
    if (
      filters.search &&
      !j.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      !j.company.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  const toggleSave = async (id) => {
    const target = jobs.find((j) => j.id === id);
    const nextSaved = !target?.saved;
    setJobs((p) =>
      p.map((j) => (j.id === id ? { ...j, saved: nextSaved } : j)),
    );
    if (!backendReady || !user?.id) return;
    try {
      if (nextSaved) {
        await JobService.saveJob(user.id, id);
      } else {
        await JobService.unsaveJob(user.id, id);
      }
    } catch {
      setJobs((p) =>
        p.map((j) => (j.id === id ? { ...j, saved: !nextSaved } : j)),
      );
    }
  };

  const apply = async (job) => {
    setApplying(job.id);
    try {
      if (backendReady && user?.id) {
        await JobService.applyToJob(user.id, job.id);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }
      setApplied((p) => new Set([...p, job.id]));
      setModal(null);
      setToast(`Application sent to ${job.company}!`);
    } catch (error) {
      setToast(error.message || "Could not submit the application.");
    } finally {
      setApplying(null);
    }
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1000, margin: "0 auto" }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      {modal && (
        <Modal
          title={`Apply to ${modal.company}`}
          onClose={() => setModal(null)}
        >
          <div
            style={{
              display: "flex",
              gap: 14,
              marginBottom: 20,
              padding: "14px 16px",
              background: T.ivory,
              borderRadius: 10,
            }}
          >
            <span style={{ fontSize: 28 }}>{modal.logo}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{modal.title}</div>
              <div style={{ fontSize: 13, color: T.slate }}>
                {modal.company} · {modal.location} · {modal.wage}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Full Name
              </label>
              <input defaultValue={user?.name || ""} />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Email Address
              </label>
              <input placeholder="your@email.com" />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Phone Number
              </label>
              <input placeholder="(555) 000-0000" />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Brief Introduction
              </label>
              <textarea
                rows={3}
                placeholder="Tell them why you're a great fit..."
              />
            </div>
            <div
              style={{
                padding: "10px 14px",
                background: T.infoL,
                borderRadius: 8,
                fontSize: 12,
                color: T.info,
              }}
            >
              ℹ By applying, you're authorizing us to share your profile with
              this employer. Felony history is disclosed per your preferences.
            </div>
            <Btn
              full
              onClick={() => apply(modal)}
              loading={applying === modal.id}
            >
              Submit Application
            </Btn>
          </div>
        </Modal>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 38,
            fontWeight: 300,
            marginBottom: 6,
          }}
        >
          Felony-Friendly <em style={{ color: T.gold }}>Jobs</em>
        </h1>
        <p style={{ color: T.slate }}>
          Every listing is from employers who actively welcome returning
          citizens.
        </p>
      </div>

      {/* Search & Filters */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 14,
            }}
          >
            🔍
          </span>
          <input
            placeholder="Search jobs or companies..."
            style={{ paddingLeft: 36 }}
            value={filters.search}
            onChange={(e) => setF("search", e.target.value)}
          />
        </div>
        <select
          style={{ width: 150 }}
          value={filters.state}
          onChange={(e) => setF("state", e.target.value)}
        >
          <option value="All">All Locations</option>
          {["TX", "FL", "GA", "NY", "IL", "CA", "Remote"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          style={{ width: 140 }}
          value={filters.type}
          onChange={(e) => setF("type", e.target.value)}
        >
          <option value="All">All Types</option>
          <option>Full-time</option>
          <option>Part-time</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((j, i) => (
          <div
            key={j.id}
            style={{
              background: "white",
              borderRadius: 14,
              border: `1px solid ${applied.has(j.id) ? T.success + "50" : T.mist}`,
              padding: "20px 24px",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              animation: `fadeUp .4s ${i * 0.06}s ease both`,
              transition: "box-shadow .2s,transform .2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.07)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "";
              e.currentTarget.style.transform = "";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: T.ivory,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0,
                border: `1px solid ${T.mist}`,
              }}
            >
              {j.logo}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{j.title}</h3>
                {j.banTheBox && <Badge color={T.success}>Ban the Box ✓</Badge>}
                {applied.has(j.id) && (
                  <Badge color={T.success}>✓ Applied</Badge>
                )}
              </div>
              <div style={{ fontSize: 13, color: T.slate, marginBottom: 6 }}>
                {j.company} · {j.location} · {j.posted}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: T.slate,
                  lineHeight: 1.5,
                  marginBottom: 10,
                }}
              >
                {j.desc}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {j.tags.map((t) => (
                  <Badge key={t} color={T.slate}>
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: T.charcoal }}>
                {j.wage}
              </div>
              <div style={{ fontSize: 12, color: T.slate }}>{j.type}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button
                  onClick={() => toggleSave(j.id)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${j.saved ? T.gold : T.mist}`,
                    background: j.saved ? T.gold + "15" : "white",
                    fontSize: 14,
                    cursor: "pointer",
                    color: j.saved ? T.gold : T.slate,
                  }}
                >
                  {j.saved ? "★" : "☆"}
                </button>
                <Btn
                  size="sm"
                  variant={applied.has(j.id) ? "ghost" : "primary"}
                  onClick={() => !applied.has(j.id) && setModal(j)}
                >
                  {applied.has(j.id) ? "Applied ✓" : "Apply Now"}
                </Btn>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: T.slate,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 500 }}>No jobs match your filters</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Try adjusting your search or location.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESOURCES PAGE ───────────────────────────────────────────────────────────
function ResourcesPage() {
  const [tab, setTab] = useState("parole");
  const tabs = [
    { id: "parole", label: "⚖️ Parole & Legal" },
    { id: "mental", label: "🧠 Mental Health" },
    { id: "housing", label: "🏠 Housing" },
    { id: "education", label: "🎓 Education" },
  ];

  return (
    <div style={{ padding: "32px 36px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 38,
            fontWeight: 300,
            marginBottom: 6,
          }}
        >
          Reentry <em style={{ color: T.gold }}>Resources</em>
        </h1>
        <p style={{ color: T.slate }}>
          Verified links to official programs, hotlines, and support
          organizations.
        </p>
      </div>

      {/* Emergency banner */}
      <div
        style={{
          marginBottom: 24,
          padding: "14px 18px",
          borderRadius: 12,
          background: "#FFF2F2",
          border: "1px solid #FFCDD2",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 20 }}>🆘</span>
        <div>
          <span style={{ fontWeight: 600, color: "#C62828", fontSize: 14 }}>
            In Crisis? Get help now:{" "}
          </span>
          <span style={{ fontSize: 14, color: T.slate }}>
            Call <strong>988</strong> · Text <strong>HOME to 741741</strong> ·
            Emergency: <strong>911</strong>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          borderBottom: `2px solid ${T.mist}`,
          marginBottom: 24,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "transparent",
              color: tab === t.id ? T.gold : T.slate,
              fontWeight: tab === t.id ? 500 : 400,
              fontSize: 14,
              borderBottom:
                tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(RESOURCES[tab] || []).map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "white",
              borderRadius: 14,
              border: `1px solid ${r.urgent ? "#FFCDD2" : T.mist}`,
              padding: "18px 22px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              cursor: "pointer",
              animation: `fadeUp .4s ${i * 0.07}s ease both`,
              transition: "box-shadow .2s,transform .2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.07)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "";
              e.currentTarget.style.transform = "";
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: r.urgent ? "#FFF2F2" : T.ivory,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
                border: `1px solid ${T.mist}`,
              }}
            >
              {r.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontWeight: 500, fontSize: 15 }}>{r.name}</span>
                <Badge color={r.urgent ? T.rose : T.info}>{r.tag}</Badge>
              </div>
              <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.5 }}>
                {r.desc}
              </div>
            </div>
            <span style={{ color: T.gold, fontSize: 18, flexShrink: 0 }}>
              →
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── SENTENCE CALCULATOR ──────────────────────────────────────────────────────
function CalculatorPage() {
  const [form, setForm] = useState({
    state: "",
    sentence: "",
    offenseType: "non-violent",
    startDate: "",
    program: false,
  });
  const [result, setResult] = useState(null);
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setResult(null);
  };

  const calculate = () => {
    if (!form.state || !form.sentence || !form.startDate) return;
    const info = SENTENCING[form.state];
    if (!info) return;
    const totalMonths = parseFloat(form.sentence) * 12;
    const violent = form.offenseType === "violent";
    const minRatio = violent
      ? info.max
      : form.program
        ? Math.max(info.min - 0.05, 0.1)
        : info.min;
    const maxRatio = violent ? 1.0 : info.max;
    const minServe = Math.round(totalMonths * minRatio);
    const maxServe = Math.round(totalMonths * maxRatio);
    const start = new Date(form.startDate);
    const minR = new Date(start);
    minR.setMonth(minR.getMonth() + minServe);
    const maxR = new Date(start);
    maxR.setMonth(maxR.getMonth() + maxServe);
    const today = new Date();
    const monthsServed = Math.max(
      0,
      Math.round((today - start) / (1000 * 60 * 60 * 24 * 30.44)),
    );
    const pctServed = Math.min(
      100,
      Math.round((monthsServed / totalMonths) * 100),
    );
    setResult({
      minServe,
      maxServe,
      minR,
      maxR,
      totalMonths,
      monthsServed,
      pctServed,
      note: info.note,
    });
  };

  const fmt = (d) =>
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div style={{ padding: "32px 36px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 38,
            fontWeight: 300,
            marginBottom: 6,
          }}
        >
          Sentence <em style={{ color: T.gold }}>Calculator</em>
        </h1>
        <p style={{ color: T.slate }}>
          Estimate release dates based on your state's good-time laws. For
          informational use only.
        </p>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 32,
          border: `1px solid ${T.mist}`,
          boxShadow: "0 4px 24px rgba(0,0,0,.04)",
          marginBottom: 24,
        }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
        >
          <div style={{ gridColumn: "1/-1" }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
              }}
            >
              State of Sentencing
            </label>
            <select
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            >
              <option value="">Select your state</option>
              {Object.keys(SENTENCING).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
              }}
            >
              Sentence Length (years)
            </label>
            <input
              type="number"
              min=".5"
              step=".5"
              placeholder="e.g. 5"
              value={form.sentence}
              onChange={(e) => set("sentence", e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
              }}
            >
              Sentence Start Date
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
              }}
            >
              Offense Classification
            </label>
            <select
              value={form.offenseType}
              onChange={(e) => set("offenseType", e.target.value)}
            >
              <option value="non-violent">Non-Violent</option>
              <option value="violent">Violent</option>
              <option value="drug">Drug Offense</option>
              <option value="financial">Financial / White Collar</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="prog"
              style={{ width: "auto", accentColor: T.gold }}
              checked={form.program}
              onChange={(e) => set("program", e.target.checked)}
            />
            <label
              htmlFor="prog"
              style={{ fontSize: 13, color: T.slate, cursor: "pointer" }}
            >
              Enrolled in rehabilitation program
            </label>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Btn
            full
            size="lg"
            onClick={calculate}
            disabled={!form.state || !form.sentence || !form.startDate}
          >
            Calculate Release Estimate →
          </Btn>
        </div>
      </div>

      {result && (
        <div style={{ animation: "fadeUp .5s ease" }}>
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: 28,
              border: `1px solid ${T.gold}30`,
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: 24,
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              Your Estimate
            </h3>

            {/* Progress bar */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, color: T.slate }}>
                  Time served
                </span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {result.monthsServed} of {result.totalMonths} months (
                  {result.pctServed}%)
                </span>
              </div>
              <div
                style={{
                  background: T.mist,
                  borderRadius: 8,
                  height: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${result.pctServed}%`,
                    height: "100%",
                    background: `linear-gradient(90deg,${T.gold},${T.goldL})`,
                    borderRadius: 8,
                    transition: "width 1s ease",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 20,
              }}
            >
              {[
                [
                  "Earliest Possible Release",
                  fmt(result.minR),
                  T.success,
                  result.minServe + " months min",
                ],
                [
                  "Latest Projected Release",
                  fmt(result.maxR),
                  T.rose,
                  result.maxServe + " months max",
                ],
              ].map(([label, val, color, sub]) => (
                <div
                  key={label}
                  style={{
                    padding: "16px 18px",
                    background: T.ivory,
                    borderRadius: 12,
                    border: `1px solid ${color}25`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: T.slate,
                      textTransform: "uppercase",
                      letterSpacing: ".5px",
                      marginBottom: 6,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color,
                      marginBottom: 2,
                    }}
                  >
                    {val}
                  </div>
                  <div style={{ fontSize: 12, color: T.slate }}>{sub}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "12px 16px",
                background: T.warnL,
                border: `1px solid ${T.warn}25`,
                borderRadius: 10,
                fontSize: 13,
                color: T.warn,
                lineHeight: 1.6,
              }}
            >
              <strong>State Note:</strong> {result.note}
            </div>
          </div>

          <div
            style={{
              padding: "12px 16px",
              background: T.roseL,
              borderRadius: 10,
              border: `1px solid ${T.rose}25`,
              fontSize: 12,
              color: T.rose,
              lineHeight: 1.7,
            }}
          >
            ⚠️ This is an estimate only and not legal advice. Actual release
            dates depend on conduct, programming completion, parole board
            decisions, and other factors. Always consult your attorney or case
            manager.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BLOG PAGE ────────────────────────────────────────────────────────────────
function BlogPage({ posts, user, backendReady }) {
  const [open, setOpen] = useState(null);
  const [liked, setLiked] = useState(new Set());
  const categories = [
    "All",
    "Story",
    "Legal",
    "Jobs",
    "Mental Health",
    "Business",
  ];
  const [cat, setCat] = useState("All");
  const filtered = posts.filter((p) => cat === "All" || p.category === cat);
  const post = open ? posts.find((b) => b.id === open) : null;

  const catColors = {
    Story: T.gold,
    Legal: T.info,
    Jobs: T.success,
    "Mental Health": T.rose,
    Business: T.slate,
  };
  const toggleLike = async (postId) => {
    setLiked((p) => {
      const n = new Set(p);
      n.has(postId) ? n.delete(postId) : n.add(postId);
      return n;
    });
    if (backendReady && user?.id) {
      try {
        await BlogService.likePost(user.id, postId);
      } catch {
        // Keep UI responsive even if the backend call fails.
      }
    }
  };

  if (post)
    return (
      <div
        style={{
          padding: "32px 36px 60px",
          maxWidth: 720,
          margin: "0 auto",
          animation: "fadeIn .4s ease",
        }}
      >
        <button
          onClick={() => setOpen(null)}
          style={{
            background: "none",
            color: T.gold,
            fontSize: 14,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
          }}
        >
          ← Back to Blog
        </button>
        <Badge color={catColors[post.category] || T.gold}>
          {post.category}
        </Badge>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 38,
            fontWeight: 300,
            margin: "14px 0 12px",
            lineHeight: 1.2,
          }}
        >
          {post.title}
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 32,
            paddingBottom: 20,
            borderBottom: `1px solid ${T.mist}`,
          }}
        >
          <Avatar initials={post.authorAvatar} size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{post.author}</div>
            <div style={{ fontSize: 12, color: T.slate }}>
              {post.date} · {post.readTime} read
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            <span style={{ fontSize: 13, color: T.slate }}>
              ♥ {post.likes + (liked.has(post.id) ? 1 : 0)}
            </span>
            <span style={{ fontSize: 13, color: T.slate }}>
              💬 {post.comments}
            </span>
          </div>
        </div>
        <div style={{ lineHeight: 1.9, color: T.slate, fontSize: 16 }}>
          <p>{post.excerpt}</p>
          <br />
          <p>
            The path to rebuilding is rarely linear. There are setbacks,
            bureaucratic walls, and moments of profound doubt. But across
            thousands of stories shared in this community, one truth emerges
            again and again: the people who make it through are the ones who
            refuse to face it alone.
          </p>
          <br />
          <p>
            Community isn't a luxury — it's infrastructure. The support
            networks, the job leads passed between members, the late-night
            messages that say "I've been exactly where you are" — this is what
            New Horizon was built for. Your record is part of your story. It is
            not the whole story.
          </p>
          <br />
          <p>
            If this resonated, please share your own story below. Your words
            might be the exact thing someone else needed to read today.
          </p>
        </div>
        <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
          <button
            onClick={() => toggleLike(post.id)}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: `1px solid ${liked.has(post.id) ? T.rose : T.mist}`,
              background: liked.has(post.id) ? T.roseL : "white",
              color: liked.has(post.id) ? T.rose : T.slate,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {liked.has(post.id) ? "♥ Liked" : "♡ Like this story"}
          </button>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: `1px solid ${T.mist}`,
              background: "white",
              color: T.slate,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            💬 Comment
          </button>
        </div>
      </div>
    );

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 38,
            fontWeight: 300,
            marginBottom: 6,
          }}
        >
          Stories & <em style={{ color: T.gold }}>Guides</em>
        </h1>
        <p style={{ color: T.slate }}>
          Real stories, legal guides, and expert insights from our community.
        </p>
      </div>

      <div
        style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}
      >
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: "7px 18px",
              borderRadius: 30,
              background: cat === c ? T.gold : "white",
              color: cat === c ? "white" : T.slate,
              border: `1px solid ${cat === c ? T.gold : T.mist}`,
              fontSize: 13,
              fontWeight: cat === c ? 500 : 400,
              cursor: "pointer",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
          gap: 20,
        }}
      >
        {filtered.map((b, i) => (
          <div
            key={b.id}
            onClick={() => setOpen(b.id)}
            style={{
              background: "white",
              borderRadius: 16,
              border: `1px solid ${T.mist}`,
              overflow: "hidden",
              cursor: "pointer",
              animation: `fadeUp .5s ${i * 0.07}s ease both`,
              transition: "transform .22s,box-shadow .22s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,.09)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <div
              style={{
                height: 90,
                background: `linear-gradient(135deg,${T.cream},${T.mist})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
              }}
            >
              {b.img}
            </div>
            <div style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Badge color={catColors[b.category] || T.gold}>
                  {b.category}
                </Badge>
                <span style={{ fontSize: 11, color: T.slate }}>
                  {b.readTime}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 19,
                  fontWeight: 600,
                  margin: "8px 0 8px",
                  lineHeight: 1.3,
                }}
              >
                {b.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: T.slate,
                  lineHeight: 1.6,
                  marginBottom: 14,
                }}
              >
                {b.excerpt.length > 100 ? `${b.excerpt.slice(0, 100)}…` : b.excerpt}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar initials={b.authorAvatar} size={24} />
                  <span style={{ fontSize: 12, color: T.slate }}>
                    {b.author}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 12,
                    color: T.slate,
                  }}
                >
                  <span>♥ {b.likes + (liked.has(b.id) ? 1 : 0)}</span>
                  <span>💬 {b.comments}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div
          style={{ textAlign: "center", padding: "40px 24px", color: T.slate }}
        >
          No posts match this category yet.
        </div>
      )}
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ user, setUser, onLogout, backendReady }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    age: user?.age || "",
    state: user?.state || "",
    bio: user?.bio || "",
    offense: user?.offense || "Non-violent",
    interests: user?.interests?.join(", ") || "",
    notifications: true,
    publicProfile: true,
    showState: true,
  });
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [tab, _setTab] = useState("edit");
  const [credEmail, setCredEmail] = useState(user?.email || "");
  const [credPassword, setCredPassword] = useState("");
  const [credSaving, setCredSaving] = useState(false);
  const [credMsg, setCredMsg] = useState("");
  const setTab = (nextTab) => {
    setSaveErr("");
    _setTab(nextTab);
  };
  const set = (k, v) => {
    setSaveErr("");
    setForm((p) => ({ ...p, [k]: v }));
  };

  const save = async () => {
    setSaved(false);
    setSaveErr("");
    const nextUser = {
      ...user,
      ...form,
      interests: form.interests
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean),
    };
    try {
      if (backendReady && user?.id) {
        const updated = await ProfileService.updateProfile(user.id, {
          name: form.name,
          age: form.age ? Number(form.age) : null,
          state: form.state,
          bio: form.bio,
          offense_type: form.offense,
          interests: nextUser.interests,
          public_profile: form.publicProfile,
        });
        setUser((p) => ({
          ...p,
          ...normalizeProfile(updated),
          connections: p.connections,
          messageCount: p.messageCount,
          jobApps: p.jobApps,
        }));
      } else {
        setUser(nextUser);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setSaveErr(error?.message || "Could not save profile. Please try again.");
    }
  };

  const saveCredentials = async () => {
    const emailChanged = credEmail && credEmail !== user?.email;
    if (!emailChanged && !credPassword) return;
    setCredSaving(true);
    setCredMsg("");
    try {
      await AuthService.updateCredentials({
        email: emailChanged ? credEmail : undefined,
        password: credPassword || undefined,
      });
      setCredMsg("✓ Credentials updated");
      setCredPassword("");
    } catch (error) {
      setCredMsg(error?.message || "Could not update credentials.");
    } finally {
      setCredSaving(false);
    }
  };

  const profileComplete = [
    form.name,
    form.age,
    form.state,
    form.bio,
    form.interests,
  ].filter(Boolean).length;
  const pct = Math.round((profileComplete / 5) * 100);

  return (
    <div style={{ padding: "32px 36px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 38,
            fontWeight: 300,
            marginBottom: 6,
          }}
        >
          My <em style={{ color: T.gold }}>Profile</em>
        </h1>
      </div>

      {/* Profile card */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: `1px solid ${T.mist}`,
          padding: 24,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Avatar initials={user?.avatar || "?"} size={64} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {user?.name}
          </div>
          <div style={{ color: T.slate, fontSize: 14, marginBottom: 8 }}>
            {[user?.age && `${user.age} yrs`, user?.state, user?.offense]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                flex: 1,
                background: T.mist,
                borderRadius: 6,
                height: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: `linear-gradient(90deg,${T.gold},${T.goldL})`,
                  transition: "width .5s ease",
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: T.slate, flexShrink: 0 }}>
              {pct}% complete
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, textAlign: "center" }}>
          {[
            ["12", "Connections"],
            ["3", "Applied"],
            ["47", "Messages"],
          ].map(([n, l]) => (
            <div key={l}>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: T.gold,
                }}
              >
                {n}
              </div>
              <div style={{ fontSize: 11, color: T.slate }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          borderBottom: `1px solid ${T.mist}`,
          marginBottom: 24,
        }}
      >
        {[
          ["edit", "Edit Profile"],
          ["privacy", "Privacy"],
          ["account", "Account"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "transparent",
              color: tab === id ? T.gold : T.slate,
              fontWeight: tab === id ? 500 : 400,
              fontSize: 14,
              borderBottom:
                tab === id ? `2px solid ${T.gold}` : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "edit" && (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 28,
            border: `1px solid ${T.mist}`,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Full Name
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Age
              </label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                State
              </label>
              <select
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              >
                <option value="">Select state</option>
                {[
                  "TX",
                  "CA",
                  "FL",
                  "NY",
                  "GA",
                  "IL",
                  "OH",
                  "PA",
                  "NC",
                  "MI",
                  "Other",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Offense Category
              </label>
              <select
                value={form.offense}
                onChange={(e) => set("offense", e.target.value)}
              >
                {[
                  "Non-violent",
                  "Drug offense",
                  "Financial",
                  "Violent",
                  "Prefer not to say",
                ].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Bio
              </label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Tell the community about yourself..."
                style={{ resize: "vertical" }}
              />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Interests (comma-separated)
              </label>
              <input
                value={form.interests}
                onChange={(e) => set("interests", e.target.value)}
                placeholder="Music, Cooking, Sports..."
              />
            </div>
          </div>
          <div
            style={{
              marginTop: 20,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <Btn onClick={save}>Save Changes</Btn>
            {saved && (
              <span
                style={{
                  color: T.success,
                  fontSize: 14,
                  animation: "fadeIn .3s ease",
                }}
              >
                ✓ Profile updated!
              </span>
            )}
            {saveErr && (
              <span style={{ color: T.rose, fontSize: 13 }}>{saveErr}</span>
            )}
          </div>
        </div>
      )}

      {tab === "privacy" && (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 28,
            border: `1px solid ${T.mist}`,
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
            Privacy Settings
          </h3>
          {[
            [
              "Public Profile",
              "Allow community members to find and view your profile",
              "publicProfile",
            ],
            [
              "Show Location State",
              "Display your state on your public profile",
              "showState",
            ],
            [
              "Email Notifications",
              "Receive messages and match alerts via email",
              "notifications",
            ],
          ].map(([label, desc, key]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: `1px solid ${T.mist}`,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: T.slate }}>{desc}</div>
              </div>
              <div
                onClick={() => set(key, !form[key])}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: form[key] ? T.gold : T.mist,
                  position: "relative",
                  cursor: "pointer",
                  transition: "background .2s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: form[key] ? 22 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left .2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                  }}
                />
              </div>
            </div>
          ))}
          <div
            style={{
              marginTop: 20,
              padding: "14px 16px",
              background: T.ivory,
              borderRadius: 10,
              border: `1px solid ${T.mist}`,
              fontSize: 13,
              color: T.slate,
              lineHeight: 1.6,
            }}
          >
            🔒 Your data is encrypted at rest and in transit. Criminal history
            details are never shown publicly. You can delete your account at any
            time.
          </div>
        </div>
      )}

      {tab === "account" && (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 28,
            border: `1px solid ${T.mist}`,
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
            Account Settings
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={credEmail}
                onChange={(e) => { setCredEmail(e.target.value); setCredMsg(""); }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={credPassword}
                onChange={(e) => { setCredPassword(e.target.value); setCredMsg(""); }}
              />
            </div>
            <Btn size="sm" onClick={saveCredentials} disabled={credSaving}>
              {credSaving ? "Saving…" : "Update Credentials"}
            </Btn>
            {credMsg && (
              <p style={{ fontSize: 13, color: credMsg.startsWith("✓") ? T.success : T.rose }}>
                {credMsg}
              </p>
            )}
            <div style={{ paddingTop: 20, borderTop: `1px solid ${T.mist}` }}>
              <Btn variant="danger" size="sm" onClick={onLogout}>
                Sign Out
              </Btn>
            </div>
            <div style={{ paddingTop: 12, borderTop: `1px solid ${T.mist}` }}>
              <div style={{ fontSize: 13, color: T.rose, cursor: "pointer" }}>
                ⚠ Delete my account and all data
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("Dashboard");
  const [chatUser, setChatUser] = useState(COMMUNITY[0]);
  const [community, setCommunity] = useState(COMMUNITY);
  const [jobs, setJobs] = useState(JOBS);
  const [posts, setPosts] = useState(BLOG_POSTS);
  const [unread, setUnread] = useState(3);
  const [booting, setBooting] = useState(BACKEND_READY);

  const refreshUnread = async (userId = user?.id) => {
    if (!BACKEND_READY || !userId) {
      setUnread(3);
      return;
    }
    try {
      const count = await MessageService.getUnreadCount(userId);
      setUnread(count || 0);
    } catch {
      setUnread(3);
    }
  };

  useEffect(() => {
    if (!BACKEND_READY) {
      setBooting(false);
      return;
    }
    let mounted = true;
    const bootstrap = async () => {
      try {
        const session = await AuthService.getSession();
        if (session?.user?.id && mounted) {
          const profile = await ProfileService.getProfile(session.user.id);
          if (profile)
            setUser((current) => current || normalizeProfile(profile));
        }
      } catch {
        // Fall back to demo mode if backend bootstrap fails.
      } finally {
        if (mounted) setBooting(false);
      }
    };
    bootstrap();
    const { data: authListener } = AuthService.onAuthChange(
      async (_event, session) => {
        if (!mounted) return;
        if (!session) {
          setUser(null);
          return;
        }
        try {
          if (session.user?.id) {
            const profile = await ProfileService.getProfile(session.user.id);
            if (profile && mounted) setUser(normalizeProfile(profile));
          }
        } catch {
          // Keep the current user if live profile sync fails.
        }
      },
    );
    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadData = async () => {
      if (!BACKEND_READY) {
        setCommunity(COMMUNITY);
        setJobs(JOBS);
        setPosts(BLOG_POSTS);
        setUnread(3);
        return;
      }
      try {
        const [communityData, jobsData, savedJobs, postData, notifications] =
          await Promise.all([
            ProfileService.getCommunity().catch(() => null),
            JobService.listJobs({}),
            JobService.getSavedJobs(user.id),
            BlogService.listPosts(),
            NotificationService.listNotifications(user.id),
          ]);
        if (cancelled) return;
        const savedIds = new Set(
          (savedJobs || []).map((job) => job?.job?.id).filter(Boolean),
        );
        setCommunity(COMMUNITY);
        setJobs(
          (jobsData || []).map((job) => normalizeJob(job, savedIds)).length
            ? (jobsData || []).map((job) => normalizeJob(job, savedIds))
            : JOBS,
        );
        setPosts(
          (postData || []).map(normalizeBlogPost).length
            ? (postData || []).map(normalizeBlogPost)
            : BLOG_POSTS,
        );
        const unreadNotifications = (notifications || []).filter(
          (n) => !n.read,
        ).length;
        setUnread(unreadNotifications || 0);
      } catch {
        if (!cancelled) {
          setCommunity(COMMUNITY);
          setJobs(JOBS);
          setPosts(BLOG_POSTS);
          setUnread(3);
        }
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!chatUser && community.length) {
      setChatUser(community[0]);
    }
  }, [chatUser, community]);

  const handleAuth = async ({ mode, form, user: demoUser }) => {
    if (mode === "demo-login" || mode === "demo-register") {
      setUser(normalizeProfile(demoUser));
      return;
    }
    if (!form) return;
    if (!form.email || !form.password)
      throw new Error("Email and password are required.");
    if (mode === "register" && !form.name)
      throw new Error("All fields required.");
    if (mode === "register" && form.password !== form.confirmPassword)
      throw new Error("Passwords don't match.");
    if (!BACKEND_READY) throw new Error("Supabase is not configured.");
    if (mode === "login") {
      await AuthService.signIn({ email: form.email, password: form.password });
    } else {
      await AuthService.signUp({
        email: form.email,
        password: form.password,
        name: form.name,
      });
    }
    const profile = await ProfileService.getMyProfile();
    setUser(
      normalizeProfile(profile || { name: form.name, email: form.email }),
    );
  };

  const handleLogout = async () => {
    if (BACKEND_READY) {
      try {
        await AuthService.signOut();
      } catch {
        // Clear local state even if remote sign-out fails.
      }
    }
    setUser(null);
    setPage("Dashboard");
    setChatUser(COMMUNITY[0]);
  };

  if (booting) return <Spinner />;
  if (!user)
    return <AuthPage onAuth={handleAuth} backendReady={BACKEND_READY} />;

  const pageProps = {
    user,
    setUser,
    setPage,
    chatUser,
    setChatUser,
    community,
    jobs,
    setJobs,
    posts,
    unread,
    backendReady: BACKEND_READY,
    refreshUnread,
    onLogout: handleLogout,
  };
  const pages = {
    Dashboard: <Dashboard {...pageProps} />,
    Connect: <ConnectPage {...pageProps} />,
    Messages: <MessagesPage {...pageProps} />,
    Jobs: <JobsPage {...pageProps} />,
    Resources: <ResourcesPage />,
    Calculator: <CalculatorPage />,
    Blog: <BlogPage {...pageProps} />,
    Profile: <ProfilePage {...pageProps} />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SideNav page={page} setPage={setPage} user={user} notifs={unread} />
      <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {pages[page] || <Dashboard {...pageProps} />}
      </main>
    </div>
  );
}
