const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '480m';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refreshchangeme';
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES || '7d';

const setoresValidos = [
  'Atendimento',
  'Sapataria',
  'Costura',
  'Lavagem',
  'Acabamento',
  'Pintura',
  'Atendimento (disparar whatsapp)',
];

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// Registro de usuário — preferir signup /api/v1; mantido para LEGADO
exports.register = async (req, res) => {
  const { email, password, nome, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios.' });
  const exists = await userService.getUserByEmail(email);
  if (exists) return res.status(409).json({ error: 'Usuário já existe.' });

  const user = await userService.createUser({ email, password, nome, role });
  res.status(201).json({ id: user.id, email: user.email, nome: user.nome, role: user.role, setor: 'Atendimento' });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios.' });
  const user = await userService.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

  const stored = user.passwordHash || user.password;
  const ok = await userService.verifyPassword(password, stored);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });

  // Rehash legado plaintext → bcrypt
  if (!userService.looksHashed(stored)) {
    try {
      const hash = await userService.hashPassword(password);
      await userService.updateUserPasswordHash(user.id, hash);
    } catch (err) {
      console.warn('[Auth] Falha ao rehash senha legada:', err.message);
    }
  }

  const token = signAccessToken(user);
  const refreshToken = jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

  res.status(200).json({ token, refreshToken, setor: 'Atendimento', role: user.role, nome: user.nome });
};

exports.updateSetor = async (req, res) => {
  const { userId, setor } = req.body;

  if (!setoresValidos.includes(setor)) {
    return res.status(400).json({ error: 'Setor inválido.' });
  }

  try {
    const user = await userService.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const updatedUser = { ...user, setor };

    if (setor === 'Atendimento (disparar whatsapp)') {
      console.log(`Notificação enviada para o WhatsApp do usuário ${user.nome}`);
    }

    res.status(200).json({ message: 'Setor atualizado com sucesso.', setor: updatedUser.setor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken obrigatório.' });

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await userService.getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });

    const token = signAccessToken(user);

    res.status(200).json({ token, setor: 'Atendimento', role: user.role });
  } catch (err) {
    res.status(401).json({ error: 'refreshToken inválido.' });
  }
};
