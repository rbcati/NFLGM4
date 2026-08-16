# GM Decision Queue roster cutdown V3 audit

## Authorities verified

`getRosterLimitForPhase()` in `src/core/teamValidation.js` is the shared transaction and league-legality authority. It selects the existing 90-player offseason limit for offseason re-signing, free agency, draft, offseason, and preseason transaction legality, and the existing 53-player regular-season limit otherwise. Separately, the preseason `ADVANCE_WEEK` handler in `src/worker/worker.js` explicitly blocks an interactive user with more than `Constants.ROSTER_LIMITS.REGULAR_SEASON` players before starting the season. The queue therefore uses that proven 53-player preseason transition constraint and labels it critical; other proven phase-limit violations are high.

`DEPTH_NEEDS` is a positional construction template and is not consulted or summed. The limits come only from `ROSTER_LIMITS`, through the shared legality helper or the explicit preseason advance gate.

League legality builds membership from players with a team ID and excludes recorded `free_agent` status. The decision context is deliberately more conservative: it counts only supplied-team players explicitly recorded as `active` or `injured_reserve` (including legacy `onIR: true`). Thus IR counts under the current legality model, while free agents, prospects, retired players, foreign ownership, unresolved references, duplicates, and unknown statuses do not increase queue urgency. Unknown and partial data produce deterministic diagnostics. A missing phase makes limit context unavailable rather than defaulting to 53.

## Review context and omitted claims

The feature emits at most one team-level `roster_cutdown` item. Candidate rows are nested factual review context, never queue cards. They use canonical player presentation role, canonical position, replacement difficulty when present, and factual same-position counts. Their deterministic order is neutral position then canonical player ID; there is no cut score, ideal positional target, OVR/age/salary rank, or release recommendation.

The release handlers validate ownership and perform mutations inside the worker. No reusable, mutation-free release-eligibility preview was found, so the queue makes no releasability claim. Contract-obligation code can calculate release dead money, but the live release path also owns phase treatment and mutation; this PR intentionally exposes no cap savings, dead money, guarantee, or June 1 estimate and adds no cap math.

## Queue, UI, and performance

Combined ordering is severity, then explicit category order (availability, `roster_cutdown`, contract), then existing stable keys. This preserves availability ahead of same-severity reminders while ranking the team constraint ahead of contracts. Team subjects bypass player overlap buckets, preserving availability-versus-contract deferral. The UI renders only the existing top three decisions and routes the compact team item through the canonical `Team:Roster / Depth` destination recognized by management destination normalization and TeamHub.

The combined builder's presentation cache is shared across availability, contracts, and cutdown candidates. Membership and duplicate filters run before presentation work, and every resolved candidate presentation is built at most once.

No AI roster behavior, transaction execution, simulation, worker behavior, persistence, cap formulas, save schema, or player data is changed. No worker call, persistence write, randomness, or input mutation occurs in the new pure model.
