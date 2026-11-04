'use client'
import React, { useEffect, useRef, useState } from 'react'
import { BoxesIcon, RotateCcwIcon, UngroupIcon } from 'lucide-react'
import { m } from '#/paraglide/messages'
import { flattenItems } from './children'

// 3D 模型預覽（.3mf / .stl）：
// - three.js 很大，只在用到的文章、捲到附近時才動態載入，SSR 不碰
// - 3MF / STL 都是 Z 軸朝上（列印平台），轉成 three 的 Y 朝上
// - 多個零件（<ModelPart>）各自落在平台上、沿 X 軸排開，避免匯出時都在原點而疊在一起
// - 背景透明直接放在紙上；沒有顏色的部分依序用調色盤

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

type ModelColor = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'pink'
// 偏灰、低彩度，放在宣紙上不刺眼
const PALETTE: Record<ModelColor, number> = {
  blue: 0x5b7a99,
  green: 0x6f8a62,
  amber: 0xc49a4a,
  red: 0xb5452f,
  purple: 0x7d6b94,
  pink: 0xc0848a,
}
const DEFAULT_ORDER = [0xb8b2a7, 0x5b7a99, 0xc49a4a, 0x6f8a62, 0x7d6b94]

export interface MdxModelPartProps {
  src: string
  color?: ModelColor
}

/** Model3D 裡的一個零件，需放在 <Model3D> 內 */
export const MdxModelPart = (_: MdxModelPartProps) => null
MdxModelPart.displayName = 'MdxModelPart'

type PartSpec = { src: string; color?: number }

const isPart = (c: React.ReactNode): c is React.ReactElement<MdxModelPartProps> =>
  React.isValidElement(c) &&
  (c.type === MdxModelPart || (c.type as { displayName?: string })?.displayName === 'MdxModelPart')

export interface MdxModel3DProps {
  src?: string
  color?: ModelColor
  caption?: string
  /** 多零件時一開始的排法：separate（排開，預設）／assembled（照檔案座標組好） */
  layout?: Layout
  children?: React.ReactNode
}

type Layout = 'separate' | 'assembled'

/**
 * ```mdx
 * <Model3D src="/uploads/benchy.3mf" caption="3DBenchy" />
 *
 * <Model3D caption="ESP32-C3 外殼">
 *   <ModelPart src="/uploads/box.stl" />
 *   <ModelPart src="/uploads/lid.stl" color="red" />
 * </Model3D>
 * ```
 */
export const MdxModel3D = ({ src, color, caption, layout = 'separate', children }: MdxModel3DProps) => {
  const parts: PartSpec[] = [
    ...(src ? [{ src, color: color && PALETTE[color] }] : []),
    ...flattenItems(children)
      .filter(isPart)
      .map((p) => ({ src: p.props.src, color: p.props.color && PALETTE[p.props.color] })),
  ]
  // 依內容當 effect 的 key，避免每次 render 產生新陣列就重載
  const partsKey = JSON.stringify(parts)
  const ref = useRef<HTMLDivElement>(null)
  const resetRef = useRef<() => void>(() => {})
  const [state, setState] = useState<State>({ status: 'loading' })
  const [layoutState, setLayoutState] = useState<Layout>(layout)
  // three 那邊讀最新值、改目標位置用（不讓切換觸發重載）
  const layoutRef = useRef<Layout>(layout)
  const setLayoutRef = useRef<(l: Layout) => void>(() => {})
  const toggleLayout = () => {
    const next = layoutRef.current === 'assembled' ? 'separate' : 'assembled'
    layoutRef.current = next
    setLayoutRef.current(next)
    setLayoutState(next)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    let cleanup = () => {}

    const render = async () => {
      try {
        const specs = JSON.parse(partsKey) as PartSpec[]
        if (specs.length === 0) throw new Error('missing src')
        const isStl = (u: string) => /\.stl($|[?#])/i.test(u)
        const [THREE, { ThreeMFLoader }, { STLLoader }, { OrbitControls }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/3MFLoader.js'),
          import('three/examples/jsm/loaders/STLLoader.js'),
          import('three/examples/jsm/controls/OrbitControls.js'),
        ])

        const loadPart = async ({ src: url, color: c }: PartSpec, i: number) => {
          const fallback = c ?? DEFAULT_ORDER[i % DEFAULT_ORDER.length]
          let obj: InstanceType<typeof THREE.Object3D>
          if (isStl(url)) {
            const geo = await new STLLoader().loadAsync(url)
            geo.computeVertexNormals()
            obj = new THREE.Mesh(
              geo,
              new THREE.MeshStandardMaterial({ color: fallback, roughness: 0.75, metalness: 0.05 }),
            )
          } else {
            obj = await new ThreeMFLoader().loadAsync(url)
            // 沒有材質顏色的 mesh 給預設色；有指定 color 就覆蓋
            obj.traverse((o) => {
              const mesh = o as InstanceType<typeof THREE.Mesh>
              if (!mesh.isMesh) return
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
              for (const mat of mats as InstanceType<typeof THREE.MeshStandardMaterial>[]) {
                if (c != null || (!mat.vertexColors && mat.color?.getHex() === 0xffffff)) mat.color?.set(fallback)
              }
            })
          }
          obj.traverse((o) => {
            const mesh = o as InstanceType<typeof THREE.Mesh>
            if (!mesh.isMesh) return
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach((mat) => (mat.side = THREE.DoubleSide))
          })
          // Z 朝上 → Y 朝上
          const holder = new THREE.Group()
          obj.rotation.x = -Math.PI / 2
          holder.add(obj)
          return holder
        }

        const loaded = await Promise.all(specs.map(loadPart))
        if (cancelled) return

        const group = new THREE.Group()
        loaded.forEach((h) => group.add(h))
        const boxes = loaded.map((h) => new THREE.Box3().setFromObject(h))

        // 「分開」：每個零件 XZ 置中、底部貼平台，然後沿 X 排開
        const gap = 0.3
        let cursor = 0
        const widths = boxes.map((b) => b.max.x - b.min.x)
        const total = widths.reduce((a, b) => a + b, 0)
        const spacing = (total / loaded.length) * gap
        const separate = boxes.map((b, i) => {
          const c = b.getCenter(new THREE.Vector3())
          const p = new THREE.Vector3(cursor + widths[i] / 2 - c.x, -b.min.y, -c.z)
          cursor += widths[i] + spacing
          return p
        })
        // 「組裝」：照檔案原本的座標（零件需從同一個組裝檔匯出），整組底部貼平台
        const union = boxes.reduce((u, b) => u.union(b), new THREE.Box3())
        const assembled = boxes.map(() => new THREE.Vector3(0, -union.min.y, 0))

        // 兩種排法各自置中到原點
        const centerOf = (pos: InstanceType<typeof THREE.Vector3>[]) => {
          const u = new THREE.Box3()
          boxes.forEach((b, i) => u.union(b.clone().translate(pos[i])))
          const c = u.getCenter(new THREE.Vector3())
          pos.forEach((p) => p.sub(c))
          return u.getSize(new THREE.Vector3()).length()
        }
        const size = Math.max(centerOf(separate), centerOf(assembled)) || 1

        let targets = layoutRef.current === 'assembled' ? assembled : separate
        loaded.forEach((h, i) => h.position.copy(targets[i]))
        setLayoutRef.current = (l) => {
          targets = l === 'assembled' ? assembled : separate
        }

        const scene = new THREE.Scene()
        scene.add(group)
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 2.2))
        const sun = new THREE.DirectionalLight(0xffffff, 2)
        sun.position.set(1, 2, 1.5)
        scene.add(sun)

        const camera = new THREE.PerspectiveCamera(40, 1, size / 100, size * 100)
        const home = new THREE.Vector3(0.6, 0.45, 0.8).normalize().multiplyScalar(size * 1.6)
        camera.position.copy(home)

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x000000, 0)
        el.replaceChildren(renderer.domElement)
        renderer.domElement.style.touchAction = 'none'

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.enablePan = false
        controls.minDistance = size * 0.3
        controls.maxDistance = size * 5

        const resize = () => {
          const { width, height } = el.getBoundingClientRect()
          if (!width || !height) return
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }
        const ro = new ResizeObserver(resize)
        ro.observe(el)
        resize()

        // 只在看得到時跑動畫迴圈
        let visible = true
        const vis = new IntersectionObserver((es) => (visible = es.some((e) => e.isIntersecting)))
        vis.observe(el)
        renderer.setAnimationLoop(() => {
          if (!visible) return
          // 組裝／分開之間平滑移動
          loaded.forEach((h, i) => h.position.lerp(targets[i], 0.12))
          controls.update()
          renderer.render(scene, camera)
        })

        resetRef.current = () => {
          camera.position.copy(home)
          controls.target.set(0, 0, 0)
          controls.update()
        }

        cleanup = () => {
          renderer.setAnimationLoop(null)
          ro.disconnect()
          vis.disconnect()
          controls.dispose()
          group.traverse((o) => {
            const mesh = o as InstanceType<typeof THREE.Mesh>
            if (!mesh.isMesh) return
            mesh.geometry.dispose()
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach((mat) => mat.dispose())
          })
          renderer.dispose()
        }
        setState({ status: 'ready' })
      } catch (e) {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          void render()
        }
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
      cleanup()
    }
  }, [partsKey])

  return (
    <figure className="not-prose my-8">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
        {/* ref 這層只放 three 的 canvas（不給 React 管子節點） */}
        <div
          ref={ref}
          role="img"
          aria-label={caption}
          className="absolute inset-0 cursor-grab active:cursor-grabbing [&>canvas]:block [&>canvas]:size-full"
        />
        {state.status === 'loading' && <div className="excalidraw-placeholder absolute inset-0 aspect-auto" />}
        {state.status === 'ready' && (
          <>
            <div className="absolute top-2 right-2 flex gap-1">
              {parts.length > 1 && (
                <button
                  type="button"
                  onClick={toggleLayout}
                  aria-pressed={layoutState === 'assembled'}
                  className="flex items-center gap-1 rounded-md bg-background/70 px-2 py-1.5 text-xs text-muted-foreground backdrop-blur transition hover:text-foreground"
                >
                  {layoutState === 'assembled' ? (
                    <UngroupIcon className="size-4" />
                  ) : (
                    <BoxesIcon className="size-4" />
                  )}
                  {layoutState === 'assembled' ? m.model3d_separate() : m.model3d_assemble()}
                </button>
              )}
              <button
                type="button"
                onClick={() => resetRef.current()}
                aria-label={m.model3d_reset()}
                title={m.model3d_reset()}
                className="rounded-md bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition hover:text-foreground"
              >
                <RotateCcwIcon className="size-4" />
              </button>
            </div>
            <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/70">
              {m.model3d_hint()}
            </p>
          </>
        )}
      </div>
      {state.status === 'error' && (
        <p className="text-center text-sm text-destructive">
          {m.model3d_error()}
          {state.message}
        </p>
      )}
      {caption && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  )
}
