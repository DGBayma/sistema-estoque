require('dotenv').config();
const app = require('./app');
const { iniciarAutoNotify } = require('./utils/autoNotify');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API rodando em http://localhost:${PORT}`));

// 🤖 Inicia verificação automática de "sistema voltou"
iniciarAutoNotify();
