// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DragAndDropDepthChart from './DragAndDropDepthChart.jsx';
import { aggregateTeamUnitsFromRoster } from '../../core/sim/weekSimulationBridge.ts';

const offense = ['QB', 'RB', 'WR', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 'WR'];
const defense = ['EDGE', 'IDL', 'IDL', 'LB', 'LB', 'CB', 'CB', 'S', 'S', 'EDGE', 'LB'];
const roster = [...offense.map((rowKey, index) => ({ id: index + 1, name: `O ${index}`, pos: rowKey === 'EDGE' ? 'DE' : rowKey, ovr: 80 - index, teamId: 1, depthChart: { rowKey, order: index + 1 } })),
  ...defense.map((rowKey, index) => ({ id: index + 101, name: `D ${index}`, pos: rowKey === 'EDGE' ? 'DE' : rowKey === 'IDL' ? 'DT' : rowKey, ovr: 80 - index, teamId: 1, depthChart: { rowKey, order: index + 1 } })),
  { id: 300, name: 'Pure K', pos: 'K', ovr: 90, teamId: 1, depthChart: { rowKey: 'K', order: 1 } },
  { id: 301, name: 'Pure P', pos: 'P', ovr: 90, teamId: 1, depthChart: { rowKey: 'P', order: 1 } }];
const league = { userTeamId: 1, teams: [{ id: 1, name: 'Test', roster }] };

afterEach(cleanup);

describe('canonical lineup view', () => {
  it('renders exactly the simulation authority IDs and keeps rooms as a non-mutating editor mode', () => {
    const updateDepthChart = vi.fn();
    const { getByTestId, getByRole } = render(<DragAndDropDepthChart league={league} actions={{ updateDepthChart }} />);
    const expected = aggregateTeamUnitsFromRoster(roster, 1).selectedUnitPlayerIds.offense.map(String);
    expect([...getByTestId('canonical-lineup').querySelectorAll('[data-player-id]')].map((row) => row.dataset.playerId)).toEqual(expected);
    expect(expected).not.toContain('300');
    expect(expected).not.toContain('301');
    fireEvent.click(getByRole('tab', { name: 'Position Rooms' }));
    fireEvent.click(getByRole('tab', { name: 'Lineup' }));
    expect(updateDepthChart).not.toHaveBeenCalled();
  });

  it('reports an honest partial selection', () => {
    const partial = roster.slice(0, 4);
    const { getByText } = render(<DragAndDropDepthChart league={{ userTeamId: 1, teams: [{ id: 1, roster: partial }] }} actions={{}} />);
    expect(getByText('OFFENSE — 4 eligible')).toBeTruthy();
  });
});
