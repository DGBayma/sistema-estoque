import { useState } from 'react';
import { API_URL } from '../services/api';

export default function Relatorios() {
  const [baixando, setBaixando] = useState('');

  async function baixar(endpoint, nome) {
    setBaixando(endpoint);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao gerar arquivo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nome; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert(err.message); }
    finally { setBaixando(''); }
  }

  const grupos = [
    {
      titulo: '📦 Produtos',
      itens: [
        { label: 'PDF', endpoint: '/api/relatorios/produtos', nome: 'produtos.pdf', cor: 'btn-danger' },
        { label: 'Excel', endpoint: '/api/relatorios/excel/produtos', nome: 'produtos.xlsx', cor: 'btn-success' },
      ],
    },
    {
      titulo: '👥 Funcionários',
      itens: [
        { label: 'PDF', endpoint: '/api/relatorios/funcionarios', nome: 'funcionarios.pdf', cor: 'btn-danger' },
        { label: 'Excel', endpoint: '/api/relatorios/excel/funcionarios', nome: 'funcionarios.xlsx', cor: 'btn-success' },
      ],
    },
    {
      titulo: '🔄 Movimentações',
      itens: [
        { label: 'PDF', endpoint: '/api/relatorios/movimentacoes', nome: 'movimentacoes.pdf', cor: 'btn-danger' },
        { label: 'Excel', endpoint: '/api/relatorios/excel/movimentacoes', nome: 'movimentacoes.xlsx', cor: 'btn-success' },
      ],
    },
  ];

  return (
    <>
      <h1>📄 Relatórios</h1>
      <div className="stats-grid">
        {grupos.map((g) => (
          <div key={g.titulo} className="stat-card" style={{ borderLeftColor: '#0b3d91' }}>
            <h3>{g.titulo}</h3>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {g.itens.map((it) => (
                <button
                  key={it.endpoint}
                  className={`btn ${it.cor}`}
                  onClick={() => baixar(it.endpoint, it.nome)}
                  disabled={baixando === it.endpoint}
                >
                  {baixando === it.endpoint ? 'Gerando...' : `Baixar ${it.label}`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
