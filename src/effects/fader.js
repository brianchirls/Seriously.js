import Seriously from '../seriously';

Seriously.plugin('fader', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform vec4 color;',
			'uniform float amount;',

			'void main(void) {',
			'	gl_FragColor = texture2D(source, vTexCoord);',
			'	gl_FragColor = mix(gl_FragColor, color, amount);',
			'}'
		].join('\n');
		return shaderSource;
	},
	requires: function (sourceName, inputs) {
		return inputs.amount < 1;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		color: {
			type: 'color',
			uniform: 'color',
			defaultValue: [0, 0, 0, 1]
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 0.5,
			min: 0,
			max: 1
		}
	},
	title: 'Fader',
	description: 'Fade image to a color'
});
