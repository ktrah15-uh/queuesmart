import Navbar from "./Navbar";
import { useNotifications } from "../contexts/NotificationContext";
import "./NotificationBell.css";

function Layout({ children }) {
  const { toast } = useNotifications();

    return (
        <div>
      <Navbar />
      <main
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          padding: "var(--space-lg)",
        }}
      >
        {children}
      </main>

      {/* toast popup for new notifications - David (member 3) */}
      {toast && <div className="toast">🔔 {toast}</div>}
    </div>
    );
}

export default Layout;