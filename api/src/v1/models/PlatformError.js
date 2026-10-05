const mongoose = require('mongoose');

const platformErrorSchema = new mongoose.Schema(
  {
    message: { type: String, default: '' },
    route: { type: String, default: '' },
    method: { type: String, default: '' },
    status: { type: Number, default: 500 },
    shopId: { type: String, default: null },
    count: { type: Number, default: 1 },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

platformErrorSchema.index({ at: -1 });

module.exports =
  mongoose.models.PlatformError || mongoose.model('PlatformError', platformErrorSchema);
