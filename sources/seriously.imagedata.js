/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.source('imagedata', function (source) {
		if (source instanceof Object && source.data &&
			source.width && source.height &&
			source.width * source.height * 4 === source.data.length
			) {

			//Because of this bug, Firefox doesn't recognize ImageData, so we have to duck type
			//https://bugzilla.mozilla.org/show_bug.cgi?id=637077

			this.width = source.width;
			this.height = source.height;

			return {
				render: function (gl) {
					if (this.dirty) {
						gl.bindTexture(gl.TEXTURE_2D, this.texture);
						gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
						this.lastRenderTime = Date.now() / 1000;
						return true;
					}
				}
			};
		}
	}, {
		title: 'ImageData',
		description: '2D Canvas ImageData'
	});
}));