import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@estoque.com');
  const [senha, setSenha] = useState('admin123');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(''); setLoading(true);
    try { await login(email, senha); navigate('/'); }
    catch (err) { setErro(err.response?.data?.erro || 'Erro ao fazer login'); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>📦 Gerenciamento da Empresa</h1>
        <p>Faça login para continuar</p>
        {erro && <div className="error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          Não tem conta? <Link to="/registrar">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
