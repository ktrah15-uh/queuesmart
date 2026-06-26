# Part 3 - Design/Architecture

## System Context Diagram
The system context diagram depicts the QueueSmart system as a single entity with two types of external users and a single external system. The external system for sending notifications to users, such as emails and sms are external to the QueueSmart system.

## How to read this diagram:
- **Users** and **Administrators** are outside the system; they are the people using it.
- **Queuesmart** is drawn as one box for now; we don't know the internal structures of the system yet.
- The **email/sms service** is an external system. We are not building our own email server, we will just use an outside service to deliver the notifications.
- The arrows indicate the functionality of the User/Administrator and the system.

## Container Diagram
Displays major functional components within a single container for a very simple system. For our simple system here, a front end for users to interact with the system, a back end for server-side processing, a database to hold data, and a notification component are the major components.

## How the major components interact
Here is a high-level look into the organization of email and notification systems and how the various components work:
- **The Front End:** The “User Interface / Frontend” in the architecture diagram, which users and administrators interact with in their browser (e.g., screens to join/leave a queue, a user’s place in line, etc., as well as the admin dashboard).
- The Front End (client) requests information or actions from the **Back End / API (server)**. The Back End is the ‘brain’ and is responsible for all the tasks, such as user login, adding/removing users from a queue, updating the queue with the latest information (arrival time and priority), and also calculating the estimated wait time for the users.
- The back end then stores this data in the **database** (the data store for all information, i.e., user information, the services created by the admins, all the queues, and the history of visits for each user).
- The back end notifies the notification component when it is almost a user’s turn or when the status of a queue has changed for a notification to be sent.
- The notification component sends a message to the user through an external service (e.g. email, SMS). 
