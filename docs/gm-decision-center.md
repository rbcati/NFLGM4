# GM Decision Center V2

Availability is the first visible decision category because an unavailable player can immediately compromise the next game's depth chart. It is already supported by recorded roster, injury, role, and replacement context, so the HQ can surface an honest weekly action without inventing a new gameplay mechanic.

The Decision Center remains presentation-only. It now reads the combined availability and contract queue in its returned order, shows at most three total entries, and sends review actions through existing Franchise HQ navigation. Availability reviews retain their Depth Chart/Injuries behavior; contract reviews open the existing Contract Center. It does not persist, dismiss, re-rank, or modify queue items, roster state, simulation state, or saves.

Future queue expansion may add **Roster Depth**, **Trade Deadline**, **Opponent Prep**, **Cap Pressure**, and **Development**. The disabled **View All** control reserves a clear affordance for that expansion without creating a destination or navigation workflow in V2.
