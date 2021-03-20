#version 300 es

precision highp float;

uniform sampler2D textureImage;
in vec2 v_texCoords;

out vec4 out_finalColor;

void main() {
    vec3 rgb = texture(textureImage, v_texCoords).xyz;
    rgb = pow(rgb, vec3(1.0 / 2.2));
    out_finalColor = vec4(rgb, 1.0);
}
