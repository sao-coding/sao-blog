'use client'

import React from 'react'
import createGlobe from 'cobe'
import { motion, useInView, useSpring } from 'motion/react'

const LocationCard = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const pointerInteracting = React.useRef<number | null>(null)
  const pointerInteractionMovement = React.useRef(0)
  const ref = React.useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const fadeMask =
    'radial-gradient(circle at 50% 50%, rgb(0,0,0) 55%, rgba(0,0,0,0) 78%)'

  const r = useSpring(0, {
    stiffness: 200,
    damping: 40,
    mass: 1,
    restDelta: 0.0001,
    restSpeed: 0.0001,
  })

  React.useEffect(() => {
    let width = 0

    const onResize = () => {
      if (canvasRef.current && (width = canvasRef.current.offsetWidth)) {
        window.addEventListener('resize', onResize)
      }
    }
    onResize()

    if (!canvasRef.current) return

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 1.08,
      theta: -0.1,
      dark: 1,
      diffuse: 1.6,
      mapSamples: 36_000,
      mapBrightness: 2,
      baseColor: [0.55, 0.55, 0.55],
      markerColor: [244 / 255, 63 / 255, 94 / 255],
      glowColor: [0.18, 0.18, 0.2],
      markers: [{ location: [25.136379, 121.4590044], size: 0.1 }],
      scale: 1.05,
      onRender: (state) => {
        state.phi = r.get() + 2.75
        state.width = width * 2
        state.height = width * 2
      },
    })

    return () => {
      globe.destroy()
    }
  }, [r])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 24 }}
      transition={{ duration: 0.6 }}
    >
      <header className="mb-6">
        <p className="text-[11px] tracking-[0.3em] text-neutral-10/40 uppercase">
          Whereabouts
        </p>
        <h2 className="mt-1 text-2xl font-light tracking-wide text-neutral-10/80">
          座標
        </h2>
      </header>

      <div className="flex items-center gap-6">
        <div className="relative aspect-square w-40 shrink-0 lg:w-48">
          <div
            className="absolute inset-0"
            style={{ WebkitMaskImage: fadeMask, maskImage: fadeMask }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => {
                pointerInteracting.current =
                  e.clientX - pointerInteractionMovement.current
                canvasRef.current &&
                  (canvasRef.current.style.cursor = 'grabbing')
              }}
              onPointerUp={() => {
                pointerInteracting.current = null
                canvasRef.current && (canvasRef.current.style.cursor = 'grab')
              }}
              onPointerOut={() => {
                pointerInteracting.current = null
                canvasRef.current && (canvasRef.current.style.cursor = 'grab')
              }}
              onPointerOver={() => {
                canvasRef.current && (canvasRef.current.style.cursor = 'grab')
              }}
              onMouseMove={(e) => {
                if (pointerInteracting.current !== null) {
                  const delta = e.clientX - pointerInteracting.current
                  pointerInteractionMovement.current = delta
                  r.set(delta / 200)
                }
              }}
              onTouchMove={(e) => {
                if (pointerInteracting.current !== null && e.touches[0]) {
                  const delta =
                    e.touches[0].clientX - pointerInteracting.current
                  pointerInteractionMovement.current = delta
                  r.set(delta / 100)
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                contain: 'layout paint size',
                cursor: 'auto',
                userSelect: 'none',
              }}
            />
          </div>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-lg font-light text-neutral-10/80">
            <span className="size-1.5 rounded-full bg-primary" />
            臺灣
          </p>
          <p className="mt-1 text-xs tracking-widest text-neutral-10/40 uppercase">
            Taiwan · UTC+8
          </p>
          <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-neutral-10/50">
            目前在這座島嶼上，寫程式、看動漫，偶爾記下一些想法。
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default LocationCard
