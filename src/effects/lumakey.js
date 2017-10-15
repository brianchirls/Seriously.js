import Seriously from '../seriously';

Seriously.plugin('lumakey', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',

			'uniform float threshold;',
			'uniform float clipBlack;',
			'uniform float clipWhite;',
			'uniform bool invert;',

			'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);',

			'void main (void)  {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	float luma = dot(pixel.rgb,lumcoeff);',
			'	float alpha = 1.0 - smoothstep(clipBlack, clipWhite, luma);',
			'	if (invert) alpha = 1.0 - alpha;',
			'	gl_FragColor = vec4(pixel.rgb, min(pixel.a, alpha) );',
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
		clipBlack: {
			type: 'number',
			uniform: 'clipBlack',
			defaultValue: 0.9,
			min: 0,
			max: 1
		},
		clipWhite: {
			type: 'number',
			uniform: 'clipWhite',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		invert: {
			type: 'boolean',
			uniform: 'invert',
			defaultValue: false
		}
	},
	title: 'Luma Key',
	categories: ['key'],
	description: ''
});
