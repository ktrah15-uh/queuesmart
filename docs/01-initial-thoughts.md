# Part 1 - Initial Thoughts

## Users
Students, potential students, and faculty all utilize this system to:
- Join queues
- Get update notifications on the status of their queue
- View estimated wait times

## Administrators
Administrators will be expected to:
- Create services
- Manage views
- View stats

## Most Important Features
- Wait-time visibility
- Queueing logic
- Notifications

## Challenges
- **Estimating Wait-time.** In our system, we will attempt to estimate wait time for users accurately. In our first release, we will probably just take the number of people before the user in the queue, and 
Then multiply that by the expected amount of time for service. Later in the system, this could be 
modified to be more accurate, such as taking into account the speed at which staff are working, 
The number of no-shows, and people of higher priority cutting in front.
- **Notifications.** As notifications are planned to be sent out at a specific time, it is hard to determine 
the right time to send them out, as if a user receives a notification to join the queue to serve a 
customer too early, he/she might leave the app and therefore loose his/her spot in the queue. A 
notification to serve a customer too late might cause the user to miss his/her turn to serve a customer.
- **Priority vs Fairness.** The queue is being used by regular users of services. Their interest is in 
completing their service as quickly as possible. High-priority users have an interest in entering 
the service as quickly as possible. So the rules for priority vs fairness will have to be strict to treat 
both groups of users fairly.
- **Many users at the same time.** If a lot of people join at once, the position numbers and wait times have to stay correct and updated for everyone.
- **No Shows** There are cases when a user joins the queue but doesn't show up for his/her turn. In such cases, we will have a way of skipping such a user or even removing him/her from the queue.
