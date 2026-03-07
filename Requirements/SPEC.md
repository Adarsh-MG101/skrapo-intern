# SPEC

This document converts Stories 1-16 into functional requirements with story mapping, priority, and clarified constraints.

## Scope and Clarifications
- Order initial status on submission: `Requested`.
- Primary status path: `Requested -> Assigned -> Accepted -> Completed`.
- Admin allocation is mandatory before Scrap Champ action.
- Story 9 no-accept alert window: 30 minutes from admin allocation timestamp.
- Area matching: nearest Scrap Champ logic based on Google Maps.
- Feedback scope: customer feedback only.
- Rating scale: 1-5.
- Auth model for all roles: OTP + Google with RBAC.
- Logout is mandatory for all roles and must revoke active session.
- Post-login routing is role-based and must land on role-specific home screen.
- Time reference for reminders/follow-up: pickup slot start time.
- SMS/OTP provider implementation deferred; abstraction only.
- Frontend implementation standard is Tailwind CSS with shared reusable components.

## P0 Requirements

### Story 1 (P0) - First-Time Registration and Login
- Customer can log in with mobile number + OTP.
- Customer can alternatively sign in with Google.
- On first login, customer must complete profile with name and pickup address.
- Saved address is stored for future pickup flows.

### Story 2 (P0) - Schedule a Pickup
- Customer can create a pickup order with:
  - Scrap types from list: Paper, Plastic Bottles, Milk Covers, Metal, Others.
  - Additional scrap type input.
  - Estimated weight per scrap item.
  - Scrap photo upload.
  - Pickup date/time slot with minimum 24 hours lead time.
- On submit, show confirmation message and create order in `Requested` state.

### Story 3 (P0) - Returning Customer Login
- Returning customer bypasses first-time registration.
- Post-login landing is pickup scheduling screen.
- Saved address is pre-populated.

### Story 3A (P0) - Logout and Session End
- Customer, Admin, and Scrap Champ can logout from any authenticated screen.
- Logout clears client auth state and invalidates server-side refresh token/session.
- After logout, user is redirected to role login page.
- Accessing protected routes after logout must redirect to login.

### Story 5 (P0) - Pickup Confirmation SMS to Customer
- Trigger when Scrap Champ accepts order.
- SMS contains Scrap Champ name, pickup date/time, and order link.
- Link opens order details with assigned Scrap Champ details.

### Story 6 (P0) - Customer Post-Pickup Feedback SMS
- Trigger SMS exactly 2 hours after scheduled pickup start time.
- Link opens customer feedback form capturing:
  - Star rating (1-5)
  - Weight and price
  - Scrap Champ behavior
  - Free-text comments

### Story 7 (P0) - Admin View and Manage Order Status
- Admin dashboard lists all orders and status.
- Status enum must support: `New`, `Requested`, `Assigned`, `Accepted`, `Completed`, `Problem`.
- Admin can manually update status.
- Admin can filter by status and date.

### Story 8 (P0) - Admin Allocation to Scrap Champ
- On new order submission, order appears in admin allocation queue.
- Admin allocates order to one Scrap Champ.
- On allocation:
  - Status changes to `Assigned`.
  - Assigned Scrap Champ receives notification/SMS with order link.
- Admin can reassign if needed.

### Story 8A (P1) - Optional Assisted Matching
- System may suggest nearest/relevant Scrap Champs to admin using geo matching.
- Suggestions are advisory; final allocation action is always admin-controlled.

### Story 10 (P0) - Auto-Trigger Customer Feedback and Completion
- At +2 hours from scheduled pickup start:
  - Trigger customer feedback SMS.
  - Set order status to `Completed`.
- Admin can view customer feedback responses by order.

### Story 12 (P0) - Scrap Champ Receive and View Request
- Scrap Champ receives SMS with order link.
- Before acceptance, order details include:
  - Scrap types
  - Estimated weight
  - Photo
  - General area
  - Date and time
- Exact address is hidden until acceptance.
- Scrap Champ can accept or deny.

### Story 13 (P0) - Scrap Champ Accept or Deny
- On acceptance:
  - Reveal exact pickup address.
  - Update order status to `Accepted`.
- On denial:
  - Status returns to `Requested`.
  - Admin is notified for reassignment.
- If order was reassigned/cancelled before response, show unavailable message.

### Story 14 (P0) - 2-Hour Pre-Pickup Reminder to Scrap Champ
- Trigger reminder SMS exactly 2 hours before scheduled pickup start.
- SMS includes area, time, and order link.

## P1 Requirements

### Story 4 (P1) - Customer View Previous Orders
- Customer can view order history list.
- Each entry shows date, scrap types, status, assigned Scrap Champ.
- Sort order is most recent first.

### Story 9 (P1) - Admin Track Scrap Champ Responses
- Admin can view allocation vs acceptance metrics per order.
- Order status auto-updates when accepted.
- Admin receives alert if no acceptance in defined time window.
- Defined time window: 30 minutes from admin allocation timestamp.

### Story 11 (P1) - Admin Flag Problem Orders
- Admin can set order status to `Problem`.
- Problem orders are surfaced prominently in dashboard.
- Admin can add follow-up notes.

### Story 15 (P1) - Scrap Champ Post-Pickup Feedback
- Excluded per clarification.

### Story 16 (P1) - Scrap Champ Dashboard
- Dashboard shows:
  - Total orders received
  - Total accepted
  - Total declined
  - Average customer rating
- Orders listed most recent first with status.

## Cross-Cutting Frontend Requirements
- Styling:
  - Tailwind CSS is mandatory in all frontend apps.
  - Use shared design tokens/config for consistent UI across apps.
- Component architecture:
  - Shared UI components must live in `apps/web/src/app/components/common`.
  - Apps should consume reusable components instead of duplicating button/form/table/search markup.
  - Required reusable components include: `Button`, `Input`, `SearchBar`, `Select`, `DateTimePicker`, `Modal`, `Table`, `StatusBadge`, `Pagination`, `Loader`, `Toast`.
- Routing and guards:
  - Role-based route guards are mandatory.
  - Role-to-home mapping:
    - Customer -> schedule pickup screen
    - Admin -> admin dashboard
    - Scrap Champ -> scrap champ dashboard/request list
  - Unauthorized route access must return/route to `403` view or safe role home.

## Frontend Route Access Matrix (Mandatory)
- Shared public routes:
  - `/login`, `/auth/callback`
- Customer-only routes:
  - `/customer`, `/customer/schedule`, `/customer/orders`, `/customer/orders/:orderId`, `/customer/profile`
- Admin-only routes:
  - `/admin`, `/admin/orders`, `/admin/orders/:orderId`, `/admin/allocation`, `/admin/reports`
- Scrap-Champ-only routes:
  - `/scrap-champ`, `/scrap-champ/jobs`, `/scrap-champ/jobs/:orderId`, `/scrap-champ/dashboard`
- Tokenized public route:
  - `/request/:token` (read-only pre-auth token flow)
- Guard behavior:
  - No session -> redirect to role login.
  - Wrong role -> show `403` or redirect to role home.
  - Expired session -> clear local session, then redirect to login.

## Frontend Page Architecture Rules (Mandatory)
- Do not implement the app as a single large page.
- Each route must map to a dedicated page file/screen module.
- Each page must have a focused responsibility (for example: list, details, create/edit form, analytics).
- Shared layout shells are required per role app (header/sidebar/content), while page content stays route-specific.
- Feature-specific route minimums:
  - Customer: login, schedule, orders list, order details, profile, feedback form.
  - Admin: login, dashboard, allocation queue, order details, reports.
  - Scrap Champ: login, dashboard, assigned jobs list, job details/request view.
- Large pages must be split into section components (filters, table/list, form panel, summary cards).

## Frontend Folder Baseline (Mandatory)
- Main web app is `apps/web`.
- Baseline source folders:
  - `apps/web/src/app/components/common`
  - `apps/web/src/app/components/customer`
  - `apps/web/src/app/components/admin`
  - `apps/web/src/app/components/scrap-champ`
  - `apps/web/src/app/pages`
  - `apps/web/src/app/routes`
  - `apps/web/src/app/layout`
- `common` must contain reusable controls (`Button`, `SearchBar`, `Filter`, `Pagination`, and related shared UI).

## Page File Catalog (Mandatory Baseline)
- Define separate page files under `apps/web/src/app/pages` for each major route/functionality.
- Minimum page files:
  - `Login.tsx`
  - `Forbidden.tsx`
  - `NotFound.tsx`
  - `CustomerHome.tsx`
  - `CustomerSchedule.tsx`
  - `CustomerOrders.tsx`
  - `CustomerOrderDetails.tsx`
  - `CustomerProfile.tsx`
  - `CustomerFeedback.tsx`
  - `AdminHome.tsx`
  - `AdminOrders.tsx`
  - `AdminOrderDetails.tsx`
  - `AdminAllocation.tsx`
  - `AdminReports.tsx`
  - `ScrapChampHome.tsx`
  - `ScrapChampJobs.tsx`
  - `ScrapChampJobDetails.tsx`
  - `TokenRequestView.tsx`
- New feature routes must add new dedicated page files; do not merge unrelated features into existing pages.

## Backend API Authorization Rules (Mandatory)
- Every protected API validates authentication and role before handler logic.
- Response policy:
  - Missing/invalid token -> `401 Unauthorized`
  - Valid token but wrong role -> `403 Forbidden`
- Ownership policy:
  - Customer can read/write only their own orders and feedback.
  - Scrap Champ can access only orders currently assigned to them (or tokenized request link flow).
  - Admin can access all orders and allocation actions.

## Order State Transitions
- Confirmed primary path: `Requested -> Assigned -> Accepted -> Completed`.
- `New` is reserved for admin-created/manual draft orders only (not customer-submitted orders).
- Customer-submitted orders are created directly in `Requested`.
- Admin can set `Problem` from any state.
- Reopen rule: `Problem -> Requested` only (admin action).

## Timing Triggers
- `-2 hours` (Story 14): Scrap Champ reminder.
- `+2 hours` (Stories 6, 10): Customer feedback SMS and completion status update.
- Reference point: scheduled pickup slot start time.
