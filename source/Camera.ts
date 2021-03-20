import { vec3, mat4, glMatrix, vec4 } from "gl-matrix";
import {MatrixMath} from "./MatrixMath";

export interface CameraUniformLocations {
    readonly "camera.position": WebGLUniformLocation;
    readonly "camera.rayDirMatrix": WebGLUniformLocation;
}

const worldUp: vec3 = [0, 1, 0];

export class Camera {
    private position: vec3 = vec3.fromValues(0, 0, 0);
    private positionXYZ1: vec4 = vec4.fromValues(0, 0, 0, 1);
    private movement: vec3 = vec3.fromValues(0, 0, 0);
    private roll: number = 0;
    private pitch: number = 0;
    private yaw: number = 0;

    private forward: vec3 = vec3.fromValues(0, 0, -1);
    private right: vec3 = vec3.fromValues(1, 0, 0);
    private up: vec3 = vec3.fromValues(0, 1, 0);

    private forwardXYZ0: vec4 = vec4.fromValues(0, 0, -1, 0);
    private rightXYZ0: vec4 = vec4.fromValues(1, 0, 0, 0);
    private upXYZ0: vec4 = vec4.fromValues(0, 1, 0, 0);

    private fieldOfView: number = glMatrix.toRadian(75);
    private aspectRatio: number = 1.0;
    private near: number = 0.01;
    private far: number = 100.0;

    private mRotation: mat4 = mat4.create();

    private mRotRoll: mat4 = mat4.create();
    private mRotPitch: mat4 = mat4.create();
    private mRotYaw: mat4 = mat4.create();

    private mTranslate: mat4 = mat4.create();

    private mProjection: mat4 = mat4.create();
    private mView: mat4 = mat4.create();
    private mViewProjection: mat4 = mat4.create();
    private mRayDir: mat4 = mat4.create();

    constructor() {
        this.update();
    }

    private updateRotationMatrices() {
        const { cos, sin } = Math;

        MatrixMath.rollRotate(this.mRotRoll, this.roll);
        MatrixMath.pitchRotate(this.mRotPitch, this.pitch);
        MatrixMath.yawRotate(this.mRotYaw, this.yaw);

        mat4.copy(this.mRotation, this.mRotRoll);
        mat4.mul(this.mRotation, this.mRotation, this.mRotPitch);
        mat4.mul(this.mRotation, this.mRotation, this.mRotYaw);
    }

    private updateViewMatrix() {
        MatrixMath.translate(this.mTranslate, this.position);

        mat4.mul(this.mView, this.mRotation, this.mTranslate);

        mat4.invert(this.mView, this.mView);
    }

    rescale(newAspect: number) {
        this.aspectRatio = newAspect;
        this.update();
    }

    configure(fov: number, near: number, far: number) {
        this.fieldOfView = glMatrix.toRadian(fov);
        this.near = near;
        this.far = far;
        this.update();
    }

    move(delta: vec3) {
        this.position = vec3.add(this.position, this.position, delta);
        this.update();
    }

    moveAlong(delta: vec3) {
        vec3.set(
            this.movement,
            delta[0] * this.right[0],
            delta[0] * this.right[1],
            delta[0] * this.right[2]
        );

        this.position = vec3.add(this.position, this.position, this.movement);

        vec3.set(
            this.movement,
            delta[1] * worldUp[0],
            delta[1] * worldUp[1],
            delta[1] * worldUp[2]
        );

        this.position = vec3.add(this.position, this.position, this.movement);

        vec3.set(
            this.movement,
            delta[2] * this.forward[0],
            delta[2] * this.forward[1],
            delta[2] * this.forward[2]
        );

        this.position = vec3.add(this.position, this.position, this.movement);

        this.update();
    }

    moveTo(pos: vec3) {
        this.position = vec3.set(this.position, pos[0], pos[1], pos[2]);
        this.update();
    }

    rotate(deltaYaw: number, deltaPitch: number) {
        this.yaw += deltaYaw;
        this.pitch += deltaPitch;
        this.update();
    }

    rotateTo(yaw: number, pitch: number) {
        this.yaw = yaw;
        this.pitch = pitch;

        if (this.pitch >= Math.PI * 0.5) {
            this.pitch = Math.PI * 0.5 - 0.01;
        }
        if (this.pitch <= -1 * Math.PI * 0.5) {
            this.pitch = -1 * Math.PI * 0.5 + 0.01;
        }

        this.update();
    }

    update() {
        this.positionXYZ1 = vec4.set(
            this.positionXYZ1,
            this.position[0],
            this.position[1],
            this.position[2],
            1
        );

        this.updateRotationMatrices();
        this.updateViewMatrix();

        MatrixMath.perspectiveProjection(this.mProjection, this.fieldOfView, this.aspectRatio, this.near, this.far);

        this.mViewProjection = mat4.multiply(
            this.mViewProjection,
            this.mView,
            this.mProjection
        );

        mat4.identity(this.mRayDir);
        MatrixMath.translate(this.mRayDir, this.position);
        mat4.mul(this.mRayDir, this.mRayDir, this.mViewProjection);
        mat4.invert(this.mRayDir, this.mRayDir);

        this.forwardXYZ0 = vec4.set(
            this.forwardXYZ0, 
            -1 * this.mRotation[2], 
            -1 * this.mRotation[6], 
            -1 * this.mRotation[10], 
            -1 * this.mRotation[14]
        );
        this.forward = vec3.set(
            this.forward,
            this.forwardXYZ0[0],
            this.forwardXYZ0[1],
            this.forwardXYZ0[2]
        );

        this.rightXYZ0 = vec4.set(
            this.rightXYZ0, 
            1 * this.mRotation[0],
            1 * this.mRotation[4],
            1 * this.mRotation[8],
            1 * this.mRotation[12]
        );
        this.right = vec3.set(
            this.right,
            this.rightXYZ0[0],
            this.rightXYZ0[1],
            this.rightXYZ0[2]
        );

        this.upXYZ0 = vec4.set(
            this.upXYZ0, 
            1 * this.mRotation[1],
            1 * this.mRotation[5],
            1 * this.mRotation[9],
            1 * this.mRotation[13]
        );
        this.up = vec3.set(
            this.up,
            this.upXYZ0[0],
            this.upXYZ0[1],
            this.upXYZ0[2]
        );
    }

    applyUniforms(u: CameraUniformLocations, gl: WebGL2RenderingContext) {
        gl.uniform4fv(u["camera.position"], this.positionXYZ1);
        gl.uniformMatrix4fv(u["camera.rayDirMatrix"], false, this.mRayDir);
    }
}
