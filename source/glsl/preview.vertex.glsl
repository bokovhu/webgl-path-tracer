#version 300 es

precision highp float;

in vec4 a_vertexPosition;

out vec2 v_texCoords;

void main() {
    v_texCoords = a_vertexPosition.xy * 0.5 + 0.5;
    gl_Position = a_vertexPosition;
}
