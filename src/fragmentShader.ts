export const fragmentShader = `
precision highp float;

varying vec3 vNormal;
varying vec3 vWorldPos;      // NEW: world position for triplanar
varying vec4 vWeights;
varying vec2 vUV;
varying vec4 vShadowCoord;
varying float vFogFlag;      // 0 = fog, 1 = visible
varying float vWaterFlag;    // 1 = water, 0 = land

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;      // will be used for triplanar
uniform sampler2D tex4;
uniform sampler2D shadowMap;

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

// --- Triplanar controls ---
uniform float slopeStart;    // e.g. 0.35  (start of fade-in)
uniform float slopeEnd;      // e.g. 0.70  (full triplanar by here)
uniform float triScale;      // e.g. 0.15  (world-to-UV scale)

// Helper: sample triplanar from tex3
vec3 sampleTriplanar(vec3 wp, vec3 n) {
    vec3 an = abs(n);
    an = an / (an.x + an.y + an.z + 1e-5);

    // world -> UVs (scale controls tiling)
    vec2 uvX = wp.zy * triScale; // X projection uses YZ
    vec2 uvY = wp.xz * triScale; // Y projection uses XZ
    vec2 uvZ = wp.xy * triScale; // Z projection uses XY

    vec3 xTex = texture2D(tex3, uvX).rgb;
    vec3 yTex = texture2D(tex3, uvY).rgb;
    vec3 zTex = texture2D(tex3, uvZ).rgb;

    return xTex * an.x + yTex * an.y + zTex * an.z;
}

void main() {
    // --- Project to light space ---
    vec3 proj = vShadowCoord.xyz / vShadowCoord.w;
    proj = proj * 0.5 + 0.5; // to [0..1]

    float shadowFactor = 1.0;
    if (proj.x >= 0.0 && proj.x <= 1.0 &&
        proj.y >= 0.0 && proj.y <= 1.0 &&
        proj.z >= 0.0 && proj.z <= 1.0) {

        float depth = texture2D(shadowMap, proj.xy).r;
        float currentDepth = proj.z;
        float bias = 0.005;
        shadowFactor = (currentDepth + bias < depth) ? 1.0 : 0.3;
    }

    // --- Blend terrain textures (5-way) ---
    vec4 c0 = texture2D(tex0, vUV);
    vec4 c1 = texture2D(tex1, vUV);
    vec4 c2 = texture2D(tex2, vUV);
    vec4 c3 = texture2D(tex3, vUV); // still sampled as regular UV layer if needed
    vec4 c4 = texture2D(tex4, vUV);

    float w0 = vWeights.r;
    float w1 = vWeights.g;
    float w2 = vWeights.b;
    float w3 = vWeights.a;
    float w4 = 1.0 - (w0 + w1 + w2 + w3);

    vec4 baseColor = c0*w0 + c1*w1 + c2*w2 + c3*w3 + c4*w4;

    // --- Triplanar slope amount ---
    vec3 N = normalize(vNormal);

    // geometric steepness: 0 on flat (normal up), 1 on vertical walls
    float steep = 1.0 - abs(N.y);

    // boost with water flag so shores/water get triplanar too
    // vWaterFlag: 1 (water) pushes the amount upward
    //zakomentirana vrstica za test in dodane naslednje dve
    //float boosted = clamp(steep + vWaterFlag, 0.0, 1.0);
    //float shoreMix = vWaterFlag * steep * 2.0; // amplify only near steep water edges
    //float boosted = clamp(steep + shoreMix, 0.0, 1.0);
    float boosted = clamp(steep + vWaterFlag*1.1 - vWaterFlag*vWaterFlag, 0.0, 1.0);
    
    // fade-in between slopeStart .. slopeEnd
    float triAmt = smoothstep(slopeStart, slopeEnd, boosted);

    // --- Sample triplanar cliff/shore texture from tex3 ---
    vec3 triRGB = sampleTriplanar(vWorldPos, N);

    // --- Combine: triplanar over base (RGB only) ---
    vec3 mixedRGB = mix(baseColor.rgb, triRGB, triAmt);

    // --- Lighting ---
    vec3 L = normalize(lightDirection);
    float NdotL = max(dot(N, L), 0.0);

    vec3 diffuse = mixedRGB * lightColor * NdotL * shadowFactor;
    vec3 ambient = mixedRGB * ambientColor;

    vec3 finalColor = ambient + diffuse;

    // --- Fog of war darkening (70% black), vFogFlag: 0=fog, 1=visible ---
    finalColor = mix(finalColor, vec3(0.0), (1.0 - vFogFlag) * 0.7);

    gl_FragColor = vec4(finalColor, baseColor.a);
}
`;
