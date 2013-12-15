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

	Seriously.plugin('color', {
		commonShader: true,
		shader: function(inputs, shaderSource, utilities) {
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform vec4 color;\n' +
				'\n' +
				'void main(void) {\n' +
				'	gl_FragColor = color;\n' +
				'}\n';
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
