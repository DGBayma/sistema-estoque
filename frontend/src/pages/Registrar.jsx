import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Registrar() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault(); setErro('');
    try {
      await api.post('/api/auth/registrar', form);
      alert('Usuário criado! Faça login.');
      navigate('/login');
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao registrar'); }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>📝 Criar Conta</h1>
        <p>Preencha os dados abaixo</p>
        {erro && <div className="error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Nome</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
          <div className="form-group"><label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="form-group"><label>Senha</label>
            <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required /></div>
          <button className="btn btn-primary btn-block">Registrar</button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
