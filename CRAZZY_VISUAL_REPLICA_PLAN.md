# CRAZZY PROJECT — PASSE MESTRE DE RÉPLICA VISUAL DA HOME

Esta especificação transforma as imagens de referência enviadas pelo usuário em tarefas verificáveis.
A meta NÃO é apenas "inspirar-se": a Home deve reproduzir o máximo possível a composição, hierarquia,
proporção, profundidade e sensação visual da referência, mantendo a identidade CRAZZY PROJECT,
os dois temas e dados reais.

## REGRA DE EXECUÇÃO

Executar uma microetapa por vez:
1. ler o HEAD atual;
2. alterar apenas os arquivos necessários daquela microetapa;
3. revisar diff;
4. validar build/Vercel;
5. somente depois avançar.

Não introduzir claims, números, pagamentos ou produtos fictícios só porque aparecem na arte de referência.
Quando a referência tiver informação comercial não confirmada, copiar a ESTRUTURA VISUAL e alimentar
o conteúdo por dados reais/admin.

---

## A. COMPOSIÇÃO GERAL / ENQUADRAMENTO

- [ ] A1. Fazer a Home desktop funcionar como uma composição única de primeira dobra, visualmente próxima de 16:9.
- [x] A2. Wallpaper ocupar 100% da área útil sem bloco de cor opaco cobrindo planeta, nuvens, montanhas ou piso.
- [ ] A3. Preservar o planeta central como ponto focal do cenário, sem a UI esconder a maior parte dele.
- [ ] A4. Preservar as estruturas futuristas laterais visíveis, usando-as como moldura natural da página.
- [ ] A5. Manter o piso/reflexo visível na parte inferior para dar profundidade e sensação de plataforma.
- [x] A6. Impedir qualquer scroll horizontal.
- [ ] A7. Evitar scroll vertical desnecessário em desktop 1920x1080 quando o conteúdo couber na primeira dobra.
- [x] A8. Criar zonas seguras explícitas: HEADER / CATEGORIAS / LOGO / CARROSSEL / TRUST BAR / FOOTER.
- [ ] A9. Nenhum elemento interativo pode ocupar fisicamente a zona de outro.
- [ ] A10. Usar clamp()/breakpoints para preservar proporções em 1920x1080, 2560x1440, 3440x1440, 3840x1600 e 3840x2160.

## B. HEADER FLUTUANTE

- [x] B1. Header centralizado e flutuante, com margens laterais como na referência, sem virar barra genérica de 100% da tela.
- [x] B2. Altura compacta e premium, com cantos inferiores/superiores coerentes com a referência.
- [x] B3. Tema claro: vidro branco/translúcido com blur sutil e borda azul muito leve.
- [x] B4. Tema escuro: vidro azul-marinho/preto translúcido, sem perder o contorno elétrico da marca.
- [ ] B5. Logo CRAZZY PROJECT à esquerda com escala e respiro próximos da referência.
- [x] B6. Navegação central em ordem coerente: Início / Categorias / Produtos / FAQ ou rotas reais equivalentes.
- [x] B7. Estado ativo da navegação usar cápsula branca/azul discreta, não bloco pesado.
- [x] B8. Campo de busca com ícone, borda leve, raio e largura proporcionais à referência.
- [x] B9. Botão Login separado visualmente e alinhado.
- [x] B10. Botão Carrinho azul forte, com ícone e contador circular.
- [x] B11. Nenhum item do header quebrar linha em desktop.
- [x] B12. Header permanecer acima da chuva/cenário, mas abaixo de modais/toasts.

## C. MICROCOPY / HUD LATERAL

- [x] C1. Reproduzir bloco textual superior esquerdo em linhas curtas, estilo HUD, com tracking alto.
- [x] C2. Reproduzir bloco textual superior direito no mesmo sistema visual.
- [x] C3. Adicionar traços/linhas azuis curtas abaixo dos blocos laterais.
- [ ] C4. Adicionar pequenas marcas/linhas técnicas decorativas no cenário sem bloquear clique.
- [x] C5. HUD deve reduzir/sumir em tablet/mobile para não poluir a leitura.

## D. LOGO CENTRAL / HERO

- [x] D1. Logo CRAZZY PROJECT voltar a ser o foco central superior, nunca substituída pelo carrossel.
- [ ] D2. Usar a melhor logo oficial disponível, evitando reconstrução tipográfica inferior quando houver asset.
- [x] D3. Ajustar largura/altura para ocupar visualmente área semelhante à referência.
- [ ] D4. Posicionar a logo sobre a área clara do planeta para obter contraste natural.
- [x] D5. Tagline abaixo: "SOFTWARES PRA MILHARES DE JOGOS!" com tracking amplo.
- [ ] D6. Preservar bastante espaço negativo ao redor da logo.
- [x] D7. Criar os quatro microcards/benefícios abaixo da tagline.
- [x] D8. Os quatro benefícios devem ter ícone, texto curto, fundo translúcido e tamanho uniforme.
- [ ] D9. Benefícios devem usar conteúdo real/configurável, evitando claims não comprovados.
- [ ] D10. Logo/tagline/benefícios não podem tocar categorias nem carrossel.

## E. CATEGORIAS DA HOME — GEOMETRIA

- [x] E1. Manter exatamente as 17 categorias oficiais definidas no catálogo; Aimbot Universal foi consolidado em IA Universal.
- [x] E2. Distribuir categorias de forma ASSIMÉTRICA ao redor da logo, não em grade comum.
- [ ] E3. Grupo superior esquerdo com três cards.
- [ ] E4. Grupo médio esquerdo com dois cards.
- [ ] E5. Grupo inferior esquerdo com dois cards e/ou card isolado conforme a referência.
- [ ] E6. Grupo superior direito com dois cards.
- [ ] E7. Grupo médio direito com dois cards.
- [ ] E8. Grupo inferior direito com dois cards.
- [ ] E9. Fileira inferior direita com quatro cards menores.
- [ ] E10. Ajustar widths individualmente para nomes longos sem truncamento feio.
- [ ] E11. Manter distâncias diferentes entre grupos para reproduzir o aspecto orgânico da referência.
- [ ] E12. Cards nunca podem passar por baixo do header, logo ou carrossel.
- [x] E13. Em desktop, usar wrappers 3D/perspectiva; em tablet/mobile, neutralizar rotação quando necessário.

## F. CATEGORIAS — APARÊNCIA 3D

- [x] F1. Cards azuis com gradiente vertical profundo e bordas internas de brilho.
- [x] F2. Glow azul controlado, evitando neon estourado que apague o texto.
- [x] F3. Ícone branco/azul à esquerda com tamanho consistente.
- [x] F4. Nome do jogo branco, forte, com alinhamento vertical preciso.
- [x] F5. Cards do lado esquerdo inclinados levemente em direção ao centro.
- [x] F6. Cards do lado direito inclinados levemente em direção ao centro.
- [x] F7. Aplicar rotateY + pequeno rotateZ no wrapper, não diretamente no motion.button.
- [x] F8. A perspectiva deve sugerir placas físicas flutuando no cenário.
- [x] F9. Hover move poucos pixels para frente/cima, sem alterar layout.
- [x] F10. Focus keyboard reproduz destaque equivalente ao hover.

## G. CATEGORIA SELECIONADA

- [x] G1. Categoria selecionada deve avançar visualmente em relação às vizinhas.
- [x] G2. Escala maior, mas sem invadir outra zona.
- [x] G3. Borda/contorno cyan-branco forte.
- [x] G4. Glow externo mais intenso que os demais cards.
- [x] G5. Badge "SELECIONADO" encaixado acima do card como na referência.
- [x] G6. Badge não pode cortar em overflow.
- [ ] G7. Seleção deve sobreviver à URL ?game=slug.
- [x] G8. Clique em categoria deve abrir /produtos?game=slug e NÃO alterar o carrossel de produtos NOVO.
- [x] G9. A rota completa /produtos?game=slug deve continuar acessível sem obrigar uso do menu Produtos.

## H. CARROSSEL COVERFLOW DE PRODUTOS

- [x] H1. Carrossel deve ficar ABAIXO da área logo/categorias e ACIMA da trust bar.
- [x] H2. Carrossel deve ocupar o lugar do antigo dock fixo de produtos.
- [x] H3. Card central grande, nítido e frontal.
- [x] H4. Dois níveis de cards laterais visíveis, parcialmente sobrepostos ao card central.
- [x] H5. Cards laterais devem usar scale menor + rotateY + menor opacidade/profundidade.
- [x] H6. Cards da esquerda inclinam para a direita; cards da direita inclinam para a esquerda.
- [x] H7. Card central ter borda cyan/azul forte e glow premium.
- [ ] H8. Conteúdo do card central puxado de produto real marcado como NOVO: imagem, nome, descrição e badge NOVO.
- [x] H9. CTA "Ver agora" ou equivalente real, levando ao produto.
- [ ] H10. Side cards também devem mostrar nome/resumo/CTA de forma mais compacta.
- [x] H11. Incluir setas circulares nas bordas esquerda/direita do card central.
- [x] H12. Incluir dots de paginação abaixo do card central.
- [x] H13. Autoplay lento e suave.
- [x] H14. Interação manual pausa temporariamente autoplay.
- [x] H15. Selecionar um card lateral traz ele para o centro antes de abrir.
- [x] H16. Se existir apenas 1 produto, centralizar sem setas/dots inúteis.
- [x] H17. Se não houver produtos, usar estado vazio discreto ou esconder área, nunca um painel enorme "vazio".
- [x] H18. Carrossel não pode depender da categoria selecionada nem buscar catálogo por conta própria; recebe somente produtos ativos marcados como NOVO pela Home.
- [x] H19. Todos os tons do carrossel seguem azul CRAZZY, sem roxo.
- [x] H20. Respeitar prefers-reduced-motion.

## I. CARD CENTRAL DO CARROSSEL — FIDELIDADE

- [ ] I1. Reservar área esquerda para ícone/logo do produto/categoria.
- [ ] I2. Reservar área central para título, subtítulo/descrição e CTA.
- [ ] I3. Reservar área direita para arte principal do produto quando houver.
- [ ] I4. Permitir badge superior como "Mais popular" apenas se configurado/verdadeiro.
- [ ] I5. Reproduzir a leitura visual da referência com gradação escura azul e luz elétrica nas bordas.
- [ ] I6. Permitir microcopy vertical decorativa configurável, sem inventar informação funcional.
- [ ] I7. Imagem do produto usar object-fit/object-position configurável para não cortar personagem/logotipo.
- [ ] I8. Evitar texto em cima do rosto/personagem da arte.
- [ ] I9. CTA azul com brilho e estado hover/pressed/focus.
- [ ] I10. Card deve continuar legível no light e no dark.

## J. TRUST BAR / PAGAMENTOS

- [x] J1. Barra larga abaixo do carrossel, visual branco/translúcido no light.
- [x] J2. Versão dark correspondente com vidro azul profundo.
- [x] J3. Bloco esquerdo: ícone cadeado + "Pagamento seguro" + subtítulo curto real.
- [ ] J4. Centro: "Aceitamos" + métodos de pagamento REALMENTE habilitados.
- [x] J5. PIX deve aparecer quando ativo.
- [x] J6. LTC deve aparecer quando ativo.
- [ ] J7. Cartão só deve aparecer quando a integração estiver habilitada.
- [x] J8. Não mostrar BTC/ETH/USDT como aceitos só porque aparecem na arte se não estiverem implementados.
- [x] J9. Separadores verticais finos entre blocos.
- [x] J10. Bloco direito: ícone raio + "Entrega automática" somente quando aplicável, com texto configurável.
- [x] J11. Barra nunca pode ser coberta pelo carrossel.

## K. FOOTER VISUAL DA PRIMEIRA DOBRA

- [x] K1. Faixa inferior azul-marinho com topo arredondado ocupando quase toda a largura.
- [x] K2. Logo CRAZZY PROJECT no canto esquerdo com microcopy.
- [x] K3. Centro dividido em 3–4 indicadores/benefícios com ícones.
- [ ] K4. Estrutura deve reproduzir a densidade da referência.
- [x] K5. Métricas numéricas só podem aparecer se vierem de dado real/configurado.
- [x] K6. Se métricas não forem confirmadas, usar labels neutras configuráveis em vez de números inventados.
- [x] K7. Elemento comunitário/assinatura visual no canto direito.
- [ ] K8. Footer deve encostar visualmente na base sem cortar o piso futurista por completo.

## L. WALLPAPER / ILUMINAÇÃO / CHUVA

- [x] L1. Light usa exclusivamente o wallpaper claro oficial.
- [x] L2. Dark usa exclusivamente o wallpaper noturno oficial.
- [x] L3. Troca de tema deve trocar o asset real, não apenas brightness/filter.
- [ ] L4. Wallpaper deve usar enquadramento diferente por breakpoint se necessário.
- [ ] L5. Evitar overlay branco/azul que lave o planeta no light.
- [ ] L6. Evitar overlay preto que esconda detalhes no dark.
- [ ] L7. Chuva deve ficar visível no light e no dark.
- [ ] L8. Chuva deve ficar atrás de header/cards/texto, mas acima do wallpaper.
- [x] L9. Chuva não pode interceptar cliques.
- [ ] L10. Intensidade/contraste da chuva deve se adaptar ao tema.
- [ ] L11. Respeitar prefers-reduced-motion e reduzir/desativar animação quando solicitado.

## M. PROFUNDIDADE / GLASS / GLOW

- [ ] M1. Definir hierarquia consistente de sombras: background < categorias < selecionado < carrossel < header/modal.
- [ ] M2. Bordas internas claras sutis para efeito de vidro.
- [ ] M3. Glow azul deve nascer principalmente de bordas/CTAs, não do corpo inteiro.
- [ ] M4. Não usar sombras pretas pesadas no tema claro.
- [ ] M5. Tema escuro deve manter contraste sem virar bloco preto opaco.
- [ ] M6. Evitar blur excessivo que deixe tudo leitoso.
- [ ] M7. Fazer elementos parecerem suspensos sobre o piso/cenário, não colados numa página 2D.

## N. TIPOGRAFIA / ÍCONES

- [ ] N1. Manter Space Grotesk/identidade atual para UI quando coerente.
- [ ] N2. Usar logo oficial para marca principal em vez de texto quando possível.
- [ ] N3. Pesos tipográficos próximos da referência: labels compactos, títulos fortes, microcopy espaçada.
- [ ] N4. Uniformizar espessura dos ícones.
- [ ] N5. Não misturar packs de ícones com estilos incompatíveis no mesmo bloco.
- [ ] N6. Garantir anti-aliasing e legibilidade em telas 100%/125%/150% de zoom.

## O. INTERAÇÕES

- [ ] O1. Hover das categorias sem deslocar outros componentes.
- [ ] O2. Hover do carrossel sem interromper posição do layout.
- [x] O3. Clique em categoria navega diretamente para o catálogo filtrado sem alterar o carrossel de NOVO.
- [x] O4. Busca do header leva/filtro para catálogo real.
- [x] O5. Login usa fluxo real.
- [x] O6. Carrinho usa contador real.
- [x] O7. CTA dos produtos abre produto correto.
- [ ] O8. Navegação por teclado em categorias, carrossel, header e CTAs.
- [ ] O9. Estados focus-visible alinhados à identidade CRAZZY.

## P. RESPONSIVIDADE

- [ ] P1. Desktop >= 1440: composição artística próxima da referência.
- [ ] P2. Ultrawide: manter o centro visual, sem categorias fugirem para as bordas extremas.
- [ ] P3. 1280–1439: reduzir escala mantendo hierarquia.
- [x] P4. Tablet: abandonar posicionamento absoluto quando necessário e usar grid organizado.
- [x] P5. Mobile: logo, categorias, carrossel e trust bar viram fluxo vertical.
- [ ] P6. Nenhum texto cortado ou card fora da viewport.
- [ ] P7. Nenhuma sobreposição funcional em qualquer breakpoint.
- [ ] P8. Touch targets mínimos adequados no mobile.

## Q. TEMA CLARO / ESCURO

- [ ] Q1. Cada componente do passe visual possuir regra explícita para light e dark.
- [ ] Q2. Não criar componente novo com cor hardcoded que ignore tokens/tema.
- [ ] Q3. Manter a mesma identidade, composição e funções nos dois temas.
- [ ] Q4. Ajustar glow/contraste para olhos sensíveis.
- [x] Q5. Preferência persistir entre sessões.
- [ ] Q6. Testar troca de tema com Home já aberta e carrossel em movimento.
- [ ] Q7. Wallpaper, chuva, header, categorias, carrossel, trust bar e footer devem trocar sem flicker evidente.

## R. PERFORMANCE / QUALIDADE

- [x] R1. Evitar vídeo gigante/WebGL como background.
- [ ] R2. Otimizar imagens em WebP/AVIF quando possível.
- [ ] R3. Não carregar todas as imagens de produtos em resolução máxima de uma vez.
- [ ] R4. Preload apenas dos assets críticos da primeira dobra.
- [x] R5. Animações preferencialmente transform/opacity.
- [ ] R6. Evitar layout shift quando produtos/carrossel carregarem.
- [ ] R7. Corrigir warnings de console relacionados aos componentes alterados.

## S. VERIFICAÇÃO VISUAL OBRIGATÓRIA

- [ ] S1. Comparar referência e Home lado a lado após cada grande bloco.
- [ ] S2. Verificar alinhamento horizontal do header.
- [ ] S3. Verificar escala/posição do logo central.
- [ ] S4. Verificar distribuição/ângulo das categorias.
- [ ] S5. Verificar categoria selecionada.
- [ ] S6. Verificar tamanho/posição/profundidade do carrossel.
- [ ] S7. Verificar trust bar.
- [ ] S8. Verificar footer.
- [ ] S9. Verificar wallpaper e chuva.
- [ ] S10. Verificar light/dark.
- [ ] S11. Verificar 1920x1080.
- [ ] S12. Verificar 2560x1440.
- [ ] S13. Verificar ultrawide.
- [ ] S14. Verificar tablet.
- [ ] S15. Verificar mobile.
- [ ] S16. Só considerar o passe concluído quando não houver sobreposição, bloco genérico ou elemento claramente fora da linguagem da referência.

---

## DEPOIS DA RÉPLICA

Somente depois deste passe:
1. revisão funcional final;
2. revisão de acessibilidade/performance;
3. editor visual Admin completo para permitir reorganização futura sem código.


## T. REGRA 92 — FEATURE COMPLETA / NADA PODE FICAR "VOANDO"

- [ ] T1. Toda feature nova deve ser analisada ponta a ponta antes de ser considerada pronta.
- [ ] T2. Se a feature cria dado novo, atualizar schema/migration e também o bootstrap do projeto novo.
- [ ] T3. Atualizar os tipos TypeScript gerados/espelhados quando o banco mudar.
- [ ] T4. Atualizar Admin para criar/editar o dado quando ele for configurável.
- [ ] T5. Atualizar leitura pública/privada no frontend conforme a regra real.
- [ ] T6. Atualizar RLS/grants/permissões quando a nova feature alterar superfície de acesso.
- [ ] T7. Atualizar Edge Function/backend quando a ação não puder confiar no browser.
- [ ] T8. Garantir fallback para bases antigas durante rollout quando necessário.
- [ ] T9. Não criar botão, badge, card, toggle ou campo que não esteja conectado a uma lógica real.
- [ ] T10. Não criar coluna/tabela que não seja usada por Admin + frontend/backend correspondente.
- [ ] T11. Toda alteração que substitua comportamento antigo deve migrar dados existentes quando necessário.
- [ ] T12. Toda migration nova também deve ser refletida nos arquivos de bootstrap para instalações novas.
- [ ] T13. Após mudança de banco, validar schema real do Supabase conectado antes de declarar a feature funcional.
- [ ] T14. Após mudança frontend/backend, validar build/deploy e pelo menos o fluxo principal de leitura/gravação.
- [ ] T15. Uma feature só recebe status "concluída" quando UI, banco, lógica, permissão e fluxo real estiverem conectados.

Regra de ouro: **nada de componente órfão**. Se aparece na tela, precisa ter origem, comportamento, persistência e permissão coerentes.


## U. BLOCO ATUAL — NOVO / DESTAQUES DA HOME

- [x] U1. Consolidar Aimbot Universal em IA Universal na configuração visual.
- [x] U2. Definir `products.is_new` como fonte oficial do badge NOVO/destaque.
- [x] U3. Atualizar bootstrap com `is_new`.
- [x] U4. Criar migration idempotente para bases existentes.
- [x] U5. Atualizar tipos TypeScript de products.
- [x] U6. Adicionar toggle NOVO/destacar na Home no Admin.
- [x] U7. Persistir `is_new` no create/update do produto quando a coluna existir.
- [x] U8. Proteger o Admin para não quebrar enquanto a migration ainda não estiver aplicada.
- [x] U9. Mostrar badge NOVO na listagem do Admin.
- [x] U10. Desacoplar carrossel da categoria selecionada.
- [x] U11. Carrossel passa a receber apenas produtos `is_new = true`.
- [x] U12. Produto lateral passa a exibir nome/badge/CTA compacto.
- [ ] U13. Aplicar migration no Supabase CRAZZY correto (`teyqtfdeugldgtzkyybg`) quando a conexão estiver disponível.
- [ ] U14. Validar criação/edição real de um produto NOVO no Admin contra o banco correto.
- [ ] U15. Validar que um produto NOVO aparece no carrossel de produção e um produto comum não aparece.
- [x] U16. Validar em código que clicar em categoria não altera mais o conteúdo do carrossel.
- [ ] U17. Refinar escala/posição do coverflow comparando lado a lado com a referência.

## FINAL. ITEM OBRIGATÓRIO — REGISTRO DE AUDITORIA / HANDOFF PARA OUTRA IA

**Este bloco deve ser SEMPRE o último item da lista.**
Se novas tarefas forem adicionadas, este bloco deve ser movido novamente para o final.

- [ ] U1. Só gerar o relatório de auditoria depois que todos os itens anteriores estiverem concluídos.
- [ ] U2. Registrar o HEAD/commit final do GitHub e a branch usada.
- [ ] U3. Registrar todos os arquivos relevantes alterados.
- [ ] U4. Registrar migrations SQL adicionadas/aplicadas e o estado do bootstrap.
- [ ] U5. Registrar o projeto Supabase correto e quais migrations foram realmente aplicadas nele.
- [ ] U6. Registrar estado da Vercel, URL de produção e último deploy validado.
- [ ] U7. Registrar decisões arquiteturais importantes e regras de negócio.
- [ ] U8. Registrar o que é dado real, o que é configurável e o que é apenas visual.
- [ ] U9. Registrar integrações externas e segredos necessários SEM expor valores secretos.
- [ ] U10. Registrar riscos, limitações e qualquer pendência remanescente.
- [ ] U11. Registrar checklist de testes executados e respectivos resultados.
- [ ] U12. Produzir instruções claras para outra IA continuar sem sobrescrever trabalho existente.
- [ ] U13. Incluir a ordem de leitura obrigatória: AGENTS.md, plano de implementação, plano visual e status final.
- [ ] U14. O relatório deve ser refeito do zero após a última alteração do projeto, nunca reutilizado desatualizado.
- [ ] U15. Não considerar o projeto “handoff-ready” se o relatório não refletir exatamente o estado final do repositório e da infraestrutura.
