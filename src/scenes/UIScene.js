import Phaser from 'phaser';
import { GAME_W } from '../config/constants.js';
import { unlockAudio } from '../audio/Sfx.js';

// HUD + controles (touch multi-toque e teclado). Escreve o estado em registry 'controls';
// a GameScene lê esse objeto a cada quadro. Flags *Queued/*Pressed são "bordas" consumidas pela GameScene.
const DPAD = { x: 112, y: 372, r: 72 };
const BUTTONS = [
  { id: 'jump', label: 'JUMP', x: 610, y: 398, r: 44, color: 0x2f74c0 },
  { id: 'fire', label: 'FIRE', x: 718, y: 366, r: 50, color: 0xc0392b },
  { id: 'bomb', label: 'BOMB', x: 742, y: 262, r: 36, color: 0xe67e22 }
];
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
    this.pad = this.add.graphics();
    this.btnGfx = {};
    BUTTONS.forEach((b) => {
      const g = this.add.graphics();
      const t = this.add.text(b.x, b.y, b.label, { ...TXT, fontSize: b.id === 'fire' ? '18px' : '15px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5);
      this.btnGfx[b.id] = { g, t, b };
    });
  }

  readTouch() {
    const s = { left: false, right: false, crouch: false, jump: false, fire: false, bomb: false };
    this.input.manager.pointers.forEach((p) => {
      if (!p.isDown) return;
      const dx = p.x - DPAD.x; const dy = p.y - DPAD.y;
      if (p.x < GAME_W * 0.45 && p.y > 200 && Math.hypot(dx, dy) < DPAD.r * 1.8) {
        if (dx < -18) s.left = true;
        if (dx > 18) s.right = true;
        if (dy > 26) s.crouch = true;
        return;
      }
      if (p.x > GAME_W * 0.55) {
        let best = null; let bestD = Infinity;
        BUTTONS.forEach((b) => { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < b.r * 1.45 && d < bestD) { best = b; bestD = d; } });
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
    const g = this.pad;
    g.clear();
    g.fillStyle(0x000000, 0.28).fillCircle(DPAD.x, DPAD.y, DPAD.r);
    g.lineStyle(2, 0xffffff, 0.35).strokeCircle(DPAD.x, DPAD.y, DPAD.r);
    const arrow = (on, pts) => { g.fillStyle(0xffffff, on ? 0.9 : 0.4); g.fillTriangle(...pts); };
    const { x, y } = DPAD;
    arrow(c.left, [x - 60, y, x - 30, y - 20, x - 30, y + 20]);
    arrow(c.right, [x + 60, y, x + 30, y - 20, x + 30, y + 20]);
    arrow(c.crouch, [x, y + 60, x - 20, y + 30, x + 20, y + 30]);

    Object.values(this.btnGfx).forEach(({ g: bg, t, b }) => {
      const on = c[b.id];
      bg.clear();
      bg.fillStyle(b.color, on ? 0.85 : 0.42).fillCircle(b.x, b.y, on ? b.r * 0.94 : b.r);
      bg.lineStyle(3, 0xffffff, on ? 0.95 : 0.5).strokeCircle(b.x, b.y, on ? b.r * 0.94 : b.r);
      t.setAlpha(on ? 1 : 0.8);
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
