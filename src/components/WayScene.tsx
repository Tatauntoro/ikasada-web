"use client";

import type { CSSProperties } from "react";

/**
 * Procedural 3D scenes for the "three ways" timeline, built with CSS 3D
 * transforms so there is no model file or library to load. Each variant maps
 * to the value of its step: a rotating card carousel for the alumni directory,
 * an event cube for activities, and an open book for the passing on of
 * knowledge. The scenes are decorative and hidden from assistive tech.
 */
type Variant = "direktori" | "kegiatan" | "estafet";

const CARD_ANGLES = [0, 60, 120, 180, 240, 300];
const CUBE = 88;
const CUBE_HALF = CUBE / 2;

function Line({
  width,
  opacity = 0.16,
}: {
  width: string;
  opacity?: number;
}) {
  return (
    <div
      style={{
        height: 6,
        width,
        borderRadius: 4,
        background: `rgba(158,207,180,${opacity})`,
      }}
    />
  );
}

function DirectoryScene() {
  return (
    <div className="way-scene__spin" style={{ transform: "rotateX(-14deg)" }}>
      {CARD_ANGLES.map((angle) => (
        <div
          key={angle}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 74,
            height: 98,
            marginLeft: -37,
            marginTop: -49,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderRadius: 10,
            background: "rgba(24,65,50,0.94)",
            border: "1px solid rgba(158,207,180,0.3)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
            transform: `rotateY(${angle}deg) translateZ(86px)`,
            backfaceVisibility: "hidden",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#c9c9cf",
            }}
          />
          <Line width="82%" opacity={0.22} />
          <Line width="58%" opacity={0.14} />
          <div
            style={{
              marginTop: "auto",
              height: 6,
              width: "44%",
              borderRadius: 4,
              background: "#5e5e5e",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function EventScene() {
  const faces: { transform: string; front?: boolean }[] = [
    { transform: `translateZ(${CUBE_HALF}px)`, front: true },
    { transform: `rotateY(180deg) translateZ(${CUBE_HALF}px)` },
    { transform: `rotateY(90deg) translateZ(${CUBE_HALF}px)` },
    { transform: `rotateY(-90deg) translateZ(${CUBE_HALF}px)` },
    { transform: `rotateX(90deg) translateZ(${CUBE_HALF}px)` },
    { transform: `rotateX(-90deg) translateZ(${CUBE_HALF}px)` },
  ];

  return (
    <div className="way-scene__spin" style={{ transform: "rotateX(-14deg)" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: CUBE,
          height: CUBE,
          marginLeft: -CUBE_HALF,
          marginTop: -CUBE_HALF,
          transformStyle: "preserve-3d",
        }}
      >
        {faces.map((face, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 10,
              overflow: "hidden",
              background: "rgba(24,65,50,0.94)",
              border: "1px solid rgba(158,207,180,0.3)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.24)",
              transform: face.transform,
            }}
          >
            {face.front && (
              <div
                style={{ display: "flex", flexDirection: "column", height: "100%" }}
              >
                <div style={{ height: 22, background: "#5e5e5e" }} />
                <div
                  style={{
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                  }}
                >
                  <Line width="70%" opacity={0.22} />
                  <Line width="50%" opacity={0.14} />
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#c9c9cf",
                      }}
                    />
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#5e5e5e",
                      }}
                    />
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "rgba(158,207,180,0.35)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function KnowledgeScene() {
  const page: CSSProperties = {
    position: "absolute",
    top: 0,
    width: 75,
    height: 100,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "rgba(24,65,50,0.96)",
    border: "1px solid rgba(158,207,180,0.3)",
  };

  return (
    <div className="way-scene__sway" style={{ transform: "rotateX(-16deg)" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 150,
          height: 100,
          marginLeft: -75,
          marginTop: -50,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          style={{
            ...page,
            left: 0,
            transformOrigin: "right center",
            transform: "rotateY(26deg)",
            borderRadius: "8px 0 0 8px",
          }}
        >
          <Line width="80%" opacity={0.22} />
          <Line width="64%" />
          <Line width="72%" />
        </div>
        <div
          style={{
            ...page,
            right: 0,
            transformOrigin: "left center",
            transform: "rotateY(-26deg)",
            borderRadius: "0 8px 8px 0",
          }}
        >
          <Line width="70%" opacity={0.22} />
          <Line width="80%" />
          <Line width="56%" />
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -4,
            width: 2,
            height: "104%",
            marginLeft: -1,
            background: "rgba(158,207,180,0.35)",
          }}
        />
      </div>
    </div>
  );
}

export default function WayScene({ variant }: { variant: Variant }) {
  return (
    <div className="way-scene" aria-hidden="true">
      <div className="way-scene__stage">
        {variant === "direktori" && <DirectoryScene />}
        {variant === "kegiatan" && <EventScene />}
        {variant === "estafet" && <KnowledgeScene />}
      </div>
    </div>
  );
}
