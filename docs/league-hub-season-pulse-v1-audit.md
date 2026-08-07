# League Hub / Season Pulse V1 audit

## Merged-state inspection

The branch was created from live `origin/main` at `2a5c810` (the merge of PR #1731). The current tree already contains the postgame/Weekly GM Briefing presentation (`postgameBriefing.js`, `WeeklyResultsCenter.jsx`), canonical Game Book view model and presentation helpers, weekly factual stories (`weeklyStoryPresentation.js`), Player Decision Cards, `GMDecisionCenter.jsx`, the Franchise HQ decision surfaces, and the contract decision queue merged by PR #1731. Season Pulse does not replace or alter any of those flows.

## Authoritative sources found

- **Weekly results and stories:** `weeklyStoryPresentation.js` already deterministically presents largest margin, closest finish, highest combined score, an upset only when a saved pregame win probability exists, recorded standings movement, and recorded injuries. Season Pulse reuses it rather than adding another headline engine.
- **Schedule/results:** `league.schedule.weeks[].games` is already the League screen's schedule contract. A result is accepted only when both scores are numeric. Upcoming games use the same schedule; no archive is loaded on render.
- **Standings:** `prepareStandingsView()` in `src/views/standingsView.js` is the canonical UI preparation layer. It supplies current division leaders and playoff ordering. Weekly movement remains limited to explicit before/after snapshots accepted by the existing weekly story helper.
- **Awards:** the only midseason race contract exposed to UI is `league.awardRaces.awards`, already consumed by `SeasonRecap.jsx`. V1 reads the same ordered boards and never calls `determineSeasonAwards()` or creates an award score.
- **Injuries:** active roster/league injury records use `injuryWeeksRemaining` (with existing legacy aliases). V1 requires a player name and a positive remaining duration, preserves the recorded injury label, and orders by recorded duration.
- **Injury identity correction:** league-level injury rows resolve player identity from `playerId`, then `id`, then `player.id`; `teamId` is never treated as a player identity. This preserves multiple injured players recorded on the same team while retaining roster-player support.
- **Streaks:** completed schedule results are authoritative for the active run. V1 requires at least two consecutive wins/losses and does not label a one-game result a trend.
- **Existing league destination:** `LeagueHub.jsx` is already routed by `LeagueDashboard.jsx` from the canonical `League` navigation destination. Its Overview is the least disruptive integration point.
- **Owner/hot-seat:** `coachHotSeat` is current team state used by the existing Coaching subsection. No league-wide historical pressure transition is available to Overview.

## Duplicate presentation logic identified

`weeklyLeagueRecap.js` independently derives league order, streaks, upset-like language from prior record, spotlight scores, and a playoff bubble approximation. Season Pulse delegates factual weekly headlines to `weeklyStoryPresentation.js`; `weeklyLeagueRecap.js` remains in the Overview only to preserve its existing recorded-game Spotlight/Game Book drill-down. The Results screen is unchanged. `franchiseCommandCenter.js` also has a UI-only power ranking formula, but V1 intentionally does not use or duplicate it.

## Implemented truthful categories

1. Around the League: largest margin, closest finish, highest-scoring game, authoritative-expectation upset, supplied standings movement, and meaningful recorded injury story candidates, ranked by the reused helper.
2. Trending Teams: longest established winning and losing runs, plus an undefeated team after at least two recorded games.
3. Award Watch: MVP, OPOY, DPOY, OROY, and DROY only when their existing ordered race board contains an identified leader.
4. League Health: up to three identified active injuries, ordered by recorded remaining duration.
5. Standings Context: recorded before/after movement when supplied; otherwise current division leaders from `prepareStandingsView()` with explicit current-state copy.
6. Next Week: one unplayed scheduled game, prioritized by user involvement, division membership, two above-.500 records, recorded rematch, then week and stable game key.
7. Spotlight Games: the prior League Overview drill-down remains beneath Season Pulse and continues through `openResolvedBoxScore()` into the existing Game Book callback.

Headline ranking is inherited exactly from `weeklyStoryPresentation.js`: standings lead change (110), playoff seed movement (100 + magnitude), authoritative upset (90 + probability gap), injury (80 + bounded duration), closest finish (75 - margin), largest margin (60 + margin), and highest combined score (50 + points), followed by stable story key. One story per type and subject de-duplication cap the list at five. Input order does not affect output.

## Unsupported concepts and intentional deferrals

- No comeback story: there is no authoritative comeback flag in the League view contract.
- No inferred upset from records, power ranking, or point differential.
- No clinch/elimination or playoff movement without canonical transition evidence.
- No standings riser/faller without before/after snapshots.
- No new power ranking or award formula.
- No award probability, “favorite,” runner-up, or race when `awardRaces` is absent.
- No injury “impact” score, diagnosis, starter inference, or claim that every injury is major.
- No league-wide hot-seat movement: only current state exists and the existing Coaching subsection already owns it.
- No player-performance headline because the compact schedule rows do not reliably carry canonical player stat lines.
- No separate route or mandatory postgame surface. The existing League Overview is the integration point.

## Legacy and performance notes

Unsupported sections are hidden, and a single honest fallback appears when the entire model is empty. Missing schedules, teams, awards, injuries, weeks, and partial legacy records return bounded empty arrays and omission metadata. The model is pure: it performs no mutation, persistence, worker request, archive read, or randomness. It memoizes once in `LeagueHub`, indexes teams for awards/upcoming games, bounds displayed arrays, and scans the already-present compact schedule once per derived category. No worker payload, persistence behavior, or save schema is changed.
