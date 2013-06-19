(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(root.require('seriously'));
	} else if (typeof root.define === 'function' && root.define.amd) {
		// AMD. Register as an anonymous module.
		root.define(['seriously'], factory);
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	//inspired by Evan Wallace (https://github.com/evanw/glfx.js)

	Seriously.plugin('hue-saturation', {
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'#ifdef GL_ES',
				'precision mediump float;',
				'#endif ',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 projection;',
				'uniform mat4 transform;',

				'uniform float hue;',
				'uniform float saturation;',

				'varying vec2 vTexCoord;',
				'varying vec4 vPosition;',

				'varying vec3 weights;',

				'void main(void) {',
				'	float angle = hue * 3.14159265358979323846264;',
				'	float s = sin(angle);',
				'	float c = cos(angle);',
				'	weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;',

				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position = screenPosition;',
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	vTexCoord = texCoord;',
				'	vPosition = gl_Position;',
				'}'
			].join('\n');
			shaderSource.fragment = [
				'#ifdef GL_ES\n',
				'precision mediump float;\n',
				'#endif\n',

				'varying vec2 vTexCoord;',
				'varying vec4 vPosition;',

				'varying vec3 weights;',

				'uniform sampler2D source;',
				'uniform float hue;',
				'uniform float saturation;',

				'void main(void) {',
				'	vec4 color = texture2D(source, vTexCoord);',

				//adjust hue
				'	float len = length(color.rgb);',
				'	color.rgb = vec3(' +
						'dot(color.rgb, weights.xyz), ' +
						'dot(color.rgb, weights.zxy), ' +
						'dot(color.rgb, weights.yzx) ' +
				');',

				//adjust saturation
				'	vec3 adjustment = (color.r + color.g + color.b) / 3.0 - color.rgb;',
				'	if (saturation > 0.0) {',
				'		adjustment *= (1.0 - 1.0 / (1.0 - saturation));',
				'	} else {',
				'		adjustment *= (-saturation);',
				'	}',
				'	color.rgb += adjustment;',

				'	gl_FragColor = color;',
				'}'
			].join('\n');
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
