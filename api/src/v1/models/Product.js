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
    /** Days the supplier takes to deliver (e.g. soles: 30–40). Drives "hora de pedir". */
    leadTimeDays: { type: Number, default: 0, min: 0, max: 365 },
    /** Open order with the supplier; cleared when it arrives or is cancelled. */
    restock: {
      qty: { type: Number, default: 0 },
      variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
      orderedAt: { type: Date, default: null },
      expectedAt: { type: Date, default: null },
      note: { type: String, default: '', maxlength: 300 },
      byName: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

productSchema.index({ shopId: 1, name: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
