import { vec3 } from "gl-matrix";

export interface PointLightUniformLocations {
    position: WebGLUniformLocation;
    intensity: WebGLUniformLocation;
    falloff: WebGLUniformLocation;
    enabled: WebGLUniformLocation;
}

export class PointLight {
    constructor(
        private position: vec3,
        private intensity: vec3,
        private falloff: vec3
    ) {}

    applyUniforms(
        locations: PointLightUniformLocations,
        gl: WebGL2RenderingContext
    ) {
        gl.uniform3f(
            locations.position,
            this.position[0],
            this.position[1],
            this.position[2]
        );
        gl.uniform3f(
            locations.intensity,
            this.intensity[0],
            this.intensity[1],
            this.intensity[2]
        );
        gl.uniform3f(
            locations.falloff,
            this.falloff[0],
            this.falloff[1],
            this.falloff[2]
        );
    }
}
