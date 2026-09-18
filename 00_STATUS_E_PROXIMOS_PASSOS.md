# CRAZZY PROJECT — STATUS DE CONTINUIDADE

## SOURCE OFICIAL
Esta pasta é a única que deve ser alterada como projeto principal.

## Já trabalhado
- Nova Home/hero CRAZZY
- Cards/categorias dinâmicos
- Tema claro/escuro
- Painel admin preservado, incluindo Tickets
- CRAZZY Rewards / trial 1h
- Estoque trial separado
- Heartbeat de progresso
- PurinCash escolhida como gateway principal
- Estrutura PIX/LTC/cartão
- Webhook HMAC/idempotência
- Segurança de preço/estoque/admin em revisão e endurecimento
- Gateway legado bloqueado/removido em partes
- Auditoria para segredos no frontend

## Prioridade imediata
1. Corrigir dark mode para trocar o asset do wallpaper de verdade.
2. Reproduzir com fidelidade extrema a imagem de referência.
3. Manter cards/textos/botões como componentes reais.
4. Subir a SOURCE REAL no mesmo projeto Vercel usado para teste online.
5. Criar/conectar Supabase novo e limpo.
6. Ligar login/admin, Tickets, estoque, produtos e Rewards ao novo Supabase.
7. Finalizar PurinCash PIX + LTC + webhook + entrega idempotente.
8. Testar desktop, ultrawide, tablet e mobile.

## Dark mode
Tema claro deve usar o wallpaper claro oficial.
Tema escuro deve usar o wallpaper escuro oficial enviado pelo usuário.
Não usar apenas filter/brightness/overlay para simular o modo escuro.
