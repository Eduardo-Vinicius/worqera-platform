# Trial reminders (D-2 / D-0) — ops

**Script:** `api/scripts/send-trial-reminders.js`  
**Quando:** diário (cron) no host PRD.

## Cron sugerido

```cron
# Todos os dias 10:00 America/Sao_Paulo
0 13 * * * cd /path/to/worqera-platform/api && node scripts/send-trial-reminders.js >> /var/log/worqera-trial-reminders.log 2>&1
```

(13:00 UTC ≈ 10:00 BRT.)

## Env

Mesmas variáveis de e-mail da API (`SMTP_*` / SES). Sem SMTP, o script deve logar e não falhar o cron.

## Produto

- D-2: “trial acaba em 2 dias” + CTA billing  
- D-0: “trial acaba hoje”  
- Indicação (`partnerCode`) permanece separada (reward automation = backlog)

Ver também: Status Pack em Empresa + dashboard banner.
