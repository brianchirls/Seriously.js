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
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	/*
	Shader code:
	* Copyright vade - Anton Marini
	* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

	http://v002.info/?page_id=34

	*/

	Seriously.plugin('exposure', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',
				'varying vec4 vPosition;',

				'uniform sampler2D source;',

				'uniform float exposure;',

				'const float sqrtoftwo = 1.41421356237;',

				'void main (void)  {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	gl_FragColor = log2(vec4(pow(exposure + sqrtoftwo, 2.0))) * pixel;',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			exposure: {
				type: 'number',
				uniform: 'exposure',
				defaultValue: 0.6,
				min: 0,
				max: 1
			}
		},
		title: 'Exposure',
		categories: ['film'],
		description: 'Exposure control'
	});
}));
