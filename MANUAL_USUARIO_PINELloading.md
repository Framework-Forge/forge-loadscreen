# Manual do Usuario - forge Loadscreen

Este manual explica como configurar a loadscreen da forge, como baixar videos e musicas com o app externo, e como aplicar tudo no servidor FiveM.

## Visao geral

O `forge-loadscreen` tem duas partes principais:

- **Plugin no forge Management:** usado para configurar textos, cores, staff, videos cadastrados, musicas cadastradas, regras e outras opcoes.
- **forgeMediaDownloader.exe:** app externo usado para baixar videos e musicas do YouTube e atualizar o `config.json` automaticamente.

O download de video/musica nao e feito dentro do painel do FiveM. Isso foi separado porque o FiveM pode bloquear a execucao de `.exe`/`.bat` pelo resource. O app externo e o metodo recomendado.

## Arquivos importantes

| Arquivo ou pasta | Para que serve |
| --- | --- |
| `config.json` | Configuracao principal da loadscreen. |
| `tools/forgeMediaDownloader.exe` | App externo para baixar midia e atualizar o JSON. |
| `tools/yt-dlp.exe` | Ferramenta usada pelo downloader para baixar do YouTube. |
| `ui/public/videos` | Copia publica dos videos baixados. |
| `ui/dist/videos` | Videos usados pela loadscreen em producao. |
| `ui/public/music` | Copia publica das musicas baixadas. |
| `ui/dist/music` | Musicas usadas pela loadscreen em producao. |
| `config.downloader-backup.json` | Backup criado automaticamente antes do app alterar o `config.json`. |

## Como abrir o painel da loadscreen

1. Entre no servidor com permissao de administrador.
2. Abra o forge Management.
3. Va em **Plugins**.
4. Abra **Loadscreen**.

No painel voce pode ajustar:

- cores;
- textos;
- nome do servidor;
- links sociais;
- lista de videos;
- lista de musicas;
- staff;
- regras;
- changelog;
- keybinds;
- JSON avancado.

## Como baixar video ou musica

Use o app externo:

```txt
forge-loadscreen/tools/forgeMediaDownloader.exe
```

### Passo a passo

1. Abra `forgeMediaDownloader.exe`.
2. Confira se a pasta do resource esta apontando para `forge-loadscreen`.
3. Cole o link do YouTube no campo **Link**.
4. Escolha o tipo:
   - `Video` para video de fundo;
   - `Musica` para audio da playlist.
5. Clique em **Baixar**.
6. Aguarde concluir.

Ao terminar, o app faz tudo isso automaticamente:

- baixa o arquivo;
- salva em `ui/dist`;
- salva uma copia em `ui/public`;
- pega o titulo do YouTube;
- atualiza o `config.json`;
- cria backup em `config.downloader-backup.json`.

## Onde o arquivo fica salvo

### Video

Quando voce baixa um video, ele fica em:

```txt
ui/dist/videos/video_ID.mp4
ui/public/videos/video_ID.mp4
```

No `config.json`, o caminho salvo fica assim:

```txt
./videos/video_ID.mp4
```

O app adiciona esse video em:

```json
"backgroundMedia": {
  "items": []
}
```

Tambem atualiza:

```json
"videoSource": "./videos/video_ID.mp4",
"videoType": "video"
```

### Musica

Quando voce baixa uma musica, ela fica em:

```txt
ui/dist/music/music_ID.webm
ui/public/music/music_ID.webm
```

No `config.json`, o caminho salvo fica assim:

```txt
./music/music_ID.webm
```

O app adiciona essa musica em:

```json
"musicTracks": []
```

Com nome preenchido automaticamente pelo titulo do YouTube.

## Como aplicar depois de baixar

Depois que o app terminar:

1. Reinicie o resource:

```txt
restart forge-loadscreen
```

2. Abra novamente o painel do forge Management.
3. Entre em **Loadscreen**.
4. Verifique se o video/musica apareceu na lista.
5. Ajuste nome, volume, duracao ou ordem se quiser.
6. Clique em **Salvar** se fizer alteracoes pelo painel.

## Configurando videos de fundo

No painel, abra a aba **Videos**.

Opcoes principais:

- **Audio usado**
  - `Musica separada`: o video fica mudo e a playlist de musicas toca.
  - `Audio do video`: usa o audio do proprio video.
- **Modo**
  - `Playlist`: toca a lista de videos.
  - `Unico`: usa um video principal.
- **Tempo padrao de troca**
  - Tempo em segundos para trocar de video.
- **Embaralhar videos**
  - Sorteia a ordem dos videos.
- **Mudo**
  - Define se aquele video especifico fica sem audio.

Cada video tem:

- **Titulo**
- **Duracao antes de trocar**
- **Arquivo no servidor**
- **Mudo**

## Configurando musicas

No painel, abra a aba **Musicas**.

Opcoes principais:

- **Volume**
  - Valor entre `0` e `1`.
  - Exemplo: `0.6`.
- **Origem**
  - Use `Playlist` para tocar as musicas cadastradas.
- **Tocar automaticamente**
  - Liga/desliga autoplay.
- **Mostrar capa**
  - Mostra imagem da musica no widget.
- **Embaralhar**
  - Sorteia a ordem das musicas.

Cada musica tem:

- **Nome**
- **Artista**
- **Capa**
- **Album**
- **Arquivo de audio no servidor**

## Configurando capa da musica

Por padrao, o downloader usa:

```txt
./images/music/default.png
```

Voce pode trocar no painel.

Exemplos de caminho:

```txt
./images/music/minha-capa.png
https://files.catbox.moe/arquivo.png
```

Recomendacao: use imagem local ou link direto que termine em `.png`, `.jpg`, `.jpeg`, `.webp` ou `.gif`.

## Configurando staff

No painel, abra **Staff**.

Cada membro pode ter:

- **Nome**
- **Cargo**
- **Foto**

Fotos podem ser:

```txt
./images/staff/admin.png
https://files.catbox.moe/foto.gif
```

Evite Imgur quando possivel, pois pode bloquear carregamento no FiveM.

## Configurando regras e changelog

Na aba **Conteudo** voce pode configurar:

- regras do servidor;
- changelogs;
- keybinds.

Esses textos aparecem na loadscreen para o jogador.

## Configurando cores e textos

Na aba **Geral** voce pode ajustar:

- nome do servidor;
- slogan;
- textos da interface;
- links sociais;
- cards centrais;
- textos de carregamento.

Na aba de visual/cores, configure as cores usadas pela loadscreen.

## JSON avancado

A aba **JSON avancado** e para usuarios experientes.

Use quando precisar editar algo que nao esta nos campos normais do painel.

Cuidados:

- mantenha o JSON valido;
- nao remova campos importantes sem saber;
- antes de grandes alteracoes, copie o `config.json`;
- se algo quebrar, restaure `config.downloader-backup.json`.

## Backup e restauracao

O app cria automaticamente:

```txt
config.downloader-backup.json
```

Se o `config.json` ficar errado:

1. Pare ou reinicie o resource depois da restauracao.
2. Renomeie o arquivo atual para guardar:

```txt
config.json
```

3. Copie o backup e renomeie para:

```txt
config.json
```

4. Reinicie:

```txt
restart forge-loadscreen
```

## Solucao de problemas

### O plugin nao aparece no forge Management

Confira o console do servidor.

Mensagem esperada:

```txt
[forge-loadscreen] Plugin registrado no forge Management
```

Se aparecer rejeicao, confira se `forge-management` esta iniciado antes do loadscreen.

Ordem recomendada no `server.cfg`:

```ini
ensure ox_lib
ensure pr_bridge
ensure forge-management
ensure forge-loadscreen
```

### O video ou musica baixou, mas nao aparece

1. Confira se o app mostrou que atualizou o `config.json`.
2. Reinicie o resource:

```txt
restart forge-loadscreen
```

3. Reabra o painel.
4. Confira a aba **Videos** ou **Musicas**.

### O video nao toca

Confira:

- o arquivo existe em `ui/dist/videos`;
- o caminho no painel comeca com `./videos/`;
- o tipo do item esta como `video`;
- o arquivo e `.mp4`.

### A musica nao toca

Confira:

- o arquivo existe em `ui/dist/music`;
- o caminho no painel comeca com `./music/`;
- o tipo do item esta como `audio`;
- o arquivo e `.webm`.

### O downloader falha ao baixar

Confira:

- internet do computador/servidor;
- link do YouTube valido;
- `tools/yt-dlp.exe` existe;
- o video nao e privado ou bloqueado;
- o caminho da pasta resource esta correto no app.

### O config ficou estranho depois do app

Restaure:

```txt
config.downloader-backup.json
```

Depois reinicie:

```txt
restart forge-loadscreen
```

## Fluxo recomendado

Para configurar uma loadscreen nova:

1. Baixe o video pelo `forgeMediaDownloader.exe`.
2. Baixe as musicas pelo `forgeMediaDownloader.exe`.
3. Reinicie `forge-loadscreen`.
4. Abra o plugin no forge Management.
5. Ajuste volume, textos, cores, staff e regras.
6. Clique em **Salvar**.
7. Use preview/teste entrando no servidor.

## Observacoes importantes

- O painel nao baixa midia diretamente.
- O downloader externo e o caminho oficial para baixar YouTube.
- Sempre reinicie o resource depois de baixar novas midias.
- O app atualiza o `config.json`, mas alteracoes feitas no painel precisam ser salvas no botao **Salvar**.
- Evite arquivos muito grandes para nao atrasar carregamento dos jogadores.


