export const fragmentShader = `
precision highp float;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vWeights;
varying vec2 vUV;

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;
uniform sampler2D tex4; // fog of war

// Lighting uniforms
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

// Cliff parameters
uniform float rockScale;       // tiling factor for cliff texture
uniform vec2 slopeRange;       // min/max slope range (0–1)
uniform float cliffStrength;   // blending strength (0–1)

// Simple hash noise to break up transitions
float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

// Triplanar sampling (no UV stretching)
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
    // === Base 4 diffuse textures (without fog yet) ===
    vec4 c0 = texture2D(tex0, vUV);
    vec4 c1 = texture2D(tex1, vUV);
    vec4 c2 = texture2D(tex2, vUV);
    vec4 c3 = texture2D(tex3, vUV);

    // Fog texture (tex4)
    vec4 fogTex = texture2D(tex4, vUV);

    float w0 = vWeights.r;
    float w1 = vWeights.g;
    float w2 = vWeights.b;
    float w3 = vWeights.a;
    float w4 = max(0.0, 1.0 - (w0 + w1 + w2 + w3)); // fog weight

    // Normalize weights for first 4 (so they still sum correctly under fog)
    float ws = max(1e-5, w0 + w1 + w2 + w3);
    w0 /= ws; w1 /= ws; w2 /= ws; w3 /= ws;

    // Base terrain color (no fog yet)
    vec4 baseColor = c0*w0 + c1*w1 + c2*w2 + c3*w3;

    // --- Compute slope that also reacts to low height (river edges) ---
    vec3 n = normalize(vNormal);

    float riverLevel = 0.3;   // approximate river height
    float blendHeight = 2.0;  // how far above river to start blending
    float heightFactor = clamp((vPosition.y - riverLevel) / blendHeight, 0.0, 1.0);

    float adjustedY = mix(0.0, n.y, heightFactor);
    n = normalize(vec3(n.x, adjustedY, n.z));

    float slope = 1.0 - abs(n.y);
    float slopeMask = smoothstep(slopeRange.x, slopeRange.y, slope);

    float nnoise = hash31(vPosition * 0.3);
    slopeMask = clamp(slopeMask + (nnoise - 0.5) * 0.1, 0.0, 1.0);

    float cliffMask = slopeMask;

    // --- Sample cliff texture triplanar (using tex3) ---
    vec4 cliffTex = triplanarSample(tex3, vPosition, vNormal, rockScale);

    // --- Blend cliffs into base terrain ---
    vec4 terrainColor = mix(baseColor, cliffTex, cliffMask * cliffStrength);

    // --- Lighting ---
    vec3 N = normalize(vNormal);
    vec3 L = normalize(lightDirection);
    float NdotL = max(dot(N, L), 0.0);

    vec3 diffuse = terrainColor.rgb * lightColor * NdotL;
    vec3 ambient = terrainColor.rgb * ambientColor;
    vec3 litColor = ambient + diffuse;

    // === Apply fog of war as darkening overlay ===
    // w4 = fog intensity (1.0 = fully fogged)
    vec3 finalColor = mix(litColor, litColor * fogTex.rgb, w4);

    gl_FragColor = vec4(finalColor, terrainColor.a);
}
`;
