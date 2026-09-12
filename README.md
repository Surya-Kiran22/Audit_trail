# Audit Trail — Event-Sourced Inventory & Logistics Ledger

"Audit Trail" is a production-grade, event-sourced supply chain ledger application built with Node.js, Express, MongoDB (Mongoose), React (Vite), and Recharts.

---

## 🏛️ System Architecture

### 1. Event Sourcing Core
- **State is Derived, Never Overwritten**: Every state mutation is recorded as an immutable, appended event in the MongoDB `events` collection.
- **Event Store Schema**:
  ```js
  {
    aggregateId: String,  // Container / Shipment ID
    eventType: String,    // CONTAINER_CREATED, LOADED_ON_SHIP, TEMPERATURE_SPIKE, ARRIVED_AT_PORT
    payload: Object,      // Event details (location, temperature, vessel, etc.)
    timestamp: Date,      // Event creation timestamp
    version: Number       // Monotonically increasing version per aggregateId (1, 2, 3...)
  }
  ```
- **Immutability Guarantee**: The event repository wrapper (`eventRepository.js`) exposes ONLY `append()` and read methods (`findByAggregateId`). It explicitly omits any `update*` or `delete*` operations.

### 2. CQRS (Command Query Responsibility Segregation)
- Physical router separation enforced at the application boundary:
  - `commandRouter` (`/api/commands`): Accepts mutating commands (`POST`). Returns `202 Accepted` + appended event metadata. Contains zero `GET` handlers.
  - `queryRouter` (`/api/queries`): Read-only queries (`GET`). Reads current projected state or replays event store raw streams. Contains zero `POST/PUT/DELETE` handlers.

### 3. Optimistic Concurrency Control (OCC)
- Every mutating command includes an `expectedVersion`.
- **Fast-fail Check**: `appendEvent` compares `expectedVersion` against the aggregate's latest version.
- **Database Safety Net**: A compound unique index `{ aggregateId: 1, version: 1 }` guarantees that parallel concurrent writers attempting duplicate version writes fail at the database level.
- **409 Conflict Response**: On mismatch, backend responds with `409 Conflict`:
  `{ error: "ConcurrencyConflict", currentVersion, expectedVersion }`.
- **Frontend Alert**: Surfaced via `ConflictBanner.jsx`, asking the user to refresh and reload state.

### 4. Read-Model Projections & Architectural Trade-off
- **Current State Cache**: Stored in `shipment_reads` collection for fast `GET /api/queries/shipment/:id` lookups.
- **Synchronous vs Asynchronous Trade-off Note**:
  In this application, projection updates (`updateProjection`) execute *synchronously* immediately following an event append to ensure immediate read-after-write consistency in single-node environments.
  In high-throughput distributed production environments, projections are typically decoupled and rebuilt *asynchronously* via MongoDB Change Streams, event buses, or message queues (such as Kafka or RabbitMQ).

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally at `mongodb://localhost:27017` (or set `MONGODB_URI` environment variable)

### 1. Backend Setup & Startup
```bash
cd audit-trail/backend
npm install
npm run dev
# Server listens on http://localhost:5000
```

### 2. Frontend Setup & Startup
```bash
cd audit-trail/frontend
npm install
npm run dev
# Vite dev server opens on http://localhost:3000
```

---

## 🧪 Running Automated Test Suites

### Backend Test Suite (Jest + Supertest + `mongodb-memory-server`)
Includes CQRS route audit, event schema validation, append-only repository immutability, `fold()` pure function logic, OCC conflict detection, and full E2E ledger lifecycle test.
```bash
cd audit-trail/backend
npm test
```

### Frontend Test Suite (Vitest + React Testing Library)
Includes component rendering tests for Timeline, StatePanel, TimeSlider, SensorChart, and ConflictBanner.
```bash
cd audit-trail/frontend
npm test
```

---

## 🕵️ Manual Forensic Reproduction Walkthrough

Follow these steps to test and reproduce the primary use case end-to-end:

1. **Launch Apps**: Start backend on port 5000 and frontend on port 3000. Open `http://localhost:3000` in your browser.
2. **Create Container**: In the top right form, enter `CONT-1001` and click **Create**.
   - Generates `CONTAINER_CREATED` event (v1).
3. **Load Container on Vessel**: In the Command Panel, click **Load on Ship (LOADED_ON_SHIP)**.
   - Generates `LOADED_ON_SHIP` event (v2). Status updates to `IN_TRANSIT`.
4. **Record Temperature Spike**: Enter `34` in the Temp (°C) input and click **Record Temp Spike**.
   - Generates `TEMPERATURE_SPIKE` event (v3). Observe the red `⚠️ TEMP SPIKE ALERT` in the State Panel and red reference line on the chart.
5. **Arrive at Destination Port**: Click **Arrive at Port (ARRIVED_AT_PORT)**.
   - Generates `ARRIVED_AT_PORT` event (v4). Status updates to `DELIVERED`.
6. **Test Stale Version (OCC 409)**:
   - Click **Test Stale Version (OCC 409)** (with stale v1 or v2).
   - Observe the `ConflictBanner` alert displaying a `409 ConcurrencyConflict` warning.
7. **Historical State Scrubbing ("Time Machine")**:
   - Drag the **State Scrubbing Time-Machine** range slider back to Event #3 (v3: `TEMPERATURE_SPIKE`).
   - Notice the **State Panel** rewinds state to show status as `IN_TRANSIT` with temp `34 °C` as it was at that exact moment in history!
8. **Sensor Chart Overlay**:
   - View the Recharts line graph plotting temperature metrics over time with labeled `ReferenceLine` and `ReferenceDot` markers for each lifecycle event.
"# Audit_trail" 
