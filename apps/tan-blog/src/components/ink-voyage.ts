import * as THREE from 'three'
import { createInkBoat } from './ink-boat'
import { createInkTorii } from './ink-torii'
import { DOLLY_EVENT, consumePullOut, type DollyDetail } from '@/lib/ink-push'

// 首頁主視覺的 3D 層：沿江夜航的水墨山水（three.js）。
// - 地形由噪聲即時產生：江道蜿蜒，兩岸稜線加上桂林式孤峰；三個區塊在鏡頭前方輪替，永遠走不到盡頭
// - 不畫天空：遠處與霧化成透明，透出 .ink-landscape 原本的天色、星點與燈籠
// - 顏色全部從 CSS 變數讀（--mtn-near、--mtn-far、--cloud、--season），晝夜與節氣切換即時跟上
// - 山的設色依季節採中國畫的四季畫法：春「青綠」、夏「濃墨」、秋「淺絳」、冬「雪景」
// - 互動：滑鼠滑過水面留下細紋、點水面泛起漣漪
// - 捲動時鏡頭往前推並略為俯視；離開畫面或分頁隱藏時停止繪製；prefers-reduced-motion 只畫一張靜態畫面

type Season = 'spring' | 'summer' | 'autumn' | 'winter'

interface SeasonStyle {
  wash: string // 設色（礦物色）
  washAmt: number
  snow: number
  mist: number
}

const SEASON_STYLES: Record<Season, SeasonStyle> = {
  spring: { wash: 'oklch(0.66 0.08 165)', washAmt: 0.55, snow: 0, mist: 1 }, // 青綠
  summer: { wash: 'oklch(0.42 0.06 150)', washAmt: 0.45, snow: 0, mist: 0.8 }, // 濃墨潑染
  autumn: { wash: 'oklch(0.62 0.11 50)', washAmt: 0.6, snow: 0, mist: 1 }, // 淺絳
  winter: { wash: 'oklch(0.72 0.02 240)', washAmt: 0.15, snow: 1, mist: 1.1 }, // 雪景寒林
}

// 白露、寒露、霜降：霧特別濃
const MISTY_TERMS = new Set([16, 18, 19])

/* ---- 地形噪聲 ---- */
function hash(x: number, y: number) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function vnoise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  let fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
function fbm(x: number, y: number, octaves = 5) {
  let v = 0
  let a = 0.5
  for (let i = 0; i < octaves; i++) {
    v += a * vnoise(x, y)
    x = x * 2.03 + 17.1
    y = y * 2.03 + 9.2
    a *= 0.5
  }
  return v
}
function ridged(x: number, y: number) {
  let v = 0
  let a = 0.5
  for (let i = 0; i < 5; i++) {
    const n = 1 - Math.abs(2 * vnoise(x, y) - 1)
    v += a * n * n
    x = x * 2.1 + 3.3
    y = y * 2.1 + 7.7
    a *= 0.5
  }
  return v
}
function smooth(a: number, b: number, x: number) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}
const riverX = (z: number) => Math.sin(z * 0.006) * 30 + Math.sin(z * 0.017 + 1.3) * 10
function height(x: number, z: number) {
  const dx = Math.abs(x - riverX(z))
  const bank = smooth(30, 95, dx)
  let h = bank * (8 + ridged(x * 0.008, z * 0.008) * 95)
  const k = vnoise(x * 0.022 + 40, z * 0.022) // 孤峰
  h += bank * Math.pow(Math.max(0, k - 0.55) / 0.45, 1.5) * 150 * smooth(45, 110, dx)
  h += fbm(x * 0.08, z * 0.08, 3) * 4 * bank
  return h - 1.5
}

const NOISE_GLSL = /* glsl */ `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}`

const VERTEX = /* glsl */ `
varying vec3 vW; varying vec3 vN;
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`

// 輸出 premultiplied alpha：霧越濃越透明，露出 CSS 畫的天空
const TERRAIN_FRAGMENT = /* glsl */ `
uniform vec3 uInk,uFar,uMistCol,uWash,uSnowCol,uRimCol,uCam;
uniform float uFog,uMist,uWashAmt,uSnow,uDark;
varying vec3 vW; varying vec3 vN;
${NOISE_GLSL}
void main(){
  vec3 N=normalize(vN), V=normalize(uCam-vW);
  float h=vW.y, slope=1.-N.y;
  float cun=fbm(vec2(vW.x*.18+vW.z*.06, vW.y*.7));            // 皴法：沿坡面的縱向筆觸
  float tone=.15+.55*smoothstep(4.,70.,h)+slope*.45*cun;
  float rim=pow(1.-abs(dot(N,V)),2.2);
  tone+=rim*.75*(1.-uDark);                                     // 晝：輪廓勾線加深
  tone*=.65+.7*fbm(vW.xz*.04);
  tone=clamp(tone,0.,1.);
  vec3 col=mix(uFar,uInk,tone);
  // 設色：迎光的坡面與山腰刷上礦物色
  float lit=clamp(dot(N,normalize(vec3(-.5,.7,.3))),0.,1.);
  float wm=uWashAmt*lit*smoothstep(3.,30.,h)*(1.-smoothstep(60.,110.,h))*(.6+.8*fbm(vW.xz*.03+3.));
  col=mix(col,uWash,clamp(wm,0.,1.));
  // 雪景：平緩的高處積雪
  float sm=uSnow*smoothstep(.45,.78,N.y+.15*cun)*smoothstep(3.,14.,h)*(.75+.5*fbm(vW.xz*.2));
  sm=max(sm,uSnow*smoothstep(55.,95.,h)*.85);                    // 高峰覆雪
  col=mix(col,uSnowCol,clamp(sm*1.5,0.,1.));
  col=mix(col,uRimCol,uDark*rim*.55*smoothstep(2.,20.,h));       // 夜：稜線被月光勾亮
  float dist=length(uCam-vW);
  float fog=1.-exp(-dist*uFog);
  float mist=(1.-smoothstep(0.,26.,h))*.88*uMist;               // 山腳雲霧
  col=mix(col,uMistCol,clamp(mist,0.,1.));
  float a=1.-fog;
  gl_FragColor=vec4(col*a,a);
}`

const WATER_FRAGMENT = /* glsl */ `
uniform vec3 uWater,uLine,uCam,uLampCol; uniform float uFog,uTime; uniform vec4 uBoat; uniform vec3 uLamp; uniform vec4 uRip[8];
varying vec3 vW;
${NOISE_GLSL}
void main(){
  float n=fbm(vec2(vW.x*.05, vW.z*.45+uTime*.35));
  float line=smoothstep(.6,.64,n)*(1.-smoothstep(.64,.72,n));
  float fog=1.-exp(-length(uCam-vW)*uFog*1.3);
  vec3 col=mix(uWater,uLine,line*.35);
  // 船尾的 V 字水痕與船身周圍的漣漪
  vec2 rel=vW.xz-uBoat.xy, dir=uBoat.zw;
  float back=-dot(rel,dir), side=dot(rel,vec2(-dir.y,dir.x));
  float wake=0.;
  if(back>0.){wake=exp(-abs(abs(side)-back*.34)*3.)*exp(-back*.045)*(.55+.45*sin(back*2.6-uTime*3.));wake+=exp(-abs(side)*2.2)*exp(-back*.12)*.5;}
  float rr=length(rel)-2.7;
  wake+=exp(-rr*rr*2.5)*.35*(.6+.4*sin(uTime*1.7));
  col=mix(col,uLine,clamp(wake*.55,0.,.8)*(1.-fog));
  // 點擊／滑過水面的漣漪：每個是 (x, z, 起始時間, 強度)，三圈往外擴散、漸漸平息
  float rip=0.;
  for(int i=0;i<8;i++){vec4 r=uRip[i];float t=uTime-r.z;if(r.w<=0.||t<0.||t>5.)continue;
    float d=length(vW.xz-r.xy);
    for(int j=0;j<3;j++){float x=d-t*(3.4-float(j)*.8);rip+=exp(-x*x*5.)*exp(-t*.75)*r.w*(1.-float(j)*.28);}}
  col=mix(col,uLine,clamp(rip*.6,0.,.85)*(1.-fog));
  // 燈籠在水面拉出的倒影光柱（朝鏡頭方向延伸、被水紋打碎）
  vec2 toCam=normalize(uCam.xz-uLamp.xy), lr=vW.xz-uLamp.xy;
  float along=dot(lr,toCam), across=dot(lr,vec2(-toCam.y,toCam.x));
  float ac=max(along,0.);
  float glow=uLamp.z*exp(-across*across*(6.+ac*.4))*exp(-ac*.18)*smoothstep(-1.5,0.,along)*(.5+.5*noise(vec2(along*2.5,uTime*2.)));
  col+=uLampCol*glow*uLamp.z*.6;
  float a=1.-fog;
  gl_FragColor=vec4(col*a,a);
}`

const CH_L = 400
const CH_W = 760

export interface InkVoyage {
  refresh: () => void
  dispose: () => void
}

// 用 canvas 把任意 CSS 顏色（oklch、color-mix…）換成 sRGB，直接當 shader 的顏色（不做色彩空間轉換）
function colorReader(host: HTMLElement) {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  return (css: string) => {
    probe.style.color = css
    host.appendChild(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000'
    ctx.fillStyle = resolved
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return new THREE.Color(r / 255, g / 255, b / 255)
  }
}

function lanternTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,240,200,1)')
  g.addColorStop(0.25, 'rgba(255,190,110,.8)')
  g.addColorStop(1, 'rgba(255,150,60,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

export function createInkVoyage(canvas: HTMLCanvasElement, host: HTMLElement, onSlow?: () => void): InkVoyage | undefined {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' })
  } catch {
    return undefined
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5))

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1400)

  const terrainU = {
    uInk: { value: new THREE.Color() },
    uFar: { value: new THREE.Color() },
    uMistCol: { value: new THREE.Color() },
    uWash: { value: new THREE.Color() },
    uSnowCol: { value: new THREE.Color() },
    uRimCol: { value: new THREE.Color() },
    uCam: { value: new THREE.Vector3() },
    uFog: { value: 0.006 },
    uMist: { value: 1 },
    uWashAmt: { value: 0 },
    uSnow: { value: 0 },
    uDark: { value: 1 },
  }
  const waterU = {
    uWater: { value: new THREE.Color() },
    uLine: { value: new THREE.Color() },
    uCam: terrainU.uCam,
    uFog: terrainU.uFog,
    uTime: { value: 0 },
    uBoat: { value: new THREE.Vector4(0, 0, 0, -1) },
    uLamp: { value: new THREE.Vector3() },
    uLampCol: { value: new THREE.Color(1, 0.72, 0.38) },
    uRip: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
  }
  const blend = { transparent: true, premultipliedAlpha: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor } as const
  const terrainMat = new THREE.ShaderMaterial({ uniforms: terrainU, vertexShader: VERTEX, fragmentShader: TERRAIN_FRAGMENT, ...blend, transparent: false })
  const waterMat = new THREE.ShaderMaterial({ uniforms: waterU, vertexShader: VERTEX, fragmentShader: WATER_FRAGMENT, ...blend, transparent: false })

  const chunks = [0, -CH_L, -CH_L * 2].map((zc) => {
    const g = new THREE.PlaneGeometry(CH_W, CH_L, 200, 110)
    g.rotateX(-Math.PI / 2)
    const m = new THREE.Mesh(g, terrainMat)
    scene.add(m)
    build(m, zc)
    return m
  })
  function build(m: THREE.Mesh, zc: number) {
    m.position.set(0, 0, zc)
    m.userData.zc = zc
    const pos = m.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i) + zc))
    pos.needsUpdate = true
    m.geometry.computeVertexNormals()
    m.geometry.computeBoundingSphere()
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), waterMat)
  scene.add(water)

  // 烏篷船（見 ink-boat.ts）
  const boat = createInkBoat(lanternTexture())
  boat.group.scale.setScalar(1.15)
  scene.add(boat.group)

  // 江中的朱色鳥居（見 ink-torii.ts）：是這段夜航遙遙的去處，跟船一樣停在前方；捲動時鏡頭往它推近
  const torii = createInkTorii()
  torii.group.scale.setScalar(1.45)
  scene.add(torii.group)
  const placeTorii = (z: number) => {
    torii.group.position.set(riverX(z) + 1, 0, z)
    // 斜斜地朝向下游，看得到稚児柱
    torii.group.rotation.y = Math.atan2(riverX(z + 1) - riverX(z), 1) + 0.42
  }

  const read = colorReader(host)
  function refresh() {
    const root = document.documentElement
    const dark = root.classList.contains('dark')
    const season = (root.dataset.season as Season) || 'autumn'
    const term = Number(root.dataset.term)
    const style = SEASON_STYLES[season] ?? SEASON_STYLES.autumn
    const ink = read('var(--mtn-near)')
    const far = read('var(--mtn-far)')
    const cloud = read('var(--cloud)')
    const accent = read('var(--season)')
    terrainU.uInk.value.copy(ink)
    terrainU.uFar.value.copy(far)
    terrainU.uMistCol.value.copy(dark ? far : cloud).lerp(accent, 0.1)
    const wash = read(style.wash)
    terrainU.uWash.value.copy(dark ? wash.multiplyScalar(0.45) : wash)
    terrainU.uWashAmt.value = style.washAmt
    terrainU.uSnow.value = style.snow
    terrainU.uSnowCol.value.copy(dark ? far.clone().lerp(cloud, 0.7) : cloud)
    terrainU.uMist.value = style.mist * (MISTY_TERMS.has(term) ? 1.3 : 1) * (dark ? 0.6 : 1)
    terrainU.uFog.value = (dark ? 0.0026 : 0.0024) * (MISTY_TERMS.has(term) ? 1.5 : 1)
    terrainU.uDark.value = dark ? 1 : 0
    terrainU.uRimCol.value.copy(far).lerp(cloud, 0.3).lerp(accent, 0.12)
    waterU.uWater.value.copy(dark ? read('var(--sky-top)').lerp(far, 0.12) : read('var(--background)'))
    waterU.uLine.value.copy(dark ? far.clone().lerp(cloud, 0.25) : ink)
    // 夜裡深墨剪影會融進江面：改成被月光照亮的淺灰剪影
    boat.setColors(dark ? far.clone().lerp(cloud, 0.35) : ink, dark ? new THREE.Color(1, 0.78, 0.45) : read('oklch(0.55 0.17 30)'), dark)
    waterU.uLamp.value.z = dark ? 1 : 0
    torii.setColors({
      vermilion: read('var(--zhu)').multiplyScalar(dark ? 0.6 : 1),
      cap: dark ? far.clone().multiplyScalar(0.6) : ink.clone(),
      edge: dark ? read('var(--sky-top)') : ink,
      mist: terrainU.uMistCol.value,
      rim: terrainU.uRimCol.value,
      dark,
    })
    if (!running) render()
  }

  let camZ = 120
  let scroll = 0
  let time = 0
  // 推近（0 → 1）：鏡頭順江往鳥居推進、略壓低，見 lib/ink-push.ts
  let dolly = 0
  function place() {
    const z = camZ - scroll * 0.06 - dolly * 62
    const cx = riverX(z)
    camera.position.set(cx, 10 + Math.sin(time * 0.4) * 0.3 - scroll * 0.004 - dolly * 3.5, z)
    camera.lookAt(riverX(z - 90), 9 - scroll * 0.015 - dolly * 2, z - 90)
    terrainU.uCam.value.copy(camera.position)
    water.position.set(cx, 0, z)
    // 推近時船不跟著鏡頭走：鏡頭從船旁經過，船往畫面外退開
    const bz = z + dolly * 62 - 40 + Math.sin(time * 0.12) * 3
    const bx = riverX(bz) + 5
    // 船斜泊江心、船頭偏向左岸，讓鏡頭看到側影（正對船尾只剩一個點）
    const yaw = Math.atan2(riverX(bz - 1) - riverX(bz), -1) + 1.15
    boat.group.position.set(bx, 0.05 + Math.sin(time * 1.6) * 0.05, bz)
    boat.group.rotation.set(Math.sin(time * 1.3) * 0.025, yaw, Math.sin(time * 1.1) * 0.04)
    boat.update(time)
    waterU.uBoat.value.set(bx, bz, Math.sin(yaw), Math.cos(yaw))
    waterU.uLamp.value.x = boat.lampWorld.x
    waterU.uLamp.value.y = boat.lampWorld.z
    placeTorii(camZ - 105)
    torii.update(time, camera.position, terrainU.uFog.value, boat.lampWorld, waterU.uLamp.value.z)
    // 地形區塊輪替：被拋在身後的區塊搬到最前方重建
    for (const m of chunks) {
      if (m.userData.zc - CH_L / 2 > z + 30) build(m, Math.min(...chunks.map((c) => c.userData.zc as number)) - CH_L)
    }
  }
  function render() {
    place()
    renderer.render(scene, camera)
  }

  function resize() {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    if (!running) render()
  }

  let running = false
  let visible = true
  let last = 0
  // 手機（觸控）只畫 30fps 省電；開頭幾秒量一下幀率，跑不動就交回 ink-landscape 的靜態山水
  const frameBudget = coarse ? 1000 / 30 - 2 : 0
  let probeFrames = 0
  let probeStart = 0
  function loop(now: number) {
    if (!running) return
    if (now - last < frameBudget) {
      requestAnimationFrame(loop)
      return
    }
    const dt = Math.min((now - last) / 1000, 1 / 30)
    last = now
    if (onSlow && time > 1 && probeFrames >= 0) {
      if (probeFrames++ === 0) probeStart = now
      else if (now - probeStart > 4000) {
        const fps = (probeFrames - 1) / ((now - probeStart) / 1000)
        probeFrames = -1
        if (fps < 20) {
          onSlow()
          return
        }
      }
    }
    time += dt
    camZ -= 2.2 * dt // 船行很慢，像看一幅長卷
    waterU.uTime.value = time
    render()
    requestAnimationFrame(loop)
  }
  function update() {
    const should = !reduced && visible && document.visibilityState === 'visible'
    if (should && !running) {
      running = true
      last = performance.now()
      requestAnimationFrame(loop)
    } else if (!should) running = false
  }

  const onScroll = () => {
    scroll = Math.min(window.scrollY, window.innerHeight)
    if (!running) render()
  }
  // 推近／拉遠：往裡走先慢後快（被江水帶進去），往外走先快後慢
  let dollyRaf = 0
  function animateDolly(to: number, ms: number) {
    const from = dolly
    const t0 = performance.now()
    const ease = to > from ? (t: number) => t * t : (t: number) => 1 - Math.pow(1 - t, 3)
    cancelAnimationFrame(dollyRaf)
    const tick = (now: number) => {
      const t = ms > 0 ? Math.min((now - t0) / ms, 1) : 1
      dolly = from + (to - from) * ease(t)
      if (!running) render()
      if (t < 1) dollyRaf = requestAnimationFrame(tick)
    }
    dollyRaf = requestAnimationFrame(tick)
  }
  const onDolly = (e: Event) => {
    const { to, ms } = (e as CustomEvent<DollyDetail>).detail
    animateDolly(to, ms)
  }
  window.addEventListener(DOLLY_EVENT, onDolly)
  if (consumePullOut() && !reduced) {
    dolly = 1
    animateDolly(0, 1400)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(host)
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    update()
  })
  io.observe(host)
  // 晝夜（.dark）與節氣（data-term / data-season）切換
  const mo = new MutationObserver(refresh)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-term', 'data-season'] })
  document.addEventListener('visibilitychange', update)
  window.addEventListener('scroll', onScroll, { passive: true })

  /* ---- 互動 ---- */
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  let ripIndex = 0
  let lastTrail = 0
  const ripple = (x: number, z: number, strength: number) => {
    waterU.uRip.value[ripIndex++ % 8].set(x, z, time, strength)
  }
  // 點在連結、按鈕等元件上的不算；只處理落在主視覺範圍內的指標
  const aim = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest?.('a,button,input,textarea,select,label,[role="button"],[contenteditable]')) return false
    const r = host.getBoundingClientRect()
    if (e.clientY < r.top || e.clientY > r.bottom) return false
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    return true
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!aim(e)) return
    // 滑過水面留下細細的水紋
    const now = performance.now()
    if (e.pointerType === 'mouse' && now - lastTrail > 160 && ray.ray.intersectPlane(waterPlane, hit) && hit.distanceTo(camera.position) < 160) {
      lastTrail = now
      ripple(hit.x, hit.z, 0.3)
    }
  }
  const onPointerDown = (e: PointerEvent) => {
    if (!aim(e)) return
    if (ray.ray.intersectPlane(waterPlane, hit) && hit.distanceTo(camera.position) < 400) ripple(hit.x, hit.z, 1)
  }
  if (!reduced) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
  }

  resize()
  refresh()
  update()

  return {
    refresh,
    dispose() {
      running = false
      cancelAnimationFrame(dollyRaf)
      window.removeEventListener(DOLLY_EVENT, onDolly)
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          o.geometry.dispose()
          const mat = o.material as THREE.Material & { map?: THREE.Texture | null }
          mat.map?.dispose()
          mat.dispose()
        }
      })
      renderer.dispose()
    },
  }
}
