/**
 * Copyright (c) 2016-2018 RIKEN Center for Computational Science. All rights reserved.
 * Copyright (c) 2016-2018 Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * Copyright (c) 2017-2018 Tokyo University of Science. All rights reserved.
 */

import Command from '../../common/command'
import Store from './store';
import Action from '../action';
import MediaPlayer from '../../common/mediaplayer'
import WebRTC from '../../common/webrtc';

"use strict";

/**
 * random ID (8 chars)
 */
function generateID() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000000).toString(16).substring(1);
	}
	return s4() + s4();
}

function captureStream(video) {
	if (video.captureStream) {
		return video.captureStream();
	} else if (video.mozCaptureStream) {
		return video.mozCaptureStream();
	}
	return null;
}

class VideoStore {
	constructor(connector, state, store, action, cookie) {
        this.connector = connector;
        this.state = state;
        this.store = store;
		this.action = action;

		// WebRTC用キーから WebRTCインスタンスへのマップ
		this.webRTCDict = {};

		// id から video のバイナリデータへのマップ
		this.videoDict = {};

		// id から video エレメントへのマップ
		this.videoElemDict = {};

		// mp4boxで読み込んだsegmentsのキャッシュ
		this.segmentDict = {};

		this.initEvents();
	}

	initEvents() {
		for (let i in Action) {
			if (i.indexOf('EVENT') >= 0) {
				this.action.on(Action[i], ((method) => {
					return (err, data) => {
						if (this[method]) {
							this[method](data);
						}
					};
				})('_' + Action[i]));
			}
		}
	};

	release() {
		for (i in this.videoDict) {
			this.deleteVideoData(i);
		}
		for (i in this.videoElemDict) {
			this.deleteVideoElem(i);
		}
	}
    
	processMovieBlob(videoElem, blob, id) {
		//let fileSize   = file.size;
		let offset = 0;
		let readBlock = null;

		// segmentをキャッシュする用
		this.segmentDict[id] = {
			audio : [],
			video : [],
			videoIndex : 0,
			audioIndex : 0,
			playHandle : null
		};

		const DURATION = 1001;
		const TIMESCALE = 30000;
		const SAMPLE_SEC = DURATION / TIMESCALE;
		
		let mp4box = new MP4Box();
		let player = null;
		let chunkSize  = 1024 * 1024 * 1024; // bytes
		mp4box.onReady = (info) => {
			let videoCodec = 'video/mp4; codecs=\"' + info.tracks[0].codec +  '\"';
			let audioCodec = null;
			if (info.tracks.length > 1) {
				audioCodec = 'audio/mp4; codecs=\"' + info.tracks[1].codec +  '\"';
			} 
			// console.log("codec", videoCodec, audioCodec,
			//	MediaSource.isTypeSupported(videoCodec),
			//	MediaSource.isTypeSupported(audioCodec)
			//);
			if (!player) {
				player = new MediaPlayer(videoElem, videoCodec, audioCodec);
			}

			let playVideo = () => {
				this.segmentDict[id].playHandle = setInterval(() => {
					let videoSegs = this.segmentDict[id].video;
					let audioSegs = this.segmentDict[id].audio;
					if (videoSegs.length > 0) {
						player.onVideoFrame(videoSegs[this.segmentDict[id].videoIndex]);
						++this.segmentDict[id].videoIndex;
					}
					if (audioSegs.length > 0) {
						player.onAudioFrame(audioSegs[this.segmentDict[id].audioIndex]);
						++this.segmentDict[id].audioIndex;
					}
				}, SAMPLE_SEC);
			};
			let stopVideo = () => {
				clearInterval(this.segmentDict[id].playHandle);
			};

			let samplesInfo;
			player.on(MediaPlayer.EVENT_SOURCE_OPEN, () => {
				if (info.isFragmented) {
					console.info("duration fragment", info.fragment_duration/info.timescale)
					player.setDuration(info.fragment_duration/info.timescale);
				} else {
					console.info("duration", info.duration/info.timescale)
					player.setDuration(info.duration/info.timescale);
				}
				mp4box.setSegmentOptions(info.tracks[0].id, player.buffer, { nbSamples: 1000 } );
				mp4box.setSegmentOptions(info.tracks[1].id, player.audioBuffer, { nbSamples: 1000 } );

				samplesInfo = mp4box.getTrackSamplesInfo(info.tracks[0].id);

				let initSegs = mp4box.initializeSegmentation();
				this.segmentDict[id].video.push(initSegs[0].buffer);
				this.segmentDict[id].audio.push(initSegs[1].buffer);
				playVideo();
				mp4box.start();
			});
			player.on(MediaPlayer.EVENT_NEED_RELOAD, (err, time) => {
				stopVideo();
				const segmentIndex = time / SAMPLE_SEC;
				console.log("MediaPlayer.EVENT_NEED_RELOAD", time, segmentIndex, this.segmentDict[id].videoIndex, time / SAMPLE_SEC);
				this.segmentDict[id].videoIndex = segmentIndex;
				this.segmentDict[id].audioIndex = segmentIndex;
				playVideo();
			});
		}

		mp4box.onSegment = ((metaDataID) => {
			return (id, user, buffer, sampleNum, is_last) => {
				if (user === player.buffer) {
					this.segmentDict[metaDataID].video.push(buffer);
					// console.log("videoseg")
					//player.onVideoFrame(buffer);
				}
				if (user === player.audioBuffer) {
					this.segmentDict[metaDataID].audio.push(buffer);
					// console.log("audioseg")
					//player.onAudioFrame(buffer);
				}
			}
		})(id);

		let onparsedbuffer = function(mp4box, buffer) {
			//console.log("Appending buffer with offset "+offset);
			buffer.fileStart = 0;
			mp4box.appendBuffer(buffer);
		}
		
		onparsedbuffer(mp4box, blob); // callback for handling read chunk

		/*
		let onBlockRead = function(evt) {
			if (evt.target.error == null) {
				onparsedbuffer(mp4box, evt.target.result); // callback for handling read chunk
				offset += evt.target.result.byteLength;
				//progressbar.progressbar({ value: Math.ceil(100*offset/fileSize) });
			} else {
				// console.log("Read error: " + evt.target.error);
				//finalizeUI(false);
				return;
			}
			if (offset >= fileSize) {
				//progressbar.progressbar({ value: 100 });
				// console.log("Done reading file");
				mp4box.flush();
				videoElem.play();
				//finalizeUI(true);
				return;
			}
			readBlock(offset, chunkSize, file);
		}
		
		
		readBlock = function(_offset, length, _file) {
			let r = new FileReader();
			let blob = _file.slice(_offset, length + _offset);
			r.onload = onBlockRead;
			r.readAsArrayBuffer(blob);
		}
		readBlock(offset, chunkSize, file);
		*/
	}

	/**
	 * WebRTC接続開始
	 * @method connectWebRTC
	 */
	connectWebRTC(metaData, keyStr) {
		let video = this.getVideoElem(metaData.id);
		let webRTC;
		if (!this.webRTCDict.hasOwnProperty(keyStr)) {
			// 初回読み込み時
			let stream = captureStream(video);
			webRTC = new WebRTC();
			webRTC.setIsScreenSharing(metaData.subtype === "screen");
			this.webRTCDict[keyStr] = webRTC;
			if (!stream) {
				// for safari
				stream = video.srcObject;
			}
			webRTC.addStream(stream);
			video.ontimeupdate = () => {
				let meta = this.store.getMetaData(metaData.id);
				if (meta && meta.isEnded === 'true') {
					for (let i in this.webRTCDict) {
						if (i.indexOf(meta.id) >= 0) {
							this.webRTCDict[i].removeStream();
							this.webRTCDict[i].addStream(captureStream(video));
						}
					}
					meta.isEnded = false;
					this.store.operation.updateMetadata(meta);
				}
			};
			webRTC.on(WebRTC.EVENT_ICECANDIDATE, (type, data) => {
				if (type === "tincle") {
					metaData.from = "controller";
					this.connector.sendBinary(Command.RTCIceCandidate, metaData, JSON.stringify({
						key: keyStr,
						candidate: data
					}), function (err, reply) { });
					delete metaData.from;
				}
			});
			webRTC.on(WebRTC.EVENT_NEGOTIATION_NEEDED, () => {
				let webRTC = this.webRTCDict[keyStr];
				webRTC.offer((sdp) => {
					this.connector.sendBinary(Command.RTCOffer, metaData, JSON.stringify({
						key: keyStr,
						sdp: sdp
					}), function (err, reply) { });
                });
                this._changeCameraMicEnable({
                    id : metaData.id,
                    isMicOn : metaData.is_audio_on,
                    isCameraOn : metaData.is_video_on
                })
			});
			webRTC.on(WebRTC.EVENT_CLOSED, () => {
				delete this.webRTCDict[keyStr];
			});
			webRTC.on(WebRTC.EVENT_NEED_RESTART, () => {
				let webRTC = this.webRTCDict[keyStr];
				webRTC.removeStream();
				webRTC.addStream(stream);
				webRTC.offer((sdp) => {
					this.connector.sendBinary(Command.RTCOffer, metaData, JSON.stringify({
						key: keyStr,
						sdp: sdp
					}), function (err, reply) { });
				});
			});
			webRTC.on(WebRTC.EVENT_CONNECTED, () => {
				setTimeout(() => {
					let webRTC = this.webRTCDict[keyStr];

					webRTC.getStatus((status) => {
						let meta = this.store.getMetaData(metaData.id);
						meta.webrtc_status = JSON.stringify({
							bandwidth: {
								availableSendBandwidth: status.bandwidth.availableSendBandwidth,
								actualEncBitrate: status.bandwidth.googActualEncBitrate,
								targetEncBitrate: status.bandwidth.googTargetEncBitrate,
								transmitBitrate: status.bandwidth.googTransmitBitrate,
							},
							resolution: status.resolutions.send,
							video_codec: status.video.send.codecs[0],
							audio_codec: status.video.send.codecs[0]
						});
						this.store.operation.updateMetadata(meta);
					});
				}, 5000);
			});

			let currentPos = 0;
			let maxBytes = 65535;
			let updateLoop = () => {
				//console.error("updateLoop", videoSegments.length, currentPos)
				setTimeout(() => {
					let webRTC = this.webRTCDict[keyStr];
					if (this.segmentDict.hasOwnProperty(metaData.id)) {
						let videoSegments = this.segmentDict[metaData.id];
						try {
							if (currentPos === videoSegments.length)
								return;

							for (let maxPos = currentPos + 10; currentPos < maxPos && currentPos < videoSegments.length; ++currentPos) {
								if (videoSegments[currentPos].byteLength >= maxBytes) {
									let pos = 0;
									while (true) {
										if ((pos + maxBytes) > videoSegments[currentPos].byteLength) {
											//console.error("slice", pos)
											let data = videoSegments[currentPos].slice(pos);
											webRTC.datachannel.send(data);
										}
										else {
											//console.error("slice", pos, pos + maxBytes)
											webRTC.datachannel.send(videoSegments[currentPos].slice(pos, pos + maxBytes));
										}
										pos += maxBytes;
										if (pos > videoSegments[currentPos].byteLength) {
											break;
										}
									}
								}
								else {
									//console.error(videoSegments[currentPos].byteLength)
									webRTC.datachannel.send(videoSegments[currentPos]);
								}
							}
						}
						catch (e) {
							console.error(e);
							webRTC.emit(WebRTC.EVENT_NEED_RESTART, null);
							return;
						}
					}
					updateLoop();
				}, 500);
			};
			if (metaData.use_datachannel) {
				webRTC.on(WebRTC.EVENT_DATACHANNEL_OPEN, function () {
					updateLoop();
				});
			}
		}
		else {
			webRTC = this.webRTCDict[keyStr];
		}
		webRTC.offer((sdp) => {
			this.connector.sendBinary(Command.RTCOffer, metaData, JSON.stringify({
				key: keyStr,
				sdp: sdp
			}), function (err, reply) { });
		});
    }
    
    /**
     * 動画ファイルの入力
     * @param {*} data 
     */
    _inputVideoFile(data) {
        let metaData = data.metaData;
        let blob = data.contentData;
        let type = "file";

		// 動画は実体は送らずメタデータのみ送る
		// データとしてSDPを送る
		// 追加後のメタデータとローカルで保持しているコンテンツデータを紐づけるため
		// IDはクライアントで作成する
		if (metaData.hasOwnProperty("id") && this.store.hasMetadata(metaData.id)) {
			metaData = this.store.getMetaData(metaData.id);
		}
		else {
			metaData.id = generateID();
		}
		let video;
		if (this.hasVideoElem(metaData.id)) {
			video = this.getVideoElem(metaData.id);
		}
		else {
			video = document.createElement('video');
			this.setVideoElem(metaData.id, video);
			// カメラ,スクリーン共有は追加したコントローラではmuteにする
			if (type === "camera" || type === "screen") {
				video.muted = true;
			}
		}
		let videoData;
		if (type === "file") {
			metaData.use_datachannel = true;
			this.processMovieBlob(video, blob, metaData.id);
			/*
			videoData = URL.createObjectURL(blob);
			video.src = videoData;
			video.load();
			*/
		}
		this.setVideoData(metaData.id, videoData);
		/*
		video.oncanplaythrough = function () {
			if (type !== "file") {
				window.setTimeout(function(){
					this.play()
				}.bind(this), 1000); // for chrome
			}
		};

		video.onplay = function () {
			if (type !== 'file') { return; }
			metaData = store.getMetaData(metaData.id);
			metaData.isPlaying = true;
			this.update_metadata(metaData);
		}.bind(this);

		video.onpause = function () {
			if (type !== 'file') { return; }
			metaData = store.getMetaData(metaData.id);
			metaData.isPlaying = false;
			this.update_metadata(metaData);
		}.bind(this);

		video.onended = function () {
			if (type !== 'file') { return; }

			metaData = store.getMetaData(metaData.id);
			metaData.isPlaying = false;
			metaData.isEnded = true;
			this.update_metadata(metaData);
		}.bind(this);
		*/
		video.onloadedmetadata = (e) => {
			metaData.type = "video";
			metaData.subtype = type;
			if (!metaData.hasOwnProperty("width")) {
				metaData.width = Number(video.videoWidth);
			}
			if (!metaData.hasOwnProperty("height")) {
				metaData.height = Number(video.videoHeight);
			}
			metaData.group = this.store.getGroupStore().getCurrentGroupID();
		};
		video.onloadeddata = () => {
			let data;
			if (!metaData.hasOwnProperty('is_video_on') ||
				metaData.hasOwnProperty('is_video_on') && String(metaData.is_video_on) !== "false") {
				// サムネイル生成
				let canvas = document.createElement('canvas');
				let context = canvas.getContext("2d");
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				context.drawImage(video, 0, 0);
				data = canvas.toDataURL("image/jpeg");
			}
			else {
				data = this.getElem(metaData.id, true).src;
			}
			this.store.getContentStore().addContent(metaData, data, (err, reply) => {
			});
		};
    }

    /**
     * 動画ストリームを入力
     * @param {*} data 
     */
    _inputVideoStream(data) {
        let metaData = data.metaData;
        let blob = data.contentData;
        let type = "stream";

		// 動画は実体は送らずメタデータのみ送る
		// データとしてSDPを送る
		// 追加後のメタデータとローカルで保持しているコンテンツデータを紐づけるため
		// IDはクライアントで作成する
		if (metaData.hasOwnProperty("id") && this.store.hasMetadata(metaData.id)) {
			metaData = this.store.getMetaData(metaData.id);
		} else {
			metaData.id = generateID();
		}
		let video;
		if (this.hasVideoElem(metaData.id)) {
			video = this.getVideoElem(metaData.id);
		} else {
			video = document.createElement('video');
			this.setVideoElem(metaData.id, video);
			// カメラ,スクリーン共有は追加したコントローラではmuteにする
			if (type === "camera" || type === "screen") {
				video.muted = true;
			}
		}
		let videoData;
        // stream
        if ('srcObject' in video) {
            videoData = blob;
            video.srcObject = blob;
        }
        else {
            videoData = URL.createObjectURL(blob);
            video.src = videoData;
        }
        video.load();
        video.play();

        this.setVideoData(metaData.id, videoData);
        
		video.onloadedmetadata = (e) => {
			metaData.type = "video";
			metaData.subtype = type;
			if (!metaData.hasOwnProperty("width")) {
				metaData.width = Number(video.videoWidth);
			}
			if (!metaData.hasOwnProperty("height")) {
				metaData.height = Number(video.videoHeight);
			}
			metaData.group = this.store.getGroupStore().getCurrentGroupID();
		};
		video.onloadeddata = () => {
			let data;
			if (!metaData.hasOwnProperty('is_video_on') ||
				metaData.hasOwnProperty('is_video_on') && String(metaData.is_video_on) !== "false") {
				// サムネイル生成
				let canvas = document.createElement('canvas');
				let context = canvas.getContext("2d");
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				context.drawImage(video, 0, 0);
				data = canvas.toDataURL("image/jpeg");
			}
			else {
				data = this.getElem(metaData.id, true).src;
			}
			this.store.getContentStore().addContent(metaData, data, (err, reply) => {});
		};
    }
    
	// TODO
	restartCamera(metadataID) {
		let isCameraOn = content_list.isCameraOn(metadataID);
		let isMicOn = content_list.isMicOn(metadataID);
		let audioDeviceID = gui.getContentPropertyGUI().get_audio_device_id();
		let videoDeviceID = gui.getContentPropertyGUI().get_video_device_id();
		let constraints = {};
		let saveDeviceID = {
			video_device : videoDeviceID,
			audio_device : audioDeviceID
		}
		if (videoDeviceID) {
			constraints.video = { deviceId : videoDeviceID }
		} else {
			constraints.video = true;
			saveDeviceID.video_device = true;
		}
		if (audioDeviceID) {
			constraints.audio = { deviceId : audioDeviceID }
		} else {
			constraints.audio = true;
			saveDeviceID.audio_device = true;
		}
		
		if (!constraints.video && !constraints.audio) {
			// どちらか有効にしないといけない
			constraints.audio = true;
			saveDeviceID.audio_device = audioDeviceID;
		}

		navigator.mediaDevices.getUserMedia(constraints).then(
			((saveDeviceID) => {
				return (stream) => {
					if (store.hasMetadata(metadataID)) {
						// カメラマイク有効情報を保存
						let meta = this.store.getMetaData(metadataID)
						meta.video_device = saveDeviceID.video_device,
						meta.audio_device = saveDeviceID.audio_device,
						meta.is_video_on = isCameraOn,
						meta.is_audio_on = isMicOn,
						store.setMetaData(metadataID, meta)
					}
					// TODO
					controller.send_movie("camera", stream, {
						id : metadataID,
						group: this.store.getGroupStore().getCurrentGroupID(),
						posx: Vscreen.getWhole().x, posy: Vscreen.getWhole().y, visible: true
					}, function () {
					});
				};
			})(saveDeviceID),
			function (err) {
				console.error('Could not get stream: ', err);
			});
	}


    /**
     * 動画デバイスの変更
     * @param {*} data 
     * {
	 *    id : metaData.id,
	 *    deviceID : deviceID
     * }
     */
    _changeVideoDevice(data) {
        let metadataID = data.id;
        let deviceID = data.deviceID;
        if (this.hasVideoElem(metadataID)) {
            this.restartCamera(metadataID);
        }
    }

    /**
     * 音声デバイスの変更
     */
    _changeAudioDevice(data) {
        let metadataID = data.id;
        let deviceID = data.deviceID;
		if (this.hasVideoElem(metadataID)) {
			this.restartCamera(metadataID);
		}
    }

    /**
     * 動画クオリティの変更
     */
    _changeVideoQuality(data) {
        let metadataID = data.id;
        let deviceID = data.deviceID;
		if (this.hasVideoElem(metadataID)) {
			let quality = {
				video_quality_enable : gui.getContentPropertyGUI().is_video_quality_enable(),
				audio_quality_enable : gui.getContentPropertyGUI().is_audio_quality_enable(),
				screen : gui.getContentPropertyGUI().get_video_quality(metadataID).min,
				video : gui.getContentPropertyGUI().get_video_quality(metadataID).min,
				audio : gui.getContentPropertyGUI().get_audio_quality(metadataID).min,
				video_max : gui.getContentPropertyGUI().get_video_quality(metadataID).max,
				audio_max : gui.getContentPropertyGUI().get_audio_quality(metadataID).max
			};
			if (quality.video_max < quality.video) {
				quality.video_max = quality.video;
			}
			if (quality.audio_max < quality.audio) {
				quality.audio_max = quality.audio;
			}
			if (!quality.video_quality_enable) {
				delete quality["screen"];
				delete quality["video"];
				delete quality["video_max"];
			}
			if (!quality.audio_quality_enable) {
				delete quality["audio"];
				delete quality["audio_max"];
			}
			if (Object.keys(quality).length === 0) {
				quality = null;
			}
			if (this.store.hasMetadata(metadataID)) {
				let meta = this.store.getMetaData(metadataID);
				meta.quality = JSON.stringify(quality);
				controller.update_metadata(meta);
			}
		}
    }

    /**
     * 動画コンテンツのカメラ、マイクの有効無効を設定
     */
    _changeCameraMicEnable(data) {
        let metadataID = data.id;
        let isCameraOn = data.isCameraOn;
        let isMicOn = data.isMicOn;
		for (let i in this.webRTCDict) {
			if (i.indexOf(metadataID) >= 0) {
				let streams = this.webRTCDict[i].peer.getLocalStreams();
				for (let k = 0; k < streams.length; ++k) {
					let videos = streams[k].getVideoTracks();
					for (let n = 0; n < videos.length; ++n) {
						videos[n].enabled = String(isCameraOn) !== "false";
					}
					let audios = streams[k].getAudioTracks();
					for (let n = 0; n < audios.length; ++n) {
						audios[n].enabled = String(isMicOn) !== "false";
					}
				}
			}
        }
	}
	
	getWebRTCDict() {
		return this.webRTCDict;
	}

	// video data
	setVideoData(id, data) {
		if (this.hasVideoData(id)) {
			this.deleteVideoData(id);
		}
		this.videoDict[id] = data;
	}
	getVideoData(id, data) {
		return this.videoDict[id];
	}

	hasVideoData(id) {
		return this.videoDict.hasOwnProperty(id);
	}
	deleteVideoData(id) {
		let videoData = this.videoDict[id];
		if (videoData && videoData.getVideoTracks) {
			videoData.getVideoTracks().forEach(function (track) {
				track.stop();
			});
		}
		if (videoData && videoData.getAudioTracks) {
			videoData.getAudioTracks().forEach(function (track) {
				track.stop();
			});
		}
		delete this.videoDict[id];
	}

	// video elem
	setVideoElem(id, elem) {
		this.videoElemDict[id] = elem;
	}
	getVideoElem(id, elem) {
		return this.videoElemDict[id];
	}
	hasVideoElem(id) {
		return this.videoElemDict.hasOwnProperty(id);
	}
	deleteVideoElem(id) {
		let elem = this.videoElemDict[id];
		elem.pause();
		elem.srcObject = null;
		if (elem.src) {
			URL.revokeObjectURL(elem.src);
		}
		elem.src = "";
		delete this.videoElemDict[id];
	}
}

export default VideoStore;