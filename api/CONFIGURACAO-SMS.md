# 📱 Configuração de SMS via AWS SNS

Este guia mostra como configurar o envio de SMS automáticos usando AWS SNS.

## ✅ Vantagens do AWS SNS

- 🚀 **Já integrado** - Você já está na AWS!
- 💰 **Custo baixo** - ~R$ 0,30 por SMS no Brasil
- 🌍 **Global** - Funciona em 200+ países
- 🔒 **Seguro** - Mesma infraestrutura da Lambda
- ✅ **Sem setup extra** - Usa suas credenciais AWS

---

## 📋 Passo 1: Ativar SMS na AWS

### 1️⃣ **Verificar cota de SMS (Sandbox)**

Por padrão, a AWS limita o envio de SMS. Você precisa solicitar aumento:

1. Acesse o console da AWS SNS: https://console.aws.amazon.com/sns
2. No menu lateral, clique em **"SMS messaging"**
3. Clique em **"Request to increase sending limit"**
4. Preencha o formulário:
   - **Service:** Amazon SNS
   - **Type:** SMS
   - **Region:** US East (N. Virginia) - ou sua região
   - **Use case:** Transactional SMS for order updates
   - **Website:** URL do seu negócio
   - **How will you ensure SMS compliance?** Descreva que envia apenas para clientes que fizeram pedidos

⏰ **Tempo de aprovação:** 24-48 horas

---

### 2️⃣ **Configurar Sender ID (opcional)**

Alguns países permitem que você defina um nome que aparece no SMS (ex: "ShoeRepair").

1. No console SNS, vá em **"SMS messaging" → "Sender ID settings"**
2. Configure conforme necessário

⚠️ **Nota:** Brasil **NÃO** suporta Sender ID. O número aparecerá como genérico.

---

## 🔧 Passo 2: Configurar no Projeto

### **Opção A - Usar variáveis de ambiente (Local):**

Edite o arquivo `.env`:

```env
# ==========================================
# SMS VIA AWS SNS
# ==========================================

# Habilitar envio de SMS (true/false)
SMS_ENABLED=true

# Nome que aparece no SMS (opcional, nem todos países suportam)
SMS_SENDER_ID=ShoeRepair

# Região AWS (já configurada)
AWS_REGION=us-east-1
```

### **Opção B - Lambda (AWS):**

Já está configurado no `template.yaml`! Só precisa mudar para `true`:

```yaml
Environment:
  Variables:
    SMS_ENABLED: 'true'  # ← Mude de 'false' para 'true'
```

Depois, faça deploy novamente:
```powershell
.\deploy-lambda.ps1
```

---

## 📞 Passo 3: Cadastrar Telefones dos Clientes

Os clientes precisam ter telefone cadastrado no formato internacional:

### **Formato correto:**
```
+5511999999999
```

- `+55` = Código do Brasil
- `11` = DDD
- `999999999` = Número (9 dígitos)

### **Formatos aceitos:**
✅ `+5511999999999`
✅ `+55 11 99999-9999` (remove espaços automaticamente)
❌ `11999999999` (sem código do país)
❌ `(11) 99999-9999` (sem código do país)

---

## 🧪 Passo 4: Testar

### **Teste 1: Criar pedido com telefone**

```javascript
POST /pedidos
{
  "clienteId": "abc123",
  "clientName": "João Silva",
  "modeloTenis": "Nike Air Max",
  "servicos": [...],
  // Cliente deve ter telefone cadastrado: +5511999999999
}
```

Se `SMS_ENABLED=true` e o cliente tem telefone + **status é "Atendimento - Finalizado"**, receberá:
```
João Silva, seu pedido #190226-001 esta pronto para retirada! Aguardamos voce. Obrigado!
```

✅ **Importante:** SMS só é enviado quando o pedido está pronto (economia!)

### **Teste 2: Status intermediário (não envia SMS)**

```javascript
POST /pedidosAtendimento - Finalizado"
}
```

Cliente receberá **email + SMS** avisando que está pronto! 📱

Cliente receberá apenas **email** (não SMS) - economia de custo!

### **Teste 3: Status finalizado (envia SMS!)**

```javascript
POST /pedidos/:id/status
{
  "status": "Limpeza - Em Andamento"
}
```

Cliente receberá SMS com o novo status!

---

## 💰 Custos (Apenas SMS enviados!)

### **Preços AWS SNS (2026) - Muito Mais Barato!:**
- 🇧🇷 **Brasil:** ~R$ 0,04 a R$ 0,07 por SMS (não R$ 0,30!)
- 🇺🇸 **EUA:** ~$0,00645 por SMS ($0.01 USD)
- Grátis para receber

### **Exemplo de custo mensal (apenas SMS finalizados):**

**Com SMS apenas em "Atendimento - Finalizado":**
- **100 pedidos/mês** × 1 SMS (finalização):
  - 100 SMS × R$ 0,05 = **R$ 5,00/mês** ✅

- **500 pedidos/mês:**
  - 500 SMS × R$ 0,05 = **R$ 25,00/mês** ✅

- **1000 pedidos/mês:**
  - 1000 SMS × R$ 0,05 = **R$ 50,00/mês** ✅

💡 **Configuração atual:** SMS enviado **APENAS** quando o pedido fica pronto (status "Atendimento - Finalizado")!

### **Se enviar em todos os status (não recomendado):**
- 100 pedidos × 3 SMS = **R$ 15/mês**
- 500 pedidos × 3 SMS = **R$ 75/mês**
- 1000 pedidos × 3 SMS = **R$ 150/mês**

**✅ Conclusão:** Muito barato! Menos de R$ 0,10 por cliente notificado!

---

## 🔍 Logs e Monitoramento

### **Ver logs de SMS:**

```powershell
# Ver logs da Lambda
aws logs tail /aws/lambda/ShoeRepairApiFunction --follow --region us-east-1

# Procure por:
# [SMS] 📱 Enviando SMS...
# [SMS] ✅ SMS enviado com sucesso!
```

### **Ver estatísticas no Console AWS:**

1. Acesse: https://console.aws.amazon.com/sns
2. Clique em **"SMS messaging" → "Delivery statistics"**
3. Veja taxa de entrega, falhas, custos, etc.

---

## 🎯 Quando o SMS é enviado?

**✅ Configuração Atual (Otimizada para Economia):**

| Status | Email | SMS |
|--------|-------|-----|
| Pedido criado | ✅ | ❌ |
| Status atualizado | ✅ | ❌ |
| Setor alterado | ✅ | ❌ |
| **Atendimento - Finalizado** | ✅ | **✅ SMS!** |

💡 **SMS enviado apenas quando o pedido está pronto para retirada!**

Isso economiza muito:
- 100 pedidos = 100 SMS (R$ 5) ao invés de 300 SMS (R$ 15)
- **Economia de 67%!**

### **Status que acionam SMS:**
- ✅ "Atendimento - Finalizado"
- ✅ "Finalizado"  
- ✅ "Pronto para Retirada"
- ✅ "Aguardando Retirada"

### **Todos os outros status:**
❌ Enviam apenas email (grátis)

---

## ⚠️ Troubleshooting

### ❌ "SMS não foi enviado"

**Verificações:**

1. **`SMS_ENABLED=true`?**
   ```powershell
   # Ver variável na Lambda
   aws lambda get-function-configuration `
     --function-name ShoeRepairApiFunction `
     --query "Environment.Variables.SMS_ENABLED"
   ```

2. **Cliente tem telefone válido?**
   - Deve começar com `+55`
   - Deve ter 13 dígitos (+5511999999999)

3. **Cota de SMS não excedida?**
   - Console AWS SNS → "SMS messaging" → "Spending limits"

4. **Permissão SNS na Lambda?**
   - Verifique o IAM Role (já configurado no template.yaml)

### ❌ "Rate exceeded"

A AWS tem limite de 1 SMS por segundo por padrão. Se enviar muitos de uma vez, aguarde alguns segundos.

### ❌ "Invalid phone number"

Telefone não está no formato internacional. Corrija para: `+5511999999999`

---

## 🚀 Deploy

### **1. Atualizar código:**
```powershell
# Já implementado! Só fazer deploy
.\deploy-lambda.ps1
```

### **2. Ativar SMS:**

Edite o [template.yaml](template.yaml) e mude:
```yaml
SMS_ENABLED: 'true'  # ← Mude aqui
```

Depois:
```powershell
.\deploy-lambda.ps1
```

### **3. Testar!**

Crie um pedido com um cliente que tenha telefone cadastrado!

---

## 📊 Métricas de Sucesso

Após ativar, você verá nos logs:

```
[SMS] 📱 Enviando SMS...
[SMS] ✅ SMS enviado com sucesso!
[SMS] messageId: abc123-xyz
[SMS] caracteres: 98
```

---

## 💡 Dicas de Otimização

### **1. Customizar mensagens por status:**
Customizar quando enviar SMS:**

Por padrão, SMS é enviado apenas para **status finalizados**. Se quiser mudar, edite [emailService.js](src/services/emailService.js):

```javascript
// Exemplo: também enviar quando aprovado
const isStatusFinalizado = 
  statusLower.includes('atendimento - finalizado') ||
  statusLower.includes('finalizado') ||
  statusLower.includes('aprovado') || // ← adicione aqui
  statusLower.includes('pronto para retirada');
```

### **3. Enviar em todos os status (não recomendado - mais caro):**

Se quiser enviar SMS em **todos** os status, remova a validação:

```javascript
// Comentar ou remover esta parte:
/*
if (!isStatusFinalizado) {
  console.log('[SMS] ⏭️ SMS não enviado - apenas para status finalizados');
  return null;
}
*/
```

⚠️ **Atenção:** Isso vai triplicar seus custos!

### **4
```

### **2. Enviar apenas para status importantes:**

```javascript
// Somente enviar SMS em status finais
const statusImportantes = ['Finalizado', 'Pronto para Retirada', 'Aguardando Retirada'];
if (statusImportantes.includes(status)) {
  await emailService.enviarSMSStatus(...);
}
```

### **3. Permitir cliente optar por não receber:**

Adicione um campo `receberSMS` no cadastro do cliente:

```javascript
if (cliente.receberSMS) {
  await emailService.enviarSMSStatus(...);
}
```

---

## 🌍 Envio Internacional

O AWS SNS funciona em 200+ países. Exemplos:

- 🇧🇷 Brasil: `+5511999999999`
- 🇺🇸 EUA: `+14155552671`
- 🇵🇹 Portugal: `+351912345678`
- 🇲🇽 México: `+525512345678`

Consulte custos por país: https://aws.amazon.com/sns/sms-pricing/

---

## 📚 Recursos Adicionais

- **Console AWS SNS:** https://console.aws.amazon.com/sns
- **Documentação SNS SMS:** https://docs.aws.amazon.com/sns/latest/dg/sns-sms-messages.html
- **Preços:** https://aws.amazon.com/sns/pricing/
- **Limites:** https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox.html

---

## ✅ Checklist de Ativação

- [ ] Solicitado aumento de cota no AWS Console
- [ ] Aguardado aprovação (24-48h)
- [ ] `SMS_ENABLED=true` configurado
- [ ] Deploy feito com novo código
- [ ] Clientes têm telefones no formato `+5511999999999`
- [ ] Testado criando um pedido
- [ ] SMS recebido com sucesso ✅

---

## 🎉 Pronto!

Agora seus clientes recebem **Email + SMS** automaticamente! 📧📱

**Próximos passos:**
- Monitore os logs
- Ajuste mensagens conforme necessário
- Configure alertas de custo no AWS Billing
