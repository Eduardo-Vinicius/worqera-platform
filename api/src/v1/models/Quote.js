const mongoose = require('mongoose');
const { STAGES, REASONS } = require('../lib/quotePriority');

const activitySchema = new mongoose.Schema(
  {
    /** created | refused | stage | note | call | whatsapp | won | lost | reopened */
    kind: { type: String, required: true },
    text: { type: String, default: '' },
    stage: { type: String, default: null },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    byName: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const quoteSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    /** Set when the quote came from an order the customer refused. */
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    orderCode: { type: String, default: '' },
    /** counter = registered on the funnel without an order. */
    source: { type: String, enum: ['order', 'counter'], default: 'counter' },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    what: { type: String, default: '', trim: true },
    value: { type: Number, default: 0 },
    stage: { type: String, enum: STAGES, default: 'new' },
    reason: { type: String, enum: [...REASONS, null], default: null },
    reasonNote: { type: String, default: '' },
    followUpAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    contactCount: { type: Number, default: 0 },
    lastContactAt: { type: Date, default: null },
    wonAt: { type: Date, default: null },
    lostAt: { type: Date, default: null },
    wonOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    activity: { type: [activitySchema], default: [] },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

quoteSchema.index({ shopId: 1, stage: 1, followUpAt: 1 });
quoteSchema.index({ shopId: 1, createdAt: -1 });
quoteSchema.index({ shopId: 1, clientId: 1 });
quoteSchema.index({ shopId: 1, orderId: 1 });

module.exports = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);
