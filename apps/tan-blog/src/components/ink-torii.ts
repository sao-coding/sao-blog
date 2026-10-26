import * as THREE from 'three'

// 首頁江中的朱色鳥居：照嚴島神社的海上大鳥居（兩部鳥居）——
// 笠木兩端上翹、上覆黑色，下有島木；貫穿出柱外；正中額束；主柱前後各一支稚児柱，以橫木相連。
// 不打光、不寫實：用跟山一樣的墨法上色——
// - 朱是一筆一筆刷上去的：沿構件的長向有乾筆的筆絲，筆絲稀處露出紙（飛白）
// - 輪廓與背光面積墨，像勾線；柱腳化進江霧
// - 夜裡：燈籠的暖光映在朝船那一面；江面有一道被水紋打碎的倒影
// 本地座標：柱子沿 y、笠木沿 x、正面朝 +z，柱腳在 y=0（水面）。

const VERTEX = /* glsl */ `
uniform float uTime,uMirror;
varying vec3 vW; varying vec3 vN; varying vec3 vL;
void main(){
  vL=position;
  vec4 w=modelMatrix*vec4(position,1.);
  // 倒影：越往下（離水面越遠）被水紋扯得越碎
  if(uMirror>.5){float d=-w.y;w.x+=sin(d*1.7+uTime*1.3)*d*.05+sin(d*5.3-uTime*2.1)*.07;}
  vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*w;
}`

const FRAGMENT = /* glsl */ `
uniform vec3 uCol,uEdge,uMistCol,uCam,uLampCol,uRimCol,uAlong;
uniform vec4 uLamp;
uniform float uFog,uDark,uMirror,uTime;
varying vec3 vW; varying vec3 vN; varying vec3 vL;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}
void main(){
  vec3 N=normalize(vN), V=normalize(uCam-vW);
  // 筆絲：沿構件長向拉長的噪聲
  float al=dot(vL,uAlong), ac=dot(vL,cross(uAlong,vec3(.31,.53,.79)));
  float hair=fbm(vec2(ac*9.,al*.35));
  float tone=.8+.5*(hair-.5)+.25*(fbm(vec2(al*.6,ac*2.))-.5);
  vec3 col=uCol*tone;
  // 勾線：輪廓與背光的面積墨
  float rim=pow(1.-abs(dot(N,V)),1.6);
  float shade=clamp(dot(N,normalize(vec3(.5,.3,.8))),0.,1.);
  col=mix(col,uEdge,clamp(rim*.75+(1.-shade)*.22,0.,1.));
  // 夜：月光勾亮稜線、燈籠映在朝船的那一面
  col=mix(col,uRimCol,uDark*rim*.35);
  vec3 toL=uLamp.xyz-vW; float dl=length(toL);
  float lit=uLamp.w*clamp(dot(N,toL/dl)*.7+.3,0.,1.)*exp(-dl*.014);
  col+=uLampCol*lit*1.1;
  // 飛白：筆絲稀的地方露出紙
  float a=smoothstep(.28,.5,hair+.1);
  // 柱腳化進江霧
  float y=abs(vW.y);
  col=mix(col,uMistCol,(1.-smoothstep(0.,3.5,y))*.75);
  a*=smoothstep(-.3,1.4,y);
  if(uMirror>.5){
    // 倒影：淡、被水紋切成橫向的碎片，往下漸漸消失
    float br=noise(vec2(vW.x*.8,vW.y*3.-uTime*.9));
    a*=.65*smoothstep(.25,.55,br)*(1.-smoothstep(1.,8.,-vW.y));
  }
  float fog=1.-exp(-length(uCam-vW)*uFog);
  a*=1.-fog;
  if(a<.004) discard;
  gl_FragColor=vec4(col*a,a);
}`

export interface ToriiColors {
  vermilion: THREE.Color
  cap: THREE.Color // 笠木上的黑
  edge: THREE.Color // 勾線的墨
  mist: THREE.Color
  rim: THREE.Color
  dark: boolean
}

export interface InkTorii {
  group: THREE.Group
  setColors: (c: ToriiColors) => void
  // 每幀：鏡頭、霧、燈籠（世界座標＋亮度）
  update: (time: number, cam: THREE.Vector3, fog: number, lamp: THREE.Vector3, lampOn: number) => void
  dispose: () => void
}

// 笠木：兩端上翹（反り）、斷面上寬下窄
function kasagiGeometry(len: number) {
  const g = new THREE.BoxGeometry(len, 0.62, 0.86, 48, 2, 2)
  const pos = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const t = Math.abs(x) / (len / 2)
    const top = pos.getY(i) > 0
    pos.setY(i, pos.getY(i) + Math.pow(t, 2.6) * 0.75 + (top ? Math.pow(t, 3) * 0.12 : 0))
    if (!top) pos.setZ(i, pos.getZ(i) * 0.8)
  }
  g.computeVertexNormals()
  return g
}

export function createInkTorii(): InkTorii {
  const group = new THREE.Group()
  const reflection = new THREE.Group()
  reflection.scale.y = -1

  const shared = {
    uEdge: { value: new THREE.Color() },
    uMistCol: { value: new THREE.Color() },
    uCam: { value: new THREE.Vector3() },
    uLampCol: { value: new THREE.Color(1, 0.62, 0.3) },
    uRimCol: { value: new THREE.Color() },
    uLamp: { value: new THREE.Vector4() },
    uFog: { value: 0.003 },
    uDark: { value: 0 },
    uTime: { value: 0 },
  }
  const materials: THREE.ShaderMaterial[] = []
  const mat = (col: THREE.Color, along: THREE.Vector3, mirror: boolean) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...shared, uCol: { value: col }, uAlong: { value: along }, uMirror: { value: mirror ? 1 : 0 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      premultipliedAlpha: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthWrite: !mirror,
      // 倒影在水面之下，要畫在不透明的江面之上
      depthTest: !mirror,
      side: mirror ? THREE.BackSide : THREE.FrontSide,
    })
    materials.push(m)
    return m
  }
  const vermilion = new THREE.Color()
  const cap = new THREE.Color()
  const Y = new THREE.Vector3(0, 1, 0)
  const X = new THREE.Vector3(1, 0, 0)
  const Z = new THREE.Vector3(0, 0, 1)

  type Part = [THREE.BufferGeometry, THREE.Color, THREE.Vector3, [number, number, number], number?]
  const parts: Part[] = []
  // 主柱：略向內傾（転び）
  for (const s of [-1, 1]) {
    parts.push([new THREE.CylinderGeometry(0.34, 0.4, 8, 14, 6).translate(0, 4, 0), vermilion, Y, [s * 3.1, 0, 0], -s * 0.025])
    // 稚児柱與連接的橫木
    for (const f of [-1, 1]) parts.push([new THREE.CylinderGeometry(0.22, 0.25, 4.4, 10, 3).translate(0, 2.2, 0), vermilion, Y, [s * 3.1, 0, f * 1.7]])
    parts.push([new THREE.BoxGeometry(0.26, 0.3, 4.2, 1, 1, 8), vermilion, Z, [s * 3.08, 3.9, 0]])
    parts.push([new THREE.BoxGeometry(0.42, 0.36, 4.1, 1, 1, 8), cap, Z, [s * 3.08, 4.55, 0]])
  }
  parts.push([new THREE.BoxGeometry(9.4, 0.46, 0.32, 24), vermilion, X, [0, 5.9, 0]]) // 貫
  parts.push([new THREE.BoxGeometry(0.62, 1.05, 0.24), vermilion, Y, [0, 6.75, 0]]) // 額束
  parts.push([new THREE.BoxGeometry(10.8, 0.42, 0.62, 32), vermilion, X, [0, 7.42, 0]]) // 島木
  parts.push([kasagiGeometry(12.6), cap, X, [0, 7.95, 0]]) // 笠木

  for (const [geo, col, along, [x, y, z], tilt] of parts) {
    for (const [target, mirror] of [[group, false], [reflection, true]] as const) {
      const m = new THREE.Mesh(geo, mat(col, along, mirror))
      m.position.set(x, y, z)
      if (tilt) m.rotation.z = tilt
      if (mirror) m.renderOrder = 2
      target.add(m)
    }
  }
  group.add(reflection)

  return {
    group,
    setColors(c) {
      vermilion.copy(c.vermilion)
      cap.copy(c.cap)
      shared.uEdge.value.copy(c.edge)
      shared.uMistCol.value.copy(c.mist)
      shared.uRimCol.value.copy(c.rim)
      shared.uDark.value = c.dark ? 1 : 0
    },
    update(time, cam, fog, lamp, lampOn) {
      shared.uTime.value = time
      shared.uCam.value.copy(cam)
      shared.uFog.value = fog
      shared.uLamp.value.set(lamp.x, lamp.y, lamp.z, lampOn)
    },
    dispose() {
      const geos = new Set<THREE.BufferGeometry>()
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) geos.add(o.geometry)
      })
      for (const g of geos) g.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
