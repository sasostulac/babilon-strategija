// terrainLoader.ts
export let heightData: number[][]; // global, accessible at runtime
export let colorData: number[][];  // global, accessible at runtime
export let fowData: boolean[][];  // global, accessible at runtime

export async function loadHeightData(url: string): Promise<void> {
    const img = new Image();
    img.src = url;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, img.width, img.height).data;

    heightData = [];
    for (let y = 0; y < img.height; y++) {
        const row: number[] = [];
        for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            const r = data[i]; // grayscale, so R=G=B
            row.push((r + 10) / 255); // normalized 0..1
        }
        heightData.push(row);
    }
}

export async function loadColorData(url: string): Promise<void> {
    const img = new Image();
    img.src = url;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const w = img.width;
    const h = img.height;

    colorData = [];
    for (let y = 0; y < h; y++) {
        const row: number[] = [];
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            row.push((r << 16) | (g << 8) | b); // 0xRRGGBB
        }
        colorData.push(row);
    }
}

export async function loadFowData(rows: number, columns: number) {
  // Initialize the 2D array with false
  fowData = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => false)
  );
}