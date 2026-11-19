import Phaser from 'phaser';
import { GAME_W, GAME_H, GROUND_Y, LEVEL_W, BOSS_LOCK_X, BOSS_TRIGGER_X, DEPTH, CAMERA_LEAD_X, SCREEN_LEFT_MARGIN, RENDER_ZOOM, VIEW_OFF_X, VIEW_OFF_Y } from '../config/constants.js';
import { WEAPONS, HG_BARREL } from '../config/weapons.js';
import { DEMO_MISSION } from '../config/missions.js';
import { FULL_BACKGROUND, ts, setBodyLogical } from '../config/assets.js';
import Player from '../objects/Player.js';
import Miner from '../objects/Miner.js';
import Cage from '../objects/Cage.js';
import MegaDraga from '../objects/MegaDraga.js';
import { Sfx } from '../audio/Sfx.js';
import Particles, { DEBRIS } from '../gfx/Particles.js';

// ----------------------------------------------------------------------------
// Fase demonstrativa: rio barrento do garimpo (Missão 3 — Garimpo com Dragas)
// ----------------------------------------------------------------------------
const LEVEL = {
  // trechos visuais do chão: 'mud' (barranco) ou 'water' (rio raso, o jogador vadeia)
  terrain: [
    ['mud', 0, 700], ['water', 700, 1000], ['mud', 1000, 1700], ['water', 1700, 2100],
    ['mud', 2100, 2800], ['water', 2800, 3000], ['mud', 3000, 3700], ['water', 3700, LEVEL_W]
  ],
  platforms: [[460, 320], [860, 300], [1300, 320], [1520, 250], [2300, 310], [2560, 250], [3150, 320]],
  raft: { x: 1820, y: 335, minX: 1760, maxX: 2060, speed: 60 },
  // caixas de suprimentos: frame de powerups_hrf (0=H, 1=R, 2=F)
  supplies: [[470, 280, 0], [1530, 210, 1], [2570, 210, 2], [3160, 280, 0]],
  cages: [[1120, GROUND_Y, 0], [1600, GROUND_Y, 1], [2420, GROUND_Y, 2], [2920, GROUND_Y, 3]],
  // tambores de Hg explosivos [x, cor 0=verde 1=azul] e cobertura decorativa
  barrels: [[600, 0], [1240, 1], [1270, 0], [2200, 1], [2460, 0], [3260, 1]],
  decor: [['prop_sandbags', 560], ['prop_logs', 1180], ['prop_sandbags', 2280], ['prop_logs', 3080]],
  miners: [[650, GROUND_Y], [1310, 300], [1480, GROUND_Y], [2350, GROUND_Y], [2570, 230], [3220, GROUND_Y]],
  waves: [
    { at: 350, n: 2, side: 'right' }, { at: 1050, n: 3, side: 'right' }, { at: 1650, n: 2, side: 'both' },
    { at: 2350, n: 3, side: 'right' }, { at: 2850, n: 4, side: 'both' }
  ],
  heliAt: 2150
};
const MAX_ALIVE = 9;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this.score = 0;
    this.banner = null;
    this.bossState = { visible: false, hp: 0, max: 1 };
    this.bossTriggered = false;
    this.ended = false;
    this.canRestart = false;
    this.showRestored = false;
    this.gameOverAt = 0;
    this.waveIndex = 0;
    this.heliDone = false;

    this.fx = new Particles(this);
    this.physics.world.setBounds(0, 0, LEVEL_W, GAME_H);
    this.physics.world.setBoundsCollision(true, true, true, false);
    const cam = this.cameras.main;
    cam.setZoom(RENDER_ZOOM);
    cam.setBounds(0, 0, LEVEL_W, GAME_H);
    this.setViewLeft(0);

    this.buildBackground();
    this.buildTerrain();
    this.createGroups();

    this.player = new Player(this, 160, GROUND_Y - 10);
    this.player.setCollideWorldBounds(true);

    this.populateLevel();
    this.createColliders();

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.showBanner(`MISSÃO ${DEMO_MISSION.id}: ${DEMO_MISSION.title}`, 2600, '#ffd23f', 'Liberte os animais e embargue a Mega Draga!');
  }

  // ---------------------------------------------------------------- cenário
  buildBackground() {
    this.bgSky = this.add.tileSprite(VIEW_OFF_X, VIEW_OFF_Y, GAME_W, GAME_H, 'bg_sky').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.bg);
    if (FULL_BACKGROUND) {
      const t = this.textures.get('bg_sky').getSourceImage();
      this.bgSky.setTileScale(GAME_H / t.height);
      this.bgTileScale = GAME_H / t.height;
      this.bgForest = null; this.bgRiver = null;
      return;
    }
    this.bgForest = this.add.tileSprite(VIEW_OFF_X, VIEW_OFF_Y + 150, GAME_W, 180, 'bg_forest').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.bg + 1);
    this.bgRiver = this.add.tileSprite(VIEW_OFF_X, VIEW_OFF_Y + 320, GAME_W, 90, 'bg_river').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.bg + 2);
  }

  buildTerrain() {
    this.waterStrips = [];
    LEVEL.terrain.forEach(([type, x0, x1]) => {
      if (type === 'mud') {
        this.add.tileSprite(x0, GROUND_Y, x1 - x0, GAME_H - GROUND_Y, 'ground_mud').setOrigin(0).setDepth(DEPTH.world).setTileScale(ts('ground_mud'));
      } else {
        this.add.tileSprite(x0, GROUND_Y, x1 - x0, GAME_H - GROUND_Y, 'water').setOrigin(0).setDepth(DEPTH.world).setTint(0x8a7a5a).setTileScale(ts('water'));
        // lâmina d'água na frente dos personagens (efeito de vadear)
        this.waterStrips.push(this.add.tileSprite(x0, GROUND_Y - 12, x1 - x0, 52, 'water').setOrigin(0).setDepth(DEPTH.water).setAlpha(0.88).setTileScale(ts('water')));
      }
    });
    // corpo físico contínuo do leito/barranco
    this.groundBody = this.add.zone(LEVEL_W / 2, GROUND_Y + 20, LEVEL_W, 40);
    this.physics.add.existing(this.groundBody, true);

    this.platforms = this.physics.add.staticGroup();
    LEVEL.platforms.forEach(([x, y]) => {
      const p = this.platforms.create(x, y, 'plat_wood').setDepth(DEPTH.world + 2).setScale(ts('plat_wood'));
      this.oneWay(p.body);
      p.refreshBody();
    });

    const r = LEVEL.raft;
    this.raft = this.physics.add.image(r.x, r.y, 'plat_raft').setDepth(DEPTH.world + 2).setScale(ts('plat_raft'));
    this.raft.body.setAllowGravity(false).setImmovable(true).setVelocityX(r.speed);
    // superfície da balsa: ~20% do topo do quadro (vale para placeholder e arte HD)
    setBodyLogical(this.raft, this.raft.displayWidth * 0.86, 12, this.raft.displayWidth * 0.07, this.raft.displayHeight * 0.2);
    this.oneWay(this.raft.body);
  }

  oneWay(body) {
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  createGroups() {
    this.playerShots = this.physics.add.group({ allowGravity: false });
    this.bombs = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.cages = this.physics.add.group({ allowGravity: false, immovable: true });
    this.enemyShots = this.physics.add.group();
    this.buckets = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.barrels = this.physics.add.group({ allowGravity: false, immovable: true });
  }

  populateLevel() {
    LEVEL.supplies.forEach(([x, y, f]) => this.spawnPickup(x, y, f, false));
    LEVEL.cages.forEach(([x, y, a]) => new Cage(this, x, y, a));
    LEVEL.miners.forEach(([x, y]) => new Miner(this, x, y - 2));
    LEVEL.decor.forEach(([key, x]) => this.add.image(x, GROUND_Y + 2, key).setOrigin(0.5, 1).setScale(ts(key)).setDepth(DEPTH.world + 1));
    LEVEL.barrels.forEach(([x, f]) => this.spawnBarrel(x, f));
  }

  createColliders() {
    const solids = [this.groundBody, this.platforms, this.raft];
    const P = this.physics;
    P.add.collider(this.player, solids);
    P.add.collider(this.enemies, solids);
    P.add.collider(this.pickups, solids);
    P.add.collider(this.buckets, this.groundBody);
    P.add.collider(this.bombs, solids, (a, b) => this.detonate(a.isShot ? a : b));
    P.add.overlap(this.playerShots, this.groundBody, (a, b) => {
      const s = a.isShot ? a : b;
      if (s.kind === 'rocket') this.detonate(s);
    });
    P.add.collider(this.enemyShots, solids, (a, b) => {
      const m = a.isMud ? a : b;
      this.spawnSplash(m.x, m.y);
      m.destroy();
    });

    const targets = [this.enemies, this.cages, this.buckets, this.barrels];
    P.add.overlap(this.playerShots, targets, (a, b) => this.onShotHit(a, b));
    P.add.overlap(this.bombs, targets, (a, b) => this.detonate(a.isShot ? a : b));

    P.add.overlap(this.player, this.enemyShots, (a, b) => {
      const m = a === this.player ? b : a;
      if (!m.active) return;
      if (!this.player.invulnerable) { this.player.hurt(); this.spawnSplash(m.x, m.y); m.destroy(); }
    });
    P.add.overlap(this.player, this.buckets, (a, b) => {
      const k = a === this.player ? b : a;
      if (!k.active || this.player.invulnerable) return;
      this.player.hurt();
      this.spawnExplosion(k.x, k.y, 0.6);
      k.destroy();
    });
    P.add.overlap(this.player, this.pickups, (a, b) => this.collect(a === this.player ? b : a));
  }

  // ---------------------------------------------------------------- loop
  update(time) {
    const c = this.registry.get('controls');
    if (!c) return;

    if (this.canRestart && c.firePressed) { c.firePressed = false; this.restartGame(); return; }
    c.firePressed = false;

    this.player.update(time, c);
    if (this.player.dead && !this.gameOverAt) {
      this.gameOverAt = time;
      this.showBanner('GAME OVER', 0, '#ff4d4d', '');
      this.time.delayedCall(1500, () => { this.canRestart = true; this.showBanner('GAME OVER', 0, '#ff4d4d', 'Toque em FIRE para tentar de novo'); });
    }

    this.updateCamera();
    this.enemies.getChildren().forEach((e) => e.update(time));
    this.updateRaft();
    this.cleanup(time);
    this.checkTriggers();

    this.waterStrips.forEach((w) => { w.tilePositionX += 0.35; });
  }

  updateCamera() {
    const left = this.viewLeft;
    if (!this.bossTriggered) {
      const target = Phaser.Math.Clamp(this.player.x - CAMERA_LEAD_X, 0, BOSS_LOCK_X);
      if (target > left) this.setViewLeft(Math.min(left + Math.max(2, (target - left) * 0.2), target));
    }
    // estilo arcade: não dá para voltar além da borda esquerda da tela
    const minX = this.viewLeft + (this.viewLeft > 0 ? SCREEN_LEFT_MARGIN : 16);
    if (this.player.x < minX && !this.player.dead) { this.player.x = minX; if (this.player.body.velocity.x < 0) this.player.setVelocityX(0); }

    const sx = this.viewLeft;
    if (FULL_BACKGROUND) { this.bgSky.tilePositionX = (sx * 0.3) / this.bgTileScale; return; }
    this.bgSky.tilePositionX = sx * 0.05;
    this.bgForest.tilePositionX = sx * 0.25;
    this.bgRiver.tilePositionX = sx * 0.5;
  }

  updateRaft() {
    const r = LEVEL.raft;
    if (this.raft.x >= r.maxX) this.raft.setVelocityX(-r.speed);
    else if (this.raft.x <= r.minX) this.raft.setVelocityX(r.speed);
  }

  cleanup(time) {
    const v = this.cameras.main.worldView;
    this.playerShots.getChildren().slice().forEach((s) => {
      if (s.dieAt && time >= s.dieAt) { s.destroy(); return; }
      if (s.kind === 'rocket' && Math.random() < 0.65) this.fx.puff(s.x - Math.sign(s.body.velocity.x) * 10, s.y, 0xe0e0e0, 0.8, 260);
      if (s.x < v.left - 60 || s.x > v.right + 60 || s.y < -60 || s.y > GAME_H + 60) s.destroy();
    });
    this.bombs.getChildren().slice().forEach((b) => { if (b.y > GAME_H + 60 || b.x > v.right + 200) b.destroy(); });
    this.enemyShots.getChildren().slice().forEach((m) => { if (m.y > GAME_H + 40 || m.x < v.left - 100) m.destroy(); });
    this.buckets.getChildren().slice().forEach((k) => { if (k.x < v.left - 60) k.destroy(); });
    this.enemies.getChildren().slice().forEach((e) => { if (e.isTarget && e.x < v.left - 220) e.destroy(); });
  }

  checkTriggers() {
    const sx = this.viewLeft;
    const w = LEVEL.waves[this.waveIndex];
    if (w && sx >= w.at) { this.waveIndex += 1; this.spawnWave(w); }
    if (!this.heliDone && sx >= LEVEL.heliAt) { this.heliDone = true; this.callHeli(); }
    if (!this.bossTriggered && this.player.x >= BOSS_TRIGGER_X) this.startBoss();
  }

  // ---------------------------------------------------------------- inimigos
  spawnWave(w) {
    for (let i = 0; i < w.n; i++) {
      this.time.delayedCall(i * 450, () => {
        if (this.ended || this.enemies.countActive(true) >= MAX_ALIVE) return;
        const v = this.cameras.main.worldView;
        const left = w.side === 'left' || (w.side === 'both' && i % 2 === 1);
        new Miner(this, left ? v.left - 20 : v.right + 20, GROUND_Y - 40);
      });
    }
  }

  spawnMud(x, y, vx, vy, scale = 1) {
    const m = this.enemyShots.create(x, y, 'proj_mud');
    m.isMud = true;
    m.setDepth(DEPTH.shots).setScale(scale * ts('proj_mud'));
    m.body.setVelocity(vx, vy).setAngularVelocity(Phaser.Math.Between(-300, 300));
    return m;
  }

  spawnSplash(x, y) {
    this.fx.debris(x, y, DEBRIS.mud, 3);
    for (let i = 0; i < 4; i++) {
      const d = this.add.image(x, y, 'proj_mud').setScale(0.45).setDepth(DEPTH.fx);
      this.tweens.add({ targets: d, x: x + Phaser.Math.Between(-24, 24), y: y - Phaser.Math.Between(8, 26), alpha: 0, duration: 300, onComplete: () => d.destroy() });
    }
  }

  spawnBucket(x, y, vx) {
    const b = this.buckets.create(x, y, 'hazard_hg_bucket');
    b.setDepth(DEPTH.enemies + 1).setBounce(0.25).setScale(ts('hazard_hg_bucket'));
    setBodyLogical(b, 20, 20, 2, 2);
    b.body.setVelocityX(vx).setAngularVelocity(vx * 2.6);
    b.hp = 10;
    b.isTarget = true;
    b.takeDamage = (d) => {
      if (!b.active) return;
      b.hp -= d;
      if (b.hp <= 0) { this.addScore(50, b.x, b.y - 20); this.spawnExplosion(b.x, b.y, 0.5); this.fx.debris(b.x, b.y, DEBRIS.metal, 6); this.fx.debris(b.x, b.y, DEBRIS.hg, 4); b.destroy(); }
    };
    return b;
  }

  // Tambor de mercúrio: alvo que explode ao ser destruído (reação em cadeia com tambores vizinhos)
  spawnBarrel(x, frame) {
    const b = this.barrels.create(x, GROUND_Y + 2, 'prop_hg_barrels', frame);
    b.setOrigin(0.5, 1).setScale(ts('prop_hg_barrels')).setDepth(DEPTH.world + 2);
    setBodyLogical(b, 26, 38, 3, 2);
    b.hp = HG_BARREL.hp;
    b.isTarget = true;
    b.takeDamage = (d) => {
      if (!b.isTarget) return;
      b.hp -= d;
      b.setTintFill(0xffffff);
      this.time.delayedCall(60, () => b.active && b.clearTint());
      if (b.hp > 0) return;
      b.isTarget = false;
      this.addScore(HG_BARREL.score, b.x, b.y - 50, 'TAMBOR DE Hg! +100');
      const { x: bx, y: by } = b; const h = b.displayHeight;
      b.destroy();
      this.fx.debris(bx, by - h / 2, DEBRIS.metal, 8);
      this.fx.debris(bx, by - h / 2, DEBRIS.hg, 6);
      this.time.delayedCall(90, () => this.explodeAt(bx, by - h / 2, HG_BARREL.radius, HG_BARREL.damage));
    };
    return b;
  }

  callHeli() {
    this.showBanner('APOIO AÉREO GEF!', 1800, '#7dff7d', '');
    const v = this.cameras.main.worldView;
    // helicóptero em coordenadas de tela (scrollFactor 0 + deslocamento do zoom)
    const heli = this.add.image(VIEW_OFF_X - 200, VIEW_OFF_Y + 95, 'ally_gef_heli').setDepth(DEPTH.fx).setScrollFactor(0).setScale(ts('ally_gef_heli'));
    const fire = this.time.addEvent({
      delay: 350, loop: true,
      callback: () => {
        const view = this.cameras.main.worldView;
        const foes = this.enemies.getChildren().filter((e) => e.isTarget && e.x > view.left && e.x < view.right);
        if (!foes.length) return;
        const e = Phaser.Utils.Array.GetRandom(foes);
        const hx = view.left + heli.x - VIEW_OFF_X; const hy = heli.y - VIEW_OFF_Y + 40;
        const g = this.add.graphics().setDepth(DEPTH.fx);
        g.lineStyle(2, 0x66ff66, 1).lineBetween(hx, hy, e.x, e.y - 30);
        this.time.delayedCall(70, () => g.destroy());
        Sfx.shoot('H');
        e.takeDamage(30);
      }
    });
    this.tweens.add({ targets: heli, x: VIEW_OFF_X + GAME_W + 220, duration: 5200, ease: 'Linear', onComplete: () => { fire.remove(false); heli.destroy(); } });
    this.tweens.add({ targets: heli, y: VIEW_OFF_Y + 105, duration: 600, yoyo: true, repeat: -1 });
  }

  // ---------------------------------------------------------------- chefe
  startBoss() {
    this.bossTriggered = true;
    const cam = this.cameras.main;
    this.tweens.add({ targets: cam, scrollX: BOSS_LOCK_X - VIEW_OFF_X, duration: 900, ease: 'Sine.easeInOut' });
    this.physics.world.setBounds(BOSS_LOCK_X + SCREEN_LEFT_MARGIN, 0, GAME_W - SCREEN_LEFT_MARGIN, GAME_H);
    Sfx.alarm();
    this.showBanner('ALERTA! MEGA DRAGA', 2200, '#ff4d4d', 'Garimpo ilegal no rio — destrua a draga!');

    this.boss = new MegaDraga(this, BOSS_LOCK_X + 640, GROUND_Y + 14);
    this.boss.x = BOSS_LOCK_X + GAME_W - this.boss.displayWidth / 2 + 10;
    this.bossState = { visible: true, hp: this.boss.hp, max: this.boss.maxHP };
    this.physics.add.overlap(this.playerShots, this.boss, (a, b) => this.onShotHit(a, b));
    this.physics.add.overlap(this.bombs, this.boss, (a, b) => this.detonate(a.isShot ? a : b));
    this.physics.add.overlap(this.player, this.boss, () => {
      if (this.boss.defeated || this.player.invulnerable) return;
      if (this.player.hurt()) this.player.setVelocityX(-260);
    });
    this.boss.enter();
  }

  onBossDefeated(boss) {
    this.ended = true;
    this.bossState.hp = 0;
    // limpa inimigos e projéteis hostis
    this.enemies.getChildren().slice().forEach((e) => e.isTarget && e.die());
    this.enemyShots.clear(true, true);
    this.buckets.getChildren().slice().forEach((k) => { this.spawnExplosion(k.x, k.y, 0.5, false, true); k.destroy(); });

    // 8 explosões sequenciais aleatórias a cada 250ms
    let n = 0;
    this.time.addEvent({
      delay: 250, repeat: 7,
      callback: () => {
        n += 1;
        const p = boss.randomPoint();
        this.spawnExplosion(p.x, p.y, Phaser.Math.FloatBetween(1.1, 1.8), true);
        this.fx.debris(p.x, p.y, DEBRIS.metal, 10);
        this.cameras.main.shake(180, 0.012);
        if (n === 8) this.finishMission(boss);
      }
    });
  }

  finishMission(boss) {
    this.tweens.add({ targets: boss, y: boss.y + 140, alpha: 0, angle: -6, duration: 1600, onComplete: () => { this.bossState.visible = false; boss.destroy(); } });
    this.addScore(10000, boss.x - 60, boss.y - 200, 'DRAGA DESTRUÍDA! +10000');
    this.player.celebrate();
    Sfx.victory();
    this.showBanner('ÁREA EMBARGADA!\nMISSION COMPLETE!', 0, '#ffd23f', '');
    this.time.delayedCall(1800, () => { this.showRestored = true; });
    this.time.delayedCall(4000, () => {
      this.canRestart = true;
      this.showBanner('ÁREA EMBARGADA!\nMISSION COMPLETE!', 0, '#ffd23f', 'Toque em FIRE para jogar de novo');
    });
  }

  // ---------------------------------------------------------------- dano / tiros
  onShotHit(a, b) {
    const shot = a.isShot ? a : b;
    const target = shot === a ? b : a;
    if (!shot.active || !target.active || !target.isTarget) return;
    if (shot.kind === 'flame') {
      if (shot.hitSet.has(target)) return; // atravessa inimigos, 1 acerto por alvo
      shot.hitSet.add(target);
      target.takeDamage(shot.damage);
      this.syncBoss(target);
      return;
    }
    if (shot.kind === 'rocket' || shot.kind === 'bomb') { this.detonate(shot); return; }
    target.takeDamage(shot.damage);
    this.syncBoss(target);
    this.spark(shot.x, shot.y);
    this.fx.sparks(shot.x, shot.y, target === this.boss ? 3 : 2);
    shot.destroy();
  }

  syncBoss(target) {
    if (this.boss && target === this.boss) this.bossState.hp = this.boss.hp;
  }

  detonate(proj) {
    // Phaser pode inverter a ordem (sprite, grupo) nos callbacks: só detona projéteis do jogador.
    if (!proj || !proj.isShot || !proj.active) return;
    const { x, y, radius, damage } = proj;
    proj.destroy();
    this.explodeAt(x, y, radius, damage);
  }

  explodeAt(x, y, radius, damage) {
    this.spawnExplosion(x, y, radius / 40, radius >= 80);
    this.cameras.main.shake(120, 0.006);
    const all = [...this.enemies.getChildren(), ...this.cages.getChildren(), ...this.buckets.getChildren(), ...this.barrels.getChildren()];
    if (this.boss) all.push(this.boss);
    all.forEach((t) => {
      if (!t.active || !t.isTarget) return;
      const r = t.getBounds();
      const nx = Phaser.Math.Clamp(x, r.left, r.right);
      const ny = Phaser.Math.Clamp(y, r.top, r.bottom);
      if (Phaser.Math.Distance.Between(x, y, nx, ny) <= radius) { t.takeDamage(damage); this.syncBoss(t); }
    });
  }

  spawnExplosion(x, y, scale = 1, big = false, quiet = false) {
    const e = this.add.sprite(x, y, 'fx_explosion', 0).setScale(scale * ts('fx_explosion')).setDepth(DEPTH.fx);
    e.play('fx-explosion');
    e.once('animationcomplete', () => e.destroy());
    if (!quiet) Sfx.explosion(big);
    return e;
  }

  spark(x, y) {
    const s = this.add.image(x, y, 'fx_muzzle').setDepth(DEPTH.fx).setScale(0.7 * ts('fx_muzzle'));
    this.time.delayedCall(40, () => s.destroy());
  }

  // ---------------------------------------------------------------- itens / pontuação
  spawnPickup(x, y, frame, pop = true) {
    const p = this.pickups.create(x, y, 'powerups_hrf', frame);
    p.kindFrame = frame;
    p.setDepth(DEPTH.world + 3).setBounce(0.3).setScale(ts('powerups_hrf'));
    setBodyLogical(p, 26, 28, 3, 3);
    if (pop) p.body.setVelocity(Phaser.Math.Between(-40, 40), -260);
    return p;
  }

  collect(p) {
    if (!p.active || this.player.dead) return;
    const f = p.kindFrame;
    const pl = this.player;
    let msg = '';
    if (f <= 2) { const id = ['H', 'R', 'F'][f]; pl.setWeapon(id); msg = WEAPONS[id].label + '!'; }
    if (f === 3) { pl.lives += 1; msg = '+1 VIDA'; }
    if (f === 4) { this.score += 1000; pl.bombs += 3; msg = 'AÇAÍ! +1000 +3 BOMBAS'; }
    if (f === 5) { this.score += 500; msg = 'ABACAXI! +500'; }
    Sfx.pickup();
    this.popup(p.x, p.y - 20, msg, '#9cff57');
    p.destroy();
  }

  addScore(n, x, y, text) {
    this.score += n;
    this.popup(x, y, text || `+${n}`, '#ffe14d');
  }

  popup(x, y, text, color) {
    const t = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 3, resolution: RENDER_ZOOM })
      .setOrigin(0.5).setDepth(DEPTH.fx + 5);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  showBanner(text, ms, color = '#ffd23f', sub = '') {
    this.banner = { text, sub, color, until: ms ? this.time.now + ms : Infinity };
  }

  // Borda esquerda visível do mundo (unidades lógicas), compensando o zoom centralizado da câmera.
  get viewLeft() { return this.cameras.main.scrollX + VIEW_OFF_X; }
  setViewLeft(x) { this.cameras.main.scrollX = x - VIEW_OFF_X; }

  // Estado lido pela UIScene a cada quadro (HUD por polling — sem eventos órfãos entre reinícios).
  getHudState() {
    const p = this.player;
    if (this.boss && this.boss.active) this.bossState.hp = this.boss.hp;
    const banner = this.banner && this.time.now < this.banner.until ? this.banner : null;
    return {
      score: this.score,
      weapon: WEAPONS[p.weapon].label,
      ammo: p.ammo < 0 ? '∞' : String(p.ammo),
      lives: p.lives,
      bombs: p.bombs,
      boss: this.bossState,
      restored: this.showRestored,
      banner
    };
  }

  restartGame() {
    this.scene.restart();
  }
}
