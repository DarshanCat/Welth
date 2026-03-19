"use client";

import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function AntigravityBg() {
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
      options={{
        fullScreen: { enable: false, zIndex: 0 },
        background: { color: { value: "transparent" } },
        fpsLimit: 120,
        interactivity: {
          events: {
            onHover: { enable: true, mode: "repulse", parallax: { enable: true, force: 60, smooth: 10 } },
            onClick: { enable: true, mode: "push" },
          },
          modes: {
            repulse: { distance: 150, duration: 0.4 },
            push: { quantity: 15 },
          },
        },
        particles: {
          color: { value: ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#A142F4", "#22d3ee"] },
          move: {
            direction: "none",
            enable: true,
            outModes: { default: "out" },
            random: true,
            speed: 1.5,
            straight: false,
            trail: { enable: true, length: 3, fillColor: "transparent" }
          },
          number: {
            density: { enable: true, width: 1920, height: 1080 },
            value: 260,
          },
          opacity: {
            value: { min: 0.1, max: 0.8 },
            animation: { enable: true, speed: 1.5, minimumValue: 0.1 }
          },
          shape: {
            type: ["circle", "triangle"],
          },
          size: {
            value: { min: 1, max: 4.5 },
            animation: { enable: true, speed: 2, minimumValue: 0.5 }
          },
        },
        detectRetina: true,
      }}
    />
  );
}
