# ⚡ GUIA SUPER RÁPIDO - Configurar Email em 5 Minutos

## 🎯 Resumo: O que você precisa fazer

1. ✅ Gerar uma senha especial no Google
2. ✅ Criar arquivo `.env` com suas credenciais
3. ✅ Testar se funciona

---

## 📝 PASSO 1: Gerar Senha no Google (2 minutos)

### Clique nestes 2 links na ordem:

#### 🔗 **1. Ativar verificação em 2 etapas:**
https://myaccount.google.com/signinoptions/twosv

- Clique em "Começar"
- Siga as instruções (vai pedir seu telefone)
- ✅ Pronto!

#### 🔗 **2. Gerar senha de aplicativo:**
https://myaccount.google.com/apppasswords

- Digite: `Shoe Repair API`
- Clique em "Criar"
- **COPIE a senha** que aparecer (16 letras)
- **REMOVA OS ESPAÇOS** da senha

**Exemplo:**
- ❌ Errado: `abcd efgh ijkl mnop` (com espaços)
- ✅ Certo: `abcdefghijklmnop` (sem espaços)

---

## 💾 PASSO 2: Criar arquivo .env (1 minuto)

### Opção A - Automático (mais fácil):

Abra o PowerShell na pasta do projeto e execute:

```powershell
# Copia o template e abre no notepad
Copy-Item .env.template .env
notepad .env
```

### Opção B - Manual:

1. Crie um arquivo chamado `.env` na pasta do projeto
2. Copie isto dentro:

```env
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

AWS_REGION=us-east-1
DYNAMODB_TABLE_CLIENTES=shoe-repair-clientes
DYNAMODB_TABLE_PEDIDOS=shoe-repair-pedidos
DYNAMODB_TABLE_USERS=shoe-repair-users
S3_BUCKET_NAME=shoe-repair-pdfs
S3_REGION=us-east-1
JWT_SECRET=your-jwt-secret-key-here-change-this-in-production
JWT_EXPIRES_IN=24h
```

3. **Substitua:**
   - `seu-email@gmail.com` → Seu email real
   - `abcdefghijklmnop` → A senha que você copiou (sem espaços)

4. **Salve e feche**

---

## ✅ PASSO 3: Testar (2 minutos)

```powershell
# Inicie o servidor
npm start

# Em outro terminal, teste criando um pedido
# (ou use Postman/Insomnia)
```

Se configurou tudo certo, ao criar um pedido você verá no console:

```
[Email/Nodemailer] E-mail enviado para cliente@email.com
```

E o cliente receberá um email! 📧

---

## 🆘 NÃO FUNCIONOU?

### Erro: "Invalid login"
- Você usou senha de aplicativo? (não a senha normal!)
- Tem espaços na senha? Remova todos!
- Verificação em 2 etapas está ativa?

### Erro: "Connection timeout"
- Seu Wi-Fi/Internet está funcionando?
- Firewall bloqueando? Tente desativar temporariamente

### Ainda não funciona?
- Tente gerar uma NOVA senha de aplicativo
- Use outro email do Gmail
- Veja o arquivo `CONFIGURACAO-EMAIL.md` para mais detalhes

---

## 📞 Checklist Final

- [ ] Link 1: Verificação em 2 etapas ativada ✅
- [ ] Link 2: Senha de aplicativo gerada e copiada ✅
- [ ] Senha SEM ESPAÇOS ✅
- [ ] Arquivo `.env` criado na raiz do projeto ✅
- [ ] `GMAIL_USER` preenchido com seu email ✅
- [ ] `GMAIL_APP_PASSWORD` preenchido (sem espaços) ✅
- [ ] Servidor iniciado e testado ✅
- [ ] Email recebido ✅

---

## 🎉 Pronto!

Agora todo pedido criado ou atualizado vai enviar email automaticamente!

**Quer ver o guia completo?** → `CONFIGURACAO-EMAIL.md`
