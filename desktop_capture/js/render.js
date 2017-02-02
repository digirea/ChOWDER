"use strict";

// エレクトロン依存のモジュールの追加
const electron = require('electron');
const desktopCapturer = electron.desktopCapturer;
const remote = electron.remote;
const screen = electron.screen;
const ipc = electron.ipcRenderer;
const main = remote.require('./main.js');

const WIDTH = 800;
const HEIGHT = 450;
const DEFAULT_URL = 'ws://localhost:8081/';

window.URL = window.URL || window.webkitURL;

(function(){

    function init(){
        
        // 要素初期化---------------------------------------------------------------------------
        let video = document.getElementById('video');
        video.width = WIDTH;
        video.height = HEIGHT;
        let localStream;

        let canvas = document.getElementById('canvas');
        let ctx = canvas.getContext("2d");
        canvas.width = 0;
        canvas.height = 0;
        let sCnvs = document.getElementById('selectedcanvas');
        let sctx = sCnvs.getContext("2d");

        let num = document.getElementById('interval');
        let capButton = document.getElementById('capture');
        let setArea = document.getElementById('setarea');

        // キャプチャー情報
        let capSource;
        let browserId = 0;
        
        let vw = screen.getPrimaryDisplay().size.width;
        let vh = screen.getPrimaryDisplay().size.height;
        
        let drawInterval;
        let drawTime = 1;
        let selected = 0;

        let areaData;
        let subX;
        let subY;

        // フラグ系
        let cap = false;
        let areaFlag = false;
        let resizeTimer;
        let resizeInterval = 1000; //


        // 初期動作----------------------------------------------------------------------------
        initCapturing();
        ws_connector.connect(function(){
            console.log("Connected");
        },function(){
            console.log("Disconected");
        });
        
        // 起動時のキャプチャー-----------------------------------------------------------------    
        function initCapturing(){
            desktopCapturer.getSources({types: ['window', 'screen']}, 
            function(error, sources) {
                if (error) throw error;
                for (let i = 0; i < sources.length; ++i) {
                        addImage(sources[i].thumbnail);
                }
                mainViewer(sources[selected]);
                // キャプチャー情報の保持
                capSource = sources;
            });
        }
        
        // sourcesに関する関数--------------------------------------------------------------------
        // bodyへのサムネイル埋め込み
        function addImage(image) {
            const elm = document.createElement("img");
            elm.id = browserId;
            browserId++;
            elm.className = "thumbnaile";
            elm.src = image.toDataURL();
            document.body.appendChild(elm);
        }

        // 範囲選択用イベント-------------------------------------------------------------------
        setArea.addEventListener('click', function(eve){
            mainViewer(capSource[0]);
            main.areaSelector();
            eve.value = "Get area";
        }, false);
        
        ipc.on('rectData', function(event, data){
            areaData = data;
            areaFlag = true;

            canvas.width = areaData.width;
            canvas.height = areaData.height;
            subX = video.videoWidth - areaData.width;
            subY = video.videoHeight - areaData.height;

        });
        
        // canvas2dへイメージとして送る---------------------------------------------------------
        // 送信インターバル変更
        num.addEventListener("change",function(eve){
            drawTime = eve.target.value;
        },false);

        // キャプチャーイベント
        capButton.addEventListener('click',function(eve){
            // フラグがオフであれば
            if(cap === false){
                drawInterval = setInterval(drawCall,drawTime*1000);
                cap = true;
                capButton.value = "Capture Stop";
            }
            // フラグがオンであれば
            else if(cap === true){
                clearInterval(drawInterval);
                cap = false;
                capButton.value = "Capture Start";
            }
        },false);


        // 同期描画、送信イベント----------------------------------------------------------------
        // Canvasをバイナリ変換後送信
        function sendImage(getCanvas){
            ws_connector.sendBinary('AddContent', {
                "id" :         "captured", // 特定のID に固定する.
                "content_id" : "captured", // 特定のID に固定する.
                "type" :       "image"
            },getImageBinary(getCanvas), function(){});
        }

        function onResize(){
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            
            setInterval(function () {
                if( canvas.height !== video.videoHeight || canvas.width !== video.videoWidth ){
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoHeight;
                }
            }, resizeInterval);
        }

        // 描画呼び出し
        function drawCall(){
            if(areaFlag === true){
                ctx.drawImage(video, areaData.x+8,           areaData.y, 
                              (video.videoWidth - subX), (video.videoHeight - subY),
                               0,                         0, 
                               areaData.width,                areaData.height);
                sendImage(canvas);
            }else if(areaFlag === false){
            
                onResize();
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                sendImage(canvas);
            }
        }
        
        
        // キャプチャー対象の切り替え-------------------------------------------------------------
        addEventListener('click', function(eve){
            //if(areaFlag) areaFlag = false;
            let id = eve.target.id;
            let cs = eve.target.className;
            if(cs === 'thumbnaile' && id){
                selected = id;
                if (localStream) localStream.getTracks()[0].stop();
                localStream = null;
                //console.log(capSource[selected].name);
                mainViewer(capSource[selected]);
                main.activeW()
            }
        }, false);

        // viewer-------------------------------------------------------------------------------
        function mainViewer(source){
            let media;
            if (source.name == "Entire screen") {
                media = 'screen';
            }
            else {
                media = 'desktop';
            }
            navigator.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: media,
                        chromeMediaSourceId: source.id, 
                        minWidth: 0,
                        maxWidth: vw,
                        minHeight: 0,
                        maxHeight: vh
                    }
                }
            }, gotStream, getUserMediaError);
        }

        // デスクトップ情報の取得が成功したとき
        function gotStream(stream) {
            localStream = stream;
            document.querySelector('video').src = URL.createObjectURL(localStream);
            setTimeout(main.activeW(),100);
        }

        // デスクトップ情報の取得に失敗したとき
        function getUserMediaError(e) {
            console.log('getUserMediaError');
        }
        
        // バイナリデータへ変換
        function getImageBinary(canvas) {
            var base64 = canvas.toDataURL('image/png');
            // Base64からバイナリへ変換
            var bin = atob(base64.replace(/^.*,/, ''));
            var array = new ArrayBuffer(bin.length);
            var buffer = new Uint8Array(array);
            for (var i = 0; i < bin.length; i++) {
                buffer[i] = bin.charCodeAt(i);
            }
            // Blobを作成
            return array;
        }

        function resizeCalc(w, h){
            let aW;
            let aH;
            let aspect = w/h;
            if(aspect>=1){
                
            }
        }
        
    };

    window.onload = init;

    
})();