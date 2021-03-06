/**
 * Copyright (c) 2016-2018 Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * Copyright (c) 2016-2018 RIKEN Center for Computational Science. All rights reserved.
 */

 'use strict';

function offsetX(eve) {
    return eve.offsetX || eve.pageX - eve.target.getBoundingClientRect().left;
}
function offsetY(eve) {
    return eve.offsetY || eve.pageY - eve.target.getBoundingClientRect().top;
}

class ColorSelector {
    constructor(callback, w, h) {
        this.elementWrapper = null; // 全体を包んでいる div
        this.elementCanvas = null; // 色を表示している canvas
        this.elementCurrentColor = null; // 現在のカレントな色用の DOM
        this.elementHoverColor = null; // ホバー中の色用の DOM
        this.elementColorString = null; // ホバー中の色の 16 進数表記文字用の DOM
        this.canvasContext = null; // canvas 2d context
        this.canvasImageData = null; // imageData
        this.canvasWidth = w || 256; // width
        this.canvasHeight = h || 128; // height
        this.currentColor = [0, 0, 0, 1.0]; // カレントの色
        this.hoverColor = [0, 0, 0, 1.0]; // ホバー中の色
        this.setColorCallback = null; // 色選択時に呼ばれるコールバック
        if (callback) {
            this.setColorCallback = callback;
        }
        this.generate();
    }
    click(eve) {
        let x = parseInt(offsetX(eve), 10);
        let y = parseInt(offsetY(eve), 10);
        let i = y * this.canvasWidth + x;
        let j = i * 4;
        if (!isNaN(x) && !isNaN(y)) {
            this.setColor(this.canvasImageData.data[j], this.canvasImageData.data[j + 1], this.canvasImageData.data[j + 2], this.canvasImageData.data[j + 3] / 255);
        }
    }
    move(eve) {
        let x = parseInt(offsetX(eve), 10);
        let y = parseInt(offsetY(eve), 10);
        let i = y * this.canvasWidth + x;
        let j = i * 4;
        if (!isNaN(x) && !isNaN(y)) {
            this.setHoverColor(this.canvasImageData.data[j], this.canvasImageData.data[j + 1], this.canvasImageData.data[j + 2], this.canvasImageData.data[j + 3] / 255);
        }
    }
    convertCSSColor() {
        if (!this.hoverColor) {
            return "#FFFFFF";
        }
        let r = this.zeroPad(this.hoverColor[0].toString(16));
        let g = this.zeroPad(this.hoverColor[1].toString(16));
        let b = this.zeroPad(this.hoverColor[2].toString(16));
        return '#' + r + g + b;
    }
    zeroPad(v) {
        return v.length % 2 ? '0' + v : v;
    }
    setColorStr(colorstr) {
        if (colorstr.indexOf('rgba') >= 0) {
            let color = colorstr.split('rgba').join("");
            color = color.split('(').join("");
            color = color.split(')').join("");
            color = color.split('"').join("");
            color = color.split("'").join("");
            color = color.split(",");
            if (color.length > 3) {
                this.currentColor[0] = Number(color[0]);
                this.currentColor[1] = Number(color[1]);
                this.currentColor[2] = Number(color[2]);
                this.currentColor[3] = Number(color[3]);
            }
        }
        else if (colorstr.indexOf('rgb') >= 0) {
            let color = colorstr.split('rgb').join("");
            color = color.split('(').join("");
            color = color.split(')').join("");
            color = color.split('"').join("");
            color = color.split("'").join("");
            color = color.split(",");
            if (color.length > 2) {
                this.currentColor[0] = Number(color[0]);
                this.currentColor[1] = Number(color[1]);
                this.currentColor[2] = Number(color[2]);
            }
        }
        this.elementCurrentColor.style.backgroundColor = 'rgba(' + this.currentColor.join(',') + ')';
    }
    setColor(r, g, b, a, cancel) {
        this.currentColor[0] = r;
        this.currentColor[1] = g;
        this.currentColor[2] = b;
        this.currentColor[3] = a;
        this.elementCurrentColor.style.backgroundColor = 'rgba(' + this.currentColor.join(',') + ')';
        if (cancel !== true) {
            this.setColorCallback(this.currentColor.concat());
        }
    }
    setHoverColor(r, g, b, a) {
        if (r === undefined || g === undefined || b === undefined || a === undefined)
            return;
        this.hoverColor[0] = r;
        this.hoverColor[1] = g;
        this.hoverColor[2] = b;
        this.hoverColor[3] = a;
        this.elementHoverColor.style.backgroundColor = 'rgba(' + this.hoverColor.join(',') + ')';
        this.elementColorString.textContent = this.convertCSSColor();
    }
    getColor() {
        let returnValue = this.currentColor.concat();
        return returnValue;
    }
    generate() {
        let e, f, g, h, i, j, k;
        let gradient;
        e = document.createElement('div');
        e.style.backgroundColor = 'transparent';
        e.style.border = '0px solid silver';
        e.style.margin = '0';
        e.style.padding = '10px';
        e.style.width = (this.canvasWidth + 24) + 'px';
        e.style.position = 'absolute';
        e.style.display = 'flex';
        e.style.flexDirection = 'column';
        f = document.createElement('canvas');
        f.width = this.canvasWidth;
        f.height = this.canvasHeight;
        f.style.display = 'block';
        e.appendChild(f);
        g = document.createElement('div');
        g.style.margin = '5px 0px 0px';
        g.style.padding = '0';
        g.style.width = this.canvasWidth + 'px';
        g.style.height = '20px';
        g.style.display = 'flex';
        g.style.flexDirection = 'row';
        g.style.boxShadow = '0px 0px 0px 1px gray';
        e.appendChild(g);
        i = document.createElement('div');
        i.style.backgroundColor = 'black';
        i.style.margin = '0';
        i.style.padding = '0';
        i.style.width = parseInt(this.canvasWidth / 3, 10) + 'px';
        i.style.height = '20px';
        j = document.createElement('div');
        j.style.backgroundColor = 'black';
        j.style.margin = '0';
        j.style.padding = '0';
        j.style.width = parseInt(this.canvasWidth / 3, 10) + 'px';
        j.style.height = '20px';
        k = document.createElement('div');
        k.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        k.style.margin = '0';
        k.style.padding = '0';
        k.style.minWidth = '100px';
        // k.style.width = parseInt(this.canvasWidth / 3, 10) + 'px';
        k.style.height = '20px';
        k.style.fontSize = 'smaller';
        k.style.lineHeight = '20px';
        k.style.color = '#444';
        k.style.fontFamily = '"ＭＳ ゴシック", Monaco, Ricty, monospace';
        k.style.textAlign = 'center';
        g.appendChild(j);
        g.appendChild(k);
        g.appendChild(i);
        h = f.getContext('2d');
        this.elementWrapper = e;
        this.elementCanvas = f;
        this.elementCurrentColor = i;
        this.elementHoverColor = j;
        this.elementColorString = k;
        this.canvasContext = h;
        gradient = h.createLinearGradient(0, 0, this.canvasWidth, 0);
        gradient.addColorStop(0.0, "rgb(255,   0,   0)");
        gradient.addColorStop(0.15, "rgb(255,   0, 255)");
        gradient.addColorStop(0.33, "rgb(  0,   0, 255)");
        gradient.addColorStop(0.49, "rgb(  0, 255, 255)");
        gradient.addColorStop(0.67, "rgb(  0, 255,   0)");
        gradient.addColorStop(0.84, "rgb(255, 255,   0)");
        gradient.addColorStop(1.0, "rgb(255,   0,   0)");
        h.fillStyle = gradient;
        h.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        gradient = h.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
        gradient.addColorStop(0.01, "rgba(255, 255, 255, 1.0)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.0)");
        gradient.addColorStop(0.5, "rgba(  0,   0,   0, 0.0)");
        gradient.addColorStop(0.99, "rgba(  0,   0,   0, 1.0)");
        gradient.addColorStop(1.0, "rgba(  0,   0,   0, 1.0)");
        h.fillStyle = gradient;
        h.fillRect(0, 0, h.canvas.width, h.canvas.height);
        this.canvasImageData = h.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
        this.elementCanvas.onclick = this.click.bind(this);
        this.elementCanvas.onmousemove = this.move.bind(this);
        return e;
    }
}

export default ColorSelector;




