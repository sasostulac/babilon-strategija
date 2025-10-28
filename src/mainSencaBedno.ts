import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, ShaderMaterial } from "@babylonjs/core";
import "@babylonjs/loaders";

window.addEventListener("DOMContentLoaded", () => {
    // Get the canvas element
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    // Create engine
    const engine = new Engine(canvas, true);

    // Create scene
    const scene = new Scene(engine);

    // Camera
    const camera = new ArcRotateCamera("cam", Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    // Lights
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
    dirLight.position = new Vector3(5, 10, 5);

    // Shadow generator
    const shadowGen = new ShadowGenerator(1024, dirLight);

    // Sphere that casts shadow
    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
    sphere.position.y = 1;
    shadowGen.addShadowCaster(sphere);

    // Ground
    const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);

    // Standard material for shadow receiving
    const shadowMat = new StandardMaterial("shadowMat", scene);
    shadowMat.diffuseColor = new Color3(0.2, 0.3, 0.4);
    shadowMat.specularColor = new Color3(0, 0, 0);
    ground.material = shadowMat;

    ground.receiveShadows = true;

    // Overlay ShaderMaterial (custom visual) using same ground
    const shaderMat = new ShaderMaterial("shaderMat", scene, {
        vertex: "custom",
        fragment: "custom",
    }, {
        attributes: ["position", "normal", "uv"],
        uniforms: ["worldViewProjection", "time"],
    });

    shaderMat.setFloat("time", 0);

    // Optional: animate shader
    scene.registerBeforeRender(() => {
        shaderMat.setFloat("time", performance.now() * 0.001);
    });

    // Assign shader as an additional material layer
    // We can use `material = shaderMat` visually, but shadows are still received from shadowMat
    // For simplicity, we will keep shadowMat; shaderMat would require multi-material layering

    // Render loop
    engine.runRenderLoop(() => {
        scene.render();
    });

    // Resize
    window.addEventListener("resize", () => {
        engine.resize();
    });
});
