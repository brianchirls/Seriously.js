import Seriously from '../seriously';

Seriously.plugin('polar', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float angle;',

			'const float PI = ' + Math.PI + ';',

			'void main(void) {',
			'	vec2 norm = (1.0 - vTexCoord) * 2.0 - 1.0;',
			'	float theta = mod(PI + atan(norm.x, norm.y) - angle * (PI / 180.0), PI * 2.0);',
			'	vec2 polar = vec2(theta / (2.0 * PI), length(norm));',
			'	gl_FragColor = texture2D(source, polar);',
			'}'
		].join('\n');
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		angle: {
			type: 'number',
			uniform: 'angle',
			defaultValue: 0
		}
	},
	title: 'Polar Coordinates',
	description: 'Convert cartesian to polar coordinates'
});
