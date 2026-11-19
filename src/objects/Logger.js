import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';
import { LOGGER } from '../config/enemies.js';
import { Sfx } from '../audio/Sfx.js';
import { ts, setBodyLogical } from '../config/assets.js';

// Madeireiro com motosserra: avança até o jogador e golpeia de perto (corpo a corpo).
// Quadros de enemy_logger: 0 motosserra ligada, 1 lâmina erguida, 2 atingido, 3 derrotado.
export default class Logger extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_logger', 0);
    scene.add.existing(this);
    scene.enemies.add(this); // grupo antes do corpo (o grupo aplica defaults)
    this.setOrigin(0.5, 1).setDepth(DEPTH.enemies).setFlipX(true).setScale(ts('enemy_logger'));
    setBodyLogical(this, 28, 58, (this.displayWidth - 28) / 2, this.displayHeight - 58);
    this.hp = LOGGER.hp;
    this.isTarget = true;
    this.state = 'walk';
    this.speed = Phaser.Math.Between(LOGGER.speedMin, LOGGER.speedMax);
    this.nextSwing = 0;
    this.nextPuff = 0;
  }

  get sawPoint() { return { x: this.x + (this.flipX ? -1 : 1) * 26, y: this.y - 30 }; }

  update(time) {
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

    if (this.state === 'swing' || this.state === 'hit') { this.setVelocityX(0); return; }

    this.setFlipX(dx < 0);
    const near = Math.abs(dx) < LOGGER.reach && Math.abs(p.y - this.y) < 50;
    if (near && time >= this.nextSwing && !p.dead) { this.swing(time); return; }
    if (!near) this.setVelocityX(onGround ? Math.sign(dx) * this.speed : this.body.velocity.x);
    else this.setVelocityX(0);
    this.setFrame(0);
  }

  swing(time) {
    this.state = 'swing';
    this.nextSwing = time + LOGGER.cooldown;
    this.setVelocityX(0).setFrame(1);
    this.scene.time.delayedCall(LOGGER.windup, () => {
      if (this.state !== 'swing') return;
      const p = this.scene.player;
      const s = this.sawPoint;
      this.scene.fx.sparks(s.x, s.y, 5);
      Sfx.hit();
      const facing = this.flipX ? -1 : 1;
      const ahead = (p.x - this.x) * facing;
      if (ahead > -10 && ahead < LOGGER.hitReach && Math.abs(p.y - this.y) < 50) p.hurt();
      this.scene.time.delayedCall(220, () => { if (this.state === 'swing') { this.state = 'walk'; this.setFrame(0); } });
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
      this.state = 'hit';
      this.setFrame(2);
      this.scene.time.delayedCall(160, () => { if (this.state === 'hit') { this.state = 'walk'; this.setFrame(0); } });
    }
  }

  die() {
    this.state = 'dead';
    this.isTarget = false;
    this.scene.onEnemyKilled?.(this);
    this.scene.addScore(LOGGER.score, this.x, this.y - 70);
    this.setFrame(3).setTint(0x9a8a7a);
    this.body.checkCollision.none = true;
    this.setVelocity(this.flipX ? 140 : -140, -260);
    this.scene.tweens.add({ targets: this, alpha: 0, angle: this.flipX ? 80 : -80, duration: 700, onComplete: () => this.destroy() });
  }
}
