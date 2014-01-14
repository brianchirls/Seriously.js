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

	var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

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
			me.width = video.videoWidth;
			me.height = video.videoHeight;
			me.setReady();
		}

		//todo: support options for video resolution, etc.

		if (force) {
			if (!getUserMedia) {
				throw 'Camera source type unavailable. Browser does not support getUserMedia';
			}

			video = document.createElement('video');

			getUserMedia.call(navigator, {
				video: true
			}, function (s) {
				stream = s;

				if (destroyed) {
					cleanUp();
					return;
				}

				if (window.webkitURL) {
					video.src = window.webkitURL.createObjectURL(stream);
				} else {
					video.src = stream;
				}

				if (video.readyState >= 1) {
					initialize();
				} else {
					video.addEventListener('loadedmetadata', function () {
						if (!destroyed) {
							initialize();
						}
					}, false);
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