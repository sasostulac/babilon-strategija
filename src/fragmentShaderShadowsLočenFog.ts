export const fragmentShader = `
precision highp float;

varying vec3 vNormal;
varying vec4 vWeights;
varying vec2 vUV;
varying vec4 vShadowCoord;
varying float vFogFlag;       // new varying from vertex shader
varying float vWaterFlag;       // new varying from vertex shader

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;
uniform sampler2D tex4;
uniform sampler2D shadowMap;

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

void main() {
    // --- Project to light space ---
    vec3 proj = vShadowCoord.xyz / vShadowCoord.w;
    proj = proj * 0.5 + 0.5; // to [0..1]

    // Default: fully lit (used when outside shadow frustum)
    float shadowFactor = 1.0;

    // Only sample shadow map if inside frustum
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
    vec4 c3 = texture2D(tex3, vUV);
    vec4 c4 = texture2D(tex4, vUV);

    float w0 = vWeights.r;
    float w1 = vWeights.g;
    float w2 = vWeights.b;
    float w3 = vWeights.a;
    float w4 = 1.0 - (w0 + w1 + w2 + w3);

    vec4 texColor = c0*w0 + c1*w1 + c2*w2 + c3*w3 + c4*w4;

    // --- Lighting ---
    vec3 N = normalize(vNormal);
    vec3 L = normalize(lightDirection);
    float NdotL = max(dot(N, L), 0.0);

    vec3 diffuse = texColor.rgb * lightColor * NdotL * shadowFactor;
    vec3 ambient = texColor.rgb * ambientColor;

    vec3 finalColor = ambient + diffuse;

    // --- Apply fog of war darkening (70% black) ---
    // vFogFlag: 0.0 = fog, 1.0 = visible
    finalColor = mix(finalColor, vec3(0.0), (1.0 - vFogFlag) * 0.7);

    gl_FragColor = vec4(finalColor, texColor.a);
}
`;
