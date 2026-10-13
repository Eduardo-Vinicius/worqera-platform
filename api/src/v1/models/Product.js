const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: '', trim: true },
    price: { type: Number, default: null },
    onHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: Number, default: 0 },
    trackStock: { type: Boolean, default: true },
    minQty: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    onHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    variants: { type: [variantSchema], default: [] },
  },
  { timestamps: true }
);

productSchema.index({ shopId: 1, name: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
