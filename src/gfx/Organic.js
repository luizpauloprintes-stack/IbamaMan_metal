import Phaser from 'phaser';
import { ORGANIC } from '../config/enemies.js';

// Camada de movimento "vivo" por cima das animações de quadros:
// respiração quando parado, inclinação ao andar (para frente, proporcional à velocidade),
// squash & stretch em impactos/aterrissagens, recuo (anticipation) e tremor de motor.
// Cada instância tem fase e ritmo próprios, para que inimigos iguais não se mexam em sincronia.
export default class Organic {
  constructor(sprite, baseScale) {
    this.s = sprite;
    this.base = baseScale;
    this.phase = Math.random() * Math.PI * 2;
    this.breathRate = Phaser.Math.FloatBetween(ORGANIC.breathRate[0], ORGANIC.breathRate[1]);
    this.lean = 0;
    this.squash = 0;     // >0 achata (impacto), <0 estica (salto/anticipation)
    this.leanBias = 0;   // inclinação extra temporária (recuo antes do ataque, tranco do dano)
    this.vibrate = 0;    // tremor de motor (motosserra)
    this.wasGround = true;
  }

  kick(amount) { this.squash = amount; }
  tilt(amount) { this.leanBias = amount; }

  update(time, delta, moving) {
    const s = this.s;
    const body = s.body;
    const dt = Number.isFinite(delta) ? Math.min(delta, 50) : 16.7; // nunca NaN (corromperia escala e física)
    const vx = body ? body.velocity.x : 0;
    const onGround = body ? (body.blocked.down || body.touching.down) : true;

    // aterrissagem: achata e solta poeira
    if (body && onGround && !this.wasGround) { this.kick(ORGANIC.landSquash); s.scene.fx?.dust(s.x, s.y, 3); }
    this.wasGround = onGround;

    const speedK = Math.min(1, Math.abs(vx) / ORGANIC.leanSpeed);
    const target = (moving ? Math.sign(vx) * speedK * ORGANIC.leanMax : 0) + this.leanBias;
    this.lean += (target - this.lean) * Math.min(1, dt / ORGANIC.leanEase);
    const decay = Math.pow(0.02, dt / 1000 * 4);
    this.squash *= decay;
    this.leanBias *= decay;

    const breath = moving ? 0 : Math.sin(time * this.breathRate + this.phase) * ORGANIC.breathAmp;
    const sy = 1 + breath - this.squash;
    const sx = 1 - breath * 0.6 + this.squash * 0.7;
    s.setScale(this.base * sx, this.base * sy);
    const shake = this.vibrate ? Math.sin(time * 0.09 + this.phase) * this.vibrate : 0;
    s.rotation = this.lean + shake;
  }
}
