(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('lumakey', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'varying vec4 vPosition;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'\n' +
			'uniform float threshold;\n' +
			'uniform float clipBlack;\n' +
			'uniform float clipWhite;\n' +
			'\n' +
			'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);\n' +
			'\n' +
			'void main (void)  {\n' +
			'	vec4 pixel = texture2D(source, vTexCoord);\n' +
			'	float luma = dot(pixel.rgb,lumcoeff);\n' +
			'	float alpha = 1.0 - smoothstep(clipBlack, clipWhite, luma);\n' +
			'	gl_FragColor = vec4(pixel.rgb, min(pixel.a, alpha) );\n' +
			'\n' +
			'} \n';
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
		}		
	},
	title: 'Luma Key',
	categories: ['key'],
	description: ''
});

}(window));
