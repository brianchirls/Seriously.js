(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(root.require('seriously'));
	} else if (typeof root.define === 'function' && root.define.amd) {
		// AMD. Register as an anonymous module.
		root.define(['seriously'], factory);
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	Seriously.plugin('split', function () {
		var baseShader;
		return {
			initialize: function (parent) {
				parent();
			},
			shader: function (inputs, shaderSource) {
				baseShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, shaderSource.fragment);

				shaderSource.vertex = '#ifdef GL_ES\n' +
					'precision mediump float;\n' +
					'#endif \n' +
					'\n' +
					'attribute vec4 position;\n' +
					'attribute vec2 texCoord;\n' +
					'\n' +
					'uniform vec3 srsSize;\n' +
					'uniform mat4 projection;\n' +
					'uniform mat4 transform;\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'varying vec4 vPosition;\n' +
					'\n' +
					'uniform float angle;\n' +
					'varying float c;\n' +
					'varying float s;\n' +
					'varying float t;\n' +
					'\n' +
					'void main(void) {\n' +
					'   c = cos(angle);\n' +
					'   s = sin(angle);\n' +
					'	t = abs(c + s);\n' +
					'\n' +
					'	vec4 pos = position * vec4(srsSize.x / srsSize.y, 1.0, 1.0, 1.0);\n' +
					'	gl_Position = transform * pos;\n' +
					'	gl_Position.z -= srsSize.z;\n' +
					'	gl_Position = projection * gl_Position;\n' +
					'	gl_Position.z = 0.0;\n' + //prevent near clipping
					'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
					'}\n';
				shaderSource.fragment = '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'varying vec4 vPosition;\n' +
					'\n' +
					'varying float c;\n' +
					'varying float s;\n' +
					'varying float t;\n' +
					'\n' +
					'uniform sampler2D sourceA;\n' +
					'uniform sampler2D sourceB;\n' +
					'uniform float split;\n' +
					'uniform float angle;\n' +
					'uniform float fuzzy;\n' +
					'\n' +
					'void main(void) {\n' +
					'	float mn = (split - fuzzy * (1.0 - split));\n' +
					'	float mx = (split + fuzzy * split);;\n' +
					'	vec2 coords = vTexCoord - vec2(0.5);\n' +
					'	coords = vec2(coords.x * c - coords.y * s, coords.x * s + coords.y * c);\n' +
					'	float scale = max(abs(c - s), abs(s + c));\n' +
					'	coords /= scale;\n' +
					'	coords += vec2(0.5);\n' +
					'	float x = coords.x;;\n' +
					'	if (x <= mn) {\n' +
					'		gl_FragColor = texture2D(sourceB, vTexCoord);\n' +
					'		return;\n' +
					'	}\n' +
					'	if (x >= mx) {\n' +
					'		gl_FragColor = texture2D(sourceA, vTexCoord);\n' +
					'		return;\n' +
					'	}\n' +
					'	vec4 pixel1 = texture2D(sourceA, vTexCoord);\n' +
					'	vec4 pixel2 = texture2D(sourceB, vTexCoord);\n' +
					'	gl_FragColor = mix(pixel2, pixel1, smoothstep(mn, mx, x));\n' +
					'}\n';

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				if (uniforms.split >= 1) {
					uniforms.source = uniforms.sourceB;
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				if (uniforms.split <= 0) {
					uniforms.source = uniforms.sourceA;
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				parent(shader, model, uniforms, frameBuffer);
			},
			inPlace: false,
			requires: function (sourceName, inputs) {
				if (sourceName === 'sourceA' && inputs.split >= 1) {
					return false;
				}

				if (sourceName === 'sourceB' && inputs.split <= 0) {
					return false;
				}

				return true;
			}
		};
	},
	{
		inputs: {
			sourceA: {
				type: 'image',
				uniform: 'sourceA',
				shaderDirty: false
			},
			sourceB: {
				type: 'image',
				uniform: 'sourceB',
				shaderDirty: false
			},
			split: {
				type: 'number',
				uniform: 'split',
				defaultValue: 0.5,
				min: 0,
				max: 1
			},
			angle: {
				type: 'number',
				uniform: 'angle',
				defaultValue: 0
			},
			fuzzy: {
				type: 'number',
				uniform: 'fuzzy',
				defaultValue: 0,
				min: 0,
				max: 1
			}
		},
		description: 'Split screen or wipe',
		title: 'Split'
	});
}));
