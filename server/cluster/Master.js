class Master{
    constructor(cluster){
        this.cluster = cluster;
    }

    run(){
        // const THREAD_MAX = require("os").cpus().length;
        const THREAD_MAX = 4;

        console.log("Master running");
        for(let i=0;i<THREAD_MAX;i++){ // CPU数だけworkerをつくる
            this.cluster.fork();
        }
        this.cluster.on("exit",(worker)=>{ // workerが死んだら新しいworkerをつくる
            console.log("worker " + worker.process.pid + " died");
            this.cluster.fork();
        });

        for(const id in this.cluster.workers){
            /* いずれかのworkerから受け取ったmessageを全workerに知らせる */
            this.cluster.workers[id].on("message",(msg)=>{
                // console.log("[master]broadcastWorkers");
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
}

module.exports = Master;
