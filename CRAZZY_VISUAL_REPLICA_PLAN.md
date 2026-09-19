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
- [ ] A2. Wallpaper ocupar 100% da área útil sem bloco de cor opaco cobrindo planeta, nuvens, montanhas ou piso.
- [ ] A3. Preservar o planeta central como ponto focal do cenário, sem a UI esconder a maior parte dele.
- [ ] A4. Preservar as estruturas futuristas laterais visíveis, usando-as como moldura natural da página.
- [ ] A5. Manter o piso/reflexo visível na parte inferior para dar profundidade e sensação de plataforma.
- [ ] A6. Impedir qualquer scroll horizontal.
- [ ] A7. Evitar scroll vertical desnecessário em desktop 1920x1080 quando o conteúdo couber na primeira dobra.
- [ ] A8. Criar zonas seguras explícitas: HEADER / CATEGORIAS / LOGO / CARROSSEL / TRUST BAR / FOOTER.
- [ ] A9. Nenhum elemento interativo pode ocupar fisicamente a zona de outro.
- [ ] A10. Usar clamp()/breakpoints para preservar proporções em 1920x1080, 2560x1440, 3440x1440, 3840x1600 e 3840x2160.

## B. HEADER FLUTUANTE

- [ ] B1. Header centralizado e flutuante, com margens laterais como na referência, sem virar barra genérica de 100% da tela.
- [ ] B2. Altura compacta e premium, com cantos inferiores/superiores coerentes com a referência.
- [ ] B3. Tema claro: vidro branco/translúcido com blur sutil e borda azul muito leve.
- [ ] B4. Tema escuro: vidro azul-marinho/preto translúcido, sem perder o contorno elétrico da marca.
- [ ] B5. Logo CRAZZY PROJECT à esquerda com escala e respiro próximos da referência.
- [ ] B6. Navegação central em ordem coerente: Início / Categorias / Produtos / FAQ ou rotas reais equivalentes.
- [ ] B7. Estado ativo da navegação usar cápsula branca/azul discreta, não bloco pesado.
- [ ] B8. Campo de busca com ícone, borda leve, raio e largura proporcionais à referência.
- [ ] B9. Botão Login separado visualmente e alinhado.
- [ ] B10. Botão Carrinho azul forte, com ícone e contador circular.
- [ ] B11. Nenhum item do header quebrar linha em desktop.
- [ ] B12. Header permanecer acima da chuva/cenário, mas abaixo de modais/toasts.

## C. MICROCOPY / HUD LATERAL

- [ ] C1. Reproduzir bloco textual superior esquerdo em linhas curtas, estilo HUD, com tracking alto.
- [ ] C2. Reproduzir bloco textual superior direito no mesmo sistema visual.
- [ ] C3. Adicionar traços/linhas azuis curtas abaixo dos blocos laterais.
- [ ] C4. Adicionar pequenas marcas/linhas técnicas decorativas no cenário sem bloquear clique.
- [ ] C5. HUD deve reduzir/sumir em tablet/mobile para não poluir a leitura.

## D. LOGO CENTRAL / HERO

- [ ] D1. Logo CRAZZY PROJECT voltar a ser o foco central superior, nunca substituída pelo carrossel.
- [ ] D2. Usar a melhor logo oficial disponível, evitando reconstrução tipográfica inferior quando houver asset.
- [ ] D3. Ajustar largura/altura para ocupar visualmente área semelhante à referência.
- [ ] D4. Posicionar a logo sobre a área clara do planeta para obter contraste natural.
- [ ] D5. Tagline abaixo: "SOFTWARES PRA MILHARES DE JOGOS!" com tracking amplo.
- [ ] D6. Preservar bastante espaço negativo ao redor da logo.
- [ ] D7. Criar os quatro microcards/benefícios abaixo da tagline.
- [ ] D8. Os quatro benefícios devem ter ícone, texto curto, fundo translúcido e tamanho uniforme.
- [ ] D9. Benefícios devem usar conteúdo real/configurável, evitando claims não comprovados.
- [ ] D10. Logo/tagline/benefícios não podem tocar categorias nem carrossel.

## E. CATEGORIAS DA HOME — GEOMETRIA

- [ ] E1. Manter exatamente as 18 categorias oficiais definidas no catálogo.
- [ ] E2. Distribuir categorias de forma ASSIMÉTRICA ao redor da logo, não em grade comum.
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
- [ ] E13. Em desktop, usar wrappers 3D/perspectiva; em tablet/mobile, neutralizar rotação quando necessário.

## F. CATEGORIAS — APARÊNCIA 3D

- [ ] F1. Cards azuis com gradiente vertical profundo e bordas internas de brilho.
- [ ] F2. Glow azul controlado, evitando neon estourado que apague o texto.
- [ ] F3. Ícone branco/azul à esquerda com tamanho consistente.
- [ ] F4. Nome do jogo branco, forte, com alinhamento vertical preciso.
- [ ] F5. Cards do lado esquerdo inclinados levemente em direção ao centro.
- [ ] F6. Cards do lado direito inclinados levemente em direção ao centro.
- [ ] F7. Aplicar rotateY + pequeno rotateZ no wrapper, não diretamente no motion.button.
- [ ] F8. A perspectiva deve sugerir placas físicas flutuando no cenário.
- [ ] F9. Hover move poucos pixels para frente/cima, sem alterar layout.
- [ ] F10. Focus keyboard reproduz destaque equivalente ao hover.

## G. CATEGORIA SELECIONADA

- [ ] G1. Categoria selecionada deve avançar visualmente em relação às vizinhas.
- [ ] G2. Escala maior, mas sem invadir outra zona.
- [ ] G3. Borda/corno cyan-branco forte.
- [ ] G4. Glow externo mais intenso que os demais cards.
- [ ] G5. Badge "SELECIONADO" encaixado acima do card como na referência.
- [ ] G6. Badge não pode cortar em overflow.
- [ ] G7. Seleção deve sobreviver à URL ?game=slug.
- [ ] G8. Clique deve trocar a categoria ativa e alimentar o carrossel com produtos reais daquela categoria.
- [ ] G9. A rota completa /produtos?game=slug deve continuar acessível sem obrigar uso do menu Produtos.

## H. CARROSSEL COVERFLOW DE PRODUTOS

- [ ] H1. Carrossel deve ficar ABAIXO da área logo/categorias e ACIMA da trust bar.
- [ ] H2. Carrossel deve ocupar o lugar do antigo dock fixo de produtos.
- [ ] H3. Card central grande, nítido e frontal.
- [ ] H4. Dois níveis de cards laterais visíveis, parcialmente sobrepostos ao card central.
- [ ] H5. Cards laterais devem usar scale menor + rotateY + menor opacidade/profundidade.
- [ ] H6. Cards da esquerda inclinam para a direita; cards da direita inclinam para a esquerda.
- [ ] H7. Card central ter borda cyan/azul forte e glow premium.
- [ ] H8. Conteúdo do card central puxado do produto real: imagem, nome, descrição, status/badge permitido.
- [ ] H9. CTA "Ver agora" ou equivalente real, levando ao produto.
- [ ] H10. Side cards também devem mostrar nome/resumo/CTA de forma mais compacta.
- [ ] H11. Incluir setas circulares nas bordas esquerda/direita do card central.
- [ ] H12. Incluir dots de paginação abaixo do card central.
- [ ] H13. Autoplay lento e suave.
- [ ] H14. Interação manual pausa temporariamente autoplay.
- [ ] H15. Selecionar um card lateral traz ele para o centro antes de abrir.
- [ ] H16. Se existir apenas 1 produto, centralizar sem setas/dots inúteis.
- [ ] H17. Se não houver produtos, usar estado vazio discreto ou esconder área, nunca um painel enorme "vazio".
- [ ] H18. Carrossel não pode buscar catálogo por conta própria; recebe dados já carregados pela Home.
- [ ] H19. Todos os tons do carrossel seguem azul CRAZZY, sem roxo.
- [ ] H20. Respeitar prefers-reduced-motion.

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

- [ ] J1. Barra larga abaixo do carrossel, visual branco/translúcido no light.
- [ ] J2. Versão dark correspondente com vidro azul profundo.
- [ ] J3. Bloco esquerdo: ícone cadeado + "Pagamento seguro" + subtítulo curto real.
- [ ] J4. Centro: "Aceitamos" + métodos de pagamento REALMENTE habilitados.
- [ ] J5. PIX deve aparecer quando ativo.
- [ ] J6. LTC deve aparecer quando ativo.
- [ ] J7. Cartão só deve aparecer quando a integração estiver habilitada.
- [ ] J8. Não mostrar BTC/ETH/USDT como aceitos só porque aparecem na arte se não estiverem implementados.
- [ ] J9. Separadores verticais finos entre blocos.
- [ ] J10. Bloco direito: ícone raio + "Entrega automática" somente quando aplicável, com texto configurável.
- [ ] J11. Barra nunca pode ser coberta pelo carrossel.

## K. FOOTER VISUAL DA PRIMEIRA DOBRA

- [ ] K1. Faixa inferior azul-marinho com topo arredondado ocupando quase toda a largura.
- [ ] K2. Logo CRAZZY PROJECT no canto esquerdo com microcopy.
- [ ] K3. Centro dividido em 3–4 indicadores/benefícios com ícones.
- [ ] K4. Estrutura deve reproduzir a densidade da referência.
- [ ] K5. Métricas numéricas só podem aparecer se vierem de dado real/configurado.
- [ ] K6. Se métricas não forem confirmadas, usar labels neutras configuráveis em vez de números inventados.
- [ ] K7. Elemento comunitário/assinatura visual no canto direito.
- [ ] K8. Footer deve encostar visualmente na base sem cortar o piso futurista por completo.

## L. WALLPAPER / ILUMINAÇÃO / CHUVA

- [ ] L1. Light usa exclusivamente o wallpaper claro oficial.
- [ ] L2. Dark usa exclusivamente o wallpaper noturno oficial.
- [ ] L3. Troca de tema deve trocar o asset real, não apenas brightness/filter.
- [ ] L4. Wallpaper deve usar enquadramento diferente por breakpoint se necessário.
- [ ] L5. Evitar overlay branco/azul que lave o planeta no light.
- [ ] L6. Evitar overlay preto que esconda detalhes no dark.
- [ ] L7. Chuva deve ficar visível no light e no dark.
- [ ] L8. Chuva deve ficar atrás de header/cards/texto, mas acima do wallpaper.
- [ ] L9. Chuva não pode interceptar cliques.
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
- [ ] O3. Clique em categoria atualiza seleção rapidamente sem flash de loading grande.
- [ ] O4. Busca do header leva/filtro para catálogo real.
- [ ] O5. Login usa fluxo real.
- [ ] O6. Carrinho usa contador real.
- [ ] O7. CTA dos produtos abre produto correto.
- [ ] O8. Navegação por teclado em categorias, carrossel, header e CTAs.
- [ ] O9. Estados focus-visible alinhados à identidade CRAZZY.

## P. RESPONSIVIDADE

- [ ] P1. Desktop >= 1440: composição artística próxima da referência.
- [ ] P2. Ultrawide: manter o centro visual, sem categorias fugirem para as bordas extremas.
- [ ] P3. 1280–1439: reduzir escala mantendo hierarquia.
- [ ] P4. Tablet: abandonar posicionamento absoluto quando necessário e usar grid organizado.
- [ ] P5. Mobile: logo, categorias, carrossel e trust bar viram fluxo vertical.
- [ ] P6. Nenhum texto cortado ou card fora da viewport.
- [ ] P7. Nenhuma sobreposição funcional em qualquer breakpoint.
- [ ] P8. Touch targets mínimos adequados no mobile.

## Q. TEMA CLARO / ESCURO

- [ ] Q1. Cada componente do passe visual possuir regra explícita para light e dark.
- [ ] Q2. Não criar componente novo com cor hardcoded que ignore tokens/tema.
- [ ] Q3. Manter a mesma identidade, composição e funções nos dois temas.
- [ ] Q4. Ajustar glow/contraste para olhos sensíveis.
- [ ] Q5. Preferência persistir entre sessões.
- [ ] Q6. Testar troca de tema com Home já aberta e carrossel em movimento.
- [ ] Q7. Wallpaper, chuva, header, categorias, carrossel, trust bar e footer devem trocar sem flicker evidente.

## R. PERFORMANCE / QUALIDADE

- [ ] R1. Evitar vídeo gigante/WebGL como background.
- [ ] R2. Otimizar imagens em WebP/AVIF quando possível.
- [ ] R3. Não carregar todas as imagens de produtos em resolução máxima de uma vez.
- [ ] R4. Preload apenas dos assets críticos da primeira dobra.
- [ ] R5. Animações preferencialmente transform/opacity.
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
