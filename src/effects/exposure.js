import Seriously from '../seriously';

Seriously.plugin('exposure', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',

			'uniform float exposure;',

			'void main (void)  {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	gl_FragColor = vec4(pow(2.0, exposure) * pixel.rgb, pixel.a);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		exposure: {
			type: 'number',
			uniform: 'exposure',
			defaultValue: 1,
			min: -8,
			max: 8
		}
	},
	title: 'Exposure',
	categories: ['film'],
	description: 'Exposure control'
});
