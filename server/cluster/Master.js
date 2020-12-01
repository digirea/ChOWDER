const fs = require("fs");
const path = require("path");

class Master{
    constructor(cluster){
        this.cluster = cluster;
    }

    run(){
        /* workerの数は、setting.jsonを参照する。なければcpu数 */
        const settings = this.getSettings();
        const WORKER_COUNT = settings.hasOwnProperty('workerCount') ? settings.workerCount : require("os").cpus().length;

        console.log("Master running");
        console.log("WORKER_COUNT: ",WORKER_COUNT);
        for(let i=0;i<WORKER_COUNT;i++){ // CPU数だけworkerをつくる
            this.cluster.fork();
        }
        this.cluster.on("exit",(worker)=>{ // workerが死んだら新しいworkerをつくる
            console.log("worker " + worker.process.pid + " died");
            this.cluster.fork();
        });

        for(const id in this.cluster.workers){
            /* いずれかのworkerから受け取ったmessageを全workerに知らせる */
            this.cluster.workers[id].on("message",(msg)=>{
                // console.log("[master]11111broadcastWorkers");
                if(msg.method){
                    this.broadcastWorkers(msg);
                }
            });    
        }
    }

    broadcastWorkers(msg){
        for(const id in this.cluster.workers){
            this.cluster.workers[id].send(msg);
        }
    }

    getSettings(){
        const data = fs.readFileSync(path.join(__dirname, ".." ,'setting.json'),"utf-8");
        try {
            const settings = JSON.parse(String(data));
            return settings;
        } catch (e) {
            console.error(e);
            console.error("Failed to load setting.json");
            process.exit(-1);
        }
    }
}

module.exports = Master;
