import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import api from '../services/api';

const CORES = ['#0b3d91', '#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6f42c1'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    produtos: 0,
    funcionarios: 0,
    movimentacoes: 0,
    alertas: 0,
  });

  const [dados, setDados] = useState({
    topProdutos: [],
    porCategoria: [],
    movPorDia: [],
    totalEstoque: { itens_total: 0 },
  });

  useEffect(() => {
    async function load() {
      try {
        const [p, f, m, a, est] = await Promise.all([
          api.get('/api/produtos'),
          api.get('/api/funcionarios'),
          api.get('/api/movimentacoes'),
          api.get('/api/produtos/alertas/baixo-estoque'),
          api.get('/api/movimentacoes/estatisticas'),
        ]);

        setStats({
          produtos: p.data.length,
          funcionarios: f.data.length,
          movimentacoes: m.data.length,
          alertas: a.data.length,
        });

        const d = est.data;

        setDados({
          topProdutos: (d.topProdutos || []).map((x) => ({
            nome: x.nome,
            total: Number(x.total),
          })),
          porCategoria: (d.porCategoria || []).map((x) => ({
            categoria: x.categoria,
            total: Number(x.total),
          })),
          movPorDia: (d.movPorDia || []).map((x) => ({
            dia: x.dia,
            entradas: Number(x.entradas),
            saidas: Number(x.saidas),
          })),
          totalEstoque: {
            itens_total: Number(d.totalEstoque?.itens_total || 0),
          },
        });
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      }
    }
    load();
  }, []);

  return (
    <>
      <h1>📊 Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total de Produtos</h3>
          <div className="value">{stats.produtos}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#28a745' }}>
          <h3>Funcionários</h3>
          <div className="value">{stats.funcionarios}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#17a2b8' }}>
          <h3>Movimentações</h3>
          <div className="value">{stats.movimentacoes}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#dc3545' }}>
          <h3>Alertas de Estoque</h3>
          <div className="value">{stats.alertas}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#6f42c1' }}>
          <h3>Itens em Estoque</h3>
          <div className="value">{dados.totalEstoque.itens_total}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3 style={{ marginBottom: 16, color: '#0b3d91' }}>🏆 Top 5 Produtos (saídas)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dados.topProdutos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#0b3d91" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, color: '#0b3d91' }}>🥧 Estoque por Categoria</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dados.porCategoria}
                dataKey="total"
                nameKey="categoria"
                outerRadius={90}
                label={(entry) => `${entry.categoria}: ${entry.total}`}
              >
                {dados.porCategoria.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, color: '#0b3d91' }}>📈 Movimentações nos últimos 14 dias</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dados.movPorDia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="entradas" stroke="#28a745" strokeWidth={2} name="Entradas" />
            <Line type="monotone" dataKey="saidas" stroke="#dc3545" strokeWidth={2} name="Saídas" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}