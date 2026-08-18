import { describe, it, expect } from 'vitest';
import { autoBuildDepthChart, applyDepthChartToPlayers, depthWarnings, getCanonicalScrimmageAssignment, getScrimmageDepthAssignment } from '../depthChart.js';

describe('depth chart auto population', () => {
  it('accepts only eligible non-special row identity as scrimmage authority', () => {
    expect(getScrimmageDepthAssignment({ pos: 'WR', depthChart: { rowKey: 'WR', order: 1 } }, 'OFFENSE')).toEqual({ rowKey: 'WR', order: 1 });
    expect(getScrimmageDepthAssignment({ pos: 'WR', secondaryPositions: ['RB'], depthChart: { rowKey: 'RB', order: 1 } }, 'OFFENSE')).toEqual({ rowKey: 'RB', order: 1 });
    expect(getScrimmageDepthAssignment({ pos: 'CB', positions: ['CB', 'S'], depthChart: { rowKey: 'S', order: 1 } }, 'DEFENSE')).toEqual({ rowKey: 'S', order: 1 });
    expect(getScrimmageDepthAssignment({ pos: 'WR', depthChart: { rowKey: 'RS', order: 1 } }, 'OFFENSE')).toBeNull();
    expect(getScrimmageDepthAssignment({ pos: 'WR', depthChart: { rowKey: 'QB', order: 1 } }, 'OFFENSE')).toBeNull();
    expect(getScrimmageDepthAssignment({ pos: 'WR', depthOrder: 1 }, 'OFFENSE')).toBeNull();
    const qbAssignment = { pos: 'WR', secondaryPositions: ['QB'], depthChart: { rowKey: 'QB', order: 1 } };
    expect(getCanonicalScrimmageAssignment(qbAssignment)).toEqual({ rowKey: 'QB', order: 1 });
    expect(getScrimmageDepthAssignment(qbAssignment, 'DEFENSE')).toBeNull();
  });
  it('assigns eligible players into position rooms and preserves manual order', () => {
    const players = [
      { id: 1, pos: 'QB', ovr: 88, teamId: 1, status: 'active' },
      { id: 2, pos: 'QB', ovr: 75, teamId: 1, status: 'active' },
      { id: 3, pos: 'WR', ovr: 82, teamId: 1, status: 'active' },
      { id: 4, pos: 'WR', ovr: 70, teamId: 1, status: 'active' },
      { id: 5, pos: 'K', ovr: 69, teamId: 1, status: 'active' },
    ];
    const assignments = autoBuildDepthChart(players, { QB: [2, 1] });
    expect(assignments.QB[0]).toBe(2);
    expect(assignments.WR.length).toBe(2);

    const withDepth = applyDepthChartToPlayers(players, assignments);
    const qb2 = withDepth.find((p) => p.id === 2);
    expect(qb2.depthChart.rowKey).toBe('QB');
    expect(qb2.depthChart.order).toBe(1);
  });



  it('flags severe and moderate out-of-position depth assignments', () => {
    const players = [
      { id: 1, name: 'Arm Punt', pos: 'QB', ovr: 80, teamId: 1, status: 'active' },
      { id: 2, name: 'Coverage Ace', pos: 'CB', ovr: 82, teamId: 1, status: 'active' },
      { id: 3, name: 'Free Safety', pos: 'S', ovr: 79, teamId: 1, status: 'active' },
    ];
    const warnings = depthWarnings({ OL: [1], S: [2], CB: [3] }, players);
    expect(warnings.some((w) => w.message.includes('severe out-of-position'))).toBe(true);
    expect(warnings.some((w) => w.message.includes('moderate role fit penalty'))).toBe(true);
  });

  it('emits warnings for thin groups', () => {
    const players = [{ id: 10, pos: 'QB', ovr: 80, teamId: 1, status: 'active' }];
    const assignments = autoBuildDepthChart(players, {});
    const warnings = depthWarnings(assignments, players);
    expect(warnings.some((w) => w.rowKey === 'RB')).toBe(true);
  });
});
