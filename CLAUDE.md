# IbamaMan: Garimpo Slug — guia do projeto

Run-and-gun 2D arcade no estilo Metal Slug. O protagonista **IbamaMan** (fiscal do Ibama / G.E.F.) combate o garimpo ilegal e o desmatamento, liberta animais silvestres e embarga áreas.

**Stack:** Vite + JavaScript (ES modules) + Phaser 3 (física Arcade) → empacotado como APK Android via Capacitor (paisagem travada).

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | instala dependências |
| `npm run dev` | servidor de desenvolvimento (teclado no PC) |
| `npm run build` | build web em `dist/` (**rode antes de qualquer commit**) |
| `npm run cap:sync` | build + copia `dist/` para `android/` |
| `npm run android:apk` | gera `android/app/build/outputs/apk/debug/app-debug.apk` (precisa Android SDK + JDK 21) |

O GitHub Actions (`.github/workflows/android-apk.yml`) compila o APK a cada push na `main` e publica uma **Release** com o arquivo `IbamaMan-Garimpo-Slug.apk`.

## Arquitetura

```
index.html                 canvas em tela cheia, touch-action: none
capacitor.config.json      appId, appName, webDir: "dist"
vite.config.js             base: './' (obrigatório para o WebView do Capacitor)
src/main.js                Phaser.Game 800x450, pixelArt, Scale.FIT + CENTER_BOTH, Arcade gravidade y=900
src/config/
  constants.js             dimensões, GROUND_Y, LEVEL_W, gatilho/trava do chefe, DEPTH
  weapons.js               tabela de armas PISTOL/H/R/F + Carga de Demolição (BOMB)
  missions.js              as 4 missões da campanha (só a playable=true tem fase)
  assets.js                SPRITE_MANIFEST (PNGs reais) + KEYS (formato de cada textura)
src/gfx/placeholders.js    gera TODAS as texturas em pixel art via this.make.graphics()
src/audio/Sfx.js           efeitos sintetizados com Web Audio API (sem arquivos de áudio)
src/scenes/
  BootScene.js             carrega PNGs do manifest, gera placeholders faltantes, cria animações
  GameScene.js             fase, câmera, colisões, ondas, gaiolas, power-ups, chefe, vitória/game over
  UIScene.js               HUD + controles touch multi-toque e teclado (sobreposta à GameScene)
src/objects/
  Player.js                movimento, pulo, agachar, armas, munição, bomba, dano/vidas
  Miner.js                 garimpeiro com mangueira (anda até o jogador e lança lama em parábola)
  Cage.js                  gaiola com animal: quebra com tiro → solta o animal e dropa bônus
  MegaDraga.js             chefe (1000 HP, 2 estados, jatos de rejeito, baldes de Hg)
android/                   projeto nativo gerado pelo Capacitor (versionado)
```

### Fluxo entre cenas
- `BootScene` → `GameScene`; a `GameScene` lança a `UIScene` por cima.
- **Controles:** a `UIScene` escreve em `registry.get('controls')` (`left/right/crouch/jump/fire/bomb` + bordas `jumpQueued`, `bombQueued`, `firePressed`). A `GameScene` lê e consome as bordas.
- **HUD:** a `UIScene` faz *polling* de `GameScene.getHudState()` a cada quadro (evita listeners órfãos ao reiniciar a cena).

### Paisagem / Android
- Trava em `android/app/src/main/AndroidManifest.xml` → `android:screenOrientation="sensorLandscape"`.
- `MainActivity.java` deixa a tela cheia imersiva e mantém a tela ligada.
- Se recriar a pasta `android/` (`npx cap add android`), **reaplique essas duas mudanças**.

## Campanha (4 missões)

| # | Missão | Cenário | Inimigos | Chefe | Status |
|---|---|---|---|---|---|
| 1 | **Desmatamento** | floresta com tratores e pilhas de toras | madeireiro com motosserra, garimpeiro | Barão do Garimpo (motosserra) | planejada |
| 2 | **Garimpo Amador** | córrego barrento, acampamentos, tambores de Hg | garimpeiros com mangueira | — (onda final) | planejada |
| 3 | **Garimpo com Dragas** | rio barrento com balsas e dragas | garimpeiros com mangueira | **Mega Draga** | **jogável (demo)** |
| 4 | **Chefão do Garimpo** | Balsa-Fortaleza | garimpeiros, madeireiros | Barão do Garimpo + Balsa-Fortaleza | planejada |

### Fase demo (Missão 3) — `GameScene`
- Rio raso (o jogador vadeia), barrancos de lama, plataformas de madeira (one-way) e uma balsa móvel.
- Caixas de suprimentos H/R/F, 4 gaiolas (arara, onça, macaco, peixe-boi), ondas de garimpeiros e apoio aéreo do helicóptero GEF.
- Em `BOSS_TRIGGER_X` a câmera trava (`BOSS_LOCK_X`) e entra a **Mega Draga**:
  - Dano de tiros/bombas, pisca branco (`setTintFill(0xffffff)` 80 ms), barra vermelha na `UIScene`.
  - Estado 1 (HP > 500): jatos de rejeito em parábola + baldes de mercúrio rolantes.
  - Estado 2 (HP ≤ 500): frame avariado + tinta avermelhada, cadência maior, fumaça/explosões contínuas.
  - Derrota: 8 explosões a cada 250 ms, limpa inimigos, banner "ÁREA EMBARGADA! MISSION COMPLETE!", fanfarra sintetizada.

## Armas (`src/config/weapons.js`)

| Arma | Munição | Dano | Cooldown | Comportamento |
|---|---|---|---|---|
| PISTOL | ∞ (`-1`) | 10 | 250 ms | tiro reto |
| H (caixa verde) | 150 | 12 | 90 ms | rajada com dispersão −5°…+5° |
| R (caixa vermelha) | 30 | 60 em área (r=70) | 500 ms | míssil que explode |
| F (caixa laranja) | 80 | 35 | 150 ms | fogo de curto alcance que atravessa inimigos |
| BOMB (botão) | 10 | 80 em área (r=80) | — | arco com gravidade, explode no chão ou no inimigo |

Com `ammo <= 0` a arma volta para `PISTOL`.

## Sprites: placeholders → PNG reais

Referência: *Curadoria de Sprites IbamaMan: Garimpo Slug* (8 folhas). Recortar com fundo transparente, pivô na base dos pés (`origin(0.5, 1)`), salvar em `public/assets/sprites/` e registrar em `SPRITE_MANIFEST` (`src/config/assets.js`). Uma key carregada do manifest **não** é gerada como placeholder.

| Key | Frames × tamanho | Origem (folha) |
|---|---|---|
| `player_run` | 5 × 64×64 | Sheet 02 linha 1 |
| `player_shoot` | 5 × 64×64 | Sheet 02 linha 2 |
| `player_bomb_win` | 10 × 64×64 (0–4 arremesso, 5–9 vitória) | Sheet 03 |
| `player_pose` | 4 × 64×64 (parado, agachado, pulo, dano) | Sheet 02/03 |
| `enemy_miner_hose` | 4 × 64×64 (parado, jato, jato, fuga) | Sheet 04 linha 1 |
| `enemy_logger` | 4 × 64×64 | Sheet 04 linha 2 |
| `ally_gef_heli` | 1 × 192×128 | Sheet 04/05 |
| `slug_boat` / `slug_quad` | 2 × 128×80 | Sheet 05 topo |
| `boss_mega_draga` | 2 × 320×220 (HP>50%, HP≤50%) | Sheet 05/08 |
| `wildlife_cages` | 8 × 64×64 (preso/solto: arara, onça, macaco, peixe-boi) | Sheet 06 esquerda |
| `powerups_hrf` | 6 × 32×32 (H, R, F, medkit, açaí, abacaxi) | Sheet 06 direita |
| `fx_explosion` | 10 × 64×64 | Sheet 06 inferior direita |
| `proj_*`, `hazard_hg_bucket`, `plat_wood`, `plat_raft`, `ground_mud`, `water`, `bg_*` | ver `KEYS` | Sheets 06–08 |

Se um PNG real tiver outro tamanho de quadro, ajuste os `body.setSize/setOffset` no objeto correspondente.

## Regras de código
- JavaScript ES modules, sem TypeScript; uma classe por arquivo em `src/objects/` e `src/scenes/`.
- Números de balanceamento ficam em `src/config/` — não espalhe constantes mágicas nas cenas.
- Toda textura é referenciada por key de `KEYS`; nunca carregue imagens direto nas cenas de jogo.
- Personagens usam `setOrigin(0.5, 1)` (pés no chão). Adicione o sprite ao grupo físico **antes** de configurar o corpo (o grupo aplica defaults).
- Callbacks de `collider/overlap` grupo×sprite podem chegar com os argumentos invertidos: identifique os objetos por flag (`isShot`, `isMud`, `isTarget`), nunca pela posição do argumento.
- Alvos danificáveis expõem `isTarget` e `takeDamage(dmg)`.
- Texto da interface em português (pt-BR); nomes de código em inglês/português curto.
- Sem áudio em arquivo: novos sons vão em `src/audio/Sfx.js`.
- Antes de commitar: `npm run build` sem erros e uma partida de teste (chegar ao chefe e vencê-lo).
- Para depurar no navegador: `window.__IBAMAMAN__.scene.getScene('GameScene')`.
