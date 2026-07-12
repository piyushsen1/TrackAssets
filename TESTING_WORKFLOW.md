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

**Backend:** ❌ not started · **Frontend:** ❌ not started

*(Steps to be added once this module is implemented.)*

---

## 4. Asset Allocation & Transfer

**Backend:** ❌ not started · **Frontend:** ❌ not started

*(Steps to be added once this module is implemented.)*

---

## 5. Resource Booking

**Backend:** ❌ not started · **Frontend:** ❌ not started

*(Steps to be added once this module is implemented.)*

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
