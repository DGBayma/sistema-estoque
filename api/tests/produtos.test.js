const request = require('supertest');
const app = require('../src/app');
const db = require('../src/database');

jest.setTimeout(20000);

let token;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@estoque.com', senha: 'admin123' });

  if (res.statusCode !== 200) {
    throw new Error(
      `Falha no login do admin. Status: ${res.statusCode}. ` +
      `Resposta: ${JSON.stringify(res.body)}`
    );
  }

  token = res.body.token;
});

afterAll(async () => {
  await db.end();
});

describe('Produtos', () => {
  test('GET /api/produtos SEM token = 401', async () => {
    const res = await request(app).get('/api/produtos');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/produtos COM token = 200 e array', async () => {
    const res = await request(app)
      .get('/api/produtos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/produtos/alertas/baixo-estoque = 200', async () => {
    const res = await request(app)
      .get('/api/produtos/alertas/baixo-estoque')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/movimentacoes/estatisticas retorna dados do dashboard', async () => {
    const res = await request(app)
      .get('/api/movimentacoes/estatisticas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('topProdutos');
    expect(res.body).toHaveProperty('porCategoria');
    expect(res.body).toHaveProperty('movPorDia');
    expect(res.body).toHaveProperty('totalEstoque');
    expect(res.body.totalEstoque).toHaveProperty('itens_total');
    // Não deve mais existir valor_total
    expect(res.body.totalEstoque).not.toHaveProperty('valor_total');
  });

  test('GET /api/fornecedores COM token = 200', async () => {
    const res = await request(app)
      .get('/api/fornecedores')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});