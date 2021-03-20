export interface TimerUniformLocations {
    time: WebGLUniformLocation;
}

export class Timer {
    private startTime: number;
    private lastFrameTime: number;

    private deltaTime: number = 0;
    private appTime: number = 0;

    constructor() {
        this.startTime = Date.now();
        this.lastFrameTime = Date.now();
    }

    update() {
        const now = Date.now();

        this.deltaTime = 0.001 * (now - this.lastFrameTime);
        this.appTime = 0.001 * (now - this.startTime);

        this.lastFrameTime = now;
    }

    get t() {
        return this.appTime;
    }
    get dt() {
        return this.deltaTime;
    }
    
    applyUniforms(locations: TimerUniformLocations, gl: WebGL2RenderingContext) {
        gl.uniform1f(locations.time, this.t);
    }
}
