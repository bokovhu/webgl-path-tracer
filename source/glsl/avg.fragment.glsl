#version 300 es

precision highp float;

in vec2 v_texCoords;

out vec4 out_finalColor;

uniform struct {
    sampler2D a;
    sampler2D b;
} images;

uniform int frameCount;

void main() {

    vec3 a = texture(images.a, v_texCoords).xyz;
    vec3 b = texture(images.b, v_texCoords).xyz;

    vec3 c = a + (b - a) / vec3(float(frameCount));

    out_finalColor = vec4(c, 1.0);

}
