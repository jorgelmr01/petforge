// PETFORGE — lightweight canvas particle system (hearts, sparkles, bubbles…).

export type ParticleKind = 'heart' | 'spark' | 'star' | 'bubble' | 'ember' | 'zzz' | 'text' | 'ring' | 'leaf';

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  kind: ParticleKind; color: string; text?: string; grav: number;
}

export class Particles {
  list: Particle[] = [];

  spawn(p: Partial<Particle> & { x: number; y: number; kind: ParticleKind }) {
    this.list.push({
      vx: 0, vy: -40, life: 0, maxLife: 1, size: 10, color: '#fff', grav: 0,
      ...p,
    } as Particle);
    if (this.list.length > 400) this.list.splice(0, this.list.length - 400);
  }

  burst(x: number, y: number, kind: ParticleKind, n: number, opts: Partial<Particle> = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 120;
      this.spawn({
        x, y, kind,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        maxLife: 0.7 + Math.random() * 0.7, size: 6 + Math.random() * 8,
        ...opts,
      });
    }
  }

  floatText(x: number, y: number, text: string, color = '#fff', size = 22) {
    this.spawn({ x, y, kind: 'text', text, color, size, vy: -70, maxLife: 1.1, grav: 0 });
  }

  update(dt: number) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life += dt;
      if (p.life >= p.maxLife) { l.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 0.6 * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const t = p.life / p.maxLife;
      const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.translate(p.x, p.y);
      const s = p.size * (1 - t * 0.3);
      switch (p.kind) {
        case 'heart': drawHeart(ctx, s, p.color); break;
        case 'spark': drawSpark(ctx, s, p.color); break;
        case 'star': drawStar(ctx, s, p.color); break;
        case 'bubble':
          ctx.strokeStyle = p.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          ctx.beginPath(); ctx.arc(-s / 6, -s / 6, s / 8, 0, Math.PI * 2); ctx.fill();
          break;
        case 'ember':
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(0, 0, s / 2 * (0.6 + Math.random() * 0.6), 0, Math.PI * 2); ctx.fill();
          break;
        case 'zzz':
          ctx.fillStyle = p.color; ctx.font = `bold ${s * 1.6}px system-ui`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('Z', 0, 0);
          break;
        case 'text':
          ctx.font = `800 ${p.size}px system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,6,20,.85)';
          ctx.strokeText(p.text || '', 0, 0);
          ctx.fillStyle = p.color; ctx.fillText(p.text || '', 0, 0);
          break;
        case 'ring':
          ctx.strokeStyle = p.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, s / 2 + t * 30, 0, Math.PI * 2); ctx.stroke();
          break;
        case 'leaf':
          ctx.fillStyle = p.color;
          ctx.rotate(p.life * 3);
          ctx.beginPath(); ctx.ellipse(0, 0, s / 2, s / 4, 0, 0, Math.PI * 2); ctx.fill();
          break;
      }
      ctx.restore();
    }
  }

  clear() { this.list.length = 0; }
}

function drawHeart(ctx: CanvasRenderingContext2D, s: number, color: string) {
  ctx.fillStyle = color;
  const w = s, h = s;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.35);
  ctx.bezierCurveTo(-w * 0.55, 0, -w * 0.3, -h * 0.45, 0, -h * 0.15);
  ctx.bezierCurveTo(w * 0.3, -h * 0.45, w * 0.55, 0, 0, h * 0.35);
  ctx.fill();
}

function drawSpark(ctx: CanvasRenderingContext2D, s: number, color: string) {
  ctx.fillStyle = color;
  const r = s / 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.35;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, s: number, color: string) {
  ctx.fillStyle = color;
  const r = s / 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
