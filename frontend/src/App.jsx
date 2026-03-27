// ─────────────────────────────────────────────────────────────────────────────
// OnePlay — Frontend App
// File location: oneplay/frontend/src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";

// ── API Layer ─────────────────────────────────────────────────────────────────
// This reads VITE_WORKER_URL from your .env.local file at build time.
// When deploying frontend + backend on the same Worker, leave it empty.
const WORKER = import.meta.env.VITE_WORKER_URL || "";

async function apiValidateAdmin(password) {
  // We validate by trying to list keys — if we get 200, password is correct.
  const r = await fetch(`${WORKER}/api/keys`, {
    headers: { Authorization: `Bearer ${password}` },
  });
  return r.ok;
}

async function apiListKeys(password) {
  const r = await fetch(`${WORKER}/api/keys`, {
    headers: { Authorization: `Bearer ${password}` },
  });
  if (!r.ok) throw new Error("Failed to load keys");
  return r.json();
}

async function apiCreateKey(label, audioUrl, password) {
  const r = await fetch(`${WORKER}/api/keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${password}`,
    },
    body: JSON.stringify({ label, audioUrl }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Failed to create key");
  return data;
}

async function apiDeleteKey(id, password) {
  const r = await fetch(`${WORKER}/api/keys/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${password}` },
  });
  if (!r.ok) throw new Error("Failed to delete key");
}

async function apiCheckKey(id) {
  // Public check — returns { id, label, used } but NOT the audioUrl
  const r = await fetch(`${WORKER}/api/keys/${id}`);
  const data = await r.json();
  if (r.status === 404) throw new Error("KEY_NOT_FOUND");
  if (!r.ok) throw new Error(data.error || "Error");
  return data; // { id, label, used }
}

async function apiRedeemKey(id) {
  // Burns the key and returns { audioUrl, label }
  const r = await fetch(`${WORKER}/api/keys/${id}/redeem`, {
    method: "POST",
  });
  const data = await r.json();
  if (r.status === 403) throw new Error("KEY_ALREADY_USED");
  if (r.status === 404) throw new Error("KEY_NOT_FOUND");
  if (!r.ok) throw new Error(data.error || "Redemption failed");
  return data; // { audioUrl, label }
}

async function apiReactivateKey(id, password) {
  const r = await fetch(`${WORKER}/api/keys/${id}/reactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${password}` },
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || "Failed to reactivate key");
  }
}

// ── Styles & Design Tokens ────────────────────────────────────────────────────
const C = {
  bg:         "#0d0d10",
  surface:    "#14141a",
  surfaceHi:  "#1c1c24",
  border:     "#2a2a36",
  borderHi:   "#3a3a4a",
  gold:       "#c9973a",
  goldDim:    "#8a6520",
  text:       "#ddd9cf",
  muted:      "#888070",
  dim:        "#555048",
  danger:     "#a04040",
  dangerDim:  "#3a1a1a",
  green:      "#3a7a5a",
  greenDim:   "#1d3d2d",
};

const injectStyles = () => {
  if (document.getElementById("oneplay-styles")) return;
  const style = document.createElement("style");
  style.id = "oneplay-styles";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${C.bg}; }
    input::placeholder { color: ${C.dim}; }
    input:focus { outline: none !important; border-color: ${C.goldDim} !important; }
    button { transition: opacity 0.15s, transform 0.1s; }
    button:hover { opacity: 0.82; cursor: pointer; }
    button:active { transform: scale(0.97); }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: ${C.surface}; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
    @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
    @keyframes blink   { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
  `;
  document.head.appendChild(style);
};

// ── Shared UI Components ──────────────────────────────────────────────────────

function Logo({ size = 28 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" stroke={C.gold} strokeWidth="1.2" />
        <path d="M10 8.5 L20 14 L10 19.5 Z" fill={C.gold} />
        <circle cx="14" cy="14" r="3" fill="none" stroke={C.gold} strokeWidth="0.8" strokeDasharray="2 2" />
      </svg>
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: size * 0.75, color: C.gold, letterSpacing: "0.25em" }}>
        ONEPLAY
      </span>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", onKeyDown, style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        color: C.text,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 14,
        padding: "10px 14px",
        ...style,
      }}
    />
  );
}

function Btn({ children, onClick, variant = "primary", disabled = false, style = {} }) {
  const base = { fontFamily: "'Share Tech Mono', monospace", fontSize: 13, letterSpacing: "0.08em", padding: "9px 20px", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1, border: "none" };
  const v = {
    primary: { background: C.gold,        color: "#0d0d10" },
    ghost:   { background: "transparent", color: C.muted,   border: `1px solid ${C.border}` },
    danger:  { background: "transparent", color: "#d07070",  border: `1px solid ${C.dangerDim}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v[variant], ...style }}>
      {children}
    </button>
  );
}

function Badge({ used }) {
  return (
    <span style={{
      fontFamily: "'Share Tech Mono', monospace", fontSize: 10, padding: "2px 8px", borderRadius: 2,
      background: used ? C.dangerDim : C.greenDim,
      color:      used ? "#d07070"   : "#5abf8a",
      border: `1px solid ${used ? C.danger : C.green}`,
      letterSpacing: "0.08em",
    }}>
      {used ? "USED" : "ACTIVE"}
    </span>
  );
}

function ErrorMsg({ text }) {
  if (!text) return null;
  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#d07070", marginTop: 10, letterSpacing: "0.04em", animation: "fadeIn 0.2s" }}>
      ⚠ {text}
    </div>
  );
}

function fmt(ts) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Screen: Home ─────────────────────────────────────────────────────────────

function HomeScreen({ onAdmin, onUnlock }) {
  const [key,  setKey]  = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const handleChange = (val) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (raw.length <= 4) { setKey(raw); return; }
    setKey(raw.slice(0, 4) + "-" + raw.slice(4, 8));
  };

  const handleUnlock = async () => {
    const id = key.trim().toUpperCase();
    if (id.length < 9 || busy) return;
    setBusy(true);
    setErr("");
    try {
      const data = await apiCheckKey(id);
      if (data.used) { setErr("ACCESS DENIED — this key has already been played."); }
      else           { onUnlock(data); return; }
    } catch (e) {
      if (e.message === "KEY_NOT_FOUND") setErr("INVALID KEY — check the code and try again.");
      else setErr("Could not reach the server. Try again.");
    }
    setBusy(false);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, animation: "fadeIn 0.5s ease" }}>

      {/* Admin button — top right corner */}
      <button
        onClick={onAdmin}
        style={{
          position: "fixed", top: 20, right: 24,
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          color: C.dim,
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.15em",
          padding: "5px 12px",
          cursor: "pointer",
          transition: "border-color 0.2s, color 0.2s",
          zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.color = C.muted; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}
      >
        ADMIN
      </button>

      {/* Logo + tagline */}
      <Logo size={40} />
      <p style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: C.muted, marginTop: 10, fontSize: 17, letterSpacing: "0.05em" }}>
        one key · one play · then silence
      </p>

      {/* Key entry */}
      <div style={{ marginTop: 56, width: "100%", maxWidth: 360 }}>
        <input
          value={key}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          placeholder="XXXX-XXXX"
          maxLength={9}
          autoFocus
          style={{
            width: "100%",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            color: C.gold,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 28,
            padding: "14px 20px",
            textAlign: "center",
            letterSpacing: "0.3em",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.goldDim)}
          onBlur={(e)  => (e.target.style.borderColor = C.border)}
        />
        <ErrorMsg text={err} />
        <Btn
          onClick={handleUnlock}
          disabled={key.length < 9 || busy}
          style={{ width: "100%", marginTop: 12, padding: "12px 0", fontSize: 13, letterSpacing: "0.15em" }}
        >
          {busy ? "VERIFYING..." : "UNLOCK"}
        </Btn>
      </div>

      <p style={{ fontFamily: "'Share Tech Mono', monospace", color: C.dim, fontSize: 10, marginTop: 56, letterSpacing: "0.1em", textAlign: "center" }}>
        KEYS ARE SINGLE-USE · ONCE PLAYED, ACCESS IS PERMANENTLY REVOKED
      </p>
    </div>
  );
}

// ── Screen: Admin Login ───────────────────────────────────────────────────────

function AdminLoginScreen({ onSuccess, onBack }) {
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);

  const attempt = async () => {
    if (!pw.trim() || busy) return;
    setBusy(true);
    setErr("");
    try {
      const ok = await apiValidateAdmin(pw.trim());
      if (ok) { onSuccess(pw.trim()); }
      else    { setErr("ACCESS DENIED — incorrect password"); setPw(""); }
    } catch {
      setErr("Could not reach the server. Check your Worker URL.");
    }
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, animation: "fadeIn 0.4s ease" }}>
      <Logo />
      <div style={{ marginTop: 48, width: "100%", maxWidth: 360 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 32, background: C.surface }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.dim, letterSpacing: "0.2em", marginBottom: 24 }}>ADMINISTRATOR ACCESS</div>
          <TextInput value={pw} onChange={setPw} placeholder="Enter admin password" type="password" onKeyDown={(e) => e.key === "Enter" && attempt()} />
          <ErrorMsg text={err} />
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Btn onClick={onBack} variant="ghost">BACK</Btn>
            <Btn onClick={attempt} disabled={!pw.trim() || busy} style={{ flex: 1 }}>
              {busy ? "CHECKING..." : "AUTHENTICATE"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen: Admin Panel ───────────────────────────────────────────────────────

function AdminPanel({ password, onBack, onLogout }) {
  const [keys,    setKeys]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [label,   setLabel]   = useState("");
  const [url,     setUrl]     = useState("");
  const [created, setCreated] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [apiErr,  setApiErr]  = useState("");
  const formRef = useRef(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try { setKeys(await apiListKeys(password)); }
    catch { setApiErr("Failed to load keys."); }
    setLoading(false);
  }, [password]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    setApiErr("");
    try {
      const record = await apiCreateKey(label.trim(), url.trim(), password);
      setCreated(record.id);
      setLabel("");
      setUrl("");
      await loadKeys();
    } catch (e) {
      setApiErr(e.message);
    }
    setBusy(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete key ${id}? This cannot be undone.`)) return;
    try {
      await apiDeleteKey(id, password);
      if (created === id) setCreated(null);
      await loadKeys();
    } catch { setApiErr("Failed to delete key."); }
  };

  const handleReactivate = async (id) => {
    try {
      await apiReactivateKey(id, password);
      await loadKeys();
    } catch (e) { setApiErr(e.message || "Failed to reactivate key."); }
  };

  const handleReissue = (k) => {
    setLabel(k.label);
    setUrl(k.audioUrl || "");
    setCreated(null);
    setApiErr("");
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const copy = (text) => navigator.clipboard?.writeText(text).catch(() => {});

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px", maxWidth: 740, margin: "0 auto", animation: "fadeIn 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <Logo />
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onBack} variant="ghost" style={{ fontSize: 11 }}>← EXIT</Btn>
          <Btn onClick={onLogout} variant="danger" style={{ fontSize: 11 }}>LOGOUT</Btn>
        </div>
      </div>

      {/* Create key form */}
      <div ref={formRef} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 28, background: C.surface, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.gold, letterSpacing: "0.18em", marginBottom: 20 }}>◆ ISSUE NEW KEY</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <TextInput value={label} onChange={setLabel} placeholder="Label — e.g. Episode 1, Preview Track..." />
          <TextInput value={url}   onChange={setUrl}   placeholder="Direct audio URL (.mp3, .ogg, .wav, .m4a)" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          <Btn onClick={handleCreate} disabled={!url.trim() || busy} style={{ alignSelf: "flex-start" }}>
            {busy ? "GENERATING..." : "GENERATE KEY"}
          </Btn>
          <ErrorMsg text={apiErr} />
        </div>

        {created && (
          <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 20, animation: "fadeIn 0.3s" }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>KEY GENERATED —</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 26, color: C.gold, letterSpacing: "0.28em", background: C.surfaceHi, border: `1px solid ${C.goldDim}`, borderRadius: 4, padding: "10px 20px", flex: 1, textAlign: "center" }}>
                {created}
              </div>
              <Btn onClick={() => copy(created)} variant="ghost" style={{ whiteSpace: "nowrap", fontSize: 11 }}>COPY</Btn>
            </div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: C.dim, marginTop: 8, letterSpacing: "0.04em" }}>
              Share this key with the listener. It can only be played once.
            </div>
          </div>
        )}
      </div>

      {/* Keys list */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.gold, letterSpacing: "0.18em" }}>
            ◆ ALL KEYS ({keys.length})
          </div>
          <button onClick={loadKeys} style={{ background: "none", border: "none", color: C.dim, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, cursor: "pointer", letterSpacing: "0.1em" }}>
            ↻ REFRESH
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.dim, fontFamily: "'Share Tech Mono', monospace", fontSize: 12, animation: "pulse 1.4s infinite" }}>
            LOADING...
          </div>
        ) : keys.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim, fontFamily: "'Crimson Pro', serif", fontSize: 16, fontStyle: "italic" }}>
            No keys issued yet
          </div>
        ) : (
          keys.map((k, i) => (
            <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: i < keys.length - 1 ? `1px solid ${C.border}` : "none", opacity: k.used ? 0.55 : 1, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", color: k.used ? C.dim : C.text, fontSize: 15, letterSpacing: "0.15em" }}>{k.id}</span>
                  <Badge used={k.used} />
                </div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: "0.04em" }}>
                  {k.label} · created {fmt(k.createdAt)}{k.used && k.usedAt ? ` · played ${fmt(k.usedAt)}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                {!k.used && <Btn onClick={() => copy(k.id)} variant="ghost" style={{ fontSize: 10, padding: "5px 12px" }}>COPY</Btn>}
                {k.used && (
                  <Btn onClick={() => handleReactivate(k.id)} variant="ghost" style={{ fontSize: 10, padding: "5px 12px", color: "#5abf8a", borderColor: C.green }}>REACTIVATE</Btn>
                )}
                <Btn onClick={() => handleReissue(k)} variant="ghost" style={{ fontSize: 10, padding: "5px 12px" }}>REISSUE</Btn>
                <Btn onClick={() => handleDelete(k.id)} variant="danger" style={{ fontSize: 10, padding: "5px 12px" }}>DELETE</Btn>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Screen: Redeem (listener enters key) ──────────────────────────────────────

function RedeemScreen({ onSuccess, onBack }) {
  const [key,  setKey]  = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-format input as XXXX-XXXX
  const handleChange = (val) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (raw.length <= 4) { setKey(raw); return; }
    setKey(raw.slice(0, 4) + "-" + raw.slice(4, 8));
  };

  const handleUnlock = async () => {
    const id = key.trim().toUpperCase();
    if (id.length < 9 || busy) return;
    setBusy(true);
    setErr("");
    try {
      const data = await apiCheckKey(id);
      if (data.used) { setErr("ACCESS DENIED — this key has already been played."); }
      else           { onSuccess(data); return; } // { id, label, used:false }
    } catch (e) {
      if (e.message === "KEY_NOT_FOUND") setErr("INVALID KEY — check the code and try again.");
      else setErr("Could not reach the server. Try again.");
    }
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, animation: "fadeIn 0.4s ease" }}>
      <Logo />
      <div style={{ marginTop: 48, width: "100%", maxWidth: 400 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 32, background: C.surface }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.dim, letterSpacing: "0.2em", marginBottom: 6 }}>ENTER YOUR KEY</div>
          <div style={{ fontFamily: "'Crimson Pro', serif", color: C.muted, fontSize: 14, marginBottom: 22, fontStyle: "italic" }}>
            Each key grants one single, unrepeatable listen.
          </div>
          <input
            value={key}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="XXXX-XXXX"
            maxLength={9}
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, color: C.gold, fontFamily: "'Share Tech Mono', monospace", fontSize: 26, padding: "12px 16px", textAlign: "center", letterSpacing: "0.3em", outline: "none" }}
            onFocus={(e) => (e.target.style.borderColor = C.goldDim)}
            onBlur={(e)  => (e.target.style.borderColor = C.border)}
          />
          <ErrorMsg text={err} />
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Btn onClick={onBack} variant="ghost">BACK</Btn>
            <Btn onClick={handleUnlock} disabled={key.length < 9 || busy} style={{ flex: 1 }}>
              {busy ? "VERIFYING..." : "UNLOCK"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen: Player ────────────────────────────────────────────────────────────

function PlayerScreen({ keyInfo, onBack }) {
  // keyInfo = { id, label } — audioUrl is fetched only at play time
  const [phase,    setPhase]    = useState("ready"); // ready | playing | done | error
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errMsg,   setErrMsg]   = useState("");
  const audioRef   = useRef(null);
  const burnedRef  = useRef(false);

  const handlePlay = async () => {
    if (phase !== "ready" || burnedRef.current) return;
    burnedRef.current = true;
    setPhase("playing"); // show playing UI immediately for feel

    try {
      const { audioUrl } = await apiRedeemKey(keyInfo.id);
      audioRef.current.src = audioUrl;
      await audioRef.current.play();
    } catch (e) {
      const msg = e.message === "KEY_ALREADY_USED"
        ? "This key was already used in another session."
        : "Could not load audio. The URL may be invalid or the key was already used.";
      setPhase("error");
      setErrMsg(msg);
    }
  };

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, animation: "fadeIn 0.5s ease" }}>
      <Logo />

      <div style={{ marginTop: 48, width: "100%", maxWidth: 460, textAlign: "center" }}>
        {phase !== "done" && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.dim, letterSpacing: "0.2em" }}>NOW PLAYING</div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 22, color: C.text, marginTop: 8 }}>{keyInfo.label}</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: C.dim, marginTop: 4, letterSpacing: "0.1em" }}>KEY: {keyInfo.id}</div>
          </div>
        )}

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onLoadedMetadata={(e) => setDuration(e.target.duration)}
          onTimeUpdate={(e)     => { setProgress(e.target.currentTime); setDuration(e.target.duration); }}
          onEnded={()           => setPhase("done")}
          onError={()           => { if (phase === "playing" && !errMsg) { setPhase("error"); setErrMsg("Audio playback failed. Check the URL or try again."); } }}
          preload="none"
        />

        {/* READY: big play button */}
        {phase === "ready" && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 40, background: C.surface, animation: "fadeIn 0.4s" }}>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: C.muted, fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
              Once you press play, your key will be permanently consumed.
              <br />This audio cannot be replayed.
            </div>
            <button
              onClick={handlePlay}
              style={{ width: 80, height: 80, borderRadius: "50%", background: "transparent", border: `2px solid ${C.gold}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(201,151,58,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M9 5.5 L22 14 L9 22.5 Z" fill={C.gold} />
              </svg>
            </button>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: C.dim, marginTop: 18, letterSpacing: "0.15em" }}>TAP TO PLAY — ONE TIME ONLY</div>
          </div>
        )}

        {/* PLAYING: progress bar */}
        {phase === "playing" && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 32, background: C.surface, animation: "fadeIn 0.3s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 22 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, animation: "pulse 1s infinite" }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.gold, letterSpacing: "0.15em" }}>PLAYING</span>
            </div>
            <div style={{ background: C.bg, borderRadius: 3, height: 4, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", background: C.gold, width: duration ? `${(progress / duration) * 100}%` : "0%", transition: "width 0.5s linear", borderRadius: 3 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.muted }}>
              <span>{fmtTime(progress)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: C.dim, marginTop: 18, letterSpacing: "0.1em" }}>
              KEY CONSUMED · DO NOT CLOSE THIS TAB
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 48, background: C.surface, animation: "fadeIn 0.6s", textAlign: "center" }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: C.dim, padding: "5px 14px", border: `1px solid ${C.border}`, display: "inline-block", borderRadius: 2, marginBottom: 22 }}>
              SESSION COMPLETE
            </div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 20, color: C.text, marginBottom: 10 }}>{keyInfo.label}</div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: C.muted, fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              This audio has been played and its key permanently revoked.
              <br />It can never be accessed again.
            </div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: C.dim, letterSpacing: "0.12em" }}>
              KEY {keyInfo.id} · REVOKED
            </div>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div style={{ border: `1px solid ${C.danger}`, borderRadius: 8, padding: 32, background: C.dangerDim, animation: "fadeIn 0.3s" }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#d07070", letterSpacing: "0.1em", marginBottom: 10 }}>⚠ PLAYBACK ERROR</div>
            <div style={{ fontFamily: "'Crimson Pro', serif", color: C.muted, fontSize: 15, lineHeight: 1.6 }}>{errMsg}</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: C.dim, marginTop: 14, letterSpacing: "0.04em" }}>
              Note: your key has been consumed. Contact the admin if you need a replacement.
            </div>
          </div>
        )}

        {phase !== "playing" && (
          <button onClick={onBack} style={{ marginTop: 24, background: "none", border: "none", color: C.dim, cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
            ← BACK TO HOME
          </button>
        )}
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

const SESSION_KEY = "oneplay_admin_session";

function saveSession(pw) {
  try { localStorage.setItem(SESSION_KEY, pw); } catch {}
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}
function loadSession() {
  try { return localStorage.getItem(SESSION_KEY) || ""; } catch { return ""; }
}

export default function App() {
  const [screen,   setScreen]   = useState("home");   // home | admin-login | admin | redeem | player
  const [adminPw,  setAdminPw]  = useState("");       // stored for the session only
  const [keyInfo,  setKeyInfo]  = useState(null);     // { id, label } passed to PlayerScreen
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    injectStyles();
    // Restore saved admin session and validate it silently
    const saved = loadSession();
    if (saved) {
      apiValidateAdmin(saved).then((ok) => {
        if (ok) { setAdminPw(saved); setScreen("admin"); }
        else    { clearSession(); }
        setSessionChecked(true);
      }).catch(() => setSessionChecked(true));
    } else {
      setSessionChecked(true);
    }
  }, []);

  if (!sessionChecked) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.dim, letterSpacing: "0.2em", animation: "pulse 1.4s infinite" }}>LOADING...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {screen === "home" && (
        <HomeScreen
          onAdmin={() => setScreen(adminPw ? "admin" : "admin-login")}
          onUnlock={(data) => { setKeyInfo(data); setScreen("player"); }}
        />
      )}
      {screen === "admin-login" && (
        <AdminLoginScreen
          onSuccess={(pw) => { setAdminPw(pw); saveSession(pw); setScreen("admin"); }}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "admin" && (
        <AdminPanel
          password={adminPw}
          onBack={() => setScreen("home")}
          onLogout={() => { clearSession(); setAdminPw(""); setScreen("home"); }}
        />
      )}
      {screen === "redeem" && (
        <RedeemScreen
          onSuccess={(data) => { setKeyInfo(data); setScreen("player"); }}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "player" && keyInfo && (
        <PlayerScreen
          keyInfo={keyInfo}
          onBack={() => { setKeyInfo(null); setScreen("home"); }}
        />
      )}
    </div>
  );
}
