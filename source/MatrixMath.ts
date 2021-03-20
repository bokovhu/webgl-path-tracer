import { mat4, vec3 } from "gl-matrix";

export namespace MatrixMath {
    const { cos, sin } = Math;

    export function rollRotate(m: mat4, roll: number) {
        // prettier-ignore
        mat4.set(
            m,
            cos(roll), -sin(roll), 0, 0,
            sin(roll), cos(roll), 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    }

    export function pitchRotate(m: mat4, pitch: number) {
        // prettier-ignore
        mat4.set(
            m,
            1, 0, 0, 0,
            0, cos(pitch), -sin(pitch), 0,
            0, sin(pitch), cos(pitch), 0,
            0, 0, 0, 1
        );
    }

    export function yawRotate(m: mat4, yaw: number) {
        // prettier-ignore
        mat4.set(
            m,
            cos(yaw), 0, sin(yaw), 0,
            0, 1, 0, 0,
            -sin(yaw), 0, cos(yaw), 0,
            0, 0, 0, 1
        );
    }

    export function translate(m: mat4, position: vec3) {
        // prettier-ignore
        mat4.set(
            m,
            1, 0, 0, position[0],
            0, 1, 0, position[1],
            0, 0, 1, position[2],
            0, 0, 0, 1
        );
    }

    export function translation(position: vec3) {
        const m: mat4 = mat4.create();
        translate(m, position);
        return m;
    }

    export function rotation(yaw: number, pitch: number, roll: number) {
        const mRoll = mat4.create();
        rollRotate(mRoll, roll);

        const mPitch = mat4.create();
        pitchRotate(mPitch, pitch);

        const mYaw = mat4.create();
        yawRotate(mYaw, yaw);

        const mRot = mat4.clone(mRoll);
        mat4.mul(mRot, mRot, mPitch);
        mat4.mul(mRot, mRot, mYaw);

        return mRot;
    }

    export function scale(x: number, y: number, z: number) {
        // prettier-ignore
        return mat4.fromValues(
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        );
    }

    export function perspectiveProjection(
        m: mat4,
        fovy: number,
        aspect: number,
        near: number,
        far: number
    ) {
        const ys = 1 / Math.tan(fovy * 0.5);
        const xs = ys / aspect;
        const f = far;
        const n = near;

        // prettier-ignore
        mat4.set(
            m,
            xs, 0, 0, 0,
            0, ys, 0, 0,
            0, 0, (n + f) / (n - f), (2.0 * n * f) / (n - f),
            0, 0, -1, 0
        );
    }
}
