import Seriously from '../seriously';
import { noiseHelpers, snoise3d } from '../utilities/shaders/simplex-noise';

Seriously.plugin('simplex', function () {
	const me = this;

	function resize() {
		me.resize();
	}

	return {
		shader: function (inputs, shaderSource) {
			let frequency = 1,
				amplitude = 1,
				i,
				adjust = 0;

			function fmtFloat(n) {
				if (n - Math.floor(n) === 0) {
					return n + '.0';
				}
				return n;
			}

			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform float amount;',
				'uniform vec2 noiseScale;',
				'uniform vec2 noiseOffset;',
				'uniform float time;',
				'uniform vec4 black;',
				'uniform vec4 white;',

				noiseHelpers,
				snoise3d,
				//random,

				'void main(void) {',
				'	float total = 0.0;',
				'	vec3 pos = vec3(vTexCoord.xy * noiseScale + noiseOffset, time);'
			].join('\n');

			for (i = 0; i < inputs.octaves; i++) {
				frequency = Math.pow(2, i);
				amplitude = Math.pow(inputs.persistence, i);
				adjust += amplitude;
				shaderSource.fragment += '\ttotal += snoise(pos * ' + fmtFloat(frequency) + ') * ' + fmtFloat(amplitude) + ';\n';
			}
			shaderSource.fragment += [
				'	total *= amount / ' + fmtFloat(adjust) + ';',
				'	total = (total + 1.0)/ 2.0;',
				'	gl_FragColor = mix(black, white, total);',
				'}'
			].join('\n');

			return shaderSource;
		},
		inputs: {
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
			},
			black: {
				type: 'color',
				uniform: 'black',
				defaultValue: [0, 0, 0, 1]
			},
			white: {
				type: 'color',
				uniform: 'white',
				defaultValue: [1, 1, 1, 1]
			}
		}
	};
}, {
	title: 'Simplex Noise',
	description: 'Generate Simplex Noise'
});
