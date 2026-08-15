/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import GMDecisionCenter from '../GMDecisionCenter.jsx';

const { buildQueue } = vi.hoisted(() => ({ buildQueue: vi.fn() }));

vi.mock('../../../core/gmDecisionQueue.js', () => ({
  buildGMDecisionQueue: buildQueue,
}));

const league = Object.freeze({
  userTeamId: 10,
  teams: Object.freeze([Object.freeze({ id: 10, roster: Object.freeze([]) })]),
});

function item(id, severity, view = 'Injuries') {
  return Object.freeze({
    id,
    severity,
    title: `${id} depth requires review`,
    reasons: Object.freeze([`${severity} reason`]),
    primaryReason: `${severity} primary reason`,
    destination: Object.freeze({ view }),
  });
}

describe('GMDecisionCenter', () => {
  beforeEach(() => {
    buildQueue.mockReset();
  });

  afterEach(cleanup);

  it('renders a maximum of three items in stable queue order without mutation', () => {
    const items = Object.freeze([
      item('third', 'medium'),
      item('first', 'critical', 'Depth Chart'),
      item('second', 'high'),
      item('hidden', 'critical'),
    ]);
    buildQueue.mockReturnValue(Object.freeze({ items, diagnostics: Object.freeze([]) }));

    render(<GMDecisionCenter league={league} onNavigate={vi.fn()} />);

    const rows = screen.getAllByTestId('gm-decision-item');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => within(row).getByText(/depth requires review/).textContent)).toEqual([
      'third depth requires review',
      'first depth requires review',
      'second depth requires review',
    ]);
    expect(items).toHaveLength(4);
    expect(items[0].id).toBe('third');
  });

  it('renders nothing when the queue is empty', () => {
    buildQueue.mockReturnValue({ items: [], diagnostics: [] });
    const { container } = render(<GMDecisionCenter league={league} />);
    expect(container.innerHTML).toBe('');
  });

  it('announces critical, high, and medium severities with visible labels', () => {
    buildQueue.mockReturnValue({
      items: [item('LT', 'critical'), item('QB', 'high'), item('CB', 'medium')],
      diagnostics: [],
    });
    render(<GMDecisionCenter league={league} />);

    expect(screen.getByLabelText('Critical severity').textContent).toContain('Critical');
    expect(screen.getByLabelText('High severity').textContent).toContain('High');
    expect(screen.getByLabelText('Medium severity').textContent).toContain('Medium');
  });

  it('uses destination-specific labels and fires the existing navigation callback', () => {
    const onNavigate = vi.fn();
    buildQueue.mockReturnValue({
      items: [item('LT', 'critical', 'Depth Chart'), item('CB', 'medium', 'Injuries'), item('QB', 'high', 'Contract Center')],
      diagnostics: [],
    });
    render(<GMDecisionCenter league={league} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Review Depth Chart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review Re-Sign' }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'Team:Roster / Depth');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'Team:Injuries');
    expect(onNavigate).toHaveBeenNthCalledWith(3, 'Contract Center');
  });

  it('renders one compact roster constraint and uses existing roster navigation', () => {
    const onNavigate = vi.fn();
    buildQueue.mockReturnValue({
      items: [{ ...item('roster_cutdown:10', 'critical', 'Roster'), title: 'Roster cutdown required', primaryReason: '4 roster moves required', rosterConstraint: { currentCount: 57, limit: 53, requiredMoves: 4 } }],
      diagnostics: [],
    });
    render(<GMDecisionCenter league={league} onNavigate={onNavigate} />);
    expect(screen.getAllByTestId('gm-decision-item')).toHaveLength(1);
    expect(screen.getByText('57 / 53')).toBeTruthy();
    expect(screen.getByText('• 4 roster moves required')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Review Roster' }));
    expect(onNavigate).toHaveBeenCalledWith('Team:Roster');
  });

  it('renders primaryReason rather than relying on the final reasons element', () => {
    buildQueue.mockReturnValue({
      items: [Object.freeze({
        ...item('QB', 'high', 'Contract Center'),
        reasons: Object.freeze(['first reason', 'stale final reason']),
        primaryReason: 'Contract expires after this season',
      })],
      diagnostics: [],
    });
    render(<GMDecisionCenter league={league} />);
    expect(screen.getByText('• Contract expires after this season')).toBeTruthy();
    expect(screen.queryByText('• stale final reason')).toBeNull();
  });

  it('keeps long mixed-category content structurally constrained', () => {
    buildQueue.mockReturnValue({
      items: [Object.freeze({
        ...item('very-long-contract-player', 'high', 'Contract Center'),
        title: 'Expiring quarterback contract with a deliberately long narrow-mobile title that must remain inside the card',
        primaryReason: 'Contract expires after this season with a deliberately long factual explanation for a narrow mobile viewport',
      })],
      diagnostics: [],
    });
    const { container } = render(<GMDecisionCenter league={league} />);
    expect(container.querySelector('[data-testid="gm-decision-item"]')).toBeTruthy();
    expect(screen.getByText(/Contract expires after this season/).style.overflowWrap).toBe('anywhere');
  });

  it('builds the queue once when rerendered with unchanged inputs', () => {
    buildQueue.mockReturnValue({ items: [item('QB', 'high')], diagnostics: [] });
    const { rerender } = render(<GMDecisionCenter league={league} />);
    rerender(<GMDecisionCenter league={league} />);
    expect(buildQueue).toHaveBeenCalledTimes(1);
  });

  it('keeps View All disabled until an expanded queue destination exists', () => {
    buildQueue.mockReturnValue({ items: [item('QB', 'high')], diagnostics: [] });
    render(<GMDecisionCenter league={league} />);
    expect(screen.getByRole('button', { name: 'View All' }).disabled).toBe(true);
  });
});
