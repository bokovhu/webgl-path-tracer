#version 300 es

precision highp float;

in vec2 v_texCoords;

out vec4 out_finalColor;

sampler2D previewImage;

void main() {

    out_finalColor = vec4(texture(previewImage, v_texCoords).xyz, 1.0);

}
