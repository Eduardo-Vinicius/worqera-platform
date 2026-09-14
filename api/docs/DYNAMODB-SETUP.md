# Configuração do DynamoDB - ShoeRepairCounters

## 📊 Tabela Necessária para Contadores

Você precisa criar uma tabela no DynamoDB para armazenar os contadores sequenciais dos pedidos.

### Estrutura da Tabela

**Nome da Tabela:** `ShoeRepairCounters`

**Configuração:**

| Propriedade | Valor |
|-------------|-------|
| Nome | `ShoeRepairCounters` |
| Partition Key | `id` (String) |
| Sort Key | Nenhuma |
| Modo de Cobrança | PAY_PER_REQUEST (recomendado) |
| TTL | Opcional - não configurar |

---

## 🔑 Estrutura de Dados

### Documento de Exemplo

```json
{
  "id": "pedido-160126",           // Formato: pedido-DDMMYY
  "count": 42,                      // Número sequencial (incrementado automaticamente)
  "createdAt": "2026-01-16T00:00:00Z"  // Data de criação (opcional)
}
```

**Explicação:**
- `id` = Identificador único do contador
- `count` = Valor sequencial (aumenta a cada novo pedido)
- `createdAt` = Timestamp de quando foi criado (informativo)

---

## 📝 Como Criar via AWS Console

### Passo 1: Abrir DynamoDB

1. Acesse [AWS Console](https://console.aws.amazon.com)
2. Procure por **DynamoDB**
3. Clique em **DynamoDB**

### Passo 2: Criar Tabela

1. Clique em **Criar Tabela**
2. Preencha as informações:

```
Nome da tabela: ShoeRepairCounters

Atributo de Chave de Partição: id (String)

Modo de Cobrança: 
  ☑ Pagamento conforme a utilização (PAY_PER_REQUEST)
  (Mais barato para uso leve/médio)
```

3. Clique em **Criar**

### Passo 3: Esperar Criação

Aguarde até que o status seja **Ativo** (geralmente 1-2 minutos)

---

## 📝 Como Criar via AWS CLI

```bash
# Configure suas credenciais AWS primeiro
aws configure

# Criar a tabela
aws dynamodb create-table \
    --table-name ShoeRepairCounters \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1  # Mude para sua região

# Verificar se foi criada
aws dynamodb describe-table \
    --table-name ShoeRepairCounters \
    --region us-east-1
```

---

## 📝 Como Criar via Terraform

```hcl
# terraform/dynamodb.tf

resource "aws_dynamodb_table" "shoe_repair_counters" {
  name           = "ShoeRepairCounters"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Environment = "production"
    Application = "ShoeRepair"
  }
}

# Output
output "counters_table_name" {
  value = aws_dynamodb_table.shoe_repair_counters.name
}
```

Deploy com:
```bash
terraform init
terraform plan
terraform apply
```

---

## 🧪 Teste de Funcionamento

### Via AWS Console

1. Abra a tabela `ShoeRepairCounters`
2. Vá para **Explorador de itens**
3. Clique em **Criar item**
4. Preenchimento manual para teste:

```json
{
  "id": {
    "S": "pedido-160126"
  },
  "count": {
    "N": "0"
  }
}
```

5. Clique em **Criar item**

### Via AWS CLI

```bash
# Adicionar item de teste
aws dynamodb put-item \
    --table-name ShoeRepairCounters \
    --item '{"id": {"S": "pedido-160126"}, "count": {"N": "0"}}' \
    --region us-east-1

# Ler item
aws dynamodb get-item \
    --table-name ShoeRepairCounters \
    --key '{"id": {"S": "pedido-160126"}}' \
    --region us-east-1

# Incrementar contador (teste UPDATE)
aws dynamodb update-item \
    --table-name ShoeRepairCounters \
    --key '{"id": {"S": "pedido-160126"}}' \
    --update-expression 'ADD #count :incr' \
    --expression-attribute-names '{"#count": "count"}' \
    --expression-attribute-values '{":incr": {"N": "1"}}' \
    --return-values ALL_NEW \
    --region us-east-1
```

---

## 🔐 Configurar Permissões IAM

Se estiver usando role IAM, certifique-se que tem permissões:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:UpdateItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ShoeRepairCounters"
    }
  ]
}
```

---

## 🔄 Fluxo de Geração de Código

```
Nova requisição de pedido
      ↓
Função gerarCodigoPedido()
      ↓
Formato: pedido-160126
      ↓
Query DynamoDB ShoeRepairCounters
      ↓
┌─────────────────┐
│ Item existe?    │
└────┬────────────┘
     │
     ├─ SIM → INCREMENT count
     │        count = 42
     │        código = "160126-042"
     │
     └─ NÃO → CREATE com count=1
              código = "160126-001"
      ↓
Retorna código
      ↓
Pedido criado com código!
```

---

## 💡 Exemplo de Uso no Código

```javascript
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

async function gerarCodigoPedido() {
  const now = new Date();
  const dia = now.getDate().toString().padStart(2, '0');
  const mes = (now.getMonth() + 1).toString().padStart(2, '0');
  const ano = now.getFullYear().toString().slice(-2);
  const dataKey = `${dia}${mes}${ano}`;

  const counterId = `pedido-${dataKey}`;

  try {
    // Incrementar contador
    const params = {
      TableName: 'ShoeRepairCounters',
      Key: { id: counterId },
      UpdateExpression: 'ADD #count :incr',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':incr': 1 },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDb.update(params).promise();
    const sequencial = result.Attributes.count;
    const codigo = `${dataKey}-${String(sequencial).padStart(3, '0')}`;

    console.log(`Código gerado: ${codigo}`);
    return codigo;

  } catch (error) {
    console.error('Erro ao gerar código:', error);
    // Fallback
    const timestamp = Date.now();
    const shortSeq = timestamp.toString().slice(-3);
    return `${dataKey}-${shortSeq}`;
  }
}
```

---

## 📊 Monitoramento

### CloudWatch Metrics

Para monitorar a tabela, acesse **CloudWatch > Métricas**:

```
ShoeRepairCounters
├── ConsumedWriteCapacityUnits (deve ser baixo)
├── ConsumedReadCapacityUnits (deve ser baixo)
├── UserErrors (deve ser 0)
└── SystemErrors (deve ser 0)
```

### Verificar Itens na Tabela

```bash
# Contar itens
aws dynamodb scan \
    --table-name ShoeRepairCounters \
    --select COUNT \
    --region us-east-1

# Listar todos os contadores
aws dynamodb scan \
    --table-name ShoeRepairCounters \
    --region us-east-1
```

---

## 🚨 Troubleshooting

### Erro: "Requested resource not found"

```
Solução: Tabela não existe
1. Crie a tabela seguindo as instruções acima
2. Aguarde status "Ativo"
3. Tente novamente
```

### Erro: "User: X is not authorized"

```
Solução: Permissões IAM insuficientes
1. Verifique policy IAM
2. Adicione arn:aws:dynamodb:REGION:ACCOUNT:table/ShoeRepairCounters
3. Adicione actions: dynamodb:UpdateItem, dynamodb:GetItem
```

### Erro: "ValidationException: An AttributeValue may not contain a null"

```
Solução: Campo não pode ser null
1. Certifique-se que 'id' está sempre preenchido
2. Use formato correto: pedido-DDMMYY
```

---

## ⚡ Performance

**Com PAY_PER_REQUEST (recomendado):**
- Sem limite de throughput
- Cobra por cada operação
- Ideal para padrões de uso variável
- Escalável automaticamente

**Operações esperadas:**
- 1 UPDATE por novo pedido criado
- ~1-2 ms latência
- Custo muito baixo (< $0.001 por 100 pedidos)

---

## 🔐 Segurança

1. **Encrypt at Rest**: Ativado por padrão
2. **Encrypt in Transit**: Usar HTTPS sempre
3. **Point-in-time Recovery**: Opcional
4. **Backup**: Configure se necessário

---

## 📋 Checklist de Configuração

- [ ] Tabela `ShoeRepairCounters` criada
- [ ] Status da tabela é "Ativo"
- [ ] Permissões IAM adicionadas
- [ ] Variáveis de ambiente configuradas
- [ ] Teste de incremento funcionando
- [ ] Monitoramento CloudWatch ativo
- [ ] Backup policy definida (opcional)

---

## 🎯 Próximas Etapas

1. ✅ Criar tabela DynamoDB
2. ✅ Testar incremento de contador
3. ✅ Conectar ao código da API
4. ✅ Criar primeiro pedido
5. ✅ Verificar código gerado

Após todos esses passos, o sistema de geração de código estará **100% operacional**! 🚀
