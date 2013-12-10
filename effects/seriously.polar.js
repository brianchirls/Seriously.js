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

	Seriously.plugin('polar', {
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
				'uniform float angle;\n' +
				'const float PI = ' + Math.PI + ';\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec2 norm = (1.0 - vTexCoord) * 2.0 - 1.0;\n' +
				'	float theta = mod(PI + atan(norm.x, norm.y) - angle * (PI / 180.0), PI * 2.0);\n' +
				'	vec2 polar = vec2(theta / (2.0 * PI), length(norm));\n' +
				'	gl_FragColor = texture2D(source, polar);\n' +
				'}\n';
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			angle: {
				type: 'number',
				uniform: 'angle',
				defaultValue: 0
			}
		},
		title: 'Polar Coordinates',
		description: 'Convert cartesian to polar coordinates'
	});
}));
