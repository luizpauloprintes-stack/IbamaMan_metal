import Phaser from 'phaser';
import { GAME_W } from '../config/constants.js';
import { unlockAudio } from '../audio/Sfx.js';

// HUD + controles (touch multi-toque e teclado). Escreve o estado em registry 'controls';
// a GameScene lê esse objeto a cada quadro. Flags *Queued/*Pressed são "bordas" consumidas pela GameScene.
// Direcional FLUTUANTE: aparece onde o polegar toca na metade esquerda e some ao soltar,
// para não ficar desenhado por cima do IbamaMan.
import { STICK, BUTTONS, CONTROL_ALPHA } from '../config/controls.js';

const TXT = { fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 };

export default class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  create() {
    this.input.addPointer(2); // mouse/1º toque + 2 toques extras = multi-touch
    this.controls = {
      left: false, right: false, crouch: false, jump: false, fire: false, bomb: false,
      jumpQueued: false, bombQueued: false, firePressed: false
    };
    this.registry.set('controls', this.controls);
    this.prevTouch = { jump: false, fire: false, bomb: false };

    this.setupKeyboard();
    this.createHud();
    this.createTouchControls();

    this.input.on('pointerdown', () => unlockAudio());
  }

  setupKeyboard() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys('LEFT,RIGHT,DOWN,UP,A,D,S,W,SPACE,Z,J,X,K');
    const c = this.controls;
    const on = (names, fn) => names.forEach((n) => kb.on(`keydown-${n}`, (e) => { unlockAudio(); if (!e.repeat) fn(); }));
    on(['SPACE', 'UP', 'W'], () => { c.jumpQueued = true; });
    on(['X', 'K'], () => { c.bombQueued = true; });
    on(['Z', 'J'], () => { c.firePressed = true; });
  }

  createHud() {
    this.scoreText = this.add.text(12, 8, '', { ...TXT, fontSize: '18px', color: '#ffe14d' });
    this.livesText = this.add.text(12, 32, '', { ...TXT, fontSize: '14px', color: '#ffffff' });
    this.weaponText = this.add.text(GAME_W - 12, 8, '', { ...TXT, fontSize: '16px', color: '#9cff57' }).setOrigin(1, 0);
    this.ammoText = this.add.text(GAME_W - 12, 30, '', { ...TXT, fontSize: '14px', color: '#ffffff' }).setOrigin(1, 0);

    // barra do chefe
    this.bossBar = this.add.container(GAME_W / 2, 30).setVisible(false);
    const label = this.add.text(0, -14, 'MEGA DRAGA', { ...TXT, fontSize: '14px', color: '#ff4d4d' }).setOrigin(0.5);
    const bg = this.add.rectangle(0, 6, 304, 14, 0x000000).setStrokeStyle(2, 0xffffff);
    this.bossFill = this.add.rectangle(-150, 6, 300, 10, 0xd02020).setOrigin(0, 0.5);
    this.bossBar.add([bg, this.bossFill, label]);

    this.bannerText = this.add.text(GAME_W / 2, 170, '', { ...TXT, fontSize: '34px', color: '#ffd23f', align: 'center', strokeThickness: 6 }).setOrigin(0.5);
    this.bannerSub = this.add.text(GAME_W / 2, 228, '', { ...TXT, fontSize: '15px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

    const touch = this.sys.game.device.input.touch;
    this.add.text(GAME_W / 2, 444, touch ? '' : 'Setas/WASD mover • ↓/S agachar • Espaço pular • Z/J atirar • X/K bomba',
      { ...TXT, fontSize: '11px', color: '#dddddd', strokeThickness: 3 }).setOrigin(0.5, 1);
  }

  createTouchControls() {
    this.touchEnabled = this.sys.game.device.input.touch;
    this.stick = { pointerId: null, baseX: 0, baseY: 0, knobX: 0, knobY: 0 };
    this.pad = this.add.graphics();
    this.btnGfx = {};
    BUTTONS.forEach((b) => {
      const g = this.add.graphics();
      const t = this.add.text(b.x, b.y, b.label, { ...TXT, fontSize: b.id === 'fire' ? '14px' : '11px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5);
      this.btnGfx[b.id] = { g, t, b };
    });
    if (!this.touchEnabled) { this.pad.setVisible(false); Object.values(this.btnGfx).forEach(({ g, t }) => { g.setVisible(false); t.setVisible(false); }); }
  }

  readTouch() {
    const s = { left: false, right: false, crouch: false, jump: false, fire: false, bomb: false };
    const st = this.stick;
    const pointers = this.input.manager.pointers;

    // solta o direcional se o dedo dele saiu da tela
    if (st.pointerId !== null && !pointers.some((p) => p.id === st.pointerId && p.isDown)) st.pointerId = null;

    pointers.forEach((p) => {
      if (!p.isDown) return;
      if (p.id === st.pointerId) {
        const dx = p.x - st.baseX; const dy = p.y - st.baseY;
        const len = Math.hypot(dx, dy) || 1; const k = Math.min(1, STICK.radius / len);
        st.knobX = st.baseX + dx * k; st.knobY = st.baseY + dy * k;
        if (dx < -STICK.deadX) s.left = true;
        if (dx > STICK.deadX) s.right = true;
        if (dy > STICK.crouchY) s.crouch = true;
        return;
      }
      if (st.pointerId === null && p.x < GAME_W * STICK.zoneMaxX) {
        st.pointerId = p.id; st.baseX = p.x; st.baseY = p.y; st.knobX = p.x; st.knobY = p.y;
        return;
      }
      if (p.x >= GAME_W * STICK.zoneMaxX) {
        let best = null; let bestD = Infinity;
        BUTTONS.forEach((b) => { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < b.r * CONTROL_ALPHA.hitScale && d < bestD) { best = b; bestD = d; } });
        if (best) s[best.id] = true;
      }
    });
    return s;
  }

  update() {
    const c = this.controls;
    const k = this.keys;
    const t = this.readTouch();

    // bordas (toque recém-iniciado)
    if (t.jump && !this.prevTouch.jump) c.jumpQueued = true;
    if (t.bomb && !this.prevTouch.bomb) c.bombQueued = true;
    if (t.fire && !this.prevTouch.fire) c.firePressed = true;
    this.prevTouch = { jump: t.jump, fire: t.fire, bomb: t.bomb };

    c.left = t.left || k.LEFT.isDown || k.A.isDown;
    c.right = t.right || k.RIGHT.isDown || k.D.isDown;
    c.crouch = t.crouch || k.DOWN.isDown || k.S.isDown;
    c.jump = t.jump || k.SPACE.isDown || k.UP.isDown || k.W.isDown;
    c.fire = t.fire || k.Z.isDown || k.J.isDown;
    c.bomb = t.bomb || k.X.isDown || k.K.isDown;

    this.drawControls(c);
    this.updateHud();
  }

  drawControls(c) {
    if (!this.touchEnabled) return;
    const g = this.pad; const st = this.stick;
    g.clear();
    if (st.pointerId !== null) {
      g.fillStyle(0x000000, 0.18).fillCircle(st.baseX, st.baseY, STICK.radius);
      g.lineStyle(2, 0xffffff, 0.3).strokeCircle(st.baseX, st.baseY, STICK.radius);
      g.fillStyle(0xffffff, 0.45).fillCircle(st.knobX, st.knobY, STICK.knob);
    } else {
      const h = STICK.hint;
      g.lineStyle(2, 0xffffff, 0.14).strokeCircle(h.x, h.y, h.r);
      g.fillStyle(0xffffff, 0.14).fillCircle(h.x, h.y, 8);
    }

    // posição do IbamaMan na tela, para apagar o botão que estiver por cima dele
    const gs = this.scene.get('GameScene');
    const pl = gs && gs.player;
    const cam = gs && gs.cameras && gs.cameras.main;
    const px = pl && cam ? pl.x - cam.scrollX : -999;
    const py = pl ? pl.y - 32 : -999;

    Object.values(this.btnGfx).forEach(({ g: bg, t, b }) => {
      const on = c[b.id];
      const behind = Math.abs(px - b.x) < b.r + 20 && Math.abs(py - b.y) < b.r + 34;
      const alpha = behind && !on ? CONTROL_ALPHA.behindPlayer : on ? CONTROL_ALPHA.pressed : CONTROL_ALPHA.idle;
      const r = on ? b.r * 0.92 : b.r;
      bg.clear();
      bg.fillStyle(b.color, alpha).fillCircle(b.x, b.y, r);
      bg.lineStyle(2, 0xffffff, Math.min(1, alpha + 0.15)).strokeCircle(b.x, b.y, r);
      t.setAlpha(Math.min(1, alpha * 2.4));
    });
  }

  updateHud() {
    const gs = this.scene.get('GameScene');
    if (!gs || !gs.player || !gs.sys.isActive()) return;
    const h = gs.getHudState();
    this.scoreText.setText(`SCORE ${String(h.score).padStart(7, '0')}`);
    this.livesText.setText(`VIDAS x${h.lives}   BOMBAS x${h.bombs}`);
    this.weaponText.setText(`ARMA: ${h.weapon}`);
    this.ammoText.setText(`MUNIÇÃO: ${h.ammo}`);

    this.bossBar.setVisible(!!h.boss.visible);
    if (h.boss.visible) this.bossFill.width = Math.max(0, 300 * (h.boss.hp / h.boss.max));

    if (h.banner) {
      this.bannerText.setText(h.banner.text).setColor(h.banner.color).setVisible(true);
      this.bannerSub.setText(h.banner.sub || '').setVisible(true);
      this.bannerSub.setY(h.banner.text.includes('\n') ? 250 : 215);
    } else {
      this.bannerText.setVisible(false);
      this.bannerSub.setVisible(false);
    }
  }
}
