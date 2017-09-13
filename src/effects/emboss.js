import Seriously from '../seriously';

Seriously.plugin('emboss', {
	commonShader: true,
	shader: function (inputs, shaderSource) {
		shaderSource.vertex = [
			'precision mediump float;',

			'attribute vec4 position;',
			'attribute vec2 texCoord;',

			'uniform vec2 resolution;',
			'uniform mat4 transform;',

			'varying vec2 vTexCoord1;',
			'varying vec2 vTexCoord2;',

			'void main(void) {',
			// first convert to screen space
			'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
			'	screenPosition = transform * screenPosition;',

			// convert back to OpenGL coords
			'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
			'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
			'	gl_Position.w = screenPosition.w;',

			'	vec2 offset = 1.0 / resolution;',
			'	vTexCoord1 = texCoord - offset;',
			'	vTexCoord2 = texCoord + offset;',
			'}'
		].join('\n');

		shaderSource.fragment = [
			'precision mediump float;',

			'varying vec2 vTexCoord1;',
			'varying vec2 vTexCoord2;',

			'uniform sampler2D source;',
			'uniform float amount;',

			'const vec3 average = vec3(1.0 / 3.0);',

			'void main (void)  {',
			'	vec4 pixel = vec4(0.5, 0.5, 0.5, 1.0);',

			'	pixel -= texture2D(source, vTexCoord1) * amount;',
			'	pixel += texture2D(source, vTexCoord2) * amount;',
			'	pixel.rgb = vec3(dot(pixel.rgb, average));',

			'	gl_FragColor = pixel;',
			'}'
		].join('\n');
		return shaderSource;
	},
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 1,
			min: -255 / 3,
			max: 255 / 3
		}
	},
	title: 'Emboss',
	categories: [],
	description: 'Emboss'
});
