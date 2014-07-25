/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*	experimental chroma key algorithm
		todo: see if we can minimize branching
		todo: calculate HSL of screen color outside shader
		todo: try allowing some color despill on opaque pixels
		todo: add different modes?
		todo: rename parameters
	*/
	Seriously.plugin('chroma', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'varying vec2 vTexCoord;',

				'uniform vec4 screen;',
				'uniform float balance;',
				'varying float screenSat;',
				'varying vec3 screenPrimary;',

				'void main(void) {',
				'	float fmin = min(min(screen.r, screen.g), screen.b);    //Min. value of RGB',
				'	float fmax = max(max(screen.r, screen.g), screen.b);    //Max. value of RGB',
				'	float secondaryComponents;',

				//'	luminance = (fmax + fmin) / 2.0; // Luminance',
				//'	screenSat = fmax - fmin; // Saturation',
				'	screenPrimary = step(fmax, screen.rgb);',
				'	secondaryComponents = dot(1.0 - screenPrimary, screen.rgb);',
				'	screenSat = fmax - mix(secondaryComponents - fmin, secondaryComponents / 2.0, balance);',

				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position = screenPosition;',
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	vTexCoord = texCoord;',
				'}'
			].join('\n');
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec4 screen;',
				'uniform float screenWeight;',
				'uniform float balance;',
				'uniform float clipBlack;',
				'uniform float clipWhite;',
				'uniform bool mask;',

				'varying float screenSat;',
				'varying vec3 screenPrimary;',

				'vec4 sourcePixel;',

				'const mat3 yuv = mat3(',
				'	54.213, 182.376, 18.411,',
				'	-54.213, -182.376, 236.589,',
				'	200.787, -182.376, -18.411',
				');',

				'float round(float n) {',
				'	return floor(n) + step(0.5, fract(n));',
				'}',

				'void main(void) {',
				'	float pixelSat, luminance, secondaryComponents;',
				'	vec3 pixelPrimary;',
				'	vec4 pixel = vec4(0.0);',
				'	sourcePixel = texture2D(source, vTexCoord);',

				'	float fmin = min(min(sourcePixel.r, sourcePixel.g), sourcePixel.b);    //Min. value of RGB',
				'	float fmax = max(max(sourcePixel.r, sourcePixel.g), sourcePixel.b);    //Max. value of RGB',
				//'	float delta = fmax - fmin;             //Delta RGB value',

				//'	luminance = (fmax + fmin) / 2.0; // Luminance',
				//'	luminance = dot(vec3(0.3, 0.59, 0.11), sourcePixel.rgb); // Luminance',
				'	luminance = fmax; // Luminance',
				'	pixelPrimary = step(fmax, sourcePixel.rgb);',
				//'	pixelSat = delta; // Saturation',
				'	secondaryComponents = dot(1.0 - pixelPrimary, sourcePixel.rgb);',
				'	pixelSat = fmax - mix(secondaryComponents - fmin, secondaryComponents / 2.0, balance);', // Saturation
				'	if (pixelSat < 0.1 || luminance < 0.1 || any(notEqual(pixelPrimary, screenPrimary))) {',
				'		pixel = sourcePixel;',
				//'		pixel = vec4(1.0);',

				'	} else if (pixelSat < screenSat) {',
				'		float alpha = 1.0 - pixelSat / screenSat;',
				'		alpha = smoothstep(clipBlack, clipWhite, alpha);',
				//'		float despill = alpha / screenWeight;',
				'		pixel = vec4((sourcePixel.rgb - (1.0 - alpha) * screen.rgb * screenWeight) / alpha, alpha);',
				//'		pixel = vec4(vec3(alpha), 1.0);',
				'	}',

				'	if (mask) {',
				'		gl_FragColor = vec4(vec3(pixel.a), 1.0);',
				'	} else {',
				'		gl_FragColor = pixel;',
				'	}',
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
			screen: {
				type: 'color',
				uniform: 'screen',
				defaultValue: [66 / 255, 195 / 255, 31 / 255, 1]
			},
			weight: {
				type: 'number',
				uniform: 'screenWeight',
				defaultValue: 1,
				min: 0
			},
			balance: {
				type: 'number',
				uniform: 'balance',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			clipBlack: {
				type: 'number',
				uniform: 'clipBlack',
				defaultValue: 0,
				min: 0,
				max: 1
			},
			clipWhite: {
				type: 'number',
				uniform: 'clipWhite',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			mask: {
				type: 'boolean',
				defaultValue: false,
				uniform: 'mask'
			}

		},
		title: 'Chroma Key',
		description: ''
	});
}));
