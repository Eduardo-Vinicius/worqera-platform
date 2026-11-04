const mongoose = require('mongoose');

/** Every change a Worqera platform admin makes (shop, subscription, parameters, notices, accounts). */
const platformAuditSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actorUserId: { type: String, default: null },
    actorEmail: { type: String, default: '' },
    action: { type: String, required: true },
    targetType: { type: String, default: '' },
    targetId: { type: String, default: null },
    targetName: { type: String, default: '' },
    summary: { type: String, default: '' },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
  },
  { timestamps: false }
);

platformAuditSchema.index({ at: -1 });
platformAuditSchema.index({ targetType: 1, targetId: 1, at: -1 });
platformAuditSchema.index({ at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.models.PlatformAudit || mongoose.model('PlatformAudit', platformAuditSchema);
