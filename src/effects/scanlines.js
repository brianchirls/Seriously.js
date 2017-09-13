import Seriously from '../seriously';

Seriously.plugin('scanlines', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float lines;',
			'uniform float width;',
			'uniform float intensity;',

			//todo: add vertical offset for animating

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',
			'	float darken = 2.0 * abs( fract(vTexCoord.y * lines / 2.0) - 0.5);',
			'	darken = clamp(darken - width + 0.5, 0.0, 1.0);',
			'	darken = 1.0 - ((1.0 - darken) * intensity);',
			'	gl_FragColor = vec4(pixel.rgb * darken, 1.0);',
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
		lines: {
			type: 'number',
			uniform: 'lines',
			defaultValue: 60
		},
		size: {
			type: 'number',
			uniform: 'size',
			defaultValue: 0.2,
			min: 0,
			max: 1
		},
		intensity: {
			type: 'number',
			uniform: 'intensity',
			defaultValue: 0.1,
			min: 0,
			max: 1
		}
	},
	title: 'Scan Lines',
	description: ''
});
