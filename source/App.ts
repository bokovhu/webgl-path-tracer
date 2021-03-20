import { Camera } from "./Camera";
import { Renderer } from "./Renderer";
import { Timer } from "./Timer";
import { Input } from "./Input";
import { Scene } from "./Scene";
import { createScene } from "./ExampleScene";

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
