import { useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import "./NotificationBell.css";

// notification bell that goes in the navbar
// written by: David Dick (member 3)

function NotificationBell() {
  const { notifications, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="bell-wrap">
      <button
        className="bell-btn"
        onClick={() => setOpen(!open)}
        title="notifications"
        type="button"
      >
        🔔
        {unread > 0 && <span className="bell-count">{unread}</span>}
      </button>

      {open && (
        <div className="bell-dropdown">
          <div className="bell-dropdown-header">
            <strong>Notifications</strong>
            <span>
              <button className="bell-link-btn" type="button" onClick={markAllRead}>
                mark all read
              </button>
              <button className="bell-link-btn" type="button" onClick={clearAll}>
                clear
              </button>
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="bell-empty">no notifications right now</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={n.read ? "bell-note-row" : "bell-note-row bell-note-unread"}
              >
                <div>{n.text}</div>
                <div className="bell-note-time">{n.time}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
