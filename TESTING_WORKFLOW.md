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
4. **Categories tab:** confirm seeded Electronics/Furniture/Vehicles show, with Electronics displaying its custom "warranty period" field. Create a new category.
5. **Employee tab:** confirm the 4 seeded employees show with correct department/role/status. Create a new employee for an email that has already signed up (Screen 1) — confirm it auto-links their account (`hasAccount: true`) rather than creating a duplicate. Create one for an email that hasn't signed up — confirm it's created as directory-only (`hasAccount: false`).
6. Promote an employee to Department Head or Asset Manager from this screen. Confirm attempting to promote a directory-only (no-account) employee is blocked with a clear message instead of silently failing.
7. Log in as a non-admin (e.g. `raj@assetflow.test`) and confirm none of the Organization Setup actions are reachable/authorized (403 on direct API calls).

**Expected result:** all master data (departments/categories/employees) is admin-only to write, readable by everyone, and role promotion is the only place a role changes.

---

## 3. Asset Registration & Directory

**Backend:** ✅ done · **Frontend:** ❌ pending

Seeded assets: `AF-0001` (Dell laptop, Engineering), `AF-0002` (HP laptop, Sales), `AF-0003` (office desk, Engineering), `AF-0004` (company vehicle, unassigned department, `isBookable: true`).

**Steps (once frontend lands):**
1. Log in as Asset Manager (`manager@assetflow.test`).
2. Register a new asset with name/category/department/location/serial — confirm it gets an auto-generated tag (`AF-0005`, sequential) and a real scannable QR code image, and starts as `available`.
3. On the directory list, search by tag, by serial, and by partial name — confirm all three match.
4. Filter by category, status, and department independently — confirm each narrows results correctly.
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

**Expected result:** one active holder per asset at all times; direct re-allocation always blocked in favor of a transfer request; approvals respect department scoping for Department Heads; return flow captures condition notes and frees the asset.

---

## 5. Resource Booking

**Backend:** ✅ done · **Frontend:** ❌ pending

Seeded resources: `Conference Room B2`, `Meeting Room A1`, `Toyota Innova (Company Vehicle)`.

**Steps (once frontend lands):**
1. Log in as Admin or Asset Manager, create a new resource — confirm a plain Employee gets 403 trying the same.
2. Book Room B2 for 9:00–10:00.
3. Attempt to book Room B2 for 9:30–10:30 — confirm it's rejected as a conflict (this is the spec's literal example).
4. Book Room B2 for 10:00–11:00 (starts right when the first ends) — confirm this succeeds (also the spec's literal example, non-overlap).
5. Check `displayStatus` on a booking: a slot in the future shows `upcoming`, a slot spanning "now" shows `ongoing`, a past slot shows `completed`, a cancelled one shows `cancelled` regardless of time.
6. As a different employee (not the requester, not admin), try to cancel or reschedule someone else's booking — confirm 403. As the requester (or admin), cancel/reschedule it — confirm it works, and rescheduling re-runs the overlap check.
7. Check Notifications after booking/reschedule/cancel — confirm each produced an entry.

**Expected result:** overlap detection blocks exactly the overlapping case and allows the back-to-back case; only the requester or an admin can cancel/reschedule; resource creation is admin/asset-manager only.

---

## 6. Maintenance Management

**Backend:** ❌ not started · **Frontend:** ❌ not started

*(Steps to be added once this module is implemented.)*

---

## 7. Asset Audit

**Backend:** ❌ not started · **Frontend:** ❌ not started

*(Steps to be added once this module is implemented.)*

---

## 8. Reports & Analytics

**Backend:** ❌ not started · **Frontend:** ❌ not started

*(Steps to be added once this module is implemented.)*

---

## 9. Activity Logs & Notifications

**Backend:** ❌ not started · **Frontend:** ❌ not started

*(Steps to be added once this module is implemented.)*

---

## 10. Dashboard

**Backend:** ❌ not started · **Frontend:** ❌ not started

*(Steps to be added once this module is implemented — finalized last since it aggregates every module above.)*

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
