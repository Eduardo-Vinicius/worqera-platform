const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    cpf: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    whatsappOptIn: { type: Boolean, default: false },
    /** Customer answered PARAR/SAIR: no business-initiated WhatsApp anymore. */
    whatsappOptOut: { type: Boolean, default: false },
    address: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: null, maxlength: 2000 },
    /** Birthday: day and month are enough to congratulate; the year is optional. */
    birthDay: { type: Number, min: 1, max: 31, default: null },
    birthMonth: { type: Number, min: 1, max: 12, default: null },
    birthYear: { type: Number, min: 1900, max: 2100, default: null },
    tags: { type: [String], default: [] },
    /** How they found the shop: indicação, instagram, google, passou na frente… */
    source: { type: String, default: null, maxlength: 60 },
  },
  { timestamps: true }
);

clientSchema.index({ shopId: 1, cpf: 1 });
clientSchema.index({ shopId: 1, name: 1 });
clientSchema.index({ shopId: 1, birthMonth: 1, birthDay: 1 });

module.exports = mongoose.models.Client || mongoose.model('Client', clientSchema);
