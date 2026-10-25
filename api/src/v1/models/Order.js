const mongoose = require('mongoose');
const { asNumberList } = require('../lib/numberList');

function setCountList(value) {
  if (value == null || value === '') return undefined;
  return asNumberList(value);
}

const serviceItemSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    price: { type: Number, default: 0 },
    note: { type: String, default: '' },
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

const orderItemSchema = new mongoose.Schema(
  {
    shoeModel: { type: String, default: '' },
    brand: { type: String, default: '' },
    services: { type: [serviceItemSchema], default: [] },
    photos: { type: [photoSchema], default: [] },
    notes: { type: String, default: null },
    /** brought = peça do cliente. stock = produto da loja. Só o admin Worqera grava stock. */
    origin: { type: String, enum: ['brought', 'stock'], default: 'brought' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: null },
    snapshot: {
      name: { type: String, default: '' },
      variantName: { type: String, default: '' },
      sku: { type: String, default: '' },
      unitPrice: { type: Number, default: 0 },
    },
    stockState: { type: String, default: null },
    /** Kanban column for this item (may differ from siblings). */
    currentSectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector', default: null },
    plannedSectorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
    sectorHistory: { type: [sectorHistorySchema], default: [] },
  },
  { _id: true }
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
    /**
     * Segredo do link público /p/o/{token}. Não identifica a empresa.
     */
    publicToken: { type: String, default: null, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    clientName: { type: String, default: '' },
    clientPhone: { type: String, default: null },
    clientEmail: { type: String, default: null },
    shoeModel: { type: String, default: '' },
    brand: { type: String, default: '' },
    services: { type: [serviceItemSchema], default: [] },
    accessories: { type: [mongoose.Schema.Types.Mixed], default: [] },
    warranty: { type: mongoose.Schema.Types.Mixed, default: {} },
    pricing: {
      /** Serviços + garantia, antes do desconto. */
      subtotal: { type: Number, default: null },
      /** Desconto em reais, abatido do subtotal. */
      discount: { type: Number, default: 0 },
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
    /** Soft-delete — hidden from kanban/listas; recuperável na lixeira */
    deletedAt: { type: Date, default: null },
    deletedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Set when reopened for rework; cleared when delivered again. */
    reopenedAt: { type: Date, default: null },
    /** Plain-language summary for the customer (laudo + public page). AI on Business, editable. */
    customerSummary: {
      text: { type: String, default: '' },
      ai: { type: Boolean, default: false },
      edited: { type: Boolean, default: false },
      at: { type: Date, default: null },
    },
    /** Customer refused the quote: order is cancelled and lives on in Orçamentos. */
    quoteRefusal: {
      quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', default: null },
      refusedAt: { type: Date, default: null },
      reason: { type: String, default: null },
    },
    assigneeEmployeeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    pdfUrl: { type: String, default: null },
    /**
     * When the create request includes photos that upload afterwards.
     * Email and the stored laudo wait until each item reaches `expected`,
     * or until the client calls notify-created after the uploads finish.
     */
    photoNotify: {
      expected: { type: [Number], default: undefined, set: setCountList },
      got: { type: [Number], default: undefined, set: setCountList },
      sent: { type: Boolean, default: false },
      /** false = someone saved a price and chose not to email the laudo. */
      approved: { type: Boolean },
    },
    notes: { type: String, default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

orderSchema.index({ shopId: 1, code: 1 }, { unique: true });
orderSchema.index({ shopId: 1, code: 1, publicToken: 1 });
orderSchema.index({ shopId: 1, currentSectorId: 1 });
orderSchema.index({ shopId: 1, 'items.currentSectorId': 1 });
orderSchema.index({ shopId: 1, createdAt: 1 });
orderSchema.index({ shopId: 1, dueAt: 1 });
orderSchema.index({ shopId: 1, status: 1 });
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, deletedAt: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, clientName: 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
