/* =========================================================================
   main.js - 珠雨流霖：9:16 实体水晶珠帘主控流水线与可配置参数
   ========================================================================= */

window.CONFIG = {
  // 1. 造型与景深开关 (第3、4项均可一键切换/撤回)
  layoutMode: 'hat',          // 'hat': 参考图帽檐流瀑 | 'staggered': 均匀错落 | 'uniform': 等长整齐
  enableBackLayer: false,     // 第4项独立开关：是否开启后景半透明衬底珠链 (默认关，可一键开启对比)
  breakMode: 'fall',          // 'fall': 重力下坠 | 'float': 向上飘散 | 'unbreakable': 只摆动不断裂
  beadScale: 1.0,             // 珠子整体大小缩放倍率 (0.5 ~ 2.5)

  // 2. 物理引擎参数
  gravity: 0.34,              // 垂直重力
  stiffness: 0.88,            // 珠链刚度
  damping: 0.976,             // 空气阻尼
  constraintIterations: 6,    // 约束迭代次数 (保障“留白长丝+紧密珠簇”结构稳定)

  // 3. 鼠标风场与断裂阈值
  mouseRadius: 115,           // 鼠标推力作用半径 (px)
  breakThreshold: 76,         // 珠链拉断基础临界距离 (px)
  shakeBreakSpeed: 44,        // 快速划过打散的速度阈值
  grabDistance: 34,           // 拖拽抓取判定半径 (px)

  // 4. 珠帘密度与粒子上限
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

  // 伪随机确定性哈希 (保证每次切换模式时排布自然但稳定不乱跳)
  seededRand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * 构建单根珠链：实现第1、2项核心美学
   * “长丝留白 (24~42px) + 紧密子母珠簇 (5.5~7.5px) + 末端托珠与大小切面水滴吊坠”
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

      // 留白银丝长度：24px ~ 42px 不等
      const bareGap = 24 + r1 * 18;
      curY += bareGap;
      if (curY >= endY - 26) break;

      // 从 4 种珠宝串珠单元 (Motif) 中按确定性韵律挑选一种
      const motifType = Math.floor(r2 * 4);

      if (motifType === 0 && curY + 14 < endY - 22) {
        // Motif A: 【子母主珠结】小托珠 + 大圆珠 + 小托珠 (间距 7px 紧贴)
        const pearlScale = 0.92 + r1 * 0.24;
        addNode(curY, 'spacer', false, 0.9);
        addNode(curY + 7, 'pearl', false, pearlScale);
        addNode(curY + 14, 'spacer', false, 0.9);
        curY += 14;
      } else if (motifType === 1 && curY + 11 < endY - 22) {
        // Motif B: 【微尘三连露珠】3 颗细小露珠紧密连缀 (间距 5.5px)
        addNode(curY, 'dew', false, 1.0);
        addNode(curY + 5.5, 'dew', false, 1.05);
        addNode(curY + 11, 'dew', false, 0.95);
        curY += 11;
      } else if (motifType === 2 && curY + 13 < endY - 22) {
        // Motif C: 【梭形凝露结】微露珠 + 竖长梭形米珠 + 微露珠
        addNode(curY, 'dew', false, 0.95);
        addNode(curY + 6.5, 'olive', false, 1.0);
        addNode(curY + 13, 'dew', false, 0.95);
        curY += 13;
      } else {
        // Motif D: 【双生轻露珠】小托珠 + 微尘露珠成对出现
        addNode(curY, 'spacer', false, 0.95);
        addNode(curY + 6, 'dew', false, 1.0);
        curY += 6;
      }

      segIdx++;
    }

    // 3. 链尾收束：小珠托 + 切面水滴吊坠 (长链配大水滴，短链配小巧水滴)
    const lenRatio = targetLen / maxLen;
    const dropScale = lenRatio > 0.72 ? 1.08 : (lenRatio > 0.48 ? 0.92 : 0.78);

    addNode(endY - 7.5, 'spacer', false, 0.9 * dropScale);
    addNode(endY, 'teardrop', false, dropScale);

    this.chains.push({ nodes: colNodes, links: colLinks, layer });
  }

  /**
   * 计算各列的水平坐标 X、起点 Y 与垂落长度 (根据 chainCount 自适应列距)
   */
  getColumnSpecs(cols, maxLen, mode) {
    const specs = [];
    const marginX = 24;
    const usableW = Math.max(80, this.width - marginX * 2);
    const baseSpacing = cols > 1 ? usableW / (cols - 1) : 0;
    const baseStartX = cols > 1 ? marginX : this.width / 2;

    // 参考图帽檐流瀑的左长右短高低轮廓表 (左侧如瀑布深垂到底，中右侧长短交错如帽纱)
    const hatLengthRatios = [
      0.92, 0.76, 0.96, 0.62, 0.86, 0.48, 0.78, 0.34,
      0.58, 0.28, 0.68, 0.40, 0.74, 0.32, 0.60, 0.82, 0.46
    ];
    // 横向成束疏密偏移 (按当前列距比例自适应缩放，防止高密度时相邻链条重叠)
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
        // 模式 1：等长整齐
        targetLen = maxLen;
      } else if (mode === 'staggered') {
        // 模式 2：均匀错落 (左右等距，长短交替)
        const stepOffsets = [0.95, 0.54, 0.80, 0.42, 0.88, 0.62, 0.72];
        const wave = 0.5 + 0.5 * Math.sin(c * 2.15 + 0.6);
        const ratio = Math.max(0.36, Math.min(0.98, stepOffsets[c % stepOffsets.length] * 0.78 + wave * 0.2));
        targetLen = Math.round(maxLen * ratio);
      } else if (mode === 'hat') {
        // 模式 3：参考图帽檐流瀑 (成束疏密列距 + 微弧帽檐顶线 + 左长右短大跨度流瀑)
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

    // 1. 若开启第4项“后景深”，先生成后景半透明内层珠链 (穿插在前景列缝隙之间)
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

    // 2. 生成前景主珠链
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

    // 1. 排布造型切换 (参考图流瀑 / 均匀错落 / 等长整齐)
    document.querySelectorAll('.hud-btn[data-layout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hud-btn[data-layout]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.CONFIG.layoutMode = btn.dataset.layout;
        this.buildCurtain();
        this.sound.chime(0.8);
      });
    });

    // 2. 第4项独立开关：后景深层 (开 / 关)
    const backLayerBtn = document.getElementById('backLayerBtn');
    backLayerBtn.addEventListener('click', () => {
      window.CONFIG.enableBackLayer = !window.CONFIG.enableBackLayer;
      backLayerBtn.classList.toggle('active', window.CONFIG.enableBackLayer);
      backLayerBtn.textContent = window.CONFIG.enableBackLayer ? '后景深: 开' : '后景深: 关';
      this.buildCurtain();
      this.sound.chime(0.75);
    });

    // 3. 打散模式切换 (重力下坠 / 向上飘散 / 不断裂)
    document.querySelectorAll('.hud-btn[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hud-btn[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.CONFIG.breakMode = btn.dataset.mode;
        this.restoreCurtain();
      });
    });

    // 4. 链条密度实时调节滑块 (6 ~ 40 根)
    const chainSlider = document.getElementById('chainCountSlider');
    const chainVal = document.getElementById('chainCountVal');
    chainSlider.addEventListener('input', (e) => {
      const count = parseInt(e.target.value, 10);
      window.CONFIG.chainCount = count;
      chainVal.textContent = count + '根';
      this.buildCurtain();
    });

    // 5. 珠子大小实时调节滑块 (0.15x ~ 2.5x)
    const scaleSlider = document.getElementById('beadScaleSlider');
    const scaleVal = document.getElementById('beadScaleVal');
    scaleSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.CONFIG.beadScale = val;
      scaleVal.textContent = val.toFixed(2).replace(/\.00$/, '.0') + 'x';
    });

    document.getElementById('resetBtn').addEventListener('click', () => this.restoreCurtain());
  }

  animate() {
    const cfg = window.CONFIG;
    const globalScale = cfg.beadScale;

    // 1. 光标风场交互
    if (this.pointer.active) {
      this.pointer.vx = this.pointer.x - this.pointer.oldX;
      this.pointer.vy = this.pointer.y - this.pointer.oldY;
      this.pointer.oldX = this.pointer.x;
      this.pointer.oldY = this.pointer.y;

      const speed = Math.hypot(this.pointer.vx, this.pointer.vy);

      if (this.pointer.grabbedNode) {
        this.pointer.grabbedNode.x = this.pointer.x;
        this.pointer.grabbedNode.y = this.pointer.y;
        if (speed > 42 && cfg.breakMode !== 'unbreakable') {
          this.breakNearby(this.pointer.x, this.pointer.y, 48);
        }
      } else {
        const r = cfg.mouseRadius;
        const rSq = r * r;
        const px = this.pointer.x, py = this.pointer.y;
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
            // 后景层受风力略轻柔，形成前后视差摆动
            const layerFactor = node.layer === 'back' ? 0.65 : 1.0;
            const force = ((1 - dist / r) / Math.sqrt(node.mass)) * layerFactor;
            node.x += (dx / dist) * force * 8.5 + this.pointer.vx * force * 0.42;
            node.y += (dy / dist) * force * 5.0 + this.pointer.vy * force * 0.38;
            touched++;

            if (speed > cfg.shakeBreakSpeed && dist < 36) {
              if (cfg.breakMode === 'unbreakable') {
                if (Math.random() < 0.25) {
                  this.spawnParticles(node.x, node.y, 1, this.pointer.vx, this.pointer.vy);
                }
              } else {
                this.breakNearby(node.x, node.y, 32);
              }
            }
          }
        }
        if (touched > 2 && speed > 5) {
          this.sound.chime(Math.min(1, speed / 28));
        }
      }
    }

    // 2. 物理步进与距离约束求解
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

    // 3. 散落微粒更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(cfg.gravity);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }

    // 4. 渲染纯黑背景 (#000000)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 5. 渲染珠链银丝连接线 (区分前后景透明度，且线宽随珠子大小自适应收细)
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

    // 6. 渲染 5 种实体水晶珠与动态星芒
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
          // 竖长梭形米珠顺应丝线切线方向倾斜
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
          // 'pearl' | 'spacer' | 'dew'
          const sprite = sp[node.type] || sp.spacer;
          const w = sprite.w * s;
          const h = sprite.h * s;
          this.ctx.drawImage(sprite.canvas, node.x - w / 2, node.y - h / 2, w, h);
        }

        // 动态折射十字星芒 (前景主珠与水滴吊坠闪烁更明显)
        if (node.layer === 'front') {
          const isMajor = node.type === 'pearl' || node.type === 'teardrop' || node.type === 'olive';
          const ambientTwinkle = isMajor
            ? Math.max(0, Math.sin(now * 0.0026 + node.glintSeed) - 0.72) * 2.5
            : 0;
          const motionGlint = Math.min(1.2, Math.max(0, (node.speed - 1.05) * 0.22));
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

    // 7. 渲染散落水晶星芒粒子
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(this.ctx, sp, globalScale);
    }

    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new CrystalCurtainApp();
});
