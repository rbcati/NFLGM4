// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../TeamHub.jsx', () => ({
  default: ({ onPlayerSelect }) => <button onClick={() => onPlayerSelect(91)}>Open test player</button>,
}));
vi.mock('../DragAndDropDepthChart.jsx', () => ({ default: () => <h2>Depth Chart</h2> }));
vi.mock('../ContractCenter.jsx', () => ({ default: () => <h2>Contracts</h2> }));
import LeagueDashboard from '../LeagueDashboard.jsx';

const rosterPlayer = {
  id: 91, name: 'Navigation Quarterback', pos: 'QB', age: 26, ovr: 82, potential: 84,
  teamId: 1, status: 'active', depthChart: { rowKey: 'QB', order: 1, role: 'starter' },
  contract: { yearsRemaining: 1, baseAnnual: 12 }, ratings: { awareness: 80, throwPower: 82, throwAccuracy: 80 },
};

const team = { id: 1, name: 'Portland Pioneers', abbr: 'POR', roster: [rosterPlayer], capRoom: 30, wins: 0, losses: 0 };
const league = {
  year: 2026, seasonId: 's1', week: 1, phase: 'preseason', userTeamId: 1,
  teams: [team], players: [rosterPlayer], schedule: { weeks: [] }, incomingTradeOffers: [],
};
const actions = {
  getRoster: vi.fn(async () => ({ payload: { team, players: [rosterPlayer] } })),
  getPlayerCareer: vi.fn(async () => null),
  getAllSeasons: vi.fn(async () => ({ payload: { seasons: [] } })),
  getPlayerDraftContext: vi.fn(async () => ({ payload: { context: { known: false } } })),
  getRecords: vi.fn(async () => ({ payload: { recordBook: null } })),
  getTransactions: vi.fn(async () => ({ payload: { transactions: [] } })),
};

describe('LeagueDashboard Player Profile workflow navigation', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    global.IntersectionObserver = vi.fn(function () { return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }; });
  });
  afterEach(() => cleanup());

  it.each([
    ['Open depth chart', 'Depth Chart'],
    ['Open contracts', 'Contracts'],
  ])('closes the profile before opening %s', async (actionLabel, destinationHeading) => {
    render(<LeagueDashboard league={league} actions={actions} busy={false} simulating={false} onAdvanceWeek={vi.fn()} />);
    fireEvent.click(screen.getByTestId('nav-team'));
    fireEvent.click(screen.getByTestId('section-tab-team'));
    fireEvent.click(screen.getByRole('button', { name: 'Open test player' }));
    const profile = await screen.findByTestId('player-profile');
    const decisionCard = await within(profile).findByTestId('player-decision-card');
    fireEvent.click(within(decisionCard).getByRole('button', { name: actionLabel }));
    await waitFor(() => expect(screen.queryByTestId('player-profile')).toBeNull());
    expect(screen.getAllByText(destinationHeading).length).toBeGreaterThan(0);
  });
});
