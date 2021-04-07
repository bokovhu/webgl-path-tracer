#version 300 es

precision highp float;

in vec2 v_texCoords;

out vec4 out_finalColor;

uniform struct {
    sampler2D a;
    sampler2D b;
} images;

void main() {

    out_finalColor = vec4(0.5 * texture(images.a, v_texCoords).xyz + 0.5 * texture(images.b, v_texCoords).xyz, 1.0);

}
