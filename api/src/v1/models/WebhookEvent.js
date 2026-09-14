const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, default: 'AbacatePay' },
    eventId: { type: String, required: true },
    type: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: false }
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports =
  mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);
