(() => {
    "use strict";
    const fs = require('fs');
    const path = require("path");
    const nodeZip = require("node-zip");

    class Zip{
        /**
         * extract
         * zipを指定フォルダに解凍する
         * @method extract
         * @param {BLOB} binaryData zip
         * @param {string} extractDir
         * @return {Promise<{err:Error,dir:string}[]>} [{err,dir},{err,dir},{err,dir}]
         */
        static async extract(binaryData, extractDir){
            const zip = new nodeZip(binaryData, {base64: false, checkCRC32: true});

            let fileList = [];
            for(let i in zip.files){
                const ret = await this._extractFile(zip,i,extractDir).catch((err)=>{return err;});
                fileList.push(ret);
            }
            return fileList;
        }

        /**
         * extractZip から呼ばれる用
         * @method _extractFile
         * @return {Promise<{err:Error,dir:string}>} {err,dir}
         */
        static _extractFile(zip,file,extractDir){
            return new Promise((resolve,reject)=>{
                // console.log("extractDir",extractDir)
                const filepath = path.join(extractDir,zip.files[file].name);
                // console.log("filepath",filepath)
                const relativeDir = path.join("userdata",extractDir.split("\\public").slice(-1)[0]);
                // console.log("relativeDir",relativeDir)
                if(zip.files[file].options.dir === true){
                    if(!fs.existsSync(filepath)){
                        console.log("[mkdir] : ",filepath);
                        fs.mkdir(filepath, { recursive: true },(err)=>{
                            if(err){
                                console.log(err)
                                reject({err:err,dir:null});
                            };
                            resolve({err:null,dir:path.join(relativeDir,zip.files[file].name)});
                        });
                    }else{
                        reject({err:new Error("this filename already exist"),dir:null});
                    }
                }else{
                    if(!fs.existsSync(path.parse(filepath).dir)){
                        fs.mkdirSync(path.parse(filepath).dir);
                    }
                    fs.writeFile(filepath,zip.files[file]._data,"binary",(err)=>{
                        console.log("[writeFile] : ",filepath);
                        if(err){
                            console.log(err)
                            reject({err:err,dir:null});
                        };
                        resolve({err:null,dir:path.join(relativeDir,zip.files[file].name)});
                    });
                }
            });
        }
    }

    module.exports = Zip;
})();
