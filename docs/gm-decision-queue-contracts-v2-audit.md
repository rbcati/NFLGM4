# GM Decision Queue V2 — contract decision audit

## Execution note

- **Authority:** `evaluateReSigningPriority()` in `src/core/retention/reSigning.js` is the shared retention authority. `buildPlayerDecisionPresentation()` invokes it once and now exposes its queue-safe fields as `presentation.retention`.
- **Competing helpers:** `evaluateResignRecommendation()` in `src/ui/utils/contractInsights.js` is a separate UI heuristic with incompatible tiers (`priority_resign`, `resign_if_price`, `trade_or_tag`, `let_walk`, `replaceable_depth`) and title-cased `negotiationRisk` / `replacementDifficulty`. It is used by legacy Contract/Roster UI surfaces, not by player presentation, so V2 does not mix its output with the shared retention evaluator.
- **Exact authoritative output:** `recommendation` is one of `cornerstone_priority`, `strong_keep`, `extension_candidate`, `keep_if_price_is_right`, `franchise_tag_candidate`, `replaceable_depth`, `likely_to_walk`, or `move_on`. `roleImportance` is `core_starter`, `starter`, `rotation`, or `depth`. `replacementDifficulty` and `expectedMarketDifficulty` are lowercase `high`, `medium`, or `low`. `extensionReadiness` is `open_to_extension_now`, `prefers_to_wait`, `wants_market_reset`, `willing_to_discount_for_security`, or `likely_to_test_free_agency`.
- **Computed, not stored:** these recommendation fields are computed live by `evaluateReSigningPriority()`; V2 does not read a precomputed player recommendation.
- **Contract terms:** the player-decision presentation canonically reads `contract.yearsRemaining`, then `contract.yearsLeft`, then `contract.years`; blank strings and non-finite values are unavailable. V2 requires exactly one recorded remaining year. `1` means the contract expires after the current season, `> 1` is a multi-year contract, and `0` is not promoted into an expiring-after-this-season decision.
- **Phase and actions:** the exact reviewed phase is `offseason_resign`, the worker's dedicated contract-extension window. `ContractCenter` renders a specialized Re-signing Center in that phase, and the worker permits franchise tags only there. The generic Contract Center tab renders in other phases, but V2 omits them because it has no verified phase-safe current-decision contract for this queue. Missing or unknown phase omits the item.
- **Risk and tag candidacy:** there is no stored, active-negotiation risk field to safely consume outside an active negotiation. `summarizeContractRisk()` is a derived retention forecast, so V2 does not relabel it as negotiation risk. `franchise_tag_candidate` is a recommendation tier, but candidacy for execution is only truthfully actionable in `offseason_resign`; V2 only reviews, never executes.
- **Route:** `GMDecisionCenter` uses the existing accepted destination string `Contract Center`. No player-focused contract route exists in the live navigation parser.

## Supported behavior

The contract queue includes only owned roster players with supported active or injured-reserve status, a resolvable canonical player ID, a recorded `contract`, exactly one canonical remaining year, a valid shared retention evaluation, and `league.phase === 'offseason_resign'`. It emits no item for free agents, draft prospects, retired players, foreign-team players, missing/stale rows, blank/null/zero terms, or multi-year contracts.

Severity is transparent:

1. `critical`: `cornerstone_priority` plus `core_starter`, `high` expected market difficulty, and `high` replacement difficulty.
2. `high`: a `core_starter`/`starter`, `high` expected market difficulty, `high` replacement difficulty, or one of `cornerstone_priority`, `strong_keep`, or `extension_candidate`.
3. `medium`: another verified expiring contract decision.

The queue sorts by severity, canonical recommendation priority, role importance, expected market difficulty, replacement difficulty, timing, and canonical player ID. It deduplicates canonical player IDs, contract item IDs, exact reason strings, and diagnostics. A combined queue orders equal-severity availability before contracts. For the same player, an availability item suppresses a contract item when it has equal or greater severity; a strictly more severe contract may coexist because both are immediate, distinct actions. Suppressions are returned as deterministic diagnostics.

Each item has `primaryReason`, independent of `reasons` ordering. Contract reasons prioritize the current-season expiration, then high market difficulty, high replacement difficulty, recommendation, and role. Availability items retain their factual reasons and now explicitly select a primary reason without changing eligibility or severity.

## Unsupported and unchanged

V2 does not execute extensions, negotiations, franchise tags, releases, trades, signings, waivers, dismissals, snoozes, persistence, new routes, notifications, or advance blockers. It changes no contract economics, cap logic, AI behavior, workers, save schemas, simulation rules, injury mechanics, player ratings/progression, trade valuation, or Franchise HQ architecture.
