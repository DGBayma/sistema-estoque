const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: 'Token não fornecido' });

  const [, token] = authHeader.split(' ');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// Admin sempre tem acesso; user depende da permissão
function apenasAdmin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }
  next();
}

// Verifica permissão específica (adicionar, editar, excluir, relatorios)
function verificarPermissao(acao) {
  return (req, res, next) => {
    const u = req.usuario;
    if (!u) return res.status(401).json({ erro: 'Não autenticado' });

    // Admin ignora checagem (sempre pode)
    if (u.role === 'admin') return next();

    const mapa = {
      adicionar: 'pode_adicionar',
      editar: 'pode_editar',
      excluir: 'pode_excluir',
      relatorios: 'pode_relatorios',
    };

    const campo = mapa[acao];
    if (!campo) return res.status(500).json({ erro: 'Ação inválida' });

    if (u[campo] === true) return next();

    return res.status(403).json({ erro: `Sem permissão para ${acao}` });
  };
}

module.exports = { autenticar, apenasAdmin, verificarPermissao };