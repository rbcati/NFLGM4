import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import LeagueHub from './LeagueHub.jsx';

const league = {
  year: 2026,
  week: 4,
  seasonId: 's4',
  teams: [
    { id: 1, abbr: 'DAL', name: 'Dallas', wins: 3, losses: 1, streak: ['W', 'W', 'W'], roster: [] },
    { id: 2, abbr: 'PHI', name: 'Philadelphia', wins: 2, losses: 2, streak: ['L', 'W'], roster: [] },
  ],
  schedule: {
    weeks: [
      {
        week: 4,
        games: [
          { id: 'g1', home: 1, away: 2, played: true, homeScore: 24, awayScore: 21 },
        ],
      },
    ],
  },
  newsItems: [
    { id: 'n1', week: 4, headline: 'Blockbuster trade shakes up playoff race.', body: 'Two contenders swapped starting talent.' },
  ],
};

describe('LeagueHub', () => {
  it('renders command-center sections with overview as default', () => {
    const html = renderToString(
      <LeagueHub
        league={league}
        actions={{ getLeagueLeaders: vi.fn().mockResolvedValue({ payload: { categories: {} } }) }}
        onPlayerSelect={vi.fn()}
        onOpenGameDetail={vi.fn()}
        renderResults={() => <div>Weekly Results Stub</div>}
        renderStandings={() => <div>Standings Stub</div>}
      />,
    );

    expect(html).toContain('League Season Pulse');
    expect(html).toContain('Overview');
    expect(html).toContain('Results');
    expect(html).toContain('Standings');
    expect(html).toContain('News');
    expect(html).toContain('Leaders');
    expect(html).toContain('Around the League');
    expect(html).not.toContain('Weekly Results Stub');
  });

  it('supports section deep links and keeps recap/spotlight owned by results section', () => {
    const html = renderToString(
      <LeagueHub
        league={league}
        initialSection="Results"
        actions={{ getLeagueLeaders: vi.fn().mockResolvedValue({ payload: { categories: {} } }) }}
        onPlayerSelect={vi.fn()}
        onOpenGameDetail={vi.fn()}
        renderResults={() => <div>Weekly League Recap · Weekly Spotlight</div>}
        renderStandings={() => <div>Standings Stub</div>}
      />,
    );

    expect(html).toContain('Weekly League Recap');
    expect(html).toContain('Weekly Spotlight');
    expect(html).not.toContain('League Pulse');
  });

  it('fails safe for legacy/partial saves without schedule or teams', () => {
    expect(() => renderToString(
      <LeagueHub
        league={{ year: 2026, week: 1, seasonId: 'legacy' }}
        actions={{ getLeagueLeaders: vi.fn().mockResolvedValue({ payload: { categories: {} } }) }}
        onPlayerSelect={vi.fn()}
        onOpenGameDetail={vi.fn()}
        renderResults={() => <div>No schedule data available for weekly results.</div>}
        renderStandings={() => <div>Standings unavailable</div>}
      />,
    )).not.toThrow();
  });

  it('hides unsupported sections instead of rendering empty containers', () => {
    const html = renderToString(<LeagueHub league={{ year: 2026, week: 1, seasonId: 'empty' }} />);
    expect(html).toContain('No league pulse is available yet');
    expect(html).not.toContain('Award Watch');
    expect(html).not.toContain('League Health');
    expect(html).not.toContain('Trending Teams');
  });

  it('renders long player names in the mobile-safe stacked row layout', () => {
    const html = renderToString(<LeagueHub league={{ ...league, teams: league.teams.map((team, index) => index ? team : { ...team, roster: [{ id: 'long', name: 'A Very Long Player Name That Must Wrap Cleanly', pos: 'QB', injuryWeeksRemaining: 6 }] }) }} />);
    expect(html).toContain('A Very Long Player Name That Must Wrap Cleanly');
    expect(html).toContain('app-row-stack');
  });
});
