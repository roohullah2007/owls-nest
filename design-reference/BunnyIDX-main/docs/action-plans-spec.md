# CRM Action Plans — Product & Architecture Specification

> **Status:** Research / specification only. No implementation code written yet.
> **Audience:** Engineering, before building.
> **Date:** 2026-06-18
> **Scope:** Trigger-based automation ("Action Plans" — like Follow Up Boss / kvCORE action plans): when something happens to a lead/contact, run a sequence of timed steps (send email, send SMS, create task, wait N days, etc.).

This document is grounded in an audit of the existing BunnyIDX codebase. Every "what exists" claim below points at a real file. The goal is to **reuse the platform's existing primitives** (contacts, tasks, Gmail send, Telnyx SMS, the timeline, the queue, the scheduler, team scoping) rather than reinvent them.

---

## A. What Already Exists

### A.1 Lead / Contact layer
- **Leads ARE contacts.** There is no separate `Lead` model. The unit is `App\Models\Contact` (`app/Models/Contact.php`), table `contacts`.
- **Status** — plain string column `contacts.status`, default `new_lead`. Default set defined on `User` (`User::DEFAULT_LEAD_STATUSES`): `new_lead, active, client, past_client, inactive`. Users can add custom statuses (stored in `users.settings['contact_statuses']`, written by `ContactController::storeContactStatus()`).
- **Type** — `contacts.type` (default `buyer`), defaults `buyer, seller`, also user-extensible.
- **Source** — `contacts.source` enum: `website, referral, open_house, social_media, cold_call, idx, manual, other`.
- **Tags** — polymorphic `Tag` (`tags` + `taggables` pivot), per-user unique names, hex color.
- **Ownership / assignment** — `contacts.user_id` (owner), `contacts.assigned_to` (single reassignment), plus `assigned_users` polymorphic pivot for multi-agent assignment.
- **Consent / DND (critical for automated outreach)** — `sms_consent`, `sms_consent_at`, `sms_opted_out`, `sms_opted_out_at`, `dnd_mode` (`all|sms|email`), `email_verified_at`, `phone_verified_at`. `last_contacted_at` is maintained on each touch.
- **AI fields** — `lead_score`, `ai_summary`, `ai_next_action`, `ai_activity_count`.
- **Notes** — `App\Models\Note` (polymorphic `notable`), with `@mentions`.
- **Timeline / Activity log** — `App\Models\Activity` (`activities`) written centrally via `App\Services\TimelineService::log()`. Flexible `event_type` string + `subject`/`description`/`metadata` JSON, with a `loggable` morph back to the source record. **This is the audit substrate Action Plans will write into.**
- **Lead capture entry points** — `ContactController::store()` (manual), `PublicWebsiteController` (agent-site forms, showing requests), `PublicLandingPageController`, and `LeadImport` (bulk CSV). These are the natural **trigger sources**.

### A.2 Task layer
- `App\Models\Task` (`tasks`), polymorphic `taskable` (Contact / Deal / Listing) or standalone.
- Fields: `title`, `description`, `priority` (`low|normal|high|urgent`), `due_at`, `due_date`, `reminder_at`, `reminder_sent_at`, `completed_at`, `is_completed`.
- Scopes: `incomplete()`, `overdue()`, `needsReminder()`, `upcoming()`.
- Separate `App\Models\Meeting` for appointments (with `reminder_minutes`).
- **Reminders already fire on a schedule** via `App\Console\Commands\SendReminders` (driven by `routes/console.php`). This is the exact polling pattern Action Plans will mirror.
- **No recurring tasks**, no task templates, no task dependencies today.

### A.3 Communication layer (the "actions" an Action Plan will perform)
- **Email send** — `App\Services\Gmail\GmailService::sendEmail($to, $subject, $bodyHtml, …)`. Requires a connected `EmailAccount` (encrypted OAuth tokens, auto-refresh). Inbound/outbound stored as `EmailMessage` + `EmailThread`; auto-matched to contacts by address; `NewEmailMessage` broadcast + Activity logged.
- **Bulk email reference pattern** — `App\Jobs\SendBulkEmailJob` (`ShouldQueue`, stateful, pause/resume, rate-limit backoff via self-redispatch with `->delay()`, daily caps). **This is the closest existing thing to an execution engine and the best pattern to copy.**
- **SMS send** — `App\Services\Telnyx\TelnyxService::sendSms($from, $to, $body)`, orchestrated by `SmsController::send()` which enforces: `sms_opted_out` hard block, `dnd_mode` block, **10DLC approval** (`TelnyxBrand` + `TelnyxCampaign` both `approved`) for NANP numbers, from-number selection, `SmsMessage` logging, `last_contacted_at`, `NewSmsMessage` broadcast.
- **Calls** — `CallLog`, power dialer, ringless voicemail via Telnyx.
- **Merge fields** — `App\Services\Email\MergeFieldService::replace($template, Contact)`. **Hardcoded to 7 contact fields** (`first_name, last_name, full_name, email, phone, city, company`). No deal/user/listing tokens.
- **In-app notifications** — Laravel `notifications` table + `App\Notifications\*` classes (database + broadcast + optional mail, gated by `users.notification_preferences`).

### A.4 Automation / background infrastructure
- **Queue** — `database` driver, production-ready (`failed_jobs`, retries, `->delay()` supported). Jobs: `SyncGmailMessages`, `SendBulkEmailJob`, domain jobs.
- **Scheduler** — Laravel 13 style in `routes/console.php` (`Schedule::command(...)`), already running every-minute reminder polling + 3-min Gmail sync. Adding Action-Plan cron is a one-line addition.
- **Events** — 9 events exist (chat, call, email, sms, MLS) but **NO contact/deal lifecycle events** (no `ContactCreated`, no `ContactStatusChanged`). Listeners are **manually wired** in `AppServiceProvider::boot()` (no auto-discovery); only `RecordLoginActivity` exists.

### A.5 Tenancy / permissions
- **Single-DB, row-level.** `App\Models\Concerns\BelongsToTeamOrUser` provides `scopeForUser()` (personal vs team by `active_context`) and `scopeWithPermissions($user, $resource)` (resolves `all|own|none` from `TeamMember`), and auto-sets `team_id` on create.
- Per-resource permission levels live in `TeamMember::can($resource)` / `Team::getPermissionsForRole()`. Resources today: `listings, contacts, tasks, calendar, deals, phone`.

### A.6 UI primitives
- **Lists** — `Components/ui/DataTable.*` (canonical), URL-param filters, `BulkActionBar`, localStorage column prefs. Reference: `Pages/Crm/Contacts/Index.tsx`.
- **Forms** — `SlideOverModal` (right panel) and `Modal` (center), Inertia `useForm`, shared `FieldLabel` + `formInputClass`, `Select`, `MultiTokenInput`, `ContactPicker`.
- **Sequence/builder UI** — the **Deals kanban** uses **native HTML5 drag-and-drop** (no dnd-kit/react-beautiful-dnd in the project). The **Onboarding wizard** (`Pages/Crm/Onboarding/Index.tsx`) is the multi-step pattern. No workflow/sequence builder exists.
- **Nav** — static array in `Layouts/CrmLayout.tsx`.

---

## B. What Can Be Reused (do NOT rebuild)

| Need | Reuse | Location |
|---|---|---|
| Tenant scoping + auto `team_id` | `BelongsToTeamOrUser` trait | `app/Models/Concerns/BelongsToTeamOrUser.php` |
| Permission gating (`all/own/none`) | `TeamMember::can('action_plans')` (add resource key) | `app/Models/TeamMember.php`, `app/Models/Team.php` |
| Send email step | `GmailService::sendEmail()` | `app/Services/Gmail/GmailService.php` |
| Send SMS step (+ consent/10DLC) | `SmsController::send()` logic → extract to a service | `app/Http/Controllers/Crm/SmsController.php` |
| Create task / meeting step | `Task` / `Meeting` models | `app/Models/Task.php`, `Meeting.php` |
| Merge tags | `MergeFieldService::replace()` (extend tokens) | `app/Services/Email/MergeFieldService.php` |
| Audit / timeline writes | `TimelineService::log()` | `app/Services/TimelineService.php` |
| Stateful queued execution | `SendBulkEmailJob` pattern (delay, backoff, per-item error capture) | `app/Jobs/SendBulkEmailJob.php` |
| Time-based polling/dispatch | `SendReminders` command + `routes/console.php` | `app/Console/Commands/SendReminders.php` |
| In-app notify | Laravel notifications + `notification_preferences` | `app/Notifications/*` |
| List UI | `DataTable`, `SlideOverModal`, URL filters | `Components/ui`, `Components/Crm` |
| Step builder drag-drop | Native HTML5 DnD (same as Deals kanban) | `Pages/Crm/Deals/components/*` |

---

## C. Missing Components (must be built)

1. **Lifecycle events** — there is no `ContactCreated` / `ContactStatusChanged` / `ContactAssigned` / `TagAdded` event. **Triggering requires these.** Either fire events from the controllers/model observers, or (MVP-pragmatic) hook directly in the existing write paths.
2. **Automation domain models** — no `ActionPlan`, `ActionPlanStep`, `ActionPlanEnrollment`, `ActionPlanStepRun` tables exist.
3. **Execution engine** — no scheduler-driven runner that advances enrollments and dispatches due steps. (Reminder polling is the template, but it only handles two fixed cases.)
4. **Reusable templates** — no persisted Email/SMS template models; campaigns inline their content. Action Plans need reusable, mergeable step content (can start inline, extract later).
5. **Extended merge tokens** — current tokens are contact-only; automation will want agent/owner signature, unsubscribe link, and (later) deal/listing tokens.
6. **A send-SMS service** — SMS send logic is trapped inside an HTTP controller (`SmsController::send()`); the engine needs it callable from a job. Extract to `App\Services\Telnyx\SmsSender` (or similar) without behavior change.
7. **Quiet-hours / throttle / suppression** — automated outreach needs send-window rules, per-contact "don't double-enroll", and global opt-out respect beyond the manual-send checks.
8. **Builder UI + list UI + enrollment UI** — none exist for this domain.
9. **Permission resource key** — add `action_plans` to the `Team`/`TeamMember` permission map.

---

## D. Recommended Action Plan Architecture

A **template/instance** model — the industry-standard shape for drip automation:

```
ActionPlan (template)            ← what to do, defined once
  └─ ActionPlanStep[] (ordered)  ← the timed steps (email/sms/task/wait/...)

ActionPlanEnrollment (instance)  ← one contact running through one plan
  └─ ActionPlanStepRun[]         ← per-step execution record (audit + idempotency)
```

**Three layers:**

1. **Trigger layer** — decides *when a contact gets enrolled*. Sources: lifecycle hooks (contact created, status changed to X, tag added, source = website) or manual ("Enroll in plan" bulk action). Produces an `ActionPlanEnrollment`.
2. **Scheduling layer** — a scheduler-driven runner (every minute, reusing the `routes/console.php` + command pattern) finds enrollments whose **next step is due** and dispatches a queued job per due step. Each step computes the `run_at` of the following step ("wait 3 days" = `now + 3d`).
3. **Execution layer** — a queued `ProcessActionPlanStep` job performs the action through the **existing services** (Gmail/Telnyx/Task), respecting consent/DND/10DLC/quiet-hours, writes an `ActionPlanStepRun`, logs to the timeline, and advances the enrollment.

**Design principles**
- **Reuse, don't fork** the comms layer — every send goes through `GmailService` / the extracted SMS sender so consent + 10DLC + logging + broadcast are automatic.
- **Idempotent steps** — `ActionPlanStepRun` has a unique `(enrollment_id, step_id)`; the runner never double-sends even if the job retries (mirror `SendBulkEmailJob`'s `sent_contact_ids` approach).
- **Tenant-scoped everywhere** via `BelongsToTeamOrUser`; gated by a new `action_plans` permission resource.
- **Pause/stop is first-class** — an enrollment can be `active|paused|completed|stopped`; a contact replying or opting out auto-stops their enrollments (lead-intent exit).

---

## E. Database Design (proposed; subject to migration review)

All tables get `user_id` + `team_id` and use `BelongsToTeamOrUser`. SQLite-safe (no DB-specific types), forward-only.

### `action_plans` (template)
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| user_id, team_id | fk | owner / tenant |
| name | string | |
| description | text null | |
| trigger_type | string | `manual`, `contact_created`, `status_changed`, `tag_added`, `source_is` |
| trigger_config | json null | e.g. `{ "to_status": "active" }`, `{ "tag_id": 12 }` |
| is_active | bool | publish toggle |
| stop_on_reply | bool | exit when contact emails/SMS back |
| stop_on_status | json null | exit statuses |
| quiet_hours | json null | `{ "start":"21:00","end":"08:00","tz":"contact|user" }` |
| allow_reenroll | bool default false | re-enroll if trigger fires again |
| enrolled_count, completed_count | int | denormalized counters |
| timestamps, soft deletes | | |

### `action_plan_steps` (ordered template steps)
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| action_plan_id | fk | cascade |
| user_id, team_id | fk | tenant (denormalized for scoping) |
| position | int | order |
| step_type | string | `wait`, `email`, `sms`, `task`, `notify` (later: `call`, `meeting`, `update_field`, `add_tag`, `webhook`) |
| delay_amount | int default 0 | combined with unit = offset before this step |
| delay_unit | string | `minutes|hours|days` |
| config | json | per-type payload (see below) |

**`config` by `step_type`:**
- `email` → `{ subject, body_html, from_email_account_id|null }`
- `sms` → `{ body }`
- `task` → `{ title, description, priority, due_offset_days }`
- `notify` → `{ message, notify_role|user_id }`
- `wait` → `{}` (delay-only spacer; or fold "wait" into each step's `delay_*` and drop the standalone type — **decision point, see I/J**)

### `action_plan_enrollments` (instance: contact × plan)
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| action_plan_id | fk | |
| contact_id | fk | (Deal enrollment is a future extension) |
| user_id, team_id | fk | tenant |
| status | string | `active|paused|completed|stopped` |
| current_step_id | fk null | next/last step pointer |
| next_run_at | datetime null | **the index the runner queries** |
| enrolled_by | fk null | user or `null` for system |
| enrolled_via | string | `manual|trigger` |
| started_at, completed_at, stopped_at | datetime null | |
| stop_reason | string null | `replied|opted_out|status_changed|manual|plan_deactivated` |
| timestamps | | |

> **Key index:** `(status, next_run_at)` — drives the runner. Plus unique `(action_plan_id, contact_id)` when `allow_reenroll = false`.

### `action_plan_step_runs` (per-step audit + idempotency)
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| enrollment_id | fk | |
| action_plan_step_id | fk | |
| user_id, team_id | fk | tenant |
| status | string | `pending|sent|skipped|failed` |
| skip_reason | string null | `quiet_hours|opted_out|dnd|no_email|10dlc_unapproved|no_phone` |
| result_ref_type/id | nullable morph | links to the created `SmsMessage`/`EmailMessage`/`Task` |
| error | text null | |
| ran_at | datetime null | |
| unique | `(enrollment_id, action_plan_step_id)` | **idempotency guard** |

**Permissions:** add `'action_plans' => 'all'` to `Team::DEFAULT_ROLE_PERMISSIONS` and `TeamMember::DEFAULT_PERMISSIONS`.

---

## F. Trigger System Design

**Two trigger families:**

1. **Manual / explicit** (MVP-simplest, zero new events): a bulk action on the Contacts list ("Add to Action Plan") and a button on the contact detail page create an `ActionPlanEnrollment` directly. No event plumbing required.

2. **Automatic / lifecycle:** fire on contact writes. Two implementation options —
   - **Option A (recommended for MVP): inline enrollment in existing write paths.** In `ContactController::store()` (created), the status-update path (status changed), and tag-sync path, call an `ActionPlanEnroller::evaluate(Contact, $changeContext)` that finds active plans whose `trigger_type`/`trigger_config` match and enrolls. Cheap, explicit, debuggable, no event/listener wiring (which the codebase barely uses today).
   - **Option B (cleaner long-term): real domain events + a listener.** Introduce `ContactCreated`, `ContactStatusChanged`, `ContactTagged`; wire a single `EnrollMatchingActionPlans` listener in `AppServiceProvider`. More decoupled, but adds the event layer the app currently lacks.

**Enrollment guards (both options):** skip if contact already actively enrolled in that plan (unless `allow_reenroll`), skip opted-out/DND contacts for comms-only plans, respect tenant scope (only the owning team's plans evaluate their own contacts).

**Trigger matching examples**
- `contact_created` + `{ "source": "website" }` → enroll new website leads.
- `status_changed` + `{ "to_status": "active" }` → start a nurture sequence when a lead becomes active.
- `tag_added` + `{ "tag_id": 7 }` → "Hot Buyer" tag kicks off a fast-follow plan.

---

## G. Execution Engine Design

**Mirror the proven `SendReminders` + `SendBulkEmailJob` patterns.**

1. **Scheduler (poll)** — add to `routes/console.php`:
   `Schedule::command('action-plans:tick')->everyMinute()->withoutOverlapping();`

2. **`action-plans:tick` command** — queries `ActionPlanEnrollment::where('status','active')->where('next_run_at','<=', now())` (chunked, tenant-agnostic since it runs system-wide), and dispatches one `ProcessActionPlanStep` job per due enrollment. Keep the command thin; do the work in the job (like `SendReminders` delegates to notifications).

3. **`ProcessActionPlanStep` job (`ShouldQueue`)** — for one enrollment:
   - Re-check enrollment is still `active` and plan still `is_active` (else stop/skip).
   - Resolve the current step. **Idempotency:** `firstOrCreate` an `ActionPlanStepRun(enrollment, step)`; if already `sent/skipped`, advance and return.
   - **Pre-send gates:** quiet-hours window, `sms_opted_out`/`dnd_mode`, 10DLC approval (for SMS), missing email/phone → write `skipped` with `skip_reason`, then advance.
   - **Perform via existing services:**
     - `email` → merge tokens via `MergeFieldService` (extended) → `GmailService::sendEmail()` using the owner's default `EmailAccount`.
     - `sms` → extracted `SmsSender` service (consent/10DLC/from-number/log/broadcast preserved).
     - `task` → create `Task` linked to the contact (`taskable`).
     - `notify` → dispatch a Laravel notification to owner/role.
   - Write `ActionPlanStepRun` result, `TimelineService::log()` an `action_plan_step_sent` activity, update `last_contacted_at` (comms steps).
   - **Advance:** find next step by `position`; set `enrollment.current_step_id` + `next_run_at = now() + next.delay`. If none, mark `completed`.
   - **Failure handling:** copy `SendBulkEmailJob` — capture per-step error, mark run `failed`, and either retry with backoff (`->delay()`) or advance depending on step criticality. Never let one bad send halt the whole enrollment silently — log it.

4. **Exit conditions (continuous):** when an inbound `NewEmailMessage`/`NewSmsMessage` is matched to a contact, or a contact opts out / hits a `stop_on_status`, mark their active enrollments `stopped` with `stop_reason`. (Hook into the existing inbound-message processing in `GmailSyncService::processMessage` and the SMS inbound webhook.)

**Why polling, not pure event-driven delays:** the platform already runs a per-minute scheduler; "wait N days" maps naturally to a `next_run_at` column + poll, exactly like `Task::needsReminder()`. No need for delayed-job fragility across days.

---

## H. UI / UX Flow

**Navigation:** add "Action Plans" to `baseNavigation` in `Layouts/CrmLayout.tsx`.

**1. Action Plans list** (`Pages/Crm/ActionPlans/Index.tsx`)
- `DataTable`: Name, Trigger, Steps, Active toggle, Enrolled, Completed, updated.
- URL-param filters + "New Action Plan" `PrimaryButton`. Row → builder.

**2. Action Plan builder** (`Pages/Crm/ActionPlans/Edit.tsx`)
- **Header:** name/description (`InlineEdit`), active toggle, trigger selector (`Select` for `trigger_type` + conditional config like a status/tag/source picker).
- **Step timeline:** vertical list of step cards (visual reuse of `DealCard`), each showing icon + type + delay ("Wait 2 days → Send Email"). **Reorder via native HTML5 drag-and-drop** (same approach as the Deals kanban — no new library).
- **Add/edit step:** `SlideOverModal` form — pick step type, set delay (`delay_amount` + `delay_unit`), then a type-specific body: email (subject + body + merge-tag inserter from `MergeFieldService::availableFields()`), SMS (textarea + char/segment counter, like `SmsController`'s 1600 limit), task (title/priority/due offset), notify (message + target).
- **Settings panel:** stop-on-reply, quiet hours, re-enrollment, exit statuses.

**3. Enrollment surfaces**
- Contacts list **bulk action** "Add to Action Plan" (extend `BulkActionBar`).
- Contact detail: an "Action Plans" card showing active/completed enrollments with current step + next run, and a pause/stop control.
- Each automated send already appears in the contact **timeline** (`TimelineFeed`) via `TimelineService`.

**4. Builder UX guardrails:** warn if an SMS step exists but 10DLC isn't approved; warn if an email step exists but no `EmailAccount` is connected; show a per-plan "enrolled / completed / stopped" mini-funnel.

---

## I. MVP Scope

**In:**
- Models + migrations: `action_plans`, `action_plan_steps`, `action_plan_enrollments`, `action_plan_step_runs` (all tenant-scoped, `action_plans` permission key).
- Step types: **`email`, `sms`, `task`** with per-step delay (fold "wait" into each step's `delay_*` — no standalone wait node for MVP).
- Triggers: **`manual` enrollment** (bulk action + contact-detail button) **and one automatic trigger** (`status_changed`) via **Option A inline enrollment** (no new event layer).
- Engine: `action-plans:tick` command + `ProcessActionPlanStep` queued job + `next_run_at` polling, idempotent step runs, reusing `GmailService`, extracted `SmsSender`, `Task`, `MergeFieldService`, `TimelineService`.
- Safety: consent/DND/10DLC gates, stop-on-opt-out, no double-enroll.
- UI: list page, builder with drag-order steps + slideover step editor, contact-detail enrollment card.
- Tests (PHPUnit, in-memory SQLite): trigger match → enroll, runner dispatches due step, each step type performs + advances, idempotency, opt-out skip. `npm run build` gate for the React side.

**Explicitly out of MVP:** visual branching/conditionals, A/B steps, `wait`-as-node, deal enrollment, reusable template library, call/meeting/webhook steps, extended (deal/listing) merge tokens, analytics dashboards, quiet-hours timezone-per-contact (start with team/user tz).

---

## J. Future Enhancements

1. **More step types** — `call` (queue into power dialer), `meeting` auto-schedule, `update_field`, `add_tag`/`remove_tag`, `notify_agent`, `webhook`/Zapier-out.
2. **`wait` as a first-class node** + conditional branches ("if opened email → A, else → B"), driven by email open/SMS reply events.
3. **Reusable Email/SMS template library** (extract from inline `config`), shared with the existing bulk-email campaign feature.
4. **Extended merge tokens** — agent signature, unsubscribe link, deal/listing fields; centralize token resolution beyond contacts-only.
5. **Deal & listing enrollment** (polymorphic `enrollable` instead of `contact_id`).
6. **Real domain-event layer** (Option B) — `ContactCreated/StatusChanged/Tagged` events + listener, replacing inline enrollment; also unlocks third-party automation.
7. **Analytics** — per-plan funnel, open/click/reply attribution, A/B testing.
8. **Quiet hours per contact timezone**, send-rate throttling, global suppression lists.
9. **Goal-based exit** ("stop when contact books a meeting / deal created").
10. **Plan library / marketplace** — prebuilt plans (new-buyer nurture, past-client re-engagement) shippable as seeds.

---

## Appendix — Key file references (for the implementer)

- Tenancy: `app/Models/Concerns/BelongsToTeamOrUser.php`, `app/Models/Team.php`, `app/Models/TeamMember.php`
- Contact/timeline: `app/Models/Contact.php`, `app/Models/Activity.php`, `app/Services/TimelineService.php`
- Email: `app/Services/Gmail/GmailService.php`, `app/Services/Gmail/GmailSyncService.php`, `app/Services/Email/MergeFieldService.php`
- SMS: `app/Http/Controllers/Crm/SmsController.php` (extract sender), `app/Services/Telnyx/TelnyxService.php`, `app/Models/{TelnyxBrand,TelnyxCampaign,PhoneNumber,SmsMessage}.php`
- Tasks: `app/Models/Task.php`, `app/Models/Meeting.php`
- Engine patterns: `app/Console/Commands/SendReminders.php`, `routes/console.php`, `app/Jobs/SendBulkEmailJob.php`
- UI: `Components/ui/DataTable.tsx`, `Components/Crm/{SlideOverModal,Select,MultiTokenInput,PrimaryButton,FormField}.tsx`, `Pages/Crm/Deals/components/*` (drag-drop), `Layouts/CrmLayout.tsx`
