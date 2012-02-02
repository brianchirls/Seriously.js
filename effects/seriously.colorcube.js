(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

//based on tutorial by to Gregg Tavares 
//http://www.youtube.com/watch?v=rfQ8rKGTVlg&t=24m30s
//todo: find a way to not invert every single texture

Seriously.plugin('colorcube', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n' +
			'precision mediump float;\n' +
			'#endif\n' +
			'uniform sampler2D source;\n' +
			'uniform sampler2D colorCube;\n' +
			'varying vec2 vTexCoord;\n' +

			'vec3 sampleAs3DTexture(sampler2D tex, vec3 coord, float size) {\n' +
			'	float sliceSize = 1.0 / size;                         // space of 1 slice\n' +
			'	float slicePixelSize = sliceSize / size;              // space of 1 pixel\n' +
			'	float sliceInnerSize = slicePixelSize * (size - 1.0); // space of size pixels\n' +
			'	float zSlice0 = min(floor(coord.z * size), size - 1.0);\n' +
			'	float zSlice1 = min(zSlice0 + 1.0, size - 1.0);\n' +
			'	float xOffset = slicePixelSize * 0.5 + coord.x * sliceInnerSize;\n' +
			'	float s0 = xOffset + (zSlice0 * sliceSize);\n' +
			'	float s1 = xOffset + (zSlice1 * sliceSize);\n' +
			'	vec3 slice0Color = texture2D(tex, vec2(s0, 1.0 - coord.y)).rgb;\n' +
			'	vec3 slice1Color = texture2D(tex, vec2(s1, 1.0 - coord.y)).rgb;\n' +
			'	float zOffset = mod(coord.z * size, 1.0);\n' +
			'	return mix(slice0Color, slice1Color, zOffset);\n' +
			'}\n' +

			'void main(void) {\n' +
			'	vec4 originalColor = texture2D(source, vTexCoord);\n' +
			'	vec3 color = sampleAs3DTexture(colorCube, originalColor.rgb, 8.0);\n' +
			'	gl_FragColor = vec4(color, originalColor.a);\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		cube: {
			type: 'image',
			uniform: 'colorCube'
		}
	},
	title: 'Color Cube',
	description: ''
});

}(window));
