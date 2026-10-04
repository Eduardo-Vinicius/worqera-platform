const mongoose = require('mongoose');

const brandCatalogSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

brandCatalogSchema.index({ shopId: 1, name: 1 });

module.exports =
  mongoose.models.BrandCatalog ||
  mongoose.model('BrandCatalog', brandCatalogSchema, 'brand_catalog');
