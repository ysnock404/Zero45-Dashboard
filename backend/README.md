# 🚀 ysnockserver Backend

Backend API para o ysnockserver Dashboard - Plataforma universal de controle e monitoramento de infraestrutura.

## 📋 Características

- ✅ **Autenticação JWT** com refresh tokens
- ✅ **SSH Terminal** via WebSocket (ssh2)
- ✅ **Configuração JSON** customizável
- ✅ **TypeScript** com strict mode
- ✅ **Express.js** + Socket.IO
- ✅ **Logging** com Winston
- ✅ **Validação** com Zod
- ✅ **Segurança** com Helmet + CORS
- ✅ **Encriptação** de credenciais SSH

## 🛠️ Tecnologias

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **WebSocket:** Socket.IO
- **SSH:** ssh2
- **Database:** PostgreSQL + Prisma (preparado)
- **Cache:** Redis (preparado)
- **Validation:** Zod
- **Logging:** Winston

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar config.json
cp config.json config.json.local
# Editar config.json.local com suas configurações

# Iniciar em desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

## ⚙️ Configuração

Toda a configuração é feita através do arquivo **`config.json`**:

```json
{
  "server": {
    "port": 3001,
    "host": "0.0.0.0",
    "corsOrigins": ["http://localhost:5173"]
  },
  "auth": {
    "jwtSecret": "your-secret-key",
    "jwtExpiresIn": "15m"
  },
  "ssh": {
    "maxConcurrentConnections": 10,
    "connectionTimeout": 30000,
    "encryptionKey": "your-32-char-key"
  }
  // ... mais configurações
}
```

### Configurações Principais:

- **server**: Porta, host, CORS origins
- **database**: PostgreSQL e Redis
- **auth**: JWT secrets, expiração, bcrypt rounds
- **ssh**: Limites de conexão, timeouts, chave de encriptação
- **monitoring**: Intervalos de verificação
- **alerts**: Canais de notificação (Email, Slack, Discord, Telegram)
- **logs**: Nível, retenção, rotação
- **features**: Ativar/desativar funcionalidades

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - User info
- `POST /api/auth/logout` - Logout

### SSH
- `GET /api/ssh/servers` - Listar servidores
- `POST /api/ssh/servers` - Criar servidor
- `GET /api/ssh/servers/:id` - Detalhes do servidor
- `PUT /api/ssh/servers/:id` - Atualizar servidor
- `DELETE /api/ssh/servers/:id` - Deletar servidor
- `POST /api/ssh/servers/:id/test` - Testar conexão

### WebSocket Events

#### SSH Terminal
- `ssh:connect` - Conectar ao servidor
- `ssh:input` - Enviar comando
- `ssh:data` - Receber output
- `ssh:disconnect` - Desconectar
- `ssh:error` - Erros
- `ssh:resize` - Redimensionar terminal

## 🔐 Segurança

- ✅ Credenciais SSH **encriptadas** (AES-256-CBC)
- ✅ Passwords com **bcrypt**
- ✅ JWT tokens com **expiração**
- ✅ **Rate limiting** configurável
- ✅ **Helmet** security headers
- ✅ **CORS** configurável
- ✅ Input **validation** com Zod

## 📝 Estrutura

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # Autenticação
│   │   ├── ssh/           # SSH + Terminal
│   │   ├── database/      # Database management
│   │   ├── api/           # API testing
│   │   ├── monitoring/    # Health checks
│   │   ├── metrics/       # Métricas
│   │   ├── logs/          # Logs
│   │   ├── alerts/        # Alertas
│   │   └── automation/    # Workflows
│   ├── shared/
│   │   ├── config/        # Config manager
│   │   ├── middleware/    # Middlewares
│   │   └── utils/         # Utilities
│   └── server.ts          # Entry point
├── config.json            # Configuração principal
└── package.json
```

## 🚀 Scripts

```bash
npm run dev        # Desenvolvimento (tsx watch)
npm run build      # Build TypeScript
npm start          # Produção
npm run lint       # ESLint
npm run format     # Prettier
```

## 📊 Status

- ✅ Setup inicial
- ✅ Configuração JSON
- ✅ Autenticação JWT
- ✅ SSH Terminal (WebSocket)
- ✅ Logging
- ✅ Error handling
- 🚧 Database (Prisma) - Preparado
- 🚧 Monitoring - TODO
- 🚧 Alerts - TODO
- 🚧 Automation - TODO

## 📄 Licença

MIT © ysnock
