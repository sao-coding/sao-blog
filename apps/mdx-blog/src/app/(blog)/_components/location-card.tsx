"use client";

import React from "react";
import createGlobe from "cobe";
import { motion, useInView, useSpring } from "motion/react";
import { MapPinIcon } from "lucide-react";

const LocationCard = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const pointerInteracting = React.useRef<number | null>(null);
  const pointerInteractionMovement = React.useRef(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const fadeMask =
    "radial-gradient(circle at 50% 50%, rgb(0, 0, 0) 60%, rgb(0, 0, 0, 0) 70%)";

  const r = useSpring(0, {
    stiffness: 200,
    damping: 40,
    mass: 1,
    restDelta: 0.0001,
    restSpeed: 0.0001,
  });

  React.useEffect(() => {
    let width = 0;

    const onResize = () => {
      if (canvasRef.current && (width = canvasRef.current.offsetWidth)) {
        window.addEventListener("resize", onResize);
      }
    };
    onResize();

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 1.08,
      theta: -0.1,
      dark: 1,
      diffuse: 2,
      mapSamples: 36_000,
      mapBrightness: 2,
      baseColor: [0.8, 0.8, 0.8],
      markerColor: [235 / 255, 35 / 255, 35 / 255],
      glowColor: [0.5, 0.5, 0.5],
      markers: [{ location: [25.136379, 121.4590044], size: 0.1 }],
      scale: 1.05,
      onRender: (state) => {
        state.phi = r.get() + 2.75;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    return () => {
      globe.destroy();
    };
  }, [r]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
      transition={{ duration: 0.5 }}
      className="relative h-full w-full"
    >
      <div className="relative h-60 w-full overflow-hidden rounded-3xl bg-black/50 p-4 md:h-80">
        <div className="flex items-center gap-2">
          <MapPinIcon />
          <h2 className="text-sm font-light">臺灣</h2>
        </div>
        <div
          style={{
            width: "100%",
            aspectRatio: "1/1",
            maxWidth: 800,
            // WebkitMaskImage: fadeMask,
            // maskImage: fadeMask
          }}
          className="absolute inset-0"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              pointerInteracting.current =
                e.clientX - pointerInteractionMovement.current;
              canvasRef.current &&
                (canvasRef.current.style.cursor = "grabbing");
            }}
            onPointerUp={() => {
              pointerInteracting.current = null;
              canvasRef.current && (canvasRef.current.style.cursor = "grab");
            }}
            onPointerOut={() => {
              pointerInteracting.current = null;
              canvasRef.current && (canvasRef.current.style.cursor = "grab");
            }}
            onPointerOver={() => {
              canvasRef.current && (canvasRef.current.style.cursor = "grab");
            }}
            onMouseMove={(e) => {
              if (pointerInteracting.current !== null) {
                const delta = e.clientX - pointerInteracting.current;
                pointerInteractionMovement.current = delta;
                r.set(delta / 200);
              }
            }}
            onTouchMove={(e) => {
              if (pointerInteracting.current !== null && e.touches[0]) {
                const delta = e.touches[0].clientX - pointerInteracting.current;
                pointerInteractionMovement.current = delta;
                r.set(delta / 100);
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              contain: "layout paint size",
              cursor: "auto",
              userSelect: "none",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LocationCard;
