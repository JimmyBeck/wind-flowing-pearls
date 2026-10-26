/* =========================================================================
   main.js - 风起流珠 (wind-flowing-pearls)：9:16 实体水晶珠帘主控与可配置参数
   ========================================================================= */

window.CONFIG = {
  // 1. 造型与景深开关
  layoutMode: 'hat',          // 'hat': 参考图帽檐流瀑 | 'staggered': 均匀错落 | 'uniform': 等长整齐
  enableBackLayer: false,     // 是否开启后景半透明衬底珠链
  breakMode: 'fall',          // 'fall': 重力下坠 | 'float': 向上飘散 | 'unbreakable': 只摆动不断裂
  beadScale: 1.0,             // 珠子整体大小缩放倍率 (0.15 ~ 2.5)

  // 2. 自动微风与鼠标灵敏度 (v2 新增)
  windStrength: 1.0,          // 自动微风强度 (0.0 ~ 2.5, 0 为完全无风)
  mouseSensitivity: 0.55,     // 鼠标流体推力灵敏度 (0.1 ~ 2.0, 默认轻柔抚动无硬碰撞感)

  // 3. 物理引擎参数
  gravity: 0.34,              // 垂直重力
  stiffness: 0.88,            // 珠链刚度
  damping: 0.976,             // 空气阻尼
  constraintIterations: 6,    // 约束迭代次数

  // 4. 鼠标风场半径与断裂阈值
  mouseRadius: 105,           // 鼠标气流作用半径 (px)
  breakThreshold: 76,         // 珠链拉断基础临界距离 (px)
  shakeBreakSpeed: 52,        // 快速划过打散的基础速度阈值
  grabDistance: 32,           // 拖拽抓取判定半径 (px)

  // 5. 珠帘密度与粒子上限
  chainCount: 16,             // 垂坠链条根数密度 (6 ~ 40 根可调)
  maxParticles: 90            // 最大散落水晶星芒粒子数
};

class CrystalSound {
  constructor() {
    this.ctx = null;
    this.lastTime = 0;
    this.notes = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
  }

  chime(intensity = 0.5) {
    const now = performance.now();
    if (now - this.lastTime < 95) return;
    this.lastTime = now;

    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freq = this.notes[Math.floor(Math.random() * this.notes.length)];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const vol = Math.min(0.08, 0.015 + intensity * 0.055);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    } catch (e) {}
  }
}

class CrystalCurtainApp {
  constructor() {
    this.canvas = document.getElementById('stage');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.sprites = new window.CrystalSprites();
    this.sound = new CrystalSound();

    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.chains = [];
    this.allNodes = [];
    this.allLinks = [];
    this.particles = [];

    // 自动微风时钟与间歇阵风波脉 (移植自 wind-chimes)
    this.time = 0;
    this.gusts = [];
    this.nextGustTime = 2.5;

    this.pointer = {
      x: -1000, y: -1000,
      oldX: -1000, oldY: -1000,
      vx: 0, vy: 0,
      active: false,
      grabbedNode: null
    };

    this.bindEvents();
    this.resize();
    this.animate();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.buildCurtain();
  }

  seededRand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  triggerGust(power = 0.85) {
    this.gusts.push({
      startTime: this.time,
      power: power,
      dir: Math.random() > 0.25 ? 1 : -1
    });
    if (this.gusts.length > 4) this.gusts.shift();
  }

  /**
   * 构建单根珠链：包含长丝留白、紧密子母珠簇、末端切面水滴，以及独立双谐波微风参数
   */
  buildSingleChain(x, startY, targetLen, colIdx, maxLen, layer = 'front') {
    const colNodes = [];
    const colLinks = [];
    const isBack = layer === 'back';
    const baseAlpha = isBack ? 0.36 : 1.0;
    const layerScale = isBack ? 0.66 : 1.0;

    const addNode = (y, type, pinned = false, customScale = 1.0) => {
      const node = new window.BeadNode(x, y, type, pinned, {
        layer,
        baseAlpha,
        nodeScale: layerScale * customScale
      });
      colNodes.push(node);
      this.allNodes.push(node);
      if (colNodes.length > 1) {
        const prev = colNodes[colNodes.length - 2];
        const restLen = Math.max(4, y - prev.y);
        const link = new window.Link(prev, node, restLen);
        colLinks.push(link);
        this.allLinks.push(link);
      }
    };

    // 1. 顶部锚点珠
    addNode(startY, 'spacer', true, 0.95);

    const endY = startY + targetLen;
    let curY = startY;
    let segIdx = 0;

    // 2. 中段循环：交替生成“裸露银丝留白段”与“多珠紧密簇单元”
    while (curY < endY - 38) {
      const r1 = this.seededRand(colIdx * 31 + segIdx * 17 + (isBack ? 500 : 0));
      const r2 = this.seededRand(colIdx * 73 + segIdx * 43 + (isBack ? 900 : 0));

      const bareGap = 24 + r1 * 18;
      curY += bareGap;
      if (curY >= endY - 26) break;

      const motifType = Math.floor(r2 * 4);

      if (motifType === 0 && curY + 14 < endY - 22) {
        const pearlScale = 0.92 + r1 * 0.24;
        addNode(curY, 'spacer', false, 0.9);
        addNode(curY + 7, 'pearl', false, pearlScale);
        addNode(curY + 14, 'spacer', false, 0.9);
        curY += 14;
      } else if (motifType === 1 && curY + 11 < endY - 22) {
        addNode(curY, 'dew', false, 1.0);
        addNode(curY + 5.5, 'dew', false, 1.05);
        addNode(curY + 11, 'dew', false, 0.95);
        curY += 11;
      } else if (motifType === 2 && curY + 13 < endY - 22) {
        addNode(curY, 'dew', false, 0.95);
        addNode(curY + 6.5, 'olive', false, 1.0);
        addNode(curY + 13, 'dew', false, 0.95);
        curY += 13;
      } else {
        addNode(curY, 'spacer', false, 0.95);
        addNode(curY + 6, 'dew', false, 1.0);
        curY += 6;
      }

      segIdx++;
    }

    // 3. 链尾收束：小珠托 + 切面水滴吊坠
    const lenRatio = targetLen / maxLen;
    const dropScale = lenRatio > 0.72 ? 1.08 : (lenRatio > 0.48 ? 0.92 : 0.78);

    addNode(endY - 7.5, 'spacer', false, 0.9 * dropScale);
    addNode(endY, 'teardrop', false, dropScale);

    // 4. 独立微风谐波参数 (移植自 wind-chimes：非同步 S 曲线行波)
    const freq = 0.65 + this.seededRand(colIdx * 3.1) * 0.48;
    this.chains.push({
      nodes: colNodes,
      links: colLinks,
      layer,
      colIdx,
      targetLen,
      freq,
      freq2: freq * 1.78 + this.seededRand(colIdx * 8.8) * 0.22,
      delayStep: 0.24 + this.seededRand(colIdx * 2.2) * 0.18,
      phase: this.seededRand(colIdx * 7.7) * Math.PI * 2,
      ampMul: 0.68 + this.seededRand(colIdx * 11.3) * 0.64,
      dir: this.seededRand(colIdx * 5.5) > 0.5 ? 1 : -1
    });
  }

  getColumnSpecs(cols, maxLen, mode) {
    const specs = [];
    const marginX = 24;
    const usableW = Math.max(80, this.width - marginX * 2);
    const baseSpacing = cols > 1 ? usableW / (cols - 1) : 0;
    const baseStartX = cols > 1 ? marginX : this.width / 2;

    const hatLengthRatios = [
      0.92, 0.76, 0.96, 0.62, 0.86, 0.48, 0.78, 0.34,
      0.58, 0.28, 0.68, 0.40, 0.74, 0.32, 0.60, 0.82, 0.46
    ];
    const hatXOffsets = [
      0, -5, 4, -2, 6, -6, 2, -4,
      5, -5, 3, -3, 6, -4, 2, -5, 0
    ];
    const offsetScale = Math.min(1.2, baseSpacing / 27);

    for (let c = 0; c < cols; c++) {
      const u = cols > 1 ? c / (cols - 1) : 0.5;
      let x = baseStartX + c * baseSpacing;
      let startY = 30;
      let targetLen = maxLen;

      if (mode === 'uniform') {
        targetLen = maxLen;
      } else if (mode === 'staggered') {
        const stepOffsets = [0.95, 0.54, 0.80, 0.42, 0.88, 0.62, 0.72];
        const wave = 0.5 + 0.5 * Math.sin(c * 2.15 + 0.6);
        const ratio = Math.max(0.36, Math.min(0.98, stepOffsets[c % stepOffsets.length] * 0.78 + wave * 0.2));
        targetLen = Math.round(maxLen * ratio);
      } else if (mode === 'hat') {
        x += hatXOffsets[c % hatXOffsets.length] * offsetScale;
        startY = 24 + Math.sin(u * Math.PI) * 16;
        const ratio = hatLengthRatios[c % hatLengthRatios.length];
        targetLen = Math.max(95, Math.round(maxLen * ratio));
      }

      specs.push({ x, startY, targetLen });
    }
    return specs;
  }

  buildCurtain() {
    this.chains = [];
    this.allNodes = [];
    this.allLinks = [];
    this.particles = [];

    const cfg = window.CONFIG;
    const cols = Math.max(4, Math.min(45, cfg.chainCount));
    const maxLen = Math.max(180, this.height - 86);

    const frontSpecs = this.getColumnSpecs(cols, maxLen, cfg.layoutMode);

    if (cfg.enableBackLayer) {
      for (let c = 0; c < cols - 1; c += 2) {
        const s1 = frontSpecs[c];
        const s2 = frontSpecs[c + 1];
        const backX = (s1.x + s2.x) * 0.5;
        const backStartY = (s1.startY + s2.startY) * 0.5 + 4;
        const backLen = Math.max(90, Math.min(maxLen * 0.78, (s1.targetLen + s2.targetLen) * 0.44));
        this.buildSingleChain(backX, backStartY, backLen, c + 100, maxLen, 'back');
      }
    }

    for (let c = 0; c < frontSpecs.length; c++) {
      const { x, startY, targetLen } = frontSpecs[c];
      this.buildSingleChain(x, startY, targetLen, c, maxLen, 'front');
    }
  }

  restoreCurtain() {
    for (let i = 0; i < this.allLinks.length; i++) {
      this.allLinks[i].broken = false;
    }
    for (let i = 0; i < this.allNodes.length; i++) {
      const n = this.allNodes[i];
      n.x = n.originalX;
      n.y = n.originalY;
      n.oldX = n.originalX;
      n.oldY = n.originalY;
      n.detached = false;
      n.isGrabbed = false;
      n.alpha = n.baseAlpha;
      n.speed = 0;
    }
    this.particles = [];
    this.sound.chime(0.9);
  }

  spawnParticles(x, y, count = 4, vx = 0, vy = 0) {
    const pMode = window.CONFIG.breakMode === 'float' ? 'float' : 'fall';
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= window.CONFIG.maxParticles) {
        this.particles.shift();
      }
      this.particles.push(new window.CrystalParticle(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        pMode, vx, vy
      ));
    }
  }

  onLinkBroken(link) {
    const mx = (link.a.x + link.b.x) * 0.5;
    const my = (link.a.y + link.b.y) * 0.5;
    this.spawnParticles(mx, my, 5, this.pointer.vx, this.pointer.vy);
    this.sound.chime(1.0);
    this.markDetachedNodes();
  }

  markDetachedNodes() {
    for (let c = 0; c < this.chains.length; c++) {
      const { nodes, links } = this.chains[c];
      let brokenAbove = false;
      for (let r = 0; r < links.length; r++) {
        if (links[r].broken) brokenAbove = true;
        if (brokenAbove) nodes[r + 1].detached = true;
      }
    }
  }

  breakNearby(x, y, radius) {
    if (window.CONFIG.breakMode === 'unbreakable') return;
    const rSq = radius * radius;
    let anyBroken = false;

    for (let i = 0; i < this.allLinks.length; i++) {
      const link = this.allLinks[i];
      if (link.broken) continue;
      const mx = (link.a.x + link.b.x) * 0.5;
      const my = (link.a.y + link.b.y) * 0.5;
      const dx = mx - x, dy = my - y;
      if (dx * dx + dy * dy < rSq) {
        link.broken = true;
        this.spawnParticles(mx, my, 3, this.pointer.vx, this.pointer.vy);
        anyBroken = true;
      }
    }
    if (anyBroken) {
      this.markDetachedNodes();
      this.sound.chime(1.0);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
      this.pointer.active = true;
    }, { passive: true });

    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
      this.pointer.oldX = this.pointer.x;
      this.pointer.oldY = this.pointer.y;
      this.pointer.active = true;

      let closest = null;
      let minDistSq = window.CONFIG.grabDistance * window.CONFIG.grabDistance;

      for (let i = 0; i < this.allNodes.length; i++) {
        const node = this.allNodes[i];
        if (node.pinned || node.alpha < 0.2) continue;
        const dx = node.x - this.pointer.x;
        const dy = node.y - this.pointer.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closest = node;
        }
      }

      if (closest) {
        this.pointer.grabbedNode = closest;
        closest.isGrabbed = true;
        this.sound.chime(0.7);
      }
    }, { passive: true });

    window.addEventListener('pointerup', () => {
      if (this.pointer.grabbedNode) {
        this.pointer.grabbedNode.isGrabbed = false;
        this.pointer.grabbedNode = null;
      }
    }, { passive: true });

    window.addEventListener('dblclick', (e) => {
      if (e.target.closest('.hud')) return;
      this.restoreCurtain();
    });

    // 1. 排布造型切换
    document.querySelectorAll('.hud-btn[data-layout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hud-btn[data-layout]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.CONFIG.layoutMode = btn.dataset.layout;
        this.buildCurtain();
        this.sound.chime(0.8);
      });
    });

    // 2. 后景深层开关
    const backLayerBtn = document.getElementById('backLayerBtn');
    backLayerBtn.addEventListener('click', () => {
      window.CONFIG.enableBackLayer = !window.CONFIG.enableBackLayer;
      backLayerBtn.classList.toggle('active', window.CONFIG.enableBackLayer);
      backLayerBtn.textContent = window.CONFIG.enableBackLayer ? '后景深: 开' : '后景深: 关';
      this.buildCurtain();
      this.sound.chime(0.75);
    });

    // 3. 打散模式切换
    document.querySelectorAll('.hud-btn[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hud-btn[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.CONFIG.breakMode = btn.dataset.mode;
        this.restoreCurtain();
      });
    });

    // 4. 自动微风强度滑块 (0.0 ~ 2.5)
    const windSlider = document.getElementById('windStrengthSlider');
    const windVal = document.getElementById('windStrengthVal');
    windSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.CONFIG.windStrength = val;
      windVal.textContent = val.toFixed(2).replace(/\.00$/, '.0') + 'x';
    });

    // 5. 鼠标力度灵敏度滑块 (0.1 ~ 2.0)
    const mouseSensSlider = document.getElementById('mouseSensSlider');
    const mouseSensVal = document.getElementById('mouseSensVal');
    mouseSensSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.CONFIG.mouseSensitivity = val;
      mouseSensVal.textContent = val.toFixed(2).replace(/\.00$/, '.0') + 'x';
    });

    // 6. 链条密度滑块 (6 ~ 40 根)
    const chainSlider = document.getElementById('chainCountSlider');
    const chainVal = document.getElementById('chainCountVal');
    chainSlider.addEventListener('input', (e) => {
      const count = parseInt(e.target.value, 10);
      window.CONFIG.chainCount = count;
      chainVal.textContent = count + '根';
      this.buildCurtain();
    });

    // 7. 珠子大小滑块 (0.15x ~ 2.5x)
    const scaleSlider = document.getElementById('beadScaleSlider');
    const scaleVal = document.getElementById('beadScaleVal');
    scaleSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.CONFIG.beadScale = val;
      scaleVal.textContent = val.toFixed(2).replace(/\.00$/, '.0') + 'x';
    });

    document.getElementById('resetBtn').addEventListener('click', () => this.restoreCurtain());
  }

  /**
   * 施加 wind-chimes 同款非同步 S 形行波微风与间歇清风涟漪
   */
  applyAutoBreeze(windStrength) {
    if (windStrength <= 0.01) return;

    const t = this.time;
    if (t > this.nextGustTime) {
      this.triggerGust(0.65 + Math.random() * 0.55);
      this.nextGustTime = t + 4.5 + Math.random() * 4.0;
    }

    for (let c = 0; c < this.chains.length; c++) {
      const chain = this.chains[c];
      const nodes = chain.nodes;
      const len = nodes.length;
      const topY = nodes[0].originalY;
      const layerMul = chain.layer === 'back' ? 0.65 : 1.0;

      for (let r = 1; r < len; r++) {
        const node = nodes[r];
        if (node.pinned || node.isGrabbed || node.detached || node.alpha <= 0) continue;

        // 深度比例 reach：越往下摆幅越舒展
        const reach = Math.min(1.25, (node.originalY - topY) / 320);

        // 1. 单链双谐波非同步 S 形柳条波
        const w1 = Math.sin(t * chain.freq - r * chain.delayStep + chain.phase) * chain.ampMul;
        const w2 = Math.sin(t * chain.freq2 - r * chain.delayStep * 1.35 + chain.phase * 1.7) * chain.ampMul * 0.40;
        let windX = (w1 + w2) * chain.dir * 0.62;

        // 2. 横跨整幅帘幕的慢速行波底风
        windX += Math.sin(t * 0.85 - chain.colIdx * 0.26 - r * 0.12) * 0.48;

        // 3. 间歇阵风涟漪脉冲 (自上而下、从左至右传导)
        let gustX = 0;
        for (let g = 0; g < this.gusts.length; g++) {
          const gust = this.gusts[g];
          const dt = t - gust.startTime;
          const travelDelay = r * 0.055 + (chain.colIdx % 20) * 0.045;
          const localDt = dt - travelDelay;
          if (localDt > 0 && localDt < 2.2) {
            const pulse = Math.exp(-Math.pow((localDt - 0.4) / 0.32, 2)) * gust.power;
            gustX += Math.sin(localDt * 4.2) * pulse * 1.45 * gust.dir;
          }
        }

        node.x += (windX + gustX) * windStrength * reach * 0.13 * layerMul;
      }
    }
  }

  animate() {
    const cfg = window.CONFIG;
    const globalScale = cfg.beadScale;
    this.time += 0.016;

    // 1. 施加自动微风行波
    this.applyAutoBreeze(cfg.windStrength);

    // 2. 光标柔性流体推力 (去除静态硬排斥，完全与光标速度及 mouseSensitivity 耦合)
    if (this.pointer.active) {
      this.pointer.vx = this.pointer.x - this.pointer.oldX;
      this.pointer.vy = this.pointer.y - this.pointer.oldY;
      this.pointer.oldX = this.pointer.x;
      this.pointer.oldY = this.pointer.y;

      const speed = Math.hypot(this.pointer.vx, this.pointer.vy);
      const sens = cfg.mouseSensitivity;

      if (this.pointer.grabbedNode) {
        this.pointer.grabbedNode.x = this.pointer.x;
        this.pointer.grabbedNode.y = this.pointer.y;
        if (speed > 44 / Math.sqrt(sens) && cfg.breakMode !== 'unbreakable') {
          this.breakNearby(this.pointer.x, this.pointer.y, 46);
        }
      } else if (speed > 0.15) {
        // 仅当光标实际移动时才产生流体尾流，静止时不硬顶珠子
        const r = cfg.mouseRadius;
        const rSq = r * r;
        const px = this.pointer.x, py = this.pointer.y;
        const effectiveBreakSpeed = cfg.shakeBreakSpeed / Math.max(0.35, Math.sqrt(sens));
        let touched = 0;

        for (let i = 0; i < this.allNodes.length; i++) {
          const node = this.allNodes[i];
          if (node.pinned || node.alpha <= 0) continue;

          const dx = node.x - px;
          if (dx > r || dx < -r) continue;
          const dy = node.y - py;
          if (dy > r || dy < -r) continue;

          const dSq = dx * dx + dy * dy;
          if (dSq < rSq) {
            const dist = Math.sqrt(dSq) || 1;
            const layerFactor = node.layer === 'back' ? 0.65 : 1.0;
            // 平滑指数衰减 (1 - d/r)^1.35
            const falloff = Math.pow(1 - dist / r, 1.35) / Math.sqrt(node.mass) * layerFactor;

            // 基础拨开力 + 速度流体尾流 (直接由 mouseSensitivity 调谐强弱)
            const basePush = (1 - dist / r) * 3.6 * sens;
            const flowPush = Math.min(speed * 0.35, 6.5) * sens;
            node.x += ((dx / dist) * (basePush + flowPush) + this.pointer.vx * 0.32 * sens) * falloff;
            node.y += ((dy / dist) * (basePush * 0.4 + flowPush * 0.5) + this.pointer.vy * 0.22 * sens) * falloff;
            touched++;

            if (speed > effectiveBreakSpeed && dist < 34) {
              if (cfg.breakMode === 'unbreakable') {
                if (Math.random() < 0.25) {
                  this.spawnParticles(node.x, node.y, 1, this.pointer.vx, this.pointer.vy);
                }
              } else {
                this.breakNearby(node.x, node.y, 30);
              }
            }
          }
        }
        if (touched > 2 && speed > 6) {
          this.sound.chime(Math.min(1, (speed * sens) / 28));
        }
      }
    }

    // 3. 物理步进与距离约束求解
    for (let i = 0; i < this.allNodes.length; i++) {
      this.allNodes[i].update(cfg.gravity, cfg.damping, cfg.breakMode);
    }

    for (let iter = 0; iter < cfg.constraintIterations; iter++) {
      for (let i = 0; i < this.allLinks.length; i++) {
        this.allLinks[i].resolve(cfg.stiffness, cfg.breakThreshold, cfg.breakMode, (link) => {
          this.onLinkBroken(link);
        });
      }
    }

    // 4. 散落微粒更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(cfg.gravity);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }

    // 5. 渲染纯黑背景 (#000000)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 6. 渲染珠链银丝连接线
    this.ctx.lineWidth = Math.max(0.32, Math.min(1.0, 0.8 * Math.sqrt(globalScale)));
    for (let i = 0; i < this.allLinks.length; i++) {
      const link = this.allLinks[i];
      if (link.broken) continue;
      const alpha = Math.min(link.a.alpha, link.b.alpha);
      if (alpha <= 0.02) continue;

      this.ctx.strokeStyle = `rgba(205, 248, 245, ${0.28 * alpha})`;
      this.ctx.beginPath();
      this.ctx.moveTo(link.a.x, link.a.y);
      this.ctx.lineTo(link.b.x, link.b.y);
      this.ctx.stroke();
    }

    // 7. 渲染 5 种实体水晶珠与动态星芒
    const now = performance.now();
    const sp = this.sprites;

    for (let c = 0; c < this.chains.length; c++) {
      const nodes = this.chains[c].nodes;
      const len = nodes.length;

      for (let r = 0; r < len; r++) {
        const node = nodes[r];
        if (node.alpha <= 0.01) continue;

        const s = globalScale * node.nodeScale;
        this.ctx.save();
        if (node.alpha < 1) this.ctx.globalAlpha = node.alpha;

        if (node.type === 'teardrop') {
          const prev = nodes[r - 1];
          let angle = Math.atan2(node.y - prev.y, node.x - prev.x) - Math.PI / 2;
          angle = Math.max(-0.85, Math.min(0.85, angle));

          const w = sp.teardrop.w * s;
          const h = sp.teardrop.h * s;
          const anchorY = sp.teardrop.anchorY * s;

          this.ctx.translate(node.x, node.y);
          this.ctx.rotate(angle);
          this.ctx.drawImage(sp.teardrop.canvas, -w / 2, -anchorY, w, h);
        } else if (node.type === 'olive') {
          const prev = r > 0 ? nodes[r - 1] : node;
          const next = r < len - 1 ? nodes[r + 1] : node;
          let angle = Math.atan2(next.y - prev.y, next.x - prev.x) - Math.PI / 2;
          angle = Math.max(-0.7, Math.min(0.7, angle));

          const w = sp.olive.w * s;
          const h = sp.olive.h * s;
          this.ctx.translate(node.x, node.y);
          this.ctx.rotate(angle);
          this.ctx.drawImage(sp.olive.canvas, -w / 2, -h / 2, w, h);
        } else {
          const sprite = sp[node.type] || sp.spacer;
          const w = sprite.w * s;
          const h = sprite.h * s;
          this.ctx.drawImage(sprite.canvas, node.x - w / 2, node.y - h / 2, w, h);
        }

        // 动态折射十字星芒
        if (node.layer === 'front') {
          const isMajor = node.type === 'pearl' || node.type === 'teardrop' || node.type === 'olive';
          const ambientTwinkle = isMajor
            ? Math.max(0, Math.sin(now * 0.0026 + node.glintSeed) - 0.72) * 2.5
            : 0;
          const motionGlint = Math.min(1.2, Math.max(0, (node.speed - 0.85) * 0.25));
          const glintStrength = Math.max(ambientTwinkle, motionGlint);

          if (glintStrength > 0.08) {
            const size = sp.sparkle.w * (0.4 + glintStrength * 0.45) * s;
            const offsetY = (node.type === 'teardrop' ? 13 : -1.5) * s;
            this.ctx.globalAlpha = Math.min(1, glintStrength) * node.alpha;
            this.ctx.drawImage(
              sp.sparkle.canvas,
              node.x - size / 2 - 1 * s,
              node.y + offsetY - size / 2,
              size,
              size
            );
          }
        }

        this.ctx.restore();
      }
    }

    // 8. 渲染散落水晶星芒粒子
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(this.ctx, sp, globalScale);
    }

    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new CrystalCurtainApp();
});
