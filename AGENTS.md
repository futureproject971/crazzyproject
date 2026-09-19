# CRAZZY PROJECT — REGRAS OBRIGATÓRIAS PARA QUALQUER IA / DEV

Estas regras fazem parte do projeto e DEVEM ser lidas antes de qualquer alteração visual ou funcional.

## 1. IDENTIDADE VISUAL É OBRIGATÓRIA

Tudo que entrar novo no site deve seguir a identidade visual oficial da CRAZZY PROJECT.

Paleta principal:
- Branco
- Preto / azul-marinho muito escuro
- Azul elétrico CRAZZY
- Tons auxiliares derivados desses mesmos azuis para glow, vidro, sombra e profundidade

Não introduzir uma nova paleta só porque uma imagem de referência usa outras cores.

Uma referência visual pode ditar:
- composição
- proporção
- posição
- profundidade
- forma dos cards
- movimento
- tipo de carrossel
- hierarquia
- sensação visual

Mas as cores e o acabamento devem ser reinterpretados para a identidade CRAZZY PROJECT.

## 2. TEMA CLARO E ESCURO

Todo componente novo deve funcionar nos dois temas.

Obrigatório:
- testar tema claro
- testar tema escuro
- preservar contraste e legibilidade
- adaptar fundo, bordas, sombras, glow, cards, textos, inputs, botões e overlays
- nunca deixar um componente "preso" visualmente a apenas um tema
- não simular dark mode apenas reduzindo brightness do tema claro quando existir asset específico

Wallpapers oficiais:
- Light: `src/assets/crazzy-wallpaper-light.webp`
- Dark: `src/assets/crazzy-wallpaper-dark.webp`

A troca deve acompanhar o tema real do site.

## 3. TOKENS E CORES

Sempre preferir tokens existentes e variáveis CSS antes de criar cores hardcoded.

Base global:
- `src/index.css`
- `src/components/crazy-hero/crazy-hero.css`

Azul de identidade:
- `#0000ff` como azul principal
- variações de azul podem ser usadas para profundidade, iluminação, borda e estados

Evitar:
- roxo como cor principal de CTA/carrossel
- paletas desconectadas da marca
- gradientes que pareçam pertencer a outro site

Cores semânticas como verde de sucesso, amarelo de aviso e vermelho de erro podem ser usadas SOMENTE quando comunicarem estado funcional real.

## 4. REFERÊNCIAS VISUAIS

Quando o usuário enviar uma foto de referência:
1. analisar a composição antes de editar
2. identificar quais elementos devem ser reproduzidos
3. preservar a identidade CRAZZY PROJECT
4. adaptar a referência ao tema claro e escuro
5. implementar como HTML/CSS/React real sempre que for UI
6. não transformar a página inteira em imagem estática

## 5. NADA PODE SOBREPOR ERRADO

Nenhum componente pode ficar escondido embaixo de outro componente interativo.

Antes de concluir qualquer alteração:
- verificar header
- categorias
- logo/hero
- carrossel
- dock de produtos
- trust bar
- footer
- mobile/tablet/desktop/ultrawide

Sobreposição só é permitida quando for proposital e fizer parte do design.

## 6. RESPONSIVIDADE

Toda UI nova deve ser validada em:
- mobile pequeno
- mobile
- tablet
- notebook
- desktop 1920x1080
- ultrawide

Não usar posicionamento absoluto sem fallback responsivo.

## 7. MOVIMENTO E EFEITOS

Animações devem usar a linguagem visual CRAZZY:
- suave
- premium
- azul
- futurista
- sem excesso

Respeitar `prefers-reduced-motion`.

Efeitos existentes como chuva, wallpaper animado e parallax não devem ser removidos ou quebrados sem solicitação explícita.

## 8. NOVOS COMPONENTES

Antes de criar um componente novo:
- procurar se já existe um componente parecido
- reutilizar tokens, estilos e componentes existentes
- manter padrão de bordas, blur, radius, glow, tipografia e spacing
- garantir suporte aos dois temas

## 9. CARROSSEL / PRODUTOS

O carrossel da Home deve:
- usar o azul CRAZZY
- receber produtos reais
- funcionar dentro da área de produtos/dock
- não substituir permanentemente a identidade/logo central sem solicitação
- mover-se lentamente sozinho
- parar/interromper o auto-movimento quando o usuário interagir
- permitir seleção manual de outro produto
- não cobrir categorias ou outros elementos

## 10. REGRA DE OURO

SE UMA ALTERAÇÃO NOVA PARECER QUE PERTENCE A OUTRO SITE, ELA ESTÁ ERRADA.

Ela deve ser convertida para a linguagem visual CRAZZY PROJECT antes de ser considerada pronta.

Antes de qualquer commit visual, revisar:
- identidade
- tema claro
- tema escuro
- contraste
- responsividade
- sobreposição
- consistência com a Home e o restante do site


## 11. REGRA FULL-STACK — NADA DE COMPONENTE ÓRFÃO

Toda mudança funcional deve ser implementada ponta a ponta.

Se uma feature nova depende de dado ou estado persistente, revisar e atualizar, quando aplicável:
- migration SQL
- bootstrap/schema base
- tipos TypeScript
- Admin de criação/edição
- leitura no frontend
- backend/Edge Function
- RLS/grants/permissões
- migração de dados antigos
- fallback de rollout
- teste de build e fluxo real

É proibido considerar pronta uma feature que exista apenas visualmente.
Exemplos de erro:
- botão sem ação real
- badge sem campo persistente
- toggle que só muda estado local
- card que não vem do catálogo real
- filtro que não corresponde ao banco
- UI de Admin que grava em campo inexistente
- migration adicionada sem atualizar o bootstrap

Antes de concluir, confirmar que UI -> lógica -> banco/backend -> leitura novamente formam um ciclo funcional.


## 12. AUDITORIA FINAL É SEMPRE O ÚLTIMO ITEM

Toda lista de tarefas do CRAZZY PROJECT deve terminar com um item obrigatório de **Registro de Auditoria / Handoff para outra IA**.

Regras:
- qualquer tarefa nova entra ANTES da auditoria;
- a auditoria continua sendo sempre o último item;
- ela só pode ser produzida depois que todo o resto estiver concluído;
- após qualquer alteração posterior, a auditoria anterior fica inválida e deve ser refeita;
- o handoff final deve permitir que outra IA continue o projeto sem inferir estado, branch, schema, deploy, migrations ou decisões.
