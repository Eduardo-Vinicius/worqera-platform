const mongoose = require('mongoose');

const orderCounterSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    dayKey: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

orderCounterSchema.index({ shopId: 1, dayKey: 1 }, { unique: true });

module.exports =
  mongoose.models.OrderCounter ||
  mongoose.model('OrderCounter', orderCounterSchema, 'order_counters');
