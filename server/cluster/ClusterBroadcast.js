const Command = require('../command.js');

class ClusterBroadcast{
    constructor(){
		this.ws = null;
		this.messageID = 1;

        process.on("message",(msg)=>{
            if(msg.method === "broadcast"){
				if(this.ws !== null){
                	this.broadcastCluster(this.ws, msg.argments.method, msg.argments.args, msg.argments.resultCallback);
				}
			}
            if(msg.method === "broadcastToTargets"){
				if(this.ws !== null){
					this.broadcastToTargetsCluster(this.ws, msg.argments.method, msg.argments.args, msg.argments.resultCallback);
				}
			}
		});    
    }

    setWS(ws){
        this.ws = ws;
    }

    /**
	 * ブロードキャストする.
	 * @method broadcast
	 * @parma {Object} ws websocketオブジェクト
	 * @param {String} method JSONRPCメソッド
	 * @param {JSON} args パラメータ
	 * @param {Function} resultCallback サーバから返信があった場合に呼ばれる. resultCallback(err, res)の形式.
	 */
	broadcastCluster(ws, method, args, resultCallback) {
		let reqjson = {
			jsonrpc: '2.0',
			type : 'utf8',
			id: this.messageID,
			method: method,
			params: args,
			to: 'client'
		}, data;
		this.messageID = this.messageID + 1;
		// if(args[0]){
		// 	console.log("broadcastCluster",{pid:process.pid,args:args[0].cameraWorldMatrix});
		// }
		try {
			data = JSON.stringify(reqjson);

			if (Command.hasOwnProperty(reqjson.method)) {
				// resultCallbacks[reqjson.id] = resultCallback;
				//if(method !== 'UpdateMouseCursor'){console.log("chowder_response broadcast ws", method);}
				for (let i = 0; i < ws.length; ++i) {
					ws[i].broadcast(data);
				}
			} else {
				console.log('[Error] Not found the method in connector: ', data);
			}
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * ブロードキャストする.
	 * @method broadcast
	 * @parma {Object} ws websocketオブジェクト
	 * @param {String} method JSONRPCメソッド
	 * @param {JSON} args パラメータ
	 * @param {Function} resultCallback サーバから返信があった場合に呼ばれる. resultCallback(err, res)の形式.
	 */
	broadcastToTargetsCluster(targetSocketIDList, ws, method, args, resultCallback) {
		let reqjson = {
			jsonrpc: '2.0',
			type : 'utf8',
			id: messageID,
			method: method,
			params: args,
			to: 'client'
		}, data;

		messageID = messageID + 1;
		try {
			data = JSON.stringify(reqjson);

			if (Command.hasOwnProperty(reqjson.method)) {
				// resultCallbacks[reqjson.id] = resultCallback;
				//if(method !== 'UpdateMouseCursor'){console.log("chowder_response broadcast ws", method);}
				
                for (let i = 0; i < ws.length; ++i) {
                    ws[i].connections.forEach((connection) => {
                        if (targetSocketIDList.indexOf(connection.id) >= 0) {
                            connection.sendUTF(data);
                        }
                    }); 
				}
			} else {
				console.log('[Error] Not found the method in connector: ', data);
			}
		} catch (e) {
			console.error(e);
		}
	}



}

module.exports = ClusterBroadcast;
