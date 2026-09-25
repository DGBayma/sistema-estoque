import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Movimentacoes() {
  const [lista, setLista] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ produto_id: '', funcionario_id: '', tipo: 'entrada', quantidade: 1, observacao: '' });
  const [erro, setErro] = useState('');

  async function carregar() {
    const [m, p, f] = await Promise.all([
      api.get('/api/movimentacoes'),
      api.get('/api/produtos'),
      api.get('/api/funcionarios'),
    ]);
    setLista(m.data); setProdutos(p.data); setFuncionarios(f.data);
  }
  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault(); setErro('');
    try {
      await api.post('/api/movimentacoes', form);
      setAberto(false);
      setForm({ produto_id: '', funcionario_id: '', tipo: 'entrada', quantidade: 1, observacao: '' });
      carregar();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro'); }
  }

  return (
    <>
      <div className="toolbar">
        <h1>🔄 Movimentações</h1>
        <button className="btn btn-primary" onClick={() => { setAberto(true); setErro(''); }}>+ Nova Movimentação</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Funcionário</th><th>Observação</th></tr>
          </thead>
          <tbody>
            {lista.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.criado_em).toLocaleString('pt-BR')}</td>
                <td>{m.produto_nome}</td>
                <td>
                  {m.tipo === 'entrada'
                    ? <span className="badge badge-success">ENTRADA</span>
                    : <span className="badge badge-danger">SAÍDA</span>}
                </td>
                <td>{m.quantidade}</td>
                <td>{m.funcionario_nome || '-'}</td>
                <td>{m.observacao || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aberto && (
        <Modal titulo="Nova Movimentação" onClose={() => setAberto(false)}>
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group">
              <label>Produto</label>
              <select value={form.produto_id} onChange={(e) => setForm({ ...form, produto_id: e.target.value })} required>
                <option value="">Selecione...</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} (Qtd: {p.quantidade})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Funcionário</label>
              <select value={form.funcionario_id} onChange={(e) => setForm({ ...form, funcionario_id: e.target.value })}>
                <option value="">-- Nenhum --</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade</label>
              <input type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>Observação</label>
              <textarea rows="2" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setAberto(false)}>Cancelar</button>
              <button className="btn btn-primary">Registrar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
