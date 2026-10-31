const mongoose = require('mongoose');

/** One 5xx response, kept 30 days, so the admin can find it by correlation id. */
const errorSampleSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    route: { type: String, default: '' },
    method: { type: String, default: '' },
    status: { type: Number, default: 500 },
    code: { type: String, default: '' },
    message: { type: String, default: '' },
    correlationId: { type: String, default: '' },
    client: { type: String, default: '' },
    shopId: { type: String, default: null },
  },
  { versionKey: false }
);

errorSampleSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
errorSampleSchema.index({ route: 1, at: -1 });

module.exports = mongoose.models.ErrorSample || mongoose.model('ErrorSample', errorSampleSchema);
