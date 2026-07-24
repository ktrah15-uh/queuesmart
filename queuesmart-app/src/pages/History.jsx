import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { historyApi } from "../api/client";

function OutcomeBadge({ outcome }) {
  let bg = "var(--color-surface)";
  let color = "var(--color-text-muted)";
  let label = outcome;

  if (outcome === "served") {
    bg = "rgba(43,138,62,0.15)";
    color = "var(--color-success)";
    label = "served";
  } else if (outcome === "left" || outcome === "left early") {
    bg = "rgba(224,146,27,0.15)";
    color = "var(--color-warning)";
    label = "left early";
  } else if (outcome === "no-show" || outcome === "no show") {
    bg = "rgba(140,28,19,0.15)";
    color = "var(--color-error)";
    label = "no show";
  }

  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "bold",
        background: bg,
        color: color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function History() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      if (authLoading) return;

      if (!isLoggedIn) {
        setHistory([]);
        setError("log in to see your history");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await historyApi.list();
        setHistory(data || []);
        setError("");
      } catch (err) {
        setHistory([]);
        setError(err.message || "could not load history");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [isLoggedIn, authLoading]);

  let rows = history;
  if (filter === "served") {
    rows = history.filter((h) => h.outcome === "served");
  } else if (filter === "left early") {
    rows = history.filter((h) => h.outcome === "left" || h.outcome === "left early");
  } else if (filter === "no show") {
    rows = history.filter((h) => h.outcome === "no-show" || h.outcome === "no show");
  }

  function simulateQueueUpdate() {
    const spot = Math.floor(Math.random() * 3) + 1;
    addNotification("Queue update: you are now #" + spot + " in line for Academic Advising");
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1>My History</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
        Queues you joined before
      </p>

      {!isLoggedIn && !authLoading ? (
        <p style={{ color: "var(--color-text-muted)" }}>
          Please <Link to="/login">log in</Link> to view your history.
        </p>
      ) : (
        <>
          <label style={{ display: "inline-block", marginBottom: "var(--space-md)", fontSize: "var(--font-size-sm)" }}>
            Show:{" "}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: "var(--space-sm)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
                marginLeft: "var(--space-xs)",
              }}
            >
              <option value="all">everything</option>
              <option value="served">served</option>
              <option value="left early">left early</option>
              <option value="no show">no show</option>
            </select>
          </label>

          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: "var(--space-md)",
              overflowX: "auto",
            }}
          >
            {loading ? (
              <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-md)" }}>
                loading...
              </p>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Service</th>
                      <th style={thStyle}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((h) => (
                      <tr key={h.id}>
                        <td style={tdStyle}>{(h.endedAt || h.joinedAt || "").slice(0, 10)}</td>
                        <td style={tdStyle}>{h.serviceName}</td>
                        <td style={tdStyle}>
                          <OutcomeBadge outcome={h.outcome} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {rows.length === 0 && (
                  <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-md)" }}>
                    {error || "nothing here for that filter"}
                  </p>
                )}
              </>
            )}
          </div>

          <div
            style={{
              marginTop: "var(--space-lg)",
              padding: "var(--space-md)",
              background: "rgba(224,146,27,0.12)",
              border: "1px solid var(--color-warning)",
              borderRadius: "var(--radius)",
              fontSize: "var(--font-size-sm)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
              flexWrap: "wrap",
            }}
          >
            <span>
              <strong>demo controls:</strong> fake a queue update notification
            </span>
            <Button onClick={simulateQueueUpdate}>Simulate queue update</Button>
          </div>
        </>
      )}
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

export default History;
