import { Link } from "react-router-dom";

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
        Manage your services and queues here.
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div style={{ padding: "var(--space-md)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
          <h2>Service Management</h2>
          <p>Create, edit, and manage available services.</p>
          <Link to="/admin/services">Go to Service Management</Link>
        </div>

        <div style={{ padding: "var(--space-md)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
          <h2>Queue Management</h2>
          <p>View current queues, reorder, and serve users.</p>
          <Link to="/admin/queues">Go to Queue Management</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;