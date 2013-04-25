(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(root.require('seriously'));
	} else if (typeof root.define === 'function' && root.define.amd) {
		// AMD. Register as an anonymous module.
		root.define(['seriously'], factory);
	} else {
		var Seriously = root.Seriously;
		if (!Seriously) {
			Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	//inspired by Evan Wallace (https://github.com/evanw/glfx.js)

	Seriously.plugin('hue-saturation', {
		shader: function (inputs, shaderSource) {
			shaderSource.vertex =  '#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif \n' +
				'\n' +
				'attribute vec4 position;\n' +
				'attribute vec2 texCoord;\n' +
				'\n' +
				'uniform vec3 srsSize;\n' +
				'uniform mat4 projection;\n' +
				'uniform mat4 transform;\n' +
				'\n' +
				'uniform float hue;\n' +
				'uniform float saturation;\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'varying vec3 weights;\n' +
				'\n' +
				'void main(void) {\n' +
				'	float angle = hue * 3.14159265358979323846264;\n' +
				'	float s = sin(angle);\n' +
				'	float c = cos(angle);\n' +
				'	weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;\n' +
				'\n' +
				'	vec4 pos = position * vec4(srsSize.x / srsSize.y, 1.0, 1.0, 1.0);\n' +
				'	gl_Position = transform * pos;\n' +
				'	gl_Position.z -= srsSize.z;\n' +
				'	gl_Position = projection * gl_Position;\n' +
				'	gl_Position.z = 0.0;\n' + //prevent near clipping
				'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
				'}\n';
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'varying vec3 weights;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform float hue;\n' +
				'uniform float saturation;\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec4 color = texture2D(source, vTexCoord);\n' +

				//adjust hue
				'	float len = length(color.rgb);\n' +
				'	color.rgb = vec3(' +
						'dot(color.rgb, weights.xyz), ' +
						'dot(color.rgb, weights.zxy), ' +
						'dot(color.rgb, weights.yzx) ' +
				');\n' +

				//adjust saturation
				'	vec3 adjustment = (color.r + color.g + color.b) / 3.0 - color.rgb;\n' +
				'	if (saturation > 0.0) {\n' +
				'		adjustment *= (1.0 - 1.0 / (1.0 - saturation));\n' +
				'	} else {\n' +
				'		adjustment *= (-saturation);\n' +
				'	}\n' +
				'	color.rgb += adjustment;\n' +

				'	gl_FragColor = color;\n' +
				'}\n';
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			hue: {
				type: 'number',
				uniform: 'hue',
				defaultValue: 0,
				min: -1,
				max: 1
			},
			saturation: {
				type: 'number',
				uniform: 'saturation',
				defaultValue: 0,
				min: -1,
				max: 1
			}
		},
		title: 'Hue/Saturation',
		description: 'Rotate hue and multiply saturation.'
	});
}));
