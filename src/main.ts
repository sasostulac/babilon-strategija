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

// ===== Canvas & Engine Setup =====
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0);
const SUBDIVISIONS = 32;
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
    attributes: ["position", "normal", "uv", "color"],
    uniforms: [
      "world",
      "worldViewProjection",
      "lightViewProjection",
      "lightDirection",
      "lightColor",
      "ambientColor",
      "rockScale",
      "slopeRange",
      "cliffStrength",
      "riverLevel",
      "groundEps",
      "time"
    ],
    samplers: ["tex0", "tex1", "tex2", "tex3", "tex4"],
  }
);

//delujoče:
//uploads_files_3304599_LowPoly_Tree_Collection_01_obj.obj
//LOW_POLY_set.glb
//uploads_files_2286813_obj.obj

//ne:
//uploads_files_2286813_obj.obj



BABYLON.SceneLoader.ImportMesh(
    "",                  // mesh name ("" = all meshes)
    "/models/",          // folder path
    "smreka1.glb",         // file name
    scene,
    function (meshes) {
        const model = meshes[0];
        model.position = new BABYLON.Vector3(8, 2, 30);
        model.scaling = new BABYLON.Vector3(2, 2, 2);
        console.log("Loaded meshes:", meshes);
        console.log("Model loaded:", model);
    }
);

BABYLON.SceneLoader.ImportMesh(
    "",                  // mesh name ("" = all meshes)
    "/models/",          // folder path
    "listnato1.glb",         // file name
    scene,
    function (meshes) {
        const model = meshes[0];
        model.position = new BABYLON.Vector3(12, 2, 32);
        model.scaling = new BABYLON.Vector3(2, 2, 2);
        model.rotate(new BABYLON.Vector3(0, 1, 0), -30);
        console.log("Loaded meshes:", meshes);
        console.log("Model loaded:", model);
    }
);
/*
BABYLON.SceneLoader.ImportMesh(
    "",                  // mesh name ("" = all meshes)
    "/models/",          // folder path
    "testBarve.glb",         // file name
    scene,
    function (meshes) {
        const model = meshes[0];
        model.position = new BABYLON.Vector3(12, 2, 22);
        model.scaling = new BABYLON.Vector3(4, 4, 4);
        model.rotate(new BABYLON.Vector3(0, 1, 0), -30);
        console.log("Loaded meshes:", meshes);
        console.log("Model loaded:", model);
    }
);
*/

//scene.ambientColor = new BABYLON.Color3(0.5, 0.5, 0.5);
//new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.3,0.3,0.3), scene);


const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(2, -2, 1), scene);
dirLight.intensity = 1.0;

const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
shadowGenerator.useExponentialShadowMap = true;
shadowGenerator.filter = BABYLON.ShadowGenerator.FILTER_PCF;
//shaderMat.setVector3("lightDirection", new BABYLON.Vector3(1, 2, -1).normalize());
//shaderMat.setVector3("lightColor", new BABYLON.Vector3(1, 1, 1));
shaderMat.setVector3("lightDirection", dirLight.direction.normalize());
shaderMat.setVector3("lightColor", new BABYLON.Vector3(1,1,1));
shaderMat.setVector3("ambientColor", new BABYLON.Vector3(0.3,0.3,0.3));

shaderMat.setFloat("time", performance.now() * 0.01);

// Register the shaders
BABYLON.Effect.ShadersStore["customVertexShader"] = vertexShader;
BABYLON.Effect.ShadersStore["customFragmentShader"] = fragmentShader;

await loadHeightData("/terenVisina.bmp");
await loadColorData("/teren.bmp");
await loadFowData(heightData.length, heightData.length);
console.log(fowData[10][10].toString());

const velikostMape = heightData.length;
/*
const textures: BABYLON.Texture[] = [
  new BABYLON.Texture("/grass1.jpg", scene),
  new BABYLON.Texture("/grass2.jpg", scene),
  new BABYLON.Texture("/sand1.jpg", scene),
  new BABYLON.Texture("/water.jpg", scene),
  new BABYLON.Texture("/crna.jpg", scene),
];
*/
/*
const textures: BABYLON.Texture[] = [
  new BABYLON.Texture("/1.png", scene),
  new BABYLON.Texture("/2.png", scene),
  new BABYLON.Texture("/3.png", scene),
  new BABYLON.Texture("/4.png", scene),
  new BABYLON.Texture("/crna.jpg", scene),
];
*/
/*
const textures: BABYLON.Texture[] = [
  new BABYLON.Texture("/b1.png", scene),
  new BABYLON.Texture("/b2.png", scene),
  new BABYLON.Texture("/b3.png", scene),
  new BABYLON.Texture("/b4.png", scene),
  new BABYLON.Texture("/crna.jpg", scene),
];
*/

const textures: BABYLON.Texture[] = [
  new BABYLON.Texture("/grass1.jpg", scene),
  new BABYLON.Texture("/grass2.png", scene),
  new BABYLON.Texture("/grass3.png", scene),
  new BABYLON.Texture("/sand1.jpg", scene),
  new BABYLON.Texture("/crna.jpg", scene),
];

textures.forEach((tex, i) => shaderMat.setTexture(`tex${i}`, tex));

shaderMat.setMatrix("lightViewProjection", shadowGenerator.getTransformMatrix());

//te 3 vrstice so za triplanarni shader - cliffs
shaderMat.setFloat("rockScale", 0.5); // adjust: higher = denser detail
shaderMat.setVector2("slopeRange", new BABYLON.Vector2(0.1, 0.3)); // start/end of cliffs
shaderMat.setFloat("cliffStrength", 1.0); // how strong cliff overlay is
shaderMat.setFloat("groundEps", 0.03); // ~3 cm; tweak 0.01..0.05 if needed
shaderMat.setFloat("riverLevel", 0.0);   // your water/river plane
//shaderMat.setFloat("blendHeight", 2.0);    // how far up cliffs extend above river

//shadowGenerator.bias = 0.0005; // avoids “shadow acne”
//shadowGenerator.useContactHardeningShadow = true;
//shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;
shaderMat.setTexture("shadowMap", shadowGenerator.getShadowMap()!);

// ===== Camera Setup =====
const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 40, 0), scene);
camera.setTarget(new BABYLON.Vector3(0, 0, 30)); // fixed tilt
camera.minZ = 0.1;
camera.speed = 1;

// Disable rotation, we want fixed tilt
camera.inputs.clear();

// Zoom with mouse wheel

/*
const box = BABYLON.MeshBuilder.CreateBox("box", {}, scene);
box.position.y = 5; 
box.position.z = 40; 

const material = new BABYLON.StandardMaterial("mat", scene);
material.diffuseTexture = new BABYLON.Texture("/sand1.jpg", scene);
material.diffuseColor = new BABYLON.Color3(1, 1, 1);
material.specularColor = new BABYLON.Color3(1, 1, 1);
material.specularPower = 64;

box.material = material;
*/
/*
const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
groundMaterial.diffuseTexture = new BABYLON.Texture("/grass1.jpg", scene);
console.log("dif: " + groundMaterial.diffuseTexture.toString());
*/



// ===== Terrain Chunk System =====
const VIEW_RADIUS = 2;        // number of chunks to load around camera
const loadedChunks = new Map<string, BABYLON.Mesh>();

setupHighlighting(canvas, scene, SUBDIVISIONS);



let waterMesh: BABYLON.Mesh | null = null;

if (USE_WATER) {
    waterMesh = createAdvancedWater(scene);
    // you can adjust its position and size
    waterMesh.position.y = 0.5;
    waterMesh.scaling = new BABYLON.Vector3(2, 1, 2);
}


// Helper to get map key
function getChunkKey(cx: number, cz: number) {
    return `${cx}_${cz}`;
}

const chunkWorker = new Worker(new URL("./chunkWorker.ts", import.meta.url), { type: "module" });

chunkWorker.onmessage = (event) => {
  const { cx, cz, positions, colors, indices, weights, uvs, normals } = event.data;

  const key = getChunkKey(cx, cz);
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
            encodedColors.push(w[0], w[1], w[2], w[3]); // use w[3], not 1
        }
        vertexData.colors = encodedColors;
    }

    vertexData.normals = normals;
    vertexData.applyToMesh(ground);

    ground.position.x = cx * SUBDIVISIONS;
    ground.position.z = cz * SUBDIVISIONS;

    if (!USE_TEXTURES) {
        // StandardMaterial with vertex colors
        const mat = new BABYLON.StandardMaterial(`mat_${cx}_${cz}`, scene);
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        mat.backFaceCulling = false;
        (mat as any).useVertexColors = true;
        ground.material = mat;
        if (USE_SHADOWS) {
            ground.receiveShadows = true;
        }
    } else {
        ground.useVertexColors = false;
        ground.material = shaderMat
        shaderMat.setMatrix("world", ground.getWorldMatrix());
        shaderMat.onBind = (mesh) => {
        shaderMat.setMatrix("world", mesh.getWorldMatrix());
     const sm = shadowGenerator.getShadowMap(); // Nullable<RenderTargetTexture>
        const transform = shadowGenerator.getTransformMatrix(); // or appropriate accessor for your Babylon version
        if (transform) {
            shaderMat.setMatrix("lightViewProjection", transform); // note: name must match vertex uniform (lightViewProjection)
        }
        if (sm) {
            shaderMat.setTexture("shadowMap", sm);
        }
        shaderMat.setFloat("shadowBiasMin", 0.0005);
        shaderMat.setFloat("shadowBiasScale", 0.005);
        };
        if (USE_SHADOWS) {
            ground.receiveShadows = true;
        }
        //shaderMat.setVector3("cameraPosition", camera.position);
        //shaderMat.setFloat("shininess", 32);
    }
     if (USE_WATER && waterMesh) {
        (waterMesh.material as any).addToRenderList(ground);
    }
  loadedChunks.set(key, ground);
};


scene.registerBeforeRender(() => {
  for (const [key, mesh] of loadedChunks.entries()) {
    if (!mesh || mesh.isDisposed()) continue;

    // Example: update shader uniforms for each chunk
    if (mesh.material === shaderMat) {
      shaderMat.setMatrix("world", mesh.getWorldMatrix());
      shaderMat.setVector3("cameraPosition", camera.position);
      shaderMat.setVector3("lightDirection", dirLight.direction.normalize());
      //shaderMat.setFloat("time", performance.now() * 0.001);
    }

    // Example: dynamic per-frame effect or check
    // mesh.rotation.y += 0.0001;
  }
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



const moveSpeed = 1.0;       // base speed per frame
const moveBoost = 5.0;       // speed multiplier when Shift is held
const moveKeys: Record<string, boolean> = {};

window.addEventListener("keydown", (e) => moveKeys[e.code] = true);
window.addEventListener("keyup", (e) => moveKeys[e.code] = false);

// Hook into render loop
scene.onBeforeRenderObservable.add(() => {

let speed = moveSpeed * scene.getEngine().getDeltaTime() / 16.666; // frame-rate scaling
    if (moveKeys["ShiftLeft"] || moveKeys["ShiftRight"]) speed *= moveBoost;

    // Move purely along the XZ plane (no vertical tilt)
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

    // WASD movement
    if (moveKeys["KeyW"]) camera.position.addInPlace(forward.scale(speed));
    if (moveKeys["KeyS"]) camera.position.subtractInPlace(forward.scale(speed));
    if (moveKeys["KeyA"]) camera.position.subtractInPlace(right.scale(speed));
    if (moveKeys["KeyD"]) camera.position.addInPlace(right.scale(speed));

    // Arrow keys movement — now same as WASD (not zoom)
    if (moveKeys["ArrowUp"]) camera.position.addInPlace(forward.scale(speed));
    if (moveKeys["ArrowDown"]) camera.position.subtractInPlace(forward.scale(speed));
    if (moveKeys["ArrowLeft"]) camera.position.subtractInPlace(right.scale(speed));
    if (moveKeys["ArrowRight"]) camera.position.addInPlace(right.scale(speed));

    updateChunks();
});
/*
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
const dragSpeed = 0.02; // adjust sensitivity

scene.onPointerDown = (evt) => {
            console.log("dol1");
    if (evt.button === 0) { // left mouse button
        isDragging = true;
        console.log("dol");
        lastPointerX = evt.clientX;
        lastPointerY = evt.clientY;
        scene.getEngine().getRenderingCanvas()?.setPointerCapture(evt.pointerId);
    }
};

scene.onPointerUp = (evt) => {
    if (evt.button === 0) {
        console.log("gor");
        isDragging = false;
        scene.getEngine().getRenderingCanvas()?.releasePointerCapture(evt.pointerId);
    }
};

scene.onPointerMove = (evt) => {
    if (!isDragging) return;

    const dx = evt.clientX - lastPointerX;
    const dy = evt.clientY - lastPointerY;

    lastPointerX = evt.clientX;
    lastPointerY = evt.clientY;

    // Move camera opposite to drag (like map panning)
    const moveX = -dx * dragSpeed;
    const moveZ = dy * dragSpeed;

    // Use camera orientation to translate drag into world space
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

    camera.position.addInPlace(right.scale(moveX));
    camera.position.addInPlace(forward.scale(moveZ));

    updateChunks();
};

*/


engine.runRenderLoop(() => {
    scene.render();
    if (infoDiv) {
        const fps = engine.getFps().toFixed(1);
        const cameraPos = scene.activeCamera?.position;
        const camInfo = cameraPos ? `Cam: ${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)}, ${cameraPos.z.toFixed(1)}` : '';
        const numMeshes = scene.meshes.length;

        infoDiv.textContent = 
            `FPS: ${fps}\n` +
            `${camInfo}\n` +
            `Meshes: ${numMeshes}`;
    }
});

window.addEventListener("resize", () => engine.resize());
const edgeSize = 50; // pixels from screen edge to start moving
const panSpeed = 0.5; // movement speed

let mouseX = 0;
let mouseY = 0;

window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});
/*
function updateCamera() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    let moveX = 0;
    let moveZ = 0;

    // Left/right
    if (mouseX < edgeSize) moveX = -panSpeed;
    else if (mouseX > width - edgeSize) moveX = panSpeed;

    // Forward/backward (inverted)
    if (mouseY < edgeSize) moveZ = panSpeed;          // top edge → forward
    else if (mouseY > height - edgeSize) moveZ = -panSpeed; // bottom edge → backward

    // Move camera along XZ plane
    camera.position.x += moveX;
    camera.position.z += moveZ;

    // keep looping
    requestAnimationFrame(updateCamera);
}

// start loop
updateCamera();
*/
camera.inputs.addMouseWheel();


window.addEventListener("wheel", (event: WheelEvent) => {
    const zoomSpeed = 2;
    camera.position.y += event.deltaY * 0.01 * zoomSpeed;
    camera.position.z -= event.deltaY * 0.01 * zoomSpeed;
});


// --- TOUCH PINCH ZOOM (for phones / tablets) ---
let previousPinchDistance: number | null = null;
const pinchZoomSpeed = 0.05; // adjust sensitivity

window.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
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

    // Zoom camera (same style as your mousewheel logic)
    camera.position.y -= delta * pinchZoomSpeed;
    camera.position.z += delta * pinchZoomSpeed;

    // Clamp or update terrain if needed
    updateChunks();
  }
});

window.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) previousPinchDistance = null;
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

// === Tile click detection ===
/*
scene.onPointerDown = function (evt, pickResult) {
    if (pickResult.hit && pickResult.pickedMesh) {
        const mesh = pickResult.pickedMesh as BABYLON.Mesh;

        // Calculate local tile coordinates within this mesh
        const localX = pickResult.pickedPoint!.x - mesh.position.x + SUBDIVISIONS / 2;
        const localZ = pickResult.pickedPoint!.z - mesh.position.z + SUBDIVISIONS / 2;
        const squareSize = 1;
        const gridX = Math.floor(localX / squareSize);
        const gridZ = Math.floor(localZ / squareSize);

        // Calculate global terrain coordinates
        const globalX = Math.floor(mesh.position.x) + gridX;
        const globalZ = Math.floor(mesh.position.z) + gridZ;

        // Get height at the clicked tile
        const height = getSquareHeight(mesh, gridX, gridZ, SUBDIVISIONS);

        // Display in info box
        const infoBox = document.getElementById("tileInfo");
        if (infoBox) {
            infoBox.style.display = "block";
            infoBox.innerText = `Tile coordinates:\nX: ${globalX}\nZ: ${globalZ}\nHeight: ${height.toFixed(2)}`;
        }

        revealArea(globalX, globalZ, 10)
         // Update your fowData around the clicked area
        //const x = Math.floor(pickInfo.pickedPoint.x);
        //const z = Math.floor(pickInfo.pickedPoint.z);

        // your own logic that modifies fowData here...

        // then refresh visible chunk’s weights
        const cx = Math.floor(globalX / SUBDIVISIONS);
        const cz = Math.floor(globalZ / SUBDIVISIONS);
        for (let row = cx-1; row <= cx+1; row++) {
            for (let col = cz-1; col <= cz+1; col++) {
                updateChunkWeights(row, col);
            }
        }
    }
};
*/

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
      if (!isDragging) return;

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
      if (!dragStarted) {
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
          const cx = Math.floor(globalX / SUBDIVISIONS);
          const cz = Math.floor(globalZ / SUBDIVISIONS);
          for (let row = cx - 1; row <= cx + 1; row++) {
            for (let col = cz - 1; col <= cz + 1; col++) {
              updateChunkWeights(row, col);
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




function updateChunkWeights(cx: number, cz: number) {
    const key = getChunkKey(cx, cz);
    const mesh = loadedChunks.get(key);
    if (!mesh) return;

    // recompute encoded colors from updated fowData
    const vertexData = new BABYLON.VertexData();
    const encodedColors: number[] = [];

    const SUB = SUBDIVISIONS;
    for (let row = 0; row <= SUB; row++) {
        for (let col = 0; col <= SUB; col++) {
            const gx = col + cx * SUB;
            const gz = row + cz * SUB;

            const pixel = colorData[velikostMape - 1 - gz]?.[gx] ?? 0xffffff;
            const vsebnostTeksture = (fowData[velikostMape - 1 - gz]?.[gx]) ? 1 : VIDLJIVOST_FOW;

            const w = [0, 0, 0, 0];
            if (pixel === 65407) w[0] = vsebnostTeksture;
            else if (pixel === 3329330) w[1] = vsebnostTeksture;
            else if (pixel === 16772045 || pixel === 16768685) w[2] = vsebnostTeksture;
            else if (pixel === 255) w[4] = vsebnostTeksture;

            encodedColors.push(w[0], w[1], w[2], w[3]);
        }
    }

    // replace mesh's color buffer
    const engine = mesh.getEngine();
    const vertexBuffer = new BABYLON.VertexBuffer(engine, encodedColors, BABYLON.VertexBuffer.ColorKind, false, false, 4);
    mesh.setVerticesBuffer(vertexBuffer);
}

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
        //console.log(i + " " + j);
      }
    }
  }
}

//objekti testiranje
/*
const hemiLight = new BABYLON.HemisphericLight(
    "hemiLight",
    new BABYLON.Vector3(0, 1, 0), // from above
    scene
);
hemiLight.intensity = 0.3; // tweak to taste
hemiLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.2); // soft bluish tint from below
hemiLight.diffuse = new BABYLON.Color3(1, 1, 1);

// Create a mesh to hold our tree
//const tree = new BABYLON.Mesh("tree", scene);

// --- TRUNK ---
const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
    height: 2,
    diameterTop: 0.5,
    diameterBottom: 0.5,
    tessellation: 6
}, scene);
trunk.position.y = 1;

const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
trunkMat.diffuseColor = new BABYLON.Color3(0.55, 0.27, 0.07); // brown
//trunkMat.specularColor = new BABYLON.Color3(0, 0, 0);           // no shine
//trunkMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);  // subtle ambient fill
//shaderMat.setVector3("ambientColor", new BABYLON.Vector3(0.3,0.3,0.3));
//trunkMat.ambientColor = new BABYLON.Color3(0.3,0.3,0.3)
trunk.material = trunkMat;

// --- CANOPY LAYERS ---
const layerHeights: [number, number, number] = [1.5, 1.2, 0.9];
const layerDiameters: [number, number, number] = [2.0, 1.6, 1.2];

let yOffset = 2; // start on top of trunk
const canopyMat = new BABYLON.StandardMaterial("canopyMat", scene);
canopyMat.diffuseColor = new BABYLON.Color3(0.0, 0.6, 0.0); // green
//canopyMat.backFaceCulling = false;
//canopyMat.ambientColor = new BABYLON.Color3(0.3,0.3,0.3)

//canopyMat.specularColor = new BABYLON.Color3(0, 0, 0);
//canopyMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
//canopyMat.ambientColor = new BABYLON.Color3(0.3,0.3,0.3)

const canopyLayers: BABYLON.Mesh[] = [];

for (let i = 0; i < 3; i++) {
    const layer = BABYLON.MeshBuilder.CreateCylinder(`canopy${i}`, {
        height: layerHeights[i]!,
        diameterTop: 0,
        diameterBottom: layerDiameters[i]!,
        tessellation: 6
    }, scene);
    layer.position.y = yOffset + layerHeights[i]! / 2;
    layer.material = canopyMat;
    canopyLayers.push(layer);
    yOffset += layerHeights[i]! * 0.7; // slight overlap for natural look
}

// --- MERGE MESHES ---
const mergedTree = BABYLON.Mesh.MergeMeshes([trunk, ...canopyLayers], true, false, undefined, false, true);

mergedTree!.position.z = 21;
mergedTree!.position.y = 1;
mergedTree!.position.x = 5;

function createLeafyTree(scene: BABYLON.Scene, position = new BABYLON.Vector3(0, 0, 0)) {
    // --- Parent node for easy movement ---
    const tree = new BABYLON.TransformNode("treeRoot", scene);

    // --- Trunk ---
    const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.35, 0.2, 0.05);

    const trunkHeight = 2;
    const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
        height: trunkHeight,
        diameterTop: 0.3,
        diameterBottom: 0.4,
        tessellation: 6,
    }, scene);
    trunk.material = trunkMat;


    // --- Canopy (cluster of simple spheres) ---
    const canopyMat = new BABYLON.StandardMaterial("canopyMat", scene);
    canopyMat.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.2);
    canopyMat.backFaceCulling = false; // leaves visible from all sides

    const canopyParts: BABYLON.Mesh[] = [];
    const canopyCount = 4;

    for (let i = 0; i < canopyCount; i++) {
        const sph = BABYLON.MeshBuilder.CreateSphere("leafBall" + i, {
            diameter: 1.6 + Math.random() * 0.4,
            segments: 6
        }, scene);
        sph.material = canopyMat;
        sph.position = new BABYLON.Vector3(
            (Math.random() - 0.5) * 1.0,
            trunkHeight / 2 + 0.8 + Math.random() * 0.5,
            (Math.random() - 0.5) * 1.0
        );
        canopyParts.push(sph);
    }

    // Merge all canopy parts into one mesh for performance
    const canopy = BABYLON.Mesh.MergeMeshes(canopyParts, true, true, undefined, false, true);
    canopy!.parent = tree;

    // --- Final positioning ---
    tree.position = position;

    return tree;
}
const tree1 = createLeafyTree(scene, new BABYLON.Vector3(0, 2, 20));
const tree2 = createLeafyTree(scene, new BABYLON.Vector3(5, 2, 17));
const tree3 = createLeafyTree(scene, new BABYLON.Vector3(-4, 2, 22));

function createCastle(scene: BABYLON.Scene, position = new BABYLON.Vector3(0, 0, 0)) {
    const castle = new BABYLON.TransformNode("castleRoot", scene);

    // --- Materials ---
    const wallMat = new BABYLON.StandardMaterial("wallMat", scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); // light stone
    wallMat.specularColor = new BABYLON.Color3(0, 0, 0);      // matte look

    const roofMat = new BABYLON.StandardMaterial("roofMat", scene);
    roofMat.diffuseColor = new BABYLON.Color3(0.4, 0.1, 0.1); // dark red/brown roof
    roofMat.specularColor = new BABYLON.Color3(0, 0, 0);

    // --- Central keep ---
    const keep = BABYLON.MeshBuilder.CreateBox("keep", { width: 6, depth: 6, height: 6 }, scene);
    keep.material = wallMat;
    keep.position.y = 3;
    keep.parent = castle;

    // --- Towers ---
    const towerRadius = 1.2;
    const towerHeight = 7;
    const towerPositions: [number, number][] = [
        [3, 3],
        [-3, 3],
        [3, -3],
        [-3, -3]
    ];

    for (const [x, z] of towerPositions) {
        const tower = BABYLON.MeshBuilder.CreateCylinder("tower", {
            height: towerHeight,
            diameter: towerRadius * 2,
            tessellation: 8,
        }, scene);
        tower.material = wallMat;
        tower.position.set(x, towerHeight / 2, z);
        tower.parent = castle;

        // Tower roof (cone)
        const roof = BABYLON.MeshBuilder.CreateCylinder("roof", {
            height: 2.5,
            diameterTop: 0,
            diameterBottom: towerRadius * 2.2,
            tessellation: 8,
        }, scene);
        roof.material = roofMat;
        roof.position.set(x, towerHeight + 1.0, z);
        roof.parent = castle;
    }

    // --- Gatehouse ---
    const gate = BABYLON.MeshBuilder.CreateBox("gate", { width: 4, depth: 2, height: 4 }, scene);
    gate.material = wallMat;
    gate.position.set(0, 2, 4);
    gate.parent = castle;

    // --- Gate arch opening ---
    const arch = BABYLON.MeshBuilder.CreateCylinder("arch", {
        diameter: 2,
        height: 2.1,
        tessellation: 12,
    }, scene);
    arch.rotation.x = Math.PI / 2;
    arch.position.set(0, 1, 5.01);
    arch.material = roofMat;
    arch.parent = castle;

    // --- Final positioning ---
    castle.position = position;

    return castle;
}

const castle1 = createCastle(scene, new BABYLON.Vector3(10, 1, 30));

castle1.getChildMeshes().forEach(mesh => shadowGenerator.addShadowCaster(mesh, true));
mergedTree!.getChildMeshes().forEach(mesh => shadowGenerator.addShadowCaster(mesh, true));
tree1.getChildMeshes().forEach(mesh => shadowGenerator.addShadowCaster(mesh, true));
tree2.getChildMeshes().forEach(mesh => shadowGenerator.addShadowCaster(mesh, true));
tree3.getChildMeshes().forEach(mesh => shadowGenerator.addShadowCaster(mesh, true));

console.log("House !")

SceneLoader.ImportMesh(
  "",
  "/models/",
  "medieval_house_lowpoly_textured_embedded.glb",
  scene,
  (meshes) => {
    const root = meshes[0].parent; // the TransformNode created by Babylon
    if (root) {
      root.position = new BABYLON.Vector3(5, 3, 13);
      root.scaling = new BABYLON.Vector3(2, 2, 2);
      root.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
    } else {
      meshes[0].position = new BABYLON.Vector3(5, 3, 13);
    }
  }
);

console.log("House 2!")
*/