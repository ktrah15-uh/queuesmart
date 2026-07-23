Queue Service Functions (queue.service.js)

getQueueForService(serviceId)

* What it does: Gets the active queue for a specific service. Oldest entries are first.  
* Argument: serviceId (number)  
* Returns: An array of ticket objects (or an empty array if the line is empty).  
* Ticket format: { id: 12345, userId: "u123", serviceId: 1, status: "waiting", joinedAt: "2026-07-23T22:59:14.000Z", priority: "high" }

serveNext(serviceId)

* What it does: Removes the first person in line for a service and marks them as served.  
* Argument: serviceId (number)  
* Returns: An object with a success message and the ticket that was updated: { message: "Next user served.", ticket: { id: 12345, userId: "u123", status: "served" } }  
* Note: Throws a 404 error if the line is already empty.

Front-End Endpoints

POST /api/queue/join

* Drops a user into the line  
* Needs Auth: Yes  
* Send: { serviceId }

POST /api/queue/leave

* Pulls a user out of the line  
* Needs Auth: Yes  
* Send: { queueEntryId }

GET /api/queue/status/:queueEntryId

* Checks the live wait time for a specific ticket  
* Needs Auth: Yes  
* URL param: queueEntryId

