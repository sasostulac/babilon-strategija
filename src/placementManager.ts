// src/placementManager.ts
import * as BABYLON from "@babylonjs/core";
import { getSquareHeight } from "./highlight";
import { shadowGen } from "./main";

let previewMesh: BABYLON.AbstractMesh | null = null;
let sceneRef: BABYLON.Scene;
let activeMesh: BABYLON.Mesh | null = null; // terrain mesh currently hovered
let SUBDIVISIONS = 0;
let isPlacing = false;
let currentModel = "";
let gridX = 0;
let gridZ = 0;

// ===== INITIALIZATION =====
export function initPlacementManager(scene: BABYLON.Scene, subdivisions: number) {
  sceneRef = scene;
  SUBDIVISIONS = subdivisions;

  // confirm build with left click
  scene.onPointerDown = (evt, pickInfo) => {
    if (isPlacing && pickInfo.hit && previewMesh) {
      confirmPlacement();
    }
  };

  // cancel build with ESC
  window.addEventListener("keydown", (e) => {
    if (isPlacing && e.key === "Escape") {
      cancelPlacement();
    }
  });
}
/*
// ===== START PLACEMENT =====
export async function startPlacement(modelName: string) {
  currentModel = modelName;
  isPlacing = true;

  if (previewMesh) {
    previewMesh.dispose();
    previewMesh = null;
  }

  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    "/models/",
    modelName,
    sceneRef
  );

  previewMesh = result.meshes[0];
  previewMesh.isPickable = false;
  previewMesh.alwaysSelectAsActiveMesh = true;
  previewMesh.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);

  //previewMesh.rotate(new BABYLON.Vector3(0, 1, 0), -1.0 * Math.random()*100);

  previewMesh.getChildMeshes().forEach((m) => {
    let mat =
      (m.material?.clone(m.name + "-preview") as BABYLON.StandardMaterial) ??
      new BABYLON.StandardMaterial(m.name + "-preview", sceneRef);
    mat.alpha = 0.4;
    //mat.specularColor = new BABYLON.Color3(1, 1, 1);  // white highlight
    //mat.specularPower = 64;                           // sharpness (higher = smaller, brighter)

    //mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    m.material = mat;
  });
}*/


export async function startPlacement(modelName: string) {
  currentModel = modelName;
  isPlacing = true;

  if (previewMesh) {
    previewMesh.dispose();
    previewMesh = null;
  }

  const result = await BABYLON.SceneLoader.ImportMeshAsync("", "/models/", modelName, sceneRef);

  previewMesh = result.meshes[0];
  previewMesh.isPickable = false;
  previewMesh.alwaysSelectAsActiveMesh = true;
  previewMesh.scaling = new BABYLON.Vector3(0.17, 0.17, 0.17);
  //previewMesh.isPickable = false;
  previewMesh.getChildMeshes().forEach((m) => {
    const src = m.material as BABYLON.PBRMaterial | BABYLON.StandardMaterial | null;
    if (!src) return;

    // Prefer cloning the existing PBR so all textures (incl. alpha) are preserved
    if (src.getClassName?.() === "PBRMaterial") {
      const mat = (src as BABYLON.PBRMaterial).clone((src.name || m.name) + "-preview");
      mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;
      mat.useAlphaFromAlbedoTexture = true;
      if (mat.albedoTexture) mat.albedoTexture.hasAlpha = true;
      mat.alpha = 0.6;                 // overall fade
      mat.needDepthPrePass = true;     // fixes sorting artifacts
      mat.backFaceCulling = false;     // foliage usually needs this
      mat.unlit = false;               // ensure it still reacts to light
      m.material = mat;
    } else {
      // If it really is a StandardMaterial, preserve its diffuseTexture and add alpha
      const sm = (src as BABYLON.StandardMaterial).clone((src.name || m.name) + "-preview");
      sm.alpha = 0.6;
      if (sm.diffuseTexture) sm.diffuseTexture.hasAlpha = true;
      sm.useAlphaFromDiffuseTexture = true as any; // (property exists on StandardMaterial)
      sm.needDepthPrePass = true;
      sm.backFaceCulling = false;
      m.material = sm;
    }
    m.isPickable = false;
  });
}


// ===== UPDATE POSITION FROM HIGHLIGHT =====
export function updatePlacementFromHighlight(
  mesh: BABYLON.Mesh,
  gridXNew: number,
  gridZNew: number,
  subdivisions: number
) {
  if (!isPlacing || !previewMesh) return;

  activeMesh = mesh;
  gridX = gridXNew;
  gridZ = gridZNew;

  const squareSize = 1;
  const offset = subdivisions / 2;
  const worldX = mesh.position.x - offset + gridX * squareSize + squareSize / 2;
  const worldZ = mesh.position.z - offset + gridZ * squareSize + squareSize / 2;
  const height = getSquareHeight(mesh, gridX, gridZ, subdivisions);

  previewMesh.position.set(worldX, height, worldZ);
}

function confirmPlacement() {
  if (!previewMesh || !activeMesh) return;

  const built = previewMesh.clone(`${currentModel}-built`, null)!;

  built.getChildMeshes().forEach((m) => {
    const mat = m.material as BABYLON.PBRMaterial;
    if (mat) {
      // Restore full opacity
      mat.alpha = 1.0;

      // Reset transparency mode so Babylon includes it in shadow map
      mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
      // (or PBRMATERIAL_ALPHATEST if you want leaf cutouts to still work)

      // Optional safety: mark as lit and solid
      mat.unlit = false;
      mat.needDepthPrePass = false;
    }
    
    m.isPickable = true;
  
    m.receiveShadows = true;
    //shadowGen.addShadowCaster(m);
  });

  built.receiveShadows = true;
  shadowGen.addShadowCaster(built);

  console.log("✅ Building placed:", currentModel);
  cancelPlacement(); // stop preview mode
}


// ===== CANCEL PLACEMENT =====
function cancelPlacement() {
  if (previewMesh) {
    previewMesh.dispose();
    previewMesh = null;
  }
  isPlacing = false;
  currentModel = "";
}
