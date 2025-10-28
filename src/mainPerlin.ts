// main.ts
// Realistic procedural terrain: random hills, smooth river valleys, no cliffs, 5×5 blur.
// Runs fully in browser (no external libs).

/* ------------------ Perlin noise ------------------ */
function makeNoise(seed = Math.random() * 10000) {
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 0; i < 256; i++) {
    const j = (Math.sin(seed + i * 9999) * 10000) & 255;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  const g = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  function grad(hash: number, x: number, y: number) {
    const v = g[hash & 7];
    return v[0] * x + v[1] * y;
  }
  function noise2D(x: number, y: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1],
          ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return (lerp(x1, x2, v) + 1) / 2; // 0–1
  }
  return { noise2D };
}

/* ------------------ Distance from river ------------------ */
function computeRiverDistances(
  data: Uint8ClampedArray, w: number, h: number, maxDist: number
): Float32Array {
  const dist = new Float32Array(w * h).fill(maxDist + 1);
  const queue: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx] === 0 && data[idx + 1] === 0 && data[idx + 2] === 0) {
        dist[y * w + x] = 0;
        queue.push([x, y]);
      }
    }
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const base = dist[y * w + x];
    if (base >= maxDist) continue;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const pos = ny * w + nx;
      if (dist[pos] > base + 1) {
        dist[pos] = base + 1;
        queue.push([nx, ny]);
      }
    }
  }
  return dist;
}

/* ------------------ Main terrain generator ------------------ */
async function generateRandomTerrain(
  inputUrl: string,
  scale = 35,
  amplitude = 255,
  octaves = 5,
  persistence = 0.5,
  smoothRadius = 10
): Promise<HTMLImageElement> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = inputUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const { data } = imageData;
  const w = img.width, h = img.height;

  const noise = makeNoise();
  const dist = computeRiverDistances(data, w, h, smoothRadius + 1);

  const isRiver = (x: number, y: number) => {
    const idx = (y * w + x) * 4;
    return data[idx] === 0 && data[idx + 1] === 0 && data[idx + 2] === 0;
  };

  // ---- Generate fractal terrain ----
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (isRiver(x, y)) continue;

      let n = 0, freq = 1, amp = 1, sumAmp = 0;
      for (let o = 0; o < octaves; o++) {
        n += noise.noise2D((x / scale) * freq, (y / scale) * freq) * amp;
        sumAmp += amp;
        amp *= persistence;
        freq *= 2;
      }
      n /= sumAmp;
      const heightVal = Math.pow(n, 1.3) * amplitude;

      // Smooth slope from river using distance field
      const d = dist[y * w + x];
      const riverMask = Math.min(1, d / smoothRadius);
      const flatBase = 30;
      const val = flatBase + (heightVal - flatBase) * riverMask;

      data[idx] = data[idx + 1] = data[idx + 2] = val;
    }
  }

  /* ------------------ 5×5 Gaussian blur pass ------------------ */
  const kernel = [
    [1, 4, 6, 4, 1],
    [4, 16, 24, 16, 4],
    [6, 24, 36, 24, 6],
    [4, 16, 24, 16, 4],
    [1, 4, 6, 4, 1],
  ];
  const weightSum = 256;

  const blurred = new Uint8ClampedArray(data);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (isRiver(x, y)) continue; // skip rivers

      // skip pixels adjacent to river
      let nearRiver = false;
      for (let dy = -1; dy <= 1 && !nearRiver; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (isRiver(x + dx, y + dy)) {
            nearRiver = true;
            break;
          }
        }
      }
      if (nearRiver) continue;

      let sum = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          const val = data[((y + ky) * w + (x + kx)) * 4];
          sum += val * kernel[ky + 2][kx + 2];
        }
      }
      const newVal = sum / weightSum;
      const idx = (y * w + x) * 4;
      blurred[idx] = blurred[idx + 1] = blurred[idx + 2] = newVal;
    }
  }

  for (let i = 0; i < data.length; i++) data[i] = blurred[i];

  // restore rivers (pure black)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (isRiver(x, y)) data[idx] = data[idx + 1] = data[idx + 2] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const out = new Image();
  out.src = canvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.href = out.src;
  link.download = "terrain_final_blurred.png";
  link.click();

  return out;
}
/*
  scale = 35,
  amplitude = 255,
  octaves = 5,
  persistence = 0.5,
  smoothRadius = 10
*/

/* ------------------ Example ------------------ */
window.addEventListener("DOMContentLoaded", async () => {
  const result = await generateRandomTerrain("/flatTeren.png", 15, 200, 1, 0.2, 6);
  document.body.style.background = "#222";
  document.body.appendChild(result);
  const label = document.createElement("div");
  label.textContent = "Final: smooth valleys, random hills, 5×5 blur (rivers untouched)";
  label.style.color = "white";
  label.style.marginTop = "10px";
  document.body.appendChild(label);
});
