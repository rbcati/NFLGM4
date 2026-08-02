# Player Decision Cards V1 — implementation audit

## Scope and live surfaces

The live, full player surface is `PlayerProfile.jsx`. It resolves an in-league player, then augments it with worker-provided career rows, archive seasons, transactions, records, game logs, awards, development, morale, negotiation, and contract context. `PlayerDetailModal.jsx` is a smaller career-table modal used by other roster entry points; it is not the authoritative full profile. Roster cards, the depth-chart editor, Contract/Re-Sign Center, Trade Center, release previews, Injury Report, comparison, and history surfaces remain specialized workflows.

V1 integrates only the full `PlayerProfile` overview. It deliberately leaves `PlayerDetailModal`, roster rows/cards, depth chart, contract/re-sign, trade/release, free agency, comparison, injury, awards, and history layouts unchanged. Those screens retain their existing calculations and legal-action guards.

## Fact authority

| Player fact | Live authority used in V1 | Notes |
| --- | --- | --- |
| Identity, ratings, status | resolved player record (`resolvePlayerForProfile`) | Missing jersey, experience, potential, and ratings remain absent rather than becoming zero. |
| Team | resolved profile team / canonical team identity | Free agents, prospects, and retired players do not receive an invented team. |
| Depth role | `player.depthChart.role`, then `depthChart.order` / legacy `depthOrder` | V1 never promotes the highest-OVR player to starter. Canonical order 1/2 maps to starter/backup; unassigned players say role unavailable. |
| Injury availability | recorded injury object and legacy injury-week fields | No injury-risk forecast is introduced. |
| Archetype | recorded `player.archetype`, else existing `derivePlayerArchetype()` when rating inputs exist | Missing rating inputs omit the archetype. The existing evaluation thresholds are unchanged. |
| Current performance | current-season totals already assembled from canonical player game logs in `PlayerProfile` | Position-aware metrics omit missing fields. Derived efficiency is shown only with a recorded denominator. Recent form is omitted because no cheap canonical multi-game form classifier was found. |
| Development | recorded overall/rating history; legacy `progressionDelta` fallback | Incompatible/missing checkpoints yield “Insufficient history.” Existing progression mechanics and projections are unchanged. |
| Contract term/cost | recorded contract fields and legacy aliases | V1 does not recompute dead cap. Guarantee, tag, and richer negotiation details remain in their existing specialist surfaces. |
| Contract recommendation, role importance, replacement | `evaluateReSigningPriority()` | This is the existing shared retention authority. Its lowercase replacement value is normalized only for display. V1 does not expect a precomputed recommendation on the player. |
| Morale | recorded player morale and existing profile morale engine | Preserved in the detailed profile; not converted into a new recommendation formula. |
| Awards/history/career stats | existing award timeline, record book, archive merge, career timeline, and game-log helpers | Existing detail remains available below the decision summary and in the existing tabs. |
| Trade value, release/dead cap, action legality | Trade Center, release preview/handlers, and their existing helpers | Not copied into V1 because no single profile-safe authoritative value/action model was available. |

## Existing recommendation systems

The repository already contains several contextual evaluators. `evaluateReSigningPriority()` is authoritative for retention recommendation, role importance, replacement difficulty, development outlook, market difficulty, and extension readiness. Player evaluation owns the existing archetype derivation. Contract negotiation owns leverage/risk. Trade valuation owns trade values. Release preview owns release consequences. The decision model reuses retention and archetype evaluation and does not create competing trade, release, cap, negotiation, or football evaluation formulas.

Recommendations appear only when a team roster context can be evaluated. They are deterministic display mappings of existing retention results, with factual role/replacement/expiration reasons. An injured roster player receives “Monitor injury recovery.” Free agents, prospects, retirees, and incomplete team contexts omit the recommendation rather than receiving a speculative instruction.

## Duplication and consolidation

Player presentation is currently duplicated across `PlayerProfile`, `PlayerDetailModal`, `PlayerCard`, roster tables, Contract Center, Trade Center, release previews, and comparison. `buildPlayerProfileAnalysis()` also assembles an older general profile object but includes a separate salary-versus-OVR heuristic; V1 does not reuse that heuristic for contract outlook. V1 introduces `buildPlayerDecisionPresentation()` as the one pure decision-summary boundary and makes the full Player Profile its first consumer. Existing detailed rendering is preserved to avoid broad workflow changes.

The resulting model contains:

`identity`, `role`, `availability`, `performance`, `development`, `contract`, `rosterValue`, `replacement`, `recommendation`, `context`, `availableData`, and `omittedReasons`.

It is pure, performs no persistence or worker calls, mutates no inputs, uses no randomness, and returns the same result for the same inputs.

## Unsupported and intentionally omitted in V1

- Recent form: reliable weekly rows exist in the full profile, but no canonical multi-game form authority exists.
- Trustworthy dead-cap consequence and release legality: retained in release preview/worker guards.
- A single profile-safe trade value and trade legality model: retained in Trade Center.
- Team-friendly/market-aligned contract pricing: the existing profile heuristic estimates salary from OVR, so it is not promoted into the decision card.
- Guaranteed money: displayed only if directly recorded; old contract shapes generally omit it.
- Franchise option/tag eligibility and no-trade clauses: no consistent cross-save profile action authority was confirmed.
- Snap share/current usage role: not consistently recorded across saves.
- Starter mutation, extension submission, trade submission, release, IR placement, and compare handlers: the full profile does not receive consistent legal handlers for all entry points. V1 links only to existing specialist screens and leaves their guards authoritative.

## Legacy and partial records

The model recognizes legacy `depthOrder`, contract `years`/`salary`, injury-week aliases, potential aliases, free agents, prospects, retirees, practice squad, and injured reserve. Missing player records return an unavailable model; missing sections are omitted or explicitly labeled unavailable; missing metrics never become invented zeroes. Legitimate recorded zeroes remain visible when another usage field establishes a real sample. No save migration or persisted schema change is required.

## Performance and follow-up

The model is memoized once in Player Profile. It consumes already-resolved player/team/league context and already-assembled season totals, causing no IndexedDB load and no additional render-time league scan beyond the existing retention helper. Dense career and game-log details remain behind existing profile tabs. A future iteration can migrate other player surfaces only after their action handlers and trade/release authorities can be passed without duplicating legality checks.
