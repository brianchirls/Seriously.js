(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('tone', {
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
			'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);\n' +
			'\n' +
			'void main(void) {\n' +
			'	vec4 sourcePixel = texture2D(source, vTexCoord);\n' +
			'	vec3 sceneColor = light.rgb * sourcePixel.rgb;\n' +
			'	vec3 gray = vec3(dot(lumcoeff, sceneColor));\n' +
			'	vec3 muted = mix(sceneColor, gray, desat);\n' +
			'	vec3 tonedColor = mix(dark.rgb, light.rgb, gray);\n' +
			'	gl_FragColor = vec4(mix(muted, tonedColor, toned), sourcePixel.a);\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		light: {
			type: 'color',
			uniform: 'light',
			defaultValue: [1,0.9,0.5,1]
		},
		dark: {
			type: 'color',
			uniform: 'dark',
			defaultValue: [0.2,0.05,0,1]
		},
		toned: {
			type: 'number',
			uniform: 'toned',
			defaultValue: 1,
			minimumRange: 0,
			maximumRange: 1
		},
		desat: {
			type: 'number',
			uniform: 'desat',
			defaultValue: 0.5,
			minimumRange: 0,
			maximumRange: 1
		}
	},
	title: 'Tone',
	description: ''
});

}(window));
