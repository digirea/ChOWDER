const Master = require("./Master.js");
const Worker = require("./Worker.js");

const cluster = require("cluster");

/* ラウンドロビンで分散させる。
windowsだけ初期値がこれじゃないので明示的に書く */
cluster.schedulingPolicy = cluster.SCHED_RR; 

if(cluster.isMaster){
    const master = new Master(cluster);
    master.run();
}else{
    const worker = new Worker();
    worker.run();
}
