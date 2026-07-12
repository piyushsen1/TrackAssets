# AssetFlow — End-to-End Workflow Testing

Tracks, module by module, whether the backend API and the frontend screen are both ready to test together. Update the status line for a module the moment its backend or frontend half lands — don't wait until both sides are done to touch this file.

Legend: ✅ done · ⏳ in progress · ❌ not started

---

## 1. Login / Signup

**Backend:** ✅ done · **Frontend:** ✅ done

Seeded test accounts (password `Password123` for all except admin):

| Role | Email | Password |
|---|---|---|
| Admin | `piyushkumarsen45@gmail.com` | `Admin@123` |
| Asset Manager | `manager@assetflow.test` | `Password123` |
| Department Head | `depthead@assetflow.test` | `Password123` |
| Employee | `priya@assetflow.test` | `Password123` |
| Employee | `raj@assetflow.test` | `Password123` |

**Steps:**
1. Go to `/signup`, create a new account with any email/password/name.
2. Confirm the account is created with role `employee` (no role picker shown).
3. Go to `/login`, log in with the new account.
4. Confirm redirect to the dashboard shell and that the auth token is stored (cookie).
5. Log out, confirm redirect back to `/login` and that dashboard routes are no longer reachable.
6. Log in as each seeded role above to have a session ready for later modules.

**Expected result:** signup never grants anything beyond `employee`; login works for all 5 seeded accounts; logged-out users are redirected away from dashboard routes.

---

## 2. Organization Setup (Admin only)

**Backend:** ✅ done · **Frontend:** ❌ pending

**Steps (once frontend lands):**
1. Log in as `piyushkumarsen45@gmail.com` (admin).
2. **Departments tab:** confirm seeded list shows Engineering (parent) → Quality Assurance (child), Sales, Human Resources, each with status `active`. Create a new department, edit its name/status, confirm it appears immediately in the Asset/Allocation screens' department dropdowns once those exist.
3. Attempt to delete a department that still has employees (Sales) — confirm it's blocked with a clear error, not a silent failure.
4. **Categories tab:** confirm seeded Electronics/Furniture/Vehicles show, with Electronics displaying its custom "warranty period" field. Create a new category, edit its name/custom fields, then attempt to delete a category still used by an asset (Electronics) — confirm 409; delete an unused one — confirm it disappears.
5. **Employee tab:** confirm the 4 seeded employees show with correct department/role/status. Create a new employee for an email that has already signed up (Screen 1) — confirm it auto-links their account (`hasAccount: true`) rather than creating a duplicate. Create one for an email that hasn't signed up — confirm it's created as directory-only (`hasAccount: false`). Edit an employee's title/department/status (not role) via the generic update — confirm it saves.
6. Promote an employee to Department Head or Asset Manager from this screen. Confirm attempting to promote a directory-only (no-account) employee is blocked with a clear message instead of silently failing.
7. For a directory-only employee (e.g. `newhire@assetflow.test`), sign up via `/signup` using that exact email — confirm the Employee tab now shows them as having an account (badge clears) and a role can be assigned. This is the only way a "NO ACCOUNT" employee ever becomes promotable.
8. Log in as a non-admin (e.g. `raj@assetflow.test`) and confirm none of the Organization Setup actions are reachable/authorized (403 on direct API calls).

**Expected result:** all master data (departments/categories/employees) is admin-only to write, readable by everyone, and role promotion is the only place a role changes.

---

## 3. Asset Registration & Directory

**Backend:** ✅ done · **Frontend:** ❌ pending

Seeded assets: `AF-0001` (Dell laptop, Engineering), `AF-0002` (HP laptop, Sales), `AF-0003` (office desk, Engineering), `AF-0004` (company vehicle, unassigned department, `isBookable: true`).

**Steps (once frontend lands):**
1. Log in as Asset Manager (`manager@assetflow.test`).
2. Register a new asset with name/category/department/location/serial — confirm it gets an auto-generated tag (`AF-0005`, sequential) and a real scannable QR code image, and starts as `available`.
3. On the directory list, search by tag, by serial, and by partial name — confirm all three match.
4. Filter by category, status, and department independently — confirm each narrows results correctly. Try `?status=bogus_status` — confirm `400 invalid_status` (was a raw 500 crash before a real bug fix; the value now must be one of the actual `AssetStatus` enum values before it reaches Prisma).
5. Open an asset's detail view — confirm it shows category/department names (not raw IDs), current holder (null for now until Phase 4), and empty allocation/maintenance history (expected until Phases 4 & 6 exist).
6. Edit an asset's location/condition/photo via the directory — confirm it saves.
7. Attempt to change an asset's status directly through the edit form's underlying API call — confirm the backend rejects it (`400 field_not_directly_editable`); status must only ever change via Allocation/Maintenance/Audit actions in later modules.

**Expected result:** registration auto-generates tag + QR code; search/filter all work independently and combined; status is never directly editable from this screen.

---

## 4. Asset Allocation & Transfer

**Backend:** ✅ done · **Frontend:** ❌ pending

**Steps (once frontend lands):**
1. Log in as Asset Manager or Admin. Allocate `AF-0002` (currently `available`) to Priya, optionally with an Expected Return Date — confirm the asset's status flips to `allocated`.
2. Attempt to allocate `AF-0002` to Raj while Priya still holds it — confirm it's blocked with `currentHolder: Priya`, and the UI offers a Transfer Request instead of a silent failure (this is the double-allocation block, the spec's headline demo).
3. Submit a Transfer Request (Priya → Raj) with a reason. Log in as a Department Head **outside** the asset's department and try to approve it — confirm it's rejected (403, department-scoped). Log in as Admin or the correct Department Head and approve it — confirm Raj is now the holder and Priya's allocation record shows a `returnedAt` timestamp (history is append-only, never overwritten).
4. Submit another transfer request and reject it instead — confirm the rejection reason is saved and the current holder is unchanged.
5. Return the asset via the return action, entering condition check-in notes — confirm the asset's status reverts to `available` and its `condition` field updates.
6. Put an asset `under_maintenance` (via the Maintenance screen) and confirm the Allocation screen blocks allocating it (distinct error from the double-allocation block — this one means "not available at all", not "already held").
7. Check Notifications after each of the above — confirm allocation, transfer request, approval, rejection, and return each produced an entry.
8. Check `GET /transfer-requests?status=pending_approval` — confirm it lists pending requests without needing to already know a request ID (added after a real integration gap: there was previously no way to discover another user's pending request from a fresh page load). Confirm scoping: a Department Head only sees requests where the current holder is in their department; a plain Employee only sees requests they're a party to (as from or to); Admin/Asset Manager see everything.

**Expected result:** one active holder per asset at all times; direct re-allocation always blocked in favor of a transfer request; approvals respect department scoping for Department Heads; return flow captures condition notes and frees the asset; pending transfer requests are discoverable without tracking request IDs client-side.

---

## 5. Resource Booking

**Backend:** ✅ done · **Frontend:** ❌ pending

Seeded resources: `Conference Room B2`, `Meeting Room A1`, `Toyota Innova (Company Vehicle)`.

**Steps (once frontend lands):**
1. Log in as Admin or Asset Manager, create a new resource — confirm a plain Employee gets 403 trying the same. Edit its name/type; delete a resource with no bookings at all — confirm it disappears. Book it, cancel that booking, then try to delete it — confirm a clean `409 resource_has_bookings` rather than a raw 500 (the DB has no cascade from `Booking.resourceId`, so *any* booking row — cancelled or past, not just active ones — blocks the delete at the FK level; a real bug found in testing, now counting all bookings before returning the guard).
2. Book Room B2 for 9:00–10:00.
3. Attempt to book Room B2 for 9:30–10:30 — confirm it's rejected as a conflict (this is the spec's literal example).
4. Book Room B2 for 10:00–11:00 (starts right when the first ends) — confirm this succeeds (also the spec's literal example, non-overlap).
5. Check `displayStatus` on a booking: a slot in the future shows `upcoming`, a slot spanning "now" shows `ongoing`, a past slot shows `completed`, a cancelled one shows `cancelled` regardless of time.
6. As a different employee (not the requester, not admin), try to cancel or reschedule someone else's booking — confirm 403. As the requester (or admin), cancel/reschedule it — confirm it works, and rescheduling re-runs the overlap check.
7. Check Notifications after booking/reschedule/cancel — confirm each produced an entry.
8. Check `GET /bookings?resourceId=&requesterId=&status=&from=&to=` — confirm it lists bookings across days/resources without needing to query day-by-day via availability.

**Expected result:** overlap detection blocks exactly the overlapping case and allows the back-to-back case; only the requester or an admin can cancel/reschedule; resource creation is admin/asset-manager only.

---

## 6. Maintenance Management

**Backend:** ✅ done · **Frontend:** ❌ pending

**Steps (once frontend lands):**
1. Raise a ticket on an available asset with an issue description, priority (`low`/`medium`/`high`), and optional photo — confirm it lands in `pending` and the asset's status is unchanged (no side effect yet, per spec).
2. As Asset Manager/Admin, approve it — confirm the ticket moves to `approved` and the asset flips to `under_maintenance`.
3. Try skipping straight to "assign technician" or "resolve" from the wrong ticket state (e.g. resolve a `pending` ticket) — confirm each transition is rejected unless the ticket is in the exact prior state the Kanban expects (`pending → approved/rejected → technician_assigned → in_progress → resolved`).
4. Assign a technician (requires `approved`) → start work (requires `technician_assigned`) → resolve with notes (requires `in_progress`) — confirm the asset reverts to `available` only on resolve.
5. Raise a second ticket and reject it instead of approving — confirm the rejection reason is saved and the asset status is untouched (it was never `pending`'s side effect in the first place).
6. Check Notifications after each transition — confirm every step (approve/reject/assign/start/resolve) produced an entry.
7. **Allocated-asset maintenance** (real bug found in testing, now fixed): allocate an asset to an employee (holder never returns it) → raise + approve a maintenance ticket on it (asset → `under_maintenance`, the open Allocation is untouched) → run it through assign/start/resolve. Confirm the asset goes back to `allocated` (not `available`) since the allocation was still open the whole time — check `GET /assets/:tag` shows `currentHolder` still populated *and* a status consistent with it. Before this fix, resolve unconditionally set `available`, silently contradicting the still-open Allocation row and corrupting Dashboard/Reports counts.

**Expected result:** the five-column Kanban is a real state machine — each transition requires the ticket to be in the exact expected prior state, not just "any non-terminal state"; asset status changes only on approve (→ under maintenance) and resolve (→ whichever state — `allocated` or `available` — was actually true before maintenance started).

---

## 7. Asset Audit

**Backend:** ✅ done · **Frontend:** ❌ pending

**Steps (once frontend lands):**
1. As Admin, start an audit cycle for Engineering (`seed-dept-engineering`) with a date range and one or more auditors (use real employee IDs, e.g. `depthead@assetflow.test`'s employee id) — confirm the response includes a line item for every asset currently in that department with its expected location.
2. As an employee who is **not** one of the assigned auditors and not admin, try to mark a line item — confirm 403.
3. As an assigned auditor (or admin), mark one asset `verified`, one `missing`, one `damaged` (with notes) — confirm invalid verification values (e.g. `"broken"`) are rejected with 400.
4. Check discrepancies — confirm only the `missing` and `damaged` items show up, not the `verified` one and not any still-unverified ones.
5. Close the audit cycle — confirm: the `missing` asset's status flips to `lost`; the `damaged` asset gets a new `pending` maintenance ticket (high priority) but its status does **not** change yet (it only becomes `under_maintenance` once that ticket is separately approved through the Maintenance screen); a notification was written for each discrepancy.
6. Try to mark another line item or close the cycle again after it's closed — confirm both are rejected (audit is frozen).
7. Refresh the page (or just call `GET /audits/:auditId` directly) — confirm it returns every line item (verified/missing/damaged/still-unverified), not just the discrepancy subset. Check `GET /audits?status=open` — confirm it lists cycles with `totalLineItems`/`verifiedCount`/`discrepancyCount` summaries, without needing to have kept the creation response around.

**Expected result:** only assigned auditors (or admin) can record verification results; discrepancies are exactly missing+damaged; closing locks the cycle, sets missing assets to `lost`, and creates (but does not auto-approve) maintenance tickets for damaged ones; a cycle's full state is reloadable at any time, not just readable once at creation.

---

## 8. Reports & Analytics

**Backend:** ✅ done · **Frontend:** ❌ pending

Admin-only for every endpoint under `/api/v1/reports` — a non-admin token should get 403 on all of them.

**Steps (once frontend lands):**
1. As a non-admin, hit any `/reports/*` endpoint — confirm 403.
2. As admin, check utilization-by-department — confirm the percentage matches (currently-allocated assets / total assets) per department, including an "Unassigned" bucket for assets with no department. Try `?range=30` — confirm it still returns sensible numbers (an asset counts as "allocated" if any allocation overlapped the last 30 days, not just right now).
3. Check most-used-assets — confirm it ranks by total historical allocation count, not just current allocations. Try `?limit=3` — confirm exactly 3 results instead of the hardcoded 10.
4. Put one asset `under_maintenance` and confirm it does **not** show up in due-for-maintenance (it's already being serviced, not "due"). Check that an old (`acquisitionDate` 3+ years back) asset shows up with `ageYears` and a "nearing retirement" note.
5. Check idle-assets with the default window, then try `?idleDays=30` — confirm a shorter window surfaces more assets as idle.
6. Check maintenance-frequency with `?range=30` — confirm it only counts tickets created in the last 30 days, not all-time.
7. Export CSV — confirm it downloads/returns a valid CSV with tag/name/status/department/category columns; try `format=pdf` — confirm `501 unsupported_format` rather than a crash.

**Expected result:** every report is admin-only; the numbers are internally consistent with what Allocation/Maintenance/Asset screens show.

---

## 9. Activity Logs & Notifications

**Backend:** ✅ done · **Frontend:** ❌ pending

**Steps (once frontend lands):**
1. After doing a few actions in other modules (allocate something, approve a maintenance ticket, book a resource), check `GET /notifications` — confirm each shows up with a `timestamp` field (not `createdAt`) and the correct `type`.
2. Filter by `type=approval`, `type=booking`, `type=allocation`, `type=transfer`, `type=audit` — confirm each returns only matching events; `type=all` (or omitted) returns everything.
3. Mark one as read — confirm `readAt` gets set and it's reflected on refetch.
4. Try `type=bogus` — confirm `400 invalid_type` instead of a silent empty list or a crash.

**Expected result:** the type filter actually works (it silently did nothing before this pass), and the timestamp field name matches what the frontend type already expects.

---

## 10. Dashboard

**Backend:** ✅ done · **Frontend:** ❌ pending

**Steps (once frontend lands):**
1. Check `GET /dashboard/overview` — confirm `available`/`allocated` counts match the Assets directory, `pendingTransfers` matches open transfer requests, and `activeBookings` only counts today's confirmed bookings (not all bookings ever).
2. Allocate an asset with an `expectedReturnDate` of today — confirm it shows up in `availableForReturn`, not `upcomingReturns`. Allocate one with a date 3 days out — confirm it shows in `upcomingReturns` instead.
3. Allocate an asset with an `expectedReturnDate` in the past (or wait for one to become overdue) — confirm it does **not** appear in either of the above counts, but does show up in `GET /dashboard/alerts` as `{ overdueReturns: [{ assetTag, daysOverdue }] }` with a correct day count.
4. Put an asset `under_maintenance` — confirm `maintenanceToday` increments.
5. Do a handful of actions across modules (allocate, book, approve maintenance, close an audit) — confirm `GET /dashboard/recent-activity?limit=5` returns exactly the 5 most recent events, shaped identically to `GET /notifications` (`eventId`, `type`, `message`, `relatedEntityTag`, `timestamp`).

**Expected result:** overdue/due-today/upcoming returns are three non-overlapping buckets computed from `Allocation.expectedReturnDate`, not from a notification type that's never written; recent activity is just the Notification feed, not a second independent computation.

---

## Full End-to-End Walkthrough

Once every module above is ✅/✅, run this in sequence as the final pre-demo check:

1. Sign up as a new employee → log in.
2. Admin sets up a department, category, and promotes someone to Asset Manager.
3. Asset Manager registers a new asset (`Available`).
4. Allocate the asset to an employee; attempt to allocate it again to someone else → blocked, submit a transfer request instead → approve it.
5. Book a shared resource; attempt an overlapping booking → rejected; book a non-overlapping slot → succeeds.
6. Raise a maintenance ticket on an allocated asset → approve it (asset → `Under Maintenance`) → resolve it (asset → `Available`).
7. Run an audit cycle on the asset's department → mark one asset `Missing`, one `Damaged` → close the cycle → confirm a maintenance ticket was auto-created and the missing asset is `Lost`.
8. Check Reports for utilization/maintenance data reflecting the above.
9. Check Notifications for every event from steps 2–7.
10. Check the Dashboard KPIs reflect the final state.
