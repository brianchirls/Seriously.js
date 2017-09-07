import Seriously from '../seriously';
import {isInstance} from '../utilities/dom';

const document = window.document;

let noVideoTextureSupport;

Seriously.source('video', function (video, options, force) {
	const me = this;

	let canvas,
		ctx2d,
		destroyed = false,
		deferTexture = false,
		isSeeking = false,
		lastRenderTime = 0;

	function initializeVideo() {
		video.removeEventListener('loadedmetadata', initializeVideo, true);

		if (destroyed) {
			return;
		}

		if (video.videoWidth) {
			if (me.width !== video.videoWidth || me.height !== video.videoHeight) {
				me.width = video.videoWidth;
				me.height = video.videoHeight;
				me.resize();
			}

			if (deferTexture) {
				me.setReady();
			}
		} else {
			//Workaround for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=926753
			deferTexture = true;
			window.setTimeout(initializeVideo, 50);
		}
	}

	function seeking() {
		// IE doesn't report .seeking properly so make our own
		isSeeking = true;
	}

	function seeked() {
		isSeeking = false;
		me.setDirty();
	}

	if (isInstance(video, 'HTMLVideoElement')) {
		if (video.readyState) {
			initializeVideo();
		} else {
			deferTexture = true;
			video.addEventListener('loadedmetadata', initializeVideo, true);
		}

		video.addEventListener('seeking', seeking, false);
		video.addEventListener('seeked', seeked, false);

		return {
			deferTexture: deferTexture,
			source: video,
			render: function renderVideo(gl) {
				let source,
					error;

				lastRenderTime = video.currentTime;

				if (!video.videoHeight || !video.videoWidth) {
					return false;
				}

				if (noVideoTextureSupport) {
					if (!ctx2d) {
						ctx2d = document.createElement('canvas').getContext('2d');
						canvas = ctx2d.canvas;
						canvas.width = me.width;
						canvas.height = me.height;
					}
					source = canvas;
					ctx2d.drawImage(video, 0, 0, me.width, me.height);
				} else {
					source = video;
				}

				gl.bindTexture(gl.TEXTURE_2D, me.texture);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, me.flip);
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
				try {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

					//workaround for lack of video texture support in IE
					if (noVideoTextureSupport === undefined) {
						error = gl.getError();
						if (error === gl.INVALID_VALUE) {
							noVideoTextureSupport = true;
							return renderVideo(gl);
						}
						noVideoTextureSupport = false;
					}
					return true;
				} catch (securityError) {
					if (securityError.code === window.DOMException.SECURITY_ERR) {
						me.allowRefresh = false;
						Seriously.logger.error('Unable to access cross-domain image');
					} else {
						Seriously.logger.error('Error rendering video source', securityError);
					}
				}
				return false;
			},
			checkDirty: function () {
				return !isSeeking && video.currentTime !== lastRenderTime;
			},
			compare: function (source) {
				return me.source === source;
			},
			destroy: function () {
				destroyed = true;
				video.removeEventListener('seeking', seeking, false);
				video.removeEventListener('seeked', seeked, false);
				video.removeEventListener('loadedmetadata', initializeVideo, true);
			}
		};
	}
}, {
	title: 'Video'
});
