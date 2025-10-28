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
uniform sampler2D tex4;

// Lighting uniforms
uniform vec3 lightDirection;  // normalized
uniform vec3 lightColor;      // e.g., {x:1,y:1,z:1}
uniform vec3 ambientColor;    // e.g., {x:0.2,y:0.2,z:0.2}

void main() {
    // Blend textures
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

    // Lighting
    vec3 N = normalize(vNormal);
    vec3 L = normalize(lightDirection);
    float NdotL = max(dot(N, L), 0.0);

    vec3 diffuse = texColor.rgb * lightColor * NdotL;
    vec3 ambient = texColor.rgb * ambientColor;

    vec3 finalColor = ambient + diffuse;

    gl_FragColor = vec4(finalColor, texColor.a);
}

`;