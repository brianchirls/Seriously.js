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
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('emboss', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float amount;',

				'uniform vec2 dim;',

				//'const vec4 weight = vec4(2.0, 2.0, 2.0, 0.5);',
				'const vec3 average = vec3(1.0 / 3.0);',

				'void main (void)  {',
				'	vec2 offset = 1.0 / dim;',
				'	vec4 pixel = vec4(0.5, 0.5, 0.5, 1.0);',
				'	pixel -= texture2D(source, vTexCoord - offset) * amount;',
				'	pixel += texture2D(source, vTexCoord + offset) * amount;',
				'	float val = dot(pixel.rgb, average);',
				'	pixel.rgb = vec3(val);',
				'	gl_FragColor = pixel;',
				'}'
			].join('\n');
			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			if (!uniforms.dim) {
				uniforms.dim = [];
			}
			uniforms.dim[0] = this.width;
			uniforms.dim[1] = this.height;
			parent(shader, model, uniforms, frameBuffer);
		},
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 1
			}
		},
		title: 'Emboss',
		categories: [],
		description: 'Emboss'
	});
}));
