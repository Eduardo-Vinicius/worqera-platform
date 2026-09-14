const mongoose = require('mongoose');

const serviceCatalogSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    defaultPrice: { type: Number, default: 0 },
    sectorPathHint: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceCatalogSchema.index({ shopId: 1, name: 1 });

module.exports =
  mongoose.models.ServiceCatalog ||
  mongoose.model('ServiceCatalog', serviceCatalogSchema, 'service_catalog');
