import {useState} from "react";
import { useNavigate } from "react-router-dom";
import { useQueue } from "../contexts/QueueContext";
import Button from "../components/Button";
import SmartInsight from "../components/SmartInsight";

// Screen for users to pick a service and get ticket 
function JoinQueue() {

  const navigate = useNavigate();
  const { services, queues, joinQueue, leaveQueue,activeTicketId } = useQueue();

  const[selectedServiceId, setSelectedServiceId] = useState("");

  // if a user already has an active ticket, prevent them from getting another 
  if (activeTicketId) {
    const myTicket = queues.find(q => q.id === activeTicketId);
    const service = services.find(s => s.id === myTicket?.serviceId);
    
    return (
      <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center", marginTop: "var(--space-xl)" }}>
        <h2>You are already in a queue!</h2>
        <p style={{ margin: "var(--space-md) 0", color: "var(--color-text-muted)" }}>
          You are currently waiting for: <strong style={{color: "var(--color-text)"}}>{service?.name}</strong>
        </p>
        <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "center", marginTop: "var(--space-md)" }}>
          <Button onClick={() => navigate("/status")}>View Live Status</Button>
          <Button variant="secondary" onClick={() => {
            leaveQueue(activeTicketId);
            navigate("/");
          }}>
            Leave Queue
          </Button>
        </div>
      </div>
    );
  }

 // calculate the current line length and estimated wait time whenever switching 
  const selectedService = services.find(s => s.id === selectedServiceId);
  const currentLineLength = selectedService ? queues.filter(q => q.serviceId === selectedServiceId && q.status !== 'served').length : 0;
  const estimatedWait = selectedService ? currentLineLength * selectedService.expectedDuration : 0;

  //
  const handleConfirm = async () => {
    if (selectedServiceId) {
      await joinQueue(selectedServiceId);
      //send to tracking page after joining queue
      navigate("/status"); 
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
      <h1>Join a Queue</h1>

      {services.length === 0 ? (
        <div style={{ padding: "var(--space-lg)", background: "rgba(140,28,19,0.1)", border: "1px solid var(--color-error)", borderRadius: "var(--radius)", marginTop: "var(--space-md)" }}>
           <h3 style={{ color: "var(--color-error)", margin: "0 0 var(--space-xs) 0" }}>No Services Available</h3>
           <p style={{ margin: 0, color: "var(--color-text-muted)" }}>There are currently no open services. An administrator must create a service in the Service Management panel before you can join a queue.</p>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
            Select a service below to get in line.
          </p>

          {/* Dropdown menu for selecting a service */}
          <select 
            value={selectedServiceId} 
            onChange={(e) => setSelectedServiceId(Number(e.target.value))}
            style={{ 
              width: "100%", 
              padding: "var(--space-md)", 
              borderRadius: "var(--radius)", 
              marginBottom: "var(--space-md)", 
              fontSize: "1rem" 
            }}
          >
            <option value="" disabled>-- Select a Service --</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Show details only after they pick an option from the dropdown */}
          {selectedService && (
            <div
              style={{
                margin: "var(--space-md) 0",
                padding: "var(--space-lg)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                textAlign: "left",
              }}
            >
              <h2 style={{ margin: "0 0 var(--space-xs) 0" }}>{selectedService.name}</h2>
              <p style={{ color: "var(--color-text-muted)", margin: "0 0 var(--space-md) 0" }}>
                {selectedService.description}
              </p>

              <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "var(--space-md) 0" }} />

              <div style={{ display: "grid", gap: "var(--space-xs)" }}>
                <p style={{ margin: 0 }}>
                  People currently ahead of you: <strong>{currentLineLength}</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Estimated wait time: <strong>{estimatedWait} minutes</strong>
                </p>
              </div>
            </div>
          )}

          {selectedService && <SmartInsight serviceId={selectedService.id} />}

          <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "center", marginTop: "var(--space-md)" }}>
            {/* prevent button function if nothing selected  */}
            <Button disabled={!selectedServiceId} onClick={handleConfirm}>
              Confirm & Join
            </Button>
            <Button variant="secondary" onClick={() => navigate("/")}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default JoinQueue;