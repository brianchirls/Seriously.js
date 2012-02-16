(function (window, undefined) {
"use strict";

/*
Shader code:
* Copyright vade - Anton Marini
* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

http://v002.info/?page_id=34

Modified to keep alpha channel constant
*/

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('bleach-bypass', {
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
			'uniform float amount;\n' +
			'\n' +
			'//constant variables.\n' +
			'const vec4 one = vec4(1.0);\n' +
			'const vec4 two = vec4(2.0);\n' +
			'const vec4 lumcoeff = vec4(0.2125,0.7154,0.0721,0.0);\n' +
			'\n' +
			'vec4 overlay(vec4 myInput, vec4 previousmix, vec4 amount) {\n' +
			'	float luminance = dot(previousmix,lumcoeff);\n' +
			'	float mixamount = clamp((luminance - 0.45) * 10.0, 0.0, 1.0);\n' +
			'\n' +
			'	vec4 branch1 = two * previousmix * myInput;\n' +
			'	vec4 branch2 = one - (two * (one - previousmix) * (one - myInput));\n' +
			'\n' +
			'	vec4 result = mix(branch1, branch2, vec4(mixamount) );\n' +
			'\n' +
			'	return mix(previousmix, result, amount);\n' +
			'}\n' +
			'\n' +
			'void main (void)  {\n' +
			'	vec4 pixel = texture2D(source, vTexCoord);\n' +
			'	vec4 luma = vec4(vec3(dot(pixel,lumcoeff)), pixel.a);\n' +
			'	gl_FragColor = overlay(luma, pixel, vec4(amount));\n' +
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
		amount: {
			type: 'number',
			uniform: 'amount',
			defaultValue: 1,
			min: 0,
			max: 1
		}
	},
	title: 'Bleach Bypass',
	categories: ['film'],
	description: 'Bleach Bypass film treatment\n' +
				'http://en.wikipedia.org/wiki/Bleach_bypass\n' +
				'see: "Saving Private Ryan", "Minority Report"'
});

}(window));
