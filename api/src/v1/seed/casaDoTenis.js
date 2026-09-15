require('dotenv').config();
const { connectMongo } = require('../db/mongo');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Membership = require('../models/Membership');
const Sector = require('../models/Sector');
const Subscription = require('../models/Subscription');
const ServiceCatalog = require('../models/ServiceCatalog');
const { hashPassword } = require('../services/authService');

const LEGACY_SECTORS = [
  { name: 'Atendimento', slug: 'atendimento', order: 1, color: '#2196F3', isTerminal: false },
  { name: 'Sapataria', slug: 'sapataria', order: 2, color: '#FF9800', isTerminal: false },
  { name: 'Costura', slug: 'costura', order: 3, color: '#9C27B0', isTerminal: false },
  { name: 'Lavagem', slug: 'lavagem', order: 4, color: '#00BCD4', isTerminal: false },
  { name: 'Acabamento', slug: 'acabamento', order: 5, color: '#4CAF50', isTerminal: false },
  { name: 'Pintura', slug: 'pintura', order: 6, color: '#F44336', isTerminal: false },
  {
    name: 'Atendimento final',
    slug: 'atendimento-final',
    order: 7,
    color: '#4CAF50',
    isTerminal: true,
  },
];

const DEFAULT_SERVICES = [
  { name: 'Limpeza Simples', defaultPrice: 30, sortOrder: 1 },
  { name: 'Limpeza Completa', defaultPrice: 50, sortOrder: 2 },
  { name: 'Restauração', defaultPrice: 80, sortOrder: 3 },
  { name: 'Reparo', defaultPrice: 40, sortOrder: 4 },
  { name: 'Customização', defaultPrice: 120, sortOrder: 5 },
  { name: 'Pintura', defaultPrice: 60, sortOrder: 6 },
  { name: 'Troca de Sola', defaultPrice: 70, sortOrder: 7 },
  { name: 'Costura', defaultPrice: 35, sortOrder: 8 },
];

async function ensureServices(shopId) {
  const count = await ServiceCatalog.countDocuments({ shopId });
  if (count > 0) return;
  await ServiceCatalog.insertMany(
    DEFAULT_SERVICES.map((s) => ({
      shopId,
      name: s.name,
      defaultPrice: s.defaultPrice,
      sortOrder: s.sortOrder,
      active: true,
      sectorPathHint: [],
    }))
  );
  console.log('[seed] Seeded service catalog');
}

async function seedCasaDoTenis() {
  const existing = await Shop.findOne({ slug: 'casa-do-tenis' });
  if (existing) {
    console.log('[seed] Shop casa-do-tenis already exists — ensuring services');
    await ensureServices(existing._id);
    return { skipped: true, shopId: existing._id };
  }

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@worqera.local').toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const name = process.env.SEED_ADMIN_NAME || 'Admin Casa do Tênis';

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      passwordHash: await hashPassword(password),
      name,
    });
    console.log('[seed] Created admin user', email);
  } else {
    console.log('[seed] Reusing existing user', email);
  }

  const shop = await Shop.create({
    name: 'Casa do Tênis',
    slug: 'casa-do-tenis',
    status: 'active',
    branding: {
      displayName: 'Casa do Tênis',
      emailFromName: 'Casa do Tênis',
      legacyBrand: 'casa-do-tenis',
    },
    timezone: 'America/Sao_Paulo',
    onboarding: { completedAt: new Date(), lastDigestAt: null },
  });

  await Membership.create({
    userId: user._id,
    shopId: shop._id,
    role: 'owner',
    sectorIds: [],
    active: true,
  });

  await Subscription.create({
    shopId: shop._id,
    planCode: 'WORQERA_PRO',
    status: 'active',
    provider: 'Manual',
    trialEndsAt: null,
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  await Sector.insertMany(
    LEGACY_SECTORS.map((s) => ({
      shopId: shop._id,
      ...s,
      active: true,
    }))
  );

  await ensureServices(shop._id);

  console.log('[seed] Created shop casa-do-tenis with legacy sectors');
  console.log('[seed] Login:', email, '/', password);
  return { skipped: false, shopId: shop._id, email };
}

async function main() {
  await connectMongo();
  await seedCasaDoTenis();
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
}

module.exports = { seedCasaDoTenis };
