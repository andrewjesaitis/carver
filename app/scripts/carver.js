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
        this.dualGradiantCanvas = $('#gradiant-canvas-dual')[0];
        this.dualGradiantCtx = this.dualGradiantCanvas.getContext('2d');
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
        $('#horizontal-size').val(this.canvas.width);
        $('#vertical-size').val(this.canvas.height);
        this.drawImagesForDisplay();
    }

    resize(newWidth, newHeight) {
        console.log(newWidth, newHeight);
        var rowDelta = this.canvas.height - newHeight;
        var colDelta = this.canvas.width - newWidth;
        console.log(rowDelta, colDelta);
        if(colDelta < 0 || rowDelta < 0){
            console.log('Cannot increase image size...yet');
        }
        while(rowDelta > 0 || colDelta > 0) {
            if (colDelta > 0) {
                this.doResize('vertical');
                --colDelta;    
            }
            if (rowDelta > 0) {
                this.doResize('horizontal');
                --rowDelta;
            }
            console.log(rowDelta, colDelta);
        }
        this.drawImagesForDisplay();    
        $('#horizontal-size').val(this.canvas.width);
        $('#vertical-size').val(this.canvas.height);
    }

    drawImagesForDisplay() {
        this.convertGrayscale();
        this.computeGradiant(true);
    }

    drawSeams () {
        this.drawImagesForDisplay();
        this.computeEnergy();
        var seam = this.computeSeams(20);
        var grayscaleData = this.grayscaleCtx.getImageData(0, 0, this.grayscaleCanvas.width, this.grayscaleCanvas.height);
        this.cachedGrayscaleData = copyArrayBuffer(grayscaleData);
        var data = this.traceSeam(seam, grayscaleData);
        this.grayscaleCtx.putImageData(grayscaleData, 0, 0);
    }

    hideSeams() {
        this.grayscaleCtx.putImageData(this.cachedGrayscaleData);
    }

    doResize(orientation) {
        this.convertGrayscale();
        this.computeGradiant(false);
        this.computeEnergy(orientation);
        var seam = this.computeSeams(1, orientation)[0];
        var imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ripSeam(seam, orientation, imageData);
        if (orientation === 'vertical') {
            this.canvas.width = this.canvas.width-1;
            this.grayscaleCanvas.width = this.canvas.width;
            this.dualGradiantCanvas.width = this.canvas.width;
        } else if (orientation === 'horizontal'){
            this.canvas.height = this.canvas.height-1;
            this.grayscaleCanvas.height = this.canvas.height;
            this.dualGradiantCanvas.height = this.canvas.height;
        }
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

    computeGradiant(forDisplay) {
        if (forDisplay) {
            this.xGradiantCanvas.width = this.grayscaleImage.cols;
            this.xGradiantCanvas.height = this.grayscaleImage.rows;
            this.xGradiantCtx.drawImage(this.image, 0, 0, this.image.width, this.image.height);
            var xImageData = this.ctx.getImageData(0, 0, this.image.width, this.image.height);
            var UInt32XData = new Uint32Array(xImageData.data.buffer);
            this.UInt8XGradData = new jsfeat.matrix_t(this.image.width, this.image.height, jsfeat.U8_t | jsfeat.C1_t);
        
        
            this.yGradiantCanvas.width = this.grayscaleImage.cols;
            this.yGradiantCanvas.height = this.grayscaleImage.rows;
            this.yGradiantCtx.drawImage(this.image, 0, 0, this.image.width, this.image.height);
            var yImageData = this.ctx.getImageData(0, 0, this.image.width, this.image.height);
            var UInt32YData = new Uint32Array(yImageData.data.buffer);
            this.UInt8YGradData = new jsfeat.matrix_t(this.image.width, this.image.height, jsfeat.U8_t | jsfeat.C1_t);
        }
        

        this.dualGradiantCanvas.width = this.grayscaleImage.cols;
        this.dualGradiantCanvas.height = this.grayscaleImage.rows;
        this.dualGradiantCtx.drawImage(this.image, 0, 0, this.image.width, this.image.height);
        var dualImageData = this.ctx.getImageData(0, 0, this.image.width, this.image.height);
        var UInt32DualData = new Uint32Array(dualImageData.data.buffer);
        this.UInt8DualGradData = new jsfeat.matrix_t(this.image.width, this.image.height, jsfeat.U8_t | jsfeat.C1_t);

        this.gradiantImage = new jsfeat.matrix_t(this.image.width, this.image.height, jsfeat.S32C2_t);
        jsfeat.imgproc.sobel_derivatives(this.grayscaleImage, this.gradiantImage);

        var alpha = (0xff << 24);
        var i = this.gradiantImage.cols * this.gradiantImage.rows; 
        var gx = 0;
        var gy = 0;
        var mag = 0;
        while(--i >= 0) {
            // Bit shifting is multiplying by 2 (<<1) and mod'ing by 255 (&0xff)
            gx = Math.abs(this.gradiantImage.data[i << 1])//&0xff; 
            gy = Math.abs(this.gradiantImage.data[(i << 1) + 1])//&0xff;
            mag = Math.sqrt(Math.pow(gx, 2) + Math.pow(gy, 2))&0xff;
            // mag = mag / 360; // normalize mag into 0-255
            this.UInt8DualGradData[i] = mag;
            UInt32DualData[i] = alpha | (mag << 16) | (mag << 8) | mag;
            if(forDisplay){
                this.UInt8XGradData[i] = gy;
                UInt32XData[i] = alpha | (gy << 16) | (gy << 8) | gy;
                this.UInt8YGradData[i] = gx;
                UInt32YData[i] = alpha | (gx << 16) | (gx << 8) | gx;
            }
        }
        if (forDisplay) {
            this.xGradiantCtx.putImageData(xImageData, 0, 0);
            this.yGradiantCtx.putImageData(yImageData, 0, 0);
        }
        this.dualGradiantCtx.putImageData(dualImageData, 0, 0);
    }

    computeEnergy(orientation) {
        // we compute the seams using dynamic programing

        this.costMatrix = [];
        this.neighborMatrix = [];

        for (var i = 0; i < this.canvas.width; ++i) {
            this.costMatrix[i] = [];
            this.neighborMatrix[i] = [];
            for (var j = 0; j < this.canvas.height; ++j) {
                this.costMatrix[i][j] = 255;
                this.neighborMatrix[i][j] = null;
            }
        }

        for (var i = 0; i < this.canvas.width; i++) {
            for(var j = 0; j < this.canvas.height; j++) {
                this.costMatrix[i][j] = this.cost(i,j, orientation);
            }
        }

    }

    cost(x, y, orientation) {
        var gradiantMatrix = this.UInt8DualGradData;
        // if(orientation === 'vertical'){
        //     gradiantMatrix = this.UInt8YGradData;
        // } else if (orientation === 'horizontal') {
        //     gradiantMatrix = this.UInt8XGradData;
        // }
        var cost = gradiantMatrix[this.at(x,y)];
        
        if ((y === 0 && orientation === 'vertical') || (x ===0 && orientation === 'horizontal' )) {
            return cost;
        }
        // var neighbors = this.getNeighbors(x, y, gradiantMatrix, orientation);
        // var minNeighbor = _.min(neighbors, function(pixel){
        //     return pixel.cost;
        // });
        var minNeighbor = this.getMinNeighbor(x, y, gradiantMatrix, orientation);
        this.neighborMatrix[x][y] = minNeighbor;
        cost = cost + minNeighbor.cost;
        return cost;

    }

    at(x, y) {
        return (y * this.canvas.width + x);
    }

    getNeighbor(x,y,gradiantMatrix) {
        return {
            'x': x,
            'y': y,
            'cost': gradiantMatrix[this.at(x,y)]
        };
    }

    getNeighbors(x, y, gradiantMatrix, orientation) {
        var neighbors = [];
        if(orientation === 'vertical'){
                if(y === 0){
                    return neighbors;
                } else if(x === 0) {
                    neighbors.push(this.getNeighbor(x, y-1, gradiantMatrix));
                    neighbors.push(this.getNeighbor(x+1, y-1, gradiantMatrix));
                } else if(x === this.canvas.width-1) {
                    neighbors.push(this.getNeighbor(x-1,y-1, gradiantMatrix));
                    neighbors.push(this.getNeighbor(x,y-1, gradiantMatrix));
                } else {
                    neighbors.push(this.getNeighbor(x-1,y-1, gradiantMatrix));
                    neighbors.push(this.getNeighbor(x,y-1, gradiantMatrix));
                    neighbors.push(this.getNeighbor(x+1,y-1, gradiantMatrix));
                }
            } else if (orientation === 'horizontal'){
                if(x === 0){
                    return neighbors;
                } else if(y === 0) {
                    neighbors.push(this.getNeighbor(x-1, y, gradiantMatrix));
                    neighbors.push(this.getNeighbor(x-1, y+1, gradiantMatrix));
                } else if(y === this.canvas.height-1) {
                    neighbors.push(this.getNeighbor(x-1, y-1, gradiantMatrix));
                    neighbors.push(this.getNeighbor(x-1, y, gradiantMatrix));
                } else {
                    neighbors.push(this.getNeighbor(x-1,y-1, gradiantMatrix));
                    neighbors.push(this.getNeighbor(x-1, y, gradiantMatrix));
                    neighbors.push(this.getNeighbor(x-1, y+1, gradiantMatrix));
                }
            }
        return neighbors;
    }

    getMinNeighbor(x, y, gradiantMatrix, orientation) {
        var neighbor1, neighbor2, neighbor3;
        var neighbor = null;
        if(orientation === 'vertical'){
                if(y === 0){
                    return neighbors;
                } else if(x === 0) {
                    neighbor1 = this.getNeighbor(x, y-1, gradiantMatrix)
                    neighbor2 = this.getNeighbor(x+1, y-1, gradiantMatrix)
                    neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
                } else if(x === this.canvas.width-1) {
                    neighbor1 = this.getNeighbor(x-1,y-1, gradiantMatrix);
                    neighbor2 = this.getNeighbor(x,y-1, gradiantMatrix);
                    neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
                } else {
                    neighbor1 = this.getNeighbor(x-1,y-1, gradiantMatrix);
                    neighbor2 = this.getNeighbor(x,y-1, gradiantMatrix);
                    neighbor3 = this.getNeighbor(x+1,y-1, gradiantMatrix);
                    neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
                    neighbor = neighbor.cost < neighbor3.cost ? neighbor : neighbor3;
                }
            } else if (orientation === 'horizontal'){
                if(x === 0){
                    return neighbors;
                } else if(y === 0) {
                    neighbor1 = this.getNeighbor(x-1, y, gradiantMatrix);
                    neighbor2 = this.getNeighbor(x-1, y+1, gradiantMatrix);
                    neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
                } else if(y === this.canvas.height-1) {
                    neighbor1 = this.getNeighbor(x-1, y-1, gradiantMatrix);
                    neighbor2 = this.getNeighbor(x-1, y, gradiantMatrix);
                    neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
                } else {
                    neighbor1 = this.getNeighbor(x-1,y-1, gradiantMatrix);
                    neighbor2 = this.getNeighbor(x-1, y, gradiantMatrix);
                    neighbor3 = this.getNeighbor(x-1, y+1, gradiantMatrix);
                    neighbor = neighbor1.cost < neighbor2.cost ? neighbor1 : neighbor2;
                    neighbor = neighbor.cost < neighbor3.cost ? neighbor : neighbor3;
                }
            }
        return neighbor;
    }



    computeSeams(numSeams, orientation) {
        var minCosts;
        if (orientation === 'vertical') {
            minCosts = this.getBottomEdgeMin(numSeams);
        } else if (orientation === 'horizontal') {
            minCosts = this.getRightEdgeMin(numSeams);
        }
        // take those positions and follow the min cost route back to the top
        var seams = [];
        for(var i = 0; i < minCosts.length; i++){
            var x =  minCosts[i].x;
            var y = minCosts[i].y;
            var pos = orientation === 'vertical' ? y : x;
            var seam = [];
            while(pos > 0) {
                seam.push({'x': x, 'y': y});
                var neighbor = this.neighborMatrix[x][y];
                x = neighbor.x;
                y = neighbor.y;
                --pos;
            }
            seam.push({'x': x, 'y': y});
            seams.push(seam);
        }

        return seams;
    }

    getBottomEdgeMin(numSeams){
        var lastRowIdx = this.canvas.height - 1;
        var minCosts = [{'x': 0, 'y': lastRowIdx, 'cost': this.costMatrix[0][lastRowIdx]}];
        for (var i = 0; i < this.costMatrix.length; i++) {
            var curCost = this.costMatrix[i][lastRowIdx];
            if(Object.keys(minCosts).length <= numSeams){
                minCosts.push({'x' : i, 'y': lastRowIdx, 'cost': curCost});
            } else {
                var maxItem = _.max(minCosts, function(item){return item.cost;});
                if (curCost < maxItem.cost) {
                    minCosts.push({'x' : i, 'y': lastRowIdx, 'cost': curCost});
                    minCosts = _.filter(minCosts, function(item){ return item.cost < maxItem.cost;});
                }
            }
        }
        minCosts = minCosts.slice(0, numSeams);
        return minCosts;
    }

    getRightEdgeMin(numSeams){
        var lastColIdx = this.canvas.width - 1;
        var minCosts = [{'x': lastColIdx, 'y': 0, 'cost': this.costMatrix[lastColIdx][0]}];
        for (var i = 0; i < this.costMatrix[0].length; i++) {
            var curCost = this.costMatrix[lastColIdx][i];
            if(Object.keys(minCosts).length <= numSeams){
                minCosts.push({'x' : lastColIdx, 'y': i, 'cost': curCost});
            } else {
                var maxItem = _.max(minCosts, function(item){return item.cost;});
                if (curCost < maxItem.cost) {
                    minCosts.push({'x' : lastColIdx, 'y': i, 'cost': curCost});
                    minCosts = _.filter(minCosts, function(item){ return item.cost < maxItem.cost;});
                }
            }
        }
        minCosts = minCosts.slice(0, numSeams);
        return minCosts;    
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

    // TODO: Refactor out duplication
    ripSeam(seam, orientation, imageData) {
        var uInt32Data = new Uint32Array(imageData.data.buffer);
        var target;
        if (orientation === 'vertical') {
            target = new Uint32Array((this.canvas.width-1)*(this.canvas.height))
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
        } else if (orientation === 'horizontal') {
            target = new Uint32Array((this.canvas.width)*(this.canvas.height-1));
            for (var x = 0; x < this.canvas.width; x++) {
                var pixel = _.find(seam, function (pix) { return pix.x === x});
                for (var y = 0; y < this.canvas.height; y++){
                    if(y < pixel.y) {
                        uInt32Data[this.at(x,y)] = uInt32Data[this.at(x,y)];
                    } else {
                        uInt32Data[this.at(x,y)] = uInt32Data[this.at(x,y+1)];
                    }   
                }       
            }
        }
    }
}
