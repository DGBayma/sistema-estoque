import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Notificacoes() {
  const [dados, setDados] = useState({
    total: 0, pendentes: 0, enviados: 0, erros: 0,
    smtp_configurado: false, itens: [],
  });
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');

  async function carregar() {
    try {
      const { data } = await api.get('/api/notificacoes');
      setDados(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 30000);
    return () => clearInterval(id);
  }, []);

  async function disparar() {
    if (!confirm(`Enviar e-mail para ${dados.pendentes} pessoa(s)?`)) return;
    setEnviando(true);
    setMsg('');
    try {
      const { data } = await api.post('/api/notify-send');
      setMsg(`✅ Enviados: ${data.enviados} · Falhas: ${data.falhas}`);
      carregar();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.erro || err.message}`);
    } finally {
      setEnviando(false);
      setTimeout(() => setMsg(''), 8000);
    }
  }

  async function excluir(id) {
    if (!confirm('Remover este e-mail da lista?')) return;
    try {
      await api.delete(`/api/notificacoes/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro');
    }
  }

  return (
    <>
      <h1>🔔 Notificações Agendadas</h1>

      {!dados.smtp_configurado && (
        <div className="error" style={{ marginBottom: 16 }}>
          ⚠️ SMTP não configurado no backend. Os e-mails serão apenas registrados no log.
          Configure as variáveis <code>SMTP_*</code> no <code>docker-compose.yml</code>.
        </div>
      )}

      {msg && (
        <div style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da',
          color: msg.startsWith('✅') ? '#155724' : '#721c24',
          borderRadius: 8,
          marginBottom: 16,
        }}>
          {msg}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total</h3>
          <div className="value">{dados.total}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <h3>Pendentes</h3>
          <div className="value">{dados.pendentes}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#16a34a' }}>
          <h3>Enviados</h3>
          <div className="value">{dados.enviados}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#dc2626' }}>
          <h3>Erros</h3>
          <div className="value">{dados.erros}</div>
        </div>
      </div>

      <div className="toolbar">
        <p style={{ color: '#666', fontSize: 14 }}>
          Pessoas que pediram para ser avisadas quando o sistema voltar.
        </p>
        <button
          className="btn btn-primary"
          onClick={disparar}
          disabled={dados.pendentes === 0 || enviando}
        >
          {enviando ? 'Enviando...' : `📤 Enviar para ${dados.pendentes} pessoa(s)`}
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Enviado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {dados.itens.map((n) => (
              <tr key={n.id}>
                <td>{n.email}</td>
                <td><span className="badge badge-info">{n.origem}</span></td>
                <td>
                  {n.status === 'pendente' && <span className="badge badge-warning">Pendente</span>}
                  {n.status === 'enviado' && <span className="badge badge-success">Enviado</span>}
                  {n.status === 'erro' && (
                    <span className="badge badge-danger" title={n.erro}>Erro</span>
                  )}
                </td>
                <td>{new Date(n.criado_em).toLocaleString('pt-BR')}</td>
                <td>{n.enviado_em ? new Date(n.enviado_em).toLocaleString('pt-BR') : '-'}</td>
                <td>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => excluir(n.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {dados.itens.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: 30 }}>
                  Nenhum e-mail agendado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}