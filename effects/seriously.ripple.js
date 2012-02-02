(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

//http://msdn.microsoft.com/en-us/library/bb313868(v=xnagamestudio.10).aspx
Seriously.plugin('ripple', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec4 vPosition;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'uniform float wave;\n' +
			'uniform float distortion;\n' +
			'uniform vec2 center;\n' +
			'\n' +
			'void main(void) {\n' +
			//todo: can at least move scalar into vertex shader
			'	float scalar = abs(1.0 - abs(distance(vTexCoord, center)));\n' +
			'	float sinOffset = sin(wave / scalar);\n' +
			'	sinOffset = clamp(sinOffset, 0.0, 1.0);\n' +
			'	float sinSign = cos(wave / scalar);\n' +
			'	sinOffset = sinOffset * distortion / 32.0;\n' +
			'	gl_FragColor = texture2D(source, vTexCoord + sinOffset * sinSign);\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		wave: {
			type: 'number',
			uniform: 'wave',
			defaultValue: Math.PI / 0.75
		},
		distortion: {
			type: 'number',
			uniform: 'distortion',
			defaultValue: 1
		},
		center: {
			type: 'vector',
			uniform: 'center',
			dimensions: 2,
			defaultValue: { x: 0.5, y: 0.5 }
		}
	},
	title: 'Ripple Distortion',
	description: ''
});

}(window));
