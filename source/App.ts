import { Camera } from "./Camera";
import { Renderer } from "./Renderer";
import { Timer } from "./Timer";
import { Input } from "./Input";
import { Scene } from "./Scene";
import { Images } from "./Images";
import { Messenger } from "./Messenger";
import { createImagesToLoad, createScene } from "./ExampleScene";
import { Compositor } from "./Compositor";

export class App {
    private _canvas: HTMLCanvasElement;
    private _gl: WebGL2RenderingContext;
    private _timer: Timer;
    private _renderer: Renderer;
    private _camera: Camera;
    private _input: Input;
    private _scene: Scene;
    private _images: Images;
    private _messenger: Messenger;
    private _compositor: Compositor;
    private _dropSignaled: boolean = false;
    private _loadingRemoved: boolean = false;
    private _paused: boolean = false;
    private _disposeRecreate: boolean = true;

    constructor() {
        this._canvas = document.querySelector("canvas") as HTMLCanvasElement;
        this._gl = this._canvas.getContext("webgl2");
        this._messenger = new Messenger();
        this._timer = new Timer();
        this._camera = new Camera();
        this._input = new Input(this);
        this._scene = createScene();

        this._gl.getExtension("EXT_color_buffer_float");

        this._images = new Images(
            createImagesToLoad(),
            this.onImagesLoaded.bind(this),
            this.onImageError.bind(this)
        );
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
    get images() {
        return this._images;
    }
    get renderer() {
        return this._renderer;
    }
    get messenger() {
        return this._messenger;
    }
    get dropSignaled() {
        return this._dropSignaled;
    }
    get isPaused() {
        return this._paused;
    }

    signalDrop() {
        this._dropSignaled = true;
    }
    unsignalDrop() {
        this._dropSignaled = false;
    }
    togglePause() {
        this._paused = !this._paused;
        this.onTogglePaused();
    }
    showRenderingText() {
        const renderingElement = document.querySelector("#rendering");
        renderingElement.setAttribute("style", "");
    }
    hideRenderingText() {
        const renderingElement = document.querySelector("#rendering");
        renderingElement.setAttribute("style", "display: none");
    }

    private requestAnimationFrame() {
        window.requestAnimationFrame(this.onAnimationFrame.bind(this));
    }

    private onWindowResized() {
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;

        this._camera.rescale(this._canvas.width / this._canvas.height);

        this._disposeRecreate = true;
    }

    private onAnimationFrame() {
        if (!this._loadingRemoved) {
            document.querySelector("#loading").remove();
            this._loadingRemoved = true;
        }

        this._timer.update();
        this._input.update();

        if(this._disposeRecreate) {
            this._disposeRecreate = false;
            if (this._renderer) {
                this._renderer.dispose();
            }
    
            this._renderer = new Renderer(this);
    
            if (this._compositor) {
                this._compositor.dispose();
            }
    
            this._compositor = new Compositor(this);
        }

        // this._renderer.render();
        this._compositor.render();

        this.unsignalDrop();

        this.requestAnimationFrame();
    }

    private onImagesLoaded() {
        setTimeout(() => {
            window.addEventListener("resize", this.onWindowResized.bind(this));
            this.onWindowResized();
            this.requestAnimationFrame();
        }, 50);
    }

    private onImageError(err: string) {
        alert(err);
    }

    private onTogglePaused() {
        const pausedElement = document.querySelector("#paused");

        if (this._paused) {
            pausedElement.setAttribute("style", "");
        } else {
            pausedElement.setAttribute("style", "display: none");
        }
    }
}
