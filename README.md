# Hiper Roll — Hiper Catch

Um jogo de coleta para navegador: ajude o Bob Roll arrastando os resíduos até a abertura da cesta e tente fazer a maior pontuação em **30 segundos**.

## Capa


![Capa do Hiper Roll — Hiper Catch](https://portifolio-denilsom-lobo.web.app/images/capa/hiper_catch.png)

## Como é o jogo

O jogador informa seu nome e telefone com DDD antes de começar. Durante a partida, itens caem pela arena e devem ser arrastados até o Bob Roll. A cesta cresce conforme a quantidade de itens coletados, chegando a 200% do tamanho inicial.

Ao terminar, o jogo mostra a pontuação e a quantidade de itens coletados. É possível jogar novamente, trocar de jogador e consultar o ranking das 10 melhores partidas. A tela de ranking também oferece exportação em CSV compatível com Excel.

### Controles

- **Mouse ou toque:** pegue um item, arraste até a abertura da cesta e solte.
- **Teclado:** com a arena em foco, use espaço para pegar um item, as setas para movê-lo e espaço novamente para soltá-lo.
- **Cadastro:** teclado virtual disponível para preencher os campos.

### Pontuação

| Item | Pontos |
| --- | ---: |
| Papel amassado | 10 |
| Copo descartável | 10 |
| Casca de banana | 20 |
| Maçã mordida | 20 |
| Polietileno mágico | 50 |

## Imagens do game

<!-- Substitua os três caminhos abaixo por imagens do jogo. Exemplo: docs/images/tela-inicial.png -->

### 1. Tela inicial

![Tela inicial do jogo](CAMINHO_DA_IMAGEM_1)

### 2. Partida em andamento

![Partida em andamento](CAMINHO_DA_IMAGEM_2)

### 3. Resultado ou ranking

![Resultado ou ranking do jogo](CAMINHO_DA_IMAGEM_3)

## Tecnologias usadas

- **HTML5:** estrutura das telas e formulários.
- **CSS3:** aparência e layout responsivo.
- **JavaScript:** lógica do jogo, controles, pontuação e navegação entre telas, sem framework.
- **Canvas 2D e requestAnimationFrame:** desenho da arena e animações.
- **Pointer Events:** interação com mouse e telas de toque.
- **localStorage:** armazenamento local das pontuações, com alternativa em memória quando indisponível.
- **Firebase Authentication e Cloud Firestore:** autenticação anônima e ranking global.
- **PowerShell:** geração do bundle, abertura do jogo e servidor HTTP local opcional.
- **PNG, SVG e WebP:** recursos visuais.

## Como executar

### Abrir diretamente

No Windows, clique duas vezes em `Iniciar Jogo.cmd`. Também é possível abrir `index.html` diretamente em um navegador moderno. O bundle do jogo e as imagens incorporadas já estão incluídos no repositório.

### Usar o servidor local

Na pasta do projeto, execute no PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\server.ps1
```

Abra `http://localhost:8080`. Para encerrar o servidor, pressione `Ctrl+C` no terminal. Para usar outra porta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\server.ps1 -Port 8081
```

### Atualizar o jogo após editar o código

Edite os módulos em `js/` e regenere `js/game.bundle.js`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-game.ps1
```

Inclua o bundle atualizado no mesmo commit das alterações nos módulos. Não é necessário instalar pacotes npm para executar o projeto.

## Ranking global

A integração atual importa `firebaseConfig` de `../../Castle_Roll_V1/firebase-config.js`, relativo a `js/firebase-ranking.js`. Esse arquivo pertence a outro projeto e não está incluído neste repositório. O servidor local possui uma rota específica para essa configuração, obtida da pasta irmã `Castle_Roll_V1`.

Para utilizar o ranking global em outra instalação, ajuste essa integração para a configuração do seu projeto Firebase, habilite a autenticação anônima e configure as permissões da coleção `ranking_hiper_catch`. O arquivo `firestore-ranking.rules.proposed` contém uma proposta de regras para revisão e aplicação no Firebase; ele não é aplicado automaticamente.

O ranking global precisa de acesso à internet e de uma origem HTTP/HTTPS compatível com a integração. Se a sincronização falhar, o jogo salva a pontuação localmente quando possível e exibe os resultados locais no ranking.

O campo de telefone é exigido na tela inicial, mas o fluxo atual de pontuação não o envia ao ranking. A senha de exportação CSV é verificada no código do navegador e não constitui controle de acesso seguro.

## Estrutura do projeto

```text
.
├── asset/                         # Imagens do jogo e da marca
├── assets/                        # Recursos visuais alternativos
├── css/style.css                  # Estilos da interface
├── js/
│   ├── assets.js                  # Carregamento de imagens
│   ├── config.js                  # Tempo, pontuação e crescimento
│   ├── firebase-loader.js         # Inicialização da integração remota
│   ├── firebase-ranking.js        # Ranking no Firebase
│   ├── game.js                    # Lógica e renderização da partida
│   ├── game.bundle.js             # Bundle gerado e usado pelo HTML
│   ├── input.js                   # Controles do jogador
│   ├── main.js                    # Telas, cadastro e eventos
│   └── ranking.js                 # Ranking local e exportação CSV
├── build-game.ps1                 # Geração do bundle
├── firestore-ranking.rules.proposed
├── index.html                     # Página principal
├── Iniciar Jogo.cmd               # Atalho para abrir no Windows
├── server.ps1                     # Servidor HTTP local
└── start-game.ps1                 # Abertura no navegador
```

O avatar no cabeçalho também referencia um arquivo externo (`../../images/avatar.png`). Para uma publicação independente, ajuste esse caminho para uma imagem incluída no projeto.

## Autor

Desenvolvido por **Denilsom Lobo de Souza**.
