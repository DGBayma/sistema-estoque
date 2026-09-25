import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Registrar from './pages/Registrar';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Funcionarios from './pages/Funcionarios';
import Movimentacoes from './pages/Movimentacoes';
import Relatorios from './pages/Relatorios';
import Fornecedores from './pages/Fornecedores';
import Usuarios from './pages/Usuarios';
import Contatos from './pages/Contatos';
import Notificacoes from './pages/Notificacoes';

function RotaProtegida({ children }) {
  const { logado } = useAuth();
  return logado ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registrar" element={<Registrar />} />
      <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
      <Route path="/produtos" element={<RotaProtegida><Produtos /></RotaProtegida>} />
      <Route path="/funcionarios" element={<RotaProtegida><Funcionarios /></RotaProtegida>} />
      <Route path="/movimentacoes" element={<RotaProtegida><Movimentacoes /></RotaProtegida>} />
      <Route path="/relatorios" element={<RotaProtegida><Relatorios /></RotaProtegida>} />
      <Route path="/fornecedores" element={<RotaProtegida><Fornecedores /></RotaProtegida>} />
      <Route path="/usuarios" element={<RotaProtegida><Usuarios /></RotaProtegida>} />
      <Route path="/contatos" element={<RotaProtegida><Contatos /></RotaProtegida>} />
      <Route path="/notificacoes" element={<RotaProtegida><Notificacoes /></RotaProtegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>    
    
  );
}
