# 📦 Sistema de Estoque e Funcionários

Sistema completo de gerenciamento de estoque com autenticação JWT, permissões granulares, dashboard com gráficos e geração de relatórios PDF/Excel.

## 🚀 Tecnologias

**Backend**
- Node.js 20 + Express
- PostgreSQL 16
- JWT + bcrypt
- Multer (upload de imagens)
- PDFKit (PDF) + ExcelJS (Excel)
- Nodemailer (SMTP)
- Jest + Supertest

**Frontend**
- React 18 + Vite
- React Router
- Recharts
- Axios

**Infra**
- Docker + Docker Compose

## ✨ Funcionalidades

- 🔐 Autenticação JWT com permissões granulares (adicionar / editar / excluir / relatórios)
- 👥 Gestão de usuários (só admin)
- 📦 CRUD de produtos com upload de imagem
- 🏭 CRUD de fornecedores
- 👤 CRUD de funcionários
- 🔄 Movimentações de entrada/saída com transação SQL
- 📊 Dashboard com 5 cards + 3 gráficos (BarChart, PieChart, LineChart)
- 📄 Relatórios PDF e Excel (produtos, funcionários, movimentações)
- 📧 Página de manutenção com formulário de contato
- 🔔 Sistema de notificações por e-mail
- 🌐 Multi-idioma na página de manutenção (PT / EN / ES)
- ⏱️ Contador regressivo + barra de progresso
- 🧪 Testes automatizados (Jest + Supertest)

## 🖼️ Screenshots

_(adicione aqui prints do dashboard, produtos, notificações)_

## 🎯 Como rodar

### Pré-requisitos
- Docker Desktop
- Node.js 20+ (opcional, só para testes)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/sistema-estoque.git
cd sistema-estoque

# 2. Configure as variáveis de ambiente
cp api/.env.example api/.env
# Edite api/.env e docker-compose.yml com suas credenciais SMTP

# 3. Suba os containers
docker compose up --build -d

# 4. Acesse
# Frontend: http://localhost:5173
# API:      http://localhost:3000