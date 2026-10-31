const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    /**
     * Business vertical — drives default copy/nouns. Seed CdT uses footwear;
     * new signups default to general so Worqera is not sneaker-only.
     */
    vertical: {
      type: String,
      enum: ['general', 'footwear', 'laundry', 'repair', 'auto', 'carpentry', 'printing', 'production', 'custom'],
      default: 'general',
    },
    /**
     * receive = the client leaves an item (tênis, roupa, equipamento, carro) and takes it back.
     * produce = the shop makes or installs something (marcenaria, gráfica, sob encomenda): no item comes in.
     */
    workflow: { type: String, enum: ['receive', 'produce'], default: 'receive' },
    branding: {
      displayName: { type: String, default: '' },
      emailFromName: { type: String, default: '' },
      legacyBrand: { type: String, default: null },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
      /** Google (or other) review link offered to customers who rate 4 or 5. */
      reviewUrl: { type: String, default: '' },
      primaryColor: { type: String, default: '' },
      accentColor: { type: String, default: '' },
      /** Noun for the physical item on the order (peça, tênis, roupa…). */
      itemLabel: { type: String, default: 'peça' },
      itemLabelPlural: { type: String, default: 'peças' },
    },
    /** Platform-only free-text note (objeção, PIX, plano). */
    adminNote: { type: String, default: '' },
    /** Platform badge shown in the shop shell. Empty = none. */
    seal: {
      type: String,
      enum: ['', 'verificado', 'destaque', 'parceiro'],
      default: '',
    },
    tvSettings: {
      client: {
        title: { type: String, default: '' },
        showLogo: { type: Boolean, default: true },
        tilesPerPage: { type: Number, default: 6 },
        refreshMs: { type: Number, default: 30000 },
        carouselMs: { type: Number, default: 8000 },
      },
      floor: {
        title: { type: String, default: '' },
        sectorIds: { type: [String], default: [] },
        hotOnlyDefault: { type: Boolean, default: false },
        overdueHours: { type: Number, default: 24 },
        refreshMs: { type: Number, default: 15000 },
      },
    },
    notifications: {
      whatsapp: {
        enabled: { type: Boolean, default: false },
        shopPhoneE164: { type: String, default: '' },
        templates: {
          created: { type: String, default: '' },
          moved: { type: String, default: '' },
          ready: { type: String, default: '' },
          publicLink: { type: String, default: '' },
        },
        /** When the system offers a WhatsApp message. Fewer sends keep the shop number safe; "moved" starts off. */
        events: {
          created: { type: Boolean, default: true },
          moved: { type: Boolean, default: false },
          ready: { type: Boolean, default: true },
        },
      },
      email: {
        /** Master switch for client order-status emails */
        enabled: { type: Boolean, default: true },
      },
    },
    /** AI uses per month. Empty = plan default; extra* = granted by Worqera for one month. */
    aiQuota: {
      monthlyCap: { type: Number, default: null },
      extraMonth: { type: String, default: '' },
      extraCalls: { type: Number, default: 0 },
    },
    /** Who pays the Worqera subscription. Asaas needs a CPF or CNPJ to issue the charge. */
    billing: {
      cpfCnpj: { type: String, default: null },
    },
    /**
     * Official WhatsApp (Cloud API). Worqera is the Tech Provider; Eduardo's card
     * pays Meta on this WABA and Worqera passes the cost on (Business pack + overage).
     */
    whatsappCloud: {
      status: {
        type: String,
        enum: ['off', 'pending', 'connected', 'paused'],
        default: 'off',
      },
      wabaId: { type: String, default: '' },
      phoneNumberId: { type: String, default: '' },
      displayPhone: { type: String, default: '' },
      verifiedName: { type: String, default: '' },
      /** AES-GCM encrypted business token. Never serialized. */
      tokenEnc: { type: String, default: '' },
      currency: { type: String, default: 'BRL' },
      /** Set by the Worqera admin after the card is on the WABA. */
      paymentOk: { type: Boolean, default: false },
      pausedReason: { type: String, default: '' },
      /** Send "pedido pronto" when the whole order reaches the final sector. */
      autoReady: { type: Boolean, default: false },
      /** The shop declares it asks the customer at the counter (required to send). */
      consentAtCounter: { type: Boolean, default: false },
      templates: { type: [mongoose.Schema.Types.Mixed], default: [] },
      connectedAt: { type: Date, default: null },
      /** Overage of the last closed month, billed after it ends. */
      overage: {
        month: { type: String, default: '' },
        amountBrl: { type: Number, default: 0 },
        since: { type: Date, default: null },
        paidAt: { type: Date, default: null },
      },
      /** Extra cap granted by the Worqera admin for the current month (multiplier on the pack). */
      capBoostMonth: { type: String, default: '' },
    },
    partnerCode: { type: String, default: null, trim: true, uppercase: true },
    referredByPartnerCode: { type: String, default: null, trim: true, uppercase: true },
    timezone: { type: String, default: 'America/Sao_Paulo' },
    onboarding: {
      completedAt: { type: Date, default: null },
      lastDigestAt: { type: Date, default: null },
      lastWeeklyDigestAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

shopSchema.index({ slug: 1 }, { unique: true });
shopSchema.index(
  { partnerCode: 1 },
  { unique: true, partialFilterExpression: { partnerCode: { $type: 'string' } } }
);

shopSchema.index({ createdAt: 1 });

module.exports = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
