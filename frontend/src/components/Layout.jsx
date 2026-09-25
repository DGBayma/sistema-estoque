import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState(0);

  // Busca a contagem de mensagens pendentes (só admin)
  useEffect(() => {
    if (usuario?.role !== 'admin') return;

    async function carregarPendentes() {
      try {
        const { data } = await api.get('/api/contatos');
        setPendentes(data.filter((c) => !c.respondido).length);
      } catch (err) {
        // silencioso — pode ser que a rota não exista ainda
      }
    }

    carregarPendentes();
    const id = setInterval(carregarPendentes, 60000); // atualiza a cada 1 min
    return () => clearInterval(id);
  }, [usuario]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>📦 Estoque</h2>

        <nav>
          {/* -------- Seção principal -------- */}
          <NavLink to="/" end>📊 Dashboard</NavLink>
          <NavLink to="/produtos">📦 Produtos</NavLink>
          <NavLink to="/fornecedores">🏭 Fornecedores</NavLink>
          <NavLink to="/funcionarios">👥 Funcionários</NavLink>
          <NavLink to="/movimentacoes">🔄 Movimentações</NavLink>
          <NavLink to="/relatorios">📄 Relatórios</NavLink>

          {/* -------- Seção admin -------- */}
          {usuario?.role === 'admin' && (
            <>
              <div className="nav-separator">Administração</div>
              <NavLink to="/contatos" className="nav-with-badge">
                <span>📬 Mensagens</span>
                {pendentes > 0 && (
                  <span className="nav-badge">{pendentes}</span>
                )}
              </NavLink>
              <NavLink to="/usuarios">🔐 Usuários</NavLink>
              <NavLink to="/notificacoes">🔔 Notificações</NavLink>
            </>
          )}
        </nav>

        <div className="user-info">
          <strong>{usuario?.nome}</strong>
          <br />
          {usuario?.email}
          <br />
          <span className="badge badge-info">{usuario?.role}</span>
        </div>

        <button className="btn btn-danger btn-block" onClick={handleLogout}>
          Sair
        </button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}