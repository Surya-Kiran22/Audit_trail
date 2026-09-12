import { render, screen } from '@testing-library/react';
import React from 'react';
import Timeline from '../components/Timeline';

describe('Timeline Component Unit Test', () => {
  test('renders not found message when notFound flag is true', () => {
    render(<Timeline notFound={true} />);
    expect(screen.getByText(/No shipment found with this ID/i)).toBeInTheDocument();
  });

  test('renders empty message when events array is empty', () => {
    render(<Timeline events={[]} />);
    expect(screen.getByText(/No events recorded for this shipment yet/i)).toBeInTheDocument();
  });

  test('renders event items with version, type, and payload', () => {
    const events = [
      {
        _id: '1',
        aggregateId: 'CONT-1',
        eventType: 'CONTAINER_CREATED',
        version: 1,
        timestamp: '2026-09-12T10:00:00.000Z',
        payload: { location: 'Port Alpha' }
      },
      {
        _id: '2',
        aggregateId: 'CONT-1',
        eventType: 'LOADED_ON_SHIP',
        version: 2,
        timestamp: '2026-09-12T11:00:00.000Z',
        payload: { vessel: 'Sea Explorer' }
      }
    ];

    render(<Timeline events={events} />);
    expect(screen.getByText('CONTAINER_CREATED')).toBeInTheDocument();
    expect(screen.getByText('LOADED_ON_SHIP')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText(/Port Alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/Sea Explorer/i)).toBeInTheDocument();
  });
});
