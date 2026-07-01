# Zero45 Dashboard

## Assistente / módulo Agência

Quando o utilizador reportar uma transação em linguagem natural (ex: "fiz 100€ hoje", "gastei 30€ em hosting"), regista-a diretamente na API do módulo Agência em vez de só responder em texto. Faz perguntas de esclarecimento apenas se faltar informação essencial (tipo Receita/Despesa, valor).

Backend local: `http://localhost:9031` (sem autenticação nas rotas `/api/agency/*`).

Criar transação:

```bash
curl -s -X POST http://localhost:9031/api/agency/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-07-01",
    "type": "Receita",
    "value": 100,
    "status": "Pago",
    "recurrence": "Único",
    "notes": "descrição curta do que foi"
  }'
```

Campos: `type` é `"Receita"` ou `"Despesa"` (usa sempre valor positivo em `value`, o tipo é que define o sinal). `status` é `"Pago" | "Pendente" | "Previsto"`. `recurrence` é `"Único" | "Diário" | "Semanal" | "Mensal" | "Anual" | "Contínuo"` — usa `"Único"` salvo indicação contrária. `projectName` e `client` são opcionais, texto livre.

Depois de inserir, confirma ao utilizador em uma frase curta o que foi registado.
