export default class Carver {
    constructor() {
        this.computeGradiant = this.computeSimpleGradiant;
        this.canvas = $('#canvas')[0];
        this.ctx = this.canvas.getContext('2d');
        this.gradCanvas = $('#gradiant-canvas-dual')[0];
        this.gradCtx = this.gradCanvas.getContext('2d');
        this.seamsDisplayed = 'none';
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
        this.colorData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.drawImagesForDisplay();
    }

    doResize(orientation) {
        this.ctx.putImageData(this.colorData, 0, 0);
        this.convertGrayscale();
        this.computeGradiant(false);
        this.computeEnergy(orientation);
        var seam = this.computeSeams(1, orientation)[0];
        var imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ripSeam(seam, orientation, imageData);
        if (orientation === 'vertical') {
            this.canvas.width = this.canvas.width-1;
            this.gradCanvas.width = this.canvas.width;
        } else if (orientation === 'horizontal'){
            this.canvas.height = this.canvas.height-1;
            this.gradCanvas.height = this.canvas.height;
        }
        this.ctx.putImageData(imageData, 0, 0);
    }

    resize(newWidth, newHeight) {
        var rowDelta = this.canvas.height - newHeight;
        var colDelta = this.canvas.width - newWidth;
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
        this.ctx.putImageData(this.colorData, 0, 0);
        this.colorData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.convertGrayscale();
        this.computeGradiant();
        this.computeSeamImageDatas();
        if (this.seamsDisplayed === 'vertical') {
            this.displayVerticalSeams();
        } else if (this.seamsDisplayed === 'horizontal') {
            this.displayHorizontalSeams();
        } else if (this.seamsDisplayed === 'none') {
            this.hideSeams();
        }
    }

    computeSeamImageDatas () {
        this.computeEnergy('vertical');
        var vertSeams = this.computeSeams(1, 'vertical');
        var colorDataCopy = this.copyArrayBuffer(this.colorData);
        var gradDataCopy = this.copyArrayBuffer(this.gradData);
        this.vertData = this.traceSeam(vertSeams, colorDataCopy);
        this.vertGradData = this.traceSeam(vertSeams, gradDataCopy);

        this.computeEnergy('horizontal');
        var horzSeams = this.computeSeams(1, 'horizontal');
        colorDataCopy = this.copyArrayBuffer(this.colorData);
        gradDataCopy = this.copyArrayBuffer(this.gradData);
        this.horzData = this.traceSeam(horzSeams, colorDataCopy);
        this.horzGradData = this.traceSeam(horzSeams, gradDataCopy);
    }

    copyArrayBuffer(src) {
        return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
    }

    selectSobel() {
        this.computeGradiant = this.computeSobelGradiant;
        this.drawImagesForDisplay();
    }

    selectSimple() {
        this.computeGradiant = this.computeSimpleGradiant;
        this.drawImagesForDisplay();
    }

    displayVerticalSeams() {
        this.seamsDisplayed = 'vertical';
        this.ctx.putImageData(this.vertData, 0, 0);
        this.gradCtx.putImageData(this.vertGradData, 0, 0);
    }
    
    displayHorizontalSeams() {
        this.seamsDisplayed = 'horizontal';
        this.ctx.putImageData(this.horzData, 0, 0);
        this.gradCtx.putImageData(this.horzGradData, 0, 0);
    }

    hideSeams() {
        this.seamsDisplayed = 'none';
        this.ctx.putImageData(this.colorData, 0, 0);
        this.gradCtx.putImageData(this.gradData, 0, 0);
    }

    convertGrayscale() {
        this.grayImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.grayscaleImage = new jsfeat.matrix_t(this.canvas.width, this.canvas.height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(this.grayImageData.data, this.canvas.width, this.canvas.height, this.grayscaleImage);

        var data_u32 = new Uint32Array(this.grayImageData.data.buffer);
        var alpha = (0xff << 24);
        var i = this.grayscaleImage.cols*this.grayscaleImage.rows, pix = 0;
        while(--i >= 0) {
            pix = this.grayscaleImage.data[i];
            data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
        }
    }

    computeSobelGradiant() {
        this.gradCanvas.width = this.canvas.width;
        this.gradCanvas.height = this.canvas.width;
        this.gradCtx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
        this.gradData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        var UInt32DualData = new Uint32Array(this.gradData.data.buffer);
        this.UInt8DualGradData = new jsfeat.matrix_t(this.canvas.width, this.canvas.height, jsfeat.U8_t | jsfeat.C1_t);

        this.gradiantImage = new jsfeat.matrix_t(this.canvas.width, this.canvas.height, jsfeat.S32C2_t);
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
        }
        this.gradCtx.putImageData(this.gradData, 0, 0);
    }

    computeSimpleGradiant() {
        this.gradCanvas.width = this.canvas.width;
        this.gradCanvas.height = this.canvas.width;
        this.gradCtx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
        this.gradData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        var UInt32DualData = new Uint32Array(this.gradData.data.buffer);
        this.UInt8DualGradData = new jsfeat.matrix_t(this.canvas.width, this.canvas.height, jsfeat.U8_t | jsfeat.C1_t);

        var alpha = (0xff << 24);
        for(var x = 0; x < this.gradCanvas.width; x++) {
            for(var y = 0; y < this.gradCanvas.height; y++) {
                var idx = this.at(x, y);
                var lidx = (x > 0 && y > 0) ? this.at(x-1, y): idx;
                var uidx = (x > 0 && y > 0) ? this.at(x, y-1) : idx;

                var curPix = this.grayscaleImage.data[idx];
                var leftPix = this.grayscaleImage.data[lidx];
                var upPix = this.grayscaleImage.data[uidx];

                var dx = curPix - leftPix;
                var dy = curPix - upPix;
                var mag = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))&0xff;;

                this.UInt8DualGradData[idx] = mag;
                UInt32DualData[idx] = alpha | (mag << 16) | (mag << 8) | mag;
            }
        }

        this.gradCtx.putImageData(this.gradData, 0, 0);
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
