import { mat4 } from "gl-matrix";

export class QuadraticSurfaceMatrix {
    private T: mat4 = mat4.create();
    private Tinv: mat4 = mat4.create();
    private TinvT: mat4 = mat4.create();
    private MT: mat4 = mat4.create();

    constructor(private M: mat4) {
        this.update();
    }

    transform(deltaT: mat4) {
        this.T = mat4.mul(this.T, this.T, deltaT);
        this.update();
        return this;
    }

    transformTo(t: mat4) {
        mat4.copy(this.T, t);
        this.update();
        return this;
    }

    update() {
        mat4.copy(this.Tinv, this.T);
        mat4.invert(this.Tinv, this.Tinv);

        mat4.copy(this.TinvT, this.Tinv);
        mat4.transpose(this.TinvT, this.TinvT);

        mat4.copy(this.MT, this.Tinv);
        mat4.mul(this.MT, this.MT, this.M);
        mat4.mul(this.MT, this.MT, this.TinvT);
    }

    get matrix() {
        return this.MT;
    }
}

export interface SurfaceUniformLocations {
    Q: WebGLUniformLocation;
    C: WebGLUniformLocation;
    materialId: WebGLUniformLocation;
}

export class Surface {
    constructor(
        private _Q: QuadraticSurfaceMatrix,
        private _C: QuadraticSurfaceMatrix,
        private _materialId: number
    ) {}

    get Q() {
        return this._Q.matrix;
    }
    get C() {
        return this._C.matrix;
    }
    get materialId() {
        return this._materialId;
    }

    transformQ(deltaT: mat4) {
        this._Q.transform(deltaT);
    }
    transformC(deltaT: mat4) {
        this._C.transform(deltaT);
    }
    transformQTo(t: mat4) {
        this._Q.transformTo(t);
    }
    transformCTo(t: mat4) {
        this._C.transformTo(t);
    }

    applyUniforms(
        locations: SurfaceUniformLocations,
        gl: WebGL2RenderingContext
    ) {
        gl.uniform1i(locations.materialId, this.materialId);
        gl.uniformMatrix4fv(locations.Q, false, this.Q);
        gl.uniformMatrix4fv(locations.C, false, this.C);
    }
}

export function createUnitPlane() {
    return new QuadraticSurfaceMatrix(
        // prettier-ignore
        mat4.fromValues(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 1, 0, 0
        )
    );
}

export function createUnitSphere() {
    return new QuadraticSurfaceMatrix(
        // prettier-ignore
        mat4.fromValues(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, -1
        )
    );
}

export function createEverywhere() {
    return new QuadraticSurfaceMatrix(
        // prettier-ignore
        mat4.fromValues(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, -1
        )
    );
}

export function createUnitHyperboloid() {
    return new QuadraticSurfaceMatrix(
        // prettier-ignore
        mat4.fromValues(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, -1
        )
    );
}

export function createEllipsoid(a: number, b: number, c: number) {
    return new QuadraticSurfaceMatrix(
        // prettier-ignore
        mat4.fromValues(
            a, 0, 0, 0,
            0, b, 0, 0,
            0, 0, c, 0,
            0, 0, 0, -1
        )
    );
}

export function createHyperboloid(a: number, b: number, c: number) {
    return new QuadraticSurfaceMatrix(
        // prettier-ignore
        mat4.fromValues(
            a, 0, 0, 0,
            0, b, 0, 0,
            0, 0, -c, 0,
            0, 0, 0, -1
        )
    );
}
