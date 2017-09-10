import Seriously from '../seriously';

var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia,

	// detect browser-prefixed window.URL
	URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

Seriously.source('camera', function (source, options, force) {
	var me = this,
		video,
		key,
		opts,
		destroyed = false,
		stream,

		lastRenderTime = 0;

	function cleanUp() {
		if (video) {
			video.pause();
			video.src = '';
			video.load();
		}

		if (stream && stream.stop) {
			stream.stop();
		}
		stream = null;
	}

	function initialize() {
		if (destroyed) {
			return;
		}

		if (video.videoWidth) {
			me.width = video.videoWidth;
			me.height = video.videoHeight;
			me.setReady();
		} else {
			//Workaround for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=926753
			setTimeout(initialize, 50);
		}
	}

	//todo: support options for video resolution, etc.

	if (force) {
		if (!getUserMedia) {
			throw 'Camera source type unavailable. Browser does not support getUserMedia';
		}

		opts = {};
		if (source && typeof source === 'object') {
			//copy over constraints
			for (key in source) {
				if (source.hasOwnProperty(key)) {
					opts[key] = source[key];
				}
			}
		}
		if (!opts.video) {
			opts.video = true;
		}

		video = document.createElement('video');

		getUserMedia.call(navigator, opts, function (s) {
			stream = s;

			if (destroyed) {
				cleanUp();
				return;
			}

			// check for firefox
			if (video.mozCaptureStream) {
				video.mozSrcObject = stream;
			} else {
				video.src = (URL && URL.createObjectURL(stream)) || stream;
			}

			if (video.readyState) {
				initialize();
			} else {
				video.addEventListener('loadedmetadata', initialize, false);
			}

			video.play();
		}, function (evt) {
			//todo: emit error event
			console.log('Unable to access video camera', evt);
		});

		return {
			deferTexture: true,
			source: video,
			render: function (gl) {
				lastRenderTime = video.currentTime;

				gl.bindTexture(gl.TEXTURE_2D, this.texture);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
				try {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
					return true;
				} catch (error) {
					Seriously.logger.error('Error rendering camera video source', error);
				}

				return false;
			},
			checkDirty: function () {
				return video.currentTime !== lastRenderTime;
			},
			destroy: function () {
				destroyed = true;
				cleanUp();
			}
		};
	}
}, {
	compatible: function () {
		return !!getUserMedia;
	},
	title: 'Camera'
});
