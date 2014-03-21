/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia,

	// detect browser-prefixed window.URL
	URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

	Seriously.source('camera', function (source, options, force) {
		var me = this,
			video,
			destroyed = false,
			stream;

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

			video = document.createElement('video');

			var opts = {video:true};
			if(typeof source == 'object'){
				opts = source;
			}
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
				render: Object.getPrototypeOf(this).renderVideo,
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
}));
