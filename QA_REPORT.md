Daily Regression Report

What was tested:
- 1. Playability Smoke Test (Fresh start, play week, verify no crashes/freezes)
- 2. Strategy Persistence & High Stakes
- 2b. Mobile UI Scrolling Check
- 3. Contracts & Cap Trust
- 4. Replay Exploit Prevention

What broke:
- The "Advance Week" button was unexpectedly disabled when simulating tests with unresolved prep items, blocking the playability smoke test and stopping progression in FranchiseHQ.

What was fixed:
- Adjusted `buildCommandCenterSummary` to accurately distinguish between danger items (blockers) and warning items instead of broadly locking the advance button on any open items (by checking `criticalCount`). Updated `FranchiseHQ.jsx` to disable the advance button based on `hasDanger` instead of `criticalCount`. The CTA title logic was also updated to check `hasDanger`.

One small improvement:
- Enhanced the "Advance Week" user experience to let users bypass non-blocker prep warnings, reducing friction and restoring the ability to intentionally "advance anyway".
