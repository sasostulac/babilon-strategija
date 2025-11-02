self.onmessage = (event) => {
  const { type } = event.data;

  // =========================================================
  // === 1. FULL CHUNK BUILD (geometry + textures + fog) ===
  // =========================================================
  if (type === "build") {
    const {
      cx, cz, SUBDIVISIONS, velikostMape, MAX_HEIGHT,
      heightData, colorData, fowData, VIDLJIVOST_FOW
    } = event.data;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const weights: number[][] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const fogFlags: number[] = [];
    const waterFlags: number[] = [];

    const halfSize = SUBDIVISIONS / 2;
    const step = 1;
    const SIRINA_TEKSTURE = 2;

    for (let row = 0; row <= SUBDIVISIONS; row++) {
      for (let col = 0; col <= SUBDIVISIONS; col++) {
        const localX = col * step - halfSize;
        const localZ = row * step - halfSize;

        const gx = col + cx * SUBDIVISIONS;
        const gz = row + cz * SUBDIVISIONS;

        let hillHeight = heightData[velikostMape - 1 - gz]?.[gx] ?? 0;
        hillHeight *= MAX_HEIGHT;
        positions.push(localX, hillHeight, localZ);

        // --- Fog flag: 1 = visible, 0 = fog ---
        const fogFlag = (fowData[velikostMape - 1 - gz]?.[gx]) ? 1.0 : 0.0;
        fogFlags.push(fogFlag);

        // 0 = water, >0 = land
        const waterFlag = (hillHeight == 0.0) ? 1.0 : 0.0;
        //console.log("h: " + hillHeight + " w: " + waterFlag)
        waterFlags.push(waterFlag);

        // --- Vertex color ---
        const pixel = colorData[velikostMape - 1 - gz]?.[gx] ?? 0xffffff;
        const r = ((pixel >> 16) & 0xff) / 255;
        const g = ((pixel >> 8) & 0xff) / 255;
        const b = (pixel & 0xff) / 255;
        colors.push(r, g, b, 1);

        // --- Texture weights ---
        const vsebnostTeksture = 1.0;
        const w = [0, 0, 0, 0, 0];
        if (pixel === 65407) w[0] = vsebnostTeksture;
        else if (pixel === 3329330) w[1] = vsebnostTeksture;
        else if (pixel === 16772045 || pixel === 16768685) w[2] = vsebnostTeksture;
        w[4] = vsebnostTeksture;

        weights.push(w);

        // --- UVs ---
        uvs.push(col / SIRINA_TEKSTURE, row / SIRINA_TEKSTURE);

        // --- Normals ---
        const hL = heightData[velikostMape - 1 - gz]?.[gx - 1] ?? hillHeight / MAX_HEIGHT;
        const hR = heightData[velikostMape - 1 - gz]?.[gx + 1] ?? hillHeight / MAX_HEIGHT;
        const hD = heightData[velikostMape - 1 - (gz - 1)]?.[gx] ?? hillHeight / MAX_HEIGHT;
        const hU = heightData[velikostMape - 1 - (gz + 1)]?.[gx] ?? hillHeight / MAX_HEIGHT;

        const dx = (hR - hL) * MAX_HEIGHT;
        const dz = (hU - hD) * MAX_HEIGHT;

        let nx = -dx;
        let ny = 2.0;
        let nz = -dz;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len;
        ny /= len;
        nz /= len;
        normals.push(nx, ny, nz);
      }
    }

    // --- Build indices with adaptive diagonals ---
    for (let row = 0; row < SUBDIVISIONS; row++) {
      for (let col = 0; col < SUBDIVISIONS; col++) {
        const i = row * (SUBDIVISIONS + 1) + col;

        const gx = col + cx * SUBDIVISIONS;
        const gz = row + cz * SUBDIVISIONS;

        const hA = heightData[velikostMape - 1 - gz]?.[gx] ?? 0;
        const hB = heightData[velikostMape - 1 - gz]?.[gx + 1] ?? 0;
        const hC = heightData[velikostMape - 1 - (gz + 1)]?.[gx] ?? 0;
        const hD = heightData[velikostMape - 1 - (gz + 1)]?.[gx + 1] ?? 0;

        const diffAD = Math.abs(hA - hD);
        const diffBC = Math.abs(hB - hC);

        if (diffAD > diffBC) {
          indices.push(i, i + 1, i + SUBDIVISIONS + 1);
          indices.push(i + 1, i + SUBDIVISIONS + 2, i + SUBDIVISIONS + 1);
        } else {
          indices.push(i, i + 1, i + SUBDIVISIONS + 2);
          indices.push(i, i + SUBDIVISIONS + 2, i + SUBDIVISIONS + 1);
        }
      }
    }

    // --- Return full chunk data ---
    self.postMessage({
      type: "buildDone",
      cx, cz, positions, colors, indices, weights, uvs, normals, fogFlags, waterFlags
    });
  }

  // =========================================================
  // === 2. FOG UPDATE ONLY (lightweight refresh) ============
  // =========================================================
  if (type === "updateFog") {
    const { cx, cz, SUBDIVISIONS, velikostMape, fowData } = event.data;
    const fogFlags: number[] = [];

    for (let row = 0; row <= SUBDIVISIONS; row++) {
      for (let col = 0; col <= SUBDIVISIONS; col++) {
        const gx = col + cx * SUBDIVISIONS;
        const gz = row + cz * SUBDIVISIONS;
        const fogFlag = (fowData[velikostMape - 1 - gz]?.[gx]) ? 1.0 : 0.0;
        fogFlags.push(fogFlag);
      }
    }

    // Return only fog flags (fast)
    self.postMessage({ type: "fogUpdate", cx, cz, fogFlags });
  }
};
