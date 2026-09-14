const funcionarioService = require('../services/funcionarioService');
const setorService = require('../services/setorService');

exports.listFuncionarios = async (req, res) => {
  try {
    const { setorId, ativo, limit } = req.query || {};
    const funcionarios = await funcionarioService.listFuncionarios({ setorId, ativo, limit });
    res.status(200).json({ success: true, data: funcionarios });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFuncionario = async (req, res) => {
  try {
    const funcionario = await funcionarioService.getFuncionario(req.params.id);
    if (!funcionario) {
      return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    }
    res.status(200).json({ success: true, data: funcionario });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createFuncionario = async (req, res) => {
  try {
    const { nome, setorId, email, telefone, cargo, observacoes, ativo } = req.body || {};

    if (!nome || !setorId) {
      return res.status(400).json({ success: false, error: 'nome e setorId são obrigatórios' });
    }

    const setor = setorService.getSetor(setorId);
    if (!setor) {
      return res.status(400).json({ success: false, error: 'setorId inválido' });
    }

    const novo = await funcionarioService.createFuncionario({ nome, setorId, email, telefone, cargo, observacoes, ativo });
    res.status(201).json({ success: true, data: novo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateFuncionario = async (req, res) => {
  try {
    const updates = { ...(req.body || {}) };

    if (updates.setorId) {
      const setor = setorService.getSetor(updates.setorId);
      if (!setor) {
        return res.status(400).json({ success: false, error: 'setorId inválido' });
      }
    }

    const atualizado = await funcionarioService.updateFuncionario(req.params.id, updates);
    if (!atualizado) {
      return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    }

    res.status(200).json({ success: true, data: atualizado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteFuncionario = async (req, res) => {
  try {
    const deletado = await funcionarioService.softDeleteFuncionario(req.params.id);
    if (!deletado) {
      return res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
    }

    res.status(200).json({ success: true, data: deletado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
