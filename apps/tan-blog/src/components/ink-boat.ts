import * as THREE from 'three'

// 首頁主視覺裡的烏篷船：船身兩頭翹起、中段兩節竹篷，船頭坐著披蓑戴笠的釣翁（釣竿與垂入水中的釣線），
// 船尾一支櫓、一根燈桿掛著紙燈籠。全部是單色剪影（MeshBasic），跟遠山一樣只靠輪廓說話。
// 船頭朝本地 +z。

// 船身：沿船長取一連串半圓剖面，兩端收窄、舷線（sheer）往上翹
function hullGeometry(length = 4.2) {
  const N = 28
  const M = 12
  const pos: number[] = []
  const index: number[] = []
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * 2 - 1 // -1 船尾 … 1 船頭
    const k = 1 - t * t
    const w = 0.6 * Math.pow(k, 0.55) + 0.03
    const d = 0.36 * Math.pow(k, 0.4) + 0.02
    const sheer = 0.12 + 0.42 * Math.pow(Math.abs(t), 3) * (t > 0 ? 1.15 : 1)
    for (let j = 0; j <= M; j++) {
      const a = Math.PI * (j / M)
      pos.push(-Math.cos(a) * w, sheer - Math.sin(a) * d, (t * length) / 2)
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j
      const b = a + M + 1
      index.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(index)
  return g
}

// 半圓竹篷：軸沿 z，弧面朝上
function hoodGeometry(radius: number, length: number) {
  return new THREE.CylinderGeometry(radius, radius, length, 18, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2)
}

export interface InkBoat {
  group: THREE.Group
  // 燈籠在世界座標的位置（給水面倒影用）
  lampWorld: THREE.Vector3
  setColors: (ink: THREE.Color, lantern: THREE.Color, lit: boolean) => void
  update: (time: number) => void
  dispose: () => void
}

export function createInkBoat(glow: THREE.Texture): InkBoat {
  const group = new THREE.Group()
  const ink = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xb8432a })
  const lineMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 })

  const hull = new THREE.Mesh(hullGeometry(), ink)

  const hoodA = new THREE.Mesh(hoodGeometry(0.56, 1.1), ink)
  hoodA.position.set(0, 0.16, -0.55)
  const hoodB = new THREE.Mesh(hoodGeometry(0.5, 0.7), ink)
  hoodB.position.set(0, 0.14, 0.32)

  // 釣翁：坐姿身形＋蓑衣＋頭＋斗笠
  const angler = new THREE.Group()
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.62, 12, 1, true), ink)
  cape.position.y = 0.42
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), ink)
  head.position.y = 0.8
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.15, 20), ink)
  hat.position.y = 0.9
  angler.add(cape, head, hat)
  angler.position.set(0, 0.08, 1.15)

  // 釣竿：手邊往前上方彎出去的細竿，釣線垂入水中（整組以手的位置為原點）
  const hand = new THREE.Vector3(0.12, 0.62, 1.3)
  const rodCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.33, 1.28, 1.1),
    new THREE.Vector3(0.93, 1.63, 2.3),
  )
  const rod = new THREE.Mesh(new THREE.TubeGeometry(rodCurve, 16, 0.014, 4), ink)
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.93, 1.63, 2.3), new THREE.Vector3(1, -0.67, 2.45)])
  const fishingLine = new THREE.Line(lineGeo, lineMat)
  const rodGroup = new THREE.Group()
  rodGroup.position.copy(hand)
  rodGroup.add(rod, fishingLine)

  // 櫓：從船尾斜插入水
  const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 2.4, 6), ink)
  oar.position.set(0.15, 0.25, -2.55)
  oar.rotation.x = -1.05

  // 燈桿＋燈籠
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 5), ink)
  post.position.set(-0.32, 0.85, -1.35)
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 5), ink)
  arm.rotation.z = Math.PI / 2
  arm.position.set(-0.15, 1.48, -1.35)
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.17, 10), lanternMat)
  lantern.position.set(0.02, 1.33, -1.35)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  halo.scale.setScalar(1.5)
  halo.position.copy(lantern.position)

  group.add(hull, hoodA, hoodB, angler, rodGroup, oar, post, arm, lantern, halo)

  const lampWorld = new THREE.Vector3()
  return {
    group,
    lampWorld,
    setColors(inkColor, lanternColor, lit) {
      ink.color.copy(inkColor)
      lineMat.color.copy(inkColor)
      lanternMat.color.copy(lanternColor)
      halo.visible = lit
    },
    update(time) {
      // 燈籠隨船輕晃；光暈微微呼吸
      lantern.rotation.z = Math.sin(time * 1.7) * 0.12
      halo.material.opacity = 0.85 + Math.sin(time * 2.3) * 0.1
      group.updateMatrixWorld()
      lantern.getWorldPosition(lampWorld)
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Sprite) o.geometry.dispose()
      })
      ink.dispose()
      lanternMat.dispose()
      lineMat.dispose()
      halo.material.dispose()
    },
  }
}
