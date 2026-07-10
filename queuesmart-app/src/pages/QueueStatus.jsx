import { useNavigate } from "react-router-dom";
import { useQueue } from "../contexts/QueueContext";
import Button from "../components/Button";

// displays the status of users ticket and wait time 
function QueueStatus() {
  const navigate = useNavigate();
  const { queues, services, leaveQueue, activeTicketId } = useQueue();

  // find ticket object in the global array
  const myTicket = queues.find((q) => q.queueId === activeTicketId);

// if ticket is not found, display a message to the user and provide a button to return to the dashboard
  if (!myTicket) {
    return (
      <div style={{ textAlign: "center", marginTop: "var(--space-xl)" }}>
        <h2>No Active Queue Sessions</h2>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-md)" }}>You are not currently waiting for a service.</p>
        <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
      </div>
    );
  }
  //
  const service = services.find((s) => s.id === myTicket.serviceId);
// get estimated wait time -1 due to the fact a user is about to be served
  const waitTime = (myTicket.position - 1) * service.expectedDuration;

  //if a user leaves the queue, remove them from the queue and navigate back to the dashboard
  const handleLeave = () => {
    leaveQueue(activeTicketId);
    navigate("/");
  };

  let stateUI;
//status based on users position
    if (myTicket.status === "served") {
      //when it's the user turn to get served
    stateUI = (
      <div style={{ padding: "var(--space-lg)", background: "rgba(43,138,62,0.1)", border: "2px solid var(--color-success)", borderRadius: "var(--radius)" }}>
        <h2 style={{ color: "var(--color-success)", margin: "0 0 var(--space-xs) 0" }}>It's Your Turn!</h2>
        <p style={{ margin: 0 }}>Please proceed to the service desk now.</p>
      </div>
    );
  } else if (myTicket.position === 1) {
    // UI when the user is next in line to be served
    stateUI = (
      <div style={{ padding: "var(--space-lg)", background: "rgba(224, 146, 27, 0.1)", border: "2px solid var(--color-success)", borderRadius: "var(--radius)" }}>
        <h2 style={{ color: "var(--color-warning)", margin: "0 0 var(--space-xs) 0" }}>Almost Ready!</h2>
        <p style={{ margin: 0 }}>Please proceed to the service desk now.</p>
      </div>
    );
  } else {
    stateUI = (
      //UI when the user is beyond the first position in line
      <div style={{ padding: "var(--space-lg)", border: "2px solid var(--color-primary)", borderRadius: "var(--radius)" }}>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 var(--space-xs) 0" }}>Current Status</p>
        <h2 style={{ fontSize: "3rem", margin: "0 0 var(--space-xs) 0" }}>Position #{myTicket.position}</h2>
        <p style={{ margin: 0, fontSize: "1.2rem" }}>
          Estimated Wait: <strong>{waitTime > 0 ? waitTime : 0} mins</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
      <h1>Queue Status</h1>
      <h3 style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>{service.name}</h3>

      <div style={{ marginBottom: "var(--space-lg)" }}>
        {stateUI}
      </div>

      {myTicket.status !== 'served' ? (
        <Button onClick={handleLeave} variant="secondary" style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}>
          Leave Queue
        </Button>
      ) : (
        <Button onClick={() => navigate("/")}>
          Finish & Return
        </Button>
      )}
    </div>
  );
}

export default QueueStatus;