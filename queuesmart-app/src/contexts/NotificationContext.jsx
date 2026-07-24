import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { notificationsApi } from "../api/client";

const NotificationContext = createContext();

function mapNote(n) {
  return {
    id: n.id,
    text: n.message,
    time: n.createdAt ? new Date(n.createdAt).toLocaleString() : "",
    read: n.read,
    type: n.type,
  };
}

export function NotificationProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  async function loadNotifications() {
    if (!isLoggedIn) {
      setNotifications([]);
      return;
    }
    try {
      const data = await notificationsApi.list();
      setNotifications((data || []).map(mapNote));
    } catch (err) {
      setNotifications([]);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [isLoggedIn]);

  async function addNotification(text, type = "queue_update") {
    setToast(text);
    setTimeout(() => setToast(null), 3000);

    if (!isLoggedIn) {
      setNotifications((prev) => [
        { id: Date.now(), text: text, time: "just now", read: false },
        ...prev,
      ]);
      return;
    }

    try {
      const note = await notificationsApi.create({ type: type, message: text });
      setNotifications((prev) => [mapNote(note), ...prev]);
    } catch (err) {
      setNotifications((prev) => [
        { id: Date.now(), text: text, time: "just now", read: false },
        ...prev,
      ]);
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!isLoggedIn) return;
    try {
      await notificationsApi.markAllRead();
    } catch (err) {}
  }

  async function clearAll() {
    setNotifications([]);
    if (!isLoggedIn) return;
    try {
      await notificationsApi.clearAll();
    } catch (err) {}
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
