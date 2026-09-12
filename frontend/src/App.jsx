import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import Timeline from './components/Timeline';
import StatePanel from './components/StatePanel';
import TimeSlider from './components/TimeSlider';
import SensorChart from './components/SensorChart';
import ConflictBanner from './components/ConflictBanner';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function App() {
  const [shipmentId, setShipmentId] = useState('CONT-1001');
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [currentState, setCurrentState] = useState(null);
  const [displayedState, setDisplayedState] = useState(null);
  const [conflictError, setConflictError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [scrubTimestamp, setScrubTimestamp] = useState(null);
  const [activeVersionCutoff, setActiveVersionCutoff] = useState(null);

  // Command form states
  const [newShipmentIdInput, setNewShipmentIdInput] = useState('');
  const [tempInput, setTempInput] = useState('30');
  const [customExpectedVersionInput, setCustomExpectedVersionInput] = useState('');

  const fetchShipmentData = useCallback(async (id) => {
    if (!id) return;
    setConflictError(null);
    setNotFound(false);

    try {
      // 1. Fetch Timeline (raw event store)
      const timelineRes = await fetch(`${API_BASE}/queries/shipment/${id}/timeline`);
      if (timelineRes.status === 404) {
        setNotFound(true);
        setTimelineEvents([]);
        setCurrentState(null);
        setDisplayedState(null);
        return;
      }
      const timelineData = await timelineRes.json();
      setTimelineEvents(timelineData.events || []);

      // 2. Fetch Current State (read-model projection)
      const stateRes = await fetch(`${API_BASE}/queries/shipment/${id}`);
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        setCurrentState(stateData.state);
        setDisplayedState(stateData.state);
        setIsHistorical(false);
        setScrubTimestamp(null);
        setActiveVersionCutoff(null);
      }
    } catch (err) {
      console.error('Failed to fetch shipment data:', err);
    }
  }, []);

  useEffect(() => {
    if (shipmentId) {
      fetchShipmentData(shipmentId);
    }
  }, [shipmentId, fetchShipmentData]);

  const handleSearch = (id) => {
    setShipmentId(id);
  };

  const createContainerForId = async (targetId) => {
    const idToCreate = targetId || newShipmentIdInput.trim() || 'CONT-1001';
    setConflictError(null);

    try {
      const res = await fetch(`${API_BASE}/commands/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateId: idToCreate,
          location: 'Origin Logistics Port',
          itemCount: 150
        })
      });

      const body = await res.json();
      if (res.status === 409) {
        setConflictError(body);
        return false;
      }

      if (res.ok) {
        setNewShipmentIdInput('');
        setShipmentId(idToCreate);
        await fetchShipmentData(idToCreate);
        return true;
      } else {
        alert(`Error: ${body.message || 'Failed to create container'}`);
        return false;
      }
    } catch (err) {
      console.error('Create shipment error:', err);
      return false;
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    await createContainerForId(newShipmentIdInput.trim());
  };

  const handleAppendEvent = async (eventType, payload, customExpectedVer = null) => {
    if (!shipmentId) return;
    setConflictError(null);

    // If container doesn't exist yet, auto-create it first!
    if (!currentState && notFound) {
      const created = await createContainerForId(shipmentId);
      if (!created) return;
    }

    const latestVer = currentState ? currentState.lastVersion : (eventType === 'CONTAINER_CREATED' ? 0 : 1);
    const expectedVer = customExpectedVer !== null ? customExpectedVer : latestVer;

    try {
      let url = `${API_BASE}/commands/shipment/${shipmentId}/event`;
      let bodyData = { eventType, payload, expectedVersion: expectedVer };

      if (eventType === 'LOADED_ON_SHIP') {
        url = `${API_BASE}/commands/shipment/${shipmentId}/move`;
        bodyData = { vessel: payload.vessel || 'Sea Transporter', location: 'In Transit', expectedVersion: expectedVer };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const body = await res.json();

      if (res.status === 409) {
        setConflictError(body);
        return;
      }

      if (res.ok) {
        await fetchShipmentData(shipmentId);
      } else {
        alert(`Command rejected (${res.status}): ${body.message || 'Operation failed'}`);
      }
    } catch (err) {
      console.error('Append event error:', err);
    }
  };

  const handleScrub = async ({ version, timestamp, isLatest }) => {
    if (isLatest) {
      setDisplayedState(currentState);
      setIsHistorical(false);
      setScrubTimestamp(null);
      setActiveVersionCutoff(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/queries/shipment/${shipmentId}/state-at?timestamp=${encodeURIComponent(timestamp)}`);
      if (res.ok) {
        const data = await res.json();
        setDisplayedState(data.state);
        setIsHistorical(true);
        setScrubTimestamp(timestamp);
        setActiveVersionCutoff(version);
      }
    } catch (err) {
      console.error('Scrub fetch error:', err);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Audit Trail — Event-Sourced Inventory & Logistics Ledger</h1>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          CQRS Architecture • Immutable Event Log • Optimistic Concurrency Control
        </p>
      </header>

      <main>
        <ConflictBanner conflictError={conflictError} onDismiss={() => setConflictError(null)} />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <SearchBar onSearch={handleSearch} />
          </div>
          <div className="panel" style={{ padding: '10px 15px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Create New Container</h3>
            <form onSubmit={handleCreateShipment} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newShipmentIdInput}
                onChange={(e) => setNewShipmentIdInput(e.target.value)}
                placeholder="ID (e.g. CONT-5005)"
                style={{ flex: 1, padding: '4px 8px' }}
              />
              <button type="submit" className="action-btn" style={{ fontSize: '0.85rem' }}>Create</button>
            </form>
          </div>
        </div>

        {shipmentId && (
          <>
            {notFound && (
              <div className="panel" style={{ background: '#fff8e1', border: '1px solid #ffe082', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Container <strong>{shipmentId}</strong> does not exist in the ledger store yet.</span>
                <button className="action-btn" onClick={() => createContainerForId(shipmentId)}>
                  ⚡ Auto-Create Container '{shipmentId}'
                </button>
              </div>
            )}

            <div className="command-section">
              <h3 style={{ marginBottom: '10px' }}>Command Panel for Container: {shipmentId}</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="action-btn"
                  onClick={() => createContainerForId(shipmentId)}
                  style={{ background: '#27ae60' }}
                >
                  Create Container ({shipmentId})
                </button>

                <button
                  className="action-btn"
                  onClick={() => handleAppendEvent('LOADED_ON_SHIP', { vessel: 'Evergreen Ocean', location: 'Pacific Route' })}
                  disabled={currentState && currentState.status === 'DELIVERED'}
                >
                  Load on Ship (LOADED_ON_SHIP)
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #ccc', padding: '4px 8px' }}>
                  <span>Temp (°C):</span>
                  <input
                    type="number"
                    value={tempInput}
                    onChange={(e) => setTempInput(e.target.value)}
                    style={{ width: '60px', padding: '2px 4px' }}
                  />
                  <button
                    className="action-btn"
                    onClick={() => handleAppendEvent('TEMPERATURE_SPIKE', { temperature: parseFloat(tempInput), humidity: 80 })}
                  >
                    Record Temp Spike
                  </button>
                </div>

                <button
                  className="action-btn"
                  onClick={() => handleAppendEvent('ARRIVED_AT_PORT', { location: 'Port of Long Beach' })}
                  disabled={!currentState || currentState.status !== 'IN_TRANSIT'}
                >
                  Arrive at Port (ARRIVED_AT_PORT)
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px red solid', padding: '4px 8px', background: '#fff0f0' }}>
                  <button
                    className="action-btn"
                    style={{ background: '#c0392b' }}
                    onClick={() => {
                      const staleVer = parseInt(customExpectedVersionInput, 10) || 1;
                      handleAppendEvent('SENSOR_READING', { temperature: 22 }, staleVer);
                    }}
                    disabled={!currentState}
                  >
                    Test Stale Version (OCC 409)
                  </button>
                  <input
                    type="number"
                    value={customExpectedVersionInput}
                    onChange={(e) => setCustomExpectedVersionInput(e.target.value)}
                    placeholder="Stale v#"
                    style={{ width: '65px', padding: '2px 4px' }}
                  />
                </div>
              </div>
            </div>

            <TimeSlider events={timelineEvents} onScrub={handleScrub} />

            <div className="grid-layout">
              <StatePanel state={displayedState} isHistorical={isHistorical} targetTimestamp={scrubTimestamp} />
              <Timeline events={timelineEvents} activeVersionCutoff={activeVersionCutoff} notFound={notFound} />
            </div>

            <SensorChart events={timelineEvents} />
          </>
        )}
      </main>
    </div>
  );
}
