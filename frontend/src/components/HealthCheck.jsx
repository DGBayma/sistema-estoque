import { useEffect, useState } from 'react';
import api from '../services/api';

export default function HealthCheck({ children }) {
  const [online, setOnline] = useState(true);
  const [verificando, setVerificando] = useState(true);

  async function checar() {
    try {
      await api.get('/', { timeout: 5000 });
      setOnline(true);
    } catch (err) {
      setOnline(false);
    } finally {
      setVerificando(false);
    }
  }

  useEffect(() => {
    checar();
    const id = setInterval(checar, 30000); // checa a cada 30s
    return () => clearInterval(id);
  }, []);

  if (verificando) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f6fa',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#666',
      }}>
        Verificando sistema...
      </div>
    );
  }

  if (!online) {
    window.location.href = '/manutencao.html';
    return null;
  }

  return children;
}