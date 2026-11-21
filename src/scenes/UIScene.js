import Phaser from 'phaser';
import { GAME_W, GAME_H, RENDER_ZOOM } from '../config/constants.js';
import { unlockAudio } from '../audio/Sfx.js';

// HUD + controles (touch multi-toque e teclado). Escreve o estado em registry 'controls';
// a GameScene lê esse objeto a cada quadro. Flags *Queued/*Pressed são "bordas" consumidas pela GameScene.
// Direcional FLUTUANTE: aparece onde o polegar toca na metade esquerda e some ao soltar,
// para não ficar desenhado por cima do IbamaMan.
import { STICK, BUTTONS, BUTTON_ZONE, BUTTON_ALPHA, AUTO_FIRE, AUTO_BTN } from '../config/controls.js';
import { PEC, openExternal } from '../config/links.js';

const TXT = { fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 4, resolution: RENDER_ZOOM };

export default class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  create() {
    // mesma escala da GameScene: tudo da UI é posicionado em 800x450 e desenhado em alta resolução
    this.cameras.main.setZoom(RENDER_ZOOM).centerOn(GAME_W / 2, GAME_H / 2);
    this.input.addPointer(2); // mouse/1º toque + 2 toques extras = multi-touch
    this.controls = {
      left: false, right: false, crouch: false, jump: false, fire: false, bomb: false,
      jumpQueued: false, bombQueued: false, firePressed: false, autoFire: false
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
    this.bossLabel = this.add.text(0, -14, 'MEGA DRAGA', { ...TXT, fontSize: '14px', color: '#ff4d4d' }).setOrigin(0.5);
    const bg = this.add.rectangle(0, 6, 304, 14, 0x000000).setStrokeStyle(2, 0xffffff);
    this.bossFill = this.add.rectangle(-150, 6, 300, 10, 0xd02020).setOrigin(0, 0.5);
    this.bossBar.add([bg, this.bossFill, this.bossLabel]);

    // cartão final: o rio restaurado depois do embargo
    this.restored = this.add.container(GAME_W / 2, 338).setVisible(false).setAlpha(0);
    this.restoredImg = this.add.image(0, 0, 'bg_restored');
    this.restoredFrame = this.add.rectangle(0, 0, 408, 120, 0x141812).setStrokeStyle(2, 0xffd23f);
    this.restoredCaption = this.add.text(0, 0, '', { ...TXT, fontSize: '13px', color: '#9cff57', strokeThickness: 3 }).setOrigin(0.5);
    this.restored.add([this.restoredFrame, this.restoredImg, this.restoredCaption]);

    // fim da campanha: convite para apoiar a PEC 13/2022 (abre a consulta pública do Senado)
    this.pec = this.add.container(GAME_W / 2, 336).setVisible(false).setAlpha(0);
    const pw = 480; const ph = 150;
    const pbg = this.add.rectangle(0, 0, pw, ph, 0x0e2412, 0.93).setStrokeStyle(2, 0x9cff57);
    const pt = this.add.text(0, -56, PEC.title, { ...TXT, fontSize: '16px', color: '#ffd23f' }).setOrigin(0.5);
    const pb = this.add.text(0, -20, PEC.body, { ...TXT, fontSize: '11px', color: '#ffffff', align: 'center', strokeThickness: 3, wordWrap: { width: pw - 30 } }).setOrigin(0.5);
    this.pecBody = pb;
    this.pecBtn = { x: GAME_W / 2, y: 336 + 34, w: 300, h: 30 };
    const btn = this.add.rectangle(0, 34, this.pecBtn.w, this.pecBtn.h, 0x2e8b3a).setStrokeStyle(2, 0xffffff);
    const bt = this.add.text(0, 34, PEC.button, { ...TXT, fontSize: '14px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5);
    const ph2 = this.add.text(0, 61, PEC.hint, { ...TXT, fontSize: '9px', color: '#bbbbbb', strokeThickness: 2 }).setOrigin(0.5);
    this.pec.add([pbg, pt, pb, btn, bt, ph2]);
    this.tweens.add({ targets: btn, scaleX: 1.04, scaleY: 1.08, duration: 600, yoyo: true, repeat: -1 });
    this.input.keyboard.on('keydown-P', () => { if (this.pec.visible) openExternal(PEC.url); });

    this.bannerText = this.add.text(GAME_W / 2, 170, '', { ...TXT, fontSize: '34px', color: '#ffd23f', align: 'center', strokeThickness: 6 }).setOrigin(0.5);
    this.bannerSub = this.add.text(GAME_W / 2, 228, '', { ...TXT, fontSize: '15px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

    const touch = this.sys.game.device.input.touch;
    this.add.text(GAME_W / 2, 444, touch ? '' : 'Setas/WASD mover • ↓/S agachar • Espaço pular • Z/J atirar • X/K bomba • tiro automático: botão no canto',
      { ...TXT, fontSize: '11px', color: '#dddddd', strokeThickness: 3 }).setOrigin(0.5, 1);
  }

  createTouchControls() {
    this.touchEnabled = this.sys.game.device.input.touch;
    this.stick = { pointerId: null, baseX: 0, baseY: 0, knobX: 0, knobY: 0, jumped: false };
    this.gestures = new Map(); // pointerId -> { x0, y0, t0, moved, fired, bombed }
    this.pad = this.add.graphics();
    this.fx = this.add.graphics();

    // tiro automático: ligado por padrão no celular; a escolha fica salva no aparelho
    let saved = null;
    try { saved = window.localStorage.getItem(AUTO_FIRE.storageKey); } catch (e) { /* sem storage */ }
    this.controls.autoFire = saved === null ? this.touchEnabled : saved === '1';

    const b = AUTO_BTN;
    this.autoBg = this.add.rectangle(b.x, b.y, b.w, b.h, 0x000000, 0.45).setStrokeStyle(2, 0x9cff57);
    this.autoTxt = this.add.text(b.x, b.y, '', { ...TXT, fontSize: '11px', color: '#9cff57', strokeThickness: 3 }).setOrigin(0.5);
    this.refreshAutoBtn();

    // botões de ação (desenhados em drawControls)
    this.btnGfx = this.add.graphics();
    this.btnTxt = {};
    BUTTONS.forEach((bt) => {
      this.btnTxt[bt.id] = this.add.text(bt.x, bt.y, bt.label, { ...TXT, fontSize: bt.id === 'jump' ? '14px' : '12px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5);
    });
    this.hint = this.add.text(0, 0, '').setVisible(false);
    if (!this.touchEnabled) { this.pad.setVisible(false); this.btnGfx.setVisible(false); Object.values(this.btnTxt).forEach((t) => t.setVisible(false)); }
  }

  refreshAutoBtn() {
    const on = this.controls.autoFire;
    this.autoTxt.setText(on ? 'TIRO AUTO: ON' : 'TIRO AUTO: OFF').setColor(on ? '#9cff57' : '#bbbbbb');
    this.autoBg.setStrokeStyle(2, on ? 0x9cff57 : 0x888888);
  }

  toggleAuto() {
    this.controls.autoFire = !this.controls.autoFire;
    try { window.localStorage.setItem(AUTO_FIRE.storageKey, this.controls.autoFire ? '1' : '0'); } catch (e) { /* ok */ }
    this.refreshAutoBtn();
  }

  onPecBtn(p) {
    const b = this.pecBtn;
    return this.pec.visible && Math.abs(p.x - b.x) < b.w / 2 + 8 && Math.abs(p.y - b.y) < b.h / 2 + 10;
  }

  onAutoBtn(p) {
    const b = AUTO_BTN;
    return Math.abs(p.x - b.x) < b.w / 2 + 6 && Math.abs(p.y - b.y) < b.h / 2 + 8;
  }

  // Lê os dedos: esquerda = direcional flutuante; direita = gestos (toque, segurar, arrastar ↑).
  readTouch(time) {
    const s = { left: false, right: false, crouch: false, fire: false, jumpTap: false, bombTap: false, fireTap: false, held: {} };
    const st = this.stick;
    const pointers = this.input.manager.pointers;
    const live = new Set();

    pointers.forEach((ptr) => {
      if (!ptr.isDown) return;
      live.add(ptr.id);
      const p = { id: ptr.id, x: ptr.x / RENDER_ZOOM, y: ptr.y / RENDER_ZOOM }; // canvas -> unidades lógicas

      if (p.id === st.pointerId) {
        const dx = p.x - st.baseX; const dy = p.y - st.baseY;
        const len = Math.hypot(dx, dy) || 1; const k = Math.min(1, STICK.radius / len);
        st.knobX = st.baseX + dx * k; st.knobY = st.baseY + dy * k;
        if (dx < -STICK.deadX) s.left = true;
        if (dx > STICK.deadX) s.right = true;
        if (dy > STICK.crouchY) s.crouch = true;
        if (dy < STICK.jumpY) { if (!st.jumped) { st.jumped = true; s.jumpTap = true; } } else if (dy > STICK.jumpY / 2) st.jumped = false;
        return;
      }

      let g = this.gestures.get(p.id);
      if (!g) {
        if (this.onAutoBtn(p)) { this.toggleAuto(); g = { ui: true }; this.gestures.set(p.id, g); return; }
        if (this.onPecBtn(p)) { openExternal(PEC.url); g = { ui: true }; this.gestures.set(p.id, g); return; }
        if (st.pointerId === null && p.x < GAME_W * STICK.zoneMaxX) {
          st.pointerId = p.id; st.baseX = p.x; st.baseY = p.y; st.knobX = p.x; st.knobY = p.y; st.jumped = false;
          s.fireTap = true;
          return;
        }
        g = { btn: null };
        this.gestures.set(p.id, g);
        s.fireTap = true; // qualquer toque novo serve para "continuar" nas telas de vitória/game over
      }
      if (g.ui) return;
      // botão mais próximo (o dedo pode deslizar de um botão para o outro)
      const b = this.nearestButton(p);
      if (b && b.id !== g.btn) {
        if (b.id === 'jump') s.jumpTap = true;
        if (b.id === 'bomb') s.bombTap = true;
      }
      g.btn = b ? b.id : null;
      if (g.btn === 'fire') s.fire = true;
      if (g.btn) s.held[g.btn] = true;
    });

    // dedos que saíram da tela
    if (st.pointerId !== null && !live.has(st.pointerId)) st.pointerId = null;
    this.gestures.forEach((g, id) => { if (!live.has(id)) this.gestures.delete(id); });
    return s;
  }

  nearestButton(p) {
    if (p.x < BUTTON_ZONE.minX || p.y < BUTTON_ZONE.minY) return null;
    let best = null; let bestD = Infinity;
    BUTTONS.forEach((b) => { const d = Math.hypot(p.x - b.x, p.y - b.y) - b.r; if (d < bestD) { best = b; bestD = d; } });
    return bestD <= BUTTON_ZONE.maxDist ? best : null;
  }

  // anel rápido onde o gesto foi reconhecido (retorno visual sem botão fixo)
  flash(x, y, color) {
    const r = this.add.circle(x, y, 14, color, 0).setStrokeStyle(3, color, 0.9);
    this.tweens.add({ targets: r, radius: 34, alpha: 0, duration: 260, onComplete: () => r.destroy() });
  }

  update(time) {
    const c = this.controls;
    const k = this.keys;
    const t = this.readTouch(time);

    if (t.jumpTap) c.jumpQueued = true;
    if (t.bombTap) c.bombQueued = true;
    if (t.fireTap) c.firePressed = true;

    c.left = t.left || k.LEFT.isDown || k.A.isDown;
    c.right = t.right || k.RIGHT.isDown || k.D.isDown;
    c.crouch = t.crouch || k.DOWN.isDown || k.S.isDown;
    c.jump = k.SPACE.isDown || k.UP.isDown || k.W.isDown;
    c.fire = t.fire || k.Z.isDown || k.J.isDown;
    c.bomb = k.X.isDown || k.K.isDown;

    this.held = t.held;
    this.drawControls(c);
    this.updateHud();
  }

  drawControls() {
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
    // botões: ficam bem mais apagados quando o IbamaMan passa por trás
    const gs = this.scene.get('GameScene');
    const pl = gs && gs.player;
    const px = pl && gs.sys.isActive() ? pl.x - gs.viewLeft : -999;
    const py = pl ? pl.y - 32 : -999;
    const bg = this.btnGfx; bg.clear();
    BUTTONS.forEach((b) => {
      const on = !!(this.held && this.held[b.id]);
      const behind = Math.abs(px - b.x) < b.r + 18 && Math.abs(py - b.y) < b.r + 34;
      const a = on ? BUTTON_ALPHA.pressed : behind ? BUTTON_ALPHA.behindPlayer : BUTTON_ALPHA.idle;
      const r = on ? b.r * 0.92 : b.r;
      bg.fillStyle(b.color, a).fillCircle(b.x, b.y, r);
      bg.lineStyle(3, 0xffffff, Math.min(1, a + 0.25)).strokeCircle(b.x, b.y, r);
      this.btnTxt[b.id].setAlpha(Math.min(1, a * 2.2));
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
    if (h.boss.name && this.bossLabel.text !== h.boss.name) this.bossLabel.setText(h.boss.name);
    if (h.boss.visible) this.bossFill.width = Math.max(0, 300 * (h.boss.hp / h.boss.max));

    if (h.restored && !this.restored.visible) {
      // cartão: recorte central de 400x110 do cenário da vitória
      const img = this.restoredImg.setTexture(h.restored.key);
      const src = this.textures.get(h.restored.key).getSourceImage();
      const s = 110 / src.height;
      const cw = Math.min(src.width, 400 / s);
      img.setCrop((src.width - cw) / 2, 0, cw, src.height).setScale(s).setX(-((src.width - cw) / 2 + cw / 2 - src.width / 2) * s);
      this.restoredFrame.setSize(cw * s + 8, 118).setOrigin(0.5);
      this.restoredCaption.setText(h.restored.caption).setY(70);
      this.restored.setVisible(true);
      this.tweens.add({ targets: this.restored, alpha: 1, y: 330, duration: 700 });
    } else if (!h.restored && this.restored.visible) {
      this.restored.setVisible(false).setAlpha(0).setY(338);
    }

    if (h.pec && !this.pec.visible) {
      this.hint.setVisible(false);
      this.pecBody.setText(typeof h.pec === 'string' ? h.pec : PEC.body);
      this.pec.setVisible(true);
      this.tweens.add({ targets: this.pec, alpha: 1, duration: 500 });
    } else if (!h.pec && this.pec.visible) {
      this.pec.setVisible(false).setAlpha(0);
    }

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
