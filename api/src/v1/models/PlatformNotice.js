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
    /** banner = strip on top of the app; modal = "Novidades" card in the center with a tour. */
    display: { type: String, enum: ['banner', 'modal'], default: 'banner' },
    /** Tour steps shown inside the modal. `href` is the screen it opens (e.g. /orcamentos). */
    steps: {
      type: [
        new mongoose.Schema(
          {
            title: { type: String, default: '' },
            body: { type: String, default: '' },
            href: { type: String, default: '' },
            cta: { type: String, default: '' },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PlatformNotice || mongoose.model('PlatformNotice', platformNoticeSchema);
