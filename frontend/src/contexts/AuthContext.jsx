import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('usuario');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  async function login(email, senha) {
    const { data } = await api.post('/api/auth/login', { email, senha });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
    return data;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }

  // Atualiza o usuário local (após admin editar permissões dele mesmo, por ex)
  function atualizarUsuario(novo) {
    localStorage.setItem('usuario', JSON.stringify(novo));
    setUsuario(novo);
  }

  // Helper: pode('adicionar') | pode('editar') | pode('excluir') | pode('relatorios')
  function pode(acao) {
    if (!usuario) return false;
    if (usuario.role === 'admin') return true; // admin sempre pode
    const mapa = {
      adicionar: 'pode_adicionar',
      editar: 'pode_editar',
      excluir: 'pode_excluir',
      relatorios: 'pode_relatorios',
    };
    return usuario[mapa[acao]] === true;
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, logado: !!token, pode, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);