const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    planCode: { type: String, default: 'WORQERA_PRO' },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'canceled', 'expired'],
      default: 'trialing',
    },
    provider: { type: String, enum: ['AbacatePay', 'Manual', 'Dev'], default: 'Manual' },
    trialEndsAt: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    providerCustomerId: { type: String, default: null },
    providerSubscriptionId: { type: String, default: null },
  },
  { timestamps: true }
);

subscriptionSchema.index({ shopId: 1 }, { unique: true });

module.exports =
  mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
