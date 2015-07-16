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
        for(var i =0; i < 150; i++){
            this.resizeHorz();
            console.log(i/150 + "%")
        }
    }

    resizeHorz() {
        this.convertGrayscale();
        this.computeGradiant();
        this.computeEnergy();
        var seam = this.computeSeams(1)[0];
        var imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ripSeam(seam, imageData);
        this.canvas.width = this.canvas.width-1;
        this.ctx.putImageData(imageData, 0, 0);
    }

    copyArrayBuffer(src) {
        var target = new ArrayBuffer(src.length);
        new Uint32Array(target).set(new Uint32Array(src));
        return target;
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

        var UInt32XData = new Uint32Array(xImageData.data.buffer);
        var UInt32YData = new Uint32Array(yImageData.data.buffer);
        this.UInt8XGradData = new jsfeat.matrix_t(this.image.width, this.image.height, jsfeat.U8_t | jsfeat.C1_t);
        this.UInt8YGradData = new jsfeat.matrix_t(this.image.width, this.image.height, jsfeat.U8_t | jsfeat.C1_t);
        var alpha = (0xff << 24);
        var i = this.gradiantImage.cols * this.gradiantImage.rows, pix = 0;
        while(--i >= 0) {
            // Bit shifting is multiplying by 2 (<<1) and mod'ing by 255 (&0xff)
            pix = Math.abs(this.gradiantImage.data[i << 1])&0xff; 
            this.UInt8XGradData[i] = pix;
            UInt32XData[i] = alpha | (pix << 16) | (pix << 8) | pix;
            pix = Math.abs(this.gradiantImage.data[(i << 1) + 1])&0xff;
            this.UInt8YGradData[i] = pix;
            UInt32YData[i] = alpha | (pix << 16) | (pix << 8) | pix;

        }
        this.xGradiantCtx.putImageData(xImageData, 0, 0);
        this.yGradiantCtx.putImageData(yImageData, 0, 0);
    }

    computeEnergy() {
        // we compute the seams using dynamic programing

        this.costMatrix = [];
        this.parentMatrix = [];

        for (var i = 0; i < this.canvas.width; ++i) {
            this.costMatrix[i] = [];
            this.parentMatrix[i] = [];
            for (var j = 0; j < this.canvas.height; ++j) {
                this.costMatrix[i][j] = 255;
                this.parentMatrix[i][j] = null;
            }
        }

        for (var i = 0; i < this.canvas.width; i++) {
            for(var j = 0; j < this.canvas.height; j++) {
                this.costMatrix[i][j] = this.cost(i,j,'vertical');
            }
        }

    }

    cost(x, y, orientation) {
        if(orientation === 'vertical'){
            var gradiantMatrix = this.UInt8YGradData;
        } else if (orientation === 'horizontal') {
            var gradiantMatrix = this.UInt8XGradData;
        }
        var cost = gradiantMatrix[this.at(x,y)];
        
        if(y === 0){
            return cost;
        }
        var parents = this.getParents(x, y, gradiantMatrix);
        var minParentCost = parents[0].cost;
        this.parentMatrix[x][y] = parents[0];
        for(var i = 0; i < parents.length; i++) {
            var parentCost = parents[i].cost;
            if(parentCost<minParentCost){
                minParentCost = parentCost;
                this.parentMatrix[x][y] = parents[i];
            }
        }
        cost = cost + minParentCost;
        return cost;

    }

    at(x, y) {
        return (y * this.canvas.width + x);
    }

    getParents(x, y, gradiantMatrix) {
        var parents = [];
        if(y === 0){
            return parents;
        } else if(x === 0) {
            parents.push({
                'x': x,
                'y': y-1,
                'cost': gradiantMatrix[this.at(x,y-1)]
            });
            parents.push({
                'x': x+1,
                'y': y-1,
                'cost': gradiantMatrix[this.at(x+1,y-1)]
            });
        } else if(x === this.canvas.width-1) {
            parents.push({
                'x' :x-1,
                'y' :y-1,
                'cost' :gradiantMatrix[this.at(x-1,y-1)]
            });
            parents.push({
                'x' :x,
                'y' :y-1,
                'cost' :gradiantMatrix[this.at(x,y-1)]
            });
        } else {
            parents.push({
                'x': x-1,
                'y': y-1,
                'cost': gradiantMatrix[this.at(x-1,y-1)]
            });
            parents.push({
                'x': x,
                'y': y-1,
                'cost': gradiantMatrix[this.at(x,y-1)]
            });
            parents.push({
                'x': x+1,
                'y': y-1,
                'cost': gradiantMatrix[this.at(x+1,y-1)]
            });
        }
        return parents;
    }

    computeSeams(numSeams) {
        //scan last row of costs for minimum
        //TODO: Just sort the last row, and slice it?
        var lastRowIdx = this.canvas.height - 1;
        var minCosts = [{'pos': 0, 'cost': this.costMatrix[0][lastRowIdx]}];
        for (var i = 0; i < this.costMatrix.length; i++) {
            var curCost = this.costMatrix[i][lastRowIdx];
            if(Object.keys(minCosts).length <= numSeams){
                minCosts.push({'pos' : i, 'cost': curCost});
            } else {
                var maxItem = _.max(minCosts, function(item){return item.cost;});
                if (curCost < maxItem.cost) {
                    minCosts.push({'pos' : i, 'cost': curCost});
                    minCosts = _.filter(minCosts, function(item){ return item.cost < maxItem.cost;});
                }
            }
        }
        minCosts = minCosts.slice(0, numSeams);
        // take those positions and follow the min cost route back to the top
        var seams = [];
        for(var i = 0; i < minCosts.length; i++){
            var x =  minCosts[i].pos;
            var seam = [];
            for(var y = lastRowIdx; y >= 0; y--){
                seam.push({'x': x, 'y': y});
                //TODO: Shitty Construction, fix it
                if(y ===0) {
                    break;
                }
                var parent = this.parentMatrix[x][y];
                x = parent.x;
            }
            seams.push(seam);
        }

        return seams;
    }

    traceSeam(seams, imageData) {
        var uInt32Data = new Uint32Array(imageData.data.buffer);
        for(var i = 0; i < seams.length; i++){
            var seam = seams[i]
            for (var j = 0; j < seam.length; j++) {
                uInt32Data[this.at(seam[j].x, seam[j].y)] = (0xff << 24) | (0 << 16) | (0 << 8) | (0xff);
            }
        }
        return imageData;
    }

    ripSeam(seam, imageData) {
        var uInt32Data = new Uint32Array(imageData.data.buffer);
        var target = new Uint32Array((this.canvas.width-1)*(this.canvas.height))
        for (var y = 0; y < this.canvas.height; y++) {
            var pixel = _.find(seam, function (pix) { return pix.y === y});
            for (var x = 0; x < this.canvas.width; x++){
                if(x < pixel.x) {
                    uInt32Data[this.at(x,y)] = uInt32Data[this.at(x,y)];
                } else {
                    uInt32Data[this.at(x,y)] = uInt32Data[this.at(x+1,y)];
                }
                
            }
        }
    }


}