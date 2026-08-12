import React from 'react';
import { buildCompletedGamePresentation, openResolvedBoxScore } from '../utils/boxScoreAccess.js';
import { hasValidPlayerProfileId, openPlayerProfile } from '../utils/playerProfileNavigation.js';

export function hasValidTeamId(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  if (normalized === '') return false;
  if ([
    'NaN',
    'undefined',
    'null',
    '__missing_player__',
    '__missing_team__',
  ].includes(normalized)) return false;
  return /^\d+$/.test(normalized);
}

function EntityButton({ actionable, children, ariaLabel, onClick, className = '' }) {
  if (!actionable) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      className={`app-entity-link ${className}`.trim()}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PlayerEntityLink({ playerId, children, onPlayerSelect, context = {}, ariaLabel, className }) {
  const actionable = hasValidPlayerProfileId(playerId) && typeof onPlayerSelect === 'function';
  return <EntityButton actionable={actionable} ariaLabel={ariaLabel} className={className} onClick={() => openPlayerProfile(playerId, onPlayerSelect, context)}>{children}</EntityButton>;
}

export function TeamEntityLink({ teamId, children, onTeamSelect, ariaLabel, className }) {
  const actionable = hasValidTeamId(teamId) && typeof onTeamSelect === 'function';
  return <EntityButton actionable={actionable} ariaLabel={ariaLabel} className={className} onClick={() => onTeamSelect(teamId)}>{children}</EntityButton>;
}

export function GameEntityLink({ game, context = {}, children, unavailableChildren = children, onGameSelect, ariaLabel, className }) {
  const presentation = buildCompletedGamePresentation(game, context);
  const actionable = presentation.canOpen && presentation.archiveQuality !== 'score'
    && presentation.archiveQuality !== 'missing' && typeof onGameSelect === 'function';
  if (!actionable) return <span>{unavailableChildren}</span>;
  return <EntityButton actionable ariaLabel={ariaLabel} className={className} onClick={() => openResolvedBoxScore(game, context, onGameSelect)}>{children}</EntityButton>;
}
