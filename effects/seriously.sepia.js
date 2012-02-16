(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

// sepia coefficients borrowed from:
// http://www.techrepublic.com/blog/howdoi/how-do-i-convert-images-to-grayscale-and-sepia-tone-using-c/120

Seriously.plugin('sepia', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec4 vPosition;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'uniform vec4 light;\n' +
			'uniform vec4 dark;\n' +
			'uniform float desat;\n' +
			'uniform float toned;\n' +
			'\n' +
			'const mat4 coeff = mat4(' +
				'0.393, 0.349, 0.272, 1.0,' +
				'0.796, 0.686, 0.534, 1.0, ' +
				'0.189, 0.168, 0.131, 1.0, ' +
				'0.0, 0.0, 0.0, 1.0 ' +
			');\n' +
			'\n' +
			'void main(void) {\n' +
			'	vec4 sourcePixel = texture2D(source, vTexCoord);\n' +
			'	gl_FragColor = coeff * sourcePixel;\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		}
	},
	title: 'Sepia',
	description: ''
});

}(window));
