/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import GMDecisionCenter from '../GMDecisionCenter.jsx';

const { buildQueue } = vi.hoisted(() => ({ buildQueue: vi.fn() }));

vi.mock('../../../core/gmDecisionQueue.js', () => ({
  buildAvailabilityDecisionQueue: buildQueue,
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
      items: [item('LT', 'critical', 'Depth Chart'), item('CB', 'medium', 'Injuries')],
      diagnostics: [],
    });
    render(<GMDecisionCenter league={league} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Review Depth Chart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'Team:Roster / Depth');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'Team:Injuries');
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
