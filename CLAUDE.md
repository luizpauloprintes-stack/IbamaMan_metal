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
src/main.js                Phaser.Game (lógico 800x450, canvas 1600x900), pixelArt, Scale.FIT + CENTER_BOTH, Arcade gravidade y=900
src/config/
  constants.js             dimensões, GROUND_Y, LEVEL_W, gatilho/trava do chefe, DEPTH
  weapons.js               tabela de armas PISTOL/H/R/F + Carga de Demolição (BOMB)
  missions.js              as 4 missões da campanha (só a playable=true tem fase)
  assets.js                SPRITE_MANIFEST (PNGs reais) + KEYS (formato de cada textura)
  controls.js              layout/transparência dos controles touch (direcional flutuante e botões)
src/gfx/placeholders.js    gera TODAS as texturas em pixel art via this.make.graphics()
src/gfx/Particles.js       partículas leves: fumaça do míssil, poeira, cápsulas, faíscas, estilhaços (teto de 140)
src/audio/Sfx.js           efeitos sintetizados com Web Audio API (sem arquivos de áudio)
src/scenes/
  BootScene.js             carrega PNGs do manifest, gera placeholders faltantes, cria animações
  GameScene.js             fase, câmera, colisões, ondas, gaiolas, power-ups, chefe, vitória/game over
  UIScene.js               HUD + direcional flutuante + botões touch e teclado (sobreposta à GameScene)
src/objects/
  Player.js                movimento, pulo, agachar, armas, munição, bomba, dano/vidas
  Miner.js                 garimpeiro com mangueira (anda até o jogador e lança lama em parábola)
  Cage.js                  gaiola com animal: quebra com tiro → solta o animal e dropa bônus
  MegaDraga.js             chefe (1000 HP, 2 estados, jatos de rejeito, baldes de Hg)
android/                   projeto nativo gerado pelo Capacitor (versionado)
public/assets/sprites/     spritesheets gerados + manifest.json
tools/build_sheets.py      recorta as folhas de arte em spritesheets
tools/source_sheets/       as 8 folhas de arte originais
```

### Resolução (zoom 2)
- Toda a lógica (posições, física, câmera, UI) usa unidades de **800x450**. O canvas tem `800x450 × RENDER_ZOOM` (= 1600x900) e as câmeras da `GameScene` e da `UIScene` usam `setZoom(RENDER_ZOOM)`.
- A câmera tem zoom centralizado: use `gameScene.viewLeft` / `setViewLeft(x)` em vez de `cam.scrollX`. Objetos com `setScrollFactor(0)` somam `VIEW_OFF_X/VIEW_OFF_Y`.
- Sprites reais são gerados em 2x (`res: 2` no manifest). Exiba com `setScale(ts(key))` e defina corpos com `setBodyLogical(obj, w, h, ox, oy)` em unidades lógicas (ambos em `src/config/assets.js`). Textos usam `resolution: RENDER_ZOOM`.
- Na `UIScene`, ponteiros vêm em pixels do canvas: divida por `RENDER_ZOOM`.

### Fluxo entre cenas
- `BootScene` → `GameScene`; a `GameScene` lança a `UIScene` por cima.
- **Controles:** a `UIScene` escreve em `registry.get('controls')` (`left/right/crouch/jump/fire/bomb` + bordas `jumpQueued`, `bombQueued`, `firePressed`). A `GameScene` lê e consome as bordas.
- **Controles touch:** direcional *flutuante* (nasce onde o polegar toca na metade esquerda e some ao soltar); botões FIRE/JUMP/BOMB pequenos e translúcidos no canto direito, que quase somem quando o IbamaMan passa por trás. Só aparecem em aparelhos com toque. A câmera mantém o jogador a `CAMERA_LEAD_X` px da esquerda e ele não encosta na borda (`SCREEN_LEFT_MARGIN`).
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
- Caixas de suprimentos H/R/F, 4 gaiolas (arara, onça, macaco, peixe-boi), tambores de Hg que explodem em cadeia (`HG_BARREL`), sacos de areia/toras de cenário, ondas de garimpeiros e apoio aéreo do helicóptero GEF.
- Em `BOSS_TRIGGER_X` a câmera trava (`BOSS_LOCK_X`) e entra a **Mega Draga**:
  - Dano de tiros/bombas, pisca branco (`setTintFill(0xffffff)` 80 ms), barra vermelha na `UIScene`.
  - Estado 1 (HP > 500): jatos de rejeito em parábola + baldes de mercúrio rolantes.
  - Estado 2 (HP ≤ 500): frame avariado + tinta avermelhada, cadência maior, fumaça/explosões contínuas.
  - Derrota: 8 explosões a cada 250 ms, limpa inimigos, banner "ÁREA EMBARGADA! MISSION COMPLETE!", fanfarra sintetizada e cartão do rio restaurado (`bg_restored`).

## Armas (`src/config/weapons.js`)

| Arma | Munição | Dano | Cooldown | Comportamento |
|---|---|---|---|---|
| PISTOL | ∞ (`-1`) | 10 | 250 ms | tiro reto |
| H (caixa verde) | 150 | 12 | 90 ms | rajada com dispersão −5°…+5° |
| R (caixa vermelha) | 30 | 60 em área (r=70) | 500 ms | míssil que explode |
| F (caixa laranja) | 80 | 35 | 150 ms | fogo de curto alcance que atravessa inimigos |
| BOMB (botão) | 10 | 80 em área (r=80) | — | arco com gravidade, explode no chão ou no inimigo |

Com `ammo <= 0` a arma volta para `PISTOL`.

## Sprites (arte real + placeholders)

A arte vem das 8 folhas da *Curadoria de Sprites IbamaMan: Garimpo Slug*, guardadas em `tools/source_sheets/` (01_elenco_personagens … 08_cenario_missao_4_vitoria), e das artes em alta resolução de `tools/source_sheets/hero_v2/` (IbamaMan correndo, atirando parado, em pé, agachado e pulando; garimpeiro com jato, madeireiro, agente GEF, Barão do Garimpo, helicóptero GEF, Mega Draga e a folha de itens HD com gaiolas/animais, tambores, caixas H/R/F, kit médico, açaí, abacaxi e explosões), que têm prioridade sobre as folhas originais.
`tools/build_sheets.py` remove o fundo branco e o halo claro das bordas, recorta cada quadro em **2x** (`RES=2`), desenha o contorno escuro de 1px lógico (#141812, estilo Metal Slug; não em explosões), alinha os pés na base (`origin(0.5, 1)`) e grava os spritesheets + `manifest.json` em `public/assets/sprites/`:

```bash
pip install opencv-python-headless scipy numpy
python3 tools/build_sheets.py      # depois: npm run build
```

O `BootScene` carrega tudo que está no `manifest.json`; **qualquer key ausente do manifest cai no placeholder procedural** de `src/gfx/placeholders.js` (hoje: projéteis `proj_bullet/hmg/rocket/flame/mud` e as camadas `bg_forest/bg_river`). `bg_sky` com `"full": true` é o cenário pintado completo da Missão 3 (espelhado para rolar sem emenda) e desliga as camadas procedurais.

Tamanhos abaixo em unidades lógicas (o PNG real tem o dobro).

| Key | Sheet real (quadros × px) | Placeholder | Origem |
|---|---|---|---|
| `player_run` | 5 × **96×64** | 5 × 64×64 | hero_v2/hero_corrida (tiro correndo usa clarão procedural `fx_muzzle`) |
| `player_shoot` | 5 × **96×64** (tiro parado, clarão e cápsulas na arte) | 5 × 64×64 | hero_v2/hero_tiro |
| `player_pose` | 4 × **96×64** (parado, agachado, pulo, dano) | 4 × 64×64 | hero_v2 (em_pe, agachado, parado→pulo) |
| `player_bomb_win` | 10 × **96×64** (0–4 arremesso, 5–9 vitória) | 10 × 64×64 | Sheet 03 |
| `enemy_miner_hose` | 4 × **128×64** (parado, jato, jato, fuga) | 4 × 64×64 | Sheet 04 + hero_v2/inimigos_v2 (jatos) |
| `enemy_logger` | 4 × **128×84** | 4 × 64×64 | hero_v2/inimigos_v2 (0–1) + Sheet 04 (2–3) |
| `ally_gef_heli` | 1 × 192×128 | idem | hero_v2/heli_gef |
| `slug_boat` / `slug_quad` | 2 × 128×80 | idem | Sheet 05 topo (ainda não usados) |
| `boss_mega_draga` | 2 × **440×230** (normal, avariada) | 2 × 320×220 | hero_v2/mega_draga |
| `wildlife_cages` | 8 × 64×64 (preso/solto: arara, onça, macaco, peixe-boi) | idem | hero_v2/itens_hd |
| `powerups_hrf` | 6 × 32×32 (H, R, F, medkit, açaí, abacaxi) | idem | hero_v2/itens_hd |
| `fx_explosion` | 10 × 64×64 (clarão → fogo → fumaça que some) | idem | hero_v2/itens_hd (4 fases em 10 quadros) |
| `fx_muzzle`, `proj_bomb`, `hazard_hg_bucket` | 16, 14, 24 px | idem | Sheets 03/06 |
| `ground_mud`, `water`, `plat_wood`, `bg_sky` | texturas | idem | Sheet 07 |
| `boss_baron` | 2 × 96×84 (normal, enfurecido) | genérico | hero_v2/barao_normal + barao_furioso (Missões 1 e 4) |
| `ally_gef_agent` | 2 × 96×64 | genérico | inimigos_v2 + Sheet 04 |
| `prop_hg_barrels` (2), `prop_logs`, `prop_sandbags` | 32×40, 64×40, 56×40 | genérico | Sheet 06 (tambores explodem em cadeia na demo) |
| `bg_m1`, `bg_m2`, `bg_restored` | cenários | genérico | hero_v2/cenarios_hd (floresta, igapó destruído com céu em névoa, rio restaurado = cartão da vitória) |
| `bg_m4` | cenário | genérico | Sheet 08 (Balsa-Fortaleza) |
| `plat_raft` | 128×48 (balsa de toras, deck a ~20% do topo) | 128×24 | hero_v2/cenarios_hd |

Keys de `KEYS` sem desenho procedural próprio recebem um bloco genérico com o número certo de quadros (fallback em `generatePlaceholders`).

Corpos físicos que dependem do tamanho do quadro são calculados a partir de `displayWidth/displayHeight` (Miner, MegaDraga), então trocar placeholder ↔ arte real não exige mudar código. O corpo do jogador também é centrado pelos pés a partir de `displayWidth` (`standBody/crouchBody`), mas **todas as sheets do jogador precisam ter o mesmo tamanho de quadro**.

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
