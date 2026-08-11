// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEntityLink, PlayerEntityLink, TeamEntityLink } from '../EntityLink.jsx';

describe('entity drill-down links', () => {
  afterEach(cleanup);
  it('opens a valid player through the canonical callback and labels ambiguous text', () => {
    const onPlayerSelect = vi.fn();
    render(<PlayerEntityLink playerId={12} onPlayerSelect={onPlayerSelect} ariaLabel="Open player profile: QB1">QB1</PlayerEntityLink>);
    fireEvent.click(screen.getByRole('button', { name: 'Open player profile: QB1' }));
    expect(onPlayerSelect).toHaveBeenCalledWith(12, expect.objectContaining({ source: 'unknown' }));
  });

  it('renders missing player identity as plain text', () => {
    render(<PlayerEntityLink playerId={null} onPlayerSelect={vi.fn()}>Unknown player</PlayerEntityLink>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Unknown player')).toBeTruthy();
  });

  it('opens a valid team and leaves invalid team identity inert', () => {
    const onTeamSelect = vi.fn();
    const { rerender } = render(<TeamEntityLink teamId="7" onTeamSelect={onTeamSelect}>SEA</TeamEntityLink>);
    fireEvent.click(screen.getByRole('button', { name: 'SEA' }));
    expect(onTeamSelect).toHaveBeenCalledWith('7');
    rerender(<TeamEntityLink teamId="__missing_team__" onTeamSelect={onTeamSelect}>TBD</TeamEntityLink>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens a resolvable detailed game but not a score-only archive', () => {
    const onGameSelect = vi.fn();
    const detailed = { gameId: '2026_w2_1_2', homeId: 1, awayId: 2, homeScore: 24, awayScore: 17, driveSummary: [{ result: 'TD' }] };
    const { rerender } = render(<GameEntityLink game={detailed} context={{ seasonId: '2026', week: 2 }} onGameSelect={onGameSelect}>24–17</GameEntityLink>);
    fireEvent.click(screen.getByRole('button', { name: '24–17' }));
    expect(onGameSelect).toHaveBeenCalledWith('2026_w2_1_2');
    rerender(<GameEntityLink game={{ ...detailed, driveSummary: undefined }} context={{ seasonId: '2026', week: 2 }} onGameSelect={onGameSelect}>24–17</GameEntityLink>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
