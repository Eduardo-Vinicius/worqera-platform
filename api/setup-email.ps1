# Script PowerShell para configurar email rapidamente
# Execute: .\setup-email.ps1

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔧 Configuração Rápida de Email - Shoe Repair   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env
if (Test-Path ".env") {
    Write-Host "⚠️  ATENÇÃO: Arquivo .env já existe!" -ForegroundColor Yellow
    $resposta = Read-Host "Deseja sobrescrever? (S/N)"
    if ($resposta -ne "S" -and $resposta -ne "s") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "📧 PASSO 1: Configure sua conta Gmail" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "Antes de continuar, você precisa:" -ForegroundColor Yellow
Write-Host "  1. Ativar verificação em 2 etapas" -ForegroundColor Yellow
Write-Host "  2. Gerar uma senha de aplicativo" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔗 Link 1: https://myaccount.google.com/signinoptions/twosv" -ForegroundColor Cyan
Write-Host "🔗 Link 2: https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
Write-Host ""

$abrirLinks = Read-Host "Deseja abrir os links no navegador? (S/N)"
if ($abrirLinks -eq "S" -or $abrirLinks -eq "s") {
    Write-Host "🌐 Abrindo links..." -ForegroundColor Cyan
    Start-Process "https://myaccount.google.com/signinoptions/twosv"
    Start-Sleep -Seconds 2
    Start-Process "https://myaccount.google.com/apppasswords"
    Write-Host ""
    Write-Host "✅ Links abertos! Siga as instruções no navegador." -ForegroundColor Green
    Write-Host ""
}

Write-Host "⏸️  Pressione qualquer tecla quando tiver a senha de aplicativo pronta..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

Write-Host "📝 PASSO 2: Digite suas credenciais" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host ""

# Solicitar email
$email = Read-Host "Digite seu email do Gmail (ex: seuemail@gmail.com)"
if ([string]::IsNullOrWhiteSpace($email)) {
    Write-Host "❌ Email não pode ser vazio!" -ForegroundColor Red
    exit
}

# Solicitar senha de aplicativo
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Cole a senha de aplicativo (16 caracteres)" -ForegroundColor Yellow
Write-Host "   Exemplo: abcdefghijklmnop (SEM ESPAÇOS!)" -ForegroundColor Yellow
Write-Host ""
$senha = Read-Host "Digite a senha de aplicativo"
if ([string]::IsNullOrWhiteSpace($senha)) {
    Write-Host "❌ Senha não pode ser vazia!" -ForegroundColor Red
    exit
}

# Remover espaços da senha
$senha = $senha -replace '\s', ''
if ($senha.Length -ne 16) {
    Write-Host "⚠️  ATENÇÃO: A senha deveria ter 16 caracteres (você digitou $($senha.Length))" -ForegroundColor Yellow
    Write-Host "   Mas vou continuar mesmo assim..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💾 PASSO 3: Criando arquivo .env" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green

# Criar conteúdo do .env
$envContent = @"
# ==========================================
# 📧 CONFIGURAÇÃO DE E-MAIL (Gmail)
# ==========================================
# Gerado automaticamente em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

GMAIL_USER=$email
GMAIL_APP_PASSWORD=$senha

# ==========================================
# AWS CONFIGURATION
# ==========================================

AWS_REGION=us-east-1

# DynamoDB Tables
DYNAMODB_TABLE_CLIENTES=shoe-repair-clientes
DYNAMODB_TABLE_PEDIDOS=shoe-repair-pedidos
DYNAMODB_TABLE_USERS=shoe-repair-users

# S3 Bucket
S3_BUCKET_NAME=shoe-repair-pdfs
S3_REGION=us-east-1

# ==========================================
# JWT AUTHENTICATION
# ==========================================

JWT_SECRET=your-jwt-secret-key-here-change-this-in-production
JWT_EXPIRES_IN=24h

# ==========================================
# WHATSAPP API (Evolution API) - OPCIONAL
# ==========================================

# WHATSAPP_API_URL=http://seu-servidor:8080
# WHATSAPP_API_KEY=sua-chave-api
# WHATSAPP_INSTANCE_NAME=sua-instancia
"@

# Salvar arquivo
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "✅ Arquivo .env criado com sucesso!" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumo da configuração:" -ForegroundColor Cyan
Write-Host "  Email: $email" -ForegroundColor White
Write-Host "  Senha: $($senha.Substring(0,4))************" -ForegroundColor White
Write-Host "  Arquivo: .env (criado na raiz do projeto)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Inicie o servidor: npm start" -ForegroundColor White
Write-Host "  2. Teste criando um pedido" -ForegroundColor White
Write-Host "  3. Verifique se o email foi enviado" -ForegroundColor White
Write-Host ""
Write-Host "📖 Mais informações:" -ForegroundColor Cyan
Write-Host "  - Guia rápido: GUIA-RAPIDO-EMAIL.md" -ForegroundColor White
Write-Host "  - Guia completo: CONFIGURACAO-EMAIL.md" -ForegroundColor White
Write-Host ""
Write-Host "✨ Tudo pronto! Boa sorte com seu projeto!" -ForegroundColor Green
Write-Host ""
