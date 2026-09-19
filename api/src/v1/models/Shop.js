const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    /**
     * Business vertical — drives default copy/nouns. Seed CdT uses footwear;
     * new signups default to general so Worqera is not sneaker-only.
     */
    vertical: {
      type: String,
      enum: ['general', 'footwear', 'laundry', 'repair', 'custom'],
      default: 'general',
    },
    branding: {
      displayName: { type: String, default: '' },
      emailFromName: { type: String, default: '' },
      legacyBrand: { type: String, default: null },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
      primaryColor: { type: String, default: '' },
      accentColor: { type: String, default: '' },
      /** Noun for the physical item on the order (peça, tênis, roupa…). */
      itemLabel: { type: String, default: 'peça' },
      itemLabelPlural: { type: String, default: 'peças' },
    },
    /** Platform-only free-text note (objeção, PIX, plano). */
    adminNote: { type: String, default: '' },
    tvSettings: {
      client: {
        title: { type: String, default: '' },
        showLogo: { type: Boolean, default: true },
        tilesPerPage: { type: Number, default: 6 },
        refreshMs: { type: Number, default: 30000 },
        carouselMs: { type: Number, default: 8000 },
      },
      floor: {
        title: { type: String, default: '' },
        sectorIds: { type: [String], default: [] },
        hotOnlyDefault: { type: Boolean, default: false },
        overdueHours: { type: Number, default: 24 },
        refreshMs: { type: Number, default: 15000 },
      },
    },
    notifications: {
      whatsapp: {
        enabled: { type: Boolean, default: false },
        shopPhoneE164: { type: String, default: '' },
        templates: {
          created: { type: String, default: '' },
          moved: { type: String, default: '' },
          ready: { type: String, default: '' },
          publicLink: { type: String, default: '' },
        },
      },
      email: {
        /** Master switch for client order-status emails */
        enabled: { type: Boolean, default: true },
      },
    },
    partnerCode: { type: String, default: null, trim: true, uppercase: true },
    referredByPartnerCode: { type: String, default: null, trim: true, uppercase: true },
    timezone: { type: String, default: 'America/Sao_Paulo' },
    onboarding: {
      completedAt: { type: Date, default: null },
      lastDigestAt: { type: Date, default: null },
      lastWeeklyDigestAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

shopSchema.index({ slug: 1 }, { unique: true });
shopSchema.index(
  { partnerCode: 1 },
  { unique: true, partialFilterExpression: { partnerCode: { $type: 'string' } } }
);

module.exports = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
