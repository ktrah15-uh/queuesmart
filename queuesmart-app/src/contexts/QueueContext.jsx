import { createContext, useContext, useState } from "react";
import { mockServices, mockQueues } from "../mockData";

const QueueContext = createContext();

export function QueueProvider({ children }) {

  // Load the fake users into our state
  const [queues, setQueues] = useState(mockQueues);
  
  //servies available for users to join
  const [services, setServices] = useState(mockServices);

  const[activeTicketId, setActiveTicketId] = useState(null);
//adds new user to the queue
  const joinQueue = (serviceId) => {
    const newTicket = {
      queueId: `ticket-${Date.now()}`, 
      serviceId,
      // calculates position in a line 
      position: queues.filter(q => q.serviceId === serviceId).length + 1,
      status: "waiting"
    };
    //puts ticket into line
    setQueues([...queues, newTicket]);
    setActiveTicketId(newTicket.queueId);
    return newTicket.queueId;
  };
//removes user from the queue
  const leaveQueue = (queueId) => {
    const updatedLine = queues.filter(q => q.queueId !== queueId);
    setQueues(updatedLine);

    setActiveTicketId(null);
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