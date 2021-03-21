import { vec3 } from "gl-matrix";
import { Camera } from "./Camera";
import { Timer } from "./Timer";

interface InputHost {
    readonly canvas: HTMLCanvasElement;
    readonly camera: Camera;
    readonly timer: Timer;
    signalDrop(): void;
    togglePause(): void;
    takeScreenshot(): void;
}

const MOVEMENT_SPEED = 4.0;
const MOUSE_SENSITIVITY = 0.005;

export class Input {
    private fpsMovementState: {
        forward: number;
        up: number;
        right: number;
    } = {
        forward: 0,
        up: 0,
        right: 0,
    };
    private fpsMovement: vec3 = vec3.fromValues(0, 0, 0);
    private doRotate: boolean = false;

    constructor(private host: InputHost) {
        this.registerListeners();
    }

    private registerListeners() {
        const canvas = this.host.canvas;

        window.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("keyup", this.onKeyUp.bind(this));

        canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
        canvas.addEventListener("mousemove", this.onMouseMove.bind(this));

        canvas.addEventListener("touchstart", this.onMouseDown.bind(this));
        canvas.addEventListener("touchend", this.onMouseUp.bind(this));
        canvas.addEventListener("touchmove", this.onMouseMove.bind(this));
    }

    private onKeyDown(event: KeyboardEvent) {
        const k = event.key.toLowerCase();

        switch (k) {
            case "w":
                this.fpsMovementState.forward = 1;
                break;
            case "s":
                this.fpsMovementState.forward = -1;
                break;
            case "d":
                this.fpsMovementState.right = 1;
                break;
            case "a":
                this.fpsMovementState.right = -1;
                break;
            case "e":
                this.fpsMovementState.up = 1;
                break;
            case "q":
                this.fpsMovementState.up = -1;
                break;
        }
    }

    private onKeyUp(event: KeyboardEvent) {
        const k = event.key.toLowerCase();

        switch (k) {
            case "w":
            case "s":
                this.fpsMovementState.forward = 0;
                break;
            case "d":
            case "a":
                this.fpsMovementState.right = 0;
                break;
            case "e":
            case "q":
                this.fpsMovementState.up = 0;
                break;
            case " ":
                this.host.togglePause();
                break;
            case "p":
                this.host.takeScreenshot();
                break;
        }
    }

    private onMouseDown(event: MouseEvent) {
        this.doRotate = true;
    }

    private onMouseUp(event: MouseEvent) {
        this.doRotate = false;
    }

    private onMouseMove(event: MouseEvent) {
        const dx = event.movementX;
        const dy = event.movementY;

        if (this.doRotate) {
            this.host.camera.rotate(
                -1 * dx * MOUSE_SENSITIVITY,
                -1 * dy * MOUSE_SENSITIVITY
            );
            this.host.signalDrop();
        }
    }

    update() {
        vec3.set(
            this.fpsMovement,
            this.fpsMovementState.right,
            this.fpsMovementState.up,
            this.fpsMovementState.forward
        );
        vec3.normalize(this.fpsMovement, this.fpsMovement);
        vec3.scale(
            this.fpsMovement,
            this.fpsMovement,
            MOVEMENT_SPEED * this.host.timer.dt
        );

        if (vec3.len(this.fpsMovement) > 0) {
            this.host.camera.moveAlong(this.fpsMovement);
            this.host.signalDrop();
        }
    }
}
