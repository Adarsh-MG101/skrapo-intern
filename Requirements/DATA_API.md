# DATA_API

MongoDB collections and API contracts derived from Stories 1-16 plus confirmed clarifications.

## Collections

### `users` (all application users)

Source stories: 1-16 (auth + role-based access usage)

Minimal fields:

- `_id`
- `mobileNumber`
- `email` (admin/seed)
- `googleId` (if Google auth used)
- `passwordHash` (admin/seed)
- `name`
- `pickupAddress` (customer use)
- `serviceArea` (scrap champ use)
- `serviceGeo` (GeoJSON Point for nearest matching)
- `serviceRadiusKm` (number, default 5)
- `createdAt`
- `updatedAt`

Definition:

- Keep role-specific profile fields as top-level fields in `users` for v1.

### `roles`

Source: RBAC clarification

Minimal fields:

- `_id`
- `code` (`customer`, `admin`, `scrapChamp`)
- `name`
- `createdAt`
- `updatedAt`

### `user_roles`

Source: RBAC clarification

Minimal fields:

- `_id`
- `userId`
- `roleId`
- `createdAt`
- `updatedAt`

Constraint:

- Unique (`userId`, `roleId`) mapping.

### `orders`

Source stories: 2, 4, 5, 7-14, 16

Status enum (strict):

- `New`
- `Requested`
- `Assigned`
- `Accepted`
- `Completed`
- `Problem`

Minimal fields:

- `_id`
- `customerId` (references `users._id`, role `customer`)
- `scrapTypes` (selected + additional text where applicable)
- `estimatedWeight` (object map: `{ [scrapType: string]: estimatedKg }`)
- `photoUrl`
- `scheduledAt` (pickup slot start reference)
- `scheduledSlotDuration` (1 hour)
- `generalArea`
- `exactAddress`
- `assignedScrapChampId` (nullable, references `users._id`, role `scrapChamp`)
- `status`
- `problemNotes` (nullable)
- `createdAt`
- `updatedAt`

Definitions:

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

### `feedback` (customer-only per clarification)

Source stories: 6, 10; clarification excludes Story 15

Minimal fields:

- `_id`
- `orderId`
- `customerId` (references `users._id`, role `customer`)
- `rating` (1-5)
- `weight`
- `price`
- `scrapChampBehavior`
- `comments`
- `createdAt`

Definitions:

- Required: `rating`.
- Optional: `weight`, `price`, `scrapChampBehavior`, `comments`.
- `scrapChampBehavior` enum: `Good`, `Neutral`, `Poor`.

### `smsEvents` (abstract logging only)

Source stories: 1, 5, 6, 8, 9, 10, 12, 14

Minimal fields:

- `_id`
- `orderId` (nullable for OTP events if not order-linked)
- `userId` (recipient `users._id`)
- `mobileNumber` (target phone number)
- `eventType` (OTP, AllocationAssigned, AllocationReassigned, CustomerConfirmation, ChampReminder, CustomerFeedback)
- `status` (`Queued`, `Sent`, `Delivered`, `Failed`, `Clicked`)
- `linkId` (for click tracking where applicable)
- `meta` (generic metadata object for OTP and provider traces)
- `createdAt`

Definition:

- OTP metadata uses `meta.maskedTarget`, `meta.attemptCount`, and `meta.expiresAt`.

### `authSessions` (refresh token/session store)

Source: auth/session requirements

Minimal fields:

- `_id`
- `userId` (references `users._id`)
- `refreshTokenHash`
- `userAgent` (optional)
- `ipAddress` (optional)
- `expiresAt`
- `revokedAt` (nullable)
- `createdAt`
- `updatedAt`

Definitions:

- Refresh tokens are never stored in plain text.
- On refresh, rotate token and update hash.
- On logout, mark active session revoked (`revokedAt`).

## Logical Foreign Keys (MongoDB references)

- `user_roles.userId -> users._id`
- `user_roles.roleId -> roles._id`
- `orders.customerId -> users._id`
- `orders.assignedScrapChampId -> users._id`
- `feedback.orderId -> orders._id`
- `feedback.customerId -> users._id`
- `smsEvents.orderId -> orders._id` (nullable for OTP)
- `smsEvents.userId -> users._id`
- `authSessions.userId -> users._id`

## API Surface (Minimal)

## Authentication and Authorization Policy

- All non-auth APIs require authenticated user context.
- Authorization is role-based via `user_roles`.
- Cross-role access is denied by default (return `403 Forbidden`).
- Unauthenticated access to non-auth APIs returns `401 Unauthorized`.
- Role guard source of truth:
  - `customer` for customer APIs
  - `admin` for admin APIs
  - `scrapChamp` for scrap champ APIs

### Auth

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `POST /auth/google/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Definition:

- Access token: JWT with 15-minute TTL.
- Refresh token: opaque token with 30-day TTL, stored hashed and rotated on refresh.
- Login/verify responses must include resolved role and `defaultRoute` so UI can redirect by role.
- Logout revokes refresh token/session record and client must clear access token.

### Customer

- `POST /orders` (Story 2)
- `GET /orders/history` (Story 4)
- `POST /orders/{orderId}/feedback` (Story 6)

Access control:

- Allowed role: `customer` only.
- `admin` and `scrapChamp` cannot call customer APIs.

### Admin

- `GET /admin/orders` (Story 7)
- `PATCH /admin/orders/{orderId}/status` (Stories 7, 11)
- `POST /admin/orders/{orderId}/assign` (Story 8 allocation action)
- `GET /admin/orders/{orderId}/engagement` (Story 9)
- `GET /admin/orders/{orderId}/feedback` (Story 10)
- `POST /admin/orders/{orderId}/reassign` (Story 9 follow-up action)

Access control:

- Allowed role: `admin` only.
- `customer` and `scrapChamp` cannot call admin APIs.

### Scrap Champ

- `GET /scrap-champ/orders/{orderId}` (Stories 12, 13)
- `POST /scrap-champ/orders/{orderId}/decision` (Story 13)
- `GET /scrap-champ/dashboard` (Story 16)

Access control:

- Allowed role: `scrapChamp` only.
- `customer` and `admin` cannot call scrap champ APIs.

## Endpoint Role Matrix

| Endpoint                                      | Auth Required                | Allowed Role(s)                   |
| --------------------------------------------- | ---------------------------- | --------------------------------- |
| `POST /auth/otp/request`                      | No                           | Public                            |
| `POST /auth/otp/verify`                       | No                           | Public                            |
| `POST /auth/google/login`                     | No                           | Public                            |
| `POST /auth/refresh`                          | No (uses refresh credential) | Public                            |
| `POST /auth/logout`                           | Yes                          | `customer`, `admin`, `scrapChamp` |
| `GET /auth/me`                                | Yes                          | `customer`, `admin`, `scrapChamp` |
| `POST /orders`                                | Yes                          | `customer`                        |
| `GET /orders/history`                         | Yes                          | `customer`                        |
| `POST /orders/{orderId}/feedback`             | Yes                          | `customer`                        |
| `GET /admin/orders`                           | Yes                          | `admin`                           |
| `PATCH /admin/orders/{orderId}/status`        | Yes                          | `admin`                           |
| `POST /admin/orders/{orderId}/assign`         | Yes                          | `admin`                           |
| `GET /admin/orders/{orderId}/engagement`      | Yes                          | `admin`                           |
| `GET /admin/orders/{orderId}/feedback`        | Yes                          | `admin`                           |
| `POST /admin/orders/{orderId}/reassign`       | Yes                          | `admin`                           |
| `GET /scrap-champ/orders/{orderId}`           | Yes                          | `scrapChamp`                      |
| `POST /scrap-champ/orders/{orderId}/decision` | Yes                          | `scrapChamp`                      |
| `GET /scrap-champ/dashboard`                  | Yes                          | `scrapChamp`                      |

## Timed Trigger Contracts

- `T-2h`: send Scrap Champ reminder for accepted order (Story 14).
- `T+2h`: set order `Completed` and send customer feedback SMS (Stories 6, 10).
- `T` reference: pickup slot start time.

Definition:

- Story 9 no-accept escalation window: 30 minutes from admin allocation timestamp.
