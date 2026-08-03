# GM Decision Queue V2 — contract decisions audit

## Dependency and scope confirmation

The branch contains the merged #1725–#1727 dependencies: `playerDecisionPresentation.js` and `buildPlayerDecisionPresentation()`, `gmDecisionQueue.js` and `buildAvailabilityDecisionQueue()`, `GMDecisionCenter.jsx`, the availability V1 audit, and the Decision Center documentation. V2 extends those boundaries rather than recreating them. Contract items retain the availability queue contract unchanged and add the shared `primaryReason` field to both categories.

This is presentation-only work. It changes no contract economics, salary-cap calculation, player rating/progression, trade, injury, simulation, AI roster, worker, transaction, persistence, or save-schema behavior.

## Live authority audit

`evaluateReSigningPriority()` in `src/core/retention/reSigning.js` is the authoritative shared retention recommendation. Its exact recommendation values are `cornerstone_priority`, `strong_keep`, `extension_candidate`, `keep_if_price_is_right`, `franchise_tag_candidate`, `replaceable_depth`, `likely_to_walk`, and `move_on`. It also supplies exact lowercase role importance (`core_starter`, `starter`, `rotation`, `depth`), replacement difficulty (`high`, `medium`, `low`), extension readiness, and the expiring decision. `summarizeContractRisk()` supplies exact lowercase negotiation risk bands (`high`, `medium`, `low`).

The older UI-only `evaluateResignRecommendation()` remains live in Contract Center/roster views and emits `priority_resign`, `resign_if_price`, `trade_or_tag`, `let_walk`, and `replaceable_depth`, with title-cased `High`/`Medium`/`Low` risk and replacement labels. It is not used by this core queue because `buildPlayerDecisionPresentation()` already establishes `evaluateReSigningPriority()` as the shared player-decision authority. The presentation adapter exposes that authority's recommendation, role, replacement, risk, readiness, and expiring fields without adding a formula.

Recorded contract terms are `contract.yearsRemaining`, `contract.yearsLeft`, then `contract.years`. Blank, null, missing, and nonnumeric values remain missing. Explicit extension eligibility, tag state, extension decision, or recorded re-sign recommendation can establish a cheap plausible-review signal, but never assigns severity itself. The live Contract Center offers its regular extension hub across normal gameplay phases and a specialized re-signing center in `offseason_resign`; the queue supports the repository's recorded preseason, regular/regular-season, playoffs, offseason/re-signing, free-agency, draft, training-camp, and lifecycle transition names. Unknown phases are omitted with a diagnostic. The exact destination is `Contract Center`; player ID remains metadata because the route does not support player focus.

Unsupported concepts include option decisions without an existing authority, invented tag eligibility, market/cap value judgments, negotiation execution, release/sign/trade actions, and phase-specific legal conclusions beyond the live Contract Center boundary. Legacy Contract Center filtering sometimes defaults missing years to zero; this queue intentionally does not reproduce that limitation.

## Public contracts and eligibility

`buildContractDecisionQueue({ roster, team, league, seasonStatsByPlayerId })` and `buildGMDecisionQueue()` both return `{ items, diagnostics }`. Items use stable IDs, category, explicit severity, player subject, title, one to three reasons, `primaryReason`, specialist destination, `stableSortKey`, and `availableData`.

Eligibility requires supplied-roster membership, matching team ownership, supported active/IR status, a recorded contract, a plausible current review signal, and a supported phase. Free agents, prospects, retirees, foreign-team players, stale references, missing contracts, and safe multi-year contracts without explicit signals are omitted. IR does not exclude a contract review. Candidates are canonically deduplicated before presentation construction.

## Severity and recommendation mapping

Rules run in order. **Critical** is an expiring canonical `cornerstone_priority`. **High** is an expiring core/starter, authoritative High replacement difficulty, authoritative High negotiation risk, or a strong `cornerstone_priority`/`strong_keep`/`extension_candidate`/`franchise_tag_candidate`. **Medium** is another real expiring or authoritative recommendation review. Missing facts never raise severity and candidates without truthful context are diagnosed.

Cornerstone/strong-keep/extension recommendations map to an extension-decision title; franchise-tag candidate maps to tag-or-extension review; replaceable/likely-walk/move-on map to let-walk review; other expiring cases use neutral contract-window copy. No new recommendation scoring is introduced.

## Reasons, ordering, deduplication, and overlap

Contract `primaryReason` selects, in order: current-season expiration, High negotiation risk, High replacement difficulty, canonical recommendation, then role. Availability selects no healthy assigned backup, High replacement difficulty, recorded duration, injury detail, then role. Full deduplicated reasons remain for later detail surfaces; the UI no longer relies on array position.

Contract ordering is severity, canonical recommendation priority, role importance, negotiation risk, replacement difficulty, term urgency, then canonical player ID. The combined queue sorts by severity and each category's stable key. Exact item IDs are deduplicated. Availability and contract items for the same player are genuinely distinct immediate decisions and are both retained; on a severity tie, availability sorts first during the recorded active absence. No information is silently suppressed.

## Legacy, performance, and future categories

Primitive references use a single league-player index. Cheap contract facts filter before presentation construction; each eligible unique candidate is presented once per category. No archive, worker, IndexedDB, market-value, transaction, or persistence path is used, and only final results are sorted. Numeric/string IDs are compared canonically while returned IDs are preserved. Partial team/league/stats and legacy year aliases fail safely; missing never becomes zero.

Future categories remain roster depth, trade deadline, opponent preparation, cap pressure, and development. They are outside this PR.
