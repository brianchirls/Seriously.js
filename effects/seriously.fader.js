(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('fader', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec4 vPosition;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'uniform vec4 color;\n' +
			'uniform float amount;\n' +
			'\n' +
			'void main(void) {\n' +
			'	gl_FragColor = texture2D(source, vTexCoord);\n' +
			'	gl_FragColor = mix(gl_FragColor, color, amount);\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
		},
		color: {
			type: 'color',
			uniform: 'color',
			defaultValue: [0, 0, 0, 1]
		},
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 1,
			min: 0,
			max: 1
		}
	},
	title: 'Fader',
	description: 'Fade image to a color'
});

}(window));
