import React, { useRef, useEffect } from 'react';

const EVENT_ICONS = {
  task_assigned: '📥',
  task_started: '▶️',
  blocked: '🚫',
  unblocked: '✅',
  collaboration_started: '🤝',
  task_completed: '🏁',
};

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatEventType(type) {
  return type.replace(/_/g, ' ');
}

export default function EventLog({ events }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  const sorted = [...events].sort((a, b) => a.ts - b.ts);

  return (
    <div className="event-log">
      <div className="event-log-header">Event Log</div>
      <div className="event-log-list">
        {sorted.length === 0 && <div className="event-empty">No events yet</div>}
        {sorted.map((evt) => (
          <div key={evt.id} className={`event-item event-${evt.type}`}>
            <span className="event-icon">{EVENT_ICONS[evt.type] || '📌'}</span>
            <div className="event-body">
              <div className="event-headline">
                <strong>{evt.agentName}</strong> — {formatEventType(evt.type)}
              </div>
              {evt.detail && <div className="event-detail">{evt.detail}</div>}
            </div>
            <span className="event-time">{formatTime(evt.ts)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
