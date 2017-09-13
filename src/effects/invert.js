import Seriously from '../seriously';

Seriously.plugin('invert', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',

			'void main(void) {',
			'	gl_FragColor = texture2D(source, vTexCoord);',
			'	gl_FragColor = vec4(1.0 - gl_FragColor.rgb, gl_FragColor.a);',
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
		}
	},
	title: 'Invert',
	description: 'Invert image color'
});
