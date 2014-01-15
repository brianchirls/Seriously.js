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

	Seriously.plugin('highlights-shadows', {
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
				'uniform float shadows;\n' +
				'uniform float highlights;\n' +
				'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec4 pixel = texture2D(source, vTexCoord);\n' +
				'	float luminance = dot(pixel.rgb, luma);\n' +
				'	float shadow = clamp((pow(luminance, 1.0 / (shadows + 1.0)) + (-0.76) * pow(luminance, 2.0 / (shadows + 1.0))) - luminance, 0.0, 1.0);\n' +
				'	float highlight = clamp((1.0 - (pow(1.0 - luminance, 1.0 / (2.0 - highlights)) + (-0.8) * pow(1.0 - luminance, 2.0 / (2.0 - highlights)))) - luminance, -1.0, 0.0);\n' +
				'	vec3 rgb = (luminance + shadow + highlight) * (pixel.rgb / vec3(luminance));\n' +
				//'	vec3 rgb = vec3(0.0, 0.0, 0.0) + ((luminance + shadow + highlight) - 0.0) * ((pixel.rgb - vec3(0.0, 0.0, 0.0))/(luminance - 0.0));\n' +
				'	gl_FragColor = vec4(rgb, pixel.a);\n' +
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
			highlights: {
				type: 'number',
				uniform: 'highlights',
				min: 0,
				max: 1,
				defaultValue: 1
			},
			shadows: {
				type: 'number',
				uniform: 'shadows',
				min: 0,
				max: 1,
				defaultValue: 0
			}
		},
		title: 'Highlights/Shadows',
		description: 'Darken highlights, lighten shadows'
	});
}));
