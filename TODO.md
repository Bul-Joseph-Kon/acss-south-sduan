# ACSS SOUTH SUDAN - Implementation TODO

## Scope: “All” (A+B+C+D)

### Step 1 — Inventory & wiring decisions
- [ ] Decide navigation strategy: inline role dashboards (current) vs SPA router (modules).
- [ ] Normalize role names + localStorage keys across `index.html`, `src/main.js`, and `pages/*-dashboard.html`.

### Step 2 — Public portal enhancements (index.html)
- [ ] Add/ensure Services overview cards align with the architecture tree.
- [ ] Add Online Services overview sections and Help Center section.
- [ ] Add AI entry points that open the existing AI assistant + HS finder.

### Step 3 — AI integration
- [ ] Ensure `openChatbot()` and `openHSFinder()` are loaded where needed.
- [ ] Make “AI Customs Assistant / HS Code Search Assistant / Duty Estimation” buttons work.

### Step 4 — Auth + RBAC consistency
- [ ] Fix `src/main.js` sign-in flow to match the demo auth in `index.html`.
- [ ] Fix `pages/admin-dashboard.html` role check (`controller` mismatch).

### Step 5 — Role dashboards navigation
- [ ] Ensure sidebar actions route consistently within each role page.
- [ ] Ensure logout clears the same keys across all pages.

### Step 6 — Admin dashboard expansion
- [ ] Extend `pages/admin-dashboard.html` to include missing sections (roles/permissions/audit logs).
- [ ] Add mock AI security layer outputs and show in admin.

### Step 7 — Services/Applications/Notifications prototype completeness
- [ ] Make application submission/status updates reflect across dashboards.
- [ ] Add notifications on key events and unread badge updates.

### Step 8 — QA
- [ ] Manual test matrix for all roles.
- [ ] Verify no JS runtime errors on load.

