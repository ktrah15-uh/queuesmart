import { useState } from "react";
import Button from "../components/Button";
import FormInput from "../components/FormInput";

function QueueManagement() {
  const [services] = useState([
    { id: "s1", name: "General Consultation" },
    { id: "s2", name: "Urgent Support" },
    { id: "s3", name: "Billing Inquiry" }
  ]);

  const [selectedServiceId, setSelectedServiceId] = useState("s1");

  const [queues, setQueues] = useState({
    "s1": [
      { id: "u1", name: "Alice Johnson", email: "alice@example.com", joinedAt: "10:00 AM" },
      { id: "u2", name: "Bob Smith", email: "bob@example.com", joinedAt: "10:05 AM" },
      { id: "u3", name: "Charlie Davis", email: "charlie@example.com", joinedAt: "10:12 AM" }
    ],
    "s2": [
      { id: "u4", name: "Diana Prince", email: "diana@example.com", joinedAt: "09:45 AM" }
    ],
    "s3": []
  });

  const currentQueue = queues[selectedServiceId] || [];

  const handleServeNext = () => {
    if (currentQueue.length === 0) return;
    
    // Simulate serving next
    const servedUser = currentQueue[0];
    alert(`Now serving: ${servedUser.name}`);
    
    setQueues({
      ...queues,
      [selectedServiceId]: currentQueue.slice(1)
    });
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newQueue = [...currentQueue];
    const temp = newQueue[index - 1];
    newQueue[index - 1] = newQueue[index];
    newQueue[index] = temp;
    setQueues({ ...queues, [selectedServiceId]: newQueue });
  };

  const handleMoveDown = (index) => {
    if (index === currentQueue.length - 1) return;
    const newQueue = [...currentQueue];
    const temp = newQueue[index + 1];
    newQueue[index + 1] = newQueue[index];
    newQueue[index] = temp;
    setQueues({ ...queues, [selectedServiceId]: newQueue });
  };

  const handleRemove = (index) => {
    const user = currentQueue[index];
    if (window.confirm(`Are you sure you want to remove ${user.name} from the queue?`)) {
      const newQueue = currentQueue.filter((_, i) => i !== index);
      setQueues({ ...queues, [selectedServiceId]: newQueue });
    }
  };

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
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
          >
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <Button 
          type="button"
          onClick={handleServeNext} 
          disabled={currentQueue.length === 0}
        >
          Serve Next User
        </Button>
      </div>

      <div>
        <h2 style={{ marginBottom: "var(--space-md)" }}>Current Queue ({currentQueue.length})</h2>
        
        {currentQueue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--space-xl) 0", color: "var(--color-text-muted)", fontStyle: "italic", border: "1px dashed var(--color-border)", borderRadius: "var(--radius)" }}>
            <p>The queue is currently empty.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {currentQueue.map((user, index) => (
              <div key={user.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-md)", background: "var(--color-surface)", borderRadius: "var(--radius)" }}>
                
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <div style={{ background: "var(--color-primary)", color: "white", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontWeight: "bold" }}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0" }}>{user.name}</h3>
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{user.email} • Joined: {user.joinedAt}</p>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={{ padding: "4px 8px" }}
                  >
                    ↑
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === currentQueue.length - 1}
                    style={{ padding: "4px 8px" }}
                  >
                    ↓
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => handleRemove(index)}
                    style={{ padding: "4px 8px", background: "var(--color-error)" }}
                  >
                    ✕
                  </Button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default QueueManagement;