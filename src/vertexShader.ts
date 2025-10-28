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
uniform float riverLevel; // new
uniform float riverEps;   // new: tolerance around river level

// Varyings
varying vec3 vPosition; // world-space position
varying vec3 vNormal;   // world-space normal
varying vec4 vWeights;
varying vec2 vUV;
varying float vRiverFlag; // new: 1.0 if this vertex is at (or very near) river level

void main() {
    // World-space position
    vec4 worldPos = world * vec4(position, 1.0);
    vPosition = worldPos.xyz;

    // World-space normal
    vNormal = normalize(mat3(world) * normal * -1.0);

    // Pass through
    vWeights = color;
    vUV = uv;

    // Mark vertices near river level (|y - riverLevel| <= riverEps)
    // This will interpolate across the triangle; if any vertex is 1, most of the tri gets >0
    float nearRiver = step(abs(worldPos.y - riverLevel), riverEps);
    vRiverFlag = nearRiver;

    // Final clip-space
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;
