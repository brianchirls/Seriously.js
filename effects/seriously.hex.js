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

	Shader adapted from glfx.js by Evan Wallace
	License: https://github.com/evanw/glfx.js/blob/master/LICENSE
	*/

	Seriously.plugin('hex', {
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
				'uniform vec2 resolution;\n' +
				'uniform vec2 center;\n' +
				'uniform float size;\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec2 aspect = normalize(resolution);\n' +
				'	vec2 tex = (vTexCoord * aspect - center) / size;\n' +
				'	tex.y /= 0.866025404;\n' +
				'	tex.x -= tex.y * 0.5;\n' +
				'	vec2 a;\n' +
				'	if (tex.x + tex.y - floor(tex.x) - floor(tex.y) < 1.0) {\n' +
				'		a = vec2(floor(tex.x), floor(tex.y));\n' +
				'	} else {\n' +
				'		a = vec2(ceil(tex.x), ceil(tex.y));\n' +
				'	}\n' +
				'	vec2 b = vec2(ceil(tex.x), floor(tex.y));\n' +
				'	vec2 c = vec2(floor(tex.x), ceil(tex.y));\n' +
				'	vec3 tex3 = vec3(tex.x, tex.y, 1.0 - tex.x - tex.y);\n' +
				'	vec3 a3 = vec3(a.x, a.y, 1.0 - a.x - a.y);\n' +
				'	vec3 b3 = vec3(b.x, b.y, 1.0 - b.x - b.y);\n' +
				'	vec3 c3 = vec3(c.x, c.y, 1.0 - c.x - c.y);\n' +
				'	float alen =length(tex3 - a3);\n' +
				'	float blen =length(tex3 - b3);\n' +
				'	float clen =length(tex3 - c3);\n' +
				'	vec2 choice;\n' +
				'	if (alen < blen) {\n' +
				'		if (alen < clen) {\n' +
				'			choice = a;\n' +
				'		} else {\n' +
				'			choice = c;\n' +
				'		}\n' +
				'	} else {\n' +
				'		if (blen < clen) {\n' +
				'			choice = b;\n' +
				'		} else {\n' +
				'			choice = c;\n' +
				'		}\n' +
				'	}\n' +
				'	choice.x += choice.y * 0.5;\n' +
				'	choice.y *= 0.866025404;\n' +
				'	choice *= size / aspect;\n' +
				'	gl_FragColor = texture2D(source, choice + center / aspect);\n' +
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
			size: {
				type: 'number',
				uniform: 'size',
				min: 0,
				max: 0.4,
				defaultValue: 0.01
			},
			center: {
				type: 'vector',
				uniform: 'center',
				dimensions: 2,
				defaultValue: [0, 0]
			}
		},
		title: 'Hex',
		description: 'Hexagonal Pixelate'
	});
}));
