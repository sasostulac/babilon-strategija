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

uniform float rockScale;
uniform vec2 slopeRange;
uniform float cliffStrength;

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
    // === Base textures ===
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
    //   CLIFF MASK (auto water-aware, matches inverted normals)
    // ===========================================================

    vec3 n = normalize(vNormal);
    float baseSlope = 1.0 - abs(n.y); // unchanged by sign inversion

    // Water weight as cliff booster
    float waterFactor = clamp(w4, 0.0, 1.0);

    // Strongly push slope toward 1 near water
    float boostedSlope = mix(baseSlope, 1.0, pow(waterFactor, 0.5));

    // Compute mask with smooth thresholds
    float slopeMask = smoothstep(slopeRange.x, slopeRange.y, boostedSlope);

    // Add small noise for variation
    float nnoise = hash31(vPosition * 0.3);
    slopeMask = clamp(slopeMask + (nnoise - 0.5) * 0.1, 0.0, 1.0);

    float cliffMask = slopeMask;

    // ===========================================================
    //   APPLY TRIPLANAR CLIFF TEXTURE
    // ===========================================================

    vec4 cliffTex = triplanarSample(tex3, vPosition, vNormal, rockScale);
    vec4 terrainColor = mix(baseColor, cliffTex, cliffMask * cliffStrength);

    // ===========================================================
    //   LIGHTING (consistent with inverted normal orientation)
    // ===========================================================

    vec3 N = normalize(vNormal);
    vec3 L = normalize(lightDirection);
    float NdotL = max(dot(N, L), 0.0);

    vec3 diffuse = terrainColor.rgb * lightColor * NdotL;
    vec3 ambient = terrainColor.rgb * ambientColor;
    vec3 litColor = ambient + diffuse;

    // ===========================================================
    //   FOG OF WAR DARKENING
    // ===========================================================

    vec3 finalColor = mix(litColor, litColor * fogTex.rgb, w4);

    gl_FragColor = vec4(finalColor, terrainColor.a);
}
`;
