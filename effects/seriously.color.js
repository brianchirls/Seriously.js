(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('color', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec4 vPosition;\n' +
			'\n' +
			'uniform vec4 color;\n' +
			'\n' +
			'void main(void) {\n' +
			'	gl_FragColor = color;\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		color: {
			type: 'color',
			uniform: 'color',
			defaultValue: [0, 0, 0, 1]
		}
	},
	title: 'Color',
	description: 'Generate color'
});

}(window));
