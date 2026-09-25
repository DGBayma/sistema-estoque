import { useEffect, useState } from 'react';
import api, { API_URL } from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const vazio = {
  nome: '',
  descricao: '',
  sku: '',
  categoria: '',
  preco_custo: 0,
  quantidade: 0,
  estoque_minimo: 5,
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [imagem, setImagem] = useState(null);
  const [preview, setPreview] = useState('');
  const [erro, setErro] = useState('');
  const { pode } = useAuth();

  async function carregar() {
    const { data } = await api.get('/api/produtos');
    setProdutos(data);
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm(vazio);
    setImagem(null);
    setPreview('');
    setEditando('novo');
    setErro('');
  }

  function abrirEditar(p) {
    setForm(p);
    setImagem(null);
    setPreview(p.imagem ? `${API_URL}/uploads/${p.imagem}` : '');
    setEditando(p.id);
    setErro('');
  }

  function fechar() { setEditando(null); }

  function selecionarImagem(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImagem(file);
    setPreview(URL.createObjectURL(file));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== 'imagem') fd.append(k, v);
    });
    if (imagem) fd.append('imagem', imagem);

    try {
      if (editando === 'novo') await api.post('/api/produtos', fd);
      else await api.put(`/api/produtos/${editando}`, fd);
      fechar();
      carregar();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar');
    }
  }

  async function excluir(id) {
    if (!confirm('Excluir produto?')) return;
    try {
      await api.delete(`/api/produtos/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao excluir');
    }
  }

  return (
    <>
      <div className="toolbar">
        <h1>📦 Produtos</h1>
        {pode('adicionar') && (
          <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Produto</button>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>SKU</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Qtd</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.imagem ? (
                    <img
                      src={`${API_URL}/uploads/${p.imagem}`}
                      alt={p.nome}
                      className="img-thumb"
                    />
                  ) : (
                    <div
                      className="img-thumb"
                      style={{
                        background: '#eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: '#999',
                      }}
                    >
                      N/A
                    </div>
                  )}
                </td>
                <td>{p.sku}</td>
                <td>{p.nome}</td>
                <td>{p.categoria || '-'}</td>
                <td>{p.quantidade}</td>
                <td>
                  {p.quantidade <= p.estoque_minimo
                    ? <span className="badge badge-danger">Baixo</span>
                    : <span className="badge badge-success">OK</span>}
                </td>
                <td>
                  {pode('editar') && (
                    <button
                      className="btn btn-secondary"
                      style={{ marginRight: 6, padding: '6px 12px', fontSize: 12 }}
                      onClick={() => abrirEditar(p)}
                    >
                      Editar
                    </button>
                  )}
                  {pode('excluir') && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => excluir(p.id)}
                    >
                      Excluir
                    </button>
                  )}
                  {!pode('editar') && !pode('excluir') && (
                    <span style={{ color: '#999', fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {produtos.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: 30 }}>
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal
          titulo={editando === 'novo' ? 'Novo Produto' : 'Editar Produto'}
          onClose={fechar}
        >
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group">
              <label>Nome</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>SKU</label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <input
                value={form.categoria || ''}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                rows="2"
                value={form.descricao || ''}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Preço Custo</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.preco_custo}
                  onChange={(e) => setForm({ ...form, preco_custo: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Quantidade</label>
                <input
                  type="number"
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Estoque Mínimo</label>
                <input
                  type="number"
                  value={form.estoque_minimo}
                  onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Imagem (jpg/png/webp até 5MB)</label>
              <input type="file" accept="image/*" onChange={selecionarImagem} />
            </div>
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="img-preview"
                style={{ marginBottom: 12 }}
              />
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={fechar}>
                Cancelar
              </button>
              <button className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}