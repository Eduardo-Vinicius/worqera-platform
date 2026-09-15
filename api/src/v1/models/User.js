const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
