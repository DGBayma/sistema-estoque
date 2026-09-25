import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const vazio = {
  nome: '', email: '', senha: '', role: 'user',
  pode_adicionar: false, pode_editar: false,
  pode_excluir: false, pode_relatorios: false,
};

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState('');
  const { usuario } = useAuth();

  async function carregar() {
    const { data } = await api.get('/api/auth/usuarios');
    setLista(data);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() { setForm(vazio); setEditando('novo'); setErro(''); }
  function abrirEditar(u) { setForm({ ...u, senha: '' }); setEditando(u.id); setErro(''); }
  function fechar() { setEditando(null); }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    const payload = { ...form };
    if (editando !== 'novo' && !payload.senha) delete payload.senha;
    try {
      if (editando === 'novo') await api.post('/api/auth/registrar', payload);
      else await api.put(`/api/auth/usuarios/${editando}`, payload);
      fechar(); carregar();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
  }

  async function excluir(id) {
    if (!confirm('Excluir usuário?')) return;
    try { await api.delete(`/api/auth/usuarios/${id}`); carregar(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  }

  function togglePerm(campo) {
    setForm((f) => ({ ...f, [campo]: !f[campo] }));
  }

  return (
    <>
      <div className="toolbar">
        <h1>👤 Usuários e Permissões</h1>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Usuário</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
              <th style={{ textAlign: 'center' }}>Adicionar</th>
              <th style={{ textAlign: 'center' }}>Editar</th>
              <th style={{ textAlign: 'center' }}>Excluir</th>
              <th style={{ textAlign: 'center' }}>Relatórios</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-warning'}`}>
                    {u.role}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>{u.pode_adicionar ? '✅' : '—'}</td>
                <td style={{ textAlign: 'center' }}>{u.pode_editar ? '✅' : '—'}</td>
                <td style={{ textAlign: 'center' }}>{u.pode_excluir ? '✅' : '—'}</td>
                <td style={{ textAlign: 'center' }}>{u.pode_relatorios ? '✅' : '—'}</td>
                <td>
                  <button
                    className="btn btn-secondary"
                    style={{ marginRight: 6, padding: '6px 12px', fontSize: 12 }}
                    onClick={() => abrirEditar(u)}
                  >Editar</button>
                  {u.id !== usuario?.id && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => excluir(u.id)}
                    >Excluir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal
          titulo={editando === 'novo' ? 'Novo Usuário' : 'Editar Usuário'}
          onClose={fechar}
        >
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group">
              <label>Nome</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{editando === 'novo' ? 'Senha' : 'Nova senha (deixe em branco para manter)'}</label>
              <input type="password" value={form.senha || ''}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                required={editando === 'novo'} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">user</option>
                <option value="admin">admin (acesso total)</option>
              </select>
            </div>

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Permissões {form.role === 'admin' && <span style={{ color: '#999', fontWeight: 400 }}>(admin já tem todas)</span>}
              </label>

              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.pode_adicionar}
                    onChange={() => togglePerm('pode_adicionar')}
                    disabled={form.role === 'admin'} />
                  ✏️ Pode <strong>adicionar</strong> (criar registros)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.pode_editar}
                    onChange={() => togglePerm('pode_editar')}
                    disabled={form.role === 'admin'} />
                  📝 Pode <strong>editar</strong> registros
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.pode_excluir}
                    onChange={() => togglePerm('pode_excluir')}
                    disabled={form.role === 'admin'} />
                  🗑️ Pode <strong>excluir</strong> registros
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.pode_relatorios}
                    onChange={() => togglePerm('pode_relatorios')}
                    disabled={form.role === 'admin'} />
                  📄 Pode gerar <strong>relatórios</strong> (PDF/Excel)
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={fechar}>Cancelar</button>
              <button className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}