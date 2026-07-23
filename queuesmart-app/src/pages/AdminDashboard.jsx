import { Link } from "react-router-dom";
import { useQueue } from "../contexts/QueueContext";
import { useNotifications } from "../contexts/NotificationContext";
import Button from "../components/Button";

// Admin Dashboard - overview of every service and its queue
// written by: David Dick (member 3)
// creating/editing services is on Service Management (member 4's part)

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
  const { services, queues, toggleServiceOpen } = useQueue();
  const { addNotification } = useNotifications();

  // add up everyone waiting across all the services
  const totalWaiting = queues.filter((q) => q.status === "waiting").length;
  const openCount = services.filter((s) => s.open !== false).length;

  // admin quick action: open or close a queue
  function handleToggleQueue(id) {
    console.log("toggling queue for service", id);
    const svc = services.find((s) => s.id === id);
    if (!svc) return;

    const wasOpen = svc.open !== false;
    toggleServiceOpen(id);

    // this counts as a "queue status changed" notification from the assignment
    addNotification(
      "Queue for " + svc.name + " is now " + (wasOpen ? "closed" : "open")
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1>Admin Dashboard</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
        Overview of every service and its queue
      </p>

      {/* quick stats row */}
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
      </div>

      {/* services table */}
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
              const waiting = queues.filter(
                (q) => q.serviceId === s.id && q.status === "waiting"
              ).length;
              const isOpen = s.open !== false;

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
      </div>

      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-lg)" }}>
        * est. wait = people waiting × expected duration (same simple formula from our A1).
        creating/editing services is on the Service Management screen.
      </p>

      {/* links to the other admin screens */}
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
