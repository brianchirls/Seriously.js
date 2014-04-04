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

	Seriously.plugin('falsecolor', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',
				'varying vec4 vPosition;',

				'uniform sampler2D source;',
				'uniform float amount;',
				'uniform vec4 dark;',
				'uniform vec4 light;',

				'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	float luminance = dot(pixel.rgb, luma);',
				'	gl_FragColor = vec4( mix(dark.rgb, light.rgb, luminance), pixel.a);',
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
