# Đức Anh Maintenance

V1.0 DEV baseline. GitHub stores source code; Firebase provides Auth, Firestore, Storage, Cloud Functions and Security Rules.

Mobile-first for technicians; responsive for phone, iPad and desktop.

Core flow: Customer → Building → Elevator → Contract/Agreement → Schedule → Work Order → Confirmation → KPI.

Data quality: validation, address suggestions/GPS, duplicate detection, server-side validation and idempotency.

Numbering: Elevator, Contract and Work Order codes are server-side, sequential and never reused.

Firebase rules in this scaffold are deny-by-default until role/assignment rules are implemented and emulator-tested.
