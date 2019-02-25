/**
 * Copyright (c) 2016-2018 Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * Copyright (c) 2016-2018 RIKEN Center for Computational Science. All rights reserved.
 */
class NoticeBox extends EventEmitter {
    constructor(container){
        super();
        this.noticeList = [];
        this.container = container;
    }

    init(){
    }

    addDisplayPermissionLeaf(logindata){
        let notice = {};
        notice.dom = document.createElement("span");
        notice.logindata = logindata;
        notice.dom.classList.add("notice_box_leaf");


        let idWrap = document.createElement("span");
        idWrap.textContent = "ID:" + logindata.displayid;
        idWrap.classList.add("notice_box_id_wrap");

        notice.dom.appendChild(idWrap);


        let buttonWrap = document.createElement("span");
        buttonWrap.classList.add("notice_box_button_wrap");

        notice.acceptButton = document.createElement("span");
        notice.acceptButton.classList.add("notice_box_accept_button");
        notice.acceptButton.textContent = "accept";
        notice.acceptCallback = (err)=>{
            logindata.permission = true;
            this.emit(NoticeBox.EVENT_NOTICE_ACCEPT, err, logindata);
        };
        notice.acceptButton.addEventListener("click",notice.acceptCallback,false);

        notice.rejectButton = document.createElement("span");
        notice.rejectButton.classList.add("notice_box_reject_button");
        notice.rejectButton.textContent = "reject";
        notice.rejectCallback = (err)=>{
            logindata.permission = false;
            this.emit(NoticeBox.EVENT_NOTICE_REJECT, err, logindata);
        };
        notice.rejectButton.addEventListener("click", notice.rejectCallback,false);

        buttonWrap.appendChild(notice.acceptButton);
        buttonWrap.appendChild(notice.rejectButton);

        notice.dom.appendChild(buttonWrap);

        this.noticeList.push(notice);

        this.update();
    }

    deleteDisplayPermissionLeaf(logindata){
        for(let i in this.noticeList){
            if(this.noticeList[i].logindata.displayid === logindata.displayid){
                this.noticeList[i].rejectButton.removeEventListener("click",this.noticeList[i].rejectCallback);
                this.noticeList[i].acceptButton.removeEventListener("click",this.noticeList[i].acceptCallback);
                this.container.removeChild(this.noticeList[i].dom);
                this.noticeList.splice(i,1);
            }
        }
    }

    update(){
        for(let i of this.noticeList){
            this.container.appendChild(i.dom);
        }
    }
}

NoticeBox.EVENT_NOTICE_ACCEPT = "notice_accept";
NoticeBox.EVENT_NOTICE_REJECT = "notice_reject";

export default NoticeBox;
