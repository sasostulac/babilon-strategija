export const fragmentShader = `
precision highp float;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vWeights;
varying vec2 vUV;

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3; // cliff texture (triplanar)
uniform sampler2D tex4; // fog of war / water mask

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

uniform float rockScale;       // tiling factor for cliff texture
uniform vec2 slopeRange;       // min/max slope for cliffs (e.g., 0.4–0.75)
uniform float cliffStrength;   // blending strength (0–1)

// --- hash noise to break up transitions ---
float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

// --- triplanar sampling ---
vec4 triplanarSample(sampler2D tex, vec3 wp, vec3 wn, float scale) {
    vec3 n = abs(normalize(wn)) + 1e-5;
    n /= (n.x + n.y + n.z);

    vec2 uvX = wp.zy * scale;
    vec2 uvY = wp.xz * scale;
    vec2 uvZ = wp.xy * scale;

    vec4 tx = texture2D(tex, uvX);
    vec4 ty = texture2D(tex, uvY);
    vec4 tz = texture2D(tex, uvZ);

    return tx * n.x + ty * n.y + tz * n.z;
}

void main() {
    // === Base terrain textures ===
    vec4 c0 = texture2D(tex0, vUV);
    vec4 c1 = texture2D(tex1, vUV);
    vec4 c2 = texture2D(tex2, vUV);
    vec4 c3 = texture2D(tex3, vUV);
    vec4 fogTex = texture2D(tex4, vUV);

    float w0 = vWeights.r;
    float w1 = vWeights.g;
    float w2 = vWeights.b;
    float w3 = vWeights.a;
    float w4 = max(0.0, 1.0 - (w0 + w1 + w2 + w3)); // fog/water weight

    // Normalize terrain weights (exclude fog)
    float ws = max(1e-5, w0 + w1 + w2 + w3);
    w0 /= ws; w1 /= ws; w2 /= ws; w3 /= ws;

    vec4 baseColor = c0*w0 + c1*w1 + c2*w2 + c3*w3;

    // ===========================================================
    //   CLIFF MASK (slope-gated water boost)
    // ===========================================================

    vec3 n = normalize(vNormal);
    float baseSlope = 1.0 - abs(n.y); // slope 0=flat, 1=vertical

    // Regular slope-based mask
    float slopeMask = smoothstep(slopeRange.x, slopeRange.y, baseSlope);

    // Water/fog weight (w4 = 1 → full water)
    float waterFactor = clamp(w4, 0.0, 1.0);

    // Gate boost to affect only steep surfaces
    float minSlopeForBoost = 0.28;  // tweak range 0.2–0.35
    float boostGate = smoothstep(minSlopeForBoost - 0.05, minSlopeForBoost + 0.05, baseSlope);

    // Combine gate + water influence
    float waterBoost = pow(waterFactor, 0.5) * boostGate;

    // Push slope toward vertical where boost applies
    float boostedSlope = mix(baseSlope, 1.0, waterBoost);

    // Final cliff mask (smooth transition)
    float cliffMask = smoothstep(slopeRange.x, slopeRange.y, boostedSlope);

    // Small random breakup
    float nnoise = hash31(vPosition * 0.3);
    cliffMask = clamp(cliffMask + (nnoise - 0.5) * 0.1, 0.0, 1.0);

    // ===========================================================
    //   APPLY TRIPLANAR CLIFF TEXTURE
    // ===========================================================

    vec4 cliffTex = triplanarSample(tex3, vPosition, vNormal, rockScale);
    vec4 terrainColor = mix(baseColor, cliffTex, cliffMask * cliffStrength);

    // ===========================================================
    //   LIGHTING
    // ===========================================================

    vec3 N = normalize(vNormal);
    vec3 L = normalize(lightDirection);
    float NdotL = max(dot(N, L), 0.0);

    vec3 diffuse = terrainColor.rgb * lightColor * NdotL;
    vec3 ambient = terrainColor.rgb * ambientColor;
    vec3 litColor = ambient + diffuse;

    // ===========================================================
    //   FOG OF WAR / WATER BLENDING
    // ===========================================================

    // Smoothly interpolate between litColor and fog texture
    vec3 fogged = mix(litColor, fogTex.rgb, w4);

    gl_FragColor = vec4(fogged, terrainColor.a);
}
`;
