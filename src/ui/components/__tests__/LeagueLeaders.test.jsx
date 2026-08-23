/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import LeagueLeaders from '../LeagueLeaders.jsx';

describe('LeagueLeaders', () => {
  it('resolves API leader team identity from a real team id and exposes a working team filter', async () => {
    const actions = {
      getLeagueLeaders: () => Promise.resolve({
        payload: {
          categories: { passing: { passYards: [{ playerId: 42, name: 'Resolved QB', teamId: 2, value: 301 }] } },
          source: 'current_regular_season',
        },
      }),
    };
    render(<LeagueLeaders league={{ userTeamId: 1, teams: [{ id: 1, abbr: 'AAA' }, { id: 2, abbr: 'BBB' }] }} actions={actions} onPlayerSelect={() => {}} />);

    expect((await screen.findAllByText('Resolved QB')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('BBB').length).toBeGreaterThanOrEqual(2);
    const teamFilter = screen.getByRole('combobox', { name: 'Filter leaders by team' });
    expect(screen.getByRole('option', { name: 'BBB' })).toBeTruthy();
    fireEvent.change(teamFilter, { target: { value: 'BBB' } });
    expect(screen.getAllByText('Resolved QB').length).toBeGreaterThan(0);
    fireEvent.change(teamFilter, { target: { value: 'ALL' } });
  });

  it('renders player names as compact entity-style links', () => {
    const { container } = renderLeagueLeaders({
      schedule: { weeks: [{ week: 1, games: [{ played: true, homeId: 1, awayId: 2, playerStats: { home: { 10: { name: 'Row Link QB', pos: 'QB', stats: { passYd: 100 } } }, away: {} } }] }] },
    });
    expect(container.querySelector('.league-leaders-filters')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Open player profile for Row Link QB' }).every((button) => button.classList.contains('league-leaders-player-link'))).toBe(true);
    expect(container.querySelector('.app-mobile-data-row__metrics')?.textContent).toContain('Pass Yds');
    expect(container.querySelector('.app-desktop-data-table table')).toBeTruthy();
    fireEvent.change(container.querySelector('[aria-label="Sort league leaders"]'), { target: { value: 'name:asc' } });
  });

  it('renders non-zero leaders from completed-game stats when API categories are missing', () => {
    const league = {
      userTeamId: 1,
      teams: [
        {
          id: 1,
          name: 'AAA',
          abbr: 'AAA',
          roster: [],
        },
        {
          id: 2,
          name: 'BBB',
          abbr: 'BBB',
          roster: [],
        },
      ],
      schedule: {
        weeks: [
          {
            week: 1,
            games: [
              {
                played: true,
                homeId: 1,
                awayId: 2,
                homeScore: 28,
                awayScore: 14,
                playerStats: {
                  home: {
                    101: {
                      name: 'QB Leader',
                      pos: 'QB',
                      stats: { passYd: 320, passTD: 3, passComp: 24, passAtt: 33 },
                    },
                  },
                  away: {},
                },
              },
            ],
          },
        ],
      },
    };

    const actions = {
      getLeagueLeaders: () => Promise.resolve({ payload: { categories: null, source: null, phase: null } }),
    };

    render(
      <LeagueLeaders
        league={league}
        actions={actions}
        onPlayerSelect={() => {}}
        onNavigate={() => {}}
      />,
    );

    // Wait for initial render using a simple presence check; the top leader should be our QB
    expect(screen.getAllByText('QB Leader').length).toBeGreaterThan(0);
  });
});

// ── Advanced Tab ──────────────────────────────────────────────────────────────

const BASE_ACTIONS = {
  getLeagueLeaders: () => Promise.resolve({ payload: { categories: null, source: null, phase: null } }),
};

const BASE_LEAGUE = {
  userTeamId: 1,
  teams: [
    { id: 1, abbr: 'AAA', roster: [] },
    { id: 2, abbr: 'BBB', roster: [] },
  ],
};

function renderLeagueLeaders(leagueOverrides = {}, onPlayerSelect = () => {}, onNavigate = () => {}) {
  const league = { ...BASE_LEAGUE, ...leagueOverrides };
  return render(
    <LeagueLeaders
      league={league}
      actions={BASE_ACTIONS}
      onPlayerSelect={onPlayerSelect}
      onNavigate={onNavigate}
    />,
  );
}

describe('LeagueLeaders — responsive empty states', () => {
  afterEach(cleanup);

  it('keeps truthful mobile and desktop empty states with the existing navigation action', () => {
    const onNavigate = vi.fn();
    const { container } = renderLeagueLeaders({}, () => {}, onNavigate);
    const mobile = container.querySelector('.app-mobile-data-list');
    const desktop = container.querySelector('.app-desktop-data-table');

    expect(mobile.textContent).toContain('No league leaders yet');
    expect(mobile.textContent).toContain('No players have logged enough stats this season.');
    expect(desktop.textContent).toContain('No league leaders yet');
    expect(mobile.textContent).not.toMatch(/fake|0 yards/i);
    fireEvent.click(mobile.querySelector('button'));
    expect(onNavigate).toHaveBeenCalledWith('League');
  });

  it('explains a zero-result filter and resets it from the mobile empty state', () => {
    const { container } = renderLeagueLeaders({
      schedule: { weeks: [{ week: 1, games: [{ played: true, homeId: 1, awayId: 2, playerStats: { home: { 10: { name: 'Actual QB', pos: 'QB', stats: { passYd: 100 } } }, away: {} } }] }] },
    });
    const mobile = container.querySelector('.app-mobile-data-list');

    fireEvent.change(container.querySelector('[aria-label="Search league leaders"]'), { target: { value: 'no such player' } });
    expect(mobile.textContent).toContain('No matching league leaders');
    expect(mobile.textContent).toContain('No players match the active leader filters.');
    expect(container.querySelector('.app-desktop-data-table').textContent).toContain('No matching league leaders');
    fireEvent.click(Array.from(mobile.querySelectorAll('button')).find((button) => button.textContent === 'Reset filters'));
    expect(mobile.textContent).toContain('Actual QB');
    expect(mobile.textContent).not.toContain('No matching league leaders');
  });
});

describe('LeagueLeaders — Advanced tab', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it('renders the Advanced tab button', () => {
    renderLeagueLeaders();
    expect(screen.getByRole('tab', { name: 'Advanced' })).toBeTruthy();
  });

  it('shows the empty state when no archive data exists', () => {
    renderLeagueLeaders({ playerSeasonStatsArchive: {} });
    fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    expect(screen.getByText(/Advanced leaderboards populate after rich games are simulated/i)).toBeTruthy();
  });

  it('shows the empty state when archive is missing entirely', () => {
    renderLeagueLeaders({ playerSeasonStatsArchive: undefined });
    fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    expect(screen.getByText(/Advanced leaderboards populate after rich games are simulated/i)).toBeTruthy();
  });

  it('renders a leaderboard row for a player with targets data', () => {
    const league = {
      ...BASE_LEAGUE,
      teams: [
        {
          id: 1,
          abbr: 'AAA',
          roster: [{ id: 10, name: 'Top Target', pos: 'WR', teamId: 1 }],
        },
        { id: 2, abbr: 'BBB', roster: [] },
      ],
      playerSeasonStatsArchive: {
        '10': { 2031: { targets: 42 } },
      },
    };
    renderLeagueLeaders(league);
    fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    expect(screen.getByText('Top Target')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('switches metric when a chip is clicked', () => {
    const league = {
      ...BASE_LEAGUE,
      teams: [
        {
          id: 1,
          abbr: 'AAA',
          roster: [{ id: 10, name: 'Sack Leader', pos: 'DE', teamId: 1 }],
        },
      ],
      playerSeasonStatsArchive: {
        '10': { 2031: { sacksMade: 9 } },
      },
    };
    renderLeagueLeaders(league);
    fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    // Click the "Sacks Made" chip
    fireEvent.click(screen.getByRole('radio', { name: 'Sacks Made' }));
    expect(screen.getByText('Sack Leader')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
  });

  it('calls onPlayerSelect with player object when a name is clicked', () => {
    const onPlayerSelect = vi.fn();
    const league = {
      ...BASE_LEAGUE,
      teams: [
        {
          id: 1,
          abbr: 'AAA',
          roster: [{ id: 10, name: 'Clickable Player', pos: 'WR', teamId: 1 }],
        },
      ],
      playerSeasonStatsArchive: {
        '10': { 2031: { targets: 5 } },
      },
    };
    render(
      <LeagueLeaders
        league={league}
        actions={BASE_ACTIONS}
        onPlayerSelect={onPlayerSelect}
        onNavigate={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    fireEvent.click(screen.getByText('Clickable Player'));
    expect(onPlayerSelect).toHaveBeenCalledTimes(1);
    const arg = onPlayerSelect.mock.calls[0][0];
    expect(arg.id).toBe('10');
    expect(arg.name).toBe('Clickable Player');
  });

  it('renders the table with overflow-x-auto wrapper (mobile-safe)', () => {
    const league = {
      ...BASE_LEAGUE,
      teams: [
        {
          id: 1,
          abbr: 'AAA',
          roster: [{ id: 10, name: 'Mobile Player', pos: 'TE', teamId: 1 }],
        },
      ],
      playerSeasonStatsArchive: {
        '10': { 2031: { targets: 3 } },
      },
    };
    const { container } = renderLeagueLeaders(league);
    fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    // The table-wrapper div uses overflowX: 'auto'
    const wrapper = container.querySelector('.table-wrapper');
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.overflowX).toBe('auto');
  });

  it('shows the correct aria-label on the leaders table', () => {
    const league = {
      ...BASE_LEAGUE,
      teams: [
        {
          id: 1,
          abbr: 'AAA',
          roster: [{ id: 7, name: 'Aria Player', pos: 'CB', teamId: 1 }],
        },
      ],
      playerSeasonStatsArchive: {
        '7': { 2031: { targets: 11 } },
      },
    };
    renderLeagueLeaders(league);
    fireEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    // Default metric is 'targets' → label should be "Targets leaders"
    expect(screen.getByRole('table', { name: /Targets leaders/i })).toBeTruthy();
  });
});
