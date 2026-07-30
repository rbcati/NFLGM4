import { describe, it, expect } from 'vitest';
import { isFreeAgent, isSignableFreeAgent } from '../membership.js';

describe('isFreeAgent — canonical free-agency membership predicate', () => {
  it('treats a null/undefined teamId as a free agent', () => {
    expect(isFreeAgent({ teamId: null })).toBe(true);
    expect(isFreeAgent({ teamId: undefined })).toBe(true);
    expect(isFreeAgent({})).toBe(true);
  });

  it('treats the legacy "FA" sentinel teamId as a free agent', () => {
    expect(isFreeAgent({ teamId: 'FA' })).toBe(true);
  });

  it('treats an explicit free_agent status as a free agent even with a stale teamId', () => {
    expect(isFreeAgent({ teamId: 7, status: 'free_agent' })).toBe(true);
  });

  it('REGRESSION: team 0 (the user team) is NOT a free agent', () => {
    // The historical `!player.teamId` shortcut is truthy for teamId 0, which
    // misclassified the entire user roster as free agents and let AI teams sign
    // them away during the offseason (post-rollover collapse to ~11 players).
    expect(isFreeAgent({ teamId: 0, status: 'active' })).toBe(false);
    expect(isFreeAgent({ teamId: 0 })).toBe(false);
    expect(isFreeAgent({ teamId: '0', status: 'active' })).toBe(false);
  });

  it('treats any real numbered team as rostered, not a free agent', () => {
    for (const teamId of [0, 1, 15, 31]) {
      expect(isFreeAgent({ teamId, status: 'active' })).toBe(false);
    }
  });

  it('is null-safe', () => {
    expect(isFreeAgent(null)).toBe(false);
    expect(isFreeAgent(undefined)).toBe(false);
  });
});

describe('isSignableFreeAgent — production signing authority', () => {
  it('accepts current and legacy free-agent rows', () => {
    expect(isSignableFreeAgent({ teamId: null, status: 'free_agent' })).toBe(true);
    expect(isSignableFreeAgent({ teamId: null, status: 'unsigned' })).toBe(true);
    expect(isSignableFreeAgent({ teamId: 'FA' })).toBe(true);
  });

  it.each(['retired', 'draft_eligible', 'draft_pool', 'deleted', 'removed'])(
    'rejects null-team %s rows',
    (status) => expect(isSignableFreeAgent({ teamId: null, status })).toBe(false),
  );

  it('rejects retired flags, inconsistent active rows, and team zero players', () => {
    expect(isSignableFreeAgent({ teamId: null, status: 'free_agent', retired: true })).toBe(false);
    expect(isSignableFreeAgent({ teamId: null, status: 'active' })).toBe(false);
    expect(isSignableFreeAgent({ teamId: 0, status: 'active' })).toBe(false);
  });
});
