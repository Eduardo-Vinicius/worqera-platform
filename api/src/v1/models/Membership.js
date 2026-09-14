const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'atendimento', 'sector'],
      required: true,
    },
    sectorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, shopId: 1 }, { unique: true });
membershipSchema.index({ shopId: 1, role: 1 });

module.exports =
  mongoose.models.Membership || mongoose.model('Membership', membershipSchema);
