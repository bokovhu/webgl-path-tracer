export class Messenger {

    private divElement: HTMLDivElement;
    private pElement: HTMLParagraphElement;
    private showTimeout: number | null = null;

    constructor() {

        this.divElement = document.querySelector("#message");
        this.pElement = document.querySelector("#message-text");

    }

    private clearShowTimeout() {
        if(this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
    }

    private onShouldHide() {
        
        this.divElement.setAttribute("style", "display: none");

    }

    show(msg: string) {

        this.clearShowTimeout();
        this.pElement.innerHTML = msg;
        this.divElement.setAttribute("style", "");

        this.showTimeout = setTimeout(
            this.onShouldHide.bind(this),
            1500
        );

    }

}
