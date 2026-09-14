# 📧 Configuração de E-mail (Gmail)

Este guia mostra como configurar o envio de emails automáticos usando Gmail.

## ✅ Passo 1: Configurar Senha de Aplicativo no Gmail

### Por que preciso de uma "Senha de aplicativo"?
O Gmail não permite que aplicativos usem sua senha normal por segurança. Você precisa gerar uma senha especial para o aplicativo.

### 🎯 MÉTODO MAIS FÁCIL - Link Direto:

**👉 Acesse diretamente:** https://myaccount.google.com/apppasswords

Se o link acima não funcionar, siga o método manual abaixo.

---

### 📋 Passo a Passo Detalhado:

#### **1️⃣ Ativar Verificação em 2 Etapas (Obrigatório)**

🔗 **Link direto:** https://myaccount.google.com/signinoptions/twosv

```
┌─────────────────────────────────────────┐
│  Google Account > Segurança             │
├─────────────────────────────────────────┤
│                                         │
│  🔐 Verificação em duas etapas         │
│                                         │
│  [ Começar ]  ← Clique aqui            │
│                                         │
└─────────────────────────────────────────┘
```

- Clique em **"Começar"**
- Confirme sua senha do Gmail
- Adicione seu telefone (vai receber um SMS)
- Digite o código que recebeu
- Clique em **"Ativar"**

✅ **Pronto!** A verificação está ativa.

---

#### **2️⃣ Gerar Senha de Aplicativo**

🔗 **Link direto:** https://myaccount.google.com/apppasswords

```
┌─────────────────────────────────────────┐
│  Senhas de app                          │
├─────────────────────────────────────────┤
│                                         │
│  Digite o nome do app:                  │
│  ┌───────────────────┐                 │
│  │ Shoe Repair API   │  ← Digite aqui │
│  └───────────────────┘                 │
│                                         │
│            [ Criar ]                    │
│                                         │
└─────────────────────────────────────────┘
```

1. Na caixa de texto, digite: **Shoe Repair API**
2. Clique em **"Criar"**
3. Uma senha de 16 caracteres vai aparecer:

```
┌─────────────────────────────────────────┐
│  Sua senha de app                       │
├─────────────────────────────────────────┤
│                                         │
│     abcd efgh ijkl mnop                │
│                                         │
│  [ Copiar ] [ Concluir ]               │
│                                         │
└─────────────────────────────────────────┘
```

4. **Clique em "Copiar"** (ou copie manualmente: `abcdefghijklmnop` - sem espaços!)
5. **Cole em algum lugar seguro** (bloco de notas, por exemplo)

⚠️ **ATENÇÃO:** Depois que você clicar "Concluir", essa senha não aparece mais! Se perder, precisa gerar outra.

---

#### **3️⃣ Remover os Espaços da Senha**

A senha que você copiou tem espaços: `abcd efgh ijkl mnop`

**Você precisa remover os espaços:** `abcdefghijklmnop`

💡 **Dica:** Cole no Notepad e apague os espaços manualmente.

---

### ❓ Problemas Comuns ao Gerar Senha

#### **🚫 "Senhas de app não está disponível"**
- **Causa:** Verificação em 2 etapas não está ativa
- **Solução:** Volte ao passo 1️⃣ e ative primeiro

#### **🚫 Página dá erro ou não carrega**
- **Causa:** Você pode estar usando conta Google Workspace (empresa/escola)
- **Solução:** Use uma conta Gmail pessoal, ou peça ao administrador da empresa

#### **🚫 "Senha incorreta" ao testar**
- **Causa:** Você copiou com espaços ou usou a senha normal do Gmail
- **Solução:** Use a senha de 16 caracteres **SEM ESPAÇOS**

---

### 🎥 Precisa de ajuda visual?

Se mesmo assim tiver dúvida, você pode:
1. Procurar no YouTube: "Como gerar senha de aplicativo Gmail 2024"
2. Ou seguir este guia oficial do Google: https://support.google.com/accounts/answer/185833

---

## ✅ Passo 2: Configurar o arquivo .env

1. **Crie o arquivo `.env`** na raiz do projeto (se não existir):
   ```bash
   # No PowerShell, na raiz do projeto:
   New-Item -Path .env -ItemType File
   ```

2. **Adicione as configurações de email:**
   ```env
   # ==========================================
   # CONFIGURAÇÃO DE E-MAIL (Gmail)
   # ==========================================
   
   # Seu email do Gmail (que enviará os emails)
   GMAIL_USER=seu-email@gmail.com
   
   # Senha de aplicativo gerada no passo anterior
   # Exemplo: abcd efgh ijkl mnop (remover espaços)
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   
   # ==========================================
   # AWS CONFIGURATION
   # ==========================================
   
   AWS_REGION=us-east-1
   
   # DynamoDB Tables
   DYNAMODB_TABLE_CLIENTES=shoe-repair-clientes
   DYNAMODB_TABLE_PEDIDOS=shoe-repair-pedidos
   DYNAMODB_TABLE_USERS=shoe-repair-users
   
   # S3 para PDFs e fotos
   S3_BUCKET_NAME=shoe-repair-pdfs
   S3_REGION=us-east-1
   
   # JWT Authentication
   JWT_SECRET=your-jwt-secret-key-here-change-this-in-production
   JWT_EXPIRES_IN=24h
   
   # WhatsApp API (Evolution API)
   WHATSAPP_API_URL=http://seu-servidor:8080
   WHATSAPP_API_KEY=sua-chave-api
   WHATSAPP_INSTANCE_NAME=sua-instancia
   ```

3. **Substitua os valores:**
   - `seu-email@gmail.com` → Seu email real do Gmail
   - `abcdefghijklmnop` → A senha de aplicativo que você copiou (sem espaços)

---

## ✅ Passo 3: Verificar se está funcionando

### Teste local:
```bash
# 1. Certifique-se de que o .env está configurado
# 2. Inicie o servidor localmente
npm start

# 3. Crie um pedido de teste via API
# O email de confirmação deve ser enviado automaticamente
```

### Quando os emails são enviados:
1. **Criação de pedido** → Email de confirmação
2. **Atualização de status** → Email de notificação
3. **Pedido finalizado** → Email de conclusão

---

## 🔍 Troubleshooting (Resolução de Problemas)

### ❌ Erro: "Invalid login"
- Verifique se a **Verificação em Duas Etapas** está ativa
- Confirme que você está usando a **Senha de Aplicativo**, não sua senha normal
- A senha de aplicativo não deve conter espaços

### ❌ Erro: "Too many login attempts"
- O Gmail pode bloquear temporariamente por tentativas demais
- Aguarde 10-15 minutos e tente novamente
- Verifique se você está usando o email correto

### ❌ Emails não estão sendo enviados
- Verifique os logs do servidor para mensagens de erro
- Confirme que o arquivo `.env` está na raiz do projeto
- Certifique-se de que o `GMAIL_USER` e `GMAIL_APP_PASSWORD` estão corretos
- Verifique se os clientes têm email cadastrado no sistema

### ℹ️ Ver logs de email:
Os logs aparecem no console com prefixo `[Email/Nodemailer]`:
```
[Email/Nodemailer] E-mail enviado para cliente@email.com
```

---

## 🚀 Deploy na AWS Lambda

Quando fizer deploy na AWS, as variáveis de ambiente devem ser configuradas:

### Via AWS Console:
1. Acesse sua função Lambda
2. Vá em **"Configuration" → "Environment variables"**
3. Adicione:
   - `GMAIL_USER`: seu-email@gmail.com
   - `GMAIL_APP_PASSWORD`: sua-senha-de-aplicativo

### Via serverless.yml:
```yaml
provider:
  environment:
    GMAIL_USER: ${env:GMAIL_USER}
    GMAIL_APP_PASSWORD: ${env:GMAIL_APP_PASSWORD}
```

---

## 📧 Exemplo de Email Enviado

**Assunto:** ✅ Pedido #1001 - Confirmação de Recebimento

**Corpo:**
```
Olá João Silva,

Recebemos seu pedido com sucesso! Já estamos preparando tudo para cuidar do seu tênis.

📦 Detalhes do Pedido
- Código: #1001
- Tênis: Nike Air Max
- Serviços: Limpeza Profunda, Hidratação de Couro

Você receberá atualizações por email sempre que o status do seu pedido mudar.

Obrigado pela confiança! 🙏
```

---

## 🔒 Segurança

- ⚠️ **NUNCA** commite o arquivo `.env` no Git
- O `.gitignore` já está configurado para ignorar `.env`
- Use variáveis de ambiente em produção
- A senha de aplicativo é específica para este app, não compromete sua conta Gmail

---

## ✅ Checklist Final

- [ ] Verificação em Duas Etapas ativada no Gmail
- [ ] Senha de aplicativo gerada e copiada
- [ ] Arquivo `.env` criado na raiz do projeto
- [ ] `GMAIL_USER` configurado com email correto
- [ ] `GMAIL_APP_PASSWORD` configurado com senha de aplicativo (sem espaços)
- [ ] Testado criando um pedido
- [ ] Email de confirmação recebido

---

## 💡 Alternativas Futuras

O projeto está preparado para usar **AWS SES** (Amazon Simple Email Service) no futuro, que é mais adequado para produção:
- Custos muito baixos ($0.10 por 1000 emails)
- Maior confiabilidade
- Métricas de entrega
- Já tem código preparado no `emailService.js`

Para isso, basta configurar as variáveis `SES_FROM_EMAIL` e AWS credentials.
