import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ConflictBanner from '../components/ConflictBanner';

describe('ConflictBanner Component Unit Test', () => {
  test('renders nothing when conflictError is null', () => {
    const { container } = render(<ConflictBanner conflictError={null} onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders 409 error message and dismisses on click', () => {
    const onDismissMock = vi.fn();
    const conflictData = {
      expectedVersion: 2,
      currentVersion: 4,
      message: 'Concurrency conflict detected'
    };

    render(<ConflictBanner conflictError={conflictData} onDismiss={onDismissMock} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Optimistic Concurrency Conflict/i)).toBeInTheDocument();
    expect(screen.getByText(/Concurrency conflict detected/i)).toBeInTheDocument();

    const dismissBtn = screen.getByText('Dismiss');
    fireEvent.click(dismissBtn);
    expect(onDismissMock).toHaveBeenCalledTimes(1);
  });
});
