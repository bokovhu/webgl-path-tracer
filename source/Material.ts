import { vec2, vec3, vec4 } from "gl-matrix";

export interface MaterialUniformLocations {
    diffuse: WebGLUniformLocation;
    specular: WebGLUniformLocation;
    emissive: WebGLUniformLocation;
    reflectivity: WebGLUniformLocation;
    refractivity: WebGLUniformLocation;
    ior: WebGLUniformLocation;
}

export class Material {
    constructor(
        private diffuse: vec3,
        private specular: vec3 = [0, 0, 0],
        private shininess: number = 1.0,
        private emissive: vec3 = [0, 0, 0],
        private reflectivity: vec4 = [0, 0, 0, 0],
        private refractivity: vec4 = [0, 0, 0, 0],
        private ior: number = 1.0
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
        gl.uniform4f(
            locations.reflectivity,
            this.reflectivity[0],
            this.reflectivity[1],
            this.reflectivity[2],
            this.reflectivity[3]
        );
        gl.uniform4f(
            locations.refractivity,
            this.refractivity[0],
            this.refractivity[1],
            this.refractivity[2],
            this.refractivity[3]
        );
        gl.uniform1f(locations.ior, this.ior);
    }
}
