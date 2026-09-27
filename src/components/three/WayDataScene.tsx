"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useThreeScene } from "./useThreeScene";

type Props = {
  variant: "direktori" | "kegiatan";
  count: number;
  images: (string | null | undefined)[];
  progress: RefObject<number>;
  selected: RefObject<number | null>;
  buttons: RefObject<(HTMLButtonElement | null)[]>;
  onReady: (ready: boolean) => void;
};

/** HTML hit targets follow projected meshes, giving pointer, tap and keyboard
 * users the same selection without exposing inaccessible canvas-only controls. */
export default function WayDataScene({ variant, count, images, progress, selected, buttons, onReady }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const model = useRef<THREE.Group | null>(null);
  const nodes = useRef<THREE.Group[]>([]);
  const links = useRef<THREE.LineSegments | null>(null);
  const edges = useRef<[number, number][]>([]);
  const environment = useRef<THREE.WebGLRenderTarget | null>(null);
  const materials = useRef<THREE.Material[]>([]);
  const textures = useRef<THREE.Texture[]>([]);
  const scratch = useRef(new THREE.Vector3());
  const frozen = useRef({ x: 0, y: 0, time: 0, progress: .5 });
  const { failed } = useThreeScene(container, {
    init: ({ scene, renderer }) => {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      const room = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      environment.current = pmrem.fromScene(room, .06);
      scene.environment = environment.current.texture;
      room.dispose(); pmrem.dispose();
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe8f5ff, 1.8));
      const key = new THREE.DirectionalLight(0xffffff, 3);
      key.position.set(-3, 5, 4); scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 1.2);
      rim.position.set(4, 1, -2); scene.add(rim);
      const jade = new THREE.MeshPhysicalMaterial({ color: 0x1b1b1b, metalness: .42, roughness: .3, clearcoat: .7 });
      const sage = new THREE.MeshPhysicalMaterial({ color: 0x6fb6e8, metalness: .32, roughness: .36, clearcoat: .5 });
      const gold = new THREE.MeshPhysicalMaterial({ color: 0x555555, metalness: .75, roughness: .28 });
      const paper = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78 });
      materials.current = [jade, sage, gold, paper];
      const root = new THREE.Group();
      model.current = root; scene.add(root);
      nodes.current = []; edges.current = [];
      for (let i = 0; i < count; i++) {
        const node = new THREE.Group();
        const angle = i * Math.PI * 2 / count - Math.PI / 2;
        if (variant === "direktori") {
          const radius = count <= 8 ? 1.6 : (i % 2 ? 1.15 : 1.9);
          node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .85, Math.sin(angle * 2) * .48);
          const source = images[i];
          if (source) {
            const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .48 });
            materials.current.push(faceMaterial);
            const face = new THREE.Mesh(new THREE.CircleGeometry(.29, 32), faceMaterial);
            face.rotation.x = Math.PI / 2;
            face.position.z = 0;
            node.add(face);
            const texture = new THREE.TextureLoader().load(source, loaded => {
              loaded.colorSpace = THREE.SRGBColorSpace;
              loaded.needsUpdate = true;
            }, undefined, () => { face.visible = false; });
            textures.current.push(texture);
            faceMaterial.map = texture;
            faceMaterial.needsUpdate = true;
          }
        } else {
          node.position.set((i % 2 ? .88 : -.88), (i < 2 ? .92 : -.82), (i % 2 ? -.25 : .2));
          const ticket = new THREE.Mesh(new RoundedBoxGeometry(1.65, 1.35, .13, 3, .045), paper);
          node.add(ticket);
          const top = new THREE.Mesh(new RoundedBoxGeometry(1.5, .13, .035, 2, .01), jade);
          top.position.set(0, .5, .08); node.add(top);
          const face = new THREE.Mesh(new THREE.PlaneGeometry(1.47, .77), new THREE.MeshStandardMaterial({ color: 0xd4ecff, roughness: .7 }));
          face.position.set(0, -.05, .075); node.add(face);
          const source = images[i];
          if (source) {
            const texture = new THREE.TextureLoader().load(source, loaded => {
              const img = loaded.image as HTMLImageElement;
              const aspect = img.width / img.height;
              const target = 1.47 / .77;
              if (aspect > target) { loaded.repeat.x = target / aspect; loaded.offset.x = (1 - loaded.repeat.x) / 2; }
              else { loaded.repeat.y = aspect / target; loaded.offset.y = (1 - loaded.repeat.y) / 2; }
              loaded.needsUpdate = true;
            }, undefined, () => { face.visible = false; });
            texture.colorSpace = THREE.SRGBColorSpace;
            textures.current.push(texture);
            face.material.map = texture;
            face.material.color.set(0xffffff);
          }
          for (let j = 0; j < 3; j++) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(.55 - j * .1, .018, .025), gold);
            bar.position.set(-.4 + j * .4, -.52, .085); node.add(bar);
          }
          node.rotation.z = (i % 2 ? .12 : -.12);
        }
        node.userData.base = node.position.clone();
        nodes.current.push(node); root.add(node);
      }
      if (variant === "direktori" && count > 1) {
        for (let i = 0; i < count; i++) {
          edges.current.push([i, (i + 1) % count]);
          if (count > 4 && i % 2 === 0) edges.current.push([i, (i + 3) % count]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(edges.current.length * 6), 3));
        const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x5c6f68, transparent: true, opacity: .35 }));
        links.current = lines; root.add(lines);
      }
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.05, .013, 8, 100), gold);
      orbit.rotation.set(.6, -.25, -.3); orbit.position.z = -.5; root.add(orbit);
      root.position.y = .28;
      onReady(true);
    },
    update: ({ pointer, pointerActive, camera, container: el }, elapsed, delta) => {
      const root = model.current;
      if (!root) return;
      const chosen = selected.current;
      const pose = frozen.current;
      // Stable hit targets while reading a preview. Scroll resumes after dismissal.
      if (chosen === null) {
        pose.x = pointerActive ? THREE.MathUtils.clamp(pointer.x, -1, 1) : 0;
        pose.y = pointerActive ? THREE.MathUtils.clamp(pointer.y, -1, 1) : 0;
        pose.time = elapsed;
        pose.progress = progress.current;
      }
      const p = pose.progress;
      root.rotation.y = THREE.MathUtils.damp(root.rotation.y, -.25 + (p - .5) * .95 + pose.x * .2, 4, delta);
      root.rotation.x = THREE.MathUtils.damp(root.rotation.x, -.05 - pose.y * .14, 4, delta);
      const depth = Math.sin(p * Math.PI);
      root.position.z = THREE.MathUtils.damp(root.position.z, -.35 + depth * .7, 4, delta);
      const scale = .85 + depth * .15;
      root.scale.setScalar(scale);
      nodes.current.forEach((node, i) => {
        const base = node.userData.base as THREE.Vector3;
        const spread = variant === "kegiatan" ? 1.12 - depth * .12 : 1;
        node.position.set(base.x * spread, base.y + Math.sin(pose.time * .55 + i) * .035, base.z);
        node.scale.setScalar(THREE.MathUtils.damp(node.scale.x, chosen === i ? 1.13 : 1, 6, delta));
      });
      const lines = links.current;
      if (lines) {
        const position = lines.geometry.getAttribute("position") as THREE.BufferAttribute;
        edges.current.forEach(([a, b], index) => {
          const from = nodes.current[a].position, to = nodes.current[b].position;
          position.setXYZ(index * 2, from.x, from.y, from.z - .1);
          position.setXYZ(index * 2 + 1, to.x, to.y, to.z - .1);
        });
        position.needsUpdate = true;
        lines.geometry.computeBoundingSphere();
      }
      // Fit the same composition on narrow tablets without cropping the orbit.
      camera.position.z = Math.max(7, 5.5 / camera.aspect);
      camera.updateMatrixWorld();
      root.updateMatrixWorld(true);
      nodes.current.forEach((node, i) => {
        const button = buttons.current[i];
        if (!button) return;
        const point = scratch.current;
        node.getWorldPosition(point); point.project(camera);
        const width = variant === "kegiatan" ? Math.max(44, el.clientHeight * 1.4 * scale / (camera.position.z * .828)) : 46;
        const height = variant === "kegiatan" ? width * .8 : 46;
        button.style.width = `${width}px`;
        button.style.height = `${height}px`;
        button.style.borderRadius = variant === "kegiatan" ? "8px" : "50%";
        button.style.transform = `translate(${(point.x + 1) * el.clientWidth / 2 - width / 2}px, ${(1 - point.y) * el.clientHeight / 2 - height / 2}px)`;
        button.style.zIndex = String(20 - Math.round(point.z * 10));
      });
    },
    dispose: () => {
      environment.current?.dispose();
      textures.current.forEach(texture => texture.dispose());
      materials.current.forEach(material => material.dispose());
      textures.current = [];
    },
  }, { cameraZ: 7, controls: false, autoRotate: false, maxDpr: 1.5 });

  useEffect(() => {
    if (failed) onReady(false);
    const targets = buttons.current;
    return () => {
      targets.forEach(button => button?.removeAttribute("style"));
      onReady(false);
    };
  }, [failed, onReady, buttons]);

  return failed ? null : <div ref={container} className="absolute inset-0" aria-hidden="true" />;
}
