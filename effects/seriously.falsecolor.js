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

	Seriously.plugin('falsecolor', {
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
				'uniform float amount;\n' +
				'uniform vec4 dark;\n' +
				'uniform vec4 light;\n' +
				'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec4 pixel = texture2D(source, vTexCoord);\n' +
				'	float luminance = dot(pixel.rgb, luma);\n' +
				'	gl_FragColor = vec4( mix(dark.rgb, light.rgb, luminance), pixel.a);\n' +
				'}\n';
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			dark: {
				type: 'color',
				uniform: 'dark',
				defaultValue: [0, 0, 0.5, 1]
			},
			light: {
				type: 'color',
				uniform: 'light',
				defaultValue: [1, 0, 0, 1]
			}
		},
		title: 'False Color'
	});
}));
