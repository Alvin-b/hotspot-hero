# MikroTik Hotspot Billing & Management System

## Overview

A full-stack hotspot billing system with MPESA payments, 5-letter connection codes, and RADIUS-based authentication. Built with React + Supabase (Lovable Cloud).

---

## Architecture

- **Frontend**: React (Admin Dashboard + Customer/Captive Portal)
- **Backend**: Supabase (Database + Edge Functions)
- **Payments**: Daraja MPESA STK Push via Edge Functions
- **Auth**: RADIUS reads credentials from Supabase PostgreSQL directly
- **SMS**: Skipped for now (codes shown on screen + admin dashboard)

---

## Pages & Features

### 1. Captive Portal (Public Landing Page)

- Clean, mobile-first page (most users on phones)
- Display available packages with prices and details
- "Buy Package" button triggers MPESA STK Push
- Login form: enter 5-letter connection code
- After login: show remaining time, package info, and connection code for reconnection

### 2. Customer Flow

1. User lands on captive portal
2. Selects a package (e.g., 1 Hour - KES 20)
3. Enters phone number → MPESA STK Push sent
4. Payment confirmed → 5-letter code generated and displayed on screen
5. User enters code to connect
6. If disconnected, re-enters same code to reconnect
7. Can purchase a new package to extend

# **Auto-Expire Users (Important!)**

When a package expires, the code must become invalid.

You need either:

### Option A — RADIUS session timeout

Use RADIUS attributes like:

```
Session-Timeout = <duration>

```

or

### Option B — Scheduled task

Your backend runs a cron job:

```
every minute:
  disable expired codes

```

✅ I recommend **Option A** (RADIUS handles expiry automatically).

---

# 2️⃣ **Reconnection Logic**

You said users can reconnect if disconnected.

So:

- Code must stay valid until expiry
- If disconnected, they can log in again
- Ensure the system allows multiple sessions or terminates previous session

---

# 3️⃣ **Prevent Code Sharing (Optional but Recommended)**

To prevent users from sharing codes:

Add **MAC binding**:

- When first login happens, bind MAC to the code
- Subsequent logins only allowed from same MAC

This is optional, but common in hotspot systems.

---

# 4️⃣ **Bandwidth Monitoring (Optional)**

You asked about bandwidth:

If you want to limit bandwidth, you can do:

- RADIUS attributes like `WISPr-Bandwidth-Max-Up/Down`
- Or use MikroTik queue profiles (advanced)

But for simplicity, start with **time-based packages** first.

---

# 5️⃣ **Admin Can Generate & Terminate Codes**

You already included this — good.

Just make sure:

- Terminate = disable in RADIUS
- Also stop active sessions (optional)

---

# 6️⃣ **Payment Verification**

Daraja webhook must be secured:

- Verify transaction ID
- Validate amount
- Check phone number
- Prevent duplicate payments

### 3. Admin Dashboard

- **Login**: Email/password authentication (Supabase Auth)
- **Dashboard Home**: Active users count, today's revenue, daily sales chart, recent payments
- **Packages Management**: Create/edit/delete packages (name, price, duration, speed limit)
- **Connection Codes**: View all active codes, terminate codes, manually generate codes
- **Payments**: View payment history, filter by status (pending/paid/failed), search by transaction ID
- **Reports**: Daily/weekly/monthly revenue charts, active user trends

### 4. Database Design

- **packages**: name, price, duration_minutes, speed_limit, status
- **orders**: user_phone, package_id, amount, mpesa_txn_id, status
- **connection_codes**: 5-letter code, package_id, radius_username, radius_password, expires_at, status
- **radcheck / radreply**: RADIUS-compatible tables for FreeRADIUS SQL authentication
- **user_roles**: Admin role management (secure, separate table)

### 5. MPESA Integration (Edge Functions)

- **STK Push endpoint**: Initiates payment request to customer's phone
- **Callback/webhook endpoint**: Receives payment confirmation from Daraja
- On successful payment: generate unique 5-letter code, create RADIUS credentials, store in DB

### 6. Connection Code System

- 5 uppercase letters, unique, stored in DB
- Maps to RADIUS username/password
- Validated on login: exists, not expired, status = active
- Can be reused for reconnection within validity period

### 7. Admin Authentication

- Supabase Auth with email/password
- Role-based access using secure user_roles table
- Protected admin routes

---

## Implementation Order

1. Database schema + Supabase Cloud setup
2. Package management (admin CRUD)
3. Captive portal UI (package display + login form)
4. MPESA payment integration (STK Push + webhook)
5. Connection code generation + RADIUS credential creation
6. Code-based login flow
7. Admin dashboard (stats, codes, payments, reports)
8. Admin authentication + role protection