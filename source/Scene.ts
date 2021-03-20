import { Surface, SurfaceUniformLocations } from "./Surface";
import { Material, MaterialUniformLocations } from "./Material";
import { PointLight, PointLightUniformLocations } from "./PointLight";

export class Scene {
    private surfaceUniformLocationInterfaces: Array<SurfaceUniformLocations> = [];
    private surfaces: Array<Surface> = [];

    private materialUniformLocationInterfaces: Array<MaterialUniformLocations> = [];
    private materials: Array<Material> = [];

    private pointLightUniformLocationInterfaces: Array<PointLightUniformLocations> = [];
    private pointLights: Array<PointLight> = [];

    private shouldApplyUniforms: boolean = true;

    constructor(
        private maxSurfaceCount: number,
        private maxMaterialCount: number,
        private maxPointLightCount: number
    ) {}

    introspectPathtracer(program: WebGLProgram, gl: WebGL2RenderingContext) {
        this.surfaceUniformLocationInterfaces = [];
        this.materialUniformLocationInterfaces = [];
        this.pointLightUniformLocationInterfaces = [];

        for (let i = 0; i < this.maxSurfaceCount; i++) {
            this.surfaceUniformLocationInterfaces.push({
                Q: gl.getUniformLocation(program, `surfaces[${i}].Q`),
                C: gl.getUniformLocation(program, `surfaces[${i}].C`),
                materialId: gl.getUniformLocation(
                    program,
                    `surfaces[${i}].materialId`
                ),
            });
        }

        for (let i = 0; i < this.maxMaterialCount; i++) {
            this.materialUniformLocationInterfaces.push({
                diffuse: gl.getUniformLocation(
                    program,
                    `materials[${i}].diffuse`
                ),
                specular: gl.getUniformLocation(
                    program,
                    `materials[${i}].specular`
                ),
                emissive: gl.getUniformLocation(
                    program,
                    `materials[${i}].emissive`
                ),
            });
        }

        for (let i = 0; i < this.maxPointLightCount; i++) {
            this.pointLightUniformLocationInterfaces.push({
                position: gl.getUniformLocation(
                    program,
                    `pointLights[${i}].position`
                ),
                intensity: gl.getUniformLocation(
                    program,
                    `pointLights[${i}].intensity`
                ),
                falloff: gl.getUniformLocation(
                    program,
                    `pointLights[${i}].falloff`
                ),
                enabled: gl.getUniformLocation(
                    program,
                    `pointLights[${i}].enabled`
                ),
            });
        }

        this.shouldApplyUniforms = true;
    }

    addSurface(...args: Array<Surface>) {
        for (let s of args) {
            if (this.surfaces.length >= this.maxSurfaceCount) {
                throw new Error(
                    `Cannot add more than ${this.maxSurfaceCount} surfaces!`
                );
            }

            this.surfaces.push(s);
        }

        this.shouldApplyUniforms = true;
    }

    addMaterial(...args: Array<Material>) {
        for (let m of args) {
            if (this.materials.length >= this.maxMaterialCount) {
                throw new Error(
                    `Cannot add more than ${this.maxMaterialCount} materials!`
                );
            }

            this.materials.push(m);
        }

        this.shouldApplyUniforms = true;
    }

    addPointLight(...args: Array<PointLight>) {
        for (let pl of args) {
            if (this.pointLights.length >= this.maxPointLightCount) {
                throw new Error(
                    `Cannot add more than ${this.maxPointLightCount} point lights!`
                );
            }

            this.pointLights.push(pl);
        }

        this.shouldApplyUniforms = true;
    }

    applyUniforms(gl: WebGL2RenderingContext) {
        if (this.shouldApplyUniforms) {
            for (let i = 0; i < this.maxSurfaceCount; i++) {
                const surfaceInterface = this.surfaceUniformLocationInterfaces[
                    i
                ];

                if (i < this.surfaces.length) {
                    const surf = this.surfaces[i];

                    if (
                        surf.materialId < 0 ||
                        surf.materialId >= this.maxMaterialCount
                    ) {
                        throw new Error(
                            `Invalid material ID: ${surf.materialId}`
                        );
                    }
                    this.surfaces[i].applyUniforms(surfaceInterface, gl);
                } else {
                    gl.uniform1i(surfaceInterface.materialId, -1);
                }
            }

            for (let i = 0; i < this.maxMaterialCount; i++) {
                const materialInterface = this
                    .materialUniformLocationInterfaces[i];

                if (i < this.materials.length) {
                    const mat = this.materials[i];
                    mat.applyUniforms(materialInterface, gl);
                }
            }

            for (let i = 0; i < this.maxPointLightCount; i++) {
                const pointLightInterface = this
                    .pointLightUniformLocationInterfaces[i];

                if (i < this.pointLights.length) {
                    const pl = this.pointLights[i];
                    gl.uniform1i(pointLightInterface.enabled, 1);
                    pl.applyUniforms(pointLightInterface, gl);
                } else {
                    gl.uniform1i(pointLightInterface.enabled, 0);
                }
            }

            this.shouldApplyUniforms = false;
        }
    }
}
