import { vec3 } from "gl-matrix";

export interface MaterialUniformLocations {
    diffuse: WebGLUniformLocation;
    specular: WebGLUniformLocation;
    emissive: WebGLUniformLocation;
}

export class Material {
    constructor(
        private diffuse: vec3,
        private specular: vec3,
        private shininess: number,
        private emissive: vec3
    ) {}

    applyUniforms(
        locations: MaterialUniformLocations,
        gl: WebGL2RenderingContext
    ) {
        gl.uniform3f(
            locations.diffuse,
            this.diffuse[0],
            this.diffuse[1],
            this.diffuse[2]
        );
        gl.uniform4f(
            locations.specular,
            this.specular[0],
            this.specular[1],
            this.specular[2],
            this.shininess
        );
        gl.uniform3f(
            locations.emissive,
            this.emissive[0],
            this.emissive[1],
            this.emissive[2]
        );
    }
}
