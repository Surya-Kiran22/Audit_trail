import { render, screen } from '@testing-library/react';
import React from 'react';
import SensorChart, { transformEventsForChart } from '../components/SensorChart';

describe('SensorChart Component & Transformer Unit Test', () => {
  const sampleEvents = [
    {
      version: 1,
      eventType: 'CONTAINER_CREATED',
      timestamp: '2026-09-12T10:00:00.000Z',
      payload: { location: 'Port Alpha' }
    },
    {
      version: 2,
      eventType: 'LOADED_ON_SHIP',
      timestamp: '2026-09-12T11:00:00.000Z',
      payload: { vessel: 'Vessel One' }
    },
    {
      version: 3,
      eventType: 'TEMPERATURE_SPIKE',
      timestamp: '2026-09-12T12:00:00.000Z',
      payload: { temperature: 35 }
    }
  ];

  test('transformEventsForChart extracts temperature time series and reference markers', () => {
    const { chartData, referenceEvents } = transformEventsForChart(sampleEvents);

    expect(chartData.length).toBe(3);
    expect(referenceEvents.length).toBe(3);
    expect(chartData[2].temperature).toBe(35);
    expect(chartData[2].isAnomaly).toBe(true);
  });

  test('renders empty message when events array is empty', () => {
    render(<SensorChart events={[]} />);
    expect(screen.getByText(/No sensor readings available yet for charting/i)).toBeInTheDocument();
  });
});
