import Phaser from 'phaser';
import { GAME_W, GAME_H, RENDER_ZOOM, VIEW_LIFT } from '../config/constants.js';
import { unlockAudio, Sfx, Music, setSfxEnabled } from '../audio/Sfx.js';
import { STICK, BUTTONS, BUTTON_ZONE, BUTTON_ALPHA, AUTO_FIRE, AUTO_BTN, PAUSE_BTN } from '../config/controls.js';
import { PEC, DISCLAIMER } from '../config/links.js';
import { Save } from '../systems/Save.js';
import { shareGame } from '../systems/Pec.js';
import { showPecInfo } from './PecScene.js';
import { TXT, makeButton, fmtTime, showThanks } from '../ui/widgets.js';

// HUD + controles (touch multi-toque e teclado) + telas por cima do jogo (pausa, resultado, game over).
// Escreve o estado em registry 'controls'; a GameScene lê esse objeto a cada quadro.
// Flags *Queued/*Pressed são "bordas" consumidas pela GameScene.
// Direcional FLUTUANTE à esquerda (aparece sob o polegar) e botões PULAR/TIRO/BOMBA na faixa de baixo.
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
    this.modal = null; // 'pause' | 'result' | 'lost' | null

    this.setupKeyboard();
    this.createHud();
    this.createTouchControls();
    this.createPauseMenu();
    this.createLostPanel();
    this.resultPanel = null;
    this.toast = null;

    this.input.on('pointerdown', () => unlockAudio());
    // voltou do site do Senado: agradece e convida a compartilhar
    const onPecReturn = () => this.showThanks();
    this.game.events.on('pec-return', onPecReturn);
    this.events.once('shutdown', () => this.game.events.off('pec-return', onPecReturn));
  }

  get gs() { return this.scene.get('GameScene'); }

  // a GameScene reiniciou (próxima missão / tentar de novo): fecha as telas por cima
  resetForMission() {
    this.modal = null;
    if (this.resultPanel) { this.resultPanel.destroy(); this.resultPanel = null; }
    if (this.toast && this.toast.active) this.toast.destroy();
    this.toast = null;
    this.lostPanel.setVisible(false);
    this.pauseMenu.setVisible(false);
    Object.assign(this.controls, { jumpQueued: false, bombQueued: false, firePressed: false });
  }

  setupKeyboard() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys('LEFT,RIGHT,DOWN,UP,A,D,S,W,SPACE,Z,J,X,K');
    const c = this.controls;
    const on = (names, fn) => names.forEach((n) => kb.on(`keydown-${n}`, (e) => { unlockAudio(); if (!e.repeat && !this.scene.isActive('PecScene')) fn(); }));
    on(['SPACE', 'UP', 'W'], () => { if (!this.modal) c.jumpQueued = true; });
    on(['X', 'K'], () => { if (!this.modal) c.bombQueued = true; });
    on(['Z', 'J', 'ENTER'], () => {
      if (this.modal === 'pause') { this.togglePause(); return; }
      c.firePressed = true;
    });
    on(['ESC', 'P'], () => {
      if (this.modal === 'result' || this.modal === 'lost') { showPecInfo(this); return; }
      this.togglePause();
    });
  }

  createHud() {
    this.scoreText = this.add.text(12, 8, '', { ...TXT, fontSize: '18px', color: '#ffe14d' });
    this.livesText = this.add.text(12, 32, '', { ...TXT, fontSize: '14px', color: '#ffffff' });
    this.animalsText = this.add.text(12, 52, '', { ...TXT, fontSize: '12px', color: '#9cff57', strokeThickness: 3 });
    this.comboText = this.add.text(12, 70, '', { ...TXT, fontSize: '16px', color: '#ff9f1a' }).setVisible(false);
    this.weaponText = this.add.text(GAME_W - 12, 8, '', { ...TXT, fontSize: '16px', color: '#9cff57' }).setOrigin(1, 0);
    this.ammoText = this.add.text(GAME_W - 12, 30, '', { ...TXT, fontSize: '14px', color: '#ffffff' }).setOrigin(1, 0);

    // barra do chefe
    this.bossBar = this.add.container(GAME_W / 2, 30).setVisible(false);
    this.bossLabel = this.add.text(0, -14, 'MEGA DRAGA', { ...TXT, fontSize: '14px', color: '#ff4d4d' }).setOrigin(0.5);
    const bg = this.add.rectangle(0, 6, 304, 14, 0x000000).setStrokeStyle(2, 0xffffff);
    this.bossFill = this.add.rectangle(-150, 6, 300, 10, 0xd02020).setOrigin(0, 0.5);
    this.bossBar.add([bg, this.bossFill, this.bossLabel]);

    // dica da primeira partida
    this.tipBox = this.add.container(GAME_W / 2, 92).setVisible(false);
    this.tipBg = this.add.rectangle(0, 0, 520, 28, 0x0e2412, 0.88).setStrokeStyle(2, 0x9cff57);
    this.tipText = this.add.text(0, 0, '', { ...TXT, fontSize: '13px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5);
    this.tipBox.add([this.tipBg, this.tipText]);

    this.bannerText = this.add.text(GAME_W / 2, 170, '', { ...TXT, fontSize: '34px', color: '#ffd23f', align: 'center', strokeThickness: 6 }).setOrigin(0.5);
    this.bannerSub = this.add.text(GAME_W / 2, 228, '', { ...TXT, fontSize: '15px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

    const touch = this.sys.game.device.input.touch;
    this.kbHelp = this.add.text(GAME_W / 2, 444, touch ? '' : 'Setas/WASD mover • ↓/S agachar • Espaço pular • Z/J atirar • X/K bomba • ESC pausa',
      { ...TXT, fontSize: '11px', color: '#dddddd', strokeThickness: 3 }).setOrigin(0.5, 1);
  }

  createTouchControls() {
    this.touchEnabled = this.sys.game.device.input.touch;
    this.stick = { pointerId: null, baseX: 0, baseY: 0, knobX: 0, knobY: 0, jumped: false };
    this.gestures = new Map(); // pointerId -> { btn } | { ui: true }
    this.pad = this.add.graphics();

    // tiro automático: ligado por padrão no celular; a escolha fica salva no aparelho
    let saved = null;
    try { saved = window.localStorage.getItem(AUTO_FIRE.storageKey); } catch (e) { /* sem storage */ }
    this.controls.autoFire = saved === null ? this.touchEnabled : saved === '1';

    const b = AUTO_BTN;
    this.autoBg = this.add.rectangle(b.x, b.y, b.w, b.h, 0x000000, 0.45).setStrokeStyle(2, 0x9cff57);
    this.autoTxt = this.add.text(b.x, b.y, '', { ...TXT, fontSize: '11px', color: '#9cff57', strokeThickness: 3 }).setOrigin(0.5);
    this.refreshAutoBtn();

    const q = PAUSE_BTN;
    this.pauseBg = this.add.rectangle(q.x, q.y, q.w, q.h, 0x000000, 0.45).setStrokeStyle(2, 0xffffff);
    this.add.text(q.x, q.y, 'II', { ...TXT, fontSize: '13px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5);

    // botões de ação (desenhados em drawControls)
    this.btnGfx = this.add.graphics();
    this.btnTxt = {};
    BUTTONS.forEach((bt) => {
      this.btnTxt[bt.id] = this.add.text(bt.x, bt.y, bt.label, { ...TXT, fontSize: bt.id === 'jump' ? '14px' : '12px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5);
    });
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

  hit(p, b, pad = 6) { return Math.abs(p.x - b.x) < b.w / 2 + pad && Math.abs(p.y - b.y) < b.h / 2 + pad + 2; }

  // ------------------------------------------------------------------ pausa
  createPauseMenu() {
    const m = this.add.container(0, 0).setVisible(false).setDepth(100);
    m.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x06100a, 0.86));
    m.add(this.add.text(GAME_W / 2, 58, 'PAUSA', { ...TXT, fontSize: '30px', color: '#ffd23f', strokeThickness: 6 }).setOrigin(0.5));
    const S = Save.get();
    m.add(makeButton(this, GAME_W / 2, 118, 260, 34, 'CONTINUAR ›', 0x2f74c0, () => this.togglePause(), { size: 15 }));
    m.add(makeButton(this, GAME_W / 2, 160, 260, 30, 'MAPA DE MISSÕES', 0x3a4a3a, () => { this.closePause(); this.gs.goToMap(); }));
    this.musicBtn = makeButton(this, GAME_W / 2 - 68, 200, 124, 28, '', 0x3a4a3a, () => {
      Save.set({ music: !Save.get().music }); Music.setEnabled(Save.get().music); this.refreshAudioBtns();
    }, { size: 11 });
    this.sfxBtn = makeButton(this, GAME_W / 2 + 68, 200, 124, 28, '', 0x3a4a3a, () => {
      Save.set({ sfx: !Save.get().sfx }); setSfxEnabled(Save.get().sfx); this.refreshAudioBtns();
    }, { size: 11 });
    m.add([this.musicBtn, this.sfxBtn]);
    m.add(this.add.text(GAME_W / 2, 262, PEC.status, { ...TXT, fontSize: '12px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5));
    m.add(makeButton(this, GAME_W / 2, 296, 320, 38, PEC.button, 0x2e8b3a, () => showPecInfo(this), { size: 15, pulse: true }));
    m.add(this.add.text(GAME_W / 2, 326, PEC.howTo, { ...TXT, fontSize: '9px', color: '#bbbbbb', strokeThickness: 2 }).setOrigin(0.5));
    m.add(this.add.text(GAME_W / 2, 436, DISCLAIMER, { ...TXT, fontSize: '9px', color: '#999999', strokeThickness: 2 }).setOrigin(0.5));
    this.pauseMenu = m;
    Music.setEnabled(S.music); setSfxEnabled(S.sfx);
    this.refreshAudioBtns();
  }

  refreshAudioBtns() {
    const S = Save.get();
    this.musicBtn.label.setText(`MÚSICA: ${S.music ? 'ON' : 'OFF'}`);
    this.sfxBtn.label.setText(`SONS: ${S.sfx ? 'ON' : 'OFF'}`);
  }

  togglePause() {
    if (this.modal === 'pause') { this.closePause(); return; }
    if (this.modal) return;
    const gs = this.gs;
    if (!gs || !gs.sys.isActive() || gs.ended || gs.player.dead) return;
    gs.pauseGame();
    this.modal = 'pause';
    this.pauseMenu.setVisible(true);
  }

  closePause() {
    if (this.modal !== 'pause') return;
    this.modal = null;
    this.pauseMenu.setVisible(false);
    const gs = this.gs;
    if (gs && gs.sys.isPaused()) gs.resumeGame();
  }

  // ------------------------------------------------------------------ game over
  createLostPanel() {
    const m = this.add.container(0, 0).setVisible(false).setDepth(90);
    m.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x140606, 0.82));
    m.add(this.add.text(GAME_W / 2, 92, 'GAME OVER', { ...TXT, fontSize: '40px', color: '#ff4d4d', strokeThickness: 7 }).setOrigin(0.5));
    m.add(this.add.text(GAME_W / 2, 136, 'O crime ambiental levou a melhor desta vez.', { ...TXT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5));
    this.lostInfo = this.add.text(GAME_W / 2, 160, '', { ...TXT, fontSize: '12px', color: '#9cff57', strokeThickness: 3 }).setOrigin(0.5);
    m.add(this.lostInfo);
    m.add(makeButton(this, GAME_W / 2 - 110, 212, 200, 40, 'TENTAR DE NOVO', 0x2f74c0, () => this.gs.restartGame(), { size: 15 }));
    m.add(makeButton(this, GAME_W / 2 + 110, 212, 200, 40, 'MAPA', 0x3a4a3a, () => this.gs.goToMap(), { size: 15 }));
    m.add(this.add.text(GAME_W / 2, 300, PEC.status, { ...TXT, fontSize: '12px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5));
    m.add(makeButton(this, GAME_W / 2, 336, 320, 36, PEC.button, 0x2e8b3a, () => showPecInfo(this), { size: 14, pulse: true }));
    this.lostPanel = m;
  }

  // ------------------------------------------------------------------ resultado da missão
  buildResult(r) {
    const m = this.add.container(0, 0).setDepth(90);
    const add = (o) => { m.add(o); return o; };
    add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x06100a, 0.88));
    add(this.add.text(GAME_W / 2, 30, r.title + (r.hard ? ' (DIFÍCIL)' : ''), { ...TXT, fontSize: '24px', color: '#ffd23f', strokeThickness: 5 }).setOrigin(0.5));

    // --- Auto de Infração (esquerda)
    const L = { x: 214, w: 380, top: 56, h: 232 };
    add(this.add.rectangle(L.x, L.top + L.h / 2, L.w, L.h, 0xf1e6c8, 0.97).setStrokeStyle(3, 0x8a6a2a));
    add(this.add.text(L.x, L.top + 14, `AUTO DE INFRAÇÃO • MISSÃO ${r.mission}`, { ...TXT, fontSize: '13px', color: '#7a1a10', stroke: '#f1e6c8', strokeThickness: 2 }).setOrigin(0.5));
    const S = r.stats;
    const rows = [['Infratores autuados', S.foes]];
    if (S.saws) rows.push(['Motosserras apreendidas', S.saws]);
    if (S.machines) rows.push(['Máquinas do garimpo destruídas', S.machines]);
    if (S.mercury) rows.push(['Tambores de mercúrio retirados', S.mercury]);
    rows.push(['Animais libertados', `${r.rescued}/${r.totalAnimals}`]);
    rows.push(['Pontos', `${r.score}${r.rec.newHigh ? '  RECORDE!' : ''}`]);
    const ink = { ...TXT, fontSize: '12px', color: '#1d1a12', stroke: '#f1e6c8', strokeThickness: 1 };
    rows.forEach(([k, v], i) => {
      const y = L.top + 38 + i * 19;
      const a = add(this.add.text(L.x - L.w / 2 + 16, y, k, ink).setAlpha(0));
      const b = add(this.add.text(L.x + L.w / 2 - 16, y, String(v), { ...ink, color: i === rows.length - 1 && r.rec.newHigh ? '#b01818' : '#1d1a12' }).setOrigin(1, 0).setAlpha(0));
      this.time.delayedCall(250 + i * 240, () => { a.setAlpha(1); b.setAlpha(1); Sfx.stamp(); });
    });
    // estrelas
    const labels = ['Todos os animais', 'Sem perder vida', `Em até ${fmtTime(r.par)}`];
    const starsAt = 250 + rows.length * 240 + 200;
    r.stars.forEach((on, i) => {
      const x = L.x - 120 + i * 120; const y = L.top + L.h - 46;
      const st = add(this.add.text(x, y, '★', { ...TXT, fontSize: '30px', color: '#9a8f78', stroke: '#5a4a2a', strokeThickness: 3 }).setOrigin(0.5));
      add(this.add.text(x, y + 26, labels[i], { ...ink, fontSize: '9px', color: on ? '#1d1a12' : '#8a7f68' }).setOrigin(0.5));
      if (!on) return;
      this.time.delayedCall(starsAt + i * 330, () => {
        st.setColor('#ffc81a').setScale(1.6);
        this.tweens.add({ targets: st, scale: 1, duration: 260, ease: 'Back.easeOut' });
        Sfx.star();
        if (r.rec.newStars[i]) {
          const n = add(this.add.text(x, y - 24, 'NOVA!', { ...TXT, fontSize: '9px', color: '#ffffff', strokeThickness: 2, backgroundColor: '#b01818', padding: { x: 2, y: 0 } }).setOrigin(0.5));
          this.tweens.add({ targets: n, y: y - 28, duration: 400, yoyo: true, repeat: -1 });
        }
      });
    });
    // carimbo
    const stamp = add(this.add.text(L.x + 110, L.top + 66, 'CUMPRIDA', { ...TXT, fontSize: '20px', color: '#c0281c', stroke: '#c0281c', strokeThickness: 1 })
      .setOrigin(0.5).setAngle(-14).setAlpha(0).setScale(2));
    this.time.delayedCall(starsAt + 1100, () => { this.tweens.add({ targets: stamp, alpha: 0.8, scale: 1, duration: 180 }); Sfx.stamp(); this.cameras.main.shake(90, 0.004); });

    // --- Você sabia? + por que apoiar (direita)
    const R = { x: 596, w: 360, top: 56, h: 232 };
    add(this.add.rectangle(R.x, R.top + R.h / 2, R.w, R.h, 0x0e2412, 0.95).setStrokeStyle(2, 0x9cff57));
    let y = R.top + 10;
    const block = (text, style) => { const t = add(this.add.text(R.x, y, text, { ...TXT, strokeThickness: 3, align: 'center', wordWrap: { width: R.w - 24 }, ...style }).setOrigin(0.5, 0)); y += t.height + 4; return t; };
    if (r.fact) {
      block('VOCÊ SABIA?', { fontSize: '13px', color: '#9cff57' });
      block(r.fact.text, { fontSize: '11px', color: '#ffffff' });
      block(`Fonte: ${r.fact.source}`, { fontSize: '9px', color: '#a0b0a0', strokeThickness: 2 });
      y += 4;
    }
    block('POR QUE APOIAR A PEC 13/2022?', { fontSize: '13px', color: '#ffd23f' });
    block(r.pec, { fontSize: '11px', color: '#ffffff' });
    block(PEC.status, { fontSize: '11px', color: '#ff9f1a' });

    // --- ações
    add(makeButton(this, 250, 324, 360, 46, PEC.button, 0x2e8b3a, () => showPecInfo(this), { size: 17, pulse: true }));
    add(this.add.text(250, 354, PEC.howTo, { ...TXT, fontSize: '9px', color: '#bbbbbb', strokeThickness: 2 }).setOrigin(0.5));
    add(makeButton(this, 526, 324, 160, 38, 'COMPARTILHAR', 0x2f74c0, () => shareGame(this, r), { size: 13 }));
    const cont = add(makeButton(this, 694, 324, 150, 38, r.next ? 'PRÓXIMA ›' : 'CONCLUIR ›', 0x3a4a3a, () => this.gs.restartGame(), { size: 13 }));
    cont.setEnabled(false);
    this.time.delayedCall(1800, () => cont.setEnabled(true));
    const foot = r.campaignDone
      ? 'CAMPANHA CONCLUÍDA! O MODO DIFÍCIL foi liberado no mapa de missões.'
      : `Próxima: Missão ${r.next}. Jogue de novo depois para pegar as 3 estrelas.`;
    add(this.add.text(GAME_W / 2, 392, foot, { ...TXT, fontSize: '11px', color: '#ffd23f', strokeThickness: 3 }).setOrigin(0.5));
    add(this.add.text(GAME_W / 2, 438, DISCLAIMER, { ...TXT, fontSize: '9px', color: '#888888', strokeThickness: 2 }).setOrigin(0.5));
    m.setAlpha(0);
    this.tweens.add({ targets: m, alpha: 1, duration: 400 });
    return m;
  }

  // voltou do site do Senado: agradecimento + convite para espalhar (é assim que a mensagem cresce)
  showThanks() {
    if (this.toast && this.toast.active) this.toast.destroy();
    const res = this.gs && this.gs.result;
    this.toast = showThanks(this, () => shareGame(this, res));
  }

  // ------------------------------------------------------------------ toques
  // Lê os dedos: esquerda = direcional flutuante; direita = botões PULAR/TIRO/BOMBA.
  readTouch() {
    const s = { left: false, right: false, crouch: false, fire: false, jumpTap: false, bombTap: false, fireTap: false, held: {} };
    const st = this.stick;
    const pointers = this.input.manager.pointers;
    const live = new Set();

    pointers.forEach((ptr) => {
      if (!ptr.isDown) return;
      live.add(ptr.id);
      const p = { id: ptr.id, x: ptr.x / RENDER_ZOOM, y: ptr.y / RENDER_ZOOM }; // canvas -> unidades lógicas
      if (this.modal) { if (!this.gestures.has(p.id)) this.gestures.set(p.id, { ui: true }); return; } // telas por cima usam os próprios botões

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
        if (this.hit(p, AUTO_BTN)) { this.toggleAuto(); g = { ui: true }; this.gestures.set(p.id, g); return; }
        if (this.hit(p, PAUSE_BTN, 10)) { this.togglePause(); g = { ui: true }; this.gestures.set(p.id, g); return; }
        if (st.pointerId === null && p.x < GAME_W * STICK.zoneMaxX) {
          st.pointerId = p.id; st.baseX = p.x; st.baseY = p.y; st.knobX = p.x; st.knobY = p.y; st.jumped = false;
          return;
        }
        g = { btn: null };
        this.gestures.set(p.id, g);
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
    if (st.pointerId !== null && (!live.has(st.pointerId) || this.modal)) st.pointerId = null;
    this.gestures.forEach((g, id) => { if (!live.has(id)) this.gestures.delete(id); });
    return s;
  }

  nearestButton(p) {
    if (p.x < BUTTON_ZONE.minX || p.y < BUTTON_ZONE.minY) return null;
    let best = null; let bestD = Infinity;
    BUTTONS.forEach((b) => { const d = Math.hypot(p.x - b.x, p.y - b.y) - b.r; if (d < bestD) { best = b; bestD = d; } });
    return bestD <= BUTTON_ZONE.maxDist ? best : null;
  }

  update() {
    const c = this.controls;
    const k = this.keys;
    const t = this.readTouch();

    if (t.jumpTap) c.jumpQueued = true;
    if (t.bombTap) c.bombQueued = true;

    const free = !this.modal;
    c.left = free && (t.left || k.LEFT.isDown || k.A.isDown);
    c.right = free && (t.right || k.RIGHT.isDown || k.D.isDown);
    c.crouch = free && (t.crouch || k.DOWN.isDown || k.S.isDown);
    c.jump = free && (k.SPACE.isDown || k.UP.isDown || k.W.isDown);
    c.fire = free && (t.fire || k.Z.isDown || k.J.isDown);
    c.bomb = free && (k.X.isDown || k.K.isDown);

    this.held = t.held;
    this.drawControls();
    this.updateHud();
  }

  drawControls() {
    const hide = !!this.modal;
    this.kbHelp.setVisible(!hide);
    this.pad.setVisible(this.touchEnabled && !hide);
    this.btnGfx.setVisible(this.touchEnabled && !hide);
    Object.values(this.btnTxt).forEach((tx) => tx.setVisible(this.touchEnabled && !hide));
    if (!this.touchEnabled || hide) return;
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
    const gs = this.gs;
    const pl = gs && gs.player;
    const px = pl && gs.sys.isActive() ? pl.x - gs.viewLeft : -999;
    const py = pl ? pl.y - VIEW_LIFT - 32 : -999;
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
    const gs = this.gs;
    if (!gs || !gs.player || !(gs.sys.isActive() || gs.sys.isPaused())) return;
    const h = gs.getHudState();
    this.scoreText.setText(`SCORE ${String(h.score).padStart(7, '0')}`);
    this.livesText.setText(`VIDAS x${h.lives}   BOMBAS x${h.bombs}`);
    this.animalsText.setText(`ANIMAIS ${h.rescued}/${h.totalAnimals}`);
    if (h.combo) {
      if (this.comboText.text !== `COMBO x${h.combo}`) { this.comboText.setText(`COMBO x${h.combo}`).setScale(1.4); this.tweens.add({ targets: this.comboText, scale: 1, duration: 200 }); }
      this.comboText.setVisible(true);
    } else this.comboText.setVisible(false);
    this.weaponText.setText(`ARMA: ${h.weapon}`);
    this.ammoText.setText(`MUNIÇÃO: ${h.ammo}`);

    this.bossBar.setVisible(!!h.boss.visible && !this.modal);
    if (h.boss.name && this.bossLabel.text !== h.boss.name) this.bossLabel.setText(h.boss.name);
    if (h.boss.visible) this.bossFill.width = Math.max(0, 300 * (h.boss.hp / h.boss.max));

    if (h.tip && !this.modal) {
      if (this.tipText.text !== h.tip) { this.tipText.setText(h.tip); this.tipBg.width = this.tipText.width + 28; }
      this.tipBox.setVisible(true);
    } else this.tipBox.setVisible(false);

    if (h.result && !this.resultPanel) {
      this.modal = 'result';
      this.resultPanel = this.buildResult(h.result);
    }
    if (h.lost && this.modal !== 'lost') {
      this.modal = 'lost';
      this.lostInfo.setText(`Animais libertados: ${h.rescued}/${h.totalAnimals}   Pontos: ${h.score}`);
      this.lostPanel.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.lostPanel, alpha: 1, duration: 300 });
    }

    if (h.banner && !this.modal) {
      this.bannerText.setText(h.banner.text).setColor(h.banner.color).setVisible(true);
      this.bannerSub.setText(h.banner.sub || '').setVisible(true);
      this.bannerSub.setY(h.banner.text.includes('\n') ? 250 : 215);
    } else {
      this.bannerText.setVisible(false);
      this.bannerSub.setVisible(false);
    }
  }
}
