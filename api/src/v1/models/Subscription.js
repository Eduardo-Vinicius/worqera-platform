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
    provider: { type: String, enum: ['Asaas', 'AbacatePay', 'Manual', 'Dev'], default: 'Manual' },
    cycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    /** Open Asaas invoice (pending or overdue), so the plan page can say "pagar fatura em aberto". */
    lastInvoiceUrl: { type: String, default: null },
    trialEndsAt: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    providerCustomerId: { type: String, default: null },
    providerSubscriptionId: { type: String, default: null },
    /** Founder price: Business shops that were customers before the price change keep R$ 499 for 12 months. */
    founder: {
      priceCents: { type: Number, default: null },
      until: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ shopId: 1 }, { unique: true });

module.exports =
  mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
