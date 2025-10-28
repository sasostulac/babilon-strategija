import * as BABYLON from "@babylonjs/core";
import { WaterMaterial } from "@babylonjs/materials";

// --- CONFIG ---
const waterLevel = 0.5;    // height where water plane sits
const edgeSize = 500;    // adjust to your terrain width
const panSpeed = 0.05;    // movement speed of camera

function createWater(scene: BABYLON.Scene) {
    // Create a big horizontal plane for water
    const waterMesh = BABYLON.MeshBuilder.CreateGround("water", {
        width: edgeSize,
        height: edgeSize
    }, scene);
    waterMesh.position.y = waterLevel;

    // --- MATERIAL ---
    const waterMat = new BABYLON.StandardMaterial("waterMat", scene);
    waterMat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    waterMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    waterMat.specularPower = 64;
    waterMat.alpha = 0.8;

    // --- BUMP TEXTURE (NORMAL MAP) ---
    const bumpTex = new BABYLON.Texture("/waterNormal.jpg", scene);
    bumpTex.uScale = 500;
    bumpTex.vScale = 500;
    waterMat.bumpTexture = bumpTex;

    waterMesh.material = waterMat;

    // --- ANIMATE WATER RIPPLE ---
    scene.onBeforeRenderObservable.add(() => {
        bumpTex.uOffset += 0.001;
        bumpTex.vOffset += 0.001;
    });

    return waterMesh;
}


export function createAdvancedWater(scene: BABYLON.Scene, terrainMesh?: BABYLON.AbstractMesh) {
    const waterLevel = -100;
    const size = 500;

    // --- CREATE WATER MESH ---
    const waterMesh = BABYLON.MeshBuilder.CreateGround("water", {
        width: size,
        height: size,
        subdivisions: 32
    }, scene);
    waterMesh.position.y = waterLevel;

    // --- WATER MATERIAL ---
    const water = new WaterMaterial("waterMaterial", scene);

    // Normal map (waves)
    water.bumpTexture = new BABYLON.Texture("/waterNormal.jpg", scene);
    water.windForce = 1;               // Direction/speed of waves (-ve = opposite)
    water.waveHeight = 0.05;              // Wave amplitude
    water.bumpHeight = 0.1;              // Strength of the normal map
    water.waveLength = 0.1;              // Wave length
    water.waveSpeed = 2.0;              // Speed of wave animation
    water.colorBlendFactor = 0.3;        // How much water color tints reflections
    water.waterColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    water.alpha = 0.8;

    // --- REFLECTION / REFRACTION ---
    // Add terrain or other meshes you want reflected in the water
    if (terrainMesh) {
        water.addToRenderList(terrainMesh);
    }

    // Optionally add skybox or other visible meshes
    scene.meshes.forEach(mesh => {
        const name = mesh.name.toLowerCase();
        if (name.includes("sky") || mesh === terrainMesh) {
            water.addToRenderList(mesh);
        }
    });

    waterMesh.material = water;


    return waterMesh;
}

function addDynamicWater(
    scene: BABYLON.Scene,
    waterY: number = 0,
    width: number = 2000,
    height: number = 2000
) {
    // --- Create the water mesh ---
    const waterMesh = BABYLON.MeshBuilder.CreateGround("water", {
        width,
        height,
        subdivisions: 32
    }, scene);

    waterMesh.position.y = waterY;

    // --- Create the water material ---
    const waterMat = new WaterMaterial("waterMaterial", scene, new BABYLON.Vector2(512, 512));

    waterMat.bumpTexture = new BABYLON.Texture("textures/waterbump.png", scene);
    waterMat.waveHeight = 0.3;
    waterMat.bumpHeight = 0.1;
    waterMat.windForce = -10;
    waterMat.waveLength = 0.1;
    waterMat.waveSpeed = 10;
    waterMat.waterColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    waterMat.alpha = 0.9;
    waterMat.colorBlendFactor = 0.3;

    // Assign the material
    waterMesh.material = waterMat;

    // --- Animate normal map for subtle ripple effect ---
    scene.onBeforeRenderObservable.add(() => {
        const bumpTex = waterMat.bumpTexture as BABYLON.Texture;
        bumpTex.uOffset += 0.0004;
        bumpTex.vOffset += 0.0002;
    });

    return waterMesh;
}