import Seriously from '../seriously';

Seriously.plugin('falsecolor', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float amount;',
			'uniform vec4 black;',
			'uniform vec4 white;',

			'const vec3 luma = vec3(0.2125, 0.7154, 0.0721);',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	float luminance = dot(pixel.rgb, luma);',
			'	vec4 result = mix(black, white, luminance);',
			'	gl_FragColor = vec4(result.rgb, pixel.a * result.a);',
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
		black: {
			type: 'color',
			uniform: 'black',
			defaultValue: [0, 0, 0.5, 1]
		},
		white: {
			type: 'color',
			uniform: 'white',
			defaultValue: [1, 0, 0, 1]
		}
	},
	title: 'False Color'
});
