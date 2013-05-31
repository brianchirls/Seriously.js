(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(root.require('seriously'));
	} else if (typeof root.define === 'function' && root.define.amd) {
		// AMD. Register as an anonymous module.
		root.define(['seriously'], factory);
	} else {
		var Seriously = root.Seriously;
		if (!Seriously) {
			Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	Seriously.plugin('split', function () {
		var baseShader;
		return {
			shader: function (inputs, shaderSource) {
				baseShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, shaderSource.fragment);

				shaderSource.vertex = [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif ',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 projection;',
					'uniform mat4 transform;',

					'varying vec2 vTexCoord;',
					'varying vec4 vPosition;',

					'uniform float angle;',
					'varying float c;',
					'varying float s;',
					'varying float t;',

					'void main(void) {',
					'   c = cos(angle);',
					'   s = sin(angle);',
					'	t = abs(c + s);',

					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position = screenPosition;',
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	vTexCoord = texCoord;',
					'	vPosition = gl_Position;',
					'}'
				].join('\n');
				shaderSource.fragment = [
					'#ifdef GL_ES\n',
					'precision mediump float;\n',
					'#endif\n',

					'varying vec2 vTexCoord;',
					'varying vec4 vPosition;',

					'varying float c;',
					'varying float s;',
					'varying float t;',

					'uniform sampler2D sourceA;',
					'uniform sampler2D sourceB;',
					'uniform float split;',
					'uniform float angle;',
					'uniform float fuzzy;',

					'void main(void) {',
					'	float mn = (split - fuzzy * (1.0 - split));',
					'	float mx = (split + fuzzy * split);;',
					'	vec2 coords = vTexCoord - vec2(0.5);',
					'	coords = vec2(coords.x * c - coords.y * s, coords.x * s + coords.y * c);',
					'	float scale = max(abs(c - s), abs(s + c));',
					'	coords /= scale;',
					'	coords += vec2(0.5);',
					'	float x = coords.x;;',
					'	if (x <= mn) {',
					'		gl_FragColor = texture2D(sourceB, vTexCoord);',
					'		return;',
					'	}',
					'	if (x >= mx) {',
					'		gl_FragColor = texture2D(sourceA, vTexCoord);',
					'		return;',
					'	}',
					'	vec4 pixel1 = texture2D(sourceA, vTexCoord);',
					'	vec4 pixel2 = texture2D(sourceB, vTexCoord);',
					'	gl_FragColor = mix(pixel2, pixel1, smoothstep(mn, mx, x));',
					'}'
				].join('\n');

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
