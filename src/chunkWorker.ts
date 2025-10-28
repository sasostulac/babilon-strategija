// chunkWorker.ts
self.onmessage = (event) => {
  const { cx, cz, SUBDIVISIONS, velikostMape, MAX_HEIGHT, heightData, colorData, fowData, VIDLJIVOST_FOW} = event.data;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const weights: number[][] = []; // per-vertex texture weights
  const uvs: number[] = [];
  const normals: number[] = [];

  const halfSize = SUBDIVISIONS / 2;
  const step = 1; // 1 unit per vertex (you can adjust if needed)
  const SIRINA_TEKSTURE = 2;
  //console.log("worker za : " + cx.toString() + " " + cz.toString());
  // Generate positions, colors, weights, uvs, and normals
  for (let row = 0; row <= SUBDIVISIONS; row++) {
    for (let col = 0; col <= SUBDIVISIONS; col++) {
      const localX = col * step - halfSize;
      const localZ = row * step - halfSize;

      // Global coordinates in heightData
      const gx = col + cx * SUBDIVISIONS;
      const gz = row + cz * SUBDIVISIONS;

      let hillHeight = heightData[velikostMape - 1 - gz]?.[gx] ?? 0;
      hillHeight *= MAX_HEIGHT;
      positions.push(localX, hillHeight, localZ);

      // Color
      const pixel = colorData[velikostMape - 1 - gz]?.[gx] ?? 0xffffff;
      const r = ((pixel >> 16) & 0xff) / 255;
      const g = ((pixel >> 8) & 0xff) / 255;
      const b = (pixel & 0xff) / 255;
      colors.push(r, g, b, 1);
      //console.log(fowData[0][0].toString());
      let vsebnostTeksture =  (fowData[velikostMape - 1 - gz]?.[gx]) ? 1 : VIDLJIVOST_FOW;
      //console.log("vs: " + vsebnostTeksture.toString());
      // Texture weights
      const w = [0, 0, 0, 0, 0];
      if (pixel === 65407) w[0] = vsebnostTeksture;
      else if (pixel === 3329330) w[1] = vsebnostTeksture;
      else if (pixel === 16772045 || pixel === 16768685) w[2] = vsebnostTeksture;
      else if (pixel === 255) w[4] = vsebnostTeksture;
      w[4] = 1 - vsebnostTeksture;

      weights.push(w);

      // UVs (normalized)
      uvs.push(col/SIRINA_TEKSTURE, row/SIRINA_TEKSTURE);

      // --- Compute normals using neighboring heights ---
      const hL = heightData[velikostMape - 1 - gz]?.[gx - 1] ?? hillHeight / MAX_HEIGHT;
      const hR = heightData[velikostMape - 1 - gz]?.[gx + 1] ?? hillHeight / MAX_HEIGHT;
      const hD = heightData[velikostMape - 1 - (gz - 1)]?.[gx] ?? hillHeight / MAX_HEIGHT;
      const hU = heightData[velikostMape - 1 - (gz + 1)]?.[gx] ?? hillHeight / MAX_HEIGHT;

      const dx = (hR - hL) * MAX_HEIGHT;
      const dz = (hU - hD) * MAX_HEIGHT;

      // Approximate normal
      let nx = -dx;
      let ny = 2; // vertical scale
      let nz = -dz;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;
      normals.push(nx, ny, nz);
    }
  }

// Build indices with adaptive diagonals
for (let row = 0; row < SUBDIVISIONS; row++) {
  for (let col = 0; col < SUBDIVISIONS; col++) {
    const i = row * (SUBDIVISIONS + 1) + col;

    // global coords in heightData
    const gx = col + cx * SUBDIVISIONS;
    const gz = row + cz * SUBDIVISIONS;

    // sample heights of the four corners of this quad
    const hA = heightData[velikostMape - 1 - gz]?.[gx] ?? 0;           // top-left
    const hB = heightData[velikostMape - 1 - gz]?.[gx + 1] ?? 0;       // top-right
    const hC = heightData[velikostMape - 1 - (gz + 1)]?.[gx] ?? 0;     // bottom-left
    const hD = heightData[velikostMape - 1 - (gz + 1)]?.[gx + 1] ?? 0; // bottom-right

    // decide which diagonal gives smaller height difference
    const diffAD = Math.abs(hA - hD);
    const diffBC = Math.abs(hB - hC);

    if (diffAD > diffBC) {
      // use diagonal A–D
      indices.push(i, i + 1, i + SUBDIVISIONS + 1);
      indices.push(i + 1, i + SUBDIVISIONS + 2, i + SUBDIVISIONS + 1);
    } else {
      // use diagonal B–C
      indices.push(i, i + 1, i + SUBDIVISIONS + 2);
      indices.push(i, i + SUBDIVISIONS + 2, i + SUBDIVISIONS + 1);
    }
  }
}

  // Send all data back to main thread
  self.postMessage({ cx, cz, positions, colors, indices, weights, uvs, normals });
};

