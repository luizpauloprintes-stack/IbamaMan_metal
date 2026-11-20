import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';
import { LOGGER, ORGANIC } from '../config/enemies.js';
import { Sfx } from '../audio/Sfx.js';
import { ts, setBodyLogical } from '../config/assets.js';
import Organic from '../gfx/Organic.js';

// Madeireiro com motosserra: avança com passada animada (motor tremendo), ergue a lâmina com
// recuo do corpo (aviso) e golpeia de perto. Ao levar tiro, recua com um tranco.
// Quadros de enemy_logger: 0 motosserra ligada, 1 lâmina erguida, 2 atingido, 3 derrotado.
// Passada: enemy_logger_walk (6 quadros).
export default class Logger extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_logger', 0);
    scene.add.existing(this);
    scene.enemies.add(this); // grupo antes do corpo (o grupo aplica defaults)
    this.base = ts('enemy_logger');
    this.setOrigin(0.5, 1).setDepth(DEPTH.enemies).setFlipX(true).setScale(this.base);
    setBodyLogical(this, 28, 58, (this.displayWidth - 28) / 2, this.displayHeight - 58);
    this.hp = LOGGER.hp;
    this.isTarget = true;
    this.state = 'walk';
    this.speed = Phaser.Math.Between(LOGGER.speedMin, LOGGER.speedMax);
    this.nextSwing = 0;
    this.nextPuff = 0;
    this.org = new Organic(this, this.base);
    this.org.vibrate = 0.012; // motor ligado
    this.walk();
  }

  get sawPoint() { return { x: this.x + (this.flipX ? -1 : 1) * 26, y: this.y - 30 }; }

  pose(frame) { if (!this.active) return; this.anims.stop(); this.setTexture('enemy_logger', frame); }

  walk() {
    this.play({ key: 'logger-walk', startFrame: Phaser.Math.Between(0, this.scene.anims.get('logger-walk').frames.length - 1) }, true);
    this.anims.timeScale = (this.speed / 80) * Phaser.Math.FloatBetween(0.9, 1.1);
  }

  update(time, delta) {
    if (this.state === 'dead') return;
    const p = this.scene.player;
    const dx = p.x - this.x;
    const onGround = this.body.blocked.down || this.body.touching.down;

    // fumaça do motor (motosserra ligada)
    if (time >= this.nextPuff) {
      this.nextPuff = time + Phaser.Math.Between(180, 320);
      const s = this.sawPoint;
      this.scene.fx.puff(s.x - (this.flipX ? -8 : 8), s.y - 6, 0x8a8a8a, 0.55, 380);
    }

    let moving = false;
    if (this.state === 'swing' || this.state === 'hit') {
      if (this.state === 'swing') this.setVelocityX(0);
    } else {
      this.setFlipX(dx < 0);
      const near = Math.abs(dx) < LOGGER.reach && Math.abs(p.y - this.y) < 50;
      if (near && time >= this.nextSwing && !p.dead) {
        this.swing(time);
      } else if (!near) {
        this.setVelocityX(onGround ? Math.sign(dx) * this.speed : this.body.velocity.x);
        if (this.state !== 'walk') { this.state = 'walk'; this.walk(); }
        moving = true;
      } else {
        this.setVelocityX(0);
        if (this.state !== 'ready') { this.state = 'ready'; this.pose(0); }
      }
    }
    this.org.vibrate = this.state === 'swing' ? 0.03 : 0.012;
    this.org.update(time, delta, moving);
  }

  swing(time) {
    this.state = 'swing';
    this.nextSwing = time + LOGGER.cooldown;
    const dir = this.flipX ? -1 : 1;
    this.setVelocityX(0);
    this.pose(1);
    this.org.tilt(-dir * 0.12);   // ergue a lâmina inclinando o corpo para trás (aviso)
    this.org.kick(-0.08);
    this.scene.time.delayedCall(LOGGER.windup, () => {
      if (!this.active || this.state !== 'swing') return;
      this.pose(0);
      this.org.tilt(dir * 0.2);   // golpe: o corpo vai para frente
      this.org.kick(0.1);
      this.setVelocityX(dir * 90);
      this.scene.time.delayedCall(90, () => this.active && this.state === 'swing' && this.setVelocityX(0));
      const p = this.scene.player;
      const s = this.sawPoint;
      this.scene.fx.sparks(s.x, s.y, 6);
      Sfx.hit();
      const ahead = (p.x - this.x) * dir;
      if (ahead > -10 && ahead < LOGGER.hitReach && Math.abs(p.y - this.y) < 50) p.hurt();
      this.scene.time.delayedCall(260, () => { if (this.active && this.state === 'swing') this.state = 'ready'; });
    });
  }

  takeDamage(dmg) {
    if (this.state === 'dead') return;
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    Sfx.hit();
    if (this.hp <= 0) { this.die(); return; }
    if (this.state !== 'swing') {
      const away = this.x < this.scene.player.x ? -1 : 1;
      this.state = 'hit';
      this.pose(2);
      this.setVelocityX(away * 80);
      this.org.tilt(away * 0.18);
      this.org.kick(0.1);
      this.scene.time.delayedCall(ORGANIC.stagger, () => { if (this.active && this.state === 'hit') { this.setVelocityX(0); this.state = 'ready'; } });
    }
  }

  die() {
    this.state = 'dead';
    this.isTarget = false;
    this.scene.onEnemyKilled?.(this);
    this.scene.addScore(LOGGER.score, this.x, this.y - 70);
    this.pose(3);
    this.setScale(this.base).setTint(0x9a8a7a);
    this.body.checkCollision.none = true;
    this.setVelocity(this.flipX ? 140 : -140, -260);
    this.scene.tweens.add({ targets: this, alpha: 0, angle: this.flipX ? 80 : -80, duration: 700, onComplete: () => this.destroy() });
  }
}
