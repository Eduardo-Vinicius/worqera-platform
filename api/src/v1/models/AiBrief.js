const mongoose = require('mongoose');

/** Cached AI text: the daily brief (one per day) and the weekly insights (one per week). */
const aiBriefSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    kind: { type: String, enum: ['daily', 'weekly', 'receivables', 'client'], required: true },
    /** YYYY-MM-DD (daily) or the Monday of the week (weekly), São Paulo time. */
    day: { type: String, required: true },
    text: { type: String, default: '' },
    bullets: { type: [String], default: [] },
    ai: { type: Boolean, default: false },
    numbers: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

aiBriefSchema.index({ shopId: 1, kind: 1, day: 1 }, { unique: true });

module.exports = mongoose.models.AiBrief || mongoose.model('AiBrief', aiBriefSchema);
