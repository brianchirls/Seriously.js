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

	Seriously.plugin('scanlines', {
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
					'uniform float lines;\n' +
					'uniform float width;\n' +
					'uniform float intensity;\n' +
					//todo: add vertical offset for animating
					'\n' +
					'void main(void) {\n' +
					'	vec4 pixel = texture2D(source, vTexCoord);\n' +
					'	float darken = 2.0 * abs( fract(vPosition.y * lines / 2.0) - 0.5);\n' +
					'	darken = clamp(darken - width + 0.5, 0.0, 1.0);\n' +
					'	darken = 1.0 - ((1.0 - darken) * intensity);\n' +
					'	gl_FragColor = vec4(pixel.rgb * darken, 1.0);\n' +
					'}\n';
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			lines: {
				type: 'number',
				uniform: 'lines',
				defaultValue: 60
			},
			size: {
				type: 'number',
				uniform: 'size',
				defaultValue: 0.2,
				min: 0,
				max: 1
			},
			intensity: {
				type: 'number',
				uniform: 'intensity',
				defaultValue: 0.1,
				min: 0,
				max: 1
			}
		},
		title: 'Scan Lines',
		description: ''
	});
}));
