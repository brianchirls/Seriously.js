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

	Seriously.plugin('color', {
		commonShader: true,
		shader: function(inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;\n',

				'varying vec2 vTexCoord;',

				'uniform vec4 color;',

				'void main(void) {',
				'	gl_FragColor = color;',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			color: {
				type: 'color',
				uniform: 'color',
				defaultValue: [0, 0, 0, 1]
			}
		},
		title: 'Color',
		description: 'Generate color',
		categories: ['generator']
	});
}));
