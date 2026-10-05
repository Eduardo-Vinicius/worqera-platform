const mongoose = require('mongoose');

const overrideSchema = new mongoose.Schema(
  {
    shopId: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const flagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    shops: { type: [overrideSchema], default: [] },
  },
  { _id: false }
);

const platformConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global' },
    features: { type: [flagSchema], default: [] },
    services: { type: [flagSchema], default: [] },
  },
  { timestamps: true }
);

platformConfigSchema.index({ key: 1 }, { unique: true });

module.exports =
  mongoose.models.PlatformConfig || mongoose.model('PlatformConfig', platformConfigSchema);
