const mongoose = require('mongoose');

const platformMailLogSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    shopId: { type: String, default: null },
    kind: { type: String, default: '' },
    code: { type: String, default: '' },
    to: { type: String, default: '' },
    ok: { type: Boolean, default: false },
    skipped: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    error: { type: String, default: '' },
    provider: { type: String, default: '' },
  },
  { timestamps: false }
);

platformMailLogSchema.index({ at: -1 });

module.exports =
  mongoose.models.PlatformMailLog || mongoose.model('PlatformMailLog', platformMailLogSchema);
