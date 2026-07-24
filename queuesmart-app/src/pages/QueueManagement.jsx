import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { servicesApi, queueApi } from "../api/client";

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function QueueManagementContent() {
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serving, setServing] = useState(false);

  const loadQueue = useCallback(async (serviceId) => {
    try {
      const data = await queueApi.adminView(serviceId);
      setQueue(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Initial load: fetch services, then load the queue for whichever one is
  // selected first. Deliberately not split into a second effect keyed on
  // selectedServiceId - selecting a service is a user action, so it re-fetches
  // from the event handler below instead of being "synchronized" via an effect.
  useEffect(() => {
    (async () => {
      try {
        const data = await servicesApi.list();
        setServices(data);
        if (data.length > 0) {
          setSelectedServiceId(data[0].id);
          await loadQueue(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadQueue]);

  async function handleSelectService(serviceId) {
    setSelectedServiceId(serviceId);
    await loadQueue(serviceId);
  }

  async function handleServeNext() {
    if (queue.length === 0) return;
    setServing(true);
    try {
      const result = await queueApi.serveNext(selectedServiceId);
      alert(`Now serving ticket #${result.ticket.id}`);
      await loadQueue(selectedServiceId);
    } catch (err) {
      alert(err.message);
    } finally {
      setServing(false);
    }
  }

  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-md)" }}>
        <h1>Queue Management</h1>
      </div>

      <div style={{ padding: "var(--space-md)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", marginBottom: "var(--space-lg)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "var(--space-md)" }}>

        <div className="form-input" style={{ marginBottom: 0, flex: 1, minWidth: "200px" }}>
          <label className="form-input-label">Select Service to Manage:</label>
          <select
            className="form-input-field"
            value={selectedServiceId ?? ""}
            onChange={(e) => handleSelectService(Number(e.target.value))}
          >
            {services.length === 0 && <option value="">No services yet</option>}
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          onClick={handleServeNext}
          disabled={queue.length === 0 || serving}
        >
          {serving ? "Serving..." : "Serve Next User"}
        </Button>
      </div>

      {error && <p style={{ color: "var(--color-error)" }}>{error}</p>}

      <div>
        <h2 style={{ marginBottom: "var(--space-md)" }}>
          Current Queue {selectedService ? `for ${selectedService.name}` : ""} ({queue.length})
        </h2>

        {loading ? (
          <p style={{ color: "var(--color-text-muted)" }}>Loading queue...</p>
        ) : services.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--space-xl) 0", color: "var(--color-text-muted)", fontStyle: "italic", border: "1px dashed var(--color-border)", borderRadius: "var(--radius)" }}>
            <p>No services yet — create one in Service Management first.</p>
          </div>
        ) : queue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--space-xl) 0", color: "var(--color-text-muted)", fontStyle: "italic", border: "1px dashed var(--color-border)", borderRadius: "var(--radius)" }}>
            <p>The queue is currently empty.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {queue.map((ticket, index) => (
              <div key={ticket.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-md)", background: "var(--color-surface)", borderRadius: "var(--radius)" }}>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <div style={{ background: "var(--color-primary)", color: "white", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontWeight: "bold" }}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0" }}>Ticket #{ticket.id} · User #{ticket.userId}</h3>
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                      Joined: {formatTime(ticket.joinedAt)} · {ticket.priority} priority
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", marginTop: "var(--space-lg)" }}>
        Queue order comes straight from the backend (oldest arrival first). Serving the next
        user removes them from this list.
      </p>
    </div>
  );
}

function QueueManagement() {
  const { loading, isLoggedIn, isAdmin } = useAuth();

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "var(--space-xl)", color: "var(--color-text-muted)" }}>Loading...</p>;
  }

  if (!isLoggedIn || !isAdmin) {
    return (
      <div style={{ maxWidth: "400px", margin: "var(--space-xl) auto", textAlign: "center" }}>
        <h2>Admin sign-in required</h2>
        <p style={{ color: "var(--color-text-muted)" }}>
          {isLoggedIn
            ? "Your account doesn't have admin access."
            : "Please log in with an admin account to manage queues."}
        </p>
        <Link to="/login">Go to Login</Link>
      </div>
    );
  }

  return <QueueManagementContent />;
}

export default QueueManagement;
