# Editor do Forge Loadscreen

Abra **/adminloadscreen** para entrar direto no editor visual. A opção **Forge Loadscreen** do Forge Core também abre o editor. O comando **/adminloadscreenmenu** abre o menu clássico, que continua disponível para administradores.

## Editar em tempo real

- **Layout**. Arraste cada bloco na grade. Clique com **Ctrl** ou **Shift**, ou arraste no fundo para selecionar vários. Alinhe, distribua e redimensione o grupo usando as alças. Em **Tela principal e pop-ups**, escolha a janela que quer posicionar.
- **Bloco**. Clique em um bloco na prévia para editar o conteúdo daquele bloco, a fonte, o tamanho e cor do texto, a opacidade, o fundo e a borda. Curvatura em **0 px** deixa os cantos retos. Use os olhos para mostrar ou ocultar o bloco, o texto, o fundo e a borda. Em **Fundo e borda**, **Efeito de vidro** desfoca o vídeo atrás do bloco. No cartão da equipe, **Filete lateral** mostra uma linha na cor de destaque.
- **Visibilidade**. Reative blocos ocultos ou acione seções como Regras, Novidades, Teclas, Equipe e Redes sociais.
- **Identidade e Cores**. Ajuste nome, apresentação, subtítulo, logotipo, rodapé e dica. Escolha Forge, Verde Lima ou Azul Anil, ou ajuste as cores e o degradê manualmente.
- **Mídia**. Adicione e ordene vídeos e músicas por caminho ou URL. Ajuste volume, fonte de áudio, reprodução, capa, ordem e intervalos. Use **Testar prévia** para clicar nos controles de áudio e nos atalhos com a grade recolhida.
- **Conteúdo**. Edite regras, versões e suas novidades, teclas e descrições do teclado, equipe, destaques e links.
- **Geral**. Defina idioma, textos da interface e tempo mínimo. Zero desativa a espera adicional.

As mudanças ficam no editor até você clicar em **Salvar e aplicar**. A configuração passa pela validação do servidor, grava o `config.json` e fica disponível para as próximas conexões. Você pode continuar editando após salvar. Fechar a prévia descarta as mudanças feitas desde o último salvamento.

No JSON, `layout` guarda `x`, `y`, `width` e `height` em porcentagens da tela. `elements` guarda visibilidade e aparência por bloco. `textVisibility` guarda os textos ocultados individualmente. `colors` guarda os valores da paleta e `followGlobalTheme` controla o destaque vindo do Forge Management. Campos visuais omitidos usam os padrões.

## Categorias do menu clássico

| Categoria | Configurações |
| --- | --- |
| Seções da tela | Marca, vídeo, música, dica, regras, novidades, teclas, equipe e redes sociais |
| Informações, identidade e textos | Nomes, slogan, logotipo, marca, idioma, dica, rodapé e cada texto dos botões/progresso |
| Editar layout e paletas | Posição e tamanho dos elementos e janelas, paletas prontas e destaque global |
| Paleta de cores | Todas as cores, opacidades e degradê com direção e posições individuais |
| Vídeo e áudio do fundo | Lista de vídeos, reprodução única ou playlist, ordem aleatória, intervalos, som próprio, música separada ou silêncio |
| Configurações de música | Faixas, capas, artista, álbum, volume, autoplay, ordem aleatória e reprodução única ou playlist |
| Tempo mínimo de carregamento | Ativar/desativar a espera e definir o tempo mínimo total |
| Equipe e desenvolvedores | Pessoas, cargos, fotos e carrossel |
| Teclas e comandos | Comandos individuais, descrições e destaques/informações do teclado visual |
| Regras do servidor | Adicionar, editar, ordenar e remover cada regra |
| Novidades e versões | Versões, datas e linhas de novidades em submenus próprios |
| Cartões informativos | Títulos, descrições e ícones |
| Redes sociais e site | Links públicos e links dos painéis; `#` mantém o painel interno |

As listas usam uma entrada por item, com ações próprias de edição, ordenação e remoção confirmada. Músicas e vídeos também oferecem **Usar como primeiro**, que escolhe o item exibido no modo de reprodução única.

As cores usam paleta, não uma caixa para digitar hexadecimal. Os números com limite usam controles deslizantes. Formulários de listas editam somente um registro por vez.

## Limites

- Espera mínima: 0–900 segundos; 0 desativa. É o tempo total, não um acréscimo ao carregamento real. Exemplo: jogo pronto em 15 segundos e mínimo de 180 → aguarda os 165 segundos restantes. Um carregamento real mais demorado nunca é abreviado.
- Volume e opacidade: 0–100%; direção do degradê: 0–360°; posições: 0–100%; degradê: 2–8 cores.
- Vídeos: até 12, com intervalos de 8–600 segundos; músicas: até 20.
- Equipe: até 24 pessoas, com carrossel de 3–60 segundos.
- Regras: até 80; versões: até 30; novidades por versão: até 24.
- Comandos: até 60, sem duplicar teclas; cartões informativos: até 3.

O intervalo padrão do vídeo atualiza itens que seguiam o intervalo anterior, preservando durações personalizadas. Em **Som do próprio vídeo**, a faixa separada não toca junto. **Sem som** silencia ambas as fontes. O silêncio global dos vídeos e o silêncio individual também são respeitados.

## Persistência e permissões

As configurações continuam pertencendo à Forge Loadscreen. O editor usa o serviço de validação e persistência do próprio recurso, compartilhado com seu plugin de gerenciamento. O cache genérico do PR Bridge e o QBX não foram alterados nesta reconstrução.

O servidor verifica a permissão tanto na abertura quanto na gravação. São reconhecidas as permissões específicas `forge-loadscreen.admin` e `forge-core.admin`; a integração de administração existente e seus fallbacks permanecem disponíveis. O arquivo anterior é copiado para `config.plugin-backup.json` antes da gravação principal. Se a cópia ou a gravação falhar, a nova configuração não é aplicada nem publicada.

## Verificação desta atualização — 17/10/2026

- 18 casos do menu/servidor: cobertura do JSON, rascunho, cancelamento, paletas, listas, permissão e falhas de gravação.
- 20 casos no navegador isolado, com a interface compilada real: configuração inicial, prévia, cores, áudio, volume zero, reprodução aleatória/única e espera obrigatória.
- 5 casos do cronômetro com relógio simulado; sintaxe validada em 38 arquivos de integração.
- 5 casos adicionais com os contextos reais do PRLib isolados por recurso: chamadas de Forge Loadscreen/Forge Pause pelo painel, retorno entre recursos, submenus, reabertura independente e permissões.
- Testes adicionais de leitura inicial, visibilidade, reprodução e contratos de configuração passaram.
- Testes não gravaram o JSON real, não acessaram SQL e não reiniciaram o servidor ou seus recursos.

Ainda é necessária a conferência visual dos contextos, foco e paletas dentro do FiveM. YouTube e outras mídias externas dependem de acesso à rede e das políticas de reprodução do cliente; não foram homologados online. Permanecem ausentes duas imagens opcionais já referenciadas pelo preset (`images/staff/moderator.png` e `images/music/default.png`), além do aviso de compilação sobre a máscara opcional `images/logo.png`.
