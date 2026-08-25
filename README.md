# Guardian Insights

Build a production-quality web application frontend called:

"MPLADS Guardian"

Tagline:

"AI-powered monitoring and risk intelligence for MPLADS projects."

This is a Smart India Hackathon project for monitoring MPLADS government development projects.

IMPORTANT:

This is NOT a fraud-confirmation system.

The platform identifies unusual patterns, anomalies, delays, financial inconsistencies, possible duplicate works, and other indicators that deserve human investigation.

The UI must communicate:

"AI-assisted investigation prioritization"

NOT:

"AI automatically detects corruption."

==================================================

1. DESIGN DIRECTION

==================================================

Create a highly polished, professional government/public-sector monitoring dashboard.

Use the design philosophy of modern high-quality products such as Vercel:

- clean

- restrained

- minimal

- excellent typography

- strong visual hierarchy

- subtle borders

- neutral backgrounds

- dense but readable information

- very little decoration

- purposeful spacing

- subtle interaction feedback

The application must NOT look like an AI-generated template.

Avoid:

- excessive gradients

- glowing cards

- neon colors

- glassmorphism

- giant rounded containers

- excessive shadows

- floating blobs

- decorative AI illustrations

- unnecessary animations

- oversized headings

- excessive use of emojis

- generic "AI MAGIC" visuals

- purple/blue gradient backgrounds

- huge empty dashboard cards

The product should look credible enough that it could be used by a government department.

Think:

"government intelligence and monitoring platform"

rather than:

"startup landing page."

==================================================

2. VISUAL SYSTEM

==================================================

Use a mostly neutral color palette.

Primary background:

very light neutral / off-white.

Cards:

white.

Borders:

subtle gray.

Primary text:

near-black / dark gray.

Secondary text:

muted gray.

Use color ONLY where it conveys meaning.

Risk colors:

- Low = green

- Medium = amber/yellow

- High = orange

- Critical = red

Do not use these colors as decorative accents.

Use a restrained dark navy/charcoal as the primary navigation/accent color if needed.

Typography:

Use Inter or a similarly clean modern sans-serif.

Typography hierarchy must be clear:

- compact page titles

- medium section headings

- readable body text

- small metadata labels

Avoid extremely large typography.

Border radius:

small to medium.

Do NOT make every component heavily rounded.

Use subtle 1px borders and very light shadows only when necessary.

==================================================

3. APPLICATION STRUCTURE

==================================================

Create a responsive desktop-first application with:

LEFT SIDEBAR

TOP HEADER

MAIN CONTENT AREA

Sidebar navigation:

Overview

Projects

Risk Alerts

Analytics

Geographic Map

AI Assistant

Then a divider.

Administration:

Data Sources

System Status

Settings

At the bottom of the sidebar:

Logged-in user

"District Monitoring Officer"

Include a small avatar/profile area.

Sidebar should be compact and professional.

On mobile/tablet:

collapse the sidebar into a responsive navigation.

==================================================

4. TOP HEADER

==================================================

Top header should contain:

Page title / breadcrumb on the left.

On the right:

- global search

- notifications

- user profile

Global search should be visually subtle.

Notification icon should show a small indicator when there are unresolved high-risk alerts.

==================================================

5. OVERVIEW DASHBOARD

==================================================

Create the primary dashboard page.

Header:

"Overview"

Subtitle:

"Monitor MPLADS projects, fund utilization and emerging risk indicators."

Add a date/filter control:

"Last updated: Today, 10:42 AM"

Add filters:

- State

- District

- Constituency

- Project status

- Risk level

- Date range

Use compact filter controls rather than huge dropdown boxes.

==================================================

6. KPI SECTION

==================================================

Create four primary KPI cards:

Total Projects

24,582

Funds Monitored

₹1,284 Cr

High-Risk Projects

1,284

Delayed Projects

843

Each card should contain:

- small label

- large but not oversized number

- small comparison/trend indicator

- optional short description

Do NOT make these cards colorful.

Use neutral cards with risk color only where appropriate.

Example:

High-Risk Projects

1,284

+8.4% from previous period

Use subtle typography and borders.

==================================================

7. MAIN DASHBOARD CONTENT

==================================================

Create a two-column layout.

LEFT:

"Project Risk Distribution"

Use a clean chart showing:

Low

Medium

High

Critical

RIGHT:

"Project Status"

Show:

Completed

Ongoing

Delayed

Pending

Charts must be minimal and readable.

Below this:

"Risk Trend"

Show risk alerts over time.

Use a clean line chart with minimal gridlines.

Avoid excessive chart decoration.

==================================================

8. HIGH-RISK PROJECTS TABLE

==================================================

Create a large professional data table.

Title:

"Projects Requiring Attention"

Columns:

Project ID

Project Name

State

District

Sanctioned Amount

Utilized

Physical Progress

Risk Score

Status

Example data:

MPL-1842

Community Health Centre

Bihar

Patna

₹25.0 L

₹23.5 L

38%

92

High Risk

MPL-5821

Rural Road Improvement

Uttar Pradesh

Lucknow

₹18.0 L

₹14.2 L

72%

78

High Risk

MPL-2391

Community Hall

Delhi

North Delhi

₹12.0 L

₹5.4 L

95%

24

Low Risk

Risk score should have a small severity indicator.

Make rows clickable.

Clicking a row opens Project Details.

==================================================

9. RECENT ALERTS

==================================================

Create a section:

"Recent Risk Alerts"

Each alert should clearly communicate:

Project

Alert type

Severity

Detected time

Status

Examples:

Financial / Physical Progress Mismatch

MPL-1842

Critical

12 minutes ago

Unusual Expenditure Pattern

MPL-5821

High

37 minutes ago

Possible Duplicate Work

MPL-2391

Medium

1 hour ago

Do not use giant alert cards.

Use compact rows.

==================================================

10. PROJECT EXPLORER

==================================================

Create a dedicated Projects page.

Header:

"Projects"

Subtitle:

"Search and investigate MPLADS projects across monitored regions."

Add a powerful filter toolbar:

Search project

State

District

Constituency

Category

Agency

Risk level

Status

Date range

Below filters, show the project table.

Include:

pagination

sorting

column controls

search

Use realistic synthetic data.

The frontend should be designed so the mock data can later be replaced by API data.

==================================================

11. PROJECT DETAILS PAGE

==================================================

This is one of the most important pages.

Create a detailed investigation interface.

Header:

Project #MPL-1842

"Construction of Community Health Centre"

Location:

Patna, Bihar

Status:

Delayed

At the top show a prominent but restrained risk summary:

RISK SCORE

92 / 100

CRITICAL

Label:

"Requires Investigation"

IMPORTANT:

Do not say:

"Fraud detected"

"Corruption detected"

"Fraud probability 92%"

Instead say:

"High-risk indicators detected"

"Requires investigation"

"Human verification recommended"

==================================================

12. PROJECT FINANCIAL SUMMARY

==================================================

Create a financial information section:

Sanctioned Amount

₹25.0 L

Released Amount

₹24.2 L

Utilized Amount

₹23.5 L

Remaining

₹1.5 L

Financial Progress

94%

Physical Progress

38%

Use progress bars to compare financial and physical progress.

Make the mismatch visually obvious but professional.

Example:

Financial Progress

94% ━━━━━━━━━━━━━━━━━━━

Physical Progress

38% ━━━━━━━

Then show:

"Difference: 56 percentage points"

==================================================

13. PROJECT TIMELINE

==================================================

Create a horizontal or vertical timeline:

Project Sanctioned

↓

Funds Released

↓

Work Started

↓

Progress Updates

↓

Expected Completion

↓

Current Status

Show dates.

If delayed:

clearly display:

"6 months behind expected schedule"

Use restrained warning styling.

==================================================

14. MULTI-AGENT FINDINGS

==================================================

This is a major feature.

Create a section:

"AI Risk Analysis"

Subtitle:

"Independent analytical agents identified the following indicators."

Show separate findings for each agent.

Agents:

Financial Agent

Progress Agent

Delay Agent

Duplicate Detection Agent

Geographic Agent

Compliance Agent

Each finding should be displayed as a compact professional card/row.

Example:

FINANCIAL AGENT

Finding:

"Project expenditure is approximately 38% above the regional benchmark for comparable projects."

Severity:

High

Evidence:

₹23.5 L utilized of ₹25 L sanctioned.

Status:

Requires Review

Another:

PROGRESS AGENT

Finding:

"Financial progress significantly exceeds reported physical progress."

Financial progress:

94%

Physical progress:

38%

Severity:

Critical

Do NOT make these look like chatbot messages.

They are analytical evidence cards.

==================================================

15. RISK SCORE BREAKDOWN

==================================================

Create a clean visualization explaining the overall risk score.

Example:

Overall Risk

92 / 100

Contributors:

Financial anomaly      +20

Progress mismatch      +30

Delay indicator        +20

Duplicate similarity   +12

Geographic anomaly     +10

Total:

92

Use horizontal bars or a clean contribution chart.

Include a small explanatory note:

"Risk score represents the combined strength of detected indicators. It does not establish wrongdoing."

This is extremely important.

==================================================

16. RECOMMENDED ACTION

==================================================

Create a section:

"Recommended Investigation Steps"

Example:

1. Verify reported physical progress.

2. Review expenditure and payment records.

3. Compare with similar projects in the area.

4. Consider field inspection if discrepancies remain.

Add a button:

"Generate Investigation Brief"

Another:

"Mark for Review"

Another:

"Assign to Officer"

These are UI actions only for now.

==================================================

17. GEOGRAPHIC MAP

==================================================

Create a dedicated Geographic Map page.

Use an India map visualization.

Display project locations as markers.

Risk severity:

Low = green

Medium = amber

High = orange

Critical = red

Add map filters:

State

District

Risk level

Project category

Agency

Clicking a marker opens a compact project preview.

Example:

MPL-1842

Risk 92

Patna, Bihar

Physical progress: 38%

[View Project]

Avoid excessive map styling.

The map should feel like an administrative monitoring tool.

==================================================

18. RISK ALERTS PAGE

==================================================

Create a dedicated alerts page.

Header:

"Risk Alerts"

Tabs:

All

Critical

High

Medium

Low

Resolved

Each alert row should contain:

Severity

Project

Agent

Finding

Detected

Status

Example:

CRITICAL

MPL-1842

Progress Agent

Financial progress significantly exceeds physical progress

12 min ago

Open

Allow sorting and filtering.

==================================================

19. ANALYTICS PAGE

==================================================

Create an analytics dashboard for higher-level monitoring.

Include:

Risk by State

Risk by District

Risk by Project Category

Risk by Implementing Agency

Average Project Delay

Financial vs Physical Progress

Monthly Risk Trend

Use charts that prioritize clarity.

Include a "Top Risk Concentrations" section.

Example:

State

Bihar

High-risk projects: 183

District

Patna

High-risk projects: 42

Category

Community Infrastructure

High-risk projects: 96

==================================================

20. AI ASSISTANT PAGE

==================================================

Create an AI assistant interface.

IMPORTANT:

This should NOT dominate the application.

It should look like a professional analytical assistant.

Header:

"AI Assistant"

Subtitle:

"Ask questions about projects, risks and monitoring data."

Example suggested queries:

"Show high-risk projects in Bihar."

"Why was MPL-1842 flagged?"

"Which districts have the highest number of delayed projects?"

"Compare financial and physical progress in Patna."

Chat interface should be clean and compact.

Assistant responses should cite the relevant project/data evidence visually.

Example:

MPL-1842 was flagged because:

• Financial progress: 94%

• Physical progress: 38%

• Approx. 6-month delay

• Cost above regional benchmark

Risk score:

92 / 100

Recommended:

Physical verification and expenditure review.

Do not use excessive chatbot bubbles or playful AI graphics.

==================================================

21. DATA SOURCES PAGE

==================================================

Create a simple page showing where the monitoring data comes from.

For now use placeholders:

MPLADS Project Data

Financial Records

Progress Reports

Geographic Data

Inspection Records

Show:

Source

Last Updated

Records

Status

Example:

MPLADS Project Data

25 Aug 2026

24,582 records

Connected

For the prototype these can be mock values.

==================================================

22. SYSTEM STATUS

==================================================

Create a professional system status page.

Show:

Data Pipeline

Operational

Risk Detection Engine

Operational

Financial Agent

Operational

Progress Agent

Operational

Delay Agent

Operational

Duplicate Detection

Operational

Database

Operational

Use small status indicators.

==================================================

23. SETTINGS

==================================================

Create a simple settings page.

Sections:

Profile

Notifications

Risk Thresholds

Display Preferences

Data Refresh

Do not overbuild this.

==================================================

24. MOCK DATA ARCHITECTURE

==================================================

Use realistic synthetic MPLADS-style project data.

Create reusable mock datasets for:

projects

alerts

agent findings

financial records

progress records

locations

analytics

Structure the frontend so these can later be replaced by REST API calls.

Create a clean API service layer.

Do NOT hardcode every value directly inside UI components.

==================================================

25. RESPONSIVE DESIGN

==================================================

Desktop is the primary target.

Also support:

1440px

1280px

1024px

768px

mobile

On smaller screens:

- collapse sidebar

- stack dashboard sections

- make tables horizontally scrollable

- preserve usability

Do not simply shrink everything.

==================================================

26. MICRO-INTERACTIONS

==================================================

Use subtle animations only.

Examples:

- hover states

- table row hover

- button transitions

- sidebar transitions

- chart entrance

- page transitions

Animation should be fast and subtle.

Do NOT use:

- floating animations

- glowing effects

- excessive motion

- animated backgrounds

- spinning AI icons

==================================================

27. ACCESSIBILITY

==================================================

Follow good accessibility practices.

Include:

- readable contrast

- keyboard navigation

- visible focus states

- semantic HTML

- aria labels where appropriate

- risk indicators that do not rely ONLY on color

For example:

Critical

[red indicator] + "Critical"

not just a red dot.

==================================================

28. DESIGN QUALITY RULES

==================================================

Use a consistent spacing system.

Use a consistent typography scale.

Use reusable components.

Use consistent button styles.

Use consistent table styles.

Use consistent card styles.

Avoid random component styling.

Do not create every section as a different card.

Use page hierarchy and whitespace to separate sections.

The interface should feel like ONE product designed by one experienced design team.

==================================================

29. AI-SLOP PREVENTION

==================================================

This is extremely important.

The final result must NOT visually resemble a generic AI-generated dashboard.

Specifically avoid:

"Welcome back 👋"

"Your AI-powered future"

"Unlock insights"

"Smart analytics"

"AI magic"

"Revolutionary"

"Powered by AI" everywhere

Avoid decorative AI imagery.

Avoid gradients unless absolutely necessary.

Avoid huge rounded cards.

Avoid excessive glass effects.

Avoid purple/blue neon palettes.

Avoid excessive icons.

Avoid excessive use of emojis.

Avoid fake 3D illustrations.

Use real information hierarchy instead.

The product should communicate seriousness, trust, transparency and evidence.

==================================================

30. FINAL UX PRINCIPLE

==================================================

The core user journey should be:

LOGIN

↓

OVERVIEW

↓

IDENTIFY HIGH-RISK AREA

↓

FILTER PROJECTS

↓

OPEN PROJECT

↓

UNDERSTAND WHY IT WAS FLAGGED

↓

SEE AGENT EVIDENCE

↓

REVIEW RECOMMENDED ACTION

↓

GENERATE INVESTIGATION BRIEF

Make this workflow extremely intuitive.

The primary purpose of the product is not to show AI.

The primary purpose is to help an officer quickly answer:

"Which projects need my attention?"

"Why?"

"What evidence supports that?"

"What should I investigate?"

Build the frontend around those questions.

==================================================

31. IMPORTANT TECHNICAL REQUIREMENT

==================================================

Keep the frontend modular and exportable.

Do not tightly couple the UI to Base44-specific backend logic.

Use clean React components and a service/API abstraction.

The backend will later be built separately using FastAPI + PostgreSQL + multiple analytical AI agents.

The final frontend should be easy to connect to REST APIs.

Use mock data for now.

==================================================

FINAL RESULT:

Create a polished, realistic, production-quality MPLADS monitoring dashboard.

It should look like a serious government intelligence/monitoring application built by an experienced product design team.

Prioritize:

clarity

trust

evidence

data density

professionalism

accessibility

consistency

investigation workflow

NOT:

visual gimmicks

AI hype

decorative effects

generic dashboard aesthetics.

for the reference of the ui design and fonts i added a reference photo

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aaf9e2f9-66d0-42cc-8807-b1ca05f83f46).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
