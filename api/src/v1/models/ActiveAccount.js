const mongoose = require('mongoose');

/**
 * One row per São Paulo day × user × client: the base of active users,
 * users per region (shop UF), per platform and per app version.
 */
const activeAccountSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    dayDate: { type: Date, required: true },
    userId: { type: String, required: true },
    shopId: { type: String, default: null },
    client: { type: String, required: true },
    platform: { type: String, default: null },
    appVersion: { type: String, default: null },
    region: { type: String, default: null },
    firstSeenAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
  },
  { versionKey: false }
);

activeAccountSchema.index({ day: 1, userId: 1, client: 1 }, { unique: true });
activeAccountSchema.index({ dayDate: 1 }, { expireAfterSeconds: 120 * 24 * 60 * 60 });
activeAccountSchema.index({ userId: 1, day: -1 });
activeAccountSchema.index({ shopId: 1, day: -1 });

module.exports = mongoose.models.ActiveAccount || mongoose.model('ActiveAccount', activeAccountSchema);
