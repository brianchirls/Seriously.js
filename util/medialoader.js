/* global define */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	} else {
		root.MediaLoader = factory();
	}
}(this, function () {
	'use strict';

	var typeRegex = /^[a-z\-]+/i,
		typeElements = {
			video: 'video',
			audio: 'audio',
			image: 'img'
		};

	function MediaLoader(callback, options) {
		var target,
			input,
			format,
			types;

		function dragover(evt) {
			evt.preventDefault();
			return false;
		}

		function upload(file) {
			var reader,
				element,
				type;

			// reject unacceptable file types
			if (types && types.indexOf(file.type) < 0) {
				if (options.error) {
					options.error(file.type);
				}
				return;
			}

			type = typeRegex.exec(file.type);
			type = type && type[0];
			if (format === 'file') {
				callback(file);
			} else if (format === 'contents' || !typeElements[type]) {
				reader = new FileReader();
				reader.onload = function () {
					callback(reader.result, file);
				};
				reader.readAsArrayBuffer(file);
			} else {
				// format === 'element'
				element = document.createElement(typeElements[type]);
				element.src = URL.createObjectURL(file);
				callback(element, file);
			}
		}

		function drop(evt) {
			evt.preventDefault();
			if (evt.dataTransfer.files.length) {
				upload(evt.dataTransfer.files[0]);
			}
			return false;
		}

		function fileInput(evt) {
			if (evt.target.files.length) {
				upload(evt.target.files[0]);
			}
		}

		if (typeof callback === 'object') {
			options = callback;
			callback = options.callback;
		}

		if (!callback) {
			throw new Error('MediaLoader does not work without a callback function');
		}

		if (!options) {
			options = {};
		}

		types = options.types || [
			'video/webm',
			'video/mp4',
			'video/ogg',
			'audio/ogg',
			'audio/mp3',
			'image/jpeg',
			'image/png'
		];

		format = options.format;

		if (!options.target) {
			target = document.body;
		} else if (typeof target === 'string') {
			target = document.querySelector(options.target);
		} else {
			target = options.target;
		}

		if (target) {
			target.addEventListener('dragover', dragover, false);
			target.addEventListener('drop', drop, true);
		}

		input = options.input;
		if (input && typeof input === 'string') {
			input = document.querySelector(input);
		}
		if (input) {
			input.addEventListener('change', fileInput, false);
		}

		this.destroy = function () {
			if (target) {
				target.removeEventListener('dragover', dragover, false);
				target.removeEventListener('drop', drop, true);
			}

			if (input) {
				input.removeEventListener('change', fileInput, false);
			}
		};
	}

	return MediaLoader;
}));
