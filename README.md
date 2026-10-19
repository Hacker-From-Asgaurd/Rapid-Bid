# Rapid Bid (formerly Damper Quote Pro)

> **Enterprise CPQ & Estimation Engine for Valve & Damper Manufacturers**  
> **100% Offline & Local Server Execution — Your data stays on your server.**

Rapid Bid transforms the estimation lifecycle for valve and heavy-duty damper manufacturing plants. It turns unstructured customer RFQ emails into fully costed engineering Bills of Materials (BOM), commercial quotations, and cost sheets in under 2 minutes with mathematical parity to certified costing sheets.

---

## 🚀 One-Command Launch (Windows)

Simply double-click or run:
```bat
start.bat
```
This automatically starts the FastAPI backend (`http://localhost:8000`) and Vite frontend (`http://localhost:5173`) in background windows and opens your browser.

### Manual Launch
```bash
# Terminal 1 - Backend (FastAPI + SQLite)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 - Frontend (React + Vite + Tailwind CSS)
cd frontend
npm run dev
```

---

## 🎯 Demo Walkthrough Script for Tomorrow's Industry Meeting

Follow this exact 5-step sequence during the meeting:

### Step 1: RFQ Smart Intake (Offline Text Parser)
1. In the top navbar, click **Smart Intake**.
2. From the **Try a sample RFQ email** dropdown, select **Sample 1: Heavy Industrial Damper (3000x3000x450, IS 2062, Electric)** or **Sample 3: Metric Notation (3 m by 3 m)**.
3. Show the client the instant rule-based extraction badges:
   - Dimensions: `3000 × 3000 × 450 mm`
   - Material: `IS 2062`
   - Actuation: `Electric`
   - Quantity: `2`
   - Pressure: `±500 mmWg`, Temp: `350°C`
4. Click **Create Quote Draft from RFQ →**. The app seamlessly routes into the Cost Estimator with all parameters pre-populated.

### Step 2: Instant 45-Part BOM & Live Margin Guard
1. Note the **Costing Accuracy: 100%** badge. The reference sizes match the company's baseline within ₹ 1.
2. Observe the **Live Margin Guard** card:
   - Margin ≥ 15%: **Healthy (OK)** in emerald.
   - Adjust target margin to 8%: instantly switches to **Below Minimum (<10%)** in red pulse.
3. Observe the **Rate Freshness** card: shows age of raw steel rates and warns sales reps if rates exceed the company's stale limit (default 30 days).

### Step 3: Dual PDF Generation
Show the client that Rapid Bid solves the biggest leak in industrial sales—commercial vs. technical sheet separation:
1. Click **Customer PDF**:
   - Generates official quotation `RB-2026-####` with Pune factory letterhead, GST 18%, terms, validity, and scope specifications.
   - **Crucial**: Notice that **NO internal raw material costs, manufacturing costs, or margins appear** on the customer copy.
   - If a non-reference size is estimated, it clearly displays *"Estimated - to be verified by engineering"*.
2. Click **Cost Sheet PDF**:
   - Generates confidential internal cost sheet with complete 45-part BOM, bought-out breakdown, fabrication breakdown, rate snapshot, markup, and net margin %.

### Step 4: Governance & Approval Workflow
1. Navigate to **Quotes Pipeline**.
2. Click **Load Demo Data** (or trigger from top bar) to populate 4 premier industrial clients (Tata Steel, JSW Steel, Reliance Industries, NTPC) and 10 realistic quotes across all stages.
3. Show quotes in **Pending approval** state:
   - When a quote exceeds the approval threshold (e.g., > ₹ 5,00,000) or margin falls below minimum, it locks into Pending Approval.
   - Manager/Admin can click **Approve** or **Reject** with audit trail comments.
   - The top navbar features a live notification counter badge for pending approvals.
4. Try clicking **Send to Client** on a quote with stale rates: a modal warns the user that rates are older than 30 days and requires managerial acknowledgment.

### Step 5: Impact & ROI Tracking
1. Navigate to **Impact & ROI**.
2. Show the client the measured metrics:
   - **Average Turnaround**: Down from 4.0 manual hours to **under 2 minutes** per quote.
   - **Engineering Hours Saved**: Demonstrates hours freed per month.
   - **Margin Protection Value**: Quantifies profit leakage prevented by catching stale steel prices and sub-threshold discounts.
3. Click **Export Impact Report (PDF)** to print the business case directly.

---

## 👥 Seed Credentials & User Roles

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@damperquote.com` | `DamperQuote2026!` | Global rates, approval limits, user management, full audit trail |
| **Manager** | `manager@damperquote.com` | `DamperQuote2026!` | Approve/Reject quotes, What-If simulator, rate import/export |
| **Engineer** | `engineer@damperquote.com` | `DamperQuote2026!` | Live costing, 3D CAD, BOM manual overrides, RFQ intake |
| **Sales** | `sales@damperquote.com` | `DamperQuote2026!` | RFQ intake, customer quotes, customer PDF export, pipeline tracking |

*(Quick 1-click persona switch buttons are also provided on the login page for effortless live demos)*

---

## 🔒 Security & Data Privacy

- **Your data stays on your server**: All BOM generation, formula evaluation, regex parsing, and ReportLab PDF compilation execute 100% on-premise without external cloud APIs.
- Automated daily SQLite backups with 30-day rotation (`python -m app.backup`).

---

## 🧪 Automated Acceptance Tests

Run the complete test suite:
```bash
cd backend
python -m pytest tests/test_rapid_bid_p1.py tests/test_costing_acceptance.py -v
```
All tests verify:
1. 15+ rule-based RFQ parser scenarios (dimensions, units, materials, actuators).
2. Approval threshold evaluation and role gates.
3. Customer PDF containment (asserts NO raw cost or margin leaked).
4. Stale rate detection and impact formulas.
5. 100% mathematical parity (Rs 0 deviation) on reference sizes.

---

## 🌐 Deploy

### 1. Deploy Backend on Render (Web Service)
1. In Render, select **New +** > **Web Service** and connect your repository (or deploy via `render.yaml` Blueprint).
2. Configure Docker settings:
   - **Environment**: Docker
   - **Root Directory**: `backend` (or leave blank if using `render.yaml`)
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Context**: `backend`
3. Set Environment Variables:
   - `ALLOWED_ORIGINS`: Comma-separated allowed frontend URLs (e.g. `https://your-rapid-bid.netlify.app,http://localhost:5173`)
   - `JWT_SECRET_KEY`: A strong random string for JWT authentication
   - `DATABASE_URL`: `sqlite:///./damper_quote_pro.db`
4. Click **Create Web Service**. Note your Render URL (e.g. `https://rapid-bid-backend.onrender.com`).

### 2. Deploy Frontend on Netlify
1. In Netlify, select **Add new site** > **Import an existing project** and connect this repository.
2. Build settings (automatically pre-configured by `netlify.toml`):
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Set Environment Variables under **Site configuration** > **Environment variables**:
   - `VITE_API_URL`: Your Render backend URL (e.g. `https://rapid-bid-backend.onrender.com`)
4. Click **Deploy Site**.
5. Once your Netlify site URL is generated, ensure it is added to `ALLOWED_ORIGINS` in your Render backend settings.
