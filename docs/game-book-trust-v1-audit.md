# Game Book Trust V1 audit

## Scope and data flow

The audit confirmed that `buildBoxScoreViewModel` was already the closest thing
to a canonical postgame presentation adapter. It reads the normalized archive,
merges an authoritative stored final with schedule identity, and produces team,
player, scoring, play, and availability rows without writing league or save
state. V1 makes that ownership explicit as `buildGameBookPresentation` while
retaining the old export as a compatibility alias.

| Surface / section | Input before V1 | V1 authority |
| --- | --- | --- |
| Game Book header and final | `GameDetailScreen` view model plus a second `BoxScore` view model | One memoized Game Book presentation passed into the embedded box score |
| Summary / decisive moments | `BoxScore` sliced turning points or scoring rows | `presentation.decisiveMoments` |
| Key performers | `BoxScore` filtered leader cards | `presentation.keyPerformers` |
| Team comparison | View-model stat mapping | Unchanged canonical `teamComparisonRows` mapping |
| Player tables and category tabs | View model built sections, then `BoxScore` rebuilt them | Canonical `playerStatSections` only |
| Scoring summary, special teams, plays | View-model normalized rows | Unchanged presentation rows and availability flags |
| Weekly Results featured result | A Game Book view model for score, margin, and performers | Compatibility alias to the same pure presentation builder |
| Weekly GM Briefing / postgame | Stored strict final and canonical game id; opens Game Book for detail | No football/state change; destination resolves to the same Game Book model |

## Confirmed duplication removed

* The embedded Game Book fetched/parsing the archive twice: once in
  `GameDetailScreen` and again inside `BoxScore`. The parent now passes its
  memoized presentation object, disabling the nested request.
* `BoxScore` rebuilt, filtered, sorted, and mapped player stat sections already
  present on the view model. It now consumes the prepared sections directly.
* `BoxScore` independently selected decisive moments and filtered leader cards.
  Both are now presentation-model fields.
* Compact leader selection could show the same multi-role player more than
  once. Candidate ranking remains stable, but each selected player id is now
  unique and a missing replacement is omitted by `keyPerformers`.

## Intentionally unchanged

The simulation engine, score production, archive schema, IndexedDB writes,
football statistics, Weekly Briefing decision logic, and visual design are not
changed. Existing result cards that only need archive access metadata continue
to use `buildCompletedGamePresentation`; this is routing/availability data, not
a competing football summary. Legacy archives continue through the existing
normalizer and are explicitly identified by `legacyData` flags.

## Remaining limitations

Older saves may contain only a final score, or may omit quarter, player, team,
or play data. The presentation reports those sections unavailable and the UI
omits their tabs/cards; it does not reconstruct missing football outcomes.
Canonical event-ledger games without recorded chronological quarter totals keep
the existing honest quarter-unavailable message.
