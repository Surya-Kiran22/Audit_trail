import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TimeSlider from '../components/TimeSlider';

describe('TimeSlider Component Unit Test', () => {
  const mockEvents = [
    { version: 1, eventType: 'CONTAINER_CREATED', timestamp: '2026-09-12T10:00:00.000Z' },
    { version: 2, eventType: 'LOADED_ON_SHIP', timestamp: '2026-09-12T11:00:00.000Z' },
    { version: 3, eventType: 'TEMPERATURE_SPIKE', timestamp: '2026-09-12T12:00:00.000Z' }
  ];

  test('renders slider with max value set to events.length - 1', () => {
    render(<TimeSlider events={mockEvents} onScrub={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('max', '2');
  });

  test('triggers onScrub callback on slider movement', () => {
    const onScrubMock = vi.fn();
    render(<TimeSlider events={mockEvents} onScrub={onScrubMock} />);
    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '1' } });

    expect(onScrubMock).toHaveBeenCalledWith({
      version: 2,
      timestamp: '2026-09-12T11:00:00.000Z',
      isLatest: false
    });
  });
});
