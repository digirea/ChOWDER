const Command = require('../command.js');
const redis = require("redis");

class ClusterBroadcast{
    constructor(){
		this.subscriber = redis.createClient(6379, '127.0.0.1');
		this.publisher = redis.createClient(6379, '127.0.0.1');

		this.ws = null;
		this.messageID = 1;

		this.subscriber.subscribe("broadcast");
		this.subscriber.on("message", (channel, message)=>{
			const msg = JSON.parse(message);
			if(channel === "broadcast"){
				if(msg.method === "broadcast"){
					if(this.ws !== null){
						this.broadcastCluster(this.ws, msg.argments.method, msg.argments.args);
					}
				}
				if(msg.method === "broadcastToTargets"){
					if(this.ws !== null){
						this.broadcastToTargetsCluster(this.ws, msg.argments.method, msg.argments.args);
					}
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

	publish_broadcast(method, args){
		this.publisher.publish("broadcast", JSON.stringify({method:"broadcast",argments:{method, args}}));
	}

	publish_broadcastToTargets(targetSocketIDList, method, args){
		this.publisher.publish("broadcastToTargets", JSON.stringify({method:"broadcastToTargets",argments:{targetSocketIDList, method, args}}));
	}

}

module.exports = ClusterBroadcast;
