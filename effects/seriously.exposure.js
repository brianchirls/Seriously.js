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
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'\n' +
				'uniform float exposure;\n' +
				'\n' +
				'//constant variables.\n' +
				'const float sqrtoftwo = 1.41421356237;\n' +
				'\n' +
				'\n' +
				'void main (void)  {\n' +
				'	vec4 pixel = texture2D(source, vTexCoord);\n' +
				'	gl_FragColor = log2(vec4(pow(exposure + sqrtoftwo, 2.0))) * pixel;\n' +
				'\n' +
				'} \n';
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
