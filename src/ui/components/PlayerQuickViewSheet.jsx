import React, { useEffect, useRef } from 'react';
import { derivePlayerContractFinancials, formatContractMoney } from '../utils/contractFormatting.js';

export default function PlayerQuickViewSheet({ playerId, context, league, onClose, onViewFullProfile }) {
  const closeRef = useRef(null);
  const player = context?.player ?? (league?.teams ?? []).flatMap((team) => team?.roster ?? []).find((row) => String(row?.id) === String(playerId));
  const team = (league?.teams ?? []).find((row) => String(row?.id) === String(player?.teamId));
  const contract = derivePlayerContractFinancials(player ?? {});

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="player-quick-view-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()} data-testid="player-quick-view-backdrop">
    <aside className="player-quick-view" role="dialog" aria-modal="true" aria-labelledby="player-quick-view-title" data-testid="player-quick-view">
      <button ref={closeRef} type="button" className="player-quick-view__close" onClick={onClose} aria-label="Close player quick view">✕</button>
      <p className="player-quick-view__eyebrow">Player Snapshot</p>
      <h2 id="player-quick-view-title">{player?.name ?? `Player #${playerId}`}</h2>
      <p>{player?.pos ?? '—'} · {team?.abbr ?? team?.name ?? 'Team unavailable'}</p>
      <dl className="player-quick-view__facts">
        <div><dt>OVR / POT</dt><dd>{player?.ovr ?? '—'} / {player?.potential ?? player?.pot ?? '—'}</dd></div>
        <div><dt>Age</dt><dd>{player?.age ?? '—'}</dd></div>
        <div><dt>Readiness</dt><dd>{player?.injury || player?.injuredWeeks > 0 ? (player?.injury?.status ?? 'Unavailable') : 'Ready'}</dd></div>
        <div><dt>Contract</dt><dd>{contract.annualSalary != null ? `${formatContractMoney(contract.annualSalary)} / yr` : 'Not recorded'}</dd></div>
      </dl>
      {context?.statLine ? <div className="player-quick-view__statline"><strong>Game line</strong>{Object.entries(context.statLine).filter(([, value]) => Number(value) > 0).slice(0, 6).map(([key, value]) => <span key={key}>{key}: {value}</span>)}</div> : null}
      <button type="button" className="btn btn-primary" onClick={onViewFullProfile}>View Full Profile</button>
    </aside>
  </div>;
}
