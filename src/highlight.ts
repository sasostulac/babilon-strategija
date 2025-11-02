// src/highlight.ts
import * as BABYLON from "@babylonjs/core";
import { updatePlacementFromHighlight } from "./placementManager";

let highlightMesh: BABYLON.LinesMesh | null = null;

export function setupHighlighting(
    canvas: HTMLCanvasElement,
    scene: BABYLON.Scene,
    SUBDIVISIONS: number
) {
    canvas.addEventListener("pointermove", (event) => {
        const pickResult = scene.pick(event.clientX, event.clientY);
        if (pickResult && pickResult.hit && pickResult.pickedMesh) {
            const mesh = pickResult.pickedMesh as BABYLON.Mesh;
            const localX = pickResult.pickedPoint!.x - mesh.position.x + SUBDIVISIONS / 2;
            const localZ = pickResult.pickedPoint!.z - mesh.position.z + SUBDIVISIONS / 2;
            const squareSize = 1;
            const gridX = Math.floor(localX / squareSize);
            const gridZ = Math.floor(localZ / squareSize);

            highlightSquare(mesh, gridX, gridZ, scene, SUBDIVISIONS);

            updatePlacementFromHighlight(mesh, gridX, gridZ, SUBDIVISIONS);
        }
    });
}

function highlightSquare(
    mesh: BABYLON.Mesh,
    gridX: number,
    gridZ: number,
    scene: BABYLON.Scene,
    SUBDIVISIONS: number
) {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) return;

    const vertexIndices = [
        (gridZ + 1) * (SUBDIVISIONS + 1) + gridX,       // top-left
        (gridZ + 1) * (SUBDIVISIONS + 1) + (gridX + 1), // top-right
        gridZ * (SUBDIVISIONS + 1) + (gridX + 1),       // bottom-right
        gridZ * (SUBDIVISIONS + 1) + gridX              // bottom-left
    ];

    const points = vertexIndices.map(idx =>
        new BABYLON.Vector3(
            positions[idx * 3] + mesh.position.x,
            positions[idx * 3 + 1] + 0.05,
            positions[idx * 3 + 2] + mesh.position.z
        )
    );

    points.push(points[0]);

    if (!highlightMesh) {
        highlightMesh = BABYLON.MeshBuilder.CreateLines(
            "highlight",
            { points, updatable: true },
            scene
        ) as BABYLON.LinesMesh;
        highlightMesh.color = new BABYLON.Color3(1, 1, 0);
        highlightMesh.isPickable = false;
    } else {
        BABYLON.MeshBuilder.CreateLines("highlight", { points, instance: highlightMesh });
    }
}

export function getSquareHeightPrva(
    mesh: BABYLON.Mesh,
    gridX: number,
    gridZ: number,
    SUBDIVISIONS: number
): number {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) return 0;

    const vertexIndices: number[] = [];
    const startRow = gridZ;
    const startCol = gridX;

    for (let row = startRow; row <= startRow + 1; row++) {
        for (let col = startCol; col <= startCol + 1; col++) {
            vertexIndices.push(row * (SUBDIVISIONS + 1) + col);
        }
    }

    let sumY = 0;
    for (const idx of vertexIndices) {
        sumY += positions[idx * 3 + 1];
    }

    return sumY / vertexIndices.length;
}

export function getSquareHeight(
    mesh: BABYLON.Mesh,
    gridX: number,
    gridZ: number,
    SUBDIVISIONS: number
): number {

    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) return 0;

    const maxIndex = SUBDIVISIONS;

    // Helper to safely get Y value from vertex indices
    const getY = (row: number, col: number) => {
        row = Math.min(Math.max(row, 0), maxIndex);
        col = Math.min(Math.max(col, 0), maxIndex);
        const idx = row * (SUBDIVISIONS + 1) + col;
        return positions[idx * 3 + 1] ?? 5; // fallback to 0 if undefined
    };

    // Get the 4 corner vertices of the square
    const y00 = getY(gridZ, gridX);                     // bottom-left
    const y10 = getY(gridZ, Math.min(gridX + 1, maxIndex)); // bottom-right
    const y01 = getY(Math.min(gridZ + 1, maxIndex), gridX); // top-left
    const y11 = getY(Math.min(gridZ + 1, maxIndex), Math.min(gridX + 1, maxIndex)); // top-right

    // Average the 4 corner heights
    return (y00 + y10 + y01 + y11) / 4;
}