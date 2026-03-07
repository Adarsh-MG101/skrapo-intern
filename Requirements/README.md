# Skrapo

Skrapo is a web application for scheduling scrap pickups between customers and local Scrap Champs, with admin oversight and SMS-linked workflows.

## Roles
- Customer (Stories 1-6)
- Admin (Stories 7-11)
- Scrap Champ (Stories 12-16)

## Feature Summary by Interface

### Customer Web (Stories 1-6)
- Registration/login via OTP or Google (Story 1)
- Pickup scheduling with scrap details, photo, and timeslot (Story 2)
- Returning login with direct scheduling flow (Story 3)
- Previous order history view (Story 4)
- Pickup confirmation SMS after assignment (Story 5)
- Post-pickup feedback SMS and customer feedback submission (Story 6)

### Admin Web (Stories 7-11)
- Order status dashboard and manual status management (Story 7)
- Allocate new customer orders to Scrap Champs (Story 8)
- Track allocation vs acceptance metrics; alert when unaccepted in window (Story 9)
- Auto customer feedback SMS 2 hours after scheduled pickup; set completed (Story 10)
- Flag and manage problem orders with notes (Story 11)

### Scrap Champ Web (Stories 12-16)
- Receive SMS link and view pickup request details (Story 12)
- Accept/deny flow with already-accepted handling (Story 13)
- 2-hour pre-pickup reminder SMS (Story 14)
- Story 15 excluded per clarification
- Dashboard for received/accepted/declined and average rating (Story 16)

## Confirmed Tech Stack
- Frontend: Next.js
- Styling: Tailwind CSS
- Backend: Node.js
- Monorepo: Nx
- Database: MongoDB

## Monorepo App Layout
- `apps/web` for all role-based web flows
- `apps/mobile` for mobile app scope
- `apps/api` for backend APIs

## Frontend Architecture Rules
- UI must be component-based across all apps.
- Shared/common components (button, search bar, input, table, modal, badges, etc.) must be created once and reused.
- Preferred location for reusable components is `apps/web/src/app/components/common`.
- Use route-per-page architecture; avoid building all features in one large page.
- Role-based route guards are mandatory:
  - Customer login -> customer home/scheduling
  - Admin login -> admin dashboard
  - Scrap Champ login -> scrap champ dashboard
- Logout is mandatory for all roles and must revoke active session.

## Tenancy
- Single-tenant deployment model.

## Identity and RBAC Model
- Unified identity: `users` (all user credentials/accounts).
- Role definitions: `roles` (`customer`, `admin`, `scrapChamp`).
- Role assignment: `user_roles` (`userId` to `roleId` mapping).

## Messaging and OTP
- SMS and OTP provider integrations are deferred.
- Implement an SMS/OTP abstraction layer only (provider-agnostic interfaces, no provider-specific logic).
