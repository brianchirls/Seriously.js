import Seriously from '../seriously';

Seriously.plugin('mirror', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'uniform vec2 resolution;',
			'uniform sampler2D source;',

			'varying vec2 vTexCoord;',

			'void main(void) {',
			'	gl_FragColor = texture2D(source, vec2(0.5 - abs(0.5 - vTexCoord.x), vTexCoord.y));',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		}
	},
	title: 'Mirror',
	description: 'Shader Mirror Effect'
});
