/**
 * Copyright (c) 2016-2018 Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * Copyright (c) 2016-2018 RIKEN Center for Computational Science. All rights reserved.
 */

"use strict";

import Select from '../components/select';
import Store from './store.js';
import LoginMenu from '../components/login_menu.js';
import Translation from '../common/translation';
import Constants from '../common/constants';
import Button from '../components/button';
import InputDialog from '../components/input_dialog';
import MapDialog from './map_dialog';

function serializeFunction(f) {
    return encodeURI(f.toString());
}

// canvasをArrayBufferに
function toArrayBuffer(base64) {
    // Base64からバイナリへ変換
    var bin = atob(base64.replace(/^.*,/, ''));
    var buffer = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
        buffer[i] = bin.charCodeAt(i);
    }
    return buffer.buffer;
}

class GUI extends EventEmitter {
    constructor(store, action) {
        super();

        this.store = store;
        this.action = action;

    }

    init() {
        this.initWindow();
        this.initLoginMenu();
        this.loginMenu.show(true);
        this.addITwonSelect()
        Translation.translate(function () { });

        // ログイン成功
        this.store.on(Store.EVENT_LOGIN_SUCCESS, (err, data) => {
            this.loginMenu.showInvalidLabel(false);
            this.loginMenu.show(false);

            this.initPropertyPanel();
            this.showWebGL();
        });

        // ログイン失敗
        this.store.on(Store.EVENT_LOGIN_FAILED, (err, data) => {
            this.loginMenu.showInvalidLabel(true);
        });

        // ためしにマップ追加
        this.store.on(Store.EVENT_DONE_ADD_MAP, (err, data) => {
            // iframe内のchowder injectionの初期化
            this.iframe.contentWindow.postMessage(JSON.stringify({
                jsonrpc: "2.0",
                method: "chowder_itowns_add_map",
                params: data
            }));
        });

        // マップ削除
        this.store.on(Store.EVENT_DONE_DELETE_MAP, (err, data) => {
            this.iframe.contentWindow.postMessage(JSON.stringify({
                jsonrpc: "2.0",
                method: "chowder_itowns_delete_map",
                params: {
                    id: data
                }
            }));
        });

        // マップ順序変更
        this.store.on(Store.EVENT_DONE_CHANGE_MAP_ORDER, (err, data) => {
            this.iframe.contentWindow.postMessage(JSON.stringify({
                jsonrpc: "2.0",
                method: "chowder_itowns_change_map_order",
                params: data
            }));
        });
        
    }

    initWindow() {
        // ウィンドウリサイズ時の処理
        let timer;
        window.onresize = () => {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                this.action.resizeWindow({
                    size: this.getWindowSize()
                });
            }, 200);
        };
    }

    initLoginMenu() {
        this.loginMenu = new LoginMenu("ChOWDER iTowns Controller");
        document.body.insertBefore(this.loginMenu.getDOM(), document.body.childNodes[0]);

        // ログインが実行された場合
        this.loginMenu.on(LoginMenu.EVENT_LOGIN, () => {
            let userSelect = this.loginMenu.getUserSelect();
            // ログイン実行
            this.action.login({
                id: "APIUser",
                password: this.loginMenu.getPassword()
            });
        });

        let select = this.loginMenu.getUserSelect();
        select.addOption("APIUser", "APIUser");
    }

    addITwonSelect() {
        let wrapDom = document.createElement('div');
        wrapDom.innerHTML = "Sample Content:"
        this.itownSelect = new Select();
        this.itownSelect.getDOM().className = "itown_select";
        this.itownSelect.addOption("itowns/view_3d_map.html", "view_3d_map");
        this.itownSelect.addOption("itowns/3dtiles_basic.html", "3dtiles_basic");
        this.itownSelect.addOption("itowns/vector_tile_raster_3d.html", "vector_tile_raster_3d");
        this.itownSelect.addOption("itowns/view_pointcloud_3d_map.html", "view_pointcloud_3d_map");
        this.itownSelect.getDOM().style.marginTop = "20px"
        wrapDom.appendChild(this.itownSelect.getDOM())
        document.getElementsByClassName('loginframe')[0].appendChild(wrapDom);
    }

    initPropertyPanel() {
        let propElem = document.getElementById('itowns_property');

        // コンテンツタイトル
        let contentTitle = document.createElement('p');
        contentTitle.className = "title";
        contentTitle.innerHTML = "Base Content";
        propElem.appendChild(contentTitle);

        // コンテンツ名
        let contentName = document.createElement('p');
        contentName.className = "property_text";
        contentName.innerHTML = this.itownSelect.getSelectedValue();
        propElem.appendChild(contentName);

        // マップリストタイトル
        let mapTitle = document.createElement('p');
        mapTitle.className = "title";
        mapTitle.innerHTML = "Map List";
        propElem.appendChild(mapTitle);

        // マップ一覧
        this.mapSelect = new Select();
        this.mapSelect.getDOM().className = "map_select";
        this.mapSelect.getDOM().size = 10;
        propElem.appendChild(this.mapSelect.getDOM());

        let mapButtonArea = document.createElement('div');
        mapButtonArea.className = "map_button_area";

        // マップ上移動ボタン
        this.mapUpButton = new Button();
        this.mapUpButton.getDOM().className = "map_up_button btn btn-light";
        mapButtonArea.appendChild(this.mapUpButton.getDOM());

        // マップ下移動ボタン
        this.mapDownButton = new Button();
        this.mapDownButton.getDOM().className = "map_down_button btn btn-light";
        mapButtonArea.appendChild(this.mapDownButton.getDOM());


        // マップ追加ボタン
        this.mapAddButton = new Button();
        this.mapAddButton.setDataKey("+");
        this.mapAddButton.getDOM().className = "map_button btn btn-primary";
        mapButtonArea.appendChild(this.mapAddButton.getDOM());

        // マップ削除ボタン
        this.mapDeleteButton = new Button();
        this.mapDeleteButton.setDataKey("-");
        this.mapDeleteButton.getDOM().className = "map_button btn btn-danger";
        mapButtonArea.appendChild(this.mapDeleteButton.getDOM());

        propElem.appendChild(mapButtonArea);

        // マップ追加ダイアログ
        this.mapDialog = new MapDialog(this.store, this.action);
        document.body.appendChild(this.mapDialog.getDOM());

        this.mapAddButton.on('click', () => {
            this.mapDialog.show((isOK, data) => {
                // OK
                this.action.addMap(data);
            });
            /*
            InputDialog.showTextInput({
                name: '地図追加',
                initialValue: "http://localhost/map/${z}/${x}/${y}.png",
                okButtonName: "OK",
            }, (value) => {

                console.log("追加", value)
                this.action.addMap({
                    url : value
                });
            });
            */
        });

        this.mapDeleteButton.on('click', () => {

            InputDialog.showOKCancelInput({
                name: this.mapSelect.getSelectedValue() + i18next.t('を削除しますか'),
                okButtonName: "OK"
            }, (isOK) => {
                if (isOK) {
                    this.action.deleteMap(this.mapSelect.getSelectedValue());
                }
            });
        });

        this.mapUpButton.on('click', () => {
            this.action.changeMapOrder({
                id: this.mapSelect.getSelectedValue(),
                isUp : true
            });
        });

        this.mapDownButton.on('click', () => {
            this.action.changeMapOrder({
                id: this.mapSelect.getSelectedValue(),
                isUp : false
            });
        });
        
    }

    initLayerSelectList(layerDatas) {
        this.mapSelect.clear();
        for (let i = 0; i < layerDatas.length; ++i) {
            let data = layerDatas[i];
            this.mapSelect.addOption(data.id, data.id + " - " + data.type);
        }
    }

    /**
     * WebGLを表示
     * @param {*} elem 
     * @param {*} metaData 
     * @param {*} contentData 
     */
    showWebGL() {
        this.iframe = document.createElement('iframe');
        this.iframe.src = this.itownSelect.getSelectedValue();
        this.iframe.style.width = "100%";
        this.iframe.style.height = "100%";
        this.iframe.style.border = "none";

        this.iframe.onload = () => {
            this.iframe.contentWindow.chowder_itowns_view_type = "itowns";
            this.iframe.contentWindow.focus();

            // iframeからのレスポンス
            window.addEventListener("message", (evt) => {
                try {
                    let data = JSON.parse(evt.data);

                    // iframe内のitownsのカメラが更新された
                    if (data.method === "chowder_itowns_update_camera") {
                        this.action.updateCameraWorldMatrix({
                            mat: data.params
                        });
                    }
                    // iframe内のサムネイルが更新された（新規コンテンツ登録する
                    else if (data.method === "chowder_itowns_update_thumbnail") {
                        let params = data.params;
                        //this.addITownContent(toArrayBuffer(params));
                    }
                    else if (data.method === "chowder_itowns_update_layer") {
                        this.initLayerSelectList(data.params);
                    }
                }
                catch (e) {
                    console.error(e);
                }
            });

            // iframe内のchowder injectionの初期化
            this.iframe.contentWindow.postMessage(JSON.stringify({
                jsonrpc: "2.0",
                method: "chowder_injection_init"
            }));
        }

        document.getElementById('itowns').appendChild(this.iframe);
    }

    addITownContent(thumbnailBuffer) {
        let url = this.itownSelect.getSelectedValue();
        let metaData = {
            type: Constants.TypeWebGL,
            user_data_text: JSON.stringify({
                text: url
            }),
            posx: 0,
            posy: 0,
            width: this.getWindowSize().width,
            height: this.getWindowSize().height,
            orgWidth: this.getWindowSize().width,
            orgHeight: this.getWindowSize().height,
            visible: true,
            url: decodeURI(url)
        };
        let data = {
            metaData: metaData,
            contentData: thumbnailBuffer
        };
        this.action.addContent(data);
    }

    /**
     * クライアントサイズを取得する.
     * ただの `{width: window.innerWidth, height: window.innerHeight}`.
     * @method getWindowSize
     * @return {Object} クライアントサイズ
     */
    getWindowSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}

export default GUI;