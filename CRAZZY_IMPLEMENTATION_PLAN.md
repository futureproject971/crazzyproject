# CRAZZY PROJECT — PLANO DE IMPLEMENTAÇÃO SEQUENCIAL

Regra de execução: fazer uma etapa por vez. Antes de cada etapa, ler o HEAD atual. Depois da alteração, revisar o diff/impacto antes de seguir. Nunca substituir mudanças recentes da Cloud por versões locais antigas.

## Etapas

- [x] 1. Criar backup do estado atual antes das mudanças sequenciais.
- [x] 2. Definir as categorias oficiais da Home e preparar seed/bootstrap do banco.
- [x] 3. Ajustar o painel Admin > Produtos para usar as categorias oficiais do catálogo.
- [x] 4. Integrar clique/seleção das categorias da Home com os produtos da categoria.
- [x] 5. Restaurar a logo CRAZZY PROJECT ao centro e mover o coverflow para o dock de produtos.
- [x] 6. Fazer o carrossel rodar lentamente sozinho e pausar/retomar de forma correta após interação manual.
- [x] 7. Reproduzir a inclinação e o destaque das categorias conforme a referência.
- [x] 8. Eliminar sobreposições entre header, categorias, hero, carrossel, dock, trust bar e footer em desktop/ultrawide/tablet/mobile.
- [x] 9. Corrigir wallpaper e chuva da Home no tema claro sem quebrar a troca real de wallpaper no tema escuro.
- [x] 10. Implementar suporte a cursor personalizado do site com fallback seguro.
- [ ] 11. Executar o PASSE MESTRE DE RÉPLICA VISUAL descrito em `CRAZZY_VISUAL_REPLICA_PLAN.md`.
- [ ] 12. Fazer revisão funcional, acessibilidade, performance e regressão completa após a réplica.
- [ ] 13. Implementar o EDITOR VISUAL ADMIN do site.

## Etapa 13 — Editor visual Admin

Objetivo: permitir que somente administradores personalizem a apresentação do site sem editar código.

Escopo desejado:
- ativar/desativar "Modo Editar Site"
- arrastar e reposicionar cards/categorias dentro de zonas seguras
- alterar ordem de categorias e produtos
- alterar textos editáveis
- alterar logo e imagens permitidas
- controlar visibilidade de blocos
- escolher itens em destaque
- configurar conteúdo do carrossel
- ajustar posições responsivas por breakpoint quando necessário
- pré-visualizar tema claro e escuro antes de salvar
- salvar e publicar configuração
- histórico/versionamento para desfazer alterações
- botão para restaurar layout padrão CRAZZY PROJECT

Regras de segurança:
- edição somente para admin validado no backend/RLS
- não aceitar HTML/JS arbitrário
- não expor segredos nem lógica sensível
- salvar configurações estruturadas, não CSS/JS arbitrário
- posições devem respeitar limites/zonas para evitar sobreposição quebrada
- qualquer personalização continua obedecendo AGENTS.md e os dois temas

Arquitetura:
- separar conteúdo/configuração do componente visual
- usar IDs estáveis para blocos e categorias
- persistir ordem/posição/visibilidade em configuração própria
- manter defaults no código para fallback
- construir o editor somente depois que o layout base estiver estável
