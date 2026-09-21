# Đức Anh Maintenance V1.0 — DEV

Operational maintenance management system for elevator customers, buildings, elevators, contracts, maintenance agreements, work orders, technicians, confirmations, KPI and audit.

## Architecture
- Frontend: HTML/CSS/ES modules, responsive desktop/iPad/mobile.
- Backend: Firebase Authentication, Firestore, Storage, Cloud Functions.
- Source control: GitHub.
- DEV and PROD are separate Firebase projects.
- Firebase is the source of truth; AI is an application layer only.

## Safety / data rules
- Sequential codes are server-side and never reused.
- User-entered elevator codes are not accepted during creation.
- Wrong records are VOID/CANCELLED rather than physically deleted.
- Audit logs are append-only for normal users.
- Duplicate checks happen before code allocation.
- Maintenance legacy imports store total/completed counts instead of fake historical work orders.
- Technician location is captured explicitly at START WORK; no continuous tracking.
- Secrets and service-account keys must never be committed.

## Firebase
This repository is source-only until the DEV Firebase project is configured. Do not add production credentials to GitHub.

## First setup
1. Create Firebase DEV project.
2. Configure Authentication, Firestore, Storage and Functions.
3. Add web config to the DEV runtime (not a service-account key).
4. Run Emulator Suite.
5. Execute permission and lifecycle tests before any production deployment.
