import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it } from 'vitest';
import { Games, Meta, Teams } from '../../db/index.js';
import { dispatchWorker, loadWorkerModule } from '../../testSupport/dynastySoakRunner.js';
import { toWorker, toUI } from '../protocol.js';

const teamSnapshot = (team) => {
  return {
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    ptsFor: team.ptsFor,
    ptsAgainst: team.ptsAgainst,
  };
};

describe.sequential('Watch Game worker lifecycle', () => {
  afterAll(() => {
    globalThis.__dynastySoakBroadcast = null;
  });

  it('runs rich authority once and excludes the watched result from Advance Week', async () => {
    const broadcasts = [];
    globalThis.__dynastySoakBroadcast = (message) => broadcasts.push(message);
    await loadWorkerModule();
    await dispatchWorker(toWorker.INIT, {}, { timeoutMs: 30_000 });
    const boot = await dispatchWorker(toWorker.USE_SAFE_STARTER_LEAGUE, {
      slotKey: 'save_slot_1',
      options: { rngSeed: 1774, userTeamId: 0, name: 'Watch Authority Integration' },
    }, { timeoutMs: 60_000 });

    expect(boot.type).toBe(toUI.FULL_STATE);
    expect(boot.payload.settings?.useNewSimulationEngine).toBe(true);
    const week = boot.payload.week;
    const seasonId = boot.payload.seasonId;
    const scheduled = boot.payload.schedule.weeks.find((row) => row.week === week);
    const userGame = scheduled.games.find((game) => Number(game.home) === 0 || Number(game.away) === 0);
    const opponentId = Number(userGame.home) === 0 ? Number(userGame.away) : Number(userGame.home);

    const watched = await dispatchWorker(toWorker.WATCH_GAME, {}, { timeoutMs: 60_000 });
    expect(watched.type).toBe(toUI.PLAY_LOGS);
    expect(watched.payload.canonicalEvents.length).toBeGreaterThan(2);
    expect(watched.payload.canonicalEvents[0].eventId).toContain(':drive:');
    expect(watched.payload.canonicalEvents.some((event) => event.driveNumber != null && !event.isScore)).toBe(true);
    expect(watched.payload.canonicalEvents.at(-1)).toMatchObject({
      eventType: 'game_end',
      scoreAfter: expect.objectContaining({ home: expect.any(Number), away: expect.any(Number) }),
    });
    expect(watched.payload.playerStats).toEqual(expect.objectContaining({ home: expect.any(Object), away: expect.any(Object) }));
    expect(watched.payload.teamStats).toEqual(expect.objectContaining({ home: expect.any(Object), away: expect.any(Object) }));

    const gameEvent = broadcasts.find((message) => message.type === toUI.GAME_EVENT);
    expect(gameEvent?.payload?.gameId).toBeTruthy();
    const metaAfterWatch = await Meta.load();
    const played = metaAfterWatch.schedule.weeks.find((row) => row.week === week).games
      .find((game) => String(game.gameId) === String(gameEvent.payload.gameId));
    expect(played).toMatchObject({ played: true, homeScore: gameEvent.payload.homeScore, awayScore: gameEvent.payload.awayScore });

    const userAfterWatch = teamSnapshot(await Teams.load(0));
    const opponentAfterWatch = teamSnapshot(await Teams.load(opponentId));
    const archivesAfterWatch = (await Games.bySeasonWeek(seasonId, week))
      .filter((game) => String(game.id) === String(gameEvent.payload.gameId));
    expect(archivesAfterWatch).toHaveLength(1);

    const advanced = await dispatchWorker(toWorker.ADVANCE_WEEK, { skipUserGame: true }, { timeoutMs: 120_000 });
    expect(advanced.type).toBe(toUI.WEEK_COMPLETE);
    expect(advanced.payload.results.some((result) => String(result.gameId) === String(gameEvent.payload.gameId))).toBe(false);
    expect(teamSnapshot(await Teams.load(0))).toEqual(userAfterWatch);
    expect(teamSnapshot(await Teams.load(opponentId))).toEqual(opponentAfterWatch);
    const archivesAfterAdvance = (await Games.bySeasonWeek(seasonId, week))
      .filter((game) => String(game.id) === String(gameEvent.payload.gameId));
    expect(archivesAfterAdvance).toHaveLength(1);
    expect(archivesAfterAdvance[0].playerStats).toEqual(archivesAfterWatch[0].playerStats);
  }, 180_000);
});
