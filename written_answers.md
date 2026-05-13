# Written answers — <Sofia Moreno

## Q1 — Production correctness validation


> Describe a system you owned where you had to add production correctness validation — alarms, contract tests, golden datasets, something that caught a class of bugs before users did. What did you do, what worked, what didn't, and what would you do differently?


While working on an intelligent CRM project deployed on Oracle Cloud during a university-industry Oracle program at Tec de Monterrey, I learned (the hard way) how expensive it is to ignore production validation. The project lasted only ten weeks and had to reach production by the end, so most of our focus went into feature delivery. We accumulated many hotfixes, undocumented behaviors, and deployment assumptions that only a few team members understood.
The problems appeared during deployment. Oracle Cloud (which is not usually my first choice to say the least) often failed silently, and because we had almost no structured logging, tests, or monitoring, debugging became extremely slow and frustrating. Some backend services were failing without clear error messages, and we only noticed issues after parts of the application stopped responding correctly in production or simply would not deploy. We had used all our effort in developing and it was starting to show.
I took ownership of adding validation and observability in the backend I had developed after we had already progressed too far. I added backend logging around deployment-critical flows, created simple pre-deployment validation checks, and quickly documented configuration dependencies that previously existed only in conversations. I also introduced lightweight tests for the most fragile endpoints so we could verify that core workflows still worked before deployment.
What worked was the visibility: once logs and validation checks existed, deployment debugging became much faster. What did not work was introducing these practices late, after the architecture and workflows were already unstable. If I repeated the project today, I would prioritize observability, automated testing, and deployment validation from the first week instead of treating them as “extra” work added near release time. This is also what helped me and was expected of me in the more formal enterprise projects I worked on in Bono and Trott Systems, but more importantly what has saved me from another sleepless night trying to debug what was basically a wall.




## Q2 — Scaling-forced structural change


> Describe a system you've worked on where scaling — traffic, data volume, team size, or geography — forced a structural change to the code or architecture. What changed, who pushed back, and how did you decide?
Bono was just starting to work with data from Bancolombia, a bank that required supporting information from thousands of ATMs across the country. The platform had originally been designed around much smaller datasets, so scaling immediately exposed structural problems in both the frontend and backend. 


Some of the issues it had were similar to the ones in the challenge: The backend returned extremely large payloads because pagination had never been implemented. On the frontend, charts and tables tried to render every record at once, which caused performance problems and broken visualizations. Totals became inconsistent, pie charts failed to render correctly, and page navigation became increasingly unstable as the dataset grew from hundreds of records to thousands. Not to mention our very overwhelmed and relatively small development team.


While the CTO focused on broader architectural changes, I handled many of the application-level scaling fixes. I introduced pagination limits on both the frontend and backend, reduced unnecessary data loading, and adjusted graph behavior so visualizations could handle larger datasets more predictably. I also took care to navigate the application page by page to identify where scaling issues would appear next before users encountered them.
One challenge was balancing usability with performance. Some stakeholders initially pushed back against stricter pagination because they wanted to “see everything at once.” We ultimately decided on limits based on performance testing and practical usability rather than preference alone.
The experience taught me that scaling problems are rarely isolated. Once data volume increases, assumptions hidden throughout the entire application begin to fail simultaneously.


## Q3 — Cross-team contract change


> Describe a time you needed another team to change their API, contract, or shared resource for your work to ship. How did you propose it, how did the other side respond, and how did the change actually land?


Working at Bono meant I collaborated closely with sustainable development engineers who provided the environmental domain knowledge behind parts of the platform. One project required users to record different types of manure management data (that is a thing!) for carbon footprint calculations. To make the feature useful, I needed short, accurate descriptions that could be displayed in the frontend UI.
The challenge was that these descriptions could not simply be translated automatically. Many of the terms were highly specialized, and incorrect wording would confuse users or misrepresent the environmental methodology. I also needed the descriptions to fit UI constraints while remaining understandable to non-experts, even myself.
I proposed a lightweight process instead of formal documentation. I asked the engineers to write explanations as if they were tweets they could send internally to explain the concept quickly. I then created a shared spreadsheet with predefined fields for translations, UI-friendly descriptions, and technical notes.
The response was positive because the process minimized overhead for them (all the engineers were active twitter users) while still giving engineering the structure it needed. By the end of the day, I had usable descriptions/tweets that could go directly into the frontend, along with clearer explanations that later helped me implement the related backend formulas correctly.
