// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PlayerQuickViewSheet from './PlayerQuickViewSheet.jsx';

afterEach(cleanup);

describe('PlayerQuickViewSheet', () => {
  it('shows contextual game data, dismisses, and delegates full profile navigation', () => {
    const onClose = vi.fn();
    const onViewFullProfile = vi.fn();
    const player = { id: 7, name: 'Context Player', pos: 'WR', ovr: 81, potential: 86, age: 24, teamId: 1 };
    const { getByText } = render(<PlayerQuickViewSheet playerId={7} context={{ player, statLine: { receptions: 6 } }} league={{ teams: [{ id: 1, abbr: 'CTX', roster: [player] }] }} onClose={onClose} onViewFullProfile={onViewFullProfile} />);
    expect(getByText('receptions: 6')).toBeTruthy();
    fireEvent.click(getByText('View Full Profile'));
    expect(onViewFullProfile).toHaveBeenCalledOnce();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('enriches a thin Game Book row with current roster facts without losing its game line', () => {
    const rosterPlayer = { id: 7, name: 'Roster Name', pos: 'WR', ovr: 84, potential: 89, age: 25, teamId: 1, contract: { baseAnnual: 12, yearsRemaining: 3 } };
    const contextPlayer = { playerId: 7, name: 'Archived Name', pos: 'WR', stats: { receptions: 8 } };
    const { getByText } = render(<PlayerQuickViewSheet playerId={7} context={{ player: contextPlayer, statLine: contextPlayer.stats }} league={{ teams: [{ id: 1, abbr: 'CTX', roster: [rosterPlayer] }] }} onClose={vi.fn()} onViewFullProfile={vi.fn()} />);
    expect(getByText('84 / 89')).toBeTruthy();
    expect(getByText('Age').parentElement.textContent).toContain('25');
    expect(getByText('receptions: 8')).toBeTruthy();
  });

  it('uses archived context honestly when the player is no longer rostered', () => {
    const contextPlayer = { playerId: 44, name: 'Former Player', pos: 'S', stats: { tackles: 5 } };
    const { getByText } = render(<PlayerQuickViewSheet playerId={44} context={{ player: contextPlayer, statLine: contextPlayer.stats }} league={{ teams: [] }} onClose={vi.fn()} onViewFullProfile={vi.fn()} />);
    expect(getByText('Former Player')).toBeTruthy();
    expect(getByText('— / —')).toBeTruthy();
    expect(getByText('tackles: 5')).toBeTruthy();
  });

  it('uses non-modal dialog semantics and restores focus when dismissed', () => {
    const origin = document.createElement('button');
    document.body.appendChild(origin);
    origin.focus();
    const { getByRole, unmount } = render(<PlayerQuickViewSheet playerId={1} context={{ player: { playerId: 1, name: 'Player' } }} league={{ teams: [] }} onClose={vi.fn()} onViewFullProfile={vi.fn()} />);
    expect(getByRole('dialog').hasAttribute('aria-modal')).toBe(false);
    unmount();
    expect(document.activeElement).toBe(origin);
    origin.remove();
  });
});
