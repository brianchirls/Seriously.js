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

	Seriously.plugin('vignette', {
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
					'\n' +
					'void main(void) {\n' +
					'	vec4 pixel = texture2D(source, vTexCoord);\n' +
					'	vec2 pos = vTexCoord.xy - 0.5;\n' +
					'	float vignette = 1.0 - (dot(pos, pos) * amount);\n' +
					'	gl_FragColor = vec4(pixel.rgb * vignette, pixel.a);\n' +
					'}\n';
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 1,
				min: 0
			}
		},
		title: 'Vignette',
		description: 'Vignette'
	});
}));
