import Phaser from 'phaser';
import { GROUND_Y } from '../config/constants.js';
import { CAMP } from '../config/enemies.js';
import { Sfx } from '../audio/Sfx.js';

// "Chefe" da Missão 2: acampamento do garimpo defendido por ondas de garimpeiros.
// Não leva tiro (isTarget=false); o "HP" é o número de garimpeiros que ainda faltam.
// Ao zerar, os equipamentos explodem e a área é embargada. Mesma interface dos outros chefes.
export default class Camp extends Phaser.GameObjects.Zone {
  constructor(scene, x, y, waves) {
    super(scene, x, y, CAMP.width, CAMP.height);
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.waves = waves.slice();
    this.maxHP = this.waves.reduce((a, b) => a + b, 0);
    this.hp = this.maxHP;
    this.isTarget = false;
    this.defeated = false;
    this.wave = -1;
    this.toSpawn = 0;
    this.nextTick = 0;
    this.started = false;
    this.onUpdate = (time) => this.tick(time);
    scene.events.on('update', this.onUpdate);
    this.once('destroy', () => scene.events.off('update', this.onUpdate));
  }

  get displayHeight() { return CAMP.height; }

  enter() {
    this.scene.time.delayedCall(CAMP.firstDelay, () => { this.started = true; this.nextWave(); });
  }

  nextWave() {
    this.wave += 1;
    if (this.wave >= this.waves.length) return;
    this.toSpawn = this.waves[this.wave];
    this.scene.showBanner(`ONDA ${this.wave + 1}/${this.waves.length}`, 1100, '#ff9a4d', '');
    Sfx.alarm();
  }

  tick(time) {
    if (!this.started || this.defeated || time < this.nextTick) return;
    this.nextTick = time + CAMP.spawnEvery;
    const scene = this.scene;
    const alive = scene.enemies.countActive(true);
    if (this.toSpawn > 0 && alive < CAMP.maxAlive) {
      const side = this.toSpawn % 2 ? 'right' : 'left';
      if (scene.spawnEnemy('miner', side)) this.toSpawn -= 1;
    } else if (this.toSpawn === 0 && alive === 0 && this.wave < this.waves.length - 1) {
      this.nextWave();
    }
  }

  onEnemyKilled() {
    if (this.defeated || !this.started) return;
    this.hp = Math.max(0, this.hp - 1);
    if (this.hp === 0) this.defeat();
  }

  takeDamage() {}

  randomPoint() {
    return { x: this.x + Phaser.Math.Between(-CAMP.width / 2, CAMP.width / 2), y: GROUND_Y - Phaser.Math.Between(10, CAMP.height) };
  }

  defeat() {
    this.defeated = true;
    this.scene.onBossDefeated(this);
  }
}
