import Seriously from '../seriously';

Seriously.plugin('kaleidoscope', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float segments;',
			'uniform float offset;',

			'const float PI = ' + Math.PI + ';',
			'const float TAU = 2.0 * PI;',

			'void main(void) {',
			'	if (segments == 0.0) {',
			'		gl_FragColor = texture2D(source, vTexCoord);',
			'	} else {',
			'		vec2 centered = vTexCoord - 0.5;',

			//to polar
			'		float r = length(centered);',
			'		float theta = atan(centered.y, centered.x);',
			'		theta = mod(theta, TAU / segments);',
			'		theta = abs(theta - PI / segments);',

			//back to cartesian
			'		vec2 newCoords = r * vec2(cos(theta), sin(theta)) + 0.5;',
			'		gl_FragColor = texture2D(source, mod(newCoords - offset, 1.0));',
			'	}',
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
		segments: {
			type: 'number',
			uniform: 'segments',
			defaultValue: 6
		},
		offset: {
			type: 'number',
			uniform: 'offset',
			defaultValue: 0
		}
	},
	title: 'Kaleidoscope'
});
