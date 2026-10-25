const mongoose = require('mongoose');

/** Every official WhatsApp message in or out, with its category and estimated cost. */
const whatsAppMessageSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    direction: { type: String, enum: ['out', 'in'], default: 'out' },
    to: { type: String, default: '' },
    from: { type: String, default: '' },
    /** utility | marketing | service */
    category: { type: String, default: 'utility' },
    template: { type: String, default: '' },
    text: { type: String, default: '' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', default: null },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    /** queued | sent | delivered | read | failed | skipped | received */
    status: { type: String, default: 'queued' },
    reason: { type: String, default: '' },
    error: { type: String, default: '' },
    wamid: { type: String, default: '' },
    attempts: { type: Number, default: 0 },
    /** Meta rate card (BRL) at send time. Billed only when delivered. */
    costBrl: { type: Number, default: 0 },
    sentByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

whatsAppMessageSchema.index({ shopId: 1, createdAt: -1 });
whatsAppMessageSchema.index({ wamid: 1 });
whatsAppMessageSchema.index({ shopId: 1, quoteId: 1 });

module.exports =
  mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
