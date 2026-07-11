import { createContext, useContext, useState } from "react";
import { mockNotifications } from "../mockData";

// Notification state for the bell dropdown + toast popup
// written by: David Dick (member 3)
// TODO A3: replace mock stuff with real API / websocket updates

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [toast, setToast] = useState(null);

  // adds a notification to the bell list AND pops the toast for 3 seconds
  function addNotification(text) {
    const newNote = {
      id: Date.now(),
      text: text,
      time: "just now",
      read: false,
    };
    setNotifications((prev) => [newNote, ...prev]);
    setToast(text);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toast,
        addNotification,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
