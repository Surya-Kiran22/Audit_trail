import React, { useState, useEffect } from 'react';

export default function TimeSlider({ events = [], onScrub }) {
  const [selectedIndex, setSelectedIndex] = useState(events.length ? events.length - 1 : 0);

  useEffect(() => {
    if (events && events.length > 0) {
      setSelectedIndex(events.length - 1);
    }
  }, [events.length]);

  if (!events || events.length === 0) {
    return null;
  }

  const maxIndex = events.length - 1;
  const currentSelectedEvt = events[selectedIndex] || events[maxIndex];

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    setSelectedIndex(idx);
    const selectedEvt = events[idx];
    if (selectedEvt) {
      const isLatest = idx === maxIndex;
      onScrub({
        version: selectedEvt.version,
        timestamp: selectedEvt.timestamp,
        isLatest
      });
    }
  };

  const handleResetToCurrent = () => {
    setSelectedIndex(maxIndex);
    const latestEvt = events[maxIndex];
    onScrub({
      version: latestEvt.version,
      timestamp: latestEvt.timestamp,
      isLatest: true
    });
  };

  return (
    <div className="slider-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label htmlFor="time-slider">
          <strong>State Scrubbing Time-Machine:</strong> Event #{selectedIndex + 1} of {events.length} (v{currentSelectedEvt.version})
        </label>
        {selectedIndex !== maxIndex && (
          <button onClick={handleResetToCurrent} className="action-btn" style={{ padding: '2px 8px', fontSize: '0.85rem' }}>
            Jump to Latest State
          </button>
        )}
      </div>

      <input
        id="time-slider"
        type="range"
        min={0}
        max={maxIndex}
        value={selectedIndex}
        onChange={handleSliderChange}
        aria-label="Event State Scrubbing Slider"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginTop: '4px' }}>
        <span>v1: {events[0]?.eventType}</span>
        <span>
          Selected: {currentSelectedEvt?.eventType} ({new Date(currentSelectedEvt?.timestamp).toLocaleTimeString()})
        </span>
        <span>v{events[maxIndex]?.version}: {events[maxIndex]?.eventType}</span>
      </div>
    </div>
  );
}
