export interface RenderTarget {
    fbo: WebGLFramebuffer;
    texture: WebGLTexture;
}

export interface RenderTargetHost {
    readonly gl: WebGL2RenderingContext;
    readonly width: number;
    readonly height: number;
}

export function createRenderTarget(host: RenderTargetHost): RenderTarget {
    const texture = host.gl.createTexture();
    host.gl.bindTexture(host.gl.TEXTURE_2D, texture);
    host.gl.texImage2D(
        host.gl.TEXTURE_2D,
        0,
        host.gl.RGBA32F,
        host.width,
        host.height,
        0,
        host.gl.RGBA,
        host.gl.FLOAT,
        null
    );
    host.gl.texParameteri(
        host.gl.TEXTURE_2D,
        host.gl.TEXTURE_MIN_FILTER,
        host.gl.NEAREST
    );
    host.gl.texParameteri(
        host.gl.TEXTURE_2D,
        host.gl.TEXTURE_MAG_FILTER,
        host.gl.NEAREST
    );

    const fbo = host.gl.createFramebuffer();

    host.gl.bindFramebuffer(host.gl.FRAMEBUFFER, fbo);
    host.gl.framebufferTexture2D(
        host.gl.FRAMEBUFFER,
        host.gl.COLOR_ATTACHMENT0,
        host.gl.TEXTURE_2D,
        texture,
        0
    );

    const status = host.gl.checkFramebufferStatus(host.gl.FRAMEBUFFER);
    if (status !== host.gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Incomplete framebuffer, status: ${status}`);
    }

    return { fbo, texture };
}
