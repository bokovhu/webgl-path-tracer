#version 300 es

precision highp float;

in vec4 a_vertexPosition;

uniform struct {
    vec4 position;
    mat4 rayDirMatrix;
    vec3 front;
    vec3 up;
    vec3 right;
} camera;

out vec4 v_rayDir;
out vec2 v_texCoord;

void main() {
    v_rayDir = a_vertexPosition * camera.rayDirMatrix;
    // v_texCoord = vec2(0.5 + 0.5 * a_vertexPosition.x, 1.0 - (0.5 + (0.5 * a_vertexPosition.y)));
    v_texCoord = a_vertexPosition.xy * 0.5 + 0.5;
    gl_Position = a_vertexPosition;
}
