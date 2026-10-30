import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import RAPIER from "@dimforge/rapier3d-compat";
export interface LandmarkAsset {
  url: string;
  position: [number, number, number];
  scale: number;
  yaw: number;
  colliderHalfExtents: [number, number, number];
  colliderOffset?: [number, number, number];
}
// Register optimized GLB assets here after reviewing their scale, appearance and license.
export const landmarks: LandmarkAsset[] = [];
export async function loadLandmark(
  asset: LandmarkAsset,
  scene: THREE.Scene,
  world: RAPIER.World,
) {
  const gltf = await new GLTFLoader().loadAsync(asset.url);
  gltf.scene.position.fromArray(asset.position);
  gltf.scene.scale.setScalar(asset.scale);
  gltf.scene.rotation.y = asset.yaw;
  gltf.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(...asset.position)
      .setRotation(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          asset.yaw,
        ),
      ),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(...asset.colliderHalfExtents).setTranslation(
      ...(asset.colliderOffset ?? [0, asset.colliderHalfExtents[1], 0]),
    ),
    body,
  );
  scene.add(gltf.scene);
}
