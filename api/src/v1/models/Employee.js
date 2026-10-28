const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    sectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector', default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    cargo: { type: String, default: '', trim: true, maxlength: 80 },
    notes: { type: String, default: '', trim: true, maxlength: 500 },
    /** Shows up in "Aberto por" on the order form. */
    attends: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ shopId: 1, name: 1 });
employeeSchema.index({ shopId: 1, sectorId: 1 });
employeeSchema.index({ shopId: 1, active: 1 });

module.exports = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
