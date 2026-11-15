# Editor da Forge Loadscreen

O comando `/adminloadscreen` abre o editor nativo de contextos do PRLib (`pr_lib.menu.RegisterContext`). Não utiliza ox_lib. O editor cobre os 160 valores presentes no `config.json` atual, incluindo opções compartilhadas que são sincronizadas para compatibilidade.

O painel principal **Forge Core** também oferece a opção **Forge Loadscreen**. Quando aberto por esse painel, o botão voltar da raiz do editor retorna ao menu principal da Forge Core, mesmo sendo recursos diferentes. Os submenus continuam voltando ao seu pai dentro do editor. A abertura direta por `/adminloadscreen` permanece independente, sem herdar um pai de uma sessão anterior.

Outros recursos podem informar seu contexto pai na chamada local `TriggerEvent('forge-loadscreen:client:openAdminMenu', parentMenu, parentResource)`. Se o recurso não for informado, ele é capturado do chamador antes das verificações assíncronas. A permissão administrativa continua sendo validada pela Forge Loadscreen.

## Como usar

1. Depois da atualização dos arquivos, reinicie apenas `forge-loadscreen` em um momento adequado, sem jogadores conectando.
2. Entre no jogo com permissão administrativa e abra `/adminloadscreen`.
3. Edite as categorias desejadas. As alterações ficam em um rascunho local.
4. Use **Pré-visualizar rascunho** para conferir a tela sem gravar. Ao fechar a prévia, o editor reaparece.
5. Use **Salvar e aplicar** para validar, criar a cópia de segurança, gravar o JSON e publicar a configuração. Em caso de falha de gravação, o rascunho permanece disponível.
6. **Descartar alterações** exige confirmação e recarrega a configuração salva.

Fechar o menu não salva o rascunho. Ele continua disponível ao reabrir durante a mesma execução do recurso. Reiniciar o recurso ou sair do jogo descarta o rascunho local não salvo. A prévia não impõe uma espera de carregamento no jogador.

## Categorias

| Categoria | Configurações |
| --- | --- |
| Seções da tela | Marca, vídeo, música, dica, regras, novidades, teclas, equipe e redes sociais |
| Informações, identidade e textos | Nomes, slogan, logotipo, marca, idioma, dica, rodapé e cada texto dos botões/progresso |
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
