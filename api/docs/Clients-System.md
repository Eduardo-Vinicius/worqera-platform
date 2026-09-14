# 👥 Sistema de Clientes

## Visão Geral

Módulo responsável pelo gerenciamento completo de clientes, incluindo informações pessoais, endereços e histórico de relacionamento com a loja.

## Características Principais

- ✅ **CRUD Completo** (Create, Read, Update, Delete)
- ✅ **Validação de CPF** automática
- ✅ **Endereço Completo** estruturado
- ✅ **Histórico de Pedidos** vinculado
- ✅ **Busca e Filtros** avançados
- ✅ **Integração WhatsApp** para contato
- ✅ **Controle de Acesso** por role

## Estrutura de Dados

### Modelo Cliente:

```json
{
  "id": "cliente-123e4567-e89b",
  "nome": "João Silva Santos",
  "cpf": "123.456.789-10",
  "telefone": "+5511999888777",
  "email": "joao.silva@email.com",
  "endereco": {
    "rua": "Rua das Flores, 123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "cep": "01234-567",
    "uf": "SP",
    "complemento": "Apto 45"
  },
  "dataNascimento": "1985-06-15",
  "observacoes": "Cliente VIP - Desconto de 10%",
  "ativo": true,
  "dataCriacao": "2024-01-15T10:30:00.000Z",
  "dataUltimaAtualizacao": "2024-10-03T15:45:00.000Z",
  "ultimoPedido": "2024-09-28T14:20:00.000Z",
  "totalPedidos": 5,
  "valorTotalGasto": 850.75
}
```

## Endpoints

### 📋 Listar Clientes

#### `GET /clientes`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Query Parameters:**
```
?page=1              # Página (padrão: 1)
&limit=20            # Itens por página (padrão: 20, máx: 100)
&search=João         # Busca por nome, CPF ou telefone
&ativo=true          # Filtrar por status ativo
&cidade=São Paulo    # Filtrar por cidade
&orderBy=nome        # Ordenar por: nome, dataCriacao, ultimoPedido
&order=asc           # Ordem: asc, desc
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cliente-123",
      "nome": "João Silva Santos",
      "cpf": "123.456.789-10",
      "telefone": "+5511999888777",
      "email": "joao.silva@email.com",
      "endereco": {
        "cidade": "São Paulo",
        "uf": "SP"
      },
      "totalPedidos": 5,
      "valorTotalGasto": 850.75,
      "ultimoPedido": "2024-09-28T14:20:00.000Z",
      "dataCriacao": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 45,
    "itemsPerPage": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 🔍 Obter Cliente Específico

#### `GET /clientes/:id`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cliente-123",
    "nome": "João Silva Santos",
    "cpf": "123.456.789-10",
    "telefone": "+5511999888777",
    "email": "joao.silva@email.com",
    "endereco": {
      "rua": "Rua das Flores, 123",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "cep": "01234-567",
      "uf": "SP",
      "complemento": "Apto 45"
    },
    "dataNascimento": "1985-06-15",
    "observacoes": "Cliente VIP - Desconto de 10%",
    "ativo": true,
    "dataCriacao": "2024-01-15T10:30:00.000Z",
    "dataUltimaAtualizacao": "2024-10-03T15:45:00.000Z",
    "ultimoPedido": "2024-09-28T14:20:00.000Z",
    "totalPedidos": 5,
    "valorTotalGasto": 850.75,
    "pedidosRecentes": [
      {
        "id": "10032024AB1C",
        "modeloTenis": "Nike Air Max 270",
        "status": "Atendimento - Entregue",
        "precoTotal": 180.50,
        "dataCriacao": "2024-09-28T14:20:00.000Z"
      }
    ]
  }
}
```

### ➕ Criar Cliente

#### `POST /clientes`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Body:**
```json
{
  "nome": "Maria Oliveira Costa",
  "cpf": "987.654.321-09",
  "telefone": "+5511888777666",
  "email": "maria.costa@email.com",
  "endereco": {
    "rua": "Av. Paulista, 1000",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "cep": "01310-100",
    "uf": "SP",
    "complemento": "Sala 1201"
  },
  "dataNascimento": "1990-03-22",
  "observacoes": "Prefere contato via WhatsApp"
}
```

**Validações:**
- `nome`: Obrigatório, mínimo 2 caracteres
- `cpf`: Obrigatório, formato válido e único
- `telefone`: Formato válido (+5511999888777)
- `email`: Formato válido e único (opcional)
- `endereco.cep`: Formato válido (opcional)
- `dataNascimento`: Data válida (opcional)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "cliente-456def789gh",
    "nome": "Maria Oliveira Costa",
    "cpf": "987.654.321-09",
    "telefone": "+5511888777666",
    "email": "maria.costa@email.com",
    "endereco": {
      "rua": "Av. Paulista, 1000",
      "bairro": "Bela Vista",
      "cidade": "São Paulo",
      "cep": "01310-100",
      "uf": "SP",
      "complemento": "Sala 1201"
    },
    "dataNascimento": "1990-03-22",
    "observacoes": "Prefere contato via WhatsApp",
    "ativo": true,
    "dataCriacao": "2024-10-03T16:30:00.000Z",
    "totalPedidos": 0,
    "valorTotalGasto": 0
  },
  "message": "Cliente criado com sucesso"
}
```

### ✏️ Atualizar Cliente

#### `PUT /clientes/:id`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Body:** Mesmo formato do POST (todos os campos)

#### `PATCH /clientes/:id`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Body (Atualização parcial):**
```json
{
  "telefone": "+5511999777888",
  "endereco": {
    "rua": "Rua Nova, 456",
    "bairro": "Vila Nova",
    "cep": "02345-678"
  },
  "observacoes": "Atualizado telefone e endereço"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cliente-123",
    // ... cliente atualizado
    "dataUltimaAtualizacao": "2024-10-03T16:45:00.000Z"
  },
  "message": "Cliente atualizado com sucesso"
}
```

### 🗑️ Excluir Cliente

#### `DELETE /clientes/:id`

**Autenticação:** Requerida  
**Permissões:** `admin`

**Ação:** Exclusão lógica (marca como inativo)

**Response (200):**
```json
{
  "success": true,
  "message": "Cliente excluído com sucesso",
  "data": {
    "id": "cliente-123",
    "ativo": false,
    "dataExclusao": "2024-10-03T16:50:00.000Z"
  }
}
```

### 📊 Histórico do Cliente

#### `GET /clientes/:id/pedidos`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Query Parameters:**
```
?status=entregue     # Filtrar por status
&ano=2024           # Filtrar por ano
&limit=10           # Limitar resultados
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cliente": {
      "id": "cliente-123",
      "nome": "João Silva Santos",
      "totalPedidos": 5,
      "valorTotalGasto": 850.75
    },
    "pedidos": [
      {
        "id": "10032024AB1C",
        "modeloTenis": "Nike Air Max 270",
        "status": "Atendimento - Entregue",
        "precoTotal": 180.50,
        "dataCriacao": "2024-09-28T14:20:00.000Z",
        "dataPrevistaEntrega": "2024-10-05",
        "servicos": ["Lavagem completa", "Pintura personalizada"]
      },
      {
        "id": "09152024XY9Z",
        "modeloTenis": "Adidas Superstar",
        "status": "Atendimento - Entregue",
        "precoTotal": 95.00,
        "dataCriacao": "2024-09-15T09:30:00.000Z",
        "servicos": ["Lavagem básica"]
      }
    ],
    "estatisticas": {
      "ticketMedio": 170.15,
      "servicoMaisContratado": "Lavagem completa",
      "tempoMedioEntrega": "7 dias"
    }
  }
}
```

## Validações e Regras de Negócio

### Validação de CPF:

```javascript
function validarCPF(cpf) {
  // Remove formatação
  cpf = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se não são todos iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação dos dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}
```

### Validação de Telefone:

```javascript
function validarTelefone(telefone) {
  // Formato esperado: +5511999888777
  const regex = /^\+55\d{2}9?\d{8}$/;
  return regex.test(telefone);
}
```

### Validação de CEP:

```javascript
function validarCEP(cep) {
  // Formato: 12345-678 ou 12345678
  const regex = /^\d{5}-?\d{3}$/;
  return regex.test(cep);
}
```

## Busca e Filtros Avançados

### Implementação de Busca:

```javascript
// Busca em múltiplos campos
function buscarClientes(termo) {
  const termoBusca = termo.toLowerCase();
  
  return clientes.filter(cliente => {
    return (
      cliente.nome.toLowerCase().includes(termoBusca) ||
      cliente.cpf.replace(/[^\d]/g, '').includes(termoBusca.replace(/[^\d]/g, '')) ||
      cliente.telefone.includes(termoBusca) ||
      cliente.email.toLowerCase().includes(termoBusca) ||
      cliente.endereco.cidade.toLowerCase().includes(termoBusca)
    );
  });
}
```

### Filtros Disponíveis:

| Filtro | Tipo | Exemplo |
|--------|------|---------|
| `search` | String | `João Silva` |
| `ativo` | Boolean | `true`, `false` |
| `cidade` | String | `São Paulo` |
| `uf` | String | `SP`, `RJ` |
| `temPedidos` | Boolean | `true` (clientes com pedidos) |
| `dataCriacaoInicio` | Date | `2024-01-01` |
| `dataCriacaoFim` | Date | `2024-12-31` |
| `valorMinimoGasto` | Number | `500.00` |

## Integração com Pedidos

### Atualização Automática de Estatísticas:

```javascript
// Quando um pedido é criado/atualizado
async function atualizarEstatisticasCliente(clienteId) {
  const pedidos = await getPedidosByCliente(clienteId);
  
  const estatisticas = {
    totalPedidos: pedidos.length,
    valorTotalGasto: pedidos.reduce((sum, p) => sum + p.precoTotal, 0),
    ultimoPedido: pedidos[0]?.dataCriacao,
    ticketMedio: pedidos.length > 0 ? valorTotalGasto / pedidos.length : 0
  };
  
  await updateCliente(clienteId, estatisticas);
}
```

### Vinculação Automática:

```javascript
// No momento de criar pedido
exports.createPedido = async (req, res) => {
  const { clienteId } = req.body;
  
  // Verificar se cliente existe
  const cliente = await clienteService.getCliente(clienteId);
  if (!cliente) {
    return res.status(400).json({
      success: false,
      error: 'Cliente não encontrado'
    });
  }
  
  // Criar pedido com nome do cliente
  const dadosPedido = {
    ...req.body,
    clientName: cliente.nome,
    telefoneCliente: cliente.telefone  // Para WhatsApp
  };
  
  // ... resto da lógica
};
```

## 📱 Integração WhatsApp

### Envio de Mensagens Automáticas:

```javascript
// Quando pedido é criado
async function enviarBemVindo(cliente, pedido) {
  const mensagem = `
Olá ${cliente.nome}! 👋

Seu pedido foi recebido com sucesso!

📋 Pedido: ${pedido.id}
👟 Tênis: ${pedido.modeloTenis}
💰 Valor: R$ ${pedido.precoTotal.toFixed(2)}
📅 Previsão: ${pedido.dataPrevistaEntrega}

Você pode acompanhar o status pelo link:
https://app.shoerepair.com/pedidos/${pedido.id}

Em breve entraremos em contato!

Shoe Repair LTDA
  `;
  
  await whatsappService.enviarMensagem(cliente.telefone, mensagem);
}
```

## 🔍 Exemplos de Uso

### 1. Buscar Clientes:

```bash
# Busca por nome
curl -X GET "https://api.shoerepair.com/dev/clientes?search=João Silva" \
  -H "Authorization: Bearer <token>"

# Filtrar por cidade
curl -X GET "https://api.shoerepair.com/dev/clientes?cidade=São Paulo&ativo=true" \
  -H "Authorization: Bearer <token>"

# Ordenar por valor gasto
curl -X GET "https://api.shoerepair.com/dev/clientes?orderBy=valorTotalGasto&order=desc" \
  -H "Authorization: Bearer <token>"
```

### 2. Criar Cliente Completo:

```javascript
const novoCliente = {
  nome: "Ana Carolina Santos",
  cpf: "456.789.123-87",
  telefone: "+5511987654321",
  email: "ana.santos@gmail.com",
  endereco: {
    rua: "Rua das Palmeiras, 789",
    bairro: "Jardins",
    cidade: "São Paulo",
    cep: "01234-567",
    uf: "SP",
    complemento: "Casa 2"
  },
  dataNascimento: "1988-12-10",
  observacoes: "Cliente indicada por João Silva"
};

const response = await fetch('/clientes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(novoCliente)
});

const result = await response.json();
console.log('Cliente criado:', result.data.id);
```

### 3. Atualizar Dados Parcialmente:

```bash
curl -X PATCH https://api.shoerepair.com/dev/clientes/cliente-123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "+5511999888777",
    "observacoes": "Telefone atualizado em 03/10/2024"
  }'
```

### 4. Consultar Histórico:

```bash
# Histórico completo
curl -X GET https://api.shoerepair.com/dev/clientes/cliente-123/pedidos \
  -H "Authorization: Bearer <token>"

# Apenas pedidos entregues de 2024
curl -X GET "https://api.shoerepair.com/dev/clientes/cliente-123/pedidos?status=entregue&ano=2024" \
  -H "Authorization: Bearer <token>"
```

## 📊 Relatórios e Analytics

### Métricas por Cliente:

```javascript
// Relatório de clientes VIP (> R$ 1000 gastos)
const clientesVIP = await clienteService.getClientesVIP({
  valorMinimo: 1000,
  pedidosMinimos: 3
});

// Top 10 clientes por valor gasto
const topClientes = await clienteService.getTopClientes({
  limite: 10,
  ordenarPor: 'valorTotalGasto'
});

// Clientes inativos (sem pedidos há 6 meses)
const clientesInativos = await clienteService.getClientesInativos({
  diasSemPedido: 180
});
```

---

**Arquivos Relacionados:**
- `src/controllers/clienteController.js`
- `src/services/clienteService.js`
- `src/routes/clienteRoutes.js`
- `src/models/clienteModel.js`
- `src/utils/validators.js`