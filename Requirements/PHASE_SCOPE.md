# PHASE_SCOPE

Implementation scope split for Nx monorepo delivery.

## Phase 0 (Foundation - Mandatory)
- Nx workspace setup with apps:
  - `apps/web`
  - `apps/mobile`
  - `apps/api`
- Shared libs setup:
  - `libs/shared` (types/contracts/RBAC)
- Tailwind CSS configured and shared across all web apps.
- Route-per-page skeleton created for each app (no single-page UI).
- Web app baseline folders created:
  - `components/common`, `components/customer`, `components/admin`, `components/scrap-champ`
  - `pages`, `routes`, `layout`, `types`, `utils`, `styles`, `theme`
- Baseline page files created in `pages` (login, customer pages, admin pages, scrap-champ pages, forbidden/not-found).

## Phase 1 (Auth + Access - Mandatory)
- OTP + Google login flows.
- Role resolution (`customer`, `admin`, `scrapChamp`) at login.
- Role-based landing routes:
  - Customer -> `/customer/*`
  - Admin -> `/admin/*`
  - Scrap Champ -> `/scrap-champ/*`
- Route-level authorization matrix implemented for all apps (public vs role-only pages).
- Protected route guards for each app.
- Backend `401/403` auth guard middleware for all protected APIs.
- Logout endpoint + UI action that revokes session and redirects to login.
- Dedicated login and post-login home pages per role are mandatory.

## Phase 2 (Core Pickup Flow - P0)
- Customer creates pickup request (`Requested`).
- Admin sees request in allocation queue and assigns Scrap Champ (`Assigned`).
- Assigned Scrap Champ receives order link and responds accept/deny.
- On accept: status `Accepted`, reveal exact address, notify customer.
- On deny: return to `Requested` for admin reassignment.

## Phase 3 (Automation + Monitoring - P0/P1)
- `T-2h` reminder to assigned Scrap Champ.
- `T+2h` mark order `Completed` and send customer feedback SMS.
- Admin dashboard: order list, filters, status updates, problem flagging.
- Engagement metrics (allocation vs acceptance, no-accept escalation at 30 min from allocation).

## Phase 4 (Experience + Metrics - P1)
- Customer order history.
- Scrap Champ dashboard metrics.
- Admin feedback visibility and operational reporting.

## Out of Scope (Current)
- Provider-specific SMS/OTP integration details (only abstraction contracts in scope).
- Multi-tenant architecture.
- Story 15 (Scrap Champ post-pickup feedback), per clarification.
