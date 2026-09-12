import mongoose from 'mongoose';

const shipmentReadSchema = new mongoose.Schema(
  {
    aggregateId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    state: {
      type: Object,
      required: true
    },
    lastVersion: {
      type: Number,
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const ShipmentReadModel = mongoose.model('ShipmentRead', shipmentReadSchema);
