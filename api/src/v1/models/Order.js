const mongoose = require('mongoose');

const serviceItemSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const photoSchema = new mongoose.Schema(
  {
    key: String,
    url: { type: String, default: null },
    isCover: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    shoeModel: { type: String, default: '' },
    services: { type: [serviceItemSchema], default: [] },
    photos: { type: [photoSchema], default: [] },
    notes: { type: String, default: null },
  },
  { _id: true }
);

const sectorHistorySchema = new mongoose.Schema(
  {
    sectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector' },
    fromSectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector', default: null },
    enteredAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    movedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    movedByName: { type: String, default: null },
    movedByEmail: { type: String, default: null },
    employeeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    employeeName: { type: String, default: null },
    note: { type: String, default: null },
    /** create | move | forward | reopen */
    action: {
      type: String,
      enum: ['create', 'move', 'forward', 'reopen'],
      default: 'move',
    },
  },
  { _id: false }
);

const orderFeedbackSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '', trim: true, maxlength: 2000 },
    /** What mattered most: qualidade | prazo | atendimento | acabamento */
    tags: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderCommentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    code: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    clientName: { type: String, default: '' },
    clientPhone: { type: String, default: null },
    clientEmail: { type: String, default: null },
    shoeModel: { type: String, default: '' },
    services: { type: [serviceItemSchema], default: [] },
    accessories: { type: [mongoose.Schema.Types.Mixed], default: [] },
    warranty: { type: mongoose.Schema.Types.Mixed, default: {} },
    pricing: {
      total: { type: Number, default: 0 },
      deposit: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
      expenses: { type: Number, default: 0 },
    },
    photos: { type: [photoSchema], default: [] },
    items: { type: [orderItemSchema], default: [] },
    currentSectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector', default: null },
    plannedSectorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
    sectorPath: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
    sectorHistory: { type: [sectorHistorySchema], default: [] },
    comments: { type: [orderCommentSchema], default: [] },
    feedback: { type: orderFeedbackSchema, default: null },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'ready', 'delivered', 'cancelled'],
      default: 'open',
    },
    priority: { type: Number, default: 1 },
    dueAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    assigneeEmployeeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    pdfUrl: { type: String, default: null },
    notes: { type: String, default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

orderSchema.index({ shopId: 1, code: 1 }, { unique: true });
orderSchema.index({ shopId: 1, currentSectorId: 1 });
orderSchema.index({ shopId: 1, createdAt: 1 });
orderSchema.index({ shopId: 1, dueAt: 1 });
orderSchema.index({ shopId: 1, status: 1 });
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, clientName: 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
