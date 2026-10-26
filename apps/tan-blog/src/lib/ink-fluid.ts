// 進站開場的墨水流體（WebGL2，半精度浮點貼圖上的穩定流體）。
// - 速度場：平流 → 渦度補強＋旋度噪聲 → 散度 → Jacobi 壓力投影；染料 r = 墨、g = 節氣色
// - 墨面是頁面底色（晝紙、夜夜色），只在墨流邊緣顯出墨色或節氣色，晝夜同一種畫法
// - 指標滑過時會攪動墨流（stir）
// - 退場依噪聲濃淡不均地「被水沖淡」
// 只在開場期間逐幀計算，結束後釋放。

const VSRC = `#version 300 es
precision highp float;
in vec2 aPosition; out vec2 vUv,vL,vR,vT,vB; uniform vec2 texelSize;
void main(){vUv=aPosition*.5+.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(aPosition,0.,1.);}`

const FH = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv,vL,vR,vT,vB; uniform vec2 texelSize; out vec4 o;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}
`

const FS = {
  splat: `uniform sampler2D uTarget;uniform float aspectRatio,radius;uniform vec3 color;uniform vec2 point;
    void main(){vec2 p=vUv-point;p.x*=aspectRatio;vec3 v=texture(uTarget,vUv).xyz+exp(-dot(p,p)/max(radius,1e-5))*color;o=vec4(any(isnan(v))?vec3(0):v,1.);}`,
  adv: `uniform sampler2D uVelocity,uSource;uniform float dt,dissipation;
    void main(){vec2 c=vUv-dt*texture(uVelocity,vUv).xy*texelSize;vec4 r=texture(uSource,c)/(1.+dissipation*dt);o=any(isnan(r))?vec4(0):r;}`,
  div: `uniform sampler2D uVelocity;
    void main(){float L=texture(uVelocity,vL).x,R=texture(uVelocity,vR).x,T=texture(uVelocity,vT).y,B=texture(uVelocity,vB).y;vec2 C=texture(uVelocity,vUv).xy;
    if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;o=vec4(.5*(R-L+T-B),0,0,1);}`,
  curl: `uniform sampler2D uVelocity;
    void main(){float L=texture(uVelocity,vL).y,R=texture(uVelocity,vR).y,T=texture(uVelocity,vT).x,B=texture(uVelocity,vB).x;o=vec4(.5*(R-L-T+B),0,0,1);}`,
  vort: `uniform sampler2D uVelocity,uCurl;uniform float curl,dt,uTime,uNoise;
    float pot(vec2 p){return noise(p)+.5*noise(p*2.03+17.1);}
    void main(){float L=texture(uCurl,vL).x,R=texture(uCurl,vR).x,T=texture(uCurl,vT).x,B=texture(uCurl,vB).x,C=texture(uCurl,vUv).x;
    vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;
    vec2 q=vUv*3.+vec2(uTime*.05,-uTime*.03);float e=.02;
    vec2 cn=vec2(pot(q+vec2(0,e))-pot(q-vec2(0,e)),-(pot(q+vec2(e,0))-pot(q-vec2(e,0))))/(2.*e);
    vec2 v=texture(uVelocity,vUv).xy+(f+cn*uNoise)*dt;o=vec4(clamp(v,-1000.,1000.),0,1);}`,
  pres: `uniform sampler2D uPressure,uDivergence;
    void main(){float L=texture(uPressure,vL).x,R=texture(uPressure,vR).x,T=texture(uPressure,vT).x,B=texture(uPressure,vB).x;o=vec4((L+R+B+T-texture(uDivergence,vUv).x)*.25,0,0,1);}`,
  grad: `uniform sampler2D uPressure,uVelocity;
    void main(){float L=texture(uPressure,vL).x,R=texture(uPressure,vR).x,T=texture(uPressure,vT).x,B=texture(uPressure,vB).x;o=vec4(texture(uVelocity,vUv).xy-vec2(R-L,T-B),0,1);}`,
  clear: `uniform sampler2D uTexture;uniform float value;void main(){o=value*texture(uTexture,vUv);}`,
  disp: `uniform sampler2D uDye;uniform vec3 uAccent,uBase,uEdge;uniform vec2 uCenter;uniform float uAspect,uCoverR,uReveal,uCoverOn,uTime,uSeed,uEdgeK,uEdgeMax,uAccentMix;
    void main(){
      vec2 asp=vec2(uAspect,1.);
      vec3 d=texture(uDye,vUv).rgb;
      vec2 tx=texelSize;
      vec2 g=vec2(texture(uDye,vUv+vec2(tx.x,0)).r-texture(uDye,vUv-vec2(tx.x,0)).r,texture(uDye,vUv+vec2(0,tx.y)).r-texture(uDye,vUv-vec2(0,tx.y)).r);
      float k=d.r+length(g)*2.6,ka=d.g;                              // 濕邊：墨在邊緣積聚
      vec2 p=(vUv-uCenter)*asp;
      vec2 q=p*2.2+uSeed;
      vec2 wv=vec2(fbm(q+uTime*.2),fbm(q+5.2-uTime*.17));
      float n=fbm(q*1.4+wv*2.6);
      float cover=smoothstep(uCoverR,uCoverR-.22,length(p)*(1.+(n-.5)*1.1))*uCoverOn;
      k+=cover*(3.5+4.*n);
      float n2=fbm(vUv*asp*1.8+uSeed*1.3);
      float fade=clamp(uReveal*1.8-n2*.8,0.,1.);
      k*=(1.-fade)*(1.-fade);ka*=1.-fade;
      float fiber=fbm(vUv*asp*vec2(260.,90.));
      k*=.78+.32*fiber+.18*noise(vUv*asp*620.);
      k=clamp(k,0.,40.);ka=clamp(ka,0.,40.);
      // 墨面是頁面底色（晝是紙、夜是夜色），墨流的邊緣才顯出墨色／節氣色，像墨流し的紋理
      float a=1.-exp(-k*1.7);
      float edge=clamp(length(g)*uEdgeK+(1.-exp(-ka))*.18,0.,uEdgeMax)*(1.-fade);
      vec3 ec=mix(uEdge,uAccent,clamp((1.-exp(-ka))*uAccentMix,0.,1.));
      o=vec4(mix(uBase,ec,edge),max(a,edge));
    }`,
}

type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }
type Fbo = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number; attach: (id: number) => number }
type DFbo = { w: number; h: number; tx: number; ty: number; read: Fbo; write: Fbo; swap: () => void }

type Rgb = [number, number, number]

export interface InkTheme {
  accent: Rgb
  // 墨面底色、墨紋顏色與濃度（晝：紙色＋墨色紋；夜：夜色＋微弱的節氣色光）
  base: Rgb
  edge: Rgb
  edgeK: number
  edgeMax: number
  accentMix: number
}

export interface InkFluid {
  // 進站開場：墨面先蓋滿，墨滴落下暈開；之後呼叫 reveal 被水沖淡、露出網站
  intro: (theme: InkTheme) => Promise<void>
  reveal: (ms?: number) => Promise<void>
  // 換頁的暈染：螢幕上 (px, py) 滴一滴墨，暈開到蓋滿畫面就 resolve；之後呼叫 reveal 洗淡
  spread: (theme: InkTheme, px: number, py: number, ms?: number) => Promise<void>
  // 指標移動（螢幕像素與位移）：動畫進行中才攪動墨流
  stir: (px: number, py: number, dx: number, dy: number) => void
  dispose: () => void
}

const SIM = 128
const DYE = 768
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function createInkFluid(canvas: HTMLCanvasElement): InkFluid | undefined {
  const ctx = canvas.getContext('webgl2', { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: false })
  if (!ctx || !(ctx.getExtension('EXT_color_buffer_float') || ctx.getExtension('EXT_color_buffer_half_float'))) return undefined
  const gl: WebGL2RenderingContext = ctx

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  let P: Record<keyof typeof FS, Program>
  try {
    const vs = compile(gl.VERTEX_SHADER, VSRC)
    const program = (src: string): Program => {
      const p = gl.createProgram()!
      gl.attachShader(p, vs)
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FH + src))
      gl.bindAttribLocation(p, 0, 'aPosition')
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link')
      const u: Program['u'] = {}
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i)!.name
        u[name] = gl.getUniformLocation(p, name)
      }
      return { p, u }
    }
    P = Object.fromEntries(Object.entries(FS).map(([k, v]) => [k, program(v)])) as typeof P
  } catch {
    return undefined
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(0)

  const fbo = (w: number, h: number): Fbo => {
    gl.activeTexture(gl.TEXTURE0)
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    const f = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return {
      tex, fbo: f, w, h,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        return id
      },
    }
  }
  const dfbo = (w: number, h: number): DFbo => {
    let a = fbo(w, h)
    let b = fbo(w, h)
    return { w, h, tx: 1 / w, ty: 1 / h, get read() { return a }, get write() { return b }, swap() { [a, b] = [b, a] } }
  }
  const textures: Fbo[] = []
  let velocity: DFbo, dye: DFbo, pressure: DFbo, divergence: Fbo, curl: Fbo
  const res = (r: number) => {
    let a = gl.drawingBufferWidth / gl.drawingBufferHeight
    if (a < 1) a = 1 / a
    const mn = Math.round(r)
    const mx = Math.round(r * a)
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? [mx, mn] : [mn, mx]
  }
  const freeTextures = () => {
    for (const t of textures.splice(0)) {
      gl.deleteTexture(t.tex)
      gl.deleteFramebuffer(t.fbo)
    }
  }
  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = Math.round(window.innerWidth * d)
    const h = Math.round(window.innerHeight * d)
    if (canvas.width === w && canvas.height === h && velocity) return
    canvas.width = w
    canvas.height = h
    freeTextures()
    const [sw, sh] = res(SIM)
    const [dw, dh] = res(DYE)
    velocity = dfbo(sw, sh)
    dye = dfbo(dw, dh)
    pressure = dfbo(sw, sh)
    divergence = fbo(sw, sh)
    curl = fbo(sw, sh)
    textures.push(velocity.read, velocity.write, dye.read, dye.write, pressure.read, pressure.write, divergence, curl)
  }

  const blit = (t: Fbo | null) => {
    if (t) {
      gl.viewport(0, 0, t.w, t.h)
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }
  const aspect = () => canvas.width / canvas.height
  const splatTo = (target: DFbo, x: number, y: number, c: [number, number, number], r: number) => {
    const s = P.splat
    gl.useProgram(s.p)
    gl.uniform1i(s.u.uTarget, target.read.attach(0))
    gl.uniform1f(s.u.aspectRatio, aspect())
    gl.uniform2f(s.u.point, x, y)
    gl.uniform3f(s.u.color, c[0], c[1], c[2])
    gl.uniform1f(s.u.radius, (r / 100) * Math.max(aspect(), 1))
    blit(target.write)
    target.swap()
  }
  const splatVel = (x: number, y: number, dx: number, dy: number, r: number) => splatTo(velocity, x, y, [dx, dy, 0], r)
  const splatDye = (x: number, y: number, c: [number, number, number], r: number) => splatTo(dye, x, y, c, r)
  const clearAll = () => {
    for (const f of textures) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo)
      gl.viewport(0, 0, f.w, f.h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }

  let densDiss = 0.25
  function step(dt: number, now: number) {
    gl.disable(gl.BLEND)
    const use = (k: keyof typeof FS) => {
      gl.useProgram(P[k].p)
      gl.uniform2f(P[k].u.texelSize, velocity.tx, velocity.ty)
      return P[k].u
    }
    let u = use('curl')
    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    blit(curl)
    u = use('vort')
    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    gl.uniform1i(u.uCurl, curl.attach(1))
    gl.uniform1f(u.curl, 34)
    gl.uniform1f(u.dt, dt)
    gl.uniform1f(u.uTime, now / 1000)
    gl.uniform1f(u.uNoise, 22)
    blit(velocity.write)
    velocity.swap()
    u = use('div')
    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    blit(divergence)
    u = use('clear')
    gl.uniform1i(u.uTexture, pressure.read.attach(0))
    gl.uniform1f(u.value, 0.8)
    blit(pressure.write)
    pressure.swap()
    u = use('pres')
    gl.uniform1i(u.uDivergence, divergence.attach(0))
    for (let i = 0; i < 20; i++) {
      gl.uniform1i(u.uPressure, pressure.read.attach(1))
      blit(pressure.write)
      pressure.swap()
    }
    u = use('grad')
    gl.uniform1i(u.uPressure, pressure.read.attach(0))
    gl.uniform1i(u.uVelocity, velocity.read.attach(1))
    blit(velocity.write)
    velocity.swap()
    u = use('adv')
    gl.uniform1f(u.dt, dt)
    const v = velocity.read.attach(0)
    gl.uniform1i(u.uVelocity, v)
    gl.uniform1i(u.uSource, v)
    gl.uniform1f(u.dissipation, 0.6)
    blit(velocity.write)
    velocity.swap()
    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    gl.uniform1i(u.uSource, dye.read.attach(1))
    gl.uniform1f(u.dissipation, densDiss)
    blit(dye.write)
    dye.swap()
  }

  const state = { center: [0.5, 0.5], coverR: 0, reveal: 0, coverOn: 0, seed: 0 }
  let theme: InkTheme = { accent: [0.74, 0.24, 0.13], base: [1, 1, 1], edge: [0, 0, 0], edgeK: 0.9, edgeMax: 0.55, accentMix: 0.6 }
  function render(now: number) {
    const u = P.disp.u
    gl.useProgram(P.disp.p)
    gl.uniform2f(u.texelSize, dye.tx, dye.ty)
    gl.uniform1i(u.uDye, dye.read.attach(0))
    gl.uniform3f(u.uAccent, ...theme.accent)
    gl.uniform3f(u.uBase, ...theme.base)
    gl.uniform3f(u.uEdge, ...theme.edge)
    gl.uniform1f(u.uEdgeK, theme.edgeK)
    gl.uniform1f(u.uEdgeMax, theme.edgeMax)
    gl.uniform1f(u.uAccentMix, theme.accentMix)
    gl.uniform1f(u.uAspect, aspect())
    gl.uniform2f(u.uCenter, state.center[0], state.center[1])
    gl.uniform1f(u.uCoverR, state.coverR)
    gl.uniform1f(u.uReveal, state.reveal)
    gl.uniform1f(u.uCoverOn, state.coverOn)
    gl.uniform1f(u.uTime, now / 1000)
    gl.uniform1f(u.uSeed, state.seed)
    blit(null)
  }

  // 只在動畫期間跑；每幀先呼叫 onFrame（加墨、推水），再模擬、繪製
  let active = 0
  let raf = 0
  let last = 0
  let onFrame: ((now: number) => void) | null = null
  function loop(now: number) {
    const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 60))
    last = now
    onFrame?.(now)
    step(dt, now)
    render(now)
    raf = active > 0 ? requestAnimationFrame(loop) : 0
  }
  function run(ms: number, fn: (t: number, now: number) => void) {
    return new Promise<void>((resolve) => {
      const t0 = performance.now()
      active++
      const prev = onFrame
      let done = false
      const finish = () => {
        if (done) return
        done = true
        active--
        onFrame = prev
        resolve()
      }
      // 最後一幀一定跑到 t = 1（覆蓋完整才換頁）
      onFrame = (now) => {
        prev?.(now)
        const t = Math.min((now - t0) / ms, 1)
        fn(t, now)
        if (t >= 1) finish()
      }
      if (!raf) {
        last = t0
        raf = requestAnimationFrame(loop)
      }
      // 分頁在背景或掉幀時 rAF 跟不上：保底直接跳到終點（覆蓋一定要蓋滿），不能卡住換頁
      window.setTimeout(() => {
        if (done) return
        fn(1, performance.now())
        finish()
      }, ms + 400)
    })
  }

  // 等待資料時：墨面上繼續緩緩落墨、翻湧
  let holding = false
  function hold() {
    holding = true
    let next = 0
    const tick = (now: number) => {
      if (!holding) return
      if (now > next) {
        const x = 0.3 + Math.random() * 0.4
        const y = 0.3 + Math.random() * 0.4
        splatDye(x, y, [0, 0.9, 0], 0.18)
        const ang = Math.random() * 6.28
        splatVel(x, y, Math.cos(ang) * 260, Math.sin(ang) * 260, 0.3)
        next = now + 500 + Math.random() * 400
      }
    }
    const prev = onFrame
    onFrame = (now) => {
      prev?.(now)
      tick(now)
    }
    active++
    if (!raf) {
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }
    return () => {
      holding = false
      active--
      onFrame = prev
    }
  }
  let release: (() => void) | null = null

  return {
    async intro(t) {
      theme = t
      resize()
      clearAll()
      densDiss = 0.12
      // 一開始就整面蓋滿（跟 CSS 墊底的那層同色），接手後才不會閃
      Object.assign(state, { center: [0.5, 0.5], coverR: 99, reveal: 0, coverOn: 1, seed: Math.random() * 50 })
      render(performance.now())
      release = hold()
      const a = aspect()
      // 三滴墨先後落下，各自炸開成不規則的墨紋
      for (const [cx, cy] of [[0.5, 0.56], [0.36, 0.42], [0.64, 0.4]]) {
        splatDye(cx, cy, [2.6, 0, 0], 0.2)
        for (let k = 0; k < 14; k++) {
          const ang = (k / 14) * 6.28 + Math.random()
          const s = 160 + Math.random() * 260
          splatVel(cx + (Math.cos(ang) * 0.03) / a, cy + Math.sin(ang) * 0.03, Math.cos(ang) * s, Math.sin(ang) * s, 0.03)
        }
        await new Promise((r) => window.setTimeout(r, 420))
      }
    },
    stir(px, py, dx, dy) {
      if (active <= 0) return
      const x = px / window.innerWidth
      const y = 1 - py / window.innerHeight
      splatVel(x, y, dx * 9, -dy * 9, 0.25)
      splatDye(x, y, [0.18, 0.06, 0], 0.06)
    },
    async spread(t, px, py, ms = 380) {
      theme = t
      resize()
      clearAll()
      densDiss = 0.4
      const a = aspect()
      const x = px / window.innerWidth
      const y = 1 - py / window.innerHeight
      // 暈到最遠的角落再多一圈，邊緣的噪聲起伏才不會在角落留下沒蓋到的紙
      const far = Math.hypot(Math.max(x, 1 - x) * a, Math.max(y, 1 - y)) + 0.45
      Object.assign(state, { center: [x, y], coverR: 0.04, reveal: 0, coverOn: 1, seed: Math.random() * 50 })
      splatDye(x, y, [2.2, 0.5, 0], 0.004)
      for (let k = 0; k < 10; k++) {
        const ang = (k / 10) * 6.28 + Math.random()
        const s = 200 + Math.random() * 220
        splatVel(x + (Math.cos(ang) * 0.02) / a, y + Math.sin(ang) * 0.02, Math.cos(ang) * s, Math.sin(ang) * s, 0.02)
      }
      await run(ms, (t) => {
        state.coverR = 0.04 + far * (1 - Math.pow(1 - t, 3))
      })
    },
    async reveal(ms = 1000) {
      release?.()
      release = null
      densDiss = 1.6
      await run(ms, (t) => {
        state.reveal = ease(t)
        if (Math.random() < 0.5) {
          const ang = Math.random() * 6.28
          splatVel(Math.random(), Math.random(), Math.cos(ang) * 250, Math.sin(ang) * 250, 0.3)
        }
      })
      state.coverOn = 0
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    },
    dispose() {
      cancelAnimationFrame(raf)
      freeTextures()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
