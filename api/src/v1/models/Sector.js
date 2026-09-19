const mongoose = require('mongoose');

const sectorSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    color: { type: String, default: '#2196F3' },
    active: { type: Boolean, default: true },
    isTerminal: { type: Boolean, default: false },
    /** When true, entering this sector emails the client (if shop email on + clientEmail). */
    notifyEmailOnEnter: { type: Boolean, default: false },
    /** When false, public /p hides real name and shows "Em andamento". Default true (legacy = visible). */
    showOnPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sectorSchema.index({ shopId: 1, slug: 1 }, { unique: true });
sectorSchema.index({ shopId: 1, order: 1 });

module.exports = mongoose.models.Sector || mongoose.model('Sector', sectorSchema);
