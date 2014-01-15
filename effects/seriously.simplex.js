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

	Seriously.plugin('simplex', function () {
		var me = this;

		function resize() {
			me.resize();
		}

		return {
			shader: function (inputs, shaderSource, utilities) {
				var frequency = 1,
					amplitude = 1,
					i,
					adjust = 0;

				function fmtFloat(n) {
					if (n - Math.floor(n) === 0) {
						return n + '.0';
					}
					return n;
				}

				shaderSource.fragment = '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'varying vec4 vPosition;\n' +
					'\n' +
					'uniform float amount;\n' +
					'uniform vec2 noiseScale;\n' +
					'uniform vec2 noiseOffset;\n' +
					'uniform float time;\n' +

					utilities.shader.noiseHelpers +
					utilities.shader.snoise3d +
					//utilities.shader.random +

					'void main(void) {\n' +
					'	float total = 0.0;\n' +
					'	vec3 pos = vec3(vTexCoord.xy * noiseScale + noiseOffset, time);\n';

				for (i = 0; i < inputs.octaves; i++) {
					frequency = Math.pow(2, i);
					amplitude = Math.pow(inputs.persistence, i);
					adjust += amplitude;
					shaderSource.fragment += '\ttotal += snoise(pos * ' + fmtFloat(frequency) + ') * ' + fmtFloat(amplitude) + ';\n';
				}
				shaderSource.fragment += '\ttotal *= amount / ' + fmtFloat(adjust) + ';\n' +
				'	total = (total + 1.0)/ 2.0;\n' +
				'	gl_FragColor = vec4(total, total, total, 1.0);\n' +
				'}';

				return shaderSource;
			},
			inputs: {
				source: {
					type: 'image',
					uniform: 'source'
				},
				noiseScale: {
					type: 'vector',
					dimensions: 2,
					uniform: 'noiseScale',
					defaultValue: [1, 1]
				},
				noiseOffset: {
					type: 'vector',
					dimensions: 2,
					uniform: 'noiseOffset',
					defaultValue: [0, 0]
				},
				octaves: {
					type: 'number',
					shaderDirty: true,
					min: 1,
					max: 8,
					step: 1,
					defaultValue: 1
				},
				persistence: {
					type: 'number',
					defaultValue: 0.5,
					min: 0,
					max: 0.5
				},
				amount: {
					type: 'number',
					uniform: 'amount',
					min: 0,
					defaultValue: 1
				},
				time: {
					type: 'number',
					uniform: 'time',
					defaultValue: 0
				},
				width: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				},
				height: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				}
			}
		};
	}, {
		title: 'Simplex Noise',
		description: 'Generate Simplex Noise'
	});
}));
