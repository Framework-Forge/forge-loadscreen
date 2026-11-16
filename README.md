# 🚀 forge Loading Screen (React + NUI)

Uma tela de carregamento avançada, moderna e totalmente configurável em tempo real para servidores FiveM. Desenvolvida em React, CSS customizado e integrada nativamente com o ecossistema FiveM através de comandos administrativos e salvamento persistente.

---

## 🛠️ Funcionalidades Principais

*   **🎬 Vídeo de Fundo Dinâmico:** Suporta vídeos locais (`.mp4`) ou links de vídeos do YouTube com qualidade máxima forçada (1080p HD) e autoplay contornado para NUI.
*   **🎵 Widget de Música Adaptativo:**
    *   Exibe controle completo (Play, Pause, Próxima, Anterior) se faixas locais `.mp3` estiverem ativas.
    *   Exibe apenas o controle deslizante de volume se estiver tocando o áudio nativo de um vídeo do YouTube de fundo.
*   **🎨 Personalização de Cores e Aparência:** Paletas para cores de fundo, cartões, bordas e degradê, com controles deslizantes de opacidade e posição. A prévia mostra o rascunho; somente **Salvar e aplicar** persiste as alterações.
*   **⌨️ Teclado 100% Interativo & Legenda de Teclas:** Visualização em tempo real de atalhos em um teclado interativo completo acompanhado de uma lista/legenda detalhada dos comandos configurados.
*   **👥 Slider de Staff Moderno:** Exibição elegante dos membros da administração com fotos, cargos e nomes.
*   **📜 Regras e Changelogs:** Seções dedicadas em formato modal para regras do servidor e histórico de atualizações ordenado por versão.
*   **🔗 Links Sociais Nativos:** Abertura inteligente de redes sociais (Discord, Tebex, Instagram, etc.) diretamente no navegador padrão (externo) do jogador via APIs nativas do FiveM.

---

## 👑 Comandos de Administrador (In-game)

O script oferece controle total in-game sem necessidade de editar arquivos manuais ou reiniciar recursos:

1.  **`/adminloadscreen`**
    *   Abre o menu de configuração por categorias com `pr_lib.menu.RegisterContext`, nativo do PR Bridge.
    *   Permite habilitar/desabilitar seções (Ativar/Desativar Música, Staff, Regras, etc.).
    *   Edição de textos de Branding (Nome da comunidade, Slogan) e dicas na tela.
    *   **Listas individuais:** Adicione, edite, ordene e remova músicas, vídeos, regras, versões e suas linhas de novidades, membros da equipe, teclas e cartões, respeitando os limites de segurança do servidor.
    *   **Pré-visualizar rascunho / Descartar alterações:** Teste sem gravar e retorne ao menu; descarte somente após confirmação.
    *   **Salvar e Aplicar:** Escreve instantaneamente no arquivo `config.json` do servidor e propaga em tempo real para a NUI.
    *   Guia completo do novo editor: [ADMIN_MENU.md](ADMIN_MENU.md).
2.  **`/previewloadscreen`**
    *   Abre a tela de carregamento sobreposta ao jogo para testes.
    *   Excelente para depurar novas cores, vídeos e atalhos.
    *   Para fechar a tela, basta pressionar **ESC** ou clicar no botão vermelho no topo direito.
3.  **`/stoploadscreen`**
    *   Comando auxiliar de emergência para fechar e remover o foco do cursor NUI.

---

## ⚠️ Hospedagem de Imagens e GIFs (Staff / Logos)

> [!IMPORTANT]
> **NÃO utilize o Imgur ou Youtube** para hospedar imagens, GIFs ou videos da tela de carregamento.
> O Imgur possui bloqueios rígidos de *hotlinking* contra o protocolo nativo da NUI do FiveM (`nui://`), fazendo com que o carregamento falhe e retorne erro `403 Forbidden`, exibindo apenas o placeholder de texto.

### Como hospedar suas Imagens/GIFs corretamente:

#### Opção A: Hospedagem Local no Script (Recomendada - 100% Estável)
Armazenar as mídias dentro do recurso garante carregamento instantâneo e previne quebras futuras por queda de serviços externos.
1.  Cole seus arquivos GIF, PNG ou JPG dentro da pasta:
    `forge-loadscreen/ui/public/images/`
2.  No terminal da pasta `ui`, compile o recurso para mover os arquivos para a pasta final:
    ```bash
    npm --prefix "ui" run build
    ```
3.  No menu in-game `/adminloadscreen` ou no `config.json`, defina a URL local como:
    `./images/seu_arquivo.gif` (ou `./images/staff/seu_arquivo.png`).

#### Opção B: CDNs Externas Viáveis
Caso queira usar links da internet, utilize sites que **não bloqueiem** o tráfego do FiveM.
*   **Catbox.moe:** ([https://catbox.moe/](https://catbox.moe/)) — Hospedagem direta excelente e recomendada para arquivos e GIFs.
Ao carregar o gif ou video procure por a url de forma correta.
Ex:
video: https://files.catbox.moe/7oqrv3.mp4
Gifs: https://files.catbox.moe/3dtqmd.gif

*Certifique-se sempre de copiar o **Link Direto** (o link que termina exatamente com a extensão do arquivo, ex: `.gif`, `.png`, `.jpg`).*

---

## ⏱️ Sistema de Cronômetro & Tempo Mínimo de Exibição

O script permite configurar um tempo mínimo de carregamento em segundos (ex: para garantir que os players leiam as regras ou assistam ao vídeo de introdução completo). Esse tempo pode ser ajustado diretamente no menu in-game `/adminloadscreen` em **"Tempo mínimo de carregamento"**. O controle deslizante permite de 0 a 900 segundos; 0 desativa a espera obrigatória. O valor é o tempo mínimo total: se o jogo ficar pronto em 15 segundos e o mínimo for 180, aguarda os 165 segundos restantes.

### Integração no Multicharacter ou Core (ex: qbx_core / qb-core)

Para garantir que a tela de carregamento respeite o tempo restante configurado antes de sumir da tela do jogador ao spawnar ou selecionar o personagem, você deve substituir o encerramento padrão nativo (`ShutdownLoadingScreen`) no seu script de multicharacter ou core pelo seguinte snippet:

```lua
    local loadingHandled = false
    if GetResourceState("forge-loadscreen") == "started" then
        loadingHandled = pcall(function()
            exports["forge-loadscreen"]:FinishLoadingScreen()
        end)
    end

    if not loadingHandled then
        ShutdownLoadingScreen()
        ShutdownLoadingScreenNui()
    end
```

*   **Como funciona:** O export `FinishLoadingScreen()` verifica se o tempo configurado já passou. Se sim, fecha imediatamente. Se ainda houver tempo restante no cronômetro, a tela permanecerá aberta exibindo o progresso até o tempo se esgotar, fechando em seguida de forma totalmente suave.

---

## ⚙️ Instalação e Desenvolvimento (Devs)

Se você deseja modificar a estrutura ou estilos da interface base:

1.  Acesse a pasta da UI, instale as dependências e inicie o Vite:
    ```bash
    cd ui
    npm install
    npm run dev
    ```
2.  Para compilar a interface para produção (necessário sempre que alterar arquivos na pasta `ui/src` ou adicionar arquivos em `ui/public`):
    ```bash
    npm run build
    ```
3.  Certifique-se de carregar `ox_lib` e `pr_bridge` antes do script no seu `server.cfg`:
    ```ini
    ensure ox_lib
    ensure pr_bridge
    ensure forge-loadscreen
    ```
