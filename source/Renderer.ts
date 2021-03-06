import { Timer } from "./Timer";
import { Camera, CameraUniformLocations } from "./Camera";
import { Scene } from "./Scene";
import { Images } from "./Images";
import { createRenderTarget, RenderTarget } from "./RenderTarget";
import {
    compileFragmentShader,
    compileShader,
    compileVertexShader,
    createProgram,
    introspectProgram,
} from "./Shader";

export interface RendererHost {
    readonly timer: Timer;
    readonly gl: WebGL2RenderingContext;
    readonly width: number;
    readonly height: number;
    readonly camera: Camera;
    readonly scene: Scene;
    readonly images: Images;
    readonly dropSignaled: boolean;
    readonly isPaused: boolean;
    unsignalDrop(): void;
}

const fullScreenQuadData: Float32Array = new Float32Array(
    // prettier-ignore
    [
        -1, 1, 0.5,
        -1, -1, 0.5,
        1, 1, 0.5,
        -1, -1, 0.5,
        1, -1, 0.5,
        1, 1, 0.5
    ]
);

export class Renderer {
    private pathtracerProgram: WebGLProgram;
    private fullScreenQuadVBO: WebGLBuffer;
    private fullScreenQuadVAO: WebGLVertexArrayObject;
    private environmentMapTexture: WebGLTexture;
    private pathtracerUniforms: {
        time: WebGLUniformLocation;
        seed: WebGLUniformLocation;
        previousTexture: WebGLUniformLocation;
        pixelSize: WebGLUniformLocation;
        environmentMapTexture: WebGLUniformLocation;
        environmentExposure: WebGLUniformLocation;
        frameCount: WebGLUniformLocation;
    };
    private cameraUniforms: CameraUniformLocations;
    private frameCount: number = 0;

    private introspectShaders() {
        this.cameraUniforms = introspectProgram(
            this.host,
            this.pathtracerProgram,
            {
                position: "camera.position",
                rayDirMatrix: "camera.rayDirMatrix",
                front: "camera.front",
                up: "camera.up",
                right: "camera.right",
            }
        );

        this.pathtracerUniforms = introspectProgram(
            this.host,
            this.pathtracerProgram,
            {
                time: "scene.time",
                seed: "scene.seed",
                previousTexture: "scene.previousTexture",
                pixelSize: "scene.pixelSize",
                environmentMapTexture: "scene.environmentMapTexture",
                environmentExposure: "scene.environmentExposure",
                frameCount: "scene.frameCount",
            }
        );

        this.host.scene.introspectPathtracer(
            this.pathtracerProgram,
            this.host.gl
        );
    }

    private createShaders() {
        const pathtracerVS = compileVertexShader(
            this.host,
            "Pathtracer vertex shader",
            this.host.scene.programVertexSource
        );
        const pathtracerFS = compileFragmentShader(
            this.host,
            "Pathtracer fragment shader",
            this.host.scene.programFragmentSource
        );

        this.pathtracerProgram = createProgram(
            this.host,
            "Pathtracer",
            pathtracerVS,
            pathtracerFS
        );

        this.host.gl.deleteShader(pathtracerVS);
        this.host.gl.deleteShader(pathtracerFS);

        this.introspectShaders();
    }

    private createGeometry() {
        this.fullScreenQuadVAO = this.host.gl.createVertexArray();
        this.host.gl.bindVertexArray(this.fullScreenQuadVAO);

        this.fullScreenQuadVBO = this.host.gl.createBuffer();
        this.host.gl.bindBuffer(
            this.host.gl.ARRAY_BUFFER,
            this.fullScreenQuadVBO
        );
        this.host.gl.bufferData(
            this.host.gl.ARRAY_BUFFER,
            fullScreenQuadData,
            this.host.gl.STATIC_DRAW
        );

        this.host.gl.enableVertexAttribArray(0);
        this.host.gl.vertexAttribPointer(0, 3, this.host.gl.FLOAT, false, 0, 0);
    }

    private createEnvironmentMap() {
        this.host.gl.activeTexture(this.host.gl.TEXTURE1);
        this.environmentMapTexture = this.host.gl.createTexture();
        this.host.gl.bindTexture(
            this.host.gl.TEXTURE_CUBE_MAP,
            this.environmentMapTexture
        );

        const images = this.host.images;

        const nx = images.getImage("env-nx");
        const px = images.getImage("env-px");
        const ny = images.getImage("env-ny");
        const py = images.getImage("env-py");
        const nz = images.getImage("env-nz");
        const pz = images.getImage("env-pz");

        this.host.gl.texImage2D(
            this.host.gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            0,
            this.host.gl.RGBA,
            nx.width,
            nx.height,
            0,
            this.host.gl.RGBA,
            this.host.gl.UNSIGNED_BYTE,
            nx
        );
        this.host.gl.texImage2D(
            this.host.gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            0,
            this.host.gl.RGBA,
            px.width,
            px.height,
            0,
            this.host.gl.RGBA,
            this.host.gl.UNSIGNED_BYTE,
            px
        );
        this.host.gl.texImage2D(
            this.host.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            0,
            this.host.gl.RGBA,
            ny.width,
            ny.height,
            0,
            this.host.gl.RGBA,
            this.host.gl.UNSIGNED_BYTE,
            ny
        );
        this.host.gl.texImage2D(
            this.host.gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            0,
            this.host.gl.RGBA,
            py.width,
            py.height,
            0,
            this.host.gl.RGBA,
            this.host.gl.UNSIGNED_BYTE,
            py
        );
        this.host.gl.texImage2D(
            this.host.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            0,
            this.host.gl.RGBA,
            nz.width,
            nz.height,
            0,
            this.host.gl.RGBA,
            this.host.gl.UNSIGNED_BYTE,
            nz
        );
        this.host.gl.texImage2D(
            this.host.gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            0,
            this.host.gl.RGBA,
            pz.width,
            pz.height,
            0,
            this.host.gl.RGBA,
            this.host.gl.UNSIGNED_BYTE,
            pz
        );

        this.host.gl.texParameteri(
            this.host.gl.TEXTURE_CUBE_MAP,
            this.host.gl.TEXTURE_MIN_FILTER,
            this.host.gl.LINEAR
        );
        this.host.gl.texParameteri(
            this.host.gl.TEXTURE_CUBE_MAP,
            this.host.gl.TEXTURE_MAG_FILTER,
            this.host.gl.LINEAR
        );
    }

    constructor(private host: RendererHost) {
        this.createShaders();
        this.createGeometry();
        this.createEnvironmentMap();
    }

    dispose() {
        this.host.gl.useProgram(null);
        this.host.gl.bindVertexArray(null);
        this.host.gl.bindBuffer(this.host.gl.ARRAY_BUFFER, null);
        this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, null);

        this.host.gl.deleteProgram(this.pathtracerProgram);
        this.host.gl.deleteVertexArray(this.fullScreenQuadVAO);
        this.host.gl.deleteBuffer(this.fullScreenQuadVBO);

        this.host.gl.deleteTexture(this.environmentMapTexture);
    }

    drawFullScreenQuad() {

        this.host.gl.bindVertexArray(this.fullScreenQuadVAO);
        this.host.gl.drawArrays(this.host.gl.TRIANGLES, 0, 6);

    }

    renderScene() {
        this.host.gl.useProgram(this.pathtracerProgram);

        this.host.gl.clearColor(0, 0, 0, 1);
        this.host.gl.clear(this.host.gl.COLOR_BUFFER_BIT);

        this.host.gl.viewport(0, 0, this.host.width, this.host.height);

        this.host.camera.applyUniforms(this.cameraUniforms, this.host.gl);
        this.host.scene.applyUniforms(this.host.gl);
        this.host.timer.applyUniforms(this.pathtracerUniforms, this.host.gl);

        this.host.gl.activeTexture(this.host.gl.TEXTURE1);
        this.host.gl.bindTexture(
            this.host.gl.TEXTURE_CUBE_MAP,
            this.environmentMapTexture
        );

        this.host.gl.uniform1i(
            this.pathtracerUniforms.environmentMapTexture,
            1
        );

        this.host.gl.uniform1f(this.pathtracerUniforms.environmentExposure, 1);
        this.host.gl.uniform1f(this.pathtracerUniforms.seed, Math.random());
        this.host.gl.uniform1f(
            this.pathtracerUniforms.pixelSize,
            1.0 / Math.min(this.host.width, this.host.height)
        );
        this.host.gl.uniform1i(
            this.pathtracerUniforms.frameCount,
            this.frameCount
        );

        this.drawFullScreenQuad();
    }

}
