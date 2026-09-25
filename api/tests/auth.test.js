const request = require('supertest');
const app = require('../src/app');
const db = require('../src/database');

jest.setTimeout(20000);

let adminToken;

beforeAll(async () => {
  // Login como admin (criado pelo init.sql)
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@estoque.com', senha: 'admin123' });

  if (res.statusCode !== 200) {
    throw new Error(
      `Não foi possível autenticar admin. Status: ${res.statusCode}. ` +
      `Resposta: ${JSON.stringify(res.body)}`
    );
  }

  adminToken = res.body.token;

  // Limpa usuários de teste antigos
  await db.query("DELETE FROM usuarios WHERE email LIKE 'test_%'");
});

afterAll(async () => {
  await db.query("DELETE FROM usuarios WHERE email LIKE 'test_%'");
  await db.end();
});

describe('Auth', () => {
  const email = `test_${Date.now()}@exemplo.com`;

  test('POST /api/auth/login com admin funciona e retorna token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@estoque.com', senha: 'admin123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario).toHaveProperty('role', 'admin');
  });

  test('POST /api/auth/login com senha errada = 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@estoque.com', senha: 'senha_errada_xyz' });

    expect(res.statusCode).toBe(401);
  });

  test('POST /api/auth/registrar SEM token = 401', async () => {
    const res = await request(app)
      .post('/api/auth/registrar')
      .send({ nome: 'Sem Auth', email, senha: 'senha123' });

    expect(res.statusCode).toBe(401);
  });

  test('POST /api/auth/registrar COM admin cria usuário', async () => {
    const res = await request(app)
      .post('/api/auth/registrar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Usuário Teste',
        email,
        senha: 'senha123',
        role: 'user',
        pode_adicionar: true,
        pode_editar: false,
        pode_excluir: false,
        pode_relatorios: false,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe(email);
    expect(res.body.pode_adicionar).toBe(true);
  });

  test('Login do usuário criado funciona', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, senha: 'senha123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario.pode_adicionar).toBe(true);
    expect(res.body.usuario.pode_relatorios).toBe(false);
  });

  test('GET /api/auth/me sem token = 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/auth/me com token = 200', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe('admin@estoque.com');
  });
});