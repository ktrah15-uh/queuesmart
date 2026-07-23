export const fakeUsers = [
  { id: "u1", name: "Student A", email: "studentA@university.edu", role: "user" },
  { id: "u2", name: "Admin B", email: "adminB@university.edu", role: "admin" }
];

export const mockServices = [
  { id: "s1", name: "Financial Aid Advising", description: "Speak with a counselor regarding grants and loans.", expectedDuration: 15, priority: "high", open: true },
  { id: "s2", name: "IT Help Desk", description: "Password resets and wifi troubleshooting.", expectedDuration: 10, priority: "medium", open: true },
  { id: "s3", name: "Academic Advising", description: "Course planning and degree requirements.", expectedDuration: 15, priority: "high", open: true },
  { id: "s4", name: "Registrar Office", description: "Transcripts, enrollment, and records.", expectedDuration: 12, priority: "medium", open: false }
];

// Starts empty, users will be pushed here when they join
export const mockQueues = [
  { queueId: "user123", serviceId: "s1", position: 1, status: "waiting" },
  { queueId: "user456", serviceId: "s1", position: 2, status: "waiting" }
];

// past queue visits for the History page (David / member 3)
// TODO A3: replace with real API data
export const mockHistory = [
  { id: 1, date: "2026-07-01", service: "Academic Advising", outcome: "served" },
  { id: 2, date: "2026-06-28", service: "Financial Aid Advising", outcome: "left early" },
  { id: 3, date: "2026-06-25", service: "IT Help Desk", outcome: "served" },
  { id: 4, date: "2026-06-20", service: "Registrar Office", outcome: "no show" },
  { id: 5, date: "2026-06-15", service: "Academic Advising", outcome: "served" },
  { id: 6, date: "2026-06-10", service: "IT Help Desk", outcome: "served" },
];

// starting notifications for the bell dropdown
export const mockNotifications = [
  { id: 1, text: "You are now #3 in line for Academic Advising", time: "2 min ago", read: false },
  { id: 2, text: "Almost your turn! Head to the Financial Aid desk", time: "1 hr ago", read: false },
  { id: 3, text: "IT Help Desk queue is now open", time: "yesterday", read: true },
];
