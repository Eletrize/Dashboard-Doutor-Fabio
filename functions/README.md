# Cloudflare Pages - Functions

Este projeto usa Cloudflare Functions para proxy da Maker API do Hubitat.

## Funções disponíveis:

### /hubitat-proxy
Proxy para comandos individuais
- Parâmetros: `?device=ID&command=CMD&value=VAL`
- Exemplo: `/hubitat-proxy?device=76&command=on`

### /polling  
Busca estados de múltiplos dispositivos
- Parâmetros: `?devices=1,2,3`
- Exemplo: `/polling?devices=76,20,58`

## Deploy

As Functions são automaticamente deployadas quando você faz push para o repositório.

## CORS

Todas as Functions incluem headers CORS apropriados para permitir requisições do frontend.
