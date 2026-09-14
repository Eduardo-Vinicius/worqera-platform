# Integração WhatsApp - Envio de Pedidos

## 📋 Resumo das Mudanças

### 1. **Novo Formato de Código do Pedido**

O código do pedido foi simplificado para ser **ultra-curto e fácil de usar na loja**:

- **Formato**: `DDMMYY-XXX` (ex: `160126-001`)
- **Tamanho**: Apenas 9 caracteres (antes eram 14+)
- **Sequencial**: Contador diário (001, 002, 003...)
- **Escalabilidade**: Suporta até 999 pedidos por dia
- **Geração**: Automática usando contador atômico no DynamoDB

Exemplo:
- `160126-001` = primeiro pedido de 16/01/2026
- `160126-042` = 42º pedido do dia

### 2. **Novos Campos no Modelo de Pedido**

Foram adicionados campos para melhor rastreamento:

```javascript
{
  clientPhone: String,        // Telefone do cliente para WhatsApp
  dataEntregaReal: String,    // Data quando pedido foi entregue
  updatedBy: String,          // Email do último usuário que atualizou
  pdfUrl: String,             // URL do PDF gerado no S3
  // ... campos existentes
}
```

### 3. **Detalhes do Pedido**

O modelo agora rastreia:
- Data/hora de criação formatada
- Data prevista de entrega
- Data real de entrega
- Histórico completo de status
- URLs de PDFs gerados

---

## 🚀 Como Usar - Endpoints WhatsApp

### **Enviar PDF do Pedido via WhatsApp**

```http
POST /pedidos/:id/enviar-pdf-whatsapp
Content-Type: application/json

{
  "telefoneCliente": "5511999999999"
}
```

**Resposta de sucesso (200)**:
```json
{
  "success": true,
  "message": "PDF enviado com sucesso via WhatsApp",
  "data": {
    "success": true,
    "messageId": "wamid.xxx",
    "pdfUrl": "https://s3.amazonaws.com/..."
  }
}
```

**Exemplo com curl**:
```bash
curl -X POST http://localhost/api/pedidos/550e8400-e29b-41d4-a716-446655440000/enviar-pdf-whatsapp \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"telefoneCliente": "5511999999999"}'
```

---

### **Enviar Detalhes Formatados do Pedido via WhatsApp**

```http
POST /pedidos/:id/enviar-detalhes-whatsapp
Content-Type: application/json

{
  "telefoneCliente": "5511999999999"
}
```

**Resposta de sucesso (200)**:
```json
{
  "success": true,
  "message": "Detalhes do pedido enviados com sucesso via WhatsApp",
  "data": {
    "success": true,
    "messageId": "wamid.xxx"
  }
}
```

**Mensagem Enviada (exemplo)**:
```
*DETALHES DO PEDIDO* 📋

🔢 *Número do Pedido:* 160126-001
📅 *Data do Pedido:* qua, 2026-01-16 14:30
👟 *Modelo:* Air Jordan 1
🏪 *Status:* Atendimento - Aguardando Aprovação

*SERVIÇOS SOLICITADOS* 🔧
• Limpeza Profunda - R$ 50,00
• Restauração de Couro - R$ 150,00

*VALORES* 💰
Total: R$ 200,00
Sinal Pago: R$ 100,00
Restante: R$ 100,00

📅 *Previsão de Entrega:* 23/01/2026

📝 *Observações:*
Usar apenas produtos naturais

_Obrigado por confiar em nosso serviço! 😊_
```

---

## 🔄 Fluxo de Uso Recomendado

### Passo 1: Criar Pedido

```bash
POST /api/pedidos
{
  "clienteId": "cliente-123",
  "clientName": "João Silva",
  "clientPhone": "5511987654321",  // ✨ NOVO CAMPO
  "modeloTenis": "Nike Air",
  "servicos": [
    {
      "id": "srv-1",
      "nome": "Limpeza",
      "preco": 50,
      "descricao": "Limpeza completa"
    }
  ],
  "dataPrevistaEntrega": "2026-01-23",
  "observacoes": "Usar apenas produtos naturais"
}
```

**Resposta**: Pedido criado com código gerado automaticamente (ex: `160126-001`)

---

### Passo 2: Enviar Detalhes para o Cliente

```bash
POST /api/pedidos/{pedido_id}/enviar-detalhes-whatsapp
{
  "telefoneCliente": "5511987654321"
}
```

Cliente recebe mensagem formatada com todos os detalhes ✅

---

### Passo 3: (Opcional) Enviar PDF

```bash
POST /api/pedidos/{pedido_id}/enviar-pdf-whatsapp
{
  "telefoneCliente": "5511987654321"
}
```

Cliente recebe PDF completo da ordem de serviço ✅

---

## 📊 Comparação de Códigos

| Aspecto | Antes | Depois |
|---------|--------|--------|
| **Formato** | 20260115-14-001 | 160126-001 |
| **Tamanho** | 14 caracteres | 9 caracteres |
| **Legibilidade** | Média | Excelente ✨ |
| **Facilidade Balcão** | Difícil | Muito Fácil ✨ |
| **Escala** | Por hora (unlimited) | Diária (até 999) |

---

## 🛠️ Funções Utilitárias

Se precisar usar as funções diretamente no código:

### `formatarDetalhePedidoParaMensagem(pedido, cliente)`

Formata os detalhes do pedido em texto markdown para WhatsApp.

```javascript
const { formatarDetalhePedidoParaMensagem } = require('./services/whatsappService');

const mensagem = formatarDetalhePedidoParaMensagem(pedidoObj, clienteObj);
console.log(mensagem);
```

### `enviarPdfPedidoWhatsApp(telefone, pedidoId, pedido?)`

Envia PDF via WhatsApp.

```javascript
const resultado = await enviarPdfPedidoWhatsApp('5511999999999', pedidoId);
if (resultado.success) {
  console.log('PDF enviado!', resultado.messageId);
}
```

### `enviarDetalhesPedidoWhatsApp(telefone, pedido, cliente)`

Envia detalhes formatados via WhatsApp.

```javascript
const resultado = await enviarDetalhesPedidoWhatsApp('5511999999999', pedido, cliente);
if (resultado.success) {
  console.log('Detalhes enviados!', resultado.messageId);
}
```

---

## ⚙️ Configurações Necessárias

Certifique-se que estas variáveis de ambiente estão configuradas:

```bash
# WhatsApp Cloud API
WHATSAPP_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id_aqui

# AWS S3 (para PDFs)
AWS_REGION=us-east-1
S3_BUCKET_NAME=seu-bucket

# DynamoDB
DYNAMODB_PEDIDO_TABLE=shoeRepairPedidos
```

---

## 🐛 Tratamento de Erros

### Erro: "WhatsApp não configurado"
✅ Verifiquer variáveis `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`

### Erro: "Telefone inválido"
✅ Formato esperado: `5511999999999` (com código país)

### Erro: "Pedido não encontrado"
✅ Verificar ID do pedido passado na URL

### Erro: "Falha ao gerar URL do PDF"
✅ Verificar configurações S3 e permissões

---

## 📱 Exemplo de Uso - Frontend

```javascript
// Enviar detalhes do pedido
async function enviarDetalhesPedidoWhatsApp(pedidoId, telefone) {
  try {
    const response = await fetch(`/api/pedidos/${pedidoId}/enviar-detalhes-whatsapp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telefoneCliente: telefone
      })
    });

    const resultado = await response.json();
    
    if (resultado.success) {
      alert('Detalhes enviados via WhatsApp com sucesso!');
    } else {
      alert(`Erro: ${resultado.error}`);
    }
  } catch (error) {
    console.error('Erro ao enviar:', error);
  }
}

// Enviar PDF
async function enviarPdfWhatsApp(pedidoId, telefone) {
  try {
    const response = await fetch(`/api/pedidos/${pedidoId}/enviar-pdf-whatsapp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telefoneCliente: telefone
      })
    });

    const resultado = await response.json();
    
    if (resultado.success) {
      alert('PDF enviado via WhatsApp com sucesso!');
    } else {
      alert(`Erro: ${resultado.error}`);
    }
  } catch (error) {
    console.error('Erro ao enviar:', error);
  }
}
```

---

## 📝 Notas Importantes

1. **Código Sequencial**: Resetado diariamente. Cada dia começa com `-001`
2. **Fallback**: Se erro no contador, usa últimos 3 dígitos do timestamp
3. **PDF**: Gerado automaticamente e salvo no S3 antes de enviar
4. **Mensagens**: Formatadas com emojis e markdown para melhor apresentação
5. **Rastreamento**: Todas operações são registradas em logs

---

## 🎯 Próximos Passos

Para melhorar ainda mais:

1. **Templates WhatsApp**: Criar templates aprovados pela Meta
2. **Confirmação de Recebimento**: Capturar confirmação de entrega
3. **Notificações Automáticas**: Enviar quando status muda
4. **QR Code**: Adicionar QR code nos PDFs para tracking

---

Dúvidas? Verifique os logs em `[WhatsApp-PDF]` e `[WhatsApp-Detalhes]` na console!
