import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const vazio = { nome: '', cpf: '', email: '', cargo: '', salario: 0, ativo: true };

export default function Funcionarios() {
  const [lista, setLista] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState('');
  const { usuario } = useAuth();

  async function carregar() {
    const { data } = await api.get('/api/funcionarios');
    setLista(data);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() { setForm(vazio); setEditando('novo'); setErro(''); }
  function abrirEditar(f) { setForm(f); setEditando(f.id); setErro(''); }
  function fechar() { setEditando(null); }

  async function salvar(e) {
    e.preventDefault();
    try {
      if (editando === 'novo') await api.post('/api/funcionarios', form);
      else await api.put(`/api/funcionarios/${editando}`, form);
      fechar(); carregar();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
  }

  async function excluir(id) {
    if (!confirm('Excluir funcionário?')) return;
    try { await api.delete(`/api/funcionarios/${id}`); carregar(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  }

  return (
    <>
      <div className="toolbar">
        <h1>👥 Funcionários</h1>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Funcionário</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Nome</th><th>CPF</th><th>Email</th><th>Cargo</th><th>Salário</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td>{f.nome}</td>
                <td>{f.cpf}</td>
                <td>{f.email}</td>
                <td>{f.cargo}</td>
                <td>R$ {Number(f.salario).toFixed(2)}</td>
                <td>{f.ativo ? <span className="badge badge-success">Ativo</span> : <span className="badge badge-danger">Inativo</span>}</td>
                <td>
                  <button className="btn btn-secondary" style={{ marginRight: 6, padding: '6px 12px', fontSize: 12 }} onClick={() => abrirEditar(f)}>Editar</button>
                  {usuario?.role === 'admin' && (
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => excluir(f.id)}>Excluir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal titulo={editando === 'novo' ? 'Novo Funcionário' : 'Editar Funcionário'} onClose={fechar}>
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group"><label>Nome</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="form-group"><label>CPF</label><input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="form-group"><label>Cargo</label><input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} required /></div>
            <div className="form-group"><label>Salário</label><input type="number" step="0.01" value={form.salario} onChange={(e) => setForm({ ...form, salario: e.target.value })} /></div>
            <div className="form-group">
              <label><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label>
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
