const mongoose = require('mongoose');

const platformNoticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    intervalHours: { type: Number, default: 0 },
    region: { type: String, default: '' },
    platform: {
      type: String,
      enum: ['all', 'web', 'ios', 'android'],
      default: 'all',
    },
    minVersion: { type: String, default: '' },
    maxVersion: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PlatformNotice || mongoose.model('PlatformNotice', platformNoticeSchema);
