const mongoose = require('mongoose');

/** Security timeline of a user (admin 360°): logins, new devices, password and session changes. Kept 180 days. */
const securityEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: {
      type: String,
      enum: ['login', 'login_new_device', 'login_failed', 'logout', 'password_reset', 'password_set_by_admin', 'sessions_revoked'],
      required: true,
    },
    at: { type: Date, default: Date.now },
    deviceHash: { type: String, default: '' },
    device: { type: String, default: '' },
    ip: { type: String, default: '' },
    client: { type: String, default: '' },
    byUserId: { type: String, default: null },
  },
  { versionKey: false }
);

securityEventSchema.index({ userId: 1, at: -1 });
securityEventSchema.index({ at: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', securityEventSchema);
