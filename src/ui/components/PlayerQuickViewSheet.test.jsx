// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlayerQuickViewSheet from './PlayerQuickViewSheet.jsx';

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
});
