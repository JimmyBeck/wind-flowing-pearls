/* =========================================================================
   crystal.js - 5类珠宝级水晶离屏贴图、子母珠配重物理引擎与双模态散落粒子
   ========================================================================= */

/**
 * 1. 离屏预渲染 5 种水晶组件贴图 + 十字星芒 (冰白玻璃体 + 薄荷冰翠折射)
 *    - dew:      微尘露珠 (星尘般点缀于长丝或连珠两端)
 *    - spacer:   小托珠   (半透明冷白小圆珠，用作大珠与吊坠的上下珠托)
 *    - pearl:    主圆珠   (高亮球体折射 + 冰翠色底部焦散弧光)
 *    - olive:    梭形米珠 (竖向凝露椭圆珠，丰富中段线条造型)
 *    - teardrop: 切面水滴 (钻石切面棱线 + 冰翠兜光 + 顶部银扣)
 */
class CrystalSprites {
  constructor() {
    this.scale = 3; // 3x 超采样，支持珠子放大至 2.5x 依然边缘锐利
    this.dew = this.createDewBead();
    this.spacer = this.createSpacerBead();
    this.pearl = this.createPearlBead();
    this.olive = this.createOliveBead();
    this.teardrop = this.createTeardropPendant();
    this.sparkle = this.createSparkle();
  }

  makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w * this.scale;
    c.height = h * this.scale;
    const ctx = c.getContext('2d');
    ctx.scale(this.scale, this.scale);
    return { canvas: c, ctx, w, h };
  }

  // (1) 微尘露珠 (Pinpoint Dew) - 直径约 3.2px
  createDewBead() {
    const { canvas, ctx, w, h } = this.makeCanvas(12, 12);
    const cx = w / 2, cy = h / 2, r = 1.65;

    const glow = ctx.createRadialGradient(cx, cy, 0.2, cx, cy, 4.5);
    glow.addColorStop(0, 'rgba(220, 252, 248, 0.52)');
    glow.addColorStop(1, 'rgba(160, 235, 230, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(cx - 0.5, cy - 0.5, 0.1, cx, cy, r);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.6, 'rgba(215, 248, 245, 0.88)');
    body.addColorStop(1, 'rgba(130, 210, 215, 0.45)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, w, h };
  }

  // (2) 小托珠 (Spacer Seed Bead) - 直径约 5.6px
  createSpacerBead() {
    const { canvas, ctx, w, h } = this.makeCanvas(18, 18);
    const cx = w / 2, cy = h / 2, r = 2.85;

    const glow = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, 7.2);
    glow.addColorStop(0, 'rgba(210, 250, 245, 0.42)');
    glow.addColorStop(1, 'rgba(150, 225, 220, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 7.2, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(cx - 0.9, cy - 0.9, 0.3, cx, cy, r);
    body.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    body.addColorStop(0.45, 'rgba(205, 242, 242, 0.72)');
    body.addColorStop(0.8, 'rgba(115, 190, 200, 0.45)');
    body.addColorStop(1, 'rgba(225, 255, 250, 0.88)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 左上高光点
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 0.95, cy - 0.95, 0.75, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, w, h };
  }

  // (3) 高亮主圆珠 (Luminous Crystal Pearl) - 直径约 10.6px
  createPearlBead() {
    const { canvas, ctx, w, h } = this.makeCanvas(30, 30);
    const cx = w / 2, cy = h / 2, r = 5.3;

    // 柔焦冰白环境光晕
    const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, 13.5);
    glow.addColorStop(0, 'rgba(210, 252, 246, 0.45)');
    glow.addColorStop(0.45, 'rgba(155, 232, 228, 0.16)');
    glow.addColorStop(1, 'rgba(140, 220, 220, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 13.5, 0, Math.PI * 2);
    ctx.fill();

    // 冰白半透明球体 + 菲涅尔亮边
    const sphere = ctx.createRadialGradient(cx - 1.4, cy - 1.6, 0.5, cx, cy, r);
    sphere.addColorStop(0, 'rgba(252, 255, 255, 0.96)');
    sphere.addColorStop(0.32, 'rgba(195, 238, 240, 0.55)');
    sphere.addColorStop(0.7, 'rgba(90, 168, 182, 0.36)');
    sphere.addColorStop(1, 'rgba(232, 255, 252, 0.92)');
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 右下底部薄荷冰翠色内折射焦散 (Ice Celadon Caustic)
    const rim = ctx.createRadialGradient(cx + 1.8, cy + 2.0, 0.2, cx + 1.3, cy + 1.5, 3.3);
    rim.addColorStop(0, 'rgba(205, 255, 244, 0.95)');
    rim.addColorStop(0.55, 'rgba(145, 242, 225, 0.48)');
    rim.addColorStop(1, 'rgba(145, 242, 225, 0)');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 左上锐利双高光斑
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 1.9, cy - 1.9, 1.5, 1.0, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - 0.6, cy - 3.1, 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 晶莹外轮廓
    ctx.strokeStyle = 'rgba(240, 255, 252, 0.72)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    return { canvas, w, h };
  }

  // (4) 梭形凝露米珠 (Spindle Olive Bead) - 宽约 5.8px, 高约 11px
  createOliveBead() {
    const { canvas, ctx, w, h } = this.makeCanvas(22, 28);
    const cx = w / 2, cy = h / 2, rx = 2.9, ry = 5.4;

    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 9.5);
    glow.addColorStop(0, 'rgba(205, 250, 245, 0.38)');
    glow.addColorStop(1, 'rgba(150, 230, 225, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 9.5, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    grad.addColorStop(0, 'rgba(250, 255, 255, 0.94)');
    grad.addColorStop(0.45, 'rgba(170, 225, 232, 0.46)');
    grad.addColorStop(0.8, 'rgba(120, 205, 205, 0.58)');
    grad.addColorStop(1, 'rgba(215, 255, 248, 0.94)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(235, 255, 252, 0.68)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // 纵向高光脊线
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.ellipse(cx - 1.0, cy - 1.2, 0.65, 2.3, -0.08, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, w, h };
  }

  // (5) 切面水滴水晶吊坠 (Faceted Teardrop Pendant)
  createTeardropPendant() {
    const { canvas, ctx, w, h } = this.makeCanvas(38, 52);
    const cx = w / 2, topY = 8, bottomY = 37;

    // 底部柔焦冰翠光晕
    const glow = ctx.createRadialGradient(cx, 26, 2, cx, 26, 17);
    glow.addColorStop(0, 'rgba(195, 252, 245, 0.46)');
    glow.addColorStop(0.5, 'rgba(145, 230, 225, 0.14)');
    glow.addColorStop(1, 'rgba(130, 220, 220, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, 26, 17, 0, Math.PI * 2);
    ctx.fill();

    // 顶部银质小挂环
    ctx.strokeStyle = 'rgba(235, 252, 255, 0.85)';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.arc(cx, topY - 1.5, 1.6, 0, Math.PI * 2);
    ctx.stroke();

    // 水滴外轮廓
    const traceDrop = () => {
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.bezierCurveTo(cx + 3.6, topY + 7.5, cx + 7.1, bottomY - 9.5, cx + 5.4, bottomY - 3.6);
      ctx.bezierCurveTo(cx + 4.0, bottomY + 0.6, cx + 1.6, bottomY + 2.2, cx, bottomY + 3.0);
      ctx.bezierCurveTo(cx - 1.6, bottomY + 2.2, cx - 4.0, bottomY + 0.6, cx - 5.4, bottomY - 3.6);
      ctx.bezierCurveTo(cx - 7.1, bottomY - 9.5, cx - 3.6, topY + 7.5, cx, topY);
      ctx.closePath();
    };

    const grad = ctx.createLinearGradient(cx - 5, topY, cx + 5, bottomY);
    grad.addColorStop(0, 'rgba(248, 255, 255, 0.94)');
    grad.addColorStop(0.35, 'rgba(175, 228, 236, 0.45)');
    grad.addColorStop(0.7, 'rgba(115, 198, 210, 0.58)');
    grad.addColorStop(1, 'rgba(220, 255, 248, 0.96)');
    traceDrop();
    ctx.fillStyle = grad;
    ctx.fill();

    // 内部钻石切面棱线与冰翠兜光
    ctx.save();
    traceDrop();
    ctx.clip();

    // 左侧冷白受光切面
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx - 1.8, bottomY - 5);
    ctx.lineTo(cx - 6.2, bottomY - 7.5);
    ctx.closePath();
    ctx.fill();

    // 右侧深冰青背光切面
    ctx.fillStyle = 'rgba(45, 128, 148, 0.24)';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx + 2.2, bottomY - 4.2);
    ctx.lineTo(cx + 6.2, bottomY - 8.2);
    ctx.closePath();
    ctx.fill();

    // 底部薄荷冰翠焦散兜光
    const bellyGlow = ctx.createRadialGradient(cx + 1.0, bottomY - 2.6, 0.4, cx, bottomY - 3.2, 6.0);
    bellyGlow.addColorStop(0, 'rgba(235, 255, 252, 0.98)');
    bellyGlow.addColorStop(0.55, 'rgba(165, 250, 235, 0.62)');
    bellyGlow.addColorStop(1, 'rgba(155, 245, 230, 0)');
    ctx.fillStyle = bellyGlow;
    ctx.beginPath();
    ctx.arc(cx, bottomY - 3.2, 6.0, 0, Math.PI * 2);
    ctx.fill();

    // 钻石切面棱线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx, topY + 2);
    ctx.lineTo(cx - 0.8, bottomY - 4.2);
    ctx.lineTo(cx, bottomY + 2.2);
    ctx.moveTo(cx - 0.8, bottomY - 4.2);
    ctx.lineTo(cx - 5.0, bottomY - 5.8);
    ctx.moveTo(cx - 0.8, bottomY - 4.2);
    ctx.lineTo(cx + 5.0, bottomY - 4.8);
    ctx.stroke();

    ctx.restore();

    traceDrop();
    ctx.strokeStyle = 'rgba(238, 255, 252, 0.82)';
    ctx.lineWidth = 0.75;
    ctx.stroke();

    // 左上肩部锐利主高光
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 2.2, topY + 14.5, 1.15, 3.5, -0.18, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, w, h, anchorY: topY - 1.5 };
  }

  // (6) 十字星芒贴图 (Sparkle Glint)
  createSparkle() {
    const { canvas, ctx, w, h } = this.makeCanvas(32, 32);
    const cx = w / 2, cy = h / 2;

    const glow = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, 10);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
    glow.addColorStop(0.35, 'rgba(205, 252, 245, 0.45)');
    glow.addColorStop(1, 'rgba(160, 235, 230, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.quadraticCurveTo(1.05, -1.05, 14, 0);
      ctx.quadraticCurveTo(1.05, 1.05, 0, 14);
      ctx.quadraticCurveTo(-1.05, 1.05, -14, 0);
      ctx.quadraticCurveTo(-1.05, -1.05, 0, -14);
      ctx.fill();
      ctx.restore();
    }
    return { canvas, w, h };
  }
}

/**
 * 2. 水晶珠节点 (BeadNode)
 */
const BEAD_MASS = {
  dew: 0.65,
  spacer: 0.85,
  olive: 1.25,
  pearl: 1.55,
  teardrop: 2.85
};

class BeadNode {
  constructor(x, y, type = 'spacer', pinned = false, options = {}) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
    this.originalX = x;
    this.originalY = y;
    this.type = type; // 'dew' | 'spacer' | 'pearl' | 'olive' | 'teardrop'
    this.pinned = pinned;
    this.isGrabbed = false;
    this.detached = false;

    this.layer = options.layer || 'front';         // 'front' | 'back'
    this.nodeScale = options.nodeScale || 1.0;     // 单珠个体规格缩放 (如大号/小号水滴坠)
    this.baseAlpha = options.baseAlpha || 1.0;     // 基础不透明度 (前景 1.0, 后景 0.36)
    this.alpha = this.baseAlpha;

    this.speed = 0;
    this.glintSeed = Math.random() * 100;
    this.mass = (BEAD_MASS[type] || 1.0) * this.nodeScale;
  }

  update(gravity, damping, breakMode) {
    if (this.pinned || this.alpha <= 0) return;

    if (this.isGrabbed) {
      this.speed = Math.hypot(this.x - this.oldX, this.y - this.oldY);
      this.oldX = this.x;
      this.oldY = this.y;
      return;
    }

    let vx = (this.x - this.oldX) * damping;
    let vy = (this.y - this.oldY) * damping;
    this.speed = Math.hypot(vx, vy);

    this.oldX = this.x;
    this.oldY = this.y;

    if (this.detached) {
      if (breakMode === 'float') {
        const breeze = Math.sin(performance.now() * 0.003 + this.glintSeed) * 0.09;
        vx = vx * 0.96 + breeze;
        vy = vy * 0.95 - 0.055;
        this.x += vx;
        this.y += vy;
        this.alpha = Math.max(0, this.alpha - 0.009);
      } else {
        this.x += vx * 0.99;
        this.y += vy + gravity * 1.15;
        this.alpha = Math.max(0, this.alpha - 0.011);
      }
      return;
    }

    const gScale = this.type === 'teardrop' ? 1.2 : 1.0;
    this.x += vx;
    this.y += vy + gravity * gScale;
  }
}

/**
 * 3. 珠链约束 (Link) - 支持非均匀间距 (密簇段高刚度、留白长丝段自适应拉伸阈值)
 */
class Link {
  constructor(nodeA, nodeB, restLen) {
    this.a = nodeA;
    this.b = nodeB;
    this.restLen = restLen;
    this.broken = false;
  }

  resolve(stiffness, breakThreshold, breakMode, onBreak) {
    if (this.broken || this.a.alpha <= 0 || this.b.alpha <= 0) return;

    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const distSq = dx * dx + dy * dy;

    // 自适应断裂阈值：兼容 6px 的紧密连珠簇与 40px 的长丝留白段
    const maxDist = Math.max(breakThreshold, this.restLen * 2.35);
    if (breakMode !== 'unbreakable' && distSq > maxDist * maxDist) {
      this.broken = true;
      if (onBreak) onBreak(this);
      return;
    }

    const dist = Math.sqrt(distSq);
    if (dist === 0) return;

    // 紧密珠簇内部 (restLen <= 10px) 略微提高刚度，使“子母珠结”整体紧密联动
    const localStiff = this.restLen <= 10 ? Math.min(0.96, stiffness * 1.08) : stiffness;
    const diff = ((dist - this.restLen) / dist) * localStiff;

    const invA = (this.a.pinned || this.a.isGrabbed) ? 0 : 1 / this.a.mass;
    const invB = (this.b.pinned || this.b.isGrabbed) ? 0 : 1 / this.b.mass;
    const totalInv = invA + invB;
    if (totalInv === 0) return;

    const wA = invA / totalInv;
    const wB = invB / totalInv;

    this.a.x += dx * diff * wA;
    this.a.y += dy * diff * wA;
    this.b.x -= dx * diff * wB;
    this.b.y -= dy * diff * wB;
  }
}

/**
 * 4. 散落水晶微粒与星芒 (CrystalParticle)
 */
class CrystalParticle {
  constructor(x, y, mode = 'fall', initVx = 0, initVy = 0) {
    this.x = x;
    this.y = y;
    this.mode = mode;
    this.isStar = Math.random() > 0.42;
    this.scale = Math.random() * 0.55 + 0.45;
    this.life = 1.0;
    this.decay = Math.random() * 0.012 + 0.008;
    this.seed = Math.random() * 100;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.08;

    if (mode === 'float') {
      this.vx = (Math.random() - 0.5) * 2.4 + initVx * 0.15;
      this.vy = -(Math.random() * 2.2 + 0.8) + initVy * 0.1;
    } else {
      this.vx = (Math.random() - 0.5) * 3.2 + initVx * 0.2;
      this.vy = (Math.random() - 0.3) * 2.0 + initVy * 0.15;
    }
  }

  update(gravity) {
    this.rotation += this.rotSpeed;
    if (this.mode === 'float') {
      const flutter = Math.sin(performance.now() * 0.004 + this.seed) * 0.08;
      this.vx = this.vx * 0.98 + flutter;
      this.vy = this.vy * 0.985 - 0.035;
    } else {
      this.vx *= 0.985;
      this.vy += gravity * 0.72;
    }
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx, sprites, beadScale = 1.0) {
    if (this.life <= 0) return;
    const twinkle = 0.65 + 0.35 * Math.sin(performance.now() * 0.015 + this.seed);
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life * twinkle);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isStar) {
      const s = sprites.sparkle.w * this.scale * 0.75 * beadScale;
      ctx.drawImage(sprites.sparkle.canvas, -s / 2, -s / 2, s, s);
    } else {
      const s = sprites.spacer.w * this.scale * 0.95 * beadScale;
      ctx.drawImage(sprites.spacer.canvas, -s / 2, -s / 2, s, s);
    }
    ctx.restore();
  }
}

window.CrystalSprites = CrystalSprites;
window.BeadNode = BeadNode;
window.Link = Link;
window.CrystalParticle = CrystalParticle;
