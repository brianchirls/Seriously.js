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

	/*	experimental chroma key algorithm
		todo: see if we can minimize branching
		todo: calculate HSL of screen color outside shader
		todo: try allowing some color despill on opaque pixels
		todo: add different modes?
		todo: rename parameters
	*/
	Seriously.plugin('chroma', {
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = '#ifdef GL_ES\n' +
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
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform vec4 screen;\n' +
				'uniform float balance;\n' +
				'varying float screenSat;\n' +
				'varying vec3 screenPrimary;\n' +
				'\n' +
				'void main(void) {\n' +
				'	float fmin = min(min(screen.r, screen.g), screen.b);    //Min. value of RGB\n' +
				'	float fmax = max(max(screen.r, screen.g), screen.b);    //Max. value of RGB\n' +
				'	float secondaryComponents;\n' +
				'\n' +
				//'	luminance = (fmax + fmin) / 2.0; // Luminance\n' +
				//'	screenSat = fmax - fmin; // Saturation\n' +
				'	screenPrimary = step(fmax, screen.rgb);\n' +
				'	secondaryComponents = dot(1.0 - screenPrimary, screen.rgb);\n' +
				'	screenSat = fmax - mix(secondaryComponents - fmin, secondaryComponents / 2.0, balance);\n' +
				'\n' +
			'	vec4 pos = position * vec4(srsSize.x / srsSize.y, 1.0, 1.0, 1.0);\n' +
			'	gl_Position = transform * pos;\n' +
			'	gl_Position.z -= srsSize.z;\n' +
			'	gl_Position = projection * gl_Position;\n' +
			'	gl_Position.z = 0.0;\n' + //prevent near clipping
			'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
				'}\n';
			shaderSource.fragment = '#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform vec4 screen;\n' +
				'uniform float screenWeight;\n' +
				'uniform float balance;\n' +
				'uniform float clipBlack;\n' +
				'uniform float clipWhite;\n' +
				'uniform bool mask;\n' +
				'\n' +
				'varying float screenSat;\n' +
				'varying vec3 screenPrimary;\n' +
				'\n' +
				'vec4 sourcePixel;\n' +
				'\n' +
				'const mat3 yuv = mat3(\n' +
				'	54.213, 182.376, 18.411,\n' +
				'	-54.213, -182.376, 236.589,\n' +
				'	200.787, -182.376, -18.411\n' +
				');\n' +
				'\n' +
				'float round(float n) {\n' +
				'	return floor(n) + step(0.5, fract(n));\n' +
				'}\n' +
				'\n' +
				'void main(void) {\n' +
				'	float pixelSat, luminance, secondaryComponents;\n' +
				'	vec3 pixelPrimary;\n' +
				'	vec4 pixel = vec4(0.0);\n' +
				'	sourcePixel = texture2D(source, vTexCoord);\n' +

				'	float fmin = min(min(sourcePixel.r, sourcePixel.g), sourcePixel.b);    //Min. value of RGB\n' +
				'	float fmax = max(max(sourcePixel.r, sourcePixel.g), sourcePixel.b);    //Max. value of RGB\n' +
				//'	float delta = fmax - fmin;             //Delta RGB value\n' +
				'\n' +
				//'	luminance = (fmax + fmin) / 2.0; // Luminance\n' +
				//'	luminance = dot(vec3(0.3, 0.59, 0.11), sourcePixel.rgb); // Luminance\n' +
				'	luminance = fmax; // Luminance\n' +
				'	pixelPrimary = step(fmax, sourcePixel.rgb);\n' +
				//'	pixelSat = delta; // Saturation\n' +
				'	secondaryComponents = dot(1.0 - pixelPrimary, sourcePixel.rgb);\n' +
				'	pixelSat = fmax - mix(secondaryComponents - fmin, secondaryComponents / 2.0, balance);\n' + // Saturation
				'	if (pixelSat < 0.1 || luminance < 0.1 || any(notEqual(pixelPrimary, screenPrimary))) {\n' +
				'		pixel = sourcePixel;\n' +
				//'		pixel = vec4(1.0);\n' +

				'	} else if (pixelSat < screenSat) {\n' +
				'		float alpha = 1.0 - pixelSat / screenSat;\n' +
				'		alpha = smoothstep(clipBlack, clipWhite, alpha);\n' +
				//'		float despill = alpha / screenWeight;\n' +
				'		pixel = vec4((sourcePixel.rgb - (1.0 - alpha) * screen.rgb * screenWeight) / alpha, alpha);\n' +
				//'		pixel = vec4(vec3(alpha), 1.0);\n' +
				'	}\n' +

				'	if (mask) {\n' +
				'		gl_FragColor = vec4(vec3(pixel.a), 1.0);\n' +
				'	} else {\n' +
				'		gl_FragColor = pixel;\n' +
				'	}\n' +
				'}\n';
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
