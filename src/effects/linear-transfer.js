import Seriously from '../seriously';

Seriously.plugin('linear-transfer', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec4 slope;',
			'uniform vec4 intercept;',

			'const vec3 half3 = vec3(0.5);',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	gl_FragColor = pixel * slope + intercept;',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		slope: {
			type: 'vector',
			dimensions: 4,
			uniform: 'slope',
			defaultValue: [1, 1, 1, 1]
		},
		intercept: {
			type: 'vector',
			uniform: 'intercept',
			dimensions: 4,
			defaultValue: [0, 0, 0, 0]
		}
	},
	title: 'Linear Transfer',
	description: 'For each color channel: [slope] * [value] + [intercept]'
});
