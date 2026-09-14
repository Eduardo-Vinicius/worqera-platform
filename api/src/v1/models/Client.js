const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    cpf: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

clientSchema.index({ shopId: 1, cpf: 1 });
clientSchema.index({ shopId: 1, name: 1 });

module.exports = mongoose.models.Client || mongoose.model('Client', clientSchema);
