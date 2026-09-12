import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer
} from 'recharts';

/**
 * Pure helper function transforming raw event stream into Recharts time-series data array.
 * @param {Array} events
 * @returns {Object} { chartData, referenceEvents }
 */
export function transformEventsForChart(events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    return { chartData: [], referenceEvents: [] };
  }

  const chartData = [];
  const referenceEvents = [];

  let lastKnownTemp = 20; // baseline default ambient temperature

  events.forEach((evt) => {
    const formattedTime = new Date(evt.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const isTempEvent = evt.eventType === 'TEMPERATURE_SPIKE' || evt.eventType === 'SENSOR_READING';
    const tempValue = isTempEvent && evt.payload?.temperature !== undefined
      ? evt.payload.temperature
      : lastKnownTemp;

    if (isTempEvent && evt.payload?.temperature !== undefined) {
      lastKnownTemp = evt.payload.temperature;
    }

    chartData.push({
      time: formattedTime,
      fullTime: evt.timestamp,
      version: evt.version,
      eventType: evt.eventType,
      temperature: tempValue,
      isAnomaly: evt.eventType === 'TEMPERATURE_SPIKE'
    });

    if (['CONTAINER_CREATED', 'LOADED_ON_SHIP', 'ARRIVED_AT_PORT', 'TEMPERATURE_SPIKE'].includes(evt.eventType)) {
      referenceEvents.push({
        time: formattedTime,
        eventType: evt.eventType,
        version: evt.version,
        temperature: tempValue
      });
    }
  });

  return { chartData, referenceEvents };
}

export default function SensorChart({ events = [] }) {
  const { chartData, referenceEvents } = transformEventsForChart(events);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="panel chart-container">
        <h2>Sensor Metrics & Lifecycle Timeline</h2>
        <p>No sensor readings available yet for charting.</p>
      </div>
    );
  }

  return (
    <div className="panel chart-container">
      <h2>Sensor Metrics & Event Overlay</h2>
      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '15px' }}>
        Continuous temperature log (°C) mapped against discrete lifecycle events.
      </p>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -10 }} />
            <YAxis label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ background: '#fff', border: '1px solid #ccc', padding: '8px', fontSize: '0.85rem' }}>
                      <p style={{ fontWeight: 'bold' }}>{label} (v{data.version})</p>
                      <p>Event: {data.eventType}</p>
                      <p>Temperature: {data.temperature} °C</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="temperature"
              name="Temperature (°C)"
              stroke="#2b580c"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />

            {/* Overlays for discrete lifecycle events */}
            {referenceEvents.map((ref, idx) => (
              <ReferenceLine
                key={`ref-line-${idx}`}
                x={ref.time}
                stroke={ref.eventType === 'TEMPERATURE_SPIKE' ? 'red' : '#0056b3'}
                strokeDasharray="4 4"
                label={{
                  value: `${ref.eventType} (v${ref.version})`,
                  position: 'top',
                  fill: ref.eventType === 'TEMPERATURE_SPIKE' ? 'red' : '#0056b3',
                  fontSize: 10
                }}
              />
            ))}

            {referenceEvents.map((ref, idx) => (
              <ReferenceDot
                key={`ref-dot-${idx}`}
                x={ref.time}
                y={ref.temperature}
                r={6}
                fill={ref.eventType === 'TEMPERATURE_SPIKE' ? 'red' : '#0056b3'}
                stroke="none"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
