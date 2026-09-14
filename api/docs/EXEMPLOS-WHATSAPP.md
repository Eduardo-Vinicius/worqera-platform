# Exemplos de Uso - WhatsApp & Pedidos

## 📱 Exemplos Práticos

### 1. Criar Pedido Completo + Enviar Detalhes

```bash
#!/bin/bash

# Bearer token
TOKEN="seu_token_jwt_aqui"

# 1. Criar pedido
RESPONSE=$(curl -s -X POST http://localhost:3000/api/pedidos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "cliente-123",
    "clientName": "João Silva",
    "clientPhone": "5511987654321",
    "modeloTenis": "Nike Air Jordan 1 Retro",
    "servicos": [
      {
        "id": "srv-001",
        "nome": "Limpeza Profunda",
        "preco": 50.00,
        "descricao": "Limpeza completa com produtos profissionais"
      },
      {
        "id": "srv-002",
        "nome": "Restauração de Couro",
        "preco": 150.00,
        "descricao": "Restauração completa do couro envelhecido"
      }
    ],
    "dataPrevistaEntrega": "2026-01-23",
    "observacoes": "Usar apenas produtos naturais - cliente alérgico",
    "valorSinal": 100.00
  }')

# Extrair ID do pedido criado
PEDIDO_ID=$(echo $RESPONSE | jq -r '.data.id')
echo "✅ Pedido criado: $PEDIDO_ID"

# 2. Enviar detalhes via WhatsApp
ENVIO=$(curl -s -X POST http://localhost:3000/api/pedidos/$PEDIDO_ID/enviar-detalhes-whatsapp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"telefoneCliente": "5511987654321"}')

echo "📱 Detalhes enviados:"
echo $ENVIO | jq '.'

# 3. Enviar PDF (opcional)
curl -s -X POST http://localhost:3000/api/pedidos/$PEDIDO_ID/enviar-pdf-whatsapp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"telefoneCliente": "5511987654321"}' | jq '.'

echo "✅ PDF enviado!"
```

---

### 2. Apenas Enviar Detalhes para Pedido Existente

```bash
TOKEN="seu_token_jwt_aqui"
PEDIDO_ID="550e8400-e29b-41d4-a716-446655440000"
TELEFONE="5511987654321"

curl -X POST http://localhost:3000/api/pedidos/$PEDIDO_ID/enviar-detalhes-whatsapp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"telefoneCliente\": \"$TELEFONE\"}" | jq '.'
```

---

### 3. Usar em JavaScript/Node.js

```javascript
// config.js
const API_URL = 'http://localhost:3000/api';
const TOKEN = localStorage.getItem('token');

// funções auxiliares
async function requisicaoAPI(metodo, endpoint, dados) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: metodo,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: dados ? JSON.stringify(dados) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Criar pedido e enviar via WhatsApp
async function criarPedidoEEnviar(dadosPedido, telefone) {
  try {
    // 1. Criar pedido
    console.log('📝 Criando pedido...');
    const pedidoCriado = await requisicaoAPI('POST', '/pedidos', dadosPedido);
    const pedidoId = pedidoCriado.data.id;
    const codigoPedido = pedidoCriado.data.codigo;
    
    console.log(`✅ Pedido criado: ${codigoPedido}`);

    // 2. Enviar detalhes via WhatsApp
    console.log('📱 Enviando detalhes via WhatsApp...');
    const envioDetalhes = await requisicaoAPI(
      'POST', 
      `/pedidos/${pedidoId}/enviar-detalhes-whatsapp`,
      { telefoneCliente: telefone }
    );
    
    if (envioDetalhes.success) {
      console.log('✅ Detalhes enviados!');
    }

    // 3. Enviar PDF (opcional)
    console.log('📄 Enviando PDF...');
    const envioPdf = await requisicaoAPI(
      'POST',
      `/pedidos/${pedidoId}/enviar-pdf-whatsapp`,
      { telefoneCliente: telefone }
    );

    if (envioPdf.success) {
      console.log('✅ PDF enviado!');
    }

    return {
      sucesso: true,
      codigoPedido: codigoPedido,
      pedidoId: pedidoId
    };

  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    return {
      sucesso: false,
      erro: erro.message
    };
  }
}

// Exemplo de uso
const dadosPedido = {
  clienteId: 'cliente-123',
  clientName: 'João Silva',
  clientPhone: '5511987654321',
  modeloTenis: 'Nike Air Jordan 1 Retro',
  servicos: [
    {
      id: 'srv-001',
      nome: 'Limpeza Profunda',
      preco: 50.00,
      descricao: 'Limpeza completa'
    },
    {
      id: 'srv-002',
      nome: 'Restauração de Couro',
      preco: 150.00,
      descricao: 'Restauração do couro'
    }
  ],
  dataPrevistaEntrega: '2026-01-23',
  observacoes: 'Cliente alérgico - usar produtos naturais',
  valorSinal: 100.00
};

criarPedidoEEnviar(dadosPedido, '5511987654321')
  .then(resultado => {
    if (resultado.sucesso) {
      alert(`Pedido ${resultado.codigoPedido} criado e enviado com sucesso!`);
    } else {
      alert(`Erro: ${resultado.erro}`);
    }
  });
```

---

### 4. Integração com Frontend React

```jsx
// components/PedidoForm.jsx
import React, { useState } from 'react';

export function PedidoForm() {
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function enviarPedidoWhatsApp(e) {
    e.preventDefault();
    setCarregando(true);

    try {
      const formData = new FormData(e.target);
      const dados = {
        clienteId: formData.get('clienteId'),
        clientName: formData.get('clientName'),
        clientPhone: formData.get('clientPhone'),
        modeloTenis: formData.get('modeloTenis'),
        dataPrevistaEntrega: formData.get('dataPrevistaEntrega'),
        observacoes: formData.get('observacoes'),
        servicos: [
          {
            id: 'srv-001',
            nome: formData.get('servicoNome'),
            preco: parseFloat(formData.get('servicoPreco')),
            descricao: formData.get('servicoDescricao')
          }
        ],
        valorSinal: parseFloat(formData.get('valorSinal')) || 0
      };

      // Criar pedido
      const respCriar = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });

      const pedidoCriado = await respCriar.json();
      const pedidoId = pedidoCriado.data.id;
      const codigo = pedidoCriado.data.codigo;

      // Enviar via WhatsApp
      const respEnvio = await fetch(`/api/pedidos/${pedidoId}/enviar-detalhes-whatsapp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telefoneCliente: dados.clientPhone
        })
      });

      const resultado = await respEnvio.json();

      if (resultado.success) {
        setMensagem(`✅ Pedido ${codigo} criado e enviado via WhatsApp!`);
        e.target.reset();
      } else {
        setMensagem(`❌ Erro: ${resultado.error}`);
      }

    } catch (erro) {
      setMensagem(`❌ Erro: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pedido-form">
      <h2>Novo Pedido com WhatsApp</h2>
      
      <form onSubmit={enviarPedidoWhatsApp}>
        <div>
          <label>Nome Cliente:</label>
          <input name="clientName" required />
        </div>

        <div>
          <label>Telefone WhatsApp:</label>
          <input name="clientPhone" placeholder="5511987654321" required />
        </div>

        <div>
          <label>Modelo do Tênis:</label>
          <input name="modeloTenis" required />
        </div>

        <div>
          <label>Serviço:</label>
          <input name="servicoNome" placeholder="Ex: Limpeza Profunda" required />
          <input name="servicoPreco" type="number" step="0.01" placeholder="Preço" required />
          <input name="servicoDescricao" placeholder="Descrição (opcional)" />
        </div>

        <div>
          <label>Data de Entrega:</label>
          <input name="dataPrevistaEntrega" type="date" required />
        </div>

        <div>
          <label>Sinal Pago:</label>
          <input name="valorSinal" type="number" step="0.01" defaultValue="0" />
        </div>

        <div>
          <label>Observações:</label>
          <textarea name="observacoes"></textarea>
        </div>

        <button type="submit" disabled={carregando}>
          {carregando ? 'Enviando...' : 'Criar Pedido & Enviar WhatsApp'}
        </button>
      </form>

      {mensagem && <div className="mensagem">{mensagem}</div>}
    </div>
  );
}
```

---

### 5. Enviar Apenas PDF para Pedido Existente

```javascript
async function enviarPdfExistente(pedidoId, telefone) {
  const response = await fetch(`/api/pedidos/${pedidoId}/enviar-pdf-whatsapp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      telefoneCliente: telefone
    })
  });

  const resultado = await response.json();
  
  if (resultado.success) {
    console.log('✅ PDF enviado com sucesso!');
    return resultado.data.pdfUrl;
  } else {
    console.error('❌ Erro:', resultado.error);
    return null;
  }
}

// Uso
enviarPdfExistente(
  '550e8400-e29b-41d4-a716-446655440000',
  '5511987654321'
);
```

---

### 6. Usar em Postman

**Request 1: Criar Pedido**

```
POST http://localhost:3000/api/pedidos
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "clienteId": "cliente-123",
  "clientName": "João Silva",
  "clientPhone": "5511987654321",
  "modeloTenis": "Nike Air Jordan 1 Retro",
  "servicos": [
    {
      "id": "srv-001",
      "nome": "Limpeza Profunda",
      "preco": 50.00,
      "descricao": "Limpeza com produtos profissionais"
    },
    {
      "id": "srv-002",
      "nome": "Restauração de Couro",
      "preco": 150.00,
      "descricao": "Restauração do couro envelhecido"
    }
  ],
  "dataPrevistaEntrega": "2026-01-23",
  "observacoes": "Cliente alérgico - usar apenas produtos naturais",
  "valorSinal": 100.00
}
```

**Request 2: Enviar Detalhes WhatsApp**

```
POST http://localhost:3000/api/pedidos/{{PEDIDO_ID}}/enviar-detalhes-whatsapp
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "telefoneCliente": "5511987654321"
}
```

**Request 3: Enviar PDF WhatsApp**

```
POST http://localhost:3000/api/pedidos/{{PEDIDO_ID}}/enviar-pdf-whatsapp
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "telefoneCliente": "5511987654321"
}
```

---

## 📊 Estrutura de Resposta Esperada

### Pedido Criado
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "codigo": "160126-001",
    "clienteId": "cliente-123",
    "clientName": "João Silva",
    "clientPhone": "5511987654321",
    "modeloTenis": "Nike Air Jordan 1 Retro",
    "precoTotal": 200.00,
    "valorSinal": 100.00,
    "valorRestante": 100.00,
    "dataCriacao": "2026-01-16T14:30:00.000Z",
    "dataPrevistaEntrega": "2026-01-23T00:00:00.000Z",
    "status": "Atendimento - Aguardando Aprovação",
    "servicos": [
      {
        "id": "srv-001",
        "nome": "Limpeza Profunda",
        "preco": 50.00,
        "descricao": "Limpeza com produtos profissionais"
      },
      {
        "id": "srv-002",
        "nome": "Restauração de Couro",
        "preco": 150.00,
        "descricao": "Restauração do couro envelhecido"
      }
    ]
  }
}
```

### Detalhes Enviados
```json
{
  "success": true,
  "message": "Detalhes do pedido enviados com sucesso via WhatsApp",
  "data": {
    "success": true,
    "messageId": "wamid.GBB123456789012_1234567890123456"
  }
}
```

### PDF Enviado
```json
{
  "success": true,
  "message": "PDF enviado com sucesso via WhatsApp",
  "data": {
    "success": true,
    "messageId": "wamid.GBB123456789012_9876543210654321",
    "pdfUrl": "https://your-bucket.s3.amazonaws.com/User/cliente-123/pedidos/.../pedido-xxxxx.pdf"
  }
}
```

---

## 🔍 Dicas de Debugging

```javascript
// Monitorar logs
console.log('[WhatsApp-PDF] ...');      // Envio de PDF
console.log('[WhatsApp-Detalhes] ...'); // Envio de detalhes
console.log('[PedidoService] Código gerado: 160126-001');

// Verificar resposta completa
console.log(JSON.stringify(resposta, null, 2));

// Validar número
const isValidPhone = (phone) => /^55\d{10,11}$/.test(phone);
console.log(isValidPhone('5511987654321')); // true
console.log(isValidPhone('11987654321'));  // false
```

---

## ✅ Checklist de Implementação

- [ ] Variáveis de ambiente configuradas
- [ ] Token WhatsApp Cloud API obtido
- [ ] Phone Number ID configurado
- [ ] S3 Bucket criado e configurado
- [ ] DynamoDB Counters table criada
- [ ] Rotas adicionadas ao API
- [ ] Testes com Postman realizados
- [ ] Frontend integrado
- [ ] Mensagens formatadas confirmadas
- [ ] PDFs sendo gerados corretamente
- [ ] Logs monitorados e validados

Pronto para produção! 🚀
