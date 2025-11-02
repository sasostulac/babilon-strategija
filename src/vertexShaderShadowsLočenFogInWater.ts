export const vertexShader = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;
attribute float fogFlag;
attribute float waterFlag;

uniform mat4 world;
uniform mat4 worldViewProjection;
uniform mat4 lightViewProjection;

varying vec3 vNormal;
varying vec4 vWeights;
varying vec2 vUV;
varying vec4 vShadowCoord;
varying float vFogFlag;
varying float vWaterFlag;

void main() {
    vec4 worldPos = world * vec4(position, 1.0);
    vNormal = normalize(mat3(world) * normal * -1.0);
    vWeights = color;
    vUV = uv;
    vShadowCoord = lightViewProjection * worldPos;
    vFogFlag = fogFlag;
    vWaterFlag = waterFlag;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;