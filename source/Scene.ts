import { Surface, SurfaceUniformLocations } from "./Surface";
import { Material, MaterialUniformLocations } from "./Material";
import { PointLight, PointLightUniformLocations } from "./PointLight";

import srcPathtracerVS from "./glsl/pathtracer.vertex.glsl";
import srcPathtracerFS from "./glsl/pathtracer.fragment.glsl";
import { introspectProgram } from "./Shader";

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
            this.surfaceUniformLocationInterfaces.push(
                introspectProgram({ gl }, program, {
                    Q: `surfaces[${i}].Q`,
                    C: `surfaces[${i}].C`,
                    materialId: `surfaces[${i}].materialId`,
                })
            );
        }

        for (let i = 0; i < this.maxMaterialCount; i++) {
            this.materialUniformLocationInterfaces.push(
                introspectProgram({ gl }, program, {
                    diffuse: `materials[${i}].diffuse`,
                    specular: `materials[${i}].specular`,
                    emissive: `materials[${i}].emissive`,
                    reflectivity: `materials[${i}].reflectivity`,
                    refractivity: `materials[${i}].refractivity`,
                    reflectionRefractionProbability: `materials[${i}].reflRefrProbability`,
                })
            );
        }

        for (let i = 0; i < this.maxPointLightCount; i++) {
            this.pointLightUniformLocationInterfaces.push(
                introspectProgram({ gl }, program, {
                    position: `pointLights[${i}].position`,
                    intensity: `pointLights[${i}].intensity`,
                    falloff: `pointLights[${i}].falloff`,
                    enabled: `pointLights[${i}].enabled`,
                })
            );
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

    get programVertexSource(): string {
        return srcPathtracerVS;
    }

    get programFragmentSource(): string {
        const defines = [
            `#define N_MAX_MATERIALS ${this.maxMaterialCount}`,
            `#define N_MAX_SURFACES ${this.maxSurfaceCount}`,
            `#define N_POINT_LIGHTS ${this.maxPointLightCount}`,
        ].join("\n");
        return srcPathtracerFS.replace("/// <DEFINES>", defines);
    }
}
