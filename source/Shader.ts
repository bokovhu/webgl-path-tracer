export interface ShaderHost {
    readonly gl: WebGL2RenderingContext;
}

export function compileShader(
    host: ShaderHost,
    name: string,
    src: string,
    type: number
) {
    const shader = host.gl.createShader(type);
    host.gl.shaderSource(shader, src);

    console.log(`Compiling ${name} ...`);

    host.gl.compileShader(shader);

    console.log(`Compiled ${name}!`);

    const compileStatus = host.gl.getShaderParameter(
        shader,
        host.gl.COMPILE_STATUS
    );
    if (!compileStatus) {
        const infoLog = host.gl.getShaderInfoLog(shader);
        throw new Error(`Could not compile ${name}: ${infoLog}`);
    }

    /* const err = host.gl.getError();
    if (err) {
        throw new Error(`OpenGL error after creating shader ${name}: ${err}`);
    } */

    return shader;
}

export function compileVertexShader(
    host: ShaderHost,
    name: string,
    src: string
) {
    return compileShader(host, name, src, host.gl.VERTEX_SHADER);
}

export function compileFragmentShader(
    host: ShaderHost,
    name: string,
    src: string
) {
    return compileShader(host, name, src, host.gl.FRAGMENT_SHADER);
}

export function createProgram(
    host: ShaderHost,
    name: string,
    vs: WebGLShader,
    fs: WebGLShader
) {
    const program = host.gl.createProgram();

    host.gl.attachShader(program, vs);
    host.gl.attachShader(program, fs);

    console.log(`Linking ${name}...`);

    host.gl.linkProgram(program);

    console.log(`Linked ${name}!`);

    const linkStatus = host.gl.getProgramParameter(
        program,
        host.gl.LINK_STATUS
    );

    if (!linkStatus) {
        const infoLog = host.gl.getProgramInfoLog(program);
        throw new Error(`Could not link ${name}: ${infoLog}`);
    }

    host.gl.validateProgram(program);
    const validateStatus = host.gl.getProgramParameter(
        program,
        host.gl.VALIDATE_STATUS
    );

    if (!validateStatus) {
        const infoLog = host.gl.getProgramInfoLog(program);
        throw new Error(`Could not validate ${name}: ${infoLog}`);
    }

    /* const err = host.gl.getError();
    if (err) {
        throw new Error(`OpenGL error after creating program ${name}: ${err}`);
    } */

    return program;
}

export function introspectProgram<T extends { [key: string]: WebGLUniformLocation }>(
    host: ShaderHost,
    program: WebGLProgram,
    uniforms: Required<{ [P in keyof T]: string }>
): T {
    host.gl.useProgram(program);
    const result: Record<string, WebGLUniformLocation> = {};
    for (let key of Object.keys(uniforms)) {
        result[key] = host.gl.getUniformLocation(program, uniforms[key] || key);
    }
    return result as T;
}
