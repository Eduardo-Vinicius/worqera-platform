const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['admin', 'atendimento', 'sector'],
      default: 'atendimento',
    },
    sectorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inviteSchema.index({ tokenHash: 1 }, { unique: true });
inviteSchema.index({ shopId: 1, email: 1 });

module.exports = mongoose.models.Invite || mongoose.model('Invite', inviteSchema);
