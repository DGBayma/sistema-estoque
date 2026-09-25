const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'estoque',
});

pool.on('connect', () => console.log('✅ Conectado ao PostgreSQL'));
pool.on('error', (err) => console.error('❌ Erro no PostgreSQL:', err));

module.exports = pool;
