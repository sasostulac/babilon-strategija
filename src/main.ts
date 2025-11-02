import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { setupHighlighting, getSquareHeight } from "./highlight";
import { loadHeightData, loadColorData, loadFowData, heightData, colorData , fowData} from './terrainLoader';
import { vertexShader } from "./vertexShader";
import { fragmentShader } from "./fragmentShader";
import { createAdvancedWater } from "./water";
//import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader.js";
//import "@babylonjs/loaders/glTF"; // ensure GLTF loader registered
import "@babylonjs/loaders/OBJ";
import { GLTF2Export } from "@babylonjs/serializers/glTF";

import { initBuildMenu } from "./ui/menu";
import "./ui/menu.css";
import { initPlacementManager } from "./placementManager";

// ===== Canvas & Engine Setup =====
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0);
const SUBDIVISIONS = 16;
const VIEW_RADIUS = 2;        // number of chunks to load around camera
const MAX_HEIGHT = 8;
const USE_TEXTURES = 1; // toggle between vertex colors or textures
const USE_WATER = 1; // toggle between water
const USE_SHADOWS = 1; // toggle between water
const VIDLJIVOST_FOW = 0.25; // toggle between water

const infoDiv = document.getElementById("infoPanel");

// Create ShaderMaterial once
const shaderMat = new BABYLON.ShaderMaterial(
  "splatMat",
  scene,
  { vertex: "custom", fragment: "custom" },
  {
    attributes: ["position", "normal", "color", "uv", "fogFlag", "waterFlag"],
    uniforms: [
      "world",
      "worldViewProjection",
      "lightViewProjection",
      "lightDirection",
      "lightColor",
      "ambientColor",
      "slopeStart",
      "slopeEnd",
      "triScale",
    ],
    samplers: ["tex0", "tex1", "tex2", "tex3", "tex4", "shadowMap"],
  }
);

shaderMat.setFloat("slopeStart", 0.2);
shaderMat.setFloat("slopeEnd",   0.40);
shaderMat.setFloat("triScale",   1.0); // increase for denser tiling

//delujoče:
//uploads_files_3304599_LowPoly_Tree_Collection_01_obj.obj
//LOW_POLY_set.glb
//uploads_files_2286813_obj.obj

//ne:
//uploads_files_2286813_obj.obj


const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-200, -200, -100), scene);
dirLight.intensity = 2.0;

const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
//shadowGenerator.useExponentialShadowMap = true;
shadowGenerator.usePoissonSampling = true;
//shadowGenerator.enableSoftTransparentShadow = true;
shadowGenerator.setDarkness(0.5);
//shadowGenerator.bias = 0.0001;
//shadowGenerator.normalBias = 0.02;
export const shadowGen = shadowGenerator;


BABYLON.SceneLoader.ImportMesh(
    "",                  // mesh name ("" = all meshes)
    "/models/",          // folder path
    "smreka1.glb",         // file name
    scene,
    function (meshes) {
        const model = meshes[0];
        model.position = new BABYLON.Vector3(8.5, 0.78, 30.5);
        model.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);
        model.receiveShadows = true;
        for (const m of meshes) {
            shadowGenerator.addShadowCaster(m);
            m.receiveShadows = true;
        }
    }
);

BABYLON.SceneLoader.ImportMesh(
    "",                  // mesh name ("" = all meshes)
    "/models/",          // folder path
    "listnato1.glb",         // file name
    scene,
    function (meshes) {
        const model = meshes[0];
        model.position = new BABYLON.Vector3(10.5, 0.85, 33.5);
        model.scaling = new BABYLON.Vector3(1, 1, 1);
        model.rotate(new BABYLON.Vector3(0, 1, 0), -30);
        model.receiveShadows = true;
        for (const m of meshes) {
            shadowGenerator.addShadowCaster(m);
            m.receiveShadows = true;
        }
    }
);

scene.ambientColor = new BABYLON.Color3(0.5, 0.5, 0.5);
//new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.3,0.3,0.3), scene);

const hemiLight = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
hemiLight.intensity = 0.1;
hemiLight.diffuse = new BABYLON.Color3(1, 1, 1);
hemiLight.specular = new BABYLON.Color3(1, 1, 1);
//hemiLight.groundColor = new BABYLON.Color3(0.8, 0.8, 0.8);

//shadowGenerator.filter = BABYLON.ShadowGenerator.FILTER_PCF;

//shaderMat.setVector3("lightDirection", new BABYLON.Vector3(1, 2, -1).normalize());
//shaderMat.setVector3("lightColor", new BABYLON.Vector3(1, 1, 1));
shaderMat.setVector3("lightDirection", dirLight.direction.normalize());
shaderMat.setVector3("lightColor", new BABYLON.Vector3(1,1,1));
//shaderMat.setVector3("ambientColor", new BABYLON.Vector3(0.3,0.3,0.3));
shaderMat.setVector3("ambientColor", new BABYLON.Vector3(0.15, 0.15, 0.15));

shaderMat.setFloat("time", performance.now() * 0.01);

// Register the shaders
BABYLON.Effect.ShadersStore["customVertexShader"] = vertexShader;
BABYLON.Effect.ShadersStore["customFragmentShader"] = fragmentShader;

await loadHeightData("/terenVisina.bmp");
await loadColorData("/teren.bmp");
await loadFowData(heightData.length, heightData.length);

const velikostMape = heightData.length;

const textures: BABYLON.Texture[] = [
  new BABYLON.Texture("/grass1.jpg", scene),
  new BABYLON.Texture("/grass2.png", scene),
  new BABYLON.Texture("/grass3.png", scene),
  new BABYLON.Texture("/sand1.jpg", scene),
  new BABYLON.Texture("/sand2.jpg", scene),
];

textures.forEach((tex, i) => shaderMat.setTexture(`tex${i}`, tex));

scene.onAfterRenderObservable.addOnce(() => {
    const shadowMap = shadowGenerator.getShadowMap();
    if (shadowMap) {
        shaderMat.setTexture("shadowMap", shadowMap);
    } else {
        console.warn("No shadow map available yet!");
    }
});

//te 3 vrstice so za triplanarni shader - cliffs
//shaderMat.setFloat("rockScale", 0.5); // adjust: higher = denser detail
//shaderMat.setVector2("slopeRange", new BABYLON.Vector2(0.1, 0.3)); // start/end of cliffs
//shaderMat.setFloat("cliffStrength", 1.0); // how strong cliff overlay is
//shaderMat.setFloat("groundEps", 0.03); // ~3 cm; tweak 0.01..0.05 if needed
//shaderMat.setFloat("riverLevel", 0.0);   // your water/river plane
//shaderMat.setFloat("blendHeight", 2.0);    // how far up cliffs extend above river

//shadowGenerator.bias = 0.0005; // avoids “shadow acne”
//shadowGenerator.useContactHardeningShadow = true;
//shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

// ===== Camera Setup =====
const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 30, 0), scene);
camera.setTarget(new BABYLON.Vector3(0, 0, 23)); // fixed tilt
camera.minZ = 0.1;
camera.speed = 1;

// Disable rotation, we want fixed tilt
camera.inputs.clear();


// ===== Terrain Chunk System =====
const loadedChunks = new Map<string, BABYLON.Mesh>();

setupHighlighting(canvas, scene, SUBDIVISIONS);



let waterMesh: BABYLON.Mesh | null = null;

if (USE_WATER) {
    waterMesh = createAdvancedWater(scene);
    // you can adjust its position and size
    waterMesh.position.y = 0.2;
    waterMesh.scaling = new BABYLON.Vector3(2, 1, 2);
}


// Helper to get map key
function getChunkKey(cx: number, cz: number) {
    return `${cx}_${cz}`;
}

const chunkWorker = new Worker(new URL("./chunkWorker.ts", import.meta.url), { type: "module" });

chunkWorker.onmessage = (event) => {
  const {
    type,
    cx,
    cz,
    positions,
    colors,
    indices,
    weights,
    uvs,
    normals,
    fogFlags,
    waterFlags,
  } = event.data;

  const key = getChunkKey(cx, cz);

  // =====================================================
  // === 1. FULL CHUNK BUILD (from worker: "buildDone") ===
  // =====================================================
  if (type === "buildDone") {
    if (loadedChunks.has(key)) return; // already created

    const ground = new BABYLON.Mesh(`chunk_${cx}_${cz}`, scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.uvs = uvs;

    if (!USE_TEXTURES) {
      // fallback: simple vertex colors
      vertexData.colors = colors;
    } else {
      // encode first 3 weights in vertex colors
      const encodedColors: number[] = [];
      for (const w of weights) {
        encodedColors.push(w[0], w[1], w[2], w[3]);
      }
      vertexData.colors = encodedColors;
    }

    vertexData.normals = normals;
    vertexData.applyToMesh(ground);

    // --- Custom fog flag buffer ---
    if (fogFlags && fogFlags.length > 0) {
      const fogBuffer = new BABYLON.VertexBuffer(
        engine,
        new Float32Array(fogFlags),
        "fogFlag", // custom attribute name
        true,
        false,
        1 // one float per vertex
      );
      ground.setVerticesBuffer(fogBuffer);
    }

    if (waterFlags && waterFlags.length > 0) {
    const waterBuffer = new BABYLON.VertexBuffer(
        engine,
        new Float32Array(waterFlags),
        "waterFlag", // custom attribute name
        true,
        false,
        1
    );
    ground.setVerticesBuffer(waterBuffer);
}
    // --- Position chunk in world ---
    ground.position.x = cx * SUBDIVISIONS;
    ground.position.z = cz * SUBDIVISIONS;

    // --- Material setup ---
    if (!USE_TEXTURES) {
      const mat = new BABYLON.StandardMaterial(`mat_${cx}_${cz}`, scene);
      mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
      mat.specularColor = new BABYLON.Color3(0, 0, 0);
      mat.backFaceCulling = false;
      (mat as any).useVertexColors = true;
      ground.material = mat;
      if (USE_SHADOWS) ground.receiveShadows = true;
    } else {
      ground.useVertexColors = false;
      ground.material = shaderMat;
      ground.receiveShadows = false;
    }

    // --- Add to water reflection if needed ---
    if (USE_WATER && waterMesh) {
      (waterMesh.material as any).addToRenderList(ground);
    }

    // --- Store chunk reference ---
    loadedChunks.set(key, ground);
  }

  // =====================================================
  // === 2. FOG UPDATE ONLY (from worker: "fogUpdate") ===
  // =====================================================
  if (type === "fogUpdate") {
    const mesh = loadedChunks.get(key);
    if (!mesh || !fogFlags) return;

    const engine = mesh.getEngine();
    const fogBuffer = new BABYLON.VertexBuffer(
      engine,
      new Float32Array(fogFlags),
      "fogFlag",
      true,
      false,
      1
    );
    mesh.setVerticesBuffer(fogBuffer);
  }
};



scene.registerBeforeRender(() => {
  shaderMat.setMatrix("lightViewProjection", shadowGenerator.getTransformMatrix());
  shaderMat.setVector3("lightDirection", dirLight.direction.normalize());
});

// Load / unload chunks based on camera position
function updateChunks() {
    const camX = Math.floor(camera.position.x / SUBDIVISIONS);
    const camZ = Math.floor(camera.position.z / SUBDIVISIONS);
    const camY = Math.floor(camera.position.y / SUBDIVISIONS);
    const maxChunk = Math.floor(velikostMape / SUBDIVISIONS) - 1;

    // Load nearby chunks
    for (let x = camX - VIEW_RADIUS; x <= camX + VIEW_RADIUS; x++) {
        for (let z = camZ - VIEW_RADIUS + camY + 1; z <= camZ + VIEW_RADIUS + camY + 1; z++) {
            if (x >= 0 && z >= 0 && x <= maxChunk && z <= maxChunk) {
                const key = getChunkKey(x, z);
                if (!loadedChunks.has(key)) {
                    //console.log("key " + key);
                    chunkWorker.postMessage({
                        type: "build",
                        cx: x,
                        cz: z,
                        SUBDIVISIONS,
                        velikostMape,
                        MAX_HEIGHT,
                        heightData,
                        colorData,
                        fowData,
                        VIDLJIVOST_FOW
                    });
                }
            }
        }
    }

    // Unload distant chunks
    for (const [key, chunk] of loadedChunks.entries()) {
        const parts = key.split("_").map(Number);
        const x = parts[0] ?? 0;
        const z = parts[1] ?? 0;

        if (Math.abs(x - camX) > VIEW_RADIUS || Math.abs(z - (camZ + camY + 1)) > VIEW_RADIUS) {
            chunk.dispose();
            loadedChunks.delete(key);
        }
    }
}

// Hook into render loop
scene.onBeforeRenderObservable.add(() => {
  scene.onBeforeRenderObservable.clear();
  updateChunks();
});

engine.runRenderLoop(() => {
    scene.render();
    if (infoDiv) {
        const fps = engine.getFps().toFixed(1);
        const cameraPos = scene.activeCamera?.position;
        const camInfo = cameraPos ? `Cam: ${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)}, ${cameraPos.z.toFixed(1)}` : '';
        const numMeshes = scene.meshes.length;
        const numTriangles = Math.floor(scene.getActiveIndices() / 3);

        infoDiv.textContent = 
            `FPS: ${fps}\n` +
            `${camInfo}\n` +
            `Meshes: ${numMeshes}\n` +
            `Triangles: ${numTriangles}`;
    }
});

window.addEventListener("resize", () => engine.resize());

let mouseX = 0;
let mouseY = 0;

window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

let isPinching = false;

camera.inputs.addMouseWheel();


window.addEventListener("wheel", (event: WheelEvent) => {
    const zoomSpeed = 2;
    camera.position.y += event.deltaY * 0.01 * zoomSpeed;
    camera.position.z -= event.deltaY * 0.01 * zoomSpeed;
});


// --- TOUCH PINCH ZOOM (for phones / tablets) ---
let previousPinchDistance: number | null = null;
const pinchZoomSpeed = 0.05;

window.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    isPinching = true; // disable camera dragging
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    previousPinchDistance = Math.sqrt(dx * dx + dy * dy);
  }
});

window.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2 && previousPinchDistance !== null) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDistance = Math.sqrt(dx * dx + dy * dy);

    const delta = newDistance - previousPinchDistance;
    previousPinchDistance = newDistance;

    camera.position.y -= delta * pinchZoomSpeed;
    camera.position.z += delta * pinchZoomSpeed;

    updateChunks();
  }
});

window.addEventListener("touchend", (e) => {
  // If there are still 2 or more fingers, it's still a pinch
  if (e.touches.length >= 2) return;

  // If there was a pinch gesture previously, suppress click on final release
  if (isPinching) {
    isPinching = false;

    // prevent click from firing on this final pointerup
    dragStarted = true;  // pretend we were dragging
  }

  previousPinchDistance = null;
});




// Enable pointer picking
scene.onPointerObservable.add((pointerInfo) => {
  if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK) {
    const pickInfo = pointerInfo.pickInfo;

    if (pickInfo?.hit && pickInfo.pickedMesh?.name === "terrain") {
      const point = pickInfo.pickedPoint!;
      const tileX = Math.floor(point.x);
      const tileZ = Math.floor(point.z);

      showTileInfo(tileX, tileZ, point);
    }
  }
});

function showTileInfo(x: number, z: number, point: BABYLON.Vector3) {
  const infoBox = document.getElementById("tileInfo")!;
  infoBox.style.display = "block";
  infoBox.innerText = `Tile coordinates:\nX: ${x}\nZ: ${z}\nWorld: (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`;
}

let isDragging = false;
let dragStarted = false;
let lastX = 0;
let lastY = 0;
let totalDragDistance = 0;
const dragSpeed = 0.02;
const dragThreshold = 5; // pixels – anything less counts as a click

scene.onPointerObservable.add((pointerInfo) => {
  const evt = pointerInfo.event as PointerEvent;

  switch (pointerInfo.type) {
    case BABYLON.PointerEventTypes.POINTERDOWN: {
      if (evt.button !== 0) return; // left mouse only

      isDragging = true;
      dragStarted = false;
      totalDragDistance = 0;
      lastX = evt.clientX;
      lastY = evt.clientY;
      scene.getEngine().getRenderingCanvas()?.setPointerCapture(evt.pointerId);
      break;
    }

    case BABYLON.PointerEventTypes.POINTERMOVE: {
      if (!isDragging || isPinching) return;

      const dx = evt.clientX - lastX;
      const dy = evt.clientY - lastY;
      lastX = evt.clientX;
      lastY = evt.clientY;

      totalDragDistance += Math.abs(dx) + Math.abs(dy);

      // Start camera pan only after threshold exceeded
      if (totalDragDistance > dragThreshold) dragStarted = true;
      if (!dragStarted) return;

      const forward = new BABYLON.Vector3(
        Math.sin(camera.rotation.y),
        0,
        Math.cos(camera.rotation.y)
      );
      const right = new BABYLON.Vector3(
        Math.cos(camera.rotation.y),
        0,
        -Math.sin(camera.rotation.y)
      );

      const moveX = -dx * dragSpeed;
      const moveZ = dy * dragSpeed;

      camera.position.addInPlace(right.scale(moveX));
      camera.position.addInPlace(forward.scale(moveZ));

      updateChunks();
      break;
    }

    case BABYLON.PointerEventTypes.POINTERUP: {
      if (evt.button !== 0) return;
      scene.getEngine().getRenderingCanvas()?.releasePointerCapture(evt.pointerId);

      // If drag never started → treat as click
      if (!dragStarted && !isPinching) {
        const pickResult = scene.pick(evt.clientX, evt.clientY);
        if (pickResult?.hit && pickResult.pickedMesh) {
          const mesh = pickResult.pickedMesh as BABYLON.Mesh;
          const localX = pickResult.pickedPoint!.x - mesh.position.x + SUBDIVISIONS / 2;
          const localZ = pickResult.pickedPoint!.z - mesh.position.z + SUBDIVISIONS / 2;
          const squareSize = 1;
          const gridX = Math.floor(localX / squareSize);
          const gridZ = Math.floor(localZ / squareSize);

          const globalX = Math.floor(mesh.position.x) + gridX;
          const globalZ = Math.floor(mesh.position.z) + gridZ;
          const height = getSquareHeight(mesh, gridX, gridZ, SUBDIVISIONS);
          
          const infoBox = document.getElementById("tileInfo");
          if (infoBox) {
            infoBox.style.display = "block";
            infoBox.innerText = `Tile coordinates:\nX: ${globalX}\nZ: ${globalZ}\nHeight: ${height.toFixed(2)}`;
          }

          revealArea(globalX, globalZ, 10);
          const ax = Math.floor(globalX / SUBDIVISIONS);
          const az = Math.floor(globalZ / SUBDIVISIONS);
          for (let cx = ax - 1; cx <= ax + 1; cx++) {
            for (let cz = az - 1; cz <= az + 1; cz++) {
              chunkWorker.postMessage({
                type: "updateFog",
                cx,
                cz,
                SUBDIVISIONS,
                velikostMape,
                fowData,
              });
            }
          }
        }
      }

      isDragging = false;
      dragStarted = false;
      totalDragDistance = 0;
      break;
    }
  }
});

/*
function updateChunkWeights(cx: number, cz: number) {
    const key = getChunkKey(cx, cz);
    const mesh = loadedChunks.get(key);
    if (!mesh) return;

    const fogFlags: number[] = [];

    const SUB = SUBDIVISIONS;
    for (let row = 0; row <= SUB; row++) {
        for (let col = 0; col <= SUB; col++) {
            const gx = col + cx * SUB;
            const gz = row + cz * SUB;

            const fogFlag = (fowData[velikostMape - 1 - gz]?.[gx]) ? 1.0 : 0.0;
            fogFlags.push(fogFlag);
        }
    }

    const engine = mesh.getEngine();
    const fogBuffer = new BABYLON.VertexBuffer(engine,new Float32Array(fogFlags), "fogFlag", true, false, 1 );
    mesh.setVerticesBuffer(fogBuffer);
}
*/
function revealArea(centerX: number, centerY: number, radius: number) {
  if (!fowData) return;

  const rows = fowData.length;
  const cols = fowData[0]?.length || 0;

  // Limit the loop to the bounding box around the center
  const startRow = Math.max(0, centerX - radius);
  const endRow = Math.min(rows - 1, centerX + radius);
  const startCol = Math.max(0, centerY - radius);
  const endCol = Math.min(cols - 1, centerY + radius);

  for (let i = startRow; i <= endRow; i++) {
    for (let j = startCol; j <= endCol; j++) {
      const dx = i - centerX;
      const dy = j - centerY;
      if (dx * dx + dy * dy <= radius * radius) { // Euclidean distance squared
        fowData[cols -1 - j][i] = true;
      }
    }
  }
}

initBuildMenu();
initPlacementManager(scene, SUBDIVISIONS);