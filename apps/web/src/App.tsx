import { useEffect, useMemo, useState } from "react";

type ErrorEvent = {
  source: "frontend" | "backend";
  message: string;
  stack?: string;
  context?: any;
  timestamp?: string;
};

type ErrorGroup = {
  id: string;
  fingerprint: string;
  title: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  sample: ErrorEvent;
};

const API = "http://localhost:3000";

export default function App() {
  const [tab, setTab] = useState<"events" | "groups">("groups");

  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [groups, setGroups] = useState<ErrorGroup[]>([]);

  const [message, setMessage] = useState("TypeError: x is undefined");
  const [route, setRoute] = useState("/login");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refreshEvents() {
    const res = await fetch(`${API}/events`);
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
  }

  async function refreshGroups() {
    const res = await fetch(`${API}/groups?limit=50`);
    const data = await res.json();
    setGroups(Array.isArray(data) ? data : []);
  }

  async function refreshAll() {
    setErr(null);
    try {
      await Promise.all([refreshEvents(), refreshGroups()]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to refresh");
    }
  }

  async function send() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "frontend",
          message,
          stack: "at App.tsx:12:3",
          context: { route },
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const header = useMemo(
    () => ({
      fontFamily: "system-ui",
      padding: 24,
      maxWidth: 1000,
      margin: "0 auto",
    }),
    []
  );

  return (
    <div style={header}>
      <h1>Smart Error Tracker (MVP)</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setTab("groups")}
          style={{ padding: "10px 14px", borderRadius: 10, opacity: tab === "groups" ? 1 : 0.6 }}
        >
          Groups
        </button>
        <button
          onClick={() => setTab("events")}
          style={{ padding: "10px 14px", borderRadius: 10, opacity: tab === "events" ? 1 : 0.6 }}
        >
          Events
        </button>
        <button onClick={refreshAll} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Refresh
        </button>
      </div>

      <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <div>
          <label>Message</label>
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div>
          <label>Route</label>
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          />
        </div>

        <button onClick={send} disabled={loading} style={{ padding: 10, borderRadius: 10 }}>
          {loading ? "Sending..." : "Send test event"}
        </button>

        {err && <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{err}</pre>}
      </div>

      {tab === "groups" ? (
        <>
          <h2 style={{ marginTop: 24 }}>Top groups</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {groups.map((g) => (
              <div key={g.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <b>{g.title}</b>
                  <span>count: {g.count}</span>
                </div>
                <div style={{ marginTop: 6, opacity: 0.75 }}>
                  first: {g.firstSeen} • last: {g.lastSeen}
                </div>
                {g.sample?.context?.route && (
                  <div style={{ marginTop: 6, opacity: 0.75 }}>route: {g.sample.context.route}</div>
                )}
                {g.sample?.stack && <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", opacity: 0.8 }}>{g.sample.stack}</pre>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 style={{ marginTop: 24 }}>Latest events</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {events.map((ev, i) => (
              <div key={i} style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                <div>
                  <b>{ev.source}</b> • {ev.timestamp ?? "-"}
                </div>
                <div style={{ marginTop: 6 }}>{ev.message}</div>
                {ev.context?.route && <div style={{ marginTop: 6, opacity: 0.75 }}>route: {ev.context.route}</div>}
                {ev.stack && <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", opacity: 0.8 }}>{ev.stack}</pre>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}