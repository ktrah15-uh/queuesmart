import { useNavigate, Link } from "react-router-dom";
import { useQueue } from "../contexts/QueueContext";
import Button from "../components/Button";

//dashboard page for users to see available services and join queues
function Dashboard() {

  //fetches the services from the QueueContext and allows navigation to the JoinQueue
const { services,queues,activeTicketId } = useQueue();

//allows navigation to the JoinQueue page when a user selects a service to join.
const navigate = useNavigate();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto"}}>
      <h1>User Dashboard</h1>
    
    <div style={{ border: "1px solid", borderColor: activeTicketId ? "var(--color-primary)" : "var(--color-border)", borderRadius: "var(--radius)", padding: "var(--space-md)", background: "var(--color-surface)", marginBottom: "var(--space-md)" }}>
        <h3 style={{ margin: "0 0 var(--space-xs) 0" }}>Your Notifications</h3>
        {activeTicketId ? (
          <p>You have an active ticket! <Link to="/status" style={{ color: "var(--color-primary)", textDecoration: "underline"  }}>View your live status here.</Link></p>
        ) : (
          <p>No active queues. Head to the Join page to get a ticket.</p>
        )}
      </div>

      <h2 style={{ marginTop: "var(--space-lg)", marginBottom: "var(--space-md)" }}>Live Queue Overview</h2>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {/* maps through the services and displays live line data instead of join buttons */}
        {services.map((service) => {
          // calculate how many people are in this specific line
          const lineLength = queues.filter(q => q.serviceId === service.id && q.status !== 'served').length;
          
          return (
            <div
              key={service.id}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                padding: "var(--space-md)",
                background: "var(--color-surface)",
              }}
            >
              <h3 style={{ margin: "0 0 var(--space-xs) 0" }}>{service.name}</h3>
              <p style={{ margin: "0 0 var(--space-xs) 0" }}>Currently waiting: <strong>{lineLength} people</strong></p>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: 0 }}>
                Estimated wait time: {lineLength * service.expectedDuration} mins
              </p>
            </div>
          );
        })}
      </div>

      {/* single button to navigate to the JoinQueue page */}
      <div style={{ marginTop: "var(--space-xl)", textAlign: "center" }}>
        <Button onClick={() => navigate("/join")}>Go to Join Queue Page</Button>
      </div>
    </div>
  );
}


export default Dashboard;