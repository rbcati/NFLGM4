# GM Decision Center V1

Availability is the first visible decision category because an unavailable player can immediately compromise the next game's depth chart. It is already supported by recorded roster, injury, role, and replacement context, so the HQ can surface an honest weekly action without inventing a new gameplay mechanic.

The Decision Center remains presentation-only. It reads the existing availability queue in its returned order, shows at most three entries, and sends review actions through existing Franchise HQ navigation. It does not persist, dismiss, re-rank, or modify queue items, roster state, simulation state, or saves.

Future queue expansion may add **Contracts**, **Roster Depth**, **Trade Deadline**, **Opponent Prep**, **Cap Pressure**, and **Development**. The disabled **View All** control reserves a clear affordance for that expansion without creating a destination or navigation workflow in V1.
