import React from 'react';

export default function Timeline({ events = [], activeVersionCutoff = null, notFound = false }) {
  if (notFound) {
    return (
      <div className="panel">
        <h2>Event Timeline</h2>
        <p>No shipment found with this ID. Please check the shipment ID or create a new container.</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="panel">
        <h2>Event Timeline</h2>
        <p>No events recorded for this shipment yet.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Event Timeline ({events.length} events)</h2>
      <ul className="timeline-list">
        {events.map((evt) => {
          const isActive = activeVersionCutoff === null || evt.version <= activeVersionCutoff;
          return (
            <li
              key={evt._id || `${evt.aggregateId}-${evt.version}`}
              className={`timeline-item ${isActive ? 'active' : 'inactive'}`}
            >
              <div>
                <span className="event-type">{evt.eventType}</span>
                <span className="version">v{evt.version}</span>
              </div>
              <div className="timestamp">
                {new Date(evt.timestamp).toLocaleString()}
              </div>
              <div className="payload-summary">
                <pre style={{ fontSize: '0.85rem', margin: '4px 0' }}>
                  {JSON.stringify(evt.payload, null, 2)}
                </pre>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
