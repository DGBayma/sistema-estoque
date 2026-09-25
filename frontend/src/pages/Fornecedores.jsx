import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const vazio = {
  nome: '', cnpj: '', email: '', telefone: '',
  endereco: '', observacoes: '', ativo: true,
};

export default function Fornecedores() {
  const [lista, setLista] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState('');
  const { pode } = useAuth();

  async function carregar() {
    const { data } = await api.get('/api/fornecedores');
    setLista(data);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() { setForm(vazio); setEditando('novo'); setErro(''); }
  function abrirEditar(f) { setForm(f); setEditando(f.id); setErro(''); }
  function fechar() { setEditando(null); }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    try {
      if (editando === 'novo') await api.post('/api/fornecedores', form);
      else await api.put(`/api/fornecedores/${editando}`, form);
      fechar(); carregar();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
  }

  async function excluir(id) {
    if (!confirm('Excluir fornecedor?')) return;
    try { await api.delete(`/api/fornecedores/${id}`); carregar(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  }

  return (
    <>
      <div className="toolbar">
        <h1>🏭 Fornecedores</h1>
        {pode('adicionar') && (
          <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Fornecedor</button>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CNPJ</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td>{f.nome}</td>
                <td>{f.cnpj || '-'}</td>
                <td>{f.email || '-'}</td>
                <td>{f.telefone || '-'}</td>
                <td>
                  {f.ativo
                    ? <span className="badge badge-success">Ativo</span>
                    : <span className="badge badge-danger">Inativo</span>}
                </td>
                <td>
                  {pode('editar') && (
                    <button
                      className="btn btn-secondary"
                      style={{ marginRight: 6, padding: '6px 12px', fontSize: 12 }}
                      onClick={() => abrirEditar(f)}
                    >Editar</button>
                  )}
                  {pode('excluir') && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => excluir(f.id)}
                    >Excluir</button>
                  )}
                  {!pode('editar') && !pode('excluir') && (
                    <span style={{ color: '#999', fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#999', padding: 30 }}>
                  Nenhum fornecedor cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal
          titulo={editando === 'novo' ? 'Novo Fornecedor' : 'Editar Fornecedor'}
          onClose={fechar}
        >
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group">
              <label>Nome *</label>
              <input value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>CNPJ</label>
                <input value={form.cnpj || ''}
                  placeholder="00.000.000/0000-00"
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input value={form.telefone || ''}
                  placeholder="(11) 99999-9999"
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Endereço</label>
              <input value={form.endereco || ''}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Observações</label>
              <textarea rows="2" value={form.observacoes || ''}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>

            <div className="form-group">
              <label>
                <input type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                {' '}Ativo
              </label>
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