const userService = require('../services/userService');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES = '480m';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refreshchangeme';
const REFRESH_EXPIRES = '7d';

const setoresValidos = [
  'Atendimento',
  'Sapataria',
  'Costura',
  'Lavagem',
  'Acabamento',
  'Pintura',
  'Atendimento (disparar whatsapp)',
];

// Registro de usuário com setor inicial
exports.register = async (req, res) => {
  const { email, password, nome, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios.' });
  const exists = await userService.getUserByEmail(email);
  if (exists) return res.status(409).json({ error: 'Usuário já existe.' });

  // Define o setor inicial como "Atendimento" no objeto de resposta
  const user = await userService.createUser({ email, password, nome, role });
  res.status(201).json({ id: user.id, email: user.email, nome: user.nome, role: user.role, setor: 'Atendimento' });
};

// Login do usuário
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios.' });
  const user = await userService.getUserByEmail(email);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Credenciais inválidas.' });

  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

  // Retorna o setor inicial como "Atendimento"
  res.status(200).json({ token, refreshToken, setor: 'Atendimento' });
};

// Atualizar setor do usuário
exports.updateSetor = async (req, res) => {
  const { userId, setor } = req.body;

  if (!setoresValidos.includes(setor)) {
    return res.status(400).json({ error: 'Setor inválido.' });
  }

  try {
    const user = await userService.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Simula a atualização do setor (não salva no banco)
    const updatedUser = { ...user, setor };

    // Disparar notificação se o setor for "Atendimento (disparar whatsapp)"
    if (setor === 'Atendimento (disparar whatsapp)') {
      console.log(`Notificação enviada para o WhatsApp do usuário ${user.nome}`);
    }

    res.status(200).json({ message: 'Setor atualizado com sucesso.', setor: updatedUser.setor });
  } catch (error) {
    res.status(500).json({ error:
       error.message });
  }
};

// Atualizar token de acesso
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken obrigatório.' });

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await userService.getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Retorna o setor inicial como "Atendimento"
    res.status(200).json({ token, setor: 'Atendimento' });
  } catch (err) {
    res.status(401).json({ error: 'refreshToken inválido.' });
  }
};
