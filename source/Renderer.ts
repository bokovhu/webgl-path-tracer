import { Timer } from "./Timer";
import srcTexturedVS from "./glsl/textured.vertex.glsl";
import srcTexturedFS from "./glsl/textured.fragment.glsl";
import { Camera } from "./Camera";
import { Scene } from "./Scene";
import { Images } from "./Images";

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

interface RenderTarget {
    fbo: WebGLFramebuffer;
    texture: WebGLTexture;
}

export class Renderer {
    private pathtracerProgram: WebGLProgram;
    private texturedProgram: WebGLProgram;
    private fullScreenQuadVBO: WebGLBuffer;
    private fullScreenQuadVAO: WebGLVertexArrayObject;
    private environmentMapTexture: WebGLTexture;
    private pingPongBuffers: [RenderTarget, RenderTarget];
    private pingPongTarget: number = 0;
    private pathtracerUniforms: {
        "camera.position": WebGLUniformLocation;
        "camera.rayDirMatrix": WebGLUniformLocation;
        time: WebGLUniformLocation;
        seed: WebGLUniformLocation;
        previousTexture: WebGLUniformLocation;
        pixelSize: WebGLUniformLocation;
        environmentMapTexture: WebGLUniformLocation;
        environmentExposure: WebGLUniformLocation;
    };
    private texturedUniforms: {
        textureImage: WebGLUniformLocation;
    };

    private compileShader(name: string, src: string, type: number) {
        const shader = this.host.gl.createShader(type);
        this.host.gl.shaderSource(shader, src);

        console.log(`Compiling ${name} ...`);

        this.host.gl.compileShader(shader);

        console.log(`Compiled ${name}!`);

        const compileStatus = this.host.gl.getShaderParameter(
            shader,
            this.host.gl.COMPILE_STATUS
        );
        if (!compileStatus) {
            const infoLog = this.host.gl.getShaderInfoLog(shader);
            throw new Error(`Could not compile ${name}: ${infoLog}`);
        }

        const err = this.host.gl.getError();
        if (err) {
            throw new Error(
                `OpenGL error after creating shader ${name}: ${err}`
            );
        }

        return shader;
    }

    private createProgram(name: string, vs: WebGLShader, fs: WebGLShader) {
        const program = this.host.gl.createProgram();

        this.host.gl.attachShader(program, vs);
        this.host.gl.attachShader(program, fs);

        console.log(`Linking ${name}...`);

        this.host.gl.linkProgram(program);

        console.log(`Linked ${name}!`);

        const linkStatus = this.host.gl.getProgramParameter(
            program,
            this.host.gl.LINK_STATUS
        );

        if (!linkStatus) {
            const infoLog = this.host.gl.getProgramInfoLog(program);
            throw new Error(`Could not link ${name}: ${infoLog}`);
        }

        /*this.host.gl.validateProgram(program);
        const validateStatus = this.host.gl.getProgramParameter(
            program,
            this.host.gl.VALIDATE_STATUS
        );

        if (!validateStatus) {
            const infoLog = this.host.gl.getProgramInfoLog(program);
            throw new Error(`Could not validate ${name}: ${infoLog}`);
        }*/

        const err = this.host.gl.getError();
        if (err) {
            throw new Error(
                `OpenGL error after creating program ${name}: ${err}`
            );
        }

        return program;
    }

    private introspectShaders() {
        this.host.gl.useProgram(this.pathtracerProgram);

        this.pathtracerUniforms = {
            "camera.position": this.host.gl.getUniformLocation(
                this.pathtracerProgram,
                "camera.position"
            ),
            "camera.rayDirMatrix": this.host.gl.getUniformLocation(
                this.pathtracerProgram,
                "camera.rayDirMatrix"
            ),
            time: this.host.gl.getUniformLocation(
                this.pathtracerProgram,
                "scene.time"
            ),
            seed: this.host.gl.getUniformLocation(
                this.pathtracerProgram,
                "scene.seed"
            ),
            previousTexture: this.host.gl.getUniformLocation(
                this.pathtracerProgram,
                "scene.previousTexture"
            ),
            pixelSize: this.host.gl.getUniformLocation(
                this.pathtracerProgram,
                "pixelSize"
            ),
            environmentMapTexture: this.host.gl.getUniformLocation(
                this.pathtracerProgram,
                "scene.environmentMapTexture"
            ),
            environmentExposure: this.host.gl.getUniformLocation(
                this.pathtracerProgram,
                "scene.environmentExposure"
            )
        };

        this.host.scene.introspectPathtracer(
            this.pathtracerProgram,
            this.host.gl
        );

        this.host.gl.useProgram(this.texturedProgram);

        this.texturedUniforms = {
            textureImage: this.host.gl.getUniformLocation(
                this.texturedProgram,
                "textureImage"
            ),
        };
    }

    private createShaders() {
        const pathtracerVS = this.compileShader(
            "Pathtracer vertex shader",
            this.host.scene.programVertexSource,
            this.host.gl.VERTEX_SHADER
        );
        const pathtracerFS = this.compileShader(
            "Pathtracer fragment shader",
            this.host.scene.programFragmentSource,
            this.host.gl.FRAGMENT_SHADER
        );

        this.pathtracerProgram = this.createProgram(
            "Pathtracer",
            pathtracerVS,
            pathtracerFS
        );

        this.host.gl.deleteShader(pathtracerVS);
        this.host.gl.deleteShader(pathtracerFS);

        const texturedVS = this.compileShader(
            "Textured vertex shader",
            srcTexturedVS,
            this.host.gl.VERTEX_SHADER
        );
        const texturedFS = this.compileShader(
            "Textured fragment shader",
            srcTexturedFS,
            this.host.gl.FRAGMENT_SHADER
        );

        this.texturedProgram = this.createProgram(
            "Textured",
            texturedVS,
            texturedFS
        );

        this.host.gl.deleteShader(texturedVS);
        this.host.gl.deleteShader(texturedFS);

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

    private createFramebuffers() {
        this.pingPongBuffers = [null, null];
        this.host.gl.activeTexture(this.host.gl.TEXTURE0);
        for (let i = 0; i < 2; i++) {
            const texture = this.host.gl.createTexture();
            this.host.gl.bindTexture(this.host.gl.TEXTURE_2D, texture);
            this.host.gl.texImage2D(
                this.host.gl.TEXTURE_2D,
                0,
                this.host.gl.RGBA32F,
                this.host.width,
                this.host.height,
                0,
                this.host.gl.RGBA,
                this.host.gl.FLOAT,
                null
            );
            this.host.gl.texParameteri(
                this.host.gl.TEXTURE_2D,
                this.host.gl.TEXTURE_MIN_FILTER,
                this.host.gl.NEAREST
            );
            this.host.gl.texParameteri(
                this.host.gl.TEXTURE_2D,
                this.host.gl.TEXTURE_MAG_FILTER,
                this.host.gl.NEAREST
            );

            const fbo = this.host.gl.createFramebuffer();

            this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, fbo);
            this.host.gl.framebufferTexture2D(
                this.host.gl.FRAMEBUFFER,
                this.host.gl.COLOR_ATTACHMENT0,
                this.host.gl.TEXTURE_2D,
                texture,
                0
            );

            const status = this.host.gl.checkFramebufferStatus(
                this.host.gl.FRAMEBUFFER
            );
            if (status !== this.host.gl.FRAMEBUFFER_COMPLETE) {
                throw new Error(`Incomplete framebuffer, status: ${status}`);
            }

            this.pingPongBuffers[i] = {
                fbo,
                texture,
            };
        }
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
        this.createFramebuffers();
        this.createEnvironmentMap();
    }

    dispose() {
        this.host.gl.useProgram(null);
        this.host.gl.bindVertexArray(null);
        this.host.gl.bindBuffer(this.host.gl.ARRAY_BUFFER, null);
        this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, null);

        this.host.gl.deleteProgram(this.pathtracerProgram);
        this.host.gl.deleteProgram(this.texturedProgram);
        this.host.gl.deleteVertexArray(this.fullScreenQuadVAO);
        this.host.gl.deleteBuffer(this.fullScreenQuadVBO);

        for (let i = 0; i < this.pingPongBuffers.length; i++) {
            this.host.gl.deleteFramebuffer(this.pingPongBuffers[i].fbo);
            this.host.gl.deleteTexture(this.pingPongBuffers[i].texture);
        }

        this.host.gl.deleteTexture(this.environmentMapTexture);
    }

    render() {
        if (this.host.dropSignaled) {
            for (let i = 0; i < this.pingPongBuffers.length; i++) {
                this.host.gl.bindFramebuffer(
                    this.host.gl.FRAMEBUFFER,
                    this.pingPongBuffers[i].fbo
                );
                this.host.gl.clearColor(0, 0, 0, 1);
                this.host.gl.clear(this.host.gl.COLOR_BUFFER_BIT);
            }
            this.host.unsignalDrop();
        }

        if (!this.host.isPaused) {
            this.host.gl.useProgram(this.pathtracerProgram);

            this.host.gl.bindFramebuffer(
                this.host.gl.FRAMEBUFFER,
                this.pingPongBuffers[this.pingPongTarget].fbo
            );

            this.host.gl.clearColor(0, 0, 0, 1);
            this.host.gl.clear(this.host.gl.COLOR_BUFFER_BIT);

            this.host.gl.viewport(0, 0, this.host.width, this.host.height);

            this.host.camera.applyUniforms(
                this.pathtracerUniforms,
                this.host.gl
            );
            this.host.scene.applyUniforms(this.host.gl);
            this.host.timer.applyUniforms(
                this.pathtracerUniforms,
                this.host.gl
            );

            this.host.gl.activeTexture(this.host.gl.TEXTURE0);
            this.host.gl.bindTexture(
                this.host.gl.TEXTURE_2D,
                this.pingPongBuffers[
                    (this.pingPongTarget + 1) % this.pingPongBuffers.length
                ].texture
            );
            this.host.gl.activeTexture(this.host.gl.TEXTURE1);
            this.host.gl.bindTexture(
                this.host.gl.TEXTURE_CUBE_MAP,
                this.environmentMapTexture
            );

            this.host.gl.uniform1i(this.pathtracerUniforms.previousTexture, 0);
            this.host.gl.uniform1i(this.pathtracerUniforms.environmentMapTexture, 1);

            this.host.gl.uniform1f(this.pathtracerUniforms.environmentExposure, 4);
            this.host.gl.uniform1f(this.pathtracerUniforms.seed, Math.random());

            this.host.gl.bindVertexArray(this.fullScreenQuadVAO);
            this.host.gl.drawArrays(this.host.gl.TRIANGLES, 0, 6);

            this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, null);
            this.host.gl.viewport(0, 0, this.host.width, this.host.height);
            this.host.gl.clearColor(0, 0, 0, 1);
            this.host.gl.clear(this.host.gl.COLOR_BUFFER_BIT);

            this.host.gl.useProgram(this.texturedProgram);
            this.host.gl.activeTexture(this.host.gl.TEXTURE0);
            this.host.gl.bindTexture(
                this.host.gl.TEXTURE_2D,
                this.pingPongBuffers[this.pingPongTarget].texture
            );
            this.host.gl.uniform1i(this.texturedUniforms.textureImage, 0);
            this.host.gl.drawArrays(this.host.gl.TRIANGLES, 0, 6);

            this.pingPongTarget =
                (this.pingPongTarget + 1) % this.pingPongBuffers.length;
        }
    }
}
