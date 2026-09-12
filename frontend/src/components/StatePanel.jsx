import React from 'react';

export default function StatePanel({ state, isHistorical = false, targetTimestamp = null }) {
  if (!state || state.status === 'NON_EXISTENT') {
    return (
      <div className="panel">
        <h2>Reconstructed Current State</h2>
        <p>No state derived. Select or search for a valid shipment ID.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>
        {isHistorical ? 'Historical Reconstructed State' : 'Reconstructed Current State'}
        {isHistorical && targetTimestamp && (
          <span style={{ fontSize: '0.85rem', display: 'block', color: '#856404' }}>
            As of: {new Date(targetTimestamp).toLocaleString()}
          </span>
        )}
      </h2>

      <table className="state-table">
        <tbody>
          <tr>
            <th>Container / Aggregate ID</th>
            <td>{state.aggregateId}</td>
          </tr>
          <tr>
            <th>Lifecycle Status</th>
            <td>
              <strong>{state.status}</strong>
            </td>
          </tr>
          <tr>
            <th>Current Location</th>
            <td>{state.location || 'N/A'}</td>
          </tr>
          <tr>
            <th>Vessel / Carrier</th>
            <td>{state.vessel || 'N/A'}</td>
          </tr>
          <tr>
            <th>Current Temperature</th>
            <td>
              {state.currentTemperature !== null && state.currentTemperature !== undefined
                ? `${state.currentTemperature} °C`
                : 'N/A'}
              {state.hasTemperatureAlert && (
                <span style={{ color: 'red', fontWeight: 'bold', marginLeft: '8px' }}>
                  ⚠️ TEMP SPIKE ALERT
                </span>
              )}
            </td>
          </tr>
          <tr>
            <th>Manifest Item Count</th>
            <td>{state.itemCount} units</td>
          </tr>
          <tr>
            <th>Reconstructed Version</th>
            <td>v{state.lastVersion} ({state.eventsCount} events replayed)</td>
          </tr>
          <tr>
            <th>Last Updated</th>
            <td>{state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'N/A'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
