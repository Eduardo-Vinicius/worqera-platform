const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    productName: { type: String, default: '' },
    variantName: { type: String, default: '' },
    /** adjust | reserve | release | commit | reopen */
    type: { type: String, required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, default: '' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    orderCode: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

stockMovementSchema.index({ shopId: 1, createdAt: -1 });
stockMovementSchema.index({ productId: 1, createdAt: -1 });

module.exports =
  mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema);
