import Phaser from 'phaser';
import { DEPTH, GROUND_Y } from '../config/constants.js';
import { BARON } from '../config/enemies.js';
import { Sfx } from '../audio/Sfx.js';
import { ts, setBodyLogical } from '../config/assets.js';
import Organic from '../gfx/Organic.js';

// Chefe Barão do Garimpo (Missão 1). Ciclo: pausa → ataque (investida, baldes de Hg ou chama madeireiros).
// Abaixo de 50% de HP fica enfurecido (quadro 1, rosto vermelho): mais rápido e agressivo.
// Mesma interface da MegaDraga: hp/maxHP, isTarget, defeated, enter(), takeDamage(), randomPoint().
export default class Baron extends Phaser.Physics.Arcade.Sprite {
  // opts: { hp } — a revanche da Missão 4 usa outro HP
  constructor(scene, x, y, arena, opts = {}) {
    super(scene, x, y, 'boss_baron', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(DEPTH.enemies).setScale(ts('boss_baron') * BARON.scale);
    const w = this.displayWidth; const h = this.displayHeight;
    setBodyLogical(this, w * 0.34, h * 0.86, w * 0.33, h * 0.14);
    this.body.setMaxVelocityY(900);
    this.arena = arena; // { left, right } em coordenadas do mundo
    this.maxHP = opts.hp || BARON.hp;
    this.hp = this.maxHP;
    this.phase = 1;
    this.isTarget = false;
    this.defeated = false;
    this.state = 'enter';
    this.attackCount = 0;
    this.nextPuff = 0;
    this.org = new Organic(this, ts('boss_baron') * BARON.scale);
    this.org.vibrate = 0.008;
  }

  // pose parada (0 normal / 1 enfurecido) ou passada; a corrida da investida usa a passada acelerada
  pose() { if (!this.active) return; this.anims.stop(); this.setTexture('boss_baron', this.phase === 1 ? 0 : 1); }
  walk(fast) {
    if (!this.active) return;
    const key = this.phase === 1 ? 'baron-walk' : 'baron-walk-rage';
    if (this.anims.currentAnim?.key !== key || !this.anims.isPlaying) this.play(key, true);
    this.anims.timeScale = fast ? 2.1 : 1;
  }

  get p() { return this.phase === 1 ? 0 : 1; }
  get sawPoint() { return { x: this.x + (this.flipX ? -1 : 1) * this.displayWidth * 0.3, y: this.y - this.displayHeight * 0.45 }; }

  enter() {
    this.setVelocityX(-120);
    this.walk(false);
    this.home = this.arena.right - 110; // entra pela borda direita (o chão termina em arena.right)
    this.state = 'enter';
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.defeated || !this.active) return;
    const scene = this.scene;
    const player = scene.player;
    const moving = this.state === 'enter' || this.state === 'dash';
    this.org.vibrate = this.state === 'dash' ? 0.03 : this.state === 'telegraph' ? 0.045 : 0.008;
    this.org.update(time, delta, moving);

    if (time >= this.nextPuff) {
      this.nextPuff = time + (this.phase === 1 ? 260 : 150);
      const s = this.sawPoint;
      scene.fx.puff(s.x, s.y - 10, 0x777777, 0.7, 420);
    }

    if (this.state === 'enter') {
      this.setFlipX(true);
      if (this.x <= this.home) { this.setVelocityX(0); this.isTarget = true; this.org.kick(0.1); this.beginIdle(time); }
      return;
    }
    if (this.state === 'idle') {
      this.setFlipX(player.x < this.x);
      if (time >= this.nextAction) this.attack(time);
      return;
    }
    if (this.state === 'dash') {
      if (time % 3 < 1) scene.fx.sparks(this.sawPoint.x, this.sawPoint.y, 1);
      const hitWall = (this.body.velocity.x < 0 && this.x <= this.arena.left + 60) || (this.body.velocity.x > 0 && this.x >= this.arena.right - 60);
      if (hitWall) { this.setVelocityX(0); scene.cameras.main.shake(150, 0.008); this.org.kick(0.18); this.org.tilt((this.flipX ? 1 : -1) * 0.2); this.beginIdle(time); }
    }
  }

  beginIdle(time) {
    this.state = 'idle';
    this.pose();
    this.nextAction = time + BARON.idle[this.p];
  }

  attack(time) {
    this.attackCount += 1;
    const pattern = ['dash', 'bucket', 'dash', 'summon'];
    const kind = pattern[(this.attackCount - 1) % pattern.length];
    if (kind === 'dash') this.dash();
    else if (kind === 'bucket') this.throwBuckets(time);
    else this.summon(time);
  }

  dash() {
    this.state = 'telegraph';
    const dir = this.scene.player.x < this.x ? -1 : 1;
    this.setFlipX(dir < 0);
    this.pose();
    this.org.tilt(-dir * 0.14);   // recua o corpo antes de disparar (aviso)
    this.org.kick(-0.08);
    Sfx.alarm();
    this.scene.tweens.add({ targets: this, alpha: 0.55, duration: 80, yoyo: true, repeat: Math.round(BARON.telegraph[this.p] / 160) });
    this.setTint(0xff8080);
    this.scene.time.delayedCall(BARON.telegraph[this.p], () => {
      if (this.defeated) return;
      this.restoreTint();
      this.setAlpha(1);
      this.state = 'dash';
      this.walk(true);
      this.setVelocityX(dir * BARON.dashSpeed[this.p]);
    });
  }

  throwBuckets(time) {
    this.state = 'throw';
    const dir = this.scene.player.x < this.x ? -1 : 1;
    this.pose();
    const n = this.phase === 1 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 380, () => {
        if (this.defeated) return;
        this.org.tilt(dir * 0.16); this.org.kick(0.08); // arremesso: corpo acompanha o braço
        this.scene.spawnBucket(this.x + dir * 30, GROUND_Y - 40, dir * BARON.bucketSpeed[this.p]);
        Sfx.throwBomb();
      });
    }
    this.scene.time.delayedCall(n * 380 + 200, () => !this.defeated && this.beginIdle(this.scene.time.now));
  }

  summon(time) {
    this.state = 'summon';
    const scene = this.scene;
    this.pose();
    this.org.kick(-0.12); // estica o corpo gritando por reforços
    scene.showBanner('O BARÃO CHAMOU REFORÇOS!', 1200, '#ff9a4d', '');
    const alive = scene.enemies.countActive(true);
    const n = Math.max(0, Math.min(BARON.summon[this.p], BARON.maxMinions - alive));
    for (let i = 0; i < n; i++) scene.time.delayedCall(i * 400, () => !this.defeated && scene.spawnEnemy('logger', i % 2 ? 'left' : 'right'));
    scene.time.delayedCall(700, () => !this.defeated && this.beginIdle(scene.time.now));
  }

  takeDamage(dmg) {
    if (!this.isTarget || this.defeated) return;
    this.hp = Math.max(0, this.hp - dmg);
    Sfx.bossHit();
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.restoreTint());
    this.org.kick(0.04);
    if (this.phase === 1 && this.hp <= this.maxHP * BARON.enragedAt) this.enrage();
    if (this.hp <= 0) this.defeat();
  }

  restoreTint() { if (this.active) this.clearTint(); }

  enrage() {
    this.phase = 2;
    if (this.state === 'dash' || this.state === 'enter') this.walk(this.state === 'dash'); else this.pose();
    this.org.kick(0.15);
    this.scene.cameras.main.shake(300, 0.01);
    this.scene.showBanner('O BARÃO ENFURECEU!', 1400, '#ff4d4d', '');
    Sfx.alarm();
  }

  randomPoint() {
    const s = this.sawPoint;
    return { x: s.x + Phaser.Math.Between(-18, 18), y: s.y + Phaser.Math.Between(-14, 14) };
  }

  defeat() {
    this.defeated = true;
    this.isTarget = false;
    this.setVelocityX(0);
    this.anims.stop();
    this.setTexture('boss_baron', 0).setScale(ts('boss_baron') * BARON.scale).setRotation(0);
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    this.scene.onBossDefeated(this);
  }
}
