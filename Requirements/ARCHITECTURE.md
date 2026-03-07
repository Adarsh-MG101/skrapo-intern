# ARCHITECTURE

## Monorepo Structure (Nx)
```text
apps/
  web                 # Next.js app for all role-based web flows
  mobile              # mobile app (future/parallel)
  api                 # Node.js backend API
libs/
  shared              # shared types, validation, contracts, RBAC, and service interfaces
```

## High-Level Components
- `apps/web`: role-based UI modules for customer, admin, and scrap champ flows.
- `apps/mobile`: reserved for mobile delivery.
- `apps/api`: REST APIs, business rules, state transitions, trigger scheduling, persistence.
- `libs/shared`: common models, enums, RBAC role definitions, SMS/OTP abstraction contracts.

## Frontend Standards (Mandatory)
- Styling framework: Tailwind CSS across all frontend apps and shared UI libs.
- UI implementation: component-based only; do not duplicate raw UI markup across apps.
- Shared reusable components must be created under `apps/web/src/app/components/common` (for example `Button`, `SearchBar`, `Filter`, `Pagination`) and reused across pages.
- Feature components should be in `apps/web/src/app/components/<feature>`.
- Minimum reusable components for v1:
  - `Button`
  - `Input`
  - `SearchBar`
  - `Select`
  - `DateTimePicker`
  - `Modal`
  - `Table`
  - `StatusBadge`
  - `Pagination`
  - `Loader`
  - `EmptyState`
  - `Toast`
- Use a shared Tailwind token setup (spacing, color, typography, radius, shadows).
- Page structure standard:
  - Route-per-page architecture is mandatory.
  - No monolithic "single-page with all features" implementation.
  - Use role-specific layout components plus route-specific page modules.
  - Reusable UI components stay in `apps/web/src/app/components/common`; page-level composition stays in each route page.

## Web App Folder Baseline (Mandatory)
```text
apps/web/src/app/
  api/
  assets/
  components/
    common/
    customer/
    admin/
    scrap-champ/
  constants/
  context/
  data/
  layout/
  pages/
  routes/
  styles/
  theme/
  types/
  utils/
```

## Data Flow (High Level)
1. Customer logs in (OTP or Google) and creates order (`Requested`).
2. Admin reviews new orders and allocates to a Scrap Champ (`Assigned`).
3. API sends allocation notification/SMS to assigned Scrap Champ.
4. Scrap Champ opens linked page and accepts/denies.
5. On accept, API updates status to `Accepted`.
6. On deny, API reverts status to `Requested` for admin reassignment.
7. API triggers customer confirmation SMS on acceptance.
8. At `-2h`, API triggers Scrap Champ reminder SMS.
9. At `+2h`, API sets order to `Completed` and triggers customer feedback SMS.
10. Customer feedback is submitted and visible to admin.
11. User can explicitly logout from any app; session is revoked and user is redirected to role login.

## Order Lifecycle Flow
- Confirmed path: `Requested -> Assigned -> Accepted -> Completed`.
- `Problem` is admin-set manual state (Story 11).
- `New` is reserved for admin-created manual draft orders only.
- Customer-submitted orders are created directly as `Requested`.
- Allowed transitions:
  - `New -> Requested`
  - `Requested -> Assigned`
  - `Assigned -> Accepted`
  - `Assigned -> Requested` (deny/reassign)
  - `Accepted -> Completed`
  - `New|Requested|Assigned|Accepted|Completed -> Problem` (admin action)
  - `Problem -> Requested` (admin reopen)

## SMS Service Abstraction (No Provider Logic)
- Requirement: SMS/OTP integrations are deferred.
- Implement provider-agnostic interfaces in shared libs and backend services.

```ts
export interface SmsService {
  send(message: SmsMessage): Promise<SmsSendResult>;
}

export interface OtpService {
  requestOtp(input: OtpRequest): Promise<OtpRequestResult>;
  verifyOtp(input: OtpVerify): Promise<OtpVerifyResult>;
}
```

- Store only abstract event logs (`smsEvents`) for observability and Story 9 metrics.
- No provider SDK calls, webhook assumptions, or provider-specific payload fields.

## Auth and RBAC Flow
- Auth methods: OTP + Google only (applies to all roles per clarification).
- RBAC model controls route/API access for roles:
  - Customer
  - Admin
  - Scrap Champ
- Post-login route mapping (mandatory):
  - `customer` -> `/customer/*` route module
  - `admin` -> `/admin/*` route module
  - `scrapChamp` -> `/scrap-champ/*` route module
- Route guards (frontend and backend):
  - Unauthenticated users are redirected to login.
  - Authenticated users with wrong role are blocked from unauthorized routes/APIs.
  - Guard implementation requirement:
    - Frontend: centralized guard layer (Next.js middleware + layout guard hooks).
    - Backend: centralized auth middleware + role guard decorator/middleware.
  - Error contract:
    - API returns `401` for missing/invalid auth.
    - API returns `403` for valid auth with unauthorized role.
- Data model for RBAC:
  - `users` (all identities)
  - `roles` (role catalog)
  - `user_roles` (user-role mapping)
- Token/session mechanism:
  - Access token: JWT, 15-minute TTL.
  - Refresh token: opaque token, 30-day TTL, stored hashed; rotate on refresh.
  - Logout: invalidate current refresh token/session and clear client session state.
- OTP lifecycle settings:
  - OTP length: 6 digits.
  - Expiry: 5 minutes.
  - Resend cooldown: 30 seconds.
  - Rate limit: max 5 OTP requests/hour/mobile number.
  - Verify limit: max 10 attempts per OTP.

## Matching Logic
- Nearest Scrap Champ selection uses Google Maps-compatible geospatial matching.
- Store order pickup location as `pickupGeo` and Scrap Champ service location as `serviceGeo`.
- Query with `$nearSphere` and filter by `serviceRadiusKm`.
- Provide top matching champs as admin allocation suggestions.
- If allocated champ does not accept within 30 minutes of allocation, alert admin (Story 9).

## Single-Tenant
- Entire architecture is single-tenant.
- No tenant partitioning layer is introduced in apps, API, or data models.
