#version 300 es

precision highp float;

uniform sampler2D image;

in vec2 v_texCoord;

out vec4 out_finalColor;

void main() {
    vec3 rgb = texture(image, v_texCoord).xyz;
    out_finalColor = vec4(pow(rgb, vec3(1.0 / 2.2)), 1.0);
}
