# Brief — App nativo Worqera

**Data:** 2026-09-18 (atualizado)  
**AS-IS completo:** [2026-09-18-worqera-app-asis-mirror.md](./2026-09-18-worqera-app-asis-mirror.md)  
**Alavanca produto:** [Status Pack](./2026-09-18-worqera-escala-status-pack.md)

## Por quê

- Chão: câmera + move + Avisar pronto sem browser  
- Push nos eventos que o web já tem (move setor, ready, trial)  
- Paridade total com web (espelho AS-IS) — TV e LP ficam web

## Fases (resumo)

App-0 auth → App-1 kanban → App-2 novo pedido → App-3 consultas/scan → App-4 settings → App-5 dashboard/financeiro/push → App-6 onboarding Status Pack

## Decisões na kickoff de build

- Expo vs RN bare  
- Push provider  
- Offline queue (depois de App-1)  
- Pasta `mobile/` no monorepo  

## Pré-requisitos (já ok)

- Loop / Status Pack wa.me  
- Multi-vertical itemLabel  
- API v1 estável  
