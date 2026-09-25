import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Contatos() {
  const [contatos, setContatos] = useState([]);
  const [filtro, setFiltro] = useState('todos'); // todos | pendentes | respondidos

  async function carregar() {
    const { data } = await api.get('/api/contatos');
    setContatos(data);
  }

  useEffect(() => { carregar(); }, []);

  async function alternarRespondido(c) {
    try {
      await api.put(`/api/contatos/${c.id}/respondido`, { respondido: !c.respondido });
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro');
    }
  }

  async function excluir(id) {
    if (!confirm('Excluir este contato?')) return;
    try {
      await api.delete(`/api/contatos/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro');
    }
  }

  const filtrados = contatos.filter((c) => {
    if (filtro === 'pendentes') return !c.respondido;
    if (filtro === 'respondidos') return c.respondido;
    return true;
  });

  const totalPendentes = contatos.filter((c) => !c.respondido).length;

  return (
    <>
      <div className="toolbar">
        <h1>📬 Mensagens de Contato {totalPendentes > 0 && (
          <span className="badge badge-danger" style={{ marginLeft: 8 }}>
            {totalPendentes} pendente{totalPendentes > 1 ? 's' : ''}
          </span>
        )}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${filtro === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => setFiltro('todos')}
          >
            Todos ({contatos.length})
          </button>
          <button
            className={`btn ${filtro === 'pendentes' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => setFiltro('pendentes')}
          >
            Pendentes ({totalPendentes})
          </button>
          <button
            className={`btn ${filtro === 'respondidos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => setFiltro('respondidos')}
          >
            Respondidos ({contatos.length - totalPendentes})
          </button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Nome</th>
              <th>Email</th>
              <th>Mensagem</th>
              <th>Origem</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => (
              <tr key={c.id} style={{ opacity: c.respondido ? 0.55 : 1 }}>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: c.respondido ? '#16a34a' : '#dc2626',
                    }}
                    title={c.respondido ? 'Respondido' : 'Pendente'}
                  />
                </td>
                <td>{c.nome}</td>
                <td>
                  <a href={`mailto:${c.email}`} style={{ color: '#0b3d91' }}>
                    {c.email}
                  </a>
                </td>
                <td style={{ maxWidth: 300 }}>{c.mensagem}</td>
                <td>
                  <span className="badge badge-info">{c.origem || '-'}</span>
                </td>
                <td>{new Date(c.criado_em).toLocaleString('pt-BR')}</td>
                <td>
                  <button
                    className="btn btn-secondary"
                    style={{ marginRight: 6, padding: '6px 12px', fontSize: 12 }}
                    onClick={() => alternarRespondido(c)}
                  >
                    {c.respondido ? 'Reabrir' : 'Marcar OK'}
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => excluir(c.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: 30 }}>
                  {filtro === 'pendentes'
                    ? 'Nenhuma mensagem pendente. Tudo em dia! 🎉'
                    : filtro === 'respondidos'
                    ? 'Nenhuma mensagem respondida ainda.'
                    : 'Nenhuma mensagem recebida ainda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}