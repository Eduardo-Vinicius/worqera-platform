const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    branding: {
      displayName: { type: String, default: '' },
      emailFromName: { type: String, default: '' },
      legacyBrand: { type: String, default: null },
    },
    timezone: { type: String, default: 'America/Sao_Paulo' },
  },
  { timestamps: true }
);

shopSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
