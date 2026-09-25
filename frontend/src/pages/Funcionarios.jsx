import { useEffect, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatarCPF, limparCPF, validarCPF } from '../utils/cpf';
import { formatarTelefone, validarTelefone } from '../utils/telefone';

const vazio = { nome: '', cpf: '', email: '', cargo: '', salario: 0, ativo: true };

export default function Funcionarios() {
  const [lista, setLista] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState('');
  const { pode } = useAuth();

  async function carregar() {
    const { data } = await api.get('/api/funcionarios');
    setLista(data);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm(vazio);
    setEditando('novo');
    setErro('');
  }

  function abrirEditar(f) {
    setForm({
      ...f,
      cpf: formatarCPF(f.cpf),
    });
    setEditando(f.id);
    setErro('');
  }

  function fechar() { setEditando(null); }

  async function salvar(e) {
    e.preventDefault();
    setErro('');

    // Validações antes de enviar
    if (!validarCPF(form.cpf)) {
      setErro('CPF inválido. Verifique os dígitos.');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErro('E-mail inválido.');
      return;
    }

    // Enviar CPF sem máscara para o backend (o banco tem UNIQUE)
    const payload = {
      ...form,
      cpf: limparCPF(form.cpf),
      salario: Number(form.salario) || 0,
    };

    try {
      if (editando === 'novo') {
        await api.post('/api/funcionarios', payload);
      } else {
        await api.put(`/api/funcionarios/${editando}`, payload);
      }
      fechar();
      carregar();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao salvar';
      // Traduz erro de duplicata do Postgres
      if (msg.includes('funcionarios_cpf_key')) {
        setErro('Já existe um funcionário com este CPF.');
      } else if (msg.includes('funcionarios_email_key')) {
        setErro('Já existe um funcionário com este e-mail.');
      } else {
        setErro(msg);
      }
    }
  }

  async function excluir(id) {
    if (!confirm('Excluir funcionário?')) return;
    try {
      await api.delete(`/api/funcionarios/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao excluir');
    }
  }

  // Handler específico para o campo CPF
  function handleCPFChange(e) {
    const formatado = formatarCPF(e.target.value);
    setForm({ ...form, cpf: formatado });
  }

  return (
    <>
      <div className="toolbar">
        <h1>👥 Funcionários</h1>
        {pode('adicionar') && (
          <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Funcionário</button>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Email</th>
              <th>Cargo</th>
              <th>Salário</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td>{f.nome}</td>
                <td>{formatarCPF(f.cpf)}</td>
                <td>{f.email}</td>
                <td>{f.cargo}</td>
                <td>R$ {Number(f.salario).toFixed(2)}</td>
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
                <td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: 30 }}>
                  Nenhum funcionário cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal
          titulo={editando === 'novo' ? 'Novo Funcionário' : 'Editar Funcionário'}
          onClose={fechar}
        >
          {erro && <div className="error">{erro}</div>}
          <form onSubmit={salvar}>
            <div className="form-group">
              <label>Nome *</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>CPF *</label>
              <input
                value={form.cpf}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
                required
                style={{
                  borderColor: form.cpf && !validarCPF(form.cpf) ? '#dc3545' : undefined,
                }}
              />
              {form.cpf && !validarCPF(form.cpf) && (
                <small style={{ color: '#dc3545', fontSize: 12 }}>
                  CPF inválido
                </small>
              )}
              {form.cpf && validarCPF(form.cpf) && (
                <small style={{ color: '#16a34a', fontSize: 12 }}>
                  ✓ CPF válido
                </small>
              )}
            </div>

            <div className="form-group">
              <label>E-mail *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Cargo *</label>
              <input
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Salário</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.salario}
                onChange={(e) => setForm({ ...form, salario: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />
                Ativo
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={fechar}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={!validarCPF(form.cpf)}>
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}