export const fakeUsers = [
  { id: "u1", name: "Student A", email: "studentA@university.edu", role: "user" },
  { id: "u2", name: "Admin B", email: "adminB@university.edu", role: "admin" }
];

export const mockServices = [
  { id: "s1", name: "Financial Aid Advising", description: "Speak with a counselor regarding grants and loans.", expectedDuration: 15, priority: "high" },
  { id: "s2", name: "IT Help Desk", description: "Password resets and wifi troubleshooting.", expectedDuration: 10, priority: "medium" }
];

// Starts empty, users will be pushed here when they join
export const mockQueues = [
  { queueId: "user123", serviceId: "s1", position: 1, status: "waiting" },
  { queueId: "user456", serviceId: "s1", position: 2, status: "waiting" }
];