// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PlayerDecisionCard from '../PlayerDecisionCard.jsx';

const presentation = {
  identity: { name: 'A Very Long Player Name That Must Wrap' },
  role: { label: 'Starter', archetype: 'Field General' },
  availability: { label: 'Available' },
  performance: { available: true, metrics: [{ label: 'Passing yards', value: 1234 }] },
  development: { label: 'Rising', detail: 'Overall moved from 74 to 78.' },
  contract: { available: true, label: 'Rental / expiring', yearsRemaining: 1, capHit: 12 },
  rosterValue: { label: 'Core' },
  replacement: { label: 'Hard' },
  recommendation: { action: 'Explore extension', reasons: ['Starter role', 'Hard to replace'] },
};

describe('PlayerDecisionCard', () => {
  afterEach(() => cleanup());
  it('renders the decisive summary and routes only through existing workflow destinations', () => {
    const onNavigate = vi.fn();
    render(<div style={{ width: 375 }}><PlayerDecisionCard presentation={presentation} onNavigate={onNavigate} /></div>);
    expect(screen.getByTestId('player-decision-card').textContent).toContain('Explore extension');
    expect(screen.getByTestId('player-decision-performance').textContent).toContain('1,234'.replace(',', ''));
    fireEvent.click(screen.getByRole('button', { name: 'Open depth chart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trade workspace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Contract center' }));
    expect(onNavigate.mock.calls).toEqual([['Depth Chart'], ['Trade Center'], ['Contract Center']]);
  });

  it('omits unavailable optional sections', () => {
    render(<PlayerDecisionCard presentation={{ ...presentation, performance: { available: false, metrics: [] }, contract: { available: false }, rosterValue: null, replacement: null, recommendation: null }} />);
    expect(screen.queryByTestId('player-decision-performance')).toBeNull();
    expect(screen.queryByTestId('player-decision-contract')).toBeNull();
    expect(screen.queryByTestId('player-decision-recommendation')).toBeNull();
  });
});
