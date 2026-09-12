import '@testing-library/jest-dom';

// Global ResizeObserver mock for Recharts ResponsiveContainer in jsdom environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
