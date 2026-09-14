const dashboardService = require('../services/dashboardService');

// GET /dashboard - Obter dados do dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Obter o ID do usuário do token JWT (sub é o campo padrão para user ID no JWT)
    const userId = req.user?.sub;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Buscar dados do dashboard
    const dashboardData = await dashboardService.getDashboardData(userId);

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};