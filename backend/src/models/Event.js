import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    aggregateId: {
      type: String,
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true
    },
    payload: {
      type: Object,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    version: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: false
  }
);

// Compound unique index enforcing Optimistic Concurrency Control (OCC)
// Prevents duplicate versions for the same aggregateId at database level
eventSchema.index({ aggregateId: 1, version: 1 }, { unique: true });

export const EventModel = mongoose.model('Event', eventSchema);
