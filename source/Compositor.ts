import { Renderer } from "./Renderer";
import { createRenderTarget, RenderTarget } from "./RenderTarget";
import srcBlendVS from "./glsl/blend.vertex.glsl";
import srcBlendFS from "./glsl/blend.fragment.glsl";
import srcAvgVS from "./glsl/avg.vertex.glsl";
import srcAvgFS from "./glsl/avg.fragment.glsl";
import {
    compileFragmentShader,
    compileVertexShader,
    createProgram,
    introspectProgram,
} from "./Shader";

export interface CompositorHost {
    readonly gl: WebGL2RenderingContext;
    readonly width: number;
    readonly height: number;
    readonly dropSignaled: boolean;
    readonly renderer: Renderer;
}

interface BlendUniforms {
    imageA: WebGLUniformLocation;
    imageB: WebGLUniformLocation;
}

interface AvgUniforms {
    imageA: WebGLUniformLocation;
    imageB: WebGLUniformLocation;
    frameCount: WebGLUniformLocation;
}

export class Compositor {
    private numRenderTargets: number = 16;
    private renderTargets: Array<RenderTarget> = [];
    private previewRenderTarget: RenderTarget;
    private accumulatorRenderTarget: RenderTarget;
    private currentTargetIndex: number = 0;
    private accumulationCount: number = 1;
    private finishedAccumulation: boolean = false;
    private blendProgram: WebGLProgram;
    private blendUniforms: BlendUniforms;
    private avgProgram: WebGLProgram;
    private avgUniforms: AvgUniforms;

    constructor(private host: CompositorHost) {
        this.createResources();
    }

    private createBlendProgram() {
        const blendVS = compileVertexShader(
            this.host,
            "Blend Vertex",
            srcBlendVS
        );
        const blendFS = compileFragmentShader(
            this.host,
            "Blend Fragment",
            srcBlendFS
        );

        this.blendProgram = createProgram(this.host, "Blend", blendVS, blendFS);
        this.blendUniforms = introspectProgram(this.host, this.blendProgram, {
            imageA: "images.a",
            imageB: "images.b",
        });

        this.host.gl.deleteShader(blendVS);
        this.host.gl.deleteShader(blendFS);
    }

    private createAvgProgram() {
        const avgVS = compileVertexShader(this.host, "AVG Vertex", srcAvgVS);
        const avgFS = compileFragmentShader(
            this.host,
            "AVG Fragment",
            srcAvgFS
        );

        this.avgProgram = createProgram(this.host, "AVG", avgVS, avgFS);
        this.avgUniforms = introspectProgram(this.host, this.avgProgram, {
            imageA: "images.a",
            imageB: "images.b",
            frameCount: "frameCount",
        });

        this.host.gl.deleteShader(avgVS);
        this.host.gl.deleteShader(avgFS);
    }

    createResources() {
        this.host.gl.activeTexture(this.host.gl.TEXTURE0);
        this.renderTargets = [];
        for (let i = 0; i < this.numRenderTargets; i++) {
            this.renderTargets.push(createRenderTarget(this.host));
        }
        this.previewRenderTarget = createRenderTarget(this.host);
        this.accumulatorRenderTarget = createRenderTarget(this.host);

        this.createBlendProgram();
        this.createAvgProgram();
    }

    dispose() {
        this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, null);
        this.host.gl.bindTexture(this.host.gl.TEXTURE_2D, null);
        this.host.gl.useProgram(null);

        for (let rt of this.renderTargets) {
            const { fbo, texture } = rt;
            this.host.gl.deleteFramebuffer(fbo);
            this.host.gl.deleteTexture(texture);
        }
        this.host.gl.deleteFramebuffer(this.previewRenderTarget.fbo);
        this.host.gl.deleteTexture(this.previewRenderTarget.texture);

        this.host.gl.deleteFramebuffer(this.accumulatorRenderTarget.fbo);
        this.host.gl.deleteTexture(this.accumulatorRenderTarget.texture);

        this.host.gl.deleteProgram(this.blendProgram);

        this.renderTargets = [];
    }

    private renderToCurrent() {
        const target = this.renderTargets[this.currentTargetIndex];
        this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, target.fbo);

        this.host.renderer.renderScene();
    }

    private presentPreview() {
        this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, null);
        this.host.gl.viewport(0, 0, this.host.width, this.host.height);

        this.host.gl.clearColor(0, 0, 0, 1);
        this.host.gl.clear(this.host.gl.COLOR_BUFFER_BIT);

        this.host.gl.useProgram(this.blendProgram);
        const currentTarget = this.renderTargets[this.currentTargetIndex];

        if (this.finishedAccumulation) {
            this.host.gl.activeTexture(this.host.gl.TEXTURE2);
            this.host.gl.bindTexture(
                this.host.gl.TEXTURE_2D,
                this.accumulatorRenderTarget.texture
            );
            this.host.gl.activeTexture(this.host.gl.TEXTURE3);
            this.host.gl.bindTexture(
                this.host.gl.TEXTURE_2D,
                this.accumulatorRenderTarget.texture
            );
        } else {
            this.host.gl.activeTexture(this.host.gl.TEXTURE2);
            this.host.gl.bindTexture(
                this.host.gl.TEXTURE_2D,
                currentTarget.texture
            );
            this.host.gl.activeTexture(this.host.gl.TEXTURE3);
            this.host.gl.bindTexture(
                this.host.gl.TEXTURE_2D,
                currentTarget.texture
            );
        }

        this.host.gl.uniform1i(this.blendUniforms.imageA, 2);
        this.host.gl.uniform1i(this.blendUniforms.imageB, 3);

        this.host.renderer.drawFullScreenQuad();
    }

    private accumulateInto(
        a: RenderTarget,
        b: RenderTarget,
        destination: RenderTarget
    ) {
        this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, destination.fbo);
        this.host.gl.viewport(0, 0, this.host.width, this.host.height);

        this.host.gl.activeTexture(this.host.gl.TEXTURE2);
        this.host.gl.bindTexture(this.host.gl.TEXTURE_2D, a.texture);
        this.host.gl.activeTexture(this.host.gl.TEXTURE3);
        this.host.gl.bindTexture(this.host.gl.TEXTURE_2D, b.texture);

        this.host.gl.uniform1i(this.blendUniforms.imageA, 2);
        this.host.gl.uniform1i(this.blendUniforms.imageB, 3);

        this.host.renderer.drawFullScreenQuad();
    }

    private avgInto(
        a: RenderTarget,
        b: RenderTarget,
        destination: RenderTarget
    ) {
        this.host.gl.bindFramebuffer(this.host.gl.FRAMEBUFFER, destination.fbo);
        this.host.gl.useProgram(this.avgProgram);
        this.host.gl.viewport(0, 0, this.host.width, this.host.height);

        this.host.gl.activeTexture(this.host.gl.TEXTURE2);
        this.host.gl.bindTexture(this.host.gl.TEXTURE_2D, a.texture);
        this.host.gl.activeTexture(this.host.gl.TEXTURE3);
        this.host.gl.bindTexture(this.host.gl.TEXTURE_2D, b.texture);

        this.host.gl.uniform1i(this.avgUniforms.imageA, 2);
        this.host.gl.uniform1i(this.avgUniforms.imageB, 3);
        this.host.gl.uniform1i(
            this.avgUniforms.frameCount,
            this.accumulationCount
        );

        this.host.renderer.drawFullScreenQuad();
    }

    private accumulateTargets() {
        console.log("Accumulating ...");

        // Save current accumulator

        this.accumulateInto(
            this.accumulatorRenderTarget,
            this.accumulatorRenderTarget,
            this.previewRenderTarget
        );

        let half = Math.floor(this.numRenderTargets / 2);

        this.host.gl.useProgram(this.blendProgram);

        while (half > 1) {
            let step = Math.floor(this.numRenderTargets / half);
            for (let i = 0; i < this.numRenderTargets; i += step) {
                const aIndex = i;
                const bIndex = i + Math.floor(step / 2);

                console.log(`Accumulating ${aIndex} and ${bIndex}`);
                let a = this.renderTargets[aIndex];
                let b = this.renderTargets[bIndex];

                this.accumulateInto(a, b, this.accumulatorRenderTarget);

                this.accumulateInto(
                    this.accumulatorRenderTarget,
                    this.accumulatorRenderTarget,
                    a
                );
            }

            half = Math.floor(half / 2);
        }

        this.accumulateInto(
            this.previewRenderTarget,
            this.previewRenderTarget,
            this.renderTargets[1]
        );

        if (this.accumulationCount > 1) {
            this.avgInto(
                this.renderTargets[1],
                this.renderTargets[0],
                this.accumulatorRenderTarget
            );
        } else {
            this.accumulateInto(
                this.renderTargets[0],
                this.renderTargets[0],
                this.accumulatorRenderTarget
            );
        }

        this.finishedAccumulation = true;
        this.currentTargetIndex = 0;
        this.accumulationCount += 1;
    }

    private dropResults() {
        for (let i = 0; i < this.numRenderTargets; i++) {
            this.host.gl.bindFramebuffer(
                this.host.gl.FRAMEBUFFER,
                this.renderTargets[i].fbo
            );
            this.host.gl.clearColor(0, 0, 0, 1);
            this.host.gl.clear(this.host.gl.COLOR_BUFFER_BIT);
        }

        this.host.gl.bindFramebuffer(
            this.host.gl.FRAMEBUFFER,
            this.accumulatorRenderTarget.fbo
        );
        this.host.gl.clearColor(0, 0, 0, 1);
        this.host.gl.clear(this.host.gl.COLOR_BUFFER_BIT);

        this.currentTargetIndex = 0;
        this.accumulationCount = 1;
        this.finishedAccumulation = false;
    }

    render() {
        console.log("Rendering ", this.currentTargetIndex);

        if (this.host.dropSignaled) {
            this.dropResults();
        }

        if (this.currentTargetIndex >= this.numRenderTargets) {
            this.accumulateTargets();
        } else {
            this.renderToCurrent();
            this.presentPreview();
        }

        this.currentTargetIndex += 1;
    }
}
