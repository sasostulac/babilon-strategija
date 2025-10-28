export const vertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;   // vertex weights
attribute vec2 uv;

// Uniforms
uniform mat4 world;
uniform mat4 worldViewProjection;

// Varyings to fragment shader
varying vec3 vPosition; // world-space position
varying vec3 vNormal;   // world-space normal
varying vec4 vWeights;
varying vec2 vUV;

void main() {
    // World-space position
    vec4 worldPos = world * vec4(position, 1.0);
    vPosition = worldPos.xyz;

    // World-space normal
    vNormal = normalize(mat3(world) * normal * -1.0);

    // Pass other varyings
    vWeights = color;
    vUV = uv;

    // Final clip-space position
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;