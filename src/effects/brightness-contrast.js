import Seriously from '../seriously';

Seriously.plugin('brightness-contrast', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord;',

			'uniform sampler2D source;',
			'uniform float brightness;',
			'uniform float saturation;',
			'uniform float contrast;',

			'const vec3 half3 = vec3(0.5);',

			'void main(void) {',
			'	vec4 pixel = texture2D(source, vTexCoord);',

			//adjust brightness
			'	vec3 color = pixel.rgb * brightness;',

			//adjust contrast
			'	color = (color - half3) * contrast + half3;',

			//keep alpha the same
			'	gl_FragColor = vec4(color, pixel.a);',
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
		brightness: {
			type: 'number',
			uniform: 'brightness',
			defaultValue: 1,
			min: 0
		},
		contrast: {
			type: 'number',
			uniform: 'contrast',
			defaultValue: 1,
			min: 0
		}
	},
	title: 'Brightness/Contrast',
	description: 'Multiply brightness and contrast values. Works the same as CSS filters.'
});
