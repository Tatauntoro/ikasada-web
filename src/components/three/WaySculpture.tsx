"use client";

import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useThreeScene } from "./useThreeScene";
import WayScene from "../WayScene";

type Variant = "direktori" | "kegiatan" | "estafet";

/** Locally modelled objects: no external models, textures or network requests. */
export default function WaySculpture({ variant, progress }: { variant: Variant; progress?: RefObject<number> }) {
  const container = useRef<HTMLDivElement>(null);
  const sculpture = useRef<THREE.Group | null>(null);
  const pieces = useRef<THREE.Group[]>([]);
  const environment = useRef<THREE.WebGLRenderTarget | null>(null);
  const { failed } = useThreeScene(container, {
    init: ({ scene, renderer }) => {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      const room = new RoomEnvironment();
      const generator = new THREE.PMREMGenerator(renderer);
      environment.current = generator.fromScene(room, .04);
      scene.environment = environment.current.texture;
      room.dispose();
      generator.dispose();
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe8f5ff, 2));
      const light = new THREE.DirectionalLight(0xffffff, 4);
      light.position.set(-3, 5, 4);
      scene.add(light);
      const rim = new THREE.DirectionalLight(0xffffff, 1.5);
      rim.position.set(4, 0, -2);
      scene.add(rim);
      const jade = new THREE.MeshPhysicalMaterial({ color: 0x1b1b1b, metalness: .55, roughness: .23, clearcoat: 1 });
      const cream = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .15, roughness: .3, clearcoat: .6 });
      const brass = new THREE.MeshPhysicalMaterial({ color: 0x555555, metalness: .85, roughness: .22 });
      const dark = new THREE.MeshPhysicalMaterial({ color: 0x143126, metalness: .4, roughness: .3 });
      const root = new THREE.Group();
      sculpture.current = root;
      scene.add(root);
      const box = (parent: THREE.Object3D, w: number, h: number, d: number, material: THREE.Material, x=0, y=0, z=0) => {
        const mesh = new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(.09,d/3)),material);
        mesh.position.set(x,y,z); parent.add(mesh); return mesh;
      };
      const ring = (parent: THREE.Object3D, radius: number, tube: number, x: number, y: number, z: number) => {
        const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius,tube,12,64),brass);
        mesh.position.set(x,y,z); parent.add(mesh); return mesh;
      };
      pieces.current = [];
      for(let i=0;i<3;i++) {
        const piece = new THREE.Group();
        pieces.current.push(piece); root.add(piece);
        if(variant === "direktori") {
          box(piece,1.65,2.05,.14,i===1?jade:cream);
          const head = new THREE.Mesh(new THREE.SphereGeometry(.22,24,16),i===1?cream:jade);
          head.position.set(0,.4,.2); piece.add(head);
          const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(.24,.25,6,16),i===1?cream:jade);
          shoulders.rotation.z=Math.PI/2; shoulders.position.set(0,-.03,.19); piece.add(shoulders);
          box(piece,.87,.055,.035,brass,0,-.58,.1);
          box(piece,.57,.04,.035,i===1?cream:jade,0,-.75,.1);
          ring(piece,.13,.025,0,.84,.12);
          piece.position.set((i-1)*1.05,(i===1?.22:-.12),(i===1?.65:-.3));
          piece.rotation.set(-.08,(i-1)*-.35,(i-1)*-.16);
        } else if(variant === "kegiatan") {
          box(piece,2.25,1.45,.18,i===1?jade:cream);
          box(piece,.055,1.1,.035,brass,.65,0,.11);
          for(let n=0;n<9;n++) box(piece,.025+(n%3)*.014,.48,.026,dark,.8+n*.032,-.18,.12);
          for(let n=0;n<3;n++) box(piece,.9-n*.16,.055,.03,i===1?cream:jade,-.35,.25-n*.19,.12);
          ring(piece,.17,.035,-.77,-.42,.14);
          piece.position.set((i-1)*.5,(i-1)*.8,(1-i)*.35);
          piece.rotation.set(.1,(i-1)*.18,-.22+(i-1)*.13);
        } else {
          box(piece,1.8,2.18,.12,i===1?jade:dark,0,0,-.15);
          box(piece,1.67,2.05,.22,cream,.025,0,.03);
          box(piece,1.8,2.18,.1,i===1?jade:dark,0,0,.2);
          box(piece,.14,2.15,.38,brass,-.83,0,.04);
          ring(piece,.34,.024,.08,.18,.27);
          box(piece,.62,.045,.025,brass,.08,-.46,.27);
          for(let n=0;n<5;n++) box(piece,1.5,.018,.02,brass,.06,-.82+n*.026,.155);
          piece.position.set((i-1)*.78,(i-1)*.42,(1-i)*.5);
          piece.rotation.set(-.18,(i-1)*.26,-.12+(i-1)*.16);
        }
        piece.userData.base = piece.position.clone();
        piece.userData.rotation = piece.rotation.z;
      }
      const halo = ring(root,2.05,.018,0,0,-.7);
      halo.rotation.set(.55,.4,-.2);
      root.rotation.set(-.12,-.25,0);
    },
    update: ({pointer,pointerActive,container: el}, elapsed, delta) => {
      const root = sculpture.current;
      if(!root) return;
      const focus = el.closest("article")?.matches(":focus-within") ?? false;
      const x = pointerActive ? THREE.MathUtils.clamp(pointer.x,-1,1) : 0;
      const y = pointerActive ? THREE.MathUtils.clamp(pointer.y,-1,1) : 0;
      const scroll = progress?.current ?? .5;
      root.rotation.y = THREE.MathUtils.damp(root.rotation.y,-.25+x*.35+(scroll-.5)*1.1,4,delta);
      root.rotation.x = THREE.MathUtils.damp(root.rotation.x,-.12-y*.28,4,delta);
      const entrance = Math.min(1,elapsed/1.3);
      root.scale.setScalar((.82+.18*(1-Math.pow(1-entrance,3))) * (.85 + Math.sin(scroll*Math.PI)*.15));
      pieces.current.forEach((piece,i)=>{
        const base = piece.userData.base as THREE.Vector3;
        const spread = 1 + Math.sin(scroll*Math.PI)*.2 + (pointerActive || focus ? .12 : 0);
        piece.position.x = THREE.MathUtils.damp(piece.position.x,base.x*spread,3,delta);
        piece.position.y = base.y + Math.sin(elapsed*.8+i*1.7)*.09 - (1-entrance)*.45;
        piece.position.z = THREE.MathUtils.damp(piece.position.z,base.z+((pointerActive || focus) ? .12 : 0),4,delta);
        piece.rotation.z = piece.userData.rotation + Math.sin(elapsed*.5+i)*.035;
      });
    },
    dispose: () => { environment.current?.dispose(); },
  }, { cameraZ: 7.5, controls: false, autoRotate: false, maxDpr: 1.5 });
  if(failed) return <WayScene variant={variant}/>;
  return <div ref={container} className="absolute inset-0" aria-hidden="true" />;
}
