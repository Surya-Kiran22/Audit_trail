import React, { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [shipmentId, setShipmentId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (shipmentId.trim()) {
      onSearch(shipmentId.trim());
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        value={shipmentId}
        onChange={(e) => setShipmentId(e.target.value)}
        placeholder="Enter Container / Shipment ID (e.g. CONT-1001)..."
        aria-label="Shipment ID"
      />
      <button type="submit">Look up shipment by ID</button>
    </form>
  );
}
