export class Images {
    private loadedImages: Map<string, HTMLImageElement> = new Map<
        string,
        HTMLImageElement
    >();

    constructor(
        private imagesToLoad: Map<string, string>,
        private finishListener: () => void,
        private errorListener: (err: string) => void
    ) {
        this.startLoading();
    }

    private queueImage(name: string, url: string) {
        const img = new Image();
        img.addEventListener("load", () => this.onImageLoaded(name, img));
        img.addEventListener("error", () => this.onImageError(name));
        img.src = url;
    }

    private startLoading() {
        this.imagesToLoad.forEach((imageUrl, name) =>
            this.queueImage(name, imageUrl)
        );
    }

    private onImageError(name: string) {
        this.errorListener(`Error while loading image ${name}!`);
    }

    private onImageLoaded(name: string, img: HTMLImageElement) {
        this.imagesToLoad.delete(name);
        this.loadedImages.set(name, img);

        if (this.imagesToLoad.size === 0) {
            this.finishListener();
        }
    }

    getImage(name: string) {
        return this.loadedImages.get(name);
    }
}
