import { useEffect, useRef, useState } from "react";
import { AuthService, NotificationService, ProfileService } from "../services/database-service.js";

const T = {
  gold:"#B8975A",goldL:"#D4B07A",charcoal:"#1C1C1E",slate:"#4A4A52",
  mist:"#E8E4DC",ivory:"#FAF8F4",cream:"#F5F0E8",white:"#FFFFFF",
  success:"#3D7A5F",successL:"#EAF3E8",rose:"#8B4A5A",roseL:"#F5EAE8",
  info:"#2C6FAC",infoL:"#E8F0FA",warn:"#7A6530",warnL:"#FDF6E8",
};

const MOCK_NOTIFS = [
  { id:"n1", type:"match", title:"It's a Match! 🎉", body:"You and Alicia Rivera both liked each other. Say hello!", icon:"♥", time:"Just now", read:false, actionUrl:"/connect" },
  { id:"n2", type:"message", title:"New Message", body:"Devon W. sent you a message: 'Brother, faith is what kept me...'", icon:"✉", time:"5m ago", read:false, actionUrl:"/messages" },
  { id:"n3", type:"job", title:"Job Alert", body:"3 new felony-friendly jobs were posted in Texas that match your profile.", icon:"💼", time:"1h ago", read:false, actionUrl:"/jobs" },
  { id:"n4", type:"system", title:"Profile Tip", body:"Add your interests to get 4x more profile views and better matches.", icon:"⭐", time:"3h ago", read:true, actionUrl:"/profile" },
];

const TYPE_META = {
  match:    { color: T.rose, bg: T.roseL, label: "Match" },
  message:  { color: T.info, bg: T.infoL, label: "Message" },
  job:      { color: T.success, bg: T.successL, label: "Job Alert" },
  resource: { color: T.gold, bg: T.cream, label: "Resource" },
  system:   { color: T.slate, bg: T.ivory, label: "System" },
  admin:    { color: T.warn, bg: T.warnL, label: "Admin" },
};

const EMAIL_TEMPLATES = [
  { name:"Welcome Email", trigger:"On registration", subject:"Welcome to New Horizon ✦", status:"Active" },
  { name:"Match Notification", trigger:"On mutual like", subject:"You have a new match!", status:"Active" },
  { name:"New Message Alert", trigger:"On message received", subject:"You have a new message", status:"Active" },
  { name:"Job Alert Digest", trigger:"Daily at 9AM", subject:"{{job_count}} new jobs match your profile", status:"Active" },
  { name:"Weekly Resource Update", trigger:"Every Monday", subject:"New resources for returning citizens in {{state}}", status:"Draft" },
  { name:"Account Verification", trigger:"On signup", subject:"Verify your New Horizon email", status:"Active" },
];

if (!document.getElementById("nh-fonts")) {
  const fontLink = document.createElement("link");
  fontLink.id = "nh-fonts";
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap";
  document.head.appendChild(fontLink);
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:${T.ivory};color:${T.charcoal}}
button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none}
input{font-family:'DM Sans',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(1.8);opacity:0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.notif-row{transition:background .15s;cursor:pointer}
.notif-row:hover{background:${T.ivory}!important}
`;
if (!document.getElementById("nh-notif-styles")) {
  const s = document.createElement("style");
  s.id = "nh-notif-styles";
  s.textContent = css;
  document.head.appendChild(s);
}

const hasConfiguredValue = (value, placeholder) => Boolean(value && value !== placeholder);
const BACKEND_READY = hasConfiguredValue(import.meta.env.VITE_SUPABASE_URL, "https://YOUR_PROJECT.supabase.co")
  && hasConfiguredValue(import.meta.env.VITE_SUPABASE_URL, "placeholder")
  && (
    hasConfiguredValue(import.meta.env.VITE_SUPABASE_ANON_KEY, "YOUR_ANON_KEY")
    || hasConfiguredValue(import.meta.env.VITE_SUPABASE_ANON_KEY, "placeholder")
  );

function fmtRelative(value) {
  if (!value) return "Now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function normalizeNotif(n = {}) {
  return {
    id: n.id,
    type: n.type || "system",
    title: n.title || "Notification",
    body: n.body || n.message || "",
    icon: n.icon || "🔔",
    time: n.time || fmtRelative(n.created_at),
    read: Boolean(n.read),
    actionUrl: n.actionUrl || n.action_url || "/",
  };
}

function NotificationBell({ notifs, onOpen }) {
  const unread = notifs.filter(n => !n.read).length;
  const [ping, setPing] = useState(false);

  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(() => setPing(true), 1200);
    return () => clearTimeout(t);
  }, [unread]);

  return (
    <button onClick={onOpen} style={{ position:"relative", background:"none", padding:"8px", borderRadius:8 }}>
      <span style={{ fontSize:20 }}>🔔</span>
      {unread > 0 && (
        <span style={{
          position:"absolute", top:4, right:4, background:T.rose, color:"white",
          width:17, height:17, borderRadius:"50%", fontSize:10, fontWeight:700,
          display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white",
        }}>
          {unread > 9 ? "9+" : unread}
          {ping && <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:T.rose, animation:"ping 1s ease-out" }} />}
        </span>
      )}
    </button>
  );
}

function NotifItem({ n, onRead, style: extraStyle = {} }) {
  const meta = TYPE_META[n.type] || TYPE_META.system;
  return (
    <div className="notif-row" onClick={() => onRead(n.id)}
      style={{ display:"flex", gap:14, padding:"14px 20px", background:n.read?"white":T.gold+"07", borderBottom:`1px solid ${T.mist}`, ...extraStyle }}>
      <div style={{ width:42, height:42, borderRadius:12, background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, border:`1px solid ${meta.color}25` }}>
        {n.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:3 }}>
          <span style={{ fontWeight:600, fontSize:14, color:T.charcoal }}>{n.title}</span>
          <span style={{ fontSize:11, color:T.slate, flexShrink:0, whiteSpace:"nowrap" }}>{n.time}</span>
        </div>
        <p style={{ fontSize:13, color:T.slate, lineHeight:1.5, margin:0 }}>{n.body}</p>
        <div style={{ marginTop:6 }}>
          <span style={{ fontSize:11, fontWeight:500, color:meta.color, background:meta.bg, padding:"2px 8px", borderRadius:10 }}>
            {meta.label}
          </span>
        </div>
      </div>
      {!n.read && <div style={{ width:8, height:8, borderRadius:"50%", background:T.gold, flexShrink:0, marginTop:4 }} />}
    </div>
  );
}

export default function NotificationCenter() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const [filter, setFilter] = useState("all");
  const [showBellMenu, setShowBellMenu] = useState(false);
  const [prefs, setPrefs] = useState({ push:true, email:true, matches:true, messages:true, jobs:true, resources:true });
  const [tab, setTab] = useState("center");
  const [incoming, setIncoming] = useState(null);
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(BACKEND_READY ? "Connecting..." : "Demo mode");
  const bellRef = useRef(null);
  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    let active = true;
    let channel;

    const load = async () => {
      if (!BACKEND_READY) {
        setStatus("Demo mode");
        return;
      }
      try {
        const user = await AuthService.getUser();
        if (!user) {
          if (active) setStatus("Sign in to load live notifications");
          return;
        }
        const myProfile = await ProfileService.getProfile(user.id);
        if (!active) return;
        setProfile(myProfile);
        setPrefs(p => ({
          ...p,
          push: myProfile?.push_notifs ?? p.push,
          email: myProfile?.email_notifs ?? p.email,
        }));
        const liveNotifs = await NotificationService.listNotifications(user.id);
        if (!active) return;
        const mapped = (liveNotifs || []).map(normalizeNotif);
        setNotifs(mapped.length ? mapped : []);
        setStatus("WebSocket Connected");
        channel = NotificationService.subscribeToNotifications(user.id, payload => {
          const next = normalizeNotif(payload);
          setIncoming(next);
          setNotifs(prev => [next, ...prev]);
          setTimeout(() => setIncoming(null), 4500);
        });
      } catch {
        if (active) setStatus("Live connection unavailable");
      }
    };

    load();
    return () => {
      active = false;
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const clickAway = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowBellMenu(false);
      }
    };
    document.addEventListener("mousedown", clickAway);
    return () => document.removeEventListener("mousedown", clickAway);
  }, []);

  const markRead = async (id) => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, read:true } : n));
    if (BACKEND_READY) {
      try {
        await NotificationService.markRead(id);
      } catch {
        // Leave optimistic UI in place.
      }
    }
  };

  const markAll = async () => {
    setNotifs(p => p.map(n => ({ ...n, read:true })));
    if (BACKEND_READY && profile?.id) {
      try {
        await NotificationService.markAllRead(profile.id);
      } catch {
        // Ignore persistence errors in demo-friendly UI.
      }
    }
  };

  const deleteN = (id) => {
    setNotifs(p => p.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg) => {
    setToast(msg);
  };
  const showToast = (msg) => setToast(msg);

  const savePrefs = async () => {
    if (!BACKEND_READY || !profile?.id) {
      showToast("Preferences are saved locally in demo mode.");
      return;
    }
    try {
      await ProfileService.updateProfile(profile.id, {
        push_notifs: prefs.push,
        email_notifs: prefs.email,
      });
      showToast("Notification preferences saved.");
    } catch {
      showToast("Could not save preferences right now.");
    }
  };

  const filtered = filter === "all" ? notifs : filter === "unread" ? notifs.filter(n => !n.read) : notifs.filter(n => n.type === filter);
  const tabs = [
    { id:"center", label:"Notification Center" },
    { id:"prefs", label:"Preferences" },
    { id:"templates", label:"Email Templates" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:T.ivory, fontFamily:"'DM Sans', sans-serif" }}>
      {incoming && (
        <div style={{
          position:"fixed", top:20, right:20, zIndex:9999, background:"white", borderRadius:16, padding:"14px 18px",
          boxShadow:"0 16px 48px rgba(0,0,0,.15)", border:`1px solid ${T.gold}40`, width:320, animation:"slideDown .3s ease",
          display:"flex", gap:12, alignItems:"flex-start",
        }}>
          <div style={{ width:38, height:38, borderRadius:10, background:T.roseL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{incoming.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:2 }}>{incoming.title}</div>
            <div style={{ fontSize:12, color:T.slate }}>{incoming.body}</div>
          </div>
          <button onClick={() => setIncoming(null)} style={{ background:"none", color:T.slate, fontSize:18, padding:"0 4px" }}>×</button>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:20, right:20, zIndex:9999, background:"white", padding:"12px 16px", borderRadius:12, border:`1px solid ${T.mist}`, boxShadow:"0 12px 32px rgba(0,0,0,.12)" }}>
          <div style={{ fontSize:13 }}>{toast}</div>
        </div>
      )}

      <div style={{ background:"white", borderBottom:`1px solid ${T.mist}`, padding:"0 32px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", height:64 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${T.gold},${T.goldL})`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:14 }}>✦</div>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:600 }}>New Horizon</span>
          </div>
          <div ref={bellRef} style={{ position:"relative" }}>
            <NotificationBell notifs={notifs} onOpen={() => setShowBellMenu(p => !p)} />
            {showBellMenu && (
              <div style={{ position:"absolute", right:0, top:"100%", marginTop:8, width:360, background:"white", borderRadius:16, border:`1px solid ${T.mist}`, boxShadow:"0 16px 48px rgba(0,0,0,.14)", overflow:"hidden", animation:"slideDown .25s ease", zIndex:200 }}>
                <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.mist}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:600, fontSize:15 }}>Notifications {unread > 0 && <span style={{ color:T.gold }}>({unread})</span>}</span>
                  <button onClick={markAll} style={{ background:"none", color:T.gold, fontSize:12, fontWeight:500 }}>Mark all read</button>
                </div>
                <div style={{ maxHeight:340, overflowY:"auto" }}>
                  {notifs.slice(0,5).map(n => <NotifItem key={n.id} n={n} onRead={(id) => { markRead(id); setShowBellMenu(false); }} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"32px 24px" }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:300, marginBottom:6 }}>
            Notification <em style={{ color:T.gold }}>System</em>
          </h1>
          <p style={{ color:T.slate }}>Real-time alerts, preferences, and email templates managed in one place.</p>
        </div>

        <div style={{ marginBottom:20, padding:"12px 16px", background:"white", borderRadius:12, border:`1px solid ${T.mist}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ fontSize:13, color:T.slate }}>
            {BACKEND_READY ? `Live backend: ${status}` : "Live backend disabled until .env is filled in."}
          </div>
          {profile?.email && <div style={{ fontSize:13, fontWeight:500 }}>{profile.email}</div>}
        </div>

        <div style={{ display:"flex", gap:2, borderBottom:`2px solid ${T.mist}`, marginBottom:28 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"10px 22px", background:"transparent", color:tab===t.id?T.gold:T.slate, fontWeight:tab===t.id?500:400, fontSize:14, borderBottom:tab===t.id?`2px solid ${T.gold}`:"2px solid transparent", marginBottom:-2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "center" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>
            <div>
              <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                {[["all","All"],["unread","Unread"],["match","Matches"],["message","Messages"],["job","Jobs"],["resource","Resources"]].map(([v,l]) => (
                  <button key={v} onClick={() => setFilter(v)} style={{ padding:"6px 16px", borderRadius:20, background:filter===v?T.gold:"white", color:filter===v?"white":T.slate, border:`1px solid ${filter===v?T.gold:T.mist}`, fontSize:13, fontWeight:filter===v?500:400 }}>{l}</button>
                ))}
                {unread > 0 && <button onClick={markAll} style={{ marginLeft:"auto", padding:"6px 16px", background:"none", color:T.gold, border:`1px solid ${T.gold}`, borderRadius:20, fontSize:13 }}>Mark all read</button>}
              </div>

              <div style={{ background:"white", borderRadius:16, border:`1px solid ${T.mist}`, overflow:"hidden" }}>
                {filtered.length === 0 ? (
                  <div style={{ padding:48, textAlign:"center", color:T.slate }}>
                    <div style={{ fontSize:32, marginBottom:12 }}>🔔</div>
                    <div style={{ fontWeight:500 }}>No notifications</div>
                    <div style={{ fontSize:13, marginTop:4 }}>You're all caught up.</div>
                  </div>
                ) : filtered.map((n, i) => (
                  <div key={n.id} style={{ position:"relative", animation:`fadeUp .4s ${i*.04}s ease both` }}>
                    <NotifItem n={n} onRead={markRead} />
                    <button onClick={() => deleteN(n.id)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", color:T.mist, fontSize:16, padding:"4px 8px" }}
                      onMouseEnter={e=>e.target.style.color=T.rose} onMouseLeave={e=>e.target.style.color=T.mist}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ background:"white", borderRadius:16, border:`1px solid ${T.mist}`, padding:20, marginBottom:16 }}>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:600, marginBottom:16 }}>Summary</h3>
                {[
                  ["Total",notifs.length,T.charcoal],
                  ["Unread",unread,T.gold],
                  ["Matches",notifs.filter(n=>n.type==="match").length,T.rose],
                  ["Messages",notifs.filter(n=>n.type==="message").length,T.info],
                  ["Jobs",notifs.filter(n=>n.type==="job").length,T.success],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.mist}` }}>
                    <span style={{ fontSize:13, color:T.slate }}>{l}</span>
                    <span style={{ fontWeight:700, color:c }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background:`linear-gradient(135deg,${T.charcoal},#2A2A2E)`, borderRadius:16, padding:20 }}>
                <div style={{ fontSize:11, color:"#9A9AAA", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Real-time Status</div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:BACKEND_READY && profile ? T.success : T.warn, animation:"pulse 2s infinite" }} />
                  <span style={{ color:"white", fontSize:13, fontWeight:500 }}>{status}</span>
                </div>
                <div style={{ fontSize:12, color:"#7A7A8A", lineHeight:1.6 }}>
                  {BACKEND_READY ? "This page listens for live notification inserts through Supabase real-time subscriptions." : "Fill the project .env file with your Supabase values to enable live subscriptions."}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "prefs" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {[
              { title:"Delivery Channels", items:[
                ["Push Notifications","Receive alerts on your mobile device","push"],
                ["Email Notifications","Get important updates via email","email"],
              ]},
              { title:"Notification Types", items:[
                ["Matches & Likes","When someone likes or matches with you","matches"],
                ["New Messages","When you receive a direct message","messages"],
                ["Job Alerts","New jobs matching your location","jobs"],
                ["Resources","New guides and resources added","resources"],
              ]},
            ].map(section => (
              <div key={section.title} style={{ background:"white", borderRadius:16, border:`1px solid ${T.mist}`, padding:24 }}>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:600, marginBottom:16 }}>{section.title}</h3>
                {section.items.map(([label, desc, key]) => (
                  <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${T.mist}` }}>
                    <div>
                      <div style={{ fontWeight:500, fontSize:14 }}>{label}</div>
                      <div style={{ fontSize:12, color:T.slate, marginTop:2 }}>{desc}</div>
                    </div>
                    <div onClick={() => setPrefs(p => ({...p,[key]:!p[key]}))} style={{ width:44, height:24, borderRadius:12, background:prefs[key]?T.gold:T.mist, position:"relative", cursor:"pointer", transition:"background .2s", flexShrink:0 }}>
                      <div style={{ position:"absolute", top:3, left:prefs[key]?22:3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ gridColumn:"1/-1", background:"white", borderRadius:16, border:`1px solid ${T.mist}`, padding:24 }}>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:600, marginBottom:6 }}>Quiet Hours</h3>
              <p style={{ color:T.slate, fontSize:13, marginBottom:16 }}>Push and email preferences save to your profile when the backend is configured.</p>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {[["Start Time","22:00"],["End Time","07:00"],["Timezone","America/Denver"]].map(([l,d]) => (
                  <div key={l}>
                    <label style={{ fontSize:13, fontWeight:500, display:"block", marginBottom:6 }}>{l}</label>
                    <input defaultValue={d} style={{ border:`1px solid ${T.mist}`, borderRadius:8, padding:"8px 12px", fontSize:13, width:160 }} />
                  </div>
                ))}
              </div>
              <button onClick={savePrefs} style={{ marginTop:16, padding:"10px 24px", background:`linear-gradient(135deg,${T.gold},${T.goldL})`, color:"white", borderRadius:8, fontSize:14, fontWeight:500 }}>Save Preferences</button>
            </div>
          </div>
        )}

        {tab === "templates" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {EMAIL_TEMPLATES.map((t, i) => (
              <div key={t.name} style={{ background:"white", borderRadius:14, border:`1px solid ${T.mist}`, padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14, animation:`fadeUp .4s ${i*.06}s ease both` }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <span style={{ fontWeight:600, fontSize:15 }}>{t.name}</span>
                    <span style={{ fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:10, background:t.status==="Active"?T.successL:T.warnL, color:t.status==="Active"?T.success:T.warn }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize:12, color:T.slate, marginBottom:2 }}>Trigger: {t.trigger}</div>
                  <div style={{ fontSize:12, color:T.slate }}>Subject: <em>{t.subject}</em></div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${T.mist}`, background:"white", color:T.slate, fontSize:13 }}>Preview</button>
                  <button style={{ padding:"8px 16px", borderRadius:8, background:`linear-gradient(135deg,${T.gold},${T.goldL})`, color:"white", fontSize:13, fontWeight:500 }}>Edit</button>
                </div>
              </div>
            ))}

            <div style={{ background:`linear-gradient(135deg,${T.charcoal},#2A2A2E)`, borderRadius:16, padding:24, marginTop:8 }}>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:"white", fontWeight:300, marginBottom:16 }}>Email Provider Config</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[["Provider","Resend (recommended)"],["From Address","hello@newhorizon.app"],["Reply-To","support@newhorizon.app"],["Daily Limit","50,000 / day (free tier)"]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:11, color:"#9A9AAA", textTransform:"uppercase", letterSpacing:"1px", marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:14, color:"white", fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
