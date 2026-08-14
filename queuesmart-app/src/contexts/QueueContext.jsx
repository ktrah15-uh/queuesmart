import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api/client";

const QueueContext = createContext();

export function QueueProvider({ children }) {

  // Load the fake users into our state
  const [queues, setQueues] = useState([]);
  
  //servies available for users to join
  const [services, setServices] = useState([]);

  const[activeTicketId, setActiveTicketId] = useState(null);

  useEffect(() => {
    const fetchRealServices = async () => {
      try {
        const data = await api.get('/services');
        setServices(data || []);
      } catch (err) {
        console.error("Could not fetch real services:", err);
      }
    };
    fetchRealServices();
  }, []);

  //adds new user to the queue
  const joinQueue = async (serviceId) => {
    try {
      const data = await api.post('/queue/join', { serviceId });

      if (data.ticket){
        setQueues([...queues, { ...data.ticket, position: data.position }]);
        setActiveTicketId(data.ticket.id);
        return data.ticket.id;
      }
    } catch(error){
      alert(error.message || "Could not join queue");
      console.error("Error joining queue:", error);
    }
  };

  //removes user from the queue
  const leaveQueue = async (queueId) => {
     try {
      await api.post('/queue/leave', {queueEntryId: queueId });

      const updatedLine = queues.filter(q => q.id !== queueId);
      setQueues(updatedLine);
      setActiveTicketId(null);
     } catch (error) {
      alert(error.message || "Could not leave queue");
      console.error("Error leaving queue:", error);
     }
  };

  // admin can open/close a service queue (used by Admin Dashboard - David)
  const toggleServiceOpen = (serviceId) => {
    setServices(services.map((s) =>
      s.id === serviceId ? { ...s, open: !s.open } : s
    ));
  };

  return (
    <QueueContext.Provider value={{ queues, services, joinQueue, leaveQueue, activeTicketId, toggleServiceOpen }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  return useContext(QueueContext);
}