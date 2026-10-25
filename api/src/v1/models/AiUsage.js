const mongoose = require('mongoose');

/** One row per AI call: who used it, for what, and what it cost. */
const aiUsageSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    /** quote_message | daily_brief | weekly_insights | customer_summary | review_reply */
    feature: { type: String, required: true },
    model: { type: String, default: '' },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    ok: { type: Boolean, default: true },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

aiUsageSchema.index({ shopId: 1, createdAt: -1 });
aiUsageSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AiUsage || mongoose.model('AiUsage', aiUsageSchema);
