export default class Carver {
    constructor() {
        this.canvas = $('#canvas')[0];
        this.ctx = this.canvas.getContext('2d');
        this.grayscaleCanvas = $('#grayscale-canvas')[0];
        this.grayscaleCtx = this.grayscaleCanvas.getContext('2d');
        this.xGradiantCanvas = $('#gradiant-canvas-x')[0];
        this.xGradiantCtx = this.xGradiantCanvas.getContext('2d');
        this.yGradiantCanvas = $('#gradiant-canvas-y')[0];
        this.yGradiantCtx = this.yGradiantCanvas.getContext('2d');
    }

    setImage(imgUrl) {
        this.image = new Image();
        this.image.onload = this.initCanvas.bind(this);
        this.image.src = imgUrl;
    }

    initCanvas() {
        $('#canvas').show();
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;
        this.ctx.drawImage(this.image, 0, 0);
        $('input#horizontal-size').val(this.image.width);
        $('input#vertical-size').val(this.image.height);
        this.convertGrayscale();
        this.computeGradiant();
    }

    convertGrayscale() {
        this.grayscaleCtx.drawImage(this.image, 0, 0, this.image.width, this.image.height);
        var imageData = this.ctx.getImageData(0, 0, this.image.width, this.image.height);
        this.grayscaleImage = new jsfeat.matrix_t(this.image.width, this.image.height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(imageData.data, this.image.width, this.image.height, this.grayscaleImage);

        var data_u32 = new Uint32Array(imageData.data.buffer);
        var alpha = (0xff << 24);
        var i = this.grayscaleImage.cols*this.grayscaleImage.rows, pix = 0;
        while(--i >= 0) {
            pix = this.grayscaleImage.data[i];
            data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
        }
        this.grayscaleCanvas.width = this.grayscaleImage.cols;
        this.grayscaleCanvas.height = this.grayscaleImage.rows;
        this.grayscaleCtx.putImageData(imageData, 0, 0);
    }

    computeGradiant() {
        this.xGradiantCanvas.width = this.grayscaleImage.cols;
        this.xGradiantCanvas.height = this.grayscaleImage.rows;
        this.xGradiantCtx.drawImage(this.image, 0, 0, this.image.width, this.image.height);

        this.yGradiantCanvas.width = this.grayscaleImage.cols;
        this.yGradiantCanvas.height = this.grayscaleImage.rows;
        this.yGradiantCtx.drawImage(this.image, 0, 0, this.image.width, this.image.height);

        var xImageData = this.ctx.getImageData(0, 0, this.image.width, this.image.height);
        var yImageData = this.ctx.getImageData(0, 0, this.image.width, this.image.height);
        this.gradiantImage = new jsfeat.matrix_t(this.image.width, this.image.height, jsfeat.S32C2_t);
        jsfeat.imgproc.sobel_derivatives(this.grayscaleImage, this.gradiantImage);

        var xData_u32 = new Uint32Array(xImageData.data.buffer);
        var yData_u32 = new Uint32Array(yImageData.data.buffer);
        var alpha = (0xff << 24);
        var i = this.gradiantImage.cols * this.gradiantImage.rows, pix = 0;
        while(--i >= 0) {
            pix = Math.abs(this.gradiantImage.data[i << 1])&0xff; // note bitshifting 1 place is the same as multiplying by 2
            xData_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
            pix = Math.abs(this.gradiantImage.data[(i << 1) + 1])&0xff; // note bitshifting 1 place is the same as multiplying by 2
            yData_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
        }
        this.xGradiantCtx.putImageData(xImageData, 0, 0);
        this.yGradiantCtx.putImageData(yImageData, 0, 0);
    }
}