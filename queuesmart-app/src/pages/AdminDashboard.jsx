import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { historyApi, queueApi, servicesApi } from "../api/client";

function PriorityBadge({ level }) {
  let color = "var(--color-text-muted)";
  if (level === "high") color = "var(--color-error)";
  if (level === "medium") color = "var(--color-warning)";
  if (level === "low") color = "var(--color-success)";

  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "bold",
        textTransform: "uppercase",
        background: "var(--color-bg)",
        color: color,
        border: "1px solid var(--color-border)",
      }}
    >
      {level}
    </span>
  );
}

function AdminDashboard() {
  const { isLoggedIn, isAdmin, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [services, setServices] = useState([]);
  const [waitingByService, setWaitingByService] = useState({});
  const [historyStats, setHistoryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const list = await servicesApi.list();
      setServices(list || []);

      const waitingMap = {};
      for (let i = 0; i < list.length; i++) {
        try {
          const tickets = await queueApi.adminView(list[i].id);
          let waiting = 0;
          for (let j = 0; j < tickets.length; j++) {
            if (tickets[j].status === "waiting") waiting = waiting + 1;
          }
          waitingMap[list[i].id] = waiting;
        } catch (err) {
          waitingMap[list[i].id] = 0;
        }
      }
      setWaitingByService(waitingMap);

      try {
        const stats = await historyApi.stats();
        setHistoryStats(stats);
      } catch (err) {
        setHistoryStats(null);
      }
    } catch (err) {
      setError(err.message || "could not load admin dashboard");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !isAdmin) {
      setLoading(false);
      return;
    }
    loadDashboard();
  }, [isLoggedIn, isAdmin, authLoading]);

  let totalWaiting = 0;
  for (const id in waitingByService) {
    totalWaiting = totalWaiting + waitingByService[id];
  }
  const openCount = services.filter((s) => s.isOpen !== false).length;

  async function handleToggleQueue(id) {
    const svc = services.find((s) => s.id === id);
    if (!svc) return;

    const wasOpen = svc.isOpen !== false;
    try {
      const updated = await servicesApi.update(id, { isOpen: !wasOpen });
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      addNotification(
        "Queue for " + svc.name + " is now " + (wasOpen ? "closed" : "open"),
        "queue_status"
      );
    } catch (err) {
      alert(err.message || "could not update service");
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1>Admin Dashboard</h1>
        <p style={{ color: "var(--color-text-muted)" }}>loading...</p>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1>Admin Dashboard</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Admin login required. <Link to="/login">Log in</Link> with an admin account.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1>Admin Dashboard</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
        Overview of every service and its queue
      </p>

      {error && (
        <p style={{ color: "var(--color-error)", marginBottom: "var(--space-md)" }}>{error}</p>
      )}

      <div
        style={{
          display: "flex",
          gap: "var(--space-md)",
          marginBottom: "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div style={statBoxStyle}>
          <div style={statNumStyle}>{totalWaiting}</div>
          <div>people waiting</div>
        </div>
        <div style={statBoxStyle}>
          <div style={statNumStyle}>
            {openCount} / {services.length}
          </div>
          <div>queues open</div>
        </div>
        <div style={statBoxStyle}>
          <div style={statNumStyle}>{services.length}</div>
          <div>total services</div>
        </div>
        {historyStats && (
          <div style={statBoxStyle}>
            <div style={statNumStyle}>{historyStats.totalVisits}</div>
            <div>past visits</div>
          </div>
        )}
      </div>

      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          padding: "var(--space-md)",
          overflowX: "auto",
          marginBottom: "var(--space-lg)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Service</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Waiting</th>
              <th style={thStyle}>Est. wait</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Quick action</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const waiting = waitingByService[s.id] || 0;
              const isOpen = s.isOpen !== false;

              return (
                <tr key={s.id}>
                  <td style={tdStyle}>{s.name}</td>
                  <td style={tdStyle}>
                    <PriorityBadge level={s.priority} />
                  </td>
                  <td style={tdStyle}>{waiting}</td>
                  <td style={tdStyle}>{waiting * s.expectedDuration} min</td>
                  <td style={tdStyle}>
                    {isOpen ? (
                      <span style={{ ...badgeStyle, color: "var(--color-success)", background: "rgba(43,138,62,0.15)" }}>
                        open
                      </span>
                    ) : (
                      <span style={{ ...badgeStyle, color: "var(--color-error)", background: "rgba(140,28,19,0.15)" }}>
                        closed
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <Button
                      onClick={() => handleToggleQueue(s.id)}
                      style={
                        isOpen
                          ? { background: "var(--color-error)", padding: "7px 12px", fontSize: "13px" }
                          : { padding: "7px 12px", fontSize: "13px" }
                      }
                    >
                      {isOpen ? "Close queue" : "Open queue"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {services.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-md)" }}>
            no services yet — create some in Service Management
          </p>
        )}
      </div>

      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-lg)" }}>
        * est. wait = people waiting × expected duration.
        creating/editing services is on the Service Management screen.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div
          style={{
            padding: "var(--space-md)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
          }}
        >
          <h2>Service Management</h2>
          <p>Create, edit, and manage available services.</p>
          <Link to="/admin/services">Go to Service Management</Link>
        </div>

        <div
          style={{
            padding: "var(--space-md)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
          }}
        >
          <h2>Queue Management</h2>
          <p>View current queues, reorder, and serve users.</p>
          <Link to="/admin/queues">Go to Queue Management</Link>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "12px",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
};

const tdStyle = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "var(--font-size-sm)",
};

const statBoxStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  padding: "14px 18px",
  flex: 1,
  minWidth: "120px",
  textAlign: "center",
  fontSize: "13px",
  color: "var(--color-text-muted)",
};

const statNumStyle = {
  fontSize: "26px",
  fontWeight: "bold",
  color: "var(--color-primary)",
};

const badgeStyle = {
  padding: "3px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

export default AdminDashboard;
