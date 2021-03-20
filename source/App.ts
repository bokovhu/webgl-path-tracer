import { glMatrix } from "gl-matrix";
import { Camera } from "./Camera";
import { Renderer } from "./Renderer";
import { Timer } from "./Timer";
import { Input } from "./Input";
import { Scene } from "./Scene";
import {
    createEverywhere,
    createHyperboloid,
    createUnitHyperboloid,
    createUnitPlane,
    createUnitSphere,
    Surface,
} from "./Surface";
import { MatrixMath } from "./MatrixMath";
import { Material } from "./Material";
import { PointLight } from "./PointLight";

function createScene(): Scene {
    const s = new Scene(16, 8, 8);

    s.addMaterial(
        new Material([1, 0.05, 0.05], [0.1, 0.1, 0.1], 12.0, [0, 0, 0]),
        new Material([0.05, 1, 0.05], [0.1, 0.1, 0.1], 12.0, [0, 0, 0]),
        new Material([0.05, 0.05, 1], [0.1, 0.1, 0.1], 12.0, [0, 0, 0]),
        new Material([1, 1, 0.05], [0.3, 0.3, 0.3], 80.0, [0, 0, 0]),
        new Material([1, 0.05, 1], [0.3, 0.3, 0.3], 80.0, [0, 0, 0]),
        new Material([0.05, 1, 1], [0.3, 0.3, 0.3], 80.0, [0, 0, 0]),
        new Material([1, 1, 1], [0.5, 0.5, 0.5], 240, [0, 0, 0]),
        new Material([0, 0, 0], [0, 0, 0], 1, [15, 1, 1])
    );

    s.addPointLight(
        new PointLight([0, 4, 0], [2, 2, 2], [1.0, 0.55, 0.75]),
        new PointLight([2, 6, -2], [2, 2, 2], [1.0, 0.25, 0.45]),
        new PointLight([-2, 6, 2], [2, 2, 2], [1.0, 0.25, 0.45])
    );

    s.addSurface(
        new Surface(
            createUnitSphere().transform(
                MatrixMath.translation([-2.0, 4.0, 0.0])
            ),
            createEverywhere(),
            6
        ),
        new Surface(
            createUnitSphere().transform(
                MatrixMath.translation([2.0, 4.0, 0.0])
            ),
            createEverywhere(),
            6
        ),
        /* new Surface(
            createUnitSphere()
                .transform(MatrixMath.scale(0.5, 0.5, 0.5))
                .transform(MatrixMath.translation([0.0, 8.0, 0.0])),
            createEverywhere(),
            7
        ), */
        new Surface(
            createHyperboloid(6, 4, 6).transform(
                MatrixMath.translation([0.0, 4.0, 0.0])
            ),
            createUnitSphere()
                .transform(MatrixMath.scale(1.25, 1.25, 1.25))
                .transform(MatrixMath.translation([0.0, 4.0, 0.0])),
            6
        ),
        new Surface(
            createUnitPlane().transform(MatrixMath.translation([0, 0, 0])),
            createEverywhere(),
            0
        ),
        new Surface(
            createUnitPlane().transform(MatrixMath.translation([0, 8, 0])),
            createEverywhere(),
            0
        ),
        new Surface(
            createUnitPlane()
                .transform(MatrixMath.rotation(0, -3.14159265 / 2.0, 0))
                .transform(MatrixMath.translation([0, 0, -4])),
            createEverywhere(),
            1
        ),
        new Surface(
            createUnitPlane()
                .transform(MatrixMath.rotation(0, -3.14159265 / 2.0, 0))
                .transform(MatrixMath.translation([0, 0, 4])),
            createEverywhere(),
            1
        ),
        new Surface(
            createUnitPlane()
                .transform(MatrixMath.rotation(0, 0, 3.14159265 / 2.0))
                .transform(MatrixMath.translation([4, 0, 0])),
            createEverywhere(),
            2
        ),
        new Surface(
            createUnitPlane()
                .transform(MatrixMath.rotation(0, 0, 3.14159265 / 2.0))
                .transform(MatrixMath.translation([-4, 0, 0])),
            createEverywhere(),
            2
        )
    );

    return s;
}

export class App {
    private _canvas: HTMLCanvasElement;
    private _gl: WebGL2RenderingContext;
    private _timer: Timer;
    private _renderer: Renderer;
    private _camera: Camera;
    private _input: Input;
    private _scene: Scene;
    private _dropSignaled: boolean = false;
    private _loadingRemoved: boolean = false;

    constructor() {
        this._canvas = document.querySelector("canvas") as HTMLCanvasElement;
        this._gl = this._canvas.getContext("webgl2");
        this._timer = new Timer();
        this._camera = new Camera();
        this._input = new Input(this);
        this._scene = createScene();

        this._camera.moveTo([0, 4, 4]);

        this._gl.getExtension("EXT_color_buffer_float");
        this._gl.getExtension("WEBGL_color_buffer_float");

        window.addEventListener("resize", this.onWindowResized.bind(this));
        this.onWindowResized();
        this.requestAnimationFrame();
    }

    get canvas() {
        return this._canvas;
    }
    get gl() {
        return this._gl;
    }
    get timer() {
        return this._timer;
    }
    get width() {
        return this._canvas.width;
    }
    get height() {
        return this._canvas.height;
    }
    get camera() {
        return this._camera;
    }
    get input() {
        return this._input;
    }
    get scene() {
        return this._scene;
    }
    get dropSignaled() {
        return this._dropSignaled;
    }

    signalDrop() {
        this._dropSignaled = true;
    }
    unsignalDrop() {
        this._dropSignaled = false;
    }

    private onWindowResized() {
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;

        this._camera.rescale(this._canvas.width / this._canvas.height);

        if (this._renderer) {
            this._renderer.dispose();
        }

        this._renderer = new Renderer(this);
    }

    private requestAnimationFrame() {
        window.requestAnimationFrame(this.onAnimationFrame.bind(this));
    }

    private onAnimationFrame() {
        if (!this._loadingRemoved) {
            document.querySelector("#loading").remove();
            this._loadingRemoved = true;
        }

        this._timer.update();
        this._input.update();

        this._renderer.render();

        this.requestAnimationFrame();
    }
}
