// apps/web/src/features/kanban/BoardViewers.tsx
// Displays avatar row of users currently viewing the board.
// State: none (receives viewers as prop)

import React from 'react';
import type { UserPresence } from '../../hooks/useProjectSocket';

interface Props {
  viewers: UserPresence[];
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export const BoardViewers: React.FC<Props> = ({ viewers }) => {
  if (viewers.length === 0) return null;

  return (
    <div className="board-viewers">
      {viewers.map((v) => (
        <div key={v.userId} className="board-viewer" title={v.fullName}>
            {v.avatarUrl ? (
              <img src={v.avatarUrl} alt={v.fullName} />
            ) : (
              <span>{getInitials(v.fullName)}</span>
            )}
          <div className="board-viewer-dot" />
        </div>
      ))}
      <span className="board-viewers-label">
        {viewers.length} viewing
      </span>
    </div>
  );
};
