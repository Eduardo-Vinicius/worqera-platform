# 📧 Integração - Sistema de Auditoria de Emails

## 🎯 Objetivo
Consultar histórico de emails enviados aos clientes com filtros por status, tipo, data e pedido.

---

## 📍 Endpoints Disponíveis

### 🔍 1. Listar Logs com Filtros
```
GET https://api.seu-dominio.com/emails/logs
```

**Headers:**
```javascript
{
  'Authorization': 'Bearer SEU_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

**Query Parameters (todos opcionais):**
| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `email` | string | Email do cliente | cliente@email.com |
| `pedidoId` | string | UUID do pedido | a2b73c79-5913-47af-a61b-9a3863d24428 |
| `codigoPedido` | string | Código legível | 310326-001 |
| `status` | string | sucesso \| erro \| falha_config | sucesso |
| `tipo` | string | novo_pedido \| status_update \| finalizacao \| outras | novo_pedido |
| `dataInicio` | string | ISO format | 2026-04-01T00:00:00Z |
| `dataFim` | string | ISO format | 2026-04-04T23:59:59Z |
| `limit` | number | 1-100 (padrão: 50) | 20 |
| `lastKey` | string | Cursor paginação | base64-string |

**Exemplos de URL:**
```
/emails/logs?status=sucesso&limit=20
/emails/logs?email=cliente@email.com
/emails/logs?codigoPedido=310326-001
/emails/logs?tipo=novo_pedido&dataInicio=2026-04-01T00:00:00Z&dataFim=2026-04-04T23:59:59Z
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2026-04-04T12:43:30.254Z",
      "pedidoId": "a2b73c79-5913-47af-a61b-9a3863d24428",
      "codigoPedido": "310326-001",
      "emailCliente": "cliente@email.com",
      "nomeCliente": "Eduardo Vinicius",
      "assunto": "✅ Pedido #310326-001 - Confirmação de Recebimento",
      "tipo": "novo_pedido",
      "status": "sucesso",
      "mensagem": "Email de novo pedido enviado com sucesso via Gmail",
      "errorCode": null,
      "duracaoMs": 245,
      "temPdf": true,
      "tamanhoPdf": 125000,
      "messageId": "CADdc_xwVn+H7vK..."
    },
    {
      "id": "660f8400-e29b-41d4-a716-446655440111",
      "timestamp": "2026-04-04T12:04:13.528Z",
      "pedidoId": "a2b73c79-5913-47af-a61b-9a3863d24428",
      "codigoPedido": "310326-001",
      "emailCliente": "cliente@email.com",
      "nomeCliente": "Eduardo Vinicius",
      "assunto": "📢 Pedido #310326-001 - Atualização de Status",
      "tipo": "status_update",
      "status": "sucesso",
      "mensagem": "Email enviado com sucesso via Gmail",
      "errorCode": null,
      "duracaoMs": 189,
      "temPdf": false,
      "tamanhoPdf": 0,
      "messageId": "CADdc_xwVn+H7vK..."
    }
  ],
  "pagination": {
    "count": 2,
    "scannedCount": 100,
    "lastKey": "eyJpZCI6IjY2MGY4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDExMSJ9"
  }
}
```

**Resposta de Erro (400/500):**
```json
{
  "success": false,
  "error": "lastKey inválido" ou "Mensagem de erro"
}
```

---

### 📊 2. Resumo Rápido
```
GET https://api.seu-dominio.com/emails/logs/resumo
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "geral": {
      "total": 500,
      "sucesso": 485,
      "erro": 12,
      "falhaConfig": 3,
      "taxa_sucesso": "97.00",
      "temPdf": 250,
      "tipos": {
        "novo_pedido": 150,
        "status_update": 300,
        "finalizacao": 40,
        "outras": 10
      },
      "tempoMedio": 240
    },
    "ultimosEmails": {
      "total": 20,
      "sucesso": 19,
      "erro": 1,
      "taxaSucesso": "95.00"
    },
    "emails": [
      {
        "id": "uuid",
        "timestamp": "2026-04-04T12:43:30.254Z",
        "codigoPedido": "310326-001",
        "emailCliente": "cliente@email.com",
        "status": "sucesso",
        "tipo": "novo_pedido"
      }
    ]
  }
}
```

---

### 👤 3. Últimos Emails de um Cliente
```
GET https://api.seu-dominio.com/emails/logs/ultimos/:emailCliente?limit=10
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `emailCliente` | string | Email do cliente |

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `limit` | number | 1-50 (padrão: 10) |

**Exemplo:**
```
GET /emails/logs/ultimos/cliente@email.com?limit=15
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "email": "cliente@email.com",
  "total": 3,
  "data": [
    {
      "id": "uuid1",
      "timestamp": "2026-04-04T12:43:30.254Z",
      "codigoPedido": "310326-001",
      "status": "sucesso",
      "tipo": "novo_pedido"
    }
  ]
}
```

---

### 📦 4. Emails de um Pedido
```
GET https://api.seu-dominio.com/emails/logs/pedido/:pedidoId
```

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `pedidoId` | string | UUID do pedido |

**Exemplo:**
```
GET /emails/logs/pedido/a2b73c79-5913-47af-a61b-9a3863d24428
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "pedidoId": "a2b73c79-5913-47af-a61b-9a3863d24428",
  "total": 3,
  "data": [
    {
      "id": "uuid1",
      "timestamp": "2026-03-31T20:57:09.120Z",
      "codigoPedido": "310326-001",
      "status": "sucesso",
      "tipo": "novo_pedido",
      "mensagem": "Email de novo pedido enviado com sucesso via Gmail"
    },
    {
      "id": "uuid2",
      "timestamp": "2026-04-04T12:04:13.528Z",
      "codigoPedido": "310326-001",
      "status": "sucesso",
      "tipo": "status_update",
      "mensagem": "Email enviado com sucesso via Gmail"
    }
  ]
}
```

---

### 📈 5. Estatísticas Gerais
```
GET https://api.seu-dominio.com/emails/estatisticas
```

**Query Parameters (opcionais):**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `dataInicio` | string | ISO format |
| `dataFim` | string | ISO format |

**Exemplo:**
```
GET /emails/estatisticas?dataInicio=2026-04-01T00:00:00Z&dataFim=2026-04-04T23:59:59Z
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 450,
    "sucesso": 435,
    "erro": 12,
    "falhaConfig": 3,
    "taxa_sucesso": "96.67",
    "temPdf": 225,
    "tipos": {
      "novo_pedido": 140,
      "status_update": 280,
      "finalizacao": 25,
      "outras": 5
    },
    "tempoMedio": 238
  }
}
```

---

## 💻 Exemplo de Integração (JavaScript/React)

### Configuração Base
```javascript
const API_BASE_URL = 'https://api.seu-dominio.com';

// Obter token do localStorage
const getToken = () => localStorage.getItem('authToken');

// Headers padrão
const getHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
});
```

### 1. Listar Logs com Filtros
```javascript
async function buscarLogsEmail(filtros = {}) {
  const params = new URLSearchParams();
  
  if (filtros.email) params.append('email', filtros.email);
  if (filtros.pedidoId) params.append('pedidoId', filtros.pedidoId);
  if (filtros.codigoPedido) params.append('codigoPedido', filtros.codigoPedido);
  if (filtros.status) params.append('status', filtros.status);
  if (filtros.tipo) params.append('tipo', filtros.tipo);
  if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
  if (filtros.limit) params.append('limit', filtros.limit);
  if (filtros.lastKey) params.append('lastKey', filtros.lastKey);

  try {
    const response = await fetch(
      `${API_BASE_URL}/emails/logs?${params}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return {
      emails: data.data,
      pagination: data.pagination
    };
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    throw error;
  }
}

// Uso:
const resultado = await buscarLogsEmail({
  status: 'sucesso',
  tipo: 'novo_pedido',
  limit: 20
});

console.log(`Encontrados ${resultado.emails.length} emails`);
resultado.emails.forEach(email => {
  console.log(`${email.codigoPedido} - ${email.nomeCliente} - ${email.status}`);
});
```

### 2. Resumo Rápido
```javascript
async function obterResumoEmails() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/emails/logs/resumo`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  } catch (error) {
    console.error('Erro ao obter resumo:', error);
    throw error;
  }
}

// Uso:
const resumo = await obterResumoEmails();
console.log(`Taxa de sucesso: ${resumo.geral.taxa_sucesso}%`);
console.log(`Total de emails: ${resumo.geral.total}`);
console.log(`Tempo médio: ${resumo.geral.tempoMedio}ms`);
```

### 3. Últimos Emails do Cliente
```javascript
async function obterUltimosEmails(emailCliente, limite = 10) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/emails/logs/ultimos/${encodeURIComponent(emailCliente)}?limit=${limite}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  } catch (error) {
    console.error('Erro ao obter últimos emails:', error);
    throw error;
  }
}

// Uso:
const ultimos = await obterUltimosEmails('cliente@email.com', 15);
ultimos.forEach(email => {
  console.log(`${email.timestamp} - ${email.status}`);
});
```

### 4. Emails de um Pedido
```javascript
async function obterEmailsPedido(pedidoId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/emails/logs/pedido/${pedidoId}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  } catch (error) {
    console.error('Erro ao obter emails do pedido:', error);
    throw error;
  }
}

// Uso:
const emailsDoPedido = await obterEmailsPedido('a2b73c79-5913-47af-a61b-9a3863d24428');
emailsDoPedido.forEach(email => {
  console.log(`${email.tipo}: ${email.status} - ${email.mensagem}`);
});
```

### 5. Estatísticas
```javascript
async function obterEstatisticas(dataInicio, dataFim) {
  const params = new URLSearchParams();
  if (dataInicio) params.append('dataInicio', dataInicio);
  if (dataFim) params.append('dataFim', dataFim);

  try {
    const response = await fetch(
      `${API_BASE_URL}/emails/estatisticas?${params}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    throw error;
  }
}

// Uso:
const stats = await obterEstatisticas('2026-04-01T00:00:00Z', '2026-04-04T23:59:59Z');
console.log(`
  Total: ${stats.total}
  Sucesso: ${stats.sucesso}
  Erros: ${stats.erro}
  Taxa: ${stats.taxa_sucesso}%
`);
```

---

## 🎨 Exemplo de Component React

```jsx
import React, { useState, useEffect } from 'react';

const EmailAuditoria = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    status: '',
    tipo: '',
    limit: 20
  });

  const carregarEmails = async () => {
    setLoading(true);
    try {
      const resultado = await buscarLogsEmail(filtros);
      setEmails(resultado.emails);
    } catch (error) {
      alert('Erro ao carregar emails: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEmails();
  }, []);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleFiltrar = () => {
    carregarEmails();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>📧 Auditoria de Emails</h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <select
          name="status"
          value={filtros.status}
          onChange={handleFiltroChange}
        >
          <option value="">Todos os Status</option>
          <option value="sucesso">✅ Sucesso</option>
          <option value="erro">❌ Erro</option>
          <option value="falha_config">⚙️ Falha Config</option>
        </select>

        <select
          name="tipo"
          value={filtros.tipo}
          onChange={handleFiltroChange}
        >
          <option value="">Todos os Tipos</option>
          <option value="novo_pedido">📦 Novo Pedido</option>
          <option value="status_update">📢 Atualização Status</option>
          <option value="finalizacao">🎉 Finalização</option>
        </select>

        <button onClick={handleFiltrar} disabled={loading}>
          {loading ? 'Carregando...' : 'Filtrar'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Data</th>
            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Código</th>
            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Cliente</th>
            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Tipo</th>
            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Tempo (ms)</th>
            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>PDF</th>
          </tr>
        </thead>
        <tbody>
          {emails.map(email => (
            <tr key={email.id}>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                {new Date(email.timestamp).toLocaleString('pt-BR')}
              </td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{email.codigoPedido}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{email.nomeCliente}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{email.tipo}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: email.status === 'sucesso' ? '#d4edda' : '#f8d7da',
                  color: email.status === 'sucesso' ? '#155724' : '#721c24'
                }}>
                  {email.status === 'sucesso' ? '✅' : '❌'} {email.status}
                </span>
              </td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{email.duracaoMs}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                {email.temPdf ? `📎 ${(email.tamanhoPdf / 1024).toFixed(0)}KB` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {emails.length === 0 && !loading && (
        <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
          Nenhum email encontrado
        </p>
      )}
    </div>
  );
};

export default EmailAuditoria;
```

---

## ⚠️ Erros Comuns

### 401 Unauthorized
Token expirado ou inválido
```javascript
// Verificar e renovar token
if (error.status === 401) {
  // Redirecionar para login
  window.location.href = '/login';
}
```

### 400 Bad Request
Parâmetros inválidos
```javascript
// Validar filtros antes de enviar
if (filtros.limit < 1 || filtros.limit > 100) {
  throw new Error('Limit deve ser entre 1 e 100');
}
```

### 500 Internal Server Error
Erro no servidor
```javascript
// Exibir mensagem amigável e logar erro
console.error('Erro do servidor:', error);
alert('Erro ao carregar dados. Tente novamente mais tarde.');
```

---

## 🧡 Boas Práticas

✅ **Sempre validar resposta**
```javascript
if (!data.success) {
  throw new Error(data.error);
}
```

✅ **Implementar tratamento de erros**
```javascript
try {
  // ... chamada à API
} catch (error) {
  console.error('Erro:', error);
  // Exibir mensagem ao usuário
}
```

✅ **Usar paginação para grandes listas**
```javascript
// Primeira página
const page1 = await buscarLogsEmail({ limit: 50 });

// Próxima página
const page2 = await buscarLogsEmail({
  limit: 50,
  lastKey: page1.pagination.lastKey
});
```

✅ **Cachear dados quando apropriado**
```javascript
const [cache, setCache] = useState(null);
const [cacheTime, setCacheTime] = useState(null);

const carregarComCache = async (filtros) => {
  const agora = Date.now();
  if (cache && cacheTime && agora - cacheTime < 60000) {
    return cache; // Cache válido por 1 minuto
  }
  
  const dados = await buscarLogsEmail(filtros);
  setCache(dados);
  setCacheTime(agora);
  return dados;
};
```

✅ **Formatar datas consistentemente**
```javascript
const formatarData = (isoString) => {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
```

---

## 📞 Suporte
Para dúvidas sobre a API, consulte a documentação completa em `/docs/API-Documentation.md`
