import { useState } from "react";
import { mockHistory } from "../mockData";
import { useNotifications } from "../contexts/NotificationContext";
import Button from "../components/Button";

// History page - shows past queues the user joined
// written by: David Dick (member 3)

// little colored label for the outcome column
function OutcomeBadge({ outcome }) {
  // green = good, yellow = they left, red = no show
  let bg = "var(--color-surface)";
  let color = "var(--color-text-muted)";

  if (outcome === "served") {
    bg = "rgba(43,138,62,0.15)";
    color = "var(--color-success)";
  } else if (outcome === "left early") {
    bg = "rgba(224,146,27,0.15)";
    color = "var(--color-warning)";
  } else if (outcome === "no show") {
    bg = "rgba(140,28,19,0.15)";
    color = "var(--color-error)";
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
      {outcome}
    </span>
  );
}

function History() {
  const [filter, setFilter] = useState("all");
  const { addNotification } = useNotifications();

  // only show rows that match the dropdown
  const rows = mockHistory.filter((h) => filter === "all" || h.outcome === filter);

  // demo only - fakes a queue update since we dont have a backend yet
  function simulateQueueUpdate() {
    const spot = Math.floor(Math.random() * 3) + 1;
    addNotification("Queue update: you are now #" + spot + " in line for Academic Advising");
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1>My History</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
        Queues you joined before (mock data for now)
      </p>

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
                <td style={tdStyle}>{h.date}</td>
                <td style={tdStyle}>{h.service}</td>
                <td style={tdStyle}>
                  <OutcomeBadge outcome={h.outcome} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-md)" }}>
            nothing here for that filter
          </p>
        )}
      </div>

      {/* demo only!! remove before final. fakes a queue update since theres no backend */}
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
          <strong>demo controls:</strong> no backend yet, so this button fakes a queue update
        </span>
        <Button onClick={simulateQueueUpdate}>Simulate queue update</Button>
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

export default History;
