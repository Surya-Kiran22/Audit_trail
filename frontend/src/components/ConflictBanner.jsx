import React from 'react';

export default function ConflictBanner({ conflictError, onDismiss }) {
  if (!conflictError) return null;

  return (
    <div className="conflict-banner" role="alert">
      <div>
        <strong>⚠️ Optimistic Concurrency Conflict (409 Conflict)</strong>
        <p>
          {conflictError.message ||
            `Expected version v${conflictError.expectedVersion}, but current version is v${conflictError.currentVersion}.`}
        </p>
        <small>Someone else updated this shipment in the ledger. Please refresh to load the latest state.</small>
      </div>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
