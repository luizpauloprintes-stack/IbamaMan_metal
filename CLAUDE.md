# IbamaMan: Guardião da Amazônia — guia do projeto

Jogo de ação 2D (run-and-gun arcade). Nome do app: **IbamaMan: Guardião da Amazônia** — não citar outros jogos (ex.: o nome do jogo arcade que inspirou o projeto) nem "Slug" em textos visíveis. O protagonista **IbamaMan** (fiscal do Ibama / G.E.F.) combate o garimpo ilegal e o desmatamento, liberta animais silvestres e embarga áreas.

**Stack:** Vite + JavaScript (ES modules) + Phaser 3 (física Arcade) → empacotado como APK Android via Capacitor (paisagem travada).

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | instala dependências |
| `npm run dev` | servidor de desenvolvimento (teclado no PC) |
| `npm run build` | build web em `dist/` (**rode antes de qualquer commit**) |
| `npm run cap:sync` | build + copia `dist/` para `android/` |
| `python3 tools/build_sheets.py && python3 tools/build_motion.py && python3 tools/build_cycles.py && python3 tools/build_icons.py` | regenera sprites, ciclos de movimento (rig + folhas desenhadas) e ícone/capa — nesta ordem |
| `npm run android:apk` | gera `android/app/build/outputs/apk/debug/app-debug.apk` (precisa Android SDK + JDK 21) |

O GitHub Actions (`.github/workflows/android-apk.yml`) compila o APK a cada push na `main` e publica uma **Release** com o arquivo `IbamaMan-Guardiao-da-Amazonia.apk`. Todas as builds são assinadas com a chave fixa versionada `android/app/ibamaman-debug.keystore` (senha `android`) e têm `versionCode = GITHUB_RUN_NUMBER + 100`, para o Android instalar cada APK **por cima** do anterior. O número da build aparece no canto da capa (`__BUILD__`, definido no `vite.config.js`). **Não apague nem troque essa chave**: com outra assinatura o celular recusa a atualização.

## Arquitetura

```
index.html                 canvas em tela cheia, touch-action: none
capacitor.config.json      appId (com.luizpaulo.ibamaman.garimposlug — identificador interno, mantido para o APK atualizar por cima), appName, webDir: "dist"
vite.config.js             base: './' (obrigatório para o WebView do Capacitor)
src/main.js                Phaser.Game (lógico 800x450, canvas 1600x900), pixelArt, Scale.FIT + CENTER_BOTH, Arcade gravidade y=900
src/config/
  constants.js             dimensões, GROUND_Y, LEVEL_W, gatilho/trava do chefe, DEPTH
  weapons.js               tabela de armas PISTOL/H/R/F + Carga de Demolição (BOMB)
  missions.js              as 4 missões da campanha; CAMPAIGN = ordem das jogáveis (playable=true)
  levels.js                layout de cada fase jogável (fundo, terreno, plataformas, inimigos, ondas, chefe, cartão de vitória)
  enemies.js               balanceamento de garimpeiro, madeireiro, Barão, acampamento (CAMP), Balsa-Fortaleza (FORTRESS) e revanche (BARON_FINAL)
  assets.js                SPRITE_MANIFEST (PNGs reais) + KEYS (formato de cada textura)
  controls.js              controles touch: direcional flutuante, botões PULAR/TIRO/BOMBA, tiro automático e botão AUTO
  links.js                 link da PEC 13/2022 (consulta pública do Senado) e openExternal() (abre no navegador do celular)
src/gfx/placeholders.js    gera TODAS as texturas em pixel art via this.make.graphics()
src/gfx/Organic.js         movimento "vivo" por cima dos quadros: respiração, inclinação ao andar, squash/stretch, recuo e tremor de motor (fase própria por instância)
src/gfx/Particles.js       partículas leves: fumaça do míssil, poeira, cápsulas, faíscas, estilhaços (teto de 140)
src/audio/Sfx.js           efeitos sintetizados com Web Audio API (sem arquivos de áudio)
src/scenes/
  BootScene.js             carrega PNGs do manifest, gera placeholders faltantes, cria animações → TitleScene
  TitleScene.js            capa do jogo (title_cover); toque/tecla começa a campanha; fim da campanha volta para cá
  GameScene.js             monta a fase de levels.js; câmera, colisões, ondas, gaiolas, power-ups, chefe, vitória → próxima missão
  UIScene.js               HUD + direcional flutuante + botões touch e teclado (sobreposta à GameScene)
src/objects/
  Player.js                movimento, pulo, agachar, armas, munição, bomba, dano/vidas
  Miner.js                 garimpeiro com mangueira (anda até o jogador e lança lama em parábola)
  Logger.js                madeireiro com motosserra (corpo a corpo, aviso com a lâmina erguida, fumaça do motor)
  Baron.js                 chefe Barão do Garimpo (investida, baldes de Hg, chama madeireiros; enfurece com 50% de HP)
  Cage.js                  gaiola com animal: quebra com tiro → solta o animal (FreedAnimal) e dropa bônus
  FreedAnimal.js           animal libertado: ciclo animals_free + trajetória física (arara decola em curva, onça sacode e arranca,
                           macaco salta e corre, peixe-boi salta e nada submerso ou se arrasta em terra)
  Camp.js                  "chefe" da Missão 2: acampamento defendido por ondas; HP = garimpeiros restantes
  MegaDraga.js             chefe (1000 HP, 2 estados, jatos de rejeito, baldes de Hg); com opts {hp, tint} vira a Balsa-Fortaleza
android/                   projeto nativo gerado pelo Capacitor (versionado)
public/assets/sprites/     spritesheets gerados + manifest.json
tools/build_sheets.py      recorta as folhas de arte em spritesheets
tools/build_motion.py      rig de recorte: divide cada pose em cabeça, tronco (braços+arma), coxa e canela e gera ciclos de 8 quadros
                           girando pescoço/quadril/joelho (corrida de garimpeiro/madeireiro/Barão, galope da onça, macaco com cauda),
                           mais asas da arara e cauda do peixe-boi
tools/build_cycles.py      recorta as folhas de animação desenhadas (tools/source_sheets/cycles/, geradas no Gemini) e SUBSTITUI
                           os ciclos do rig: corrida do garimpeiro/madeireiro, Barão andando e enfurecido, arremesso de bomba do
                           IbamaMan, arara/onça/macaco/peixe-boi. Grava cycles.json com a quantidade de quadros de cada folha
tools/build_icons.py       gera o ícone do app (todas as densidades + tools/icon_512.png p/ Play Store), a splash e a capa (title_cover)
tools/source_sheets/       as 8 folhas de arte originais
```

### Resolução (zoom 2)
- Toda a lógica (posições, física, câmera, UI) usa unidades de **800x450**. O canvas tem `800x450 × RENDER_ZOOM` (= 1600x900) e as câmeras da `GameScene` e da `UIScene` usam `setZoom(RENDER_ZOOM)`.
- **Faixa dos controles:** a câmera mostra o mundo a partir de `y = VIEW_LIFT` (72, em `constants.js`), então o chão aparece mais alto e sobra uma faixa de terra/água embaixo onde ficam o direcional e os botões. Camadas de fundo com `setScrollFactor(0)` usam `VIEW_OFF_Y - VIEW_LIFT`; conversões tela→mundo em Y somam `VIEW_LIFT`; limites "caiu fora do mapa" usam `GAME_H + VIEW_LIFT`.
- A câmera tem zoom centralizado: use `gameScene.viewLeft` / `setViewLeft(x)` em vez de `cam.scrollX`. Objetos com `setScrollFactor(0)` somam `VIEW_OFF_X/VIEW_OFF_Y`.
- Sprites reais são gerados em 2x (`res: 2` no manifest). Exiba com `setScale(ts(key))` e defina corpos com `setBodyLogical(obj, w, h, ox, oy)` em unidades lógicas (ambos em `src/config/assets.js`). Textos usam `resolution: RENDER_ZOOM`.
- Na `UIScene`, ponteiros vêm em pixels do canvas: divida por `RENDER_ZOOM`.

### Fluxo entre cenas
- `BootScene` → `TitleScene` (capa) → `GameScene`; a `GameScene` lança a `UIScene` por cima. Depois da Missão 4, FIRE volta à capa.
- **Controles:** a `UIScene` escreve em `registry.get('controls')` (`left/right/crouch/jump/fire/bomb` + bordas `jumpQueued`, `bombQueued`, `firePressed`). A `GameScene` lê e consome as bordas.
- **Controles touch:** metade esquerda = direcional *flutuante* (nasce sob o polegar; empurrar bem para cima também pula, para baixo agacha). Embaixo à direita, na faixa abaixo do chão = **três botões separados em linha** (`BUTTONS` em `src/config/controls.js`): **BOMBA**, **TIRO** (segurar) e **PULAR** (maior, no canto, mais perto do polegar). O toque vai para o botão mais próximo dentro de `BUTTON_ZONE` (sem ponto morto entre eles; o dedo pode deslizar de um para outro) e os botões ficam quase transparentes quando o IbamaMan passa por trás. **Tiro automático** (ligado por padrão no celular, `GameScene.autoTarget`): mira inimigos/gaiolas/tambores/chefe visíveis à altura da arma e atira quando estão à frente; vira o IbamaMan para o alvo se ele estiver parado. O botão "TIRO AUTO" no canto superior direito liga/desliga (salvo no aparelho). Qualquer toque novo serve como "continuar" nas telas de vitória/game over. A câmera mantém o jogador a `CAMERA_LEAD_X` px da esquerda e ele não encosta na borda (`SCREEN_LEFT_MARGIN`).
- **HUD:** a `UIScene` faz *polling* de `GameScene.getHudState()` a cada quadro (evita listeners órfãos ao reiniciar a cena).

### Paisagem / Android
- Trava em `android/app/src/main/AndroidManifest.xml` → `android:screenOrientation="sensorLandscape"`.
- `MainActivity.java` deixa a tela cheia imersiva e mantém a tela ligada.
- Ícone adaptativo usa `@mipmap/ic_launcher_background` (imagem) + `ic_launcher_foreground`; o tema de abertura (`styles.xml`) define `windowSplashScreenBackground` #16301A e o ícone animado para Android 12+.
- Se recriar a pasta `android/` (`npx cap add android`), **reaplique essas mudanças** e rode `python3 tools/build_icons.py`.

## Campanha (4 missões)

| # | Missão | Cenário | Inimigos | Chefe | Status |
|---|---|---|---|---|---|
| 1 | **Desmatamento** | floresta (bg_m1) com toras e um igarapé | madeireiros com motosserra, garimpeiros | **Barão do Garimpo** | **jogável** |
| 2 | **Garimpo Amador** | igapó destruído (bg_m2), muitos tambores de Hg | garimpeiros com mangueira | **Acampamento** (3 ondas) | **jogável** |
| 3 | **Garimpo com Dragas** | rio barrento com balsas e dragas | garimpeiros com mangueira | **Mega Draga** | **jogável** |
| 4 | **Chefão do Garimpo** | rio com floresta em chamas (bg_m4) | garimpeiros, madeireiros | **Balsa-Fortaleza → revanche do Barão** | **jogável** |

### Campanha e fluxo
- A `GameScene` recebe `{ mission, score, lives }` em `scene.restart(data)` e monta a fase de `LEVELS[mission]`.
- Vitória → "Toque em FIRE para a Missão N" (mantém pontos e vidas). Depois da Missão 4: "CAMPANHA CONCLUÍDA!" e volta à Missão 1 (se alguma missão estiver com `playable: false`, aparece "FIM DA DEMO"). Game over → repete a missão atual do zero.
- Para criar uma missão nova: adicione `LEVELS[id]` em `levels.js`, marque `playable: true` em `missions.js` e, se o chefe for novo, crie a classe com a mesma interface (`hp`, `maxHP`, `isTarget`, `defeated`, `enter()`, `takeDamage()`, `randomPoint()`, chamando `scene.onBossDefeated(this)`).

### Missão 1 — Desmatamento
- Floresta HD com parallax, um igarapé raso, plataformas, toras/sacos de areia, 3 gaiolas, caixa F logo no início (boa contra motosserra).
- **Madeireiro** (`Logger`): anda até o jogador, ergue a lâmina (aviso de 260 ms) e golpeia de perto.
- **Barão do Garimpo** (`Baron`, 700 HP): ciclo investida com a motosserra (pisca vermelho antes) → baldes de Hg → investida → chama madeireiros. Com 50% fica enfurecido (rosto vermelho), mais rápido e com mais reforços. Derrota: a motosserra explode, ele cai de joelhos — **"BARÃO AUTUADO!"** — e o cartão "A FLORESTA FICA DE PÉ".

### Missão 2 — Garimpo Amador
- Igapó destruído HD, trechos de igarapé raso, balsa móvel, 3 gaiolas (macaco, arara, peixe-boi), tambores de Hg em grupos (explodem em cadeia).
- **Acampamento do garimpo** (`Camp`): a câmera trava e vêm 3 ondas de garimpeiros (4, 5 e 6) pelos dois lados; a barra "GARIMPEIROS" mostra quantos faltam. Ao zerar, os tambores da arena explodem em sequência e o acampamento é desmontado.

### Movimento dos personagens
- **Ciclos desenhados (preferidos):** `tools/build_cycles.py` recorta as folhas do Gemini (um quadro por figura, fundo branco; figuras grudadas são divididas no vão mais estreito; a folha do Barão andando é dividida em 5 colunas), usa uma escala só por folha (pela figura de referência), alinha pelo chão da linha (preserva pulos) e pelo centro do tronco (pessoas) ou da caixa (animais). O manifest guarda o tamanho do quadro **em pixels**. A `BootScene` lê `cycles.json` para montar as animações com a quantidade certa de quadros. Prompt usado no Gemini: 8 quadros numa linha, virado para a direita, fundo branco liso, sem sombras/efeitos/texto.
- Fallback/legado: `tools/build_motion.py` cria os ciclos (`enemy_miner_walk`, `enemy_logger_walk`, `boss_baron_walk` 0–7 normal/8–15 enfurecido, antigo `animals_free`) com um rig de recorte: as articulações (pescoço, quadril, joelho, divisão das pernas) de cada personagem são frações da caixa do conteúdo, configuradas nas chamadas `human_rig`/`quad_rig` no fim do script. Se trocar a arte de um personagem, reajuste essas frações e anima com `miner-walk`, `logger-walk`, `baron-walk(-rage)`, `free-*` (BootScene).
- Inimigos alternam textura: passada = sheet `_walk`; poses (parado, golpe, dano, morte) = sheet original. Use `pose(n)` (para a animação e troca a textura), **nunca `setFrame`** depois de tocar uma passada.
- Cada inimigo tem um `Organic` (`this.org`): respira parado, inclina ao correr, `tilt()` para recuo/tranco e `kick()` para squash. Velocidade da passada (`anims.timeScale`) acompanha a velocidade de cada um e começa num quadro aleatório, para não andarem em sincronia. O garimpeiro hesita de vez em quando; todos recuam com tranco ao levar tiro.
- A cena chama `enemy.update(time, delta)` — o `delta` é obrigatório (sem ele a escala vira NaN e o inimigo some).
- Callbacks com atraso (`delayedCall`) em inimigos sempre checam `this.active` (o inimigo pode ter sido removido).

### Tela de vitória
- Ao fim de **cada** missão, depois das conquistas, o cartão do cenário dá lugar ao cartão **"POR QUE APOIAR A PEC 13/2022?"** com um argumento diferente por missão (`victory.pec`) e o botão "APOIAR A PEC 13/2022" (consulta pública do Senado, `src/config/links.js`). Os argumentos seguem o texto da PEC (instituição permanente na Constituição, autonomia técnica/financeira/orçamentária, dirigentes por critérios técnicos com mandato de 4 anos e aprovação do Senado, carreiras típicas de Estado); a justificação oficial não fala literalmente em extinção ou em nomeações de fora, por isso os textos tratam disso como consequência do texto.
- Cada missão tem em `levels.js` → `victory`: `title` (ex.: "VOCÊ SALVOU A FLORESTA!"), `lines` (conquistas mostradas uma a uma com ★) e o cartão (`key`, `caption`). A última conquista é sempre "Animais libertados: N" (contado em `scene.rescued`).

### Inimigos e bordas da fase
- Inimigos que entram pela borda nascem em `edgeX(side)`, sempre **sobre o chão** (`levelW` limita). Quem cair fora do mapa é removido e conta como baixa (`onEnemyKilled`), para nunca travar a contagem do acampamento.
- `Miner.die()`/`Logger.die()` chamam `scene.onEnemyKilled(this)`; chefes podem implementar `onEnemyKilled`.

### Missão 3 — Garimpo com Dragas
- Rio raso (o jogador vadeia), barrancos de lama, plataformas de madeira (one-way) e uma balsa móvel.
- Caixas de suprimentos H/R/F, 4 gaiolas (arara, onça, macaco, peixe-boi), tambores de Hg que explodem em cadeia (`HG_BARREL`), sacos de areia/toras de cenário, ondas de garimpeiros e apoio aéreo do helicóptero GEF.
- Em `BOSS_TRIGGER_X` a câmera trava (`BOSS_LOCK_X`) e entra a **Mega Draga**:
  - Dano de tiros/bombas, pisca branco (`setTintFill(0xffffff)` 80 ms), barra vermelha na `UIScene`.
  - Estado 1 (HP > 500): jatos de rejeito em parábola + baldes de mercúrio rolantes.
  - Estado 2 (HP ≤ 500): frame avariado + tinta avermelhada, cadência maior, fumaça/explosões contínuas.
  - Derrota: 8 explosões a cada 250 ms, limpa inimigos, banner "VOCÊ SALVOU O RIO!" com as conquistas, fanfarra sintetizada e cartão do rio restaurado (`bg_restored`).

### Missão 4 — Chefão do Garimpo
- Rio com floresta em chamas ao fundo (`bg_m4`, só o trecho do painel sem a draga pintada), balsas e plataformas, 4 gaiolas, madeireiros e garimpeiros misturados, apoio aéreo GEF.
- Chefe em **dois estágios**:
  1. **Balsa-Fortaleza** (`MegaDraga` com `FORTRESS`: 1300 HP, tinta de aço) com o Barão em pé no convés (sprite `rider`, só visual; fica com o rosto vermelho quando a fortaleza entra no estado 2).
  2. Ao afundar a fortaleza, o Barão salta na água (`startBaronStage`) e começa a **revanche** (`Baron` com `BARON_FINAL`: 520 HP), com a barra trocando para "BARÃO DO GARIMPO".
- Derrota do Barão: "BARÃO PRESO!", "CAMPANHA CONCLUÍDA!" e o cartão da PEC com o botão "APOIAR A PEC 13/2022", que abre a consulta pública oficial do Senado (e-Cidadania) — texto e URL em `src/config/links.js`. No PC, tecla P abre o link.

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

A arte vem das 8 folhas da *Curadoria de Sprites do IbamaMan*, guardadas em `tools/source_sheets/` (01_elenco_personagens … 08_cenario_missao_4_vitoria), e das artes em alta resolução de `tools/source_sheets/hero_v2/` (IbamaMan correndo, atirando parado, em pé, agachado e pulando; garimpeiro com jato, madeireiro, agente GEF, Barão do Garimpo, helicóptero GEF, Mega Draga e a folha de itens HD com gaiolas/animais, tambores, caixas H/R/F, kit médico, açaí, abacaxi e explosões), que têm prioridade sobre as folhas originais.
`tools/build_sheets.py` remove o fundo branco e o halo claro das bordas, recorta cada quadro em **2x** (`RES=2`), desenha o contorno escuro de 1px lógico (#141812, estilo arcade; não em explosões), alinha os pés na base (`origin(0.5, 1)`) e grava os spritesheets + `manifest.json` em `public/assets/sprites/`:

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
| `enemy_miner_hose` | 4 × **128×64** (parado, jato, jato, fuga) | 4 × 64×64 | hero_v2/inimigos_v2 (parado = quadro do jato sem a lama, gerado por build_motion) + Sheet 04 (fuga) |
| `enemy_logger` | 4 × **128×84** | 4 × 64×64 | hero_v2/inimigos_v2 (0–1) + Sheet 04 (2–3) |
| `enemy_miner_walk` | 7 × 128×64 | genérico | cycles/garimpeiro_corrida (build_cycles) |
| `enemy_logger_walk` | 8 × 128×84 | genérico | cycles/madeireiro_corrida |
| `boss_baron_walk` | 14 × 96×84 (0–4 andando, 5–13 enfurecido) | genérico | cycles/barao_andar + barao_furioso_corrida |
| `player_throw` | 5 × 96×64 (arremesso de bomba) | genérico | cycles/heroi_bomba |
| `animal_macaw` / `_jaguar` / `_monkey` / `_manatee` | 12 / 8 / 8 / 8 × 64×64 | genérico | cycles/arara_voo, onca_corrida, macaco_corrida, peixeboi_nado |
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
| `bg_m1`, `bg_m2`, `bg_restored` | cenários | genérico | hero_v2/cenarios_hd (floresta = Missão 1, igapó destruído com céu em névoa = Missão 2, rio restaurado ("O RIO VOLTOU A FICAR LIMPO") = cartão da vitória das Missões 2 e 3) |
| `bg_m4` | cenário | genérico | Sheet 08 (só a parte esquerda: floresta em chamas e rio, sem a draga pintada) |
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
- Antes de commitar: `npm run build` sem erros e uma partida de teste de cada missão jogável (chegar ao chefe, vencê-lo e passar para a próxima).
- Para depurar no navegador: `window.__IBAMAMAN__.scene.getScene('GameScene')`.
