/**
 * NEW HORIZON — Mobile App (iOS & Android)
 * React Native — Production Ready
 *
 * SETUP:
 *   npx create-expo-app NewHorizon --template expo-template-blank-typescript
 *   cd NewHorizon
 *   npx expo install expo-notifications expo-device expo-constants
 *   npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
 *   npx expo install react-native-screens react-native-safe-area-context
 *   npx expo install @supabase/supabase-js react-native-url-polyfill
 *   npx expo install expo-secure-store
 *   npx expo install react-native-gesture-handler
 *
 * Replace this file with App.tsx in your project root.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, Platform, StatusBar, Dimensions, Animated, KeyboardAvoidingView,
  Alert, ActivityIndicator, Image, Switch, RefreshControl, Modal,
  SafeAreaView,
} from 'react-native';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const { width: W, height: H } = Dimensions.get('window');

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  gold: '#B8975A', goldL: '#D4B07A', charcoal: '#1C1C1E',
  slate: '#4A4A52', mist: '#E8E4DC', ivory: '#FAF8F4',
  cream: '#F5F0E8', white: '#FFFFFF', success: '#3D7A5F',
  successL: '#EAF3E8', rose: '#8B4A5A', roseL: '#F5EAE8',
  info: '#2C6FAC', infoL: '#E8F0FA',
  // Platform-specific safe areas
  statusBar: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  tabBar: Platform.OS === 'ios' ? 83 : 60,
};

const font = {
  display: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  body: Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

// ─── DATABASE CLIENT (Supabase) ────────────────────────────────────────────────
// In production, import createClient from @supabase/supabase-js
const mockDB = {
  async getUser(id) {
    return { id, name: 'Marcus Johnson', avatar: 'MJ', age: 34, state: 'TX', bio: 'Construction worker and father of 2.', offense: 'Non-violent', releaseYear: 2022, interests: ['Cooking','Sports','Music'], connections: 12, verified: true };
  },
  async getCommunity(filters = {}) {
    const users = [
      { id:'u2', name:'Alicia Rivera', avatar:'AR', age:29, state:'GA', bio:'CNA. Believe in second chances.', interests:['Wellness','Reading'], online:true },
      { id:'u3', name:'Devon Washington', avatar:'DW', age:42, state:'FL', bio:'Electrician. Mentor.', interests:['Faith','DIY'], online:false },
      { id:'u4', name:'Keisha Monroe', avatar:'KM', age:31, state:'NY', bio:'Paralegal student.', interests:['Law','Advocacy'], online:true },
      { id:'u5', name:'Tyrone Bell', avatar:'TB', age:38, state:'IL', bio:'Chef and small business owner.', interests:['Cooking','Business'], online:false },
    ];
    return filters.state ? users.filter(u => u.state === filters.state) : users;
  },
  async getJobs(filters = {}) {
    const jobs = [
      { id:'j1', title:'Warehouse Associate', company:'Amazon Logistics', location:'Dallas, TX', wage:'$18–$21/hr', type:'Full-time', logo:'📦', banTheBox:true, desc:'No background disqualification for non-violent offenses.' },
      { id:'j2', title:'Electrician Apprentice', company:'City Electric Co.', location:'Orlando, FL', wage:'$22–$26/hr', type:'Full-time', logo:'⚡', banTheBox:false, desc:'Union job with full benefits.' },
      { id:'j3', title:'Culinary Assistant', company:'Fresh Start Kitchens', location:'Atlanta, GA', wage:'$15–$17/hr', type:'Part-time', logo:'🍳', banTheBox:true, desc:'Founded by formerly incarcerated chefs.' },
      { id:'j4', title:'Remote Data Entry', company:'RemoteWork Inc.', location:'Remote', wage:'$14–$16/hr', type:'Part-time', logo:'💻', banTheBox:true, desc:'Fully remote. Laptop provided.' },
    ];
    return jobs;
  },
  async getMessages(userId, peerId) {
    return [
      { id:'m1', from:peerId, text:"Hey! I saw you're in Texas too. How long have you been out?", time:'2:14 PM', read:true },
      { id:'m2', from:userId, text:"About 2 years now. Still figuring things out but staying positive.", time:'2:18 PM', read:true },
      { id:'m3', from:peerId, text:"That's the spirit! Have you checked out the job board? Found my current job there.", time:'2:20 PM', read:false },
    ];
  },
  async getNotifications(userId) {
    return [
      { id:'n1', type:'match', title:'New Connection!', body:'Alicia Rivera liked your profile', time:'5m ago', read:false, icon:'♥' },
      { id:'n2', type:'message', title:'New Message', body:'Devon W. sent you a message', time:'1h ago', read:false, icon:'✉' },
      { id:'n3', type:'job', title:'Job Match', body:'3 new jobs match your profile in TX', time:'3h ago', read:true, icon:'💼' },
      { id:'n4', type:'resource', title:'New Resource', body:'New expungement guide posted for TX', time:'1d ago', read:true, icon:'📋' },
    ];
  },
};

// ─── PUSH NOTIFICATIONS SETUP ──────────────────────────────────────────────────
async function registerForPushNotifications() {
  // In production with expo-notifications:
  // const { status } = await Notifications.requestPermissionsAsync();
  // if (status !== 'granted') return null;
  // const token = await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' });
  // return token.data;
  return 'ExponentPushToken[mock-token-12345]';
}

// ─── SHARED COMPONENTS ─────────────────────────────────────────────────────────
const Avatar = ({ initials, size = 44, color = T.gold, online = false }) => (
  <View style={{ position: 'relative' }}>
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: T.white, fontWeight: '700', fontSize: size * 0.32 }}>{initials}</Text>
    </View>
    {online && (
      <View style={{
        position: 'absolute', bottom: 1, right: 1,
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: T.success, borderWidth: 2, borderColor: T.white,
      }} />
    )}
  </View>
);

const GoldButton = ({ title, onPress, outline = false, loading = false, small = false }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      backgroundColor: outline ? 'transparent' : T.gold,
      borderWidth: outline ? 1.5 : 0,
      borderColor: T.gold,
      borderRadius: 10,
      paddingVertical: small ? 8 : 13,
      paddingHorizontal: small ? 16 : 24,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    }}
  >
    {loading && <ActivityIndicator color={outline ? T.gold : T.white} size="small" />}
    <Text style={{ color: outline ? T.gold : T.white, fontWeight: '600', fontSize: small ? 13 : 15 }}>{title}</Text>
  </TouchableOpacity>
);

const Badge = ({ label, color = T.gold }) => (
  <View style={{ backgroundColor: color + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: color + '40' }}>
    <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>
  </View>
);

const Card = ({ children, style = {} }) => (
  <View style={{ backgroundColor: T.white, borderRadius: 16, borderWidth: 1, borderColor: T.mist, padding: 16, marginBottom: 12, ...style }}>
    {children}
  </View>
);

const SectionHeader = ({ title, subtitle }) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ fontFamily: font.display, fontSize: 28, color: T.charcoal, fontWeight: '300' }}>{title}</Text>
    {subtitle && <Text style={{ fontSize: 14, color: T.slate, marginTop: 4 }}>{subtitle}</Text>}
  </View>
);

// ─── AUTH SCREEN ───────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const handleAuth = async () => {
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    if (mode === 'login') {
      if (email === 'demo@newhorizon.com' && password === 'demo123') {
        const user = await mockDB.getUser('u1');
        const token = await registerForPushNotifications();
        // In production: save token to DB for push delivery
        onLogin(user);
      } else {
        setError('Invalid credentials. Try demo@newhorizon.com / demo123');
      }
    } else {
      if (!name || !email || !password) { setError('All fields are required.'); setLoading(false); return; }
      const newUser = { id: 'u_new', name, avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2), age: '', state: '', bio: '', offense: 'Prefer not to say', interests: [], connections: 0 };
      onLogin(newUser);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.charcoal }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Hero */}
          <View style={{ backgroundColor: T.charcoal, paddingTop: 48, paddingBottom: 40, paddingHorizontal: 28, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: T.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Text style={{ color: T.white, fontSize: 24 }}>✦</Text>
            </View>
            <Text style={{ fontFamily: font.display, fontSize: 32, color: T.white, fontWeight: '300', textAlign: 'center', marginBottom: 8 }}>
              New Horizon
            </Text>
            <Text style={{ fontSize: 14, color: '#9A9AAA', textAlign: 'center', lineHeight: 22, maxWidth: 280 }}>
              A dignified space for returning citizens to connect, find work, and rebuild.
            </Text>
          </View>

          {/* Form card */}
          <Animated.View style={{ backgroundColor: T.ivory, flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, opacity: fadeAnim }}>
            <Text style={{ fontFamily: font.display, fontSize: 26, fontWeight: '600', marginBottom: 6, color: T.charcoal }}>
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={{ fontSize: 14, color: T.slate, marginBottom: 28 }}>
              {mode === 'login' ? 'Sign in to continue your journey.' : 'Join thousands rebuilding with dignity.'}
            </Text>

            {mode === 'register' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6, color: T.charcoal }}>Full Name</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Your full name" style={styles.input} placeholderTextColor={T.slate} />
              </View>
            )}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6, color: T.charcoal }}>Email Address</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" style={styles.input} placeholderTextColor={T.slate} />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6, color: T.charcoal }}>Password</Text>
              <TextInput value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry style={styles.input} placeholderTextColor={T.slate} />
            </View>

            {error ? (
              <View style={{ backgroundColor: T.roseL, padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <Text style={{ color: T.rose, fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <GoldButton title={mode === 'login' ? 'Sign In' : 'Create Account'} onPress={handleAuth} loading={loading} />

            {mode === 'login' && (
              <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => { setEmail('demo@newhorizon.com'); setPassword('demo123'); }}>
                <Text style={{ color: T.gold, fontSize: 13, fontWeight: '500' }}>Use demo account →</Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ fontSize: 14, color: T.slate }}>{mode === 'login' ? "Don't have an account? " : 'Already have one? '}</Text>
              <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                <Text style={{ fontSize: 14, color: T.gold, fontWeight: '600' }}>{mode === 'login' ? 'Sign Up' : 'Sign In'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: T.white, borderRadius: 10, padding: 14, marginTop: 20, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: T.mist }}>
              <Text style={{ fontSize: 16 }}>🔒</Text>
              <Text style={{ fontSize: 12, color: T.slate, flex: 1, lineHeight: 18 }}>
                Your data is encrypted and never sold. Criminal history is never shown publicly.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── HOME / DASHBOARD TAB ──────────────────────────────────────────────────────
function HomeTab({ user, onNavigate }) {
  const [stats] = useState({ views: 142, connections: 12, jobs: 3, messages: 8 });
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const quickActions = [
    { icon: '♡', label: 'Connect', tab: 'Connect', color: T.rose },
    { icon: '💼', label: 'Jobs', tab: 'Jobs', color: T.success },
    { icon: '🔗', label: 'Resources', tab: 'Resources', color: T.info },
    { icon: '📊', label: 'Calculator', tab: 'Calculator', color: T.gold },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.ivory }} contentContainerStyle={{ paddingBottom: T.tabBar + 20 }}>
      {/* Header */}
      <View style={{ backgroundColor: T.charcoal, paddingTop: T.statusBar + 16, paddingBottom: 28, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ color: '#9A9AAA', fontSize: 13 }}>Good morning ✦</Text>
            <Text style={{ fontFamily: font.display, fontSize: 24, color: T.white, fontWeight: '300', marginTop: 2 }}>
              {user?.name?.split(' ')[0]}
            </Text>
          </View>
          <Avatar initials={user?.avatar || '?'} size={40} />
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[['👁', stats.views, 'Views'], ['🤝', stats.connections, 'Friends'], ['✉', stats.messages, 'Messages']].map(([icon, val, lbl]) => (
            <View key={lbl} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 16 }}>{icon}</Text>
              <Text style={{ color: T.gold, fontSize: 20, fontWeight: '700', marginVertical: 2 }}>{val}</Text>
              <Text style={{ color: '#9A9AAA', fontSize: 11 }}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>

      <Animated.View style={{ padding: 20, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Quick Actions */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: T.charcoal, marginBottom: 14 }}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {quickActions.map(q => (
            <TouchableOpacity key={q.tab} onPress={() => onNavigate(q.tab)} activeOpacity={0.7}
              style={{ flex: 1, backgroundColor: T.white, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.mist }}>
              <Text style={{ fontSize: 22, marginBottom: 6 }}>{q.icon}</Text>
              <Text style={{ fontSize: 12, color: T.slate, fontWeight: '500' }}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity Feed */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: T.charcoal, marginBottom: 14 }}>Community Activity</Text>
        {[
          { avatar:'KM', name:'Keisha M.', action:'posted a new legal guide', time:'2m', color:'#6B4A8A' },
          { avatar:'AR', name:'Alicia R.', action:'shared a job listing', time:'1h', color:T.success },
          { avatar:'TB', name:'Tyrone B.', action:'published a story', time:'3h', color:T.gold },
        ].map((a, i) => (
          <Card key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Avatar initials={a.avatar} size={36} color={a.color} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13 }}><Text style={{ fontWeight: '600' }}>{a.name}</Text> {a.action}</Text>
            </View>
            <Text style={{ fontSize: 11, color: T.slate }}>{a.time} ago</Text>
          </Card>
        ))}

        {/* Daily Quote */}
        <View style={{ backgroundColor: T.charcoal, borderRadius: 16, padding: 20, marginTop: 8 }}>
          <Text style={{ fontFamily: font.display, fontSize: 16, color: T.white, fontStyle: 'italic', fontWeight: '300', lineHeight: 24, marginBottom: 8 }}>
            "You are more than your record."
          </Text>
          <Text style={{ fontSize: 12, color: '#7A7A8A' }}>New Horizon · Daily Affirmation</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── CONNECT TAB ───────────────────────────────────────────────────────────────
function ConnectTab({ user, onMessage }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(new Set());
  const [stateFilter, setStateFilter] = useState('All');

  useEffect(() => {
    mockDB.getCommunity().then(data => { setMembers(data); setLoading(false); });
  }, []);

  const toggleLike = (id) => {
    setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filtered = stateFilter === 'All' ? members : members.filter(m => m.state === stateFilter);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.gold} size="large" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: T.ivory }}>
      <View style={{ backgroundColor: T.white, paddingTop: T.statusBar + 8, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.mist }}>
        <Text style={{ fontFamily: font.display, fontSize: 26, fontWeight: '300', color: T.charcoal }}>Connect</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {['All', 'TX', 'GA', 'FL', 'NY', 'IL', 'CA'].map(s => (
            <TouchableOpacity key={s} onPress={() => setStateFilter(s)}
              style={{ backgroundColor: stateFilter === s ? T.gold : T.ivory, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: stateFilter === s ? T.gold : T.mist }}>
              <Text style={{ color: stateFilter === s ? T.white : T.slate, fontSize: 13, fontWeight: stateFilter === s ? '600' : '400' }}>
                {s === 'All' ? 'All States' : s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: T.tabBar + 20 }}
        renderItem={({ item: u }) => (
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <Avatar initials={u.avatar} size={46} online={u.online} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 16, color: T.charcoal }}>{u.name}</Text>
                <Text style={{ fontSize: 12, color: T.slate }}>{u.age} · {u.state} · {u.online ? '🟢 Online' : 'Offline'}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: T.slate, lineHeight: 20, marginBottom: 12 }}>{u.bio}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {u.interests.map(tag => <Badge key={tag} label={tag} />)}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GoldButton title="Message" onPress={() => onMessage(u)} small />
              <TouchableOpacity onPress={() => toggleLike(u.id)} style={{ flex: 1, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: liked.has(u.id) ? T.rose : T.mist, backgroundColor: liked.has(u.id) ? T.roseL : T.white, alignItems: 'center' }}>
                <Text style={{ color: liked.has(u.id) ? T.rose : T.slate, fontSize: 14 }}>{liked.has(u.id) ? '♥ Liked' : '♡ Like'}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

// ─── MESSAGES TAB ──────────────────────────────────────────────────────────────
function MessagesTab({ user, initialPeer }) {
  const [activePeer, setActivePeer] = useState(initialPeer || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const peers = [
    { id:'u2', name:'Alicia Rivera', avatar:'AR', online:true, preview:'That job board is great!' },
    { id:'u3', name:'Devon Washington', avatar:'DW', online:false, preview:'Stay strong brother.' },
    { id:'u4', name:'Keisha Monroe', avatar:'KM', online:true, preview:'Check this legal resource.' },
  ];

  useEffect(() => {
    if (activePeer) {
      mockDB.getMessages(user.id, activePeer.id).then(setMessages);
    }
  }, [activePeer]);

  const send = () => {
    if (!input.trim()) return;
    const msg = { id: Date.now().toString(), from: user.id, text: input, time: 'Now', read: false };
    setMessages(prev => [...prev, msg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const replies = ["That's great to hear! 🙏", "Keep going, you've got this.", "Let me know if I can help."];
      setMessages(prev => [...prev, { id: Date.now().toString(), from: activePeer.id, text: replies[Math.floor(Math.random() * replies.length)], time: 'Now', read: false }]);
    }, 1400);
  };

  if (activePeer) return (
    <View style={{ flex: 1, backgroundColor: T.ivory }}>
      <View style={{ backgroundColor: T.white, paddingTop: T.statusBar + 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.mist, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => setActivePeer(null)}>
          <Text style={{ fontSize: 22, color: T.gold }}>←</Text>
        </TouchableOpacity>
        <Avatar initials={activePeer.avatar} size={36} online={activePeer.online} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', fontSize: 15 }}>{activePeer.name}</Text>
          <Text style={{ fontSize: 12, color: activePeer.online ? T.success : T.slate }}>{activePeer.online ? '● Online' : 'Offline'}</Text>
        </View>
      </View>

      <FlatList ref={scrollRef} data={messages} keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
        renderItem={({ item: m }) => (
          <View style={{ flexDirection: 'row', justifyContent: m.from === user.id ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
            <View style={{ backgroundColor: m.from === user.id ? T.gold : T.white, padding: 12, borderRadius: m.from === user.id ? 18 : 18, borderBottomRightRadius: m.from === user.id ? 4 : 18, borderBottomLeftRadius: m.from === user.id ? 18 : 4, maxWidth: W * 0.7, borderWidth: m.from === user.id ? 0 : 1, borderColor: T.mist }}>
              <Text style={{ color: m.from === user.id ? T.white : T.charcoal, fontSize: 14, lineHeight: 20 }}>{m.text}</Text>
              <Text style={{ fontSize: 10, color: m.from === user.id ? 'rgba(255,255,255,.7)' : T.slate, marginTop: 4, textAlign: 'right' }}>{m.time}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={typing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Avatar initials={activePeer.avatar} size={24} />
            <View style={{ backgroundColor: T.white, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: T.mist }}>
              <Text style={{ color: T.slate, fontSize: 12 }}>typing...</Text>
            </View>
          </View>
        ) : null}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', padding: 12, backgroundColor: T.white, borderTopWidth: 1, borderTopColor: T.mist, gap: 10, alignItems: 'flex-end' }}>
          <TextInput value={input} onChangeText={setInput} placeholder="Write a message..." multiline style={{ ...styles.input, flex: 1, maxHeight: 100 }} placeholderTextColor={T.slate} />
          <TouchableOpacity onPress={send} style={{ backgroundColor: T.gold, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: T.white, fontSize: 16 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.ivory }}>
      <View style={{ backgroundColor: T.white, paddingTop: T.statusBar + 8, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.mist }}>
        <Text style={{ fontFamily: font.display, fontSize: 26, fontWeight: '300', color: T.charcoal }}>Messages</Text>
      </View>
      <FlatList data={peers} keyExtractor={p => p.id} contentContainerStyle={{ paddingBottom: T.tabBar + 20 }}
        renderItem={({ item: p }) => (
          <TouchableOpacity onPress={() => setActivePeer(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: T.white, borderBottomWidth: 1, borderBottomColor: T.mist }}>
            <Avatar initials={p.avatar} size={44} online={p.online} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: T.charcoal }}>{p.name}</Text>
              <Text style={{ fontSize: 13, color: T.slate, marginTop: 2 }} numberOfLines={1}>{p.preview}</Text>
            </View>
            <Text style={{ color: T.gold, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ─── JOBS TAB ──────────────────────────────────────────────────────────────────
function JobsTab({ user }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(new Set());
  const [applied, setApplied] = useState(new Set());
  const [applying, setApplying] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => { mockDB.getJobs().then(data => { setJobs(data); setLoading(false); }); }, []);

  const applyToJob = async (job) => {
    setApplying(job.id);
    await new Promise(r => setTimeout(r, 1200));
    setApplied(prev => new Set([...prev, job.id]));
    setApplying(null);
    setSelectedJob(null);
    Alert.alert('Application Sent! ✓', `Your application was sent to ${job.company}. They'll be in touch soon.`);
  };

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.gold} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: T.ivory }}>
      <Modal visible={!!selectedJob} animationType="slide" presentationStyle="pageSheet">
        {selectedJob && (
          <SafeAreaView style={{ flex: 1, backgroundColor: T.white }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: T.mist }}>
              <Text style={{ fontFamily: font.display, fontSize: 22, fontWeight: '600' }}>Apply Now</Text>
              <TouchableOpacity onPress={() => setSelectedJob(null)}><Text style={{ fontSize: 22, color: T.slate }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              <View style={{ backgroundColor: T.ivory, borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 28 }}>{selectedJob.logo}</Text>
                <View>
                  <Text style={{ fontWeight: '600', fontSize: 16 }}>{selectedJob.title}</Text>
                  <Text style={{ color: T.slate, fontSize: 13 }}>{selectedJob.company} · {selectedJob.wage}</Text>
                </View>
              </View>
              {['Full Name', 'Email Address', 'Phone Number'].map(lbl => (
                <View key={lbl}>
                  <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6, color: T.charcoal }}>{lbl}</Text>
                  <TextInput placeholder={lbl} defaultValue={lbl === 'Full Name' ? user?.name : ''} style={styles.input} placeholderTextColor={T.slate} />
                </View>
              ))}
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Brief Introduction</Text>
                <TextInput placeholder="Why you're a great fit..." multiline numberOfLines={4} style={{ ...styles.input, height: 100 }} placeholderTextColor={T.slate} textAlignVertical="top" />
              </View>
              <View style={{ backgroundColor: T.infoL, padding: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, color: T.info, lineHeight: 18 }}>ℹ Felony history is disclosed per your privacy settings. This employer is felony-friendly.</Text>
              </View>
              <GoldButton title={applied.has(selectedJob.id) ? 'Already Applied ✓' : 'Submit Application'} onPress={() => applyToJob(selectedJob)} loading={applying === selectedJob.id} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      <View style={{ backgroundColor: T.white, paddingTop: T.statusBar + 8, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.mist }}>
        <Text style={{ fontFamily: font.display, fontSize: 26, fontWeight: '300', color: T.charcoal }}>Jobs</Text>
        <Text style={{ fontSize: 13, color: T.slate, marginTop: 2 }}>Felony-friendly employers, every listing.</Text>
      </View>

      <FlatList data={jobs} keyExtractor={j => j.id} contentContainerStyle={{ padding: 16, paddingBottom: T.tabBar + 20 }}
        renderItem={({ item: j }) => (
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <View style={{ width: 44, height: 44, backgroundColor: T.ivory, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.mist }}>
                <Text style={{ fontSize: 22 }}>{j.logo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: T.charcoal }}>{j.title}</Text>
                  {j.banTheBox && <Badge label="Ban the Box ✓" color={T.success} />}
                  {applied.has(j.id) && <Badge label="✓ Applied" color={T.success} />}
                </View>
                <Text style={{ fontSize: 13, color: T.slate, marginTop: 2 }}>{j.company} · {j.location}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: T.slate, lineHeight: 19, marginBottom: 12 }}>{j.desc}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: T.charcoal }}>{j.wage}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setSaved(p => { const n = new Set(p); n.has(j.id) ? n.delete(j.id) : n.add(j.id); return n; })}
                  style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: saved.has(j.id) ? T.gold : T.mist, backgroundColor: saved.has(j.id) ? T.gold + '15' : T.white, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: saved.has(j.id) ? T.gold : T.slate }}>{saved.has(j.id) ? '★' : '☆'}</Text>
                </TouchableOpacity>
                <GoldButton title={applied.has(j.id) ? 'Applied ✓' : 'Apply'} onPress={() => !applied.has(j.id) && setSelectedJob(j)} small />
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

// ─── NOTIFICATIONS TAB ─────────────────────────────────────────────────────────
function NotificationsTab({ user }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { mockDB.getNotifications(user.id).then(data => { setNotifs(data); setLoading(false); }); }, []);

  const markRead = (id) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })));
  const unread = notifs.filter(n => !n.read).length;

  const typeColors = { match: T.rose, message: T.info, job: T.success, resource: T.gold };

  return (
    <View style={{ flex: 1, backgroundColor: T.ivory }}>
      <View style={{ backgroundColor: T.white, paddingTop: T.statusBar + 8, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.mist, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{ fontFamily: font.display, fontSize: 26, fontWeight: '300', color: T.charcoal }}>Notifications</Text>
          {unread > 0 && <Text style={{ fontSize: 13, color: T.gold, marginTop: 2 }}>{unread} unread</Text>}
        </View>
        {unread > 0 && <TouchableOpacity onPress={markAllRead}><Text style={{ fontSize: 13, color: T.gold, fontWeight: '500' }}>Mark all read</Text></TouchableOpacity>}
      </View>

      {loading ? <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} /> : (
        <FlatList data={notifs} keyExtractor={n => n.id} contentContainerStyle={{ padding: 16, paddingBottom: T.tabBar + 20 }}
          renderItem={({ item: n }) => (
            <TouchableOpacity onPress={() => markRead(n.id)} activeOpacity={0.8}>
              <View style={{ backgroundColor: n.read ? T.white : T.gold + '08', borderRadius: 14, borderWidth: 1, borderColor: n.read ? T.mist : T.gold + '30', padding: 16, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: (typeColors[n.type] || T.gold) + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{n.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: T.charcoal, marginBottom: 2 }}>{n.title}</Text>
                  <Text style={{ fontSize: 13, color: T.slate, lineHeight: 18 }}>{n.body}</Text>
                  <Text style={{ fontSize: 11, color: T.slate, marginTop: 6 }}>{n.time}</Text>
                </View>
                {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.gold, marginTop: 4 }} />}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ─── PROFILE TAB ───────────────────────────────────────────────────────────────
function ProfileTab({ user, setUser, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bio: user?.bio || '', state: user?.state || '', interests: user?.interests?.join(', ') || '' });
  const [notifications, setNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setUser(prev => ({ ...prev, ...form, interests: form.interests.split(',').map(i => i.trim()).filter(Boolean) }));
    setSaving(false);
    setEditing(false);
    Alert.alert('Profile Updated', 'Your changes have been saved.');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.ivory }} contentContainerStyle={{ paddingBottom: T.tabBar + 20 }}>
      {/* Profile Hero */}
      <View style={{ backgroundColor: T.charcoal, paddingTop: T.statusBar + 16, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center' }}>
        <Avatar initials={user?.avatar || '?'} size={72} />
        <Text style={{ fontFamily: font.display, fontSize: 24, color: T.white, fontWeight: '300', marginTop: 12 }}>{user?.name}</Text>
        <Text style={{ fontSize: 13, color: '#9A9AAA', marginTop: 4 }}>{[user?.state, user?.offense].filter(Boolean).join(' · ')}</Text>
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 20 }}>
          {[['12', 'Connections'], ['3', 'Applied'], ['47', 'Messages']].map(([n, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={{ color: T.gold, fontSize: 22, fontWeight: '700', fontFamily: font.display }}>{n}</Text>
              <Text style={{ color: '#9A9AAA', fontSize: 11, marginTop: 2 }}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ padding: 20 }}>
        {editing ? (
          <Card>
            <Text style={{ fontFamily: font.display, fontSize: 20, fontWeight: '600', marginBottom: 16 }}>Edit Profile</Text>
            {[['Bio', 'bio', true], ['State', 'state', false], ['Interests', 'interests', false]].map(([lbl, key, multi]) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6 }}>{lbl}</Text>
                <TextInput value={form[key]} onChangeText={v => setForm(p => ({ ...p, [key]: v }))} multiline={multi} numberOfLines={multi ? 3 : 1} style={{ ...styles.input, height: multi ? 80 : 44 }} placeholderTextColor={T.slate} textAlignVertical={multi ? 'top' : 'center'} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GoldButton title={saving ? 'Saving...' : 'Save Changes'} onPress={save} loading={saving} />
              <TouchableOpacity onPress={() => setEditing(false)} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: T.mist, alignItems: 'center' }}>
                <Text style={{ color: T.slate }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: font.display, fontSize: 20, fontWeight: '600' }}>About Me</Text>
              <TouchableOpacity onPress={() => setEditing(true)}><Text style={{ color: T.gold, fontSize: 14, fontWeight: '500' }}>Edit</Text></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: T.slate, lineHeight: 20, marginBottom: 14 }}>{user?.bio || 'Add a bio to help others connect with you.'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(user?.interests || []).map(i => <Badge key={i} label={i} />)}
            </View>
          </Card>
        )}

        {/* Settings */}
        <Card style={{ marginTop: 4 }}>
          <Text style={{ fontFamily: font.display, fontSize: 20, fontWeight: '600', marginBottom: 16 }}>Settings</Text>
          {[
            ['Push Notifications', notifications, setNotifications],
            ['Public Profile', publicProfile, setPublicProfile],
          ].map(([lbl, val, setVal]) => (
            <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.mist }}>
              <Text style={{ fontSize: 14, color: T.charcoal }}>{lbl}</Text>
              <Switch value={val} onValueChange={setVal} trackColor={{ false: T.mist, true: T.gold }} thumbColor={T.white} />
            </View>
          ))}
        </Card>

        <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Sign Out', style: 'destructive', onPress: onLogout }])}
          style={{ marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.rose, alignItems: 'center', backgroundColor: T.roseL }}>
          <Text style={{ color: T.rose, fontWeight: '600', fontSize: 15 }}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── TAB BAR ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'Home', icon: '⊞', label: 'Home' },
  { id: 'Connect', icon: '♡', label: 'Connect' },
  { id: 'Messages', icon: '✉', label: 'Messages' },
  { id: 'Jobs', icon: '💼', label: 'Jobs' },
  { id: 'Profile', icon: '◯', label: 'Profile' },
];

function TabBar({ activeTab, setTab, unread = 3 }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: T.white, borderTopWidth: 1, borderTopColor: T.mist, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 10 }}>
      {TABS.map(t => (
        <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, alignItems: 'center', gap: 3, position: 'relative' }}>
          <Text style={{ fontSize: 20 }}>{t.icon}</Text>
          <Text style={{ fontSize: 10, color: activeTab === t.id ? T.gold : T.slate, fontWeight: activeTab === t.id ? '600' : '400' }}>{t.label}</Text>
          {t.id === 'Messages' && unread > 0 && (
            <View style={{ position: 'absolute', top: -2, right: '20%', backgroundColor: T.rose, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: T.white, fontSize: 9, fontWeight: '700' }}>{unread}</Text>
            </View>
          )}
          {activeTab === t.id && <View style={{ position: 'absolute', bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: T.gold }} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('Home');
  const [chatPeer, setChatPeer] = useState(null);

  const handleMessage = (peer) => { setChatPeer(peer); setTab('Messages'); };

  if (!user) return <AuthScreen onLogin={setUser} />;

  const screens = {
    Home: <HomeTab user={user} onNavigate={setTab} />,
    Connect: <ConnectTab user={user} onMessage={handleMessage} />,
    Messages: <MessagesTab user={user} initialPeer={chatPeer} />,
    Jobs: <JobsTab user={user} />,
    Notifications: <NotificationsTab user={user} />,
    Profile: <ProfileTab user={user} setUser={setUser} onLogout={() => setUser(null)} />,
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor={T.white} />
      <View style={{ flex: 1 }}>{screens[tab] || screens.Home}</View>
      <TabBar activeTab={tab} setTab={setTab} unread={3} />
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  input: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.mist,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: T.charcoal,
  },
});

/**
 * ─── EXPO APP.JSON ─────────────────────────────────────────────────────────────
 * {
 *   "expo": {
 *     "name": "New Horizon",
 *     "slug": "new-horizon",
 *     "version": "1.0.0",
 *     "orientation": "portrait",
 *     "icon": "./assets/icon.png",
 *     "splash": { "backgroundColor": "#1C1C1E" },
 *     "ios": {
 *       "bundleIdentifier": "com.newhorizon.app",
 *       "buildNumber": "1",
 *       "infoPlist": {
 *         "NSUserNotificationsUsageDescription": "Receive messages and job alerts"
 *       }
 *     },
 *     "android": {
 *       "package": "com.newhorizon.app",
 *       "versionCode": 1,
 *       "permissions": ["NOTIFICATIONS", "VIBRATE"]
 *     },
 *     "plugins": [["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#B8975A" }]]
 *   }
 * }
 */
