# StageSync — Live Band & Musician Hiring Platform

StageSync is a studio-grade live band and musician booking platform. It features artist discovery, full 6-tab studio specifications, live gig opportunities with compatibility matching, and concurrency-safe direct scheduling on top of a PostgreSQL database with Neon cloud deployment.

---

## Team Details

| Role | Name | Enrollment No. | GitHub Username |
|------|------|----------------|-----------------|
| Group Lead | Ojus Sood | 2501010313 | ojus-sd |
| Member 2 | Shubham Mittal | 2501010446 | shubhammittal2241 |
| Member 3 | Ajay Yadav | 2501010042 | AjayYadav08 |
| Member 4 | Kartikey Dhawan | 2501010213 | kartikey-dhawan |

---

## 1. Quick Links

- **Live Cloud Deployment:** [https://newapproj.vercel.app](https://newapproj.vercel.app)
- **GitHub Repository:** [https://github.com/AjayYadav08/newAP_Proj](https://github.com/AjayYadav08/newAP_Proj)

---

## 2. Quick Start (Local Setup)

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+) running locally on port 5432 (or a cloud `DATABASE_URL`)

### Database Setup
```bash
# 1. Connect to PostgreSQL and execute the schema (23 tables)
psql -d postgres -f dbms/03_schema.sql

# 2. Populate realistic seed data and complex queries
psql -d postgres -f dbms/04_queries.sql
```

### Start the Application
```bash
# Install dependencies (express, pg, cors)
npm install

# Start the server
npm start
```

Open your browser and navigate to:
**`http://localhost:3000`**

---

## 3. Project Architecture

The project is structured into a clean, modular architecture designed for high maintainability and college viva demonstration:

```text
├── backend/                       # Modular Backend Architecture (4 Team Modules)
│   ├── db.js                      # PostgreSQL connection pool (supports Local & Neon Cloud)
│   ├── server.js                  # Main Express app, middleware & router mounting
│   └── routes/                    # Team Member Domains
│       ├── artists.js             # Member 1: Artist Discovery, Pricing & 6-Tab Studio Specs
│       ├── bookings.js            # Member 2: Direct Booking Engine & Algorithm B Conflict Check
│       ├── requirements.js        # Member 3: Live Gig Opportunities & Compatibility Matching
│       └── events.js              # Member 4: Live Concerts, Venues & Financial Auditing
├── frontend/                      # Pure Client-Side Application (Zero Framework Overhead)
│   ├── index.html                 # 4-Page Marketplace Layout (Directory, Gigs, Post, Profile)
│   ├── style.css                  # Modern clean white / light SaaS theme
│   └── app.js                     # Vanilla JavaScript controller with Web Audio synthesizer
├── dbms/                          # Database Engineering Specifications
│   ├── 01_normalization.md        # Formal 1NF -> BCNF normalization proofs
│   ├── 02_er_diagram.png          # High-resolution ER diagram (23 tables)
│   ├── 03_schema.sql              # PostgreSQL DDL with GiST exclusion constraints
│   ├── 04_queries.sql             # 8 Complex business queries & sample seed data
│   ├── 05_query_timings.md        # EXPLAIN ANALYZE benchmark metrics
│   └── plans/                     # Query execution plans (Q1 to Q8)
├── vercel.json                    # Vercel serverless routing configuration
├── api/                           # Cloud deployment serverless entry point
│   └── index.js                   # Routes serverless requests to Express backend
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules (node_modules, .env, .vercel)
├── package.json                   # Project manifest & start script
└── README.md                      # Project documentation & Viva guide
```

---

## 4. Team Member Module Allocation (Viva Reference)

| Team Member | Assigned Backend File | Key Responsibilities | Core Viva Talking Point |
| :--- | :--- | :--- | :--- |
| **Member 1** | `backend/routes/artists.js` | Bands & Musicians Discovery, Filters & 6-Tab Portfolio Spec | Multi-attribute search indexing (Query 1), per-gig pricing models, and 6-tab studio specification modal (Overview, Members, Portfolio, Pricing, Technical Rider, Reviews). |
| **Member 2** | `backend/routes/bookings.js` | Direct Booking Engine & Concurrency Conflict Protection | **Algorithm B**: Concurrency-safe temporal slot overlap check (`start_time < $3 AND end_time > $2`) and PostgreSQL GiST exclusion constraint (`btree_gist`). |
| **Member 3** | `backend/routes/requirements.js` | Organizer Gig Openings & Compatibility Matching Engine | **Compatibility Algorithm**: Computes match percentage (up to 98%) based on musical genre alignment, geographic feasibility, and budget compliance. |
| **Member 4** | `backend/routes/events.js` | Live Concert Schedules, Venues & Financial Settlements | Multi-table joins for event operations, venue capacity utilization (Query 5), and artist career earnings audit aggregation (Query 4.2). |

---

## 5. Core Algorithms & SQL Queries

### Algorithm B: Concurrency-Safe Booking Overlap Check
- **Endpoint:** `POST /api/bookings`
- **Logic:** Before inserting any deal or booking, the system evaluates time-range overlap:
  ```sql
  SELECT b.id, b.start_time, b.end_time, e.title AS event_title
  FROM bookings b
  JOIN events e ON b.event_id = e.id
  WHERE b.artist_id = $1
    AND b.status NOT IN ('CANCELLED')
    AND b.start_time < $3
    AND b.end_time > $2;
  ```
- **Storage-Engine Safety:** Even under simultaneous requests, PostgreSQL's `btree_gist` exclusion constraint prevents double-booking at the storage level.

### Compatibility Matching Algorithm
- **Endpoint:** `GET /api/requirements`
- **Logic:** Matches open gig requirements with registered performers using weighted alignment scoring:
  1. **Genre Alignment:** +30 points for matching musical styles.
  2. **Location Proximity:** +15 points if the artist is based in the event city.
  3. **Budget Feasibility:** +10 points if the artist's rate fits within the organizer's allocated compensation.

---

## 6. Key Viva Questions & Answers

1. **Why is the database normalized up to 3NF / BCNF?**
   - It eliminates update, insert, and deletion anomalies.
   - Independent entities (Users, Artist Profiles, Bands, Band Members, Events, Bookings, Venues) reside in dedicated tables linked by foreign keys without data redundancy.

2. **Why use both application-level checks and GiST exclusion constraints?**
   - Application-level `SELECT ... WHERE` checks provide user-friendly error messages (e.g., *"Schedule Conflict: Artist already booked"*).
   - Database-level GiST constraints guarantee ACID transaction isolation even under high-concurrency race conditions.

3. **How does the system work on both Localhost and Vercel?**
   - `backend/db.js` dynamically checks for `process.env.DATABASE_URL`.
   - On Vercel, it connects via SSL to the cloud Neon PostgreSQL database.
   - On local development, it seamlessly falls back to the local PostgreSQL instance on port 5432.
