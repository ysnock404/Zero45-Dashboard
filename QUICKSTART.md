# 🚀 Guia de Início Rápido - ysnockserver

## ✅ O que foi implementado

### Frontend (65% completo)
- ✅ Setup completo (Vite + React + TypeScript + Tailwind + Shadcn/ui)
- ✅ Autenticação (Login, Protected Routes, Zustand)
- ✅ Dashboard com gráficos reais (Recharts)
- ✅ SSH Terminal (xterm.js) - UI pronta
- ✅ Layout completo (Sidebar, Topbar, Breadcrumbs)
- ✅ WebSocket service (Socket.io client)
- ✅ 25 componentes UI (Shadcn)

### Backend (NOVO! 🎉)
- ✅ Express + TypeScript + Socket.IO
- ✅ **Configuração JSON customizável** (`config.json`)
- ✅ Autenticação JWT completa
- ✅ SSH Module com WebSocket real-time
- ✅ Encriptação de credenciais
- ✅ Logging com Winston
- ✅ Error handling
- ✅ Security (Helmet, CORS, Rate Limiting)

---

## 🏃 Como Executar

### 1. Backend

```bash
cd backend

# Instalar dependências (se ainda não instalou)
npm install

# Editar configuração (IMPORTANTE!)
# Abrir config.json e ajustar:
# - server.corsOrigins (adicionar URL do frontend)
# - auth.jwtSecret (trocar para uma chave segura)
# - ssh.encryptionKey (32 caracteres para encriptar passwords SSH)

# Iniciar servidor
npm run dev
```

O backend estará rodando em: **http://localhost:3001**

### 2. Frontend

```bash
cd frontend

# Criar arquivo .env (copiar do .env.example)
cp .env.example .env

# Editar .env e configurar:
# VITE_API_URL=http://localhost:3001
# VITE_WS_URL=http://localhost:3001

# Iniciar frontend
npm run dev
```

O frontend estará rodando em: **http://localhost:5173**

---

## 🔑 Login

Credenciais padrão:
- **Email:** `admin@ysnockserver.local`
- **Password:** `admin`

---

## 🧪 Testar SSH Terminal

1. Ir para a página **SSH** no dashboard
2. Clicar em **"Add Server"**
3. Preencher dados de um servidor SSH real:
   - Nome: `Meu Servidor`
   - Host: `seu-servidor.com`
   - Port: `22`
   - Username: `root`
   - Password: `sua-senha`
4. Clicar em **"Connect"**
5. O terminal xterm.js abrirá com conexão SSH real via WebSocket! 🎉

---

## ⚙️ Configuração Customizável

Todo o backend é configurado via **`backend/config.json`**:

### Principais configurações:

```json
{
  "server": {
    "port": 3001,
    "corsOrigins": ["http://localhost:5173"]
  },
  "auth": {
    "jwtSecret": "TROCAR-ISTO-POR-CHAVE-SEGURA",
    "jwtExpiresIn": "15m"
  },
  "ssh": {
    "maxConcurrentConnections": 10,
    "encryptionKey": "sua-chave-32-caracteres-aqui"
  },
  "alerts": {
    "channels": {
      "email": {
        "enabled": true,
        "smtp": {
          "host": "smtp.gmail.com",
          "port": 587,
          "auth": {
            "user": "seu-email@gmail.com",
            "pass": "sua-app-password"
          }
        }
      },
      "slack": {
        "enabled": true,
        "webhookUrl": "https://hooks.slack.com/..."
      }
    }
  }
}
```

**Vantagens:**
- ✅ Sem variáveis de ambiente complexas
- ✅ Tudo num único arquivo JSON
- ✅ Fácil de versionar (sem dados sensíveis)
- ✅ Validação automática com Zod
- ✅ Hot reload (reiniciar servidor para aplicar)

---

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Dados do usuário logado

### SSH
- `GET /api/ssh/servers` - Listar servidores SSH
- `POST /api/ssh/servers` - Adicionar servidor
- `PUT /api/ssh/servers/:id` - Atualizar servidor
- `DELETE /api/ssh/servers/:id` - Deletar servidor
- `POST /api/ssh/servers/:id/test` - Testar conexão

### WebSocket (SSH Terminal)
- Conectar: `socket.emit('ssh:connect', { serverId })`
- Enviar comando: `socket.emit('ssh:input', data)`
- Receber output: `socket.on('ssh:data', callback)`
- Desconectar: `socket.emit('ssh:disconnect', { serverId })`

---

## 🔐 Segurança

- ✅ **Passwords SSH encriptados** (AES-256-CBC)
- ✅ **JWT tokens** com expiração configurável
- ✅ **bcrypt** para passwords de usuários
- ✅ **Helmet** security headers
- ✅ **CORS** configurável
- ✅ **Rate limiting** (100 req/15min por padrão)

---

## 📊 Próximos Passos

### Frontend
1. ✅ ~~SSH Terminal~~ (COMPLETO!)
2. 🚧 Database Page (SQL editor, query results)
3. 🚧 API Testing Page (Postman-like)
4. 🚧 Monitoring Page (uptime, health checks)
5. 🚧 Logs Page (real-time log viewer)
6. 🚧 Alerts Page (notification rules)

### Backend
1. ✅ ~~Auth + SSH~~ (COMPLETO!)
2. 🚧 Database Module (PostgreSQL, MySQL, MongoDB connectors)
3. 🚧 Monitoring Module (health checks, uptime tracking)
4. 🚧 Metrics Module (system metrics, real-time streaming)
5. 🚧 Logs Module (log aggregation, search)
6. 🚧 Alerts Module (notification channels)

---

## 🐛 Troubleshooting

### Backend não inicia
- Verificar se `config.json` está válido (JSON syntax)
- Verificar se porta 3001 está livre
- Ver logs de erro no console

### Frontend não conecta ao backend
- Verificar se `.env` tem `VITE_API_URL=http://localhost:3001`
- Verificar se backend está rodando
- Verificar CORS em `config.json` (deve incluir `http://localhost:5173`)

### SSH não conecta
- Verificar credenciais do servidor
- Verificar se servidor SSH está acessível
- Ver logs do backend para erros de conexão
- Verificar `ssh.encryptionKey` em `config.json` (32 chars)

---

## 📝 Estrutura do Projeto

```
045h/
├── frontend/              # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/   # UI components (Shadcn)
│   │   ├── pages/        # Pages (Dashboard, SSH, etc)
│   │   ├── services/     # WebSocket, API clients
│   │   ├── stores/       # Zustand stores
│   │   └── lib/          # Utils, config
│   └── public/
│       └── config.json   # Frontend config
│
├── backend/              # Express + Socket.IO + TypeScript
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   │   ├── auth/
│   │   │   └── ssh/
│   │   ├── shared/       # Config, middleware, utils
│   │   └── server.ts     # Entry point
│   └── config.json       # ⭐ CONFIGURAÇÃO PRINCIPAL
│
├── PLANO.md              # Plano completo do projeto
├── TODO-FRONTEND.md      # Tarefas frontend
├── TODO-BACKEND.md       # Tarefas backend
└── PROGRESSO-FRONTEND.md # Progresso atual
```

---

## 🎯 Status Geral

```
Frontend:  ████████████░░░░░░░░  65%
Backend:   ████████░░░░░░░░░░░░  40%
DevOps:    ░░░░░░░░░░░░░░░░░░░░   0%
─────────────────────────────────
TOTAL:     ████████░░░░░░░░░░░░  35%
```

**MVP funcional:** ~50% completo  
**Produção ready:** ~35% completo

---

## 💡 Dicas

1. **Desenvolvimento:** Use `npm run dev` em ambos (frontend e backend) para hot reload
2. **Configuração:** Edite `backend/config.json` para customizar tudo
3. **Logs:** Backend mostra logs coloridos no console
4. **SSH:** Credenciais são encriptadas automaticamente ao salvar servidor
5. **WebSocket:** Conexão automática ao fazer login no frontend

---

## 🆘 Suporte

- Ver logs do backend no terminal
- Ver console do browser (F12) para erros do frontend
- Verificar `backend/logs/` para logs detalhados (produção)

---

**Desenvolvido com ❤️ por ysnock**
