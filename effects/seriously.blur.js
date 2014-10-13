/* global define, require */
/*
Blur

Adapted from v002 by Anton Marini and Tom Butterworth
* Copyright vade - Anton Marini
* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

http://v002.info/plugins/v002-blurs/
*/
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

	var passes = [0.2, 0.3, 0.5, 0.8, 1],
		finalPass = passes.length - 1,
		horizontal = [1, 0],
		vertical = [0, 1],
		identity = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);

	Seriously.plugin('blur', function (options) {
		var fbHorizontal,
			fbVertical,
			baseShader,
			loopUniforms = {
				amount: 0,
				inputScale: 1,
				resolution: [this.width, this.height],
				transform: identity,
				direction: null
			};

		return {
			initialize: function (parent) {
				var gl;

				parent();

				gl = this.gl;

				if (!gl) {
					return;
				}

				baseShader = this.baseShader;

				fbHorizontal = new Seriously.util.FrameBuffer(gl, this.width, this.height);
				fbVertical = new Seriously.util.FrameBuffer(gl, this.width, this.height);
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				var gl = this.gl,
					/*
					Some devices or browsers (e.g. IE11 preview) don't support enough
					varying vectors, so we need to fallback to a less efficient method
					*/
					maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS),
					defineVaryings = (maxVaryings >= 10 ? '#define USE_VARYINGS' : '');

				shaderSource.vertex = [
					defineVaryings,
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 transform;',

					'uniform vec2 direction;',
					'uniform float amount;',
					'uniform float inputScale;',

					'const vec2 zero = vec2(0.0, 0.0);',

					'varying vec2 vTexCoord;',

					'#ifdef USE_VARYINGS',
					'vec2 one;',
					'vec2 amount1;',
					'varying vec2 vTexCoord1;',
					'varying vec2 vTexCoord2;',
					'varying vec2 vTexCoord3;',
					'varying vec2 vTexCoord4;',
					'varying vec2 vTexCoord5;',
					'varying vec2 vTexCoord6;',
					'varying vec2 vTexCoord7;',
					'varying vec2 vTexCoord8;',
					'#else',
					'varying vec2 one;',
					'varying vec2 amount1;',
					'#endif',

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position = screenPosition;',
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	vTexCoord = texCoord;',

					'	one = vec2(1.0, 1.0) * inputScale;',
					'	if (inputScale < 1.0) {',
					'		one -= 1.0 / resolution;',
					'	}',

					'	vTexCoord = max(zero, min(one, texCoord.st * inputScale));',
					'	amount1 = direction * (inputScale * amount * 5.0 / resolution);',

					'#ifdef USE_VARYINGS',
					'	vec2 amount2 = amount1 * 3.0;',
					'	vec2 amount3 = amount1 * 6.0;',
					'	vec2 amount4 = amount1 * 9.0;',
					'	vec2 amount5 = -amount1;',
					'	vec2 amount6 = amount5 * 3.0;',
					'	vec2 amount7 = amount5 * 6.0;',
					'	vec2 amount8 = amount5 * 9.0;',
					'	vTexCoord1 = max(zero, min(one, vTexCoord + amount1));',
					'	vTexCoord2 = max(zero, min(one, vTexCoord + amount2));',
					'	vTexCoord3 = max(zero, min(one, vTexCoord + amount3));',
					'	vTexCoord4 = max(zero, min(one, vTexCoord + amount4));',
					'	vTexCoord5 = max(zero, min(one, vTexCoord + amount5));',
					'	vTexCoord6 = max(zero, min(one, vTexCoord + amount6));',
					'	vTexCoord7 = max(zero, min(one, vTexCoord + amount7));',
					'	vTexCoord8 = max(zero, min(one, vTexCoord + amount8));',
					'#endif',
					'}'
				].join('\n');
				shaderSource.fragment = [
					defineVaryings,

					'precision mediump float;\n',

					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',

					'#ifdef USE_VARYINGS',
					'varying vec2 vTexCoord1;',
					'varying vec2 vTexCoord2;',
					'varying vec2 vTexCoord3;',
					'varying vec2 vTexCoord4;',
					'varying vec2 vTexCoord5;',
					'varying vec2 vTexCoord6;',
					'varying vec2 vTexCoord7;',
					'varying vec2 vTexCoord8;',
					'#else',
					'varying vec2 amount1;',
					'varying vec2 one;',
					'const vec2 zero = vec2(0.0, 0.0);',
					'#endif',

					'void main(void) {',
					'#ifndef USE_VARYINGS',
					'	vec2 vTexCoord1 = max(zero, min(one, vTexCoord + amount1));',
					'	vec2 vTexCoord2 = max(zero, min(one, vTexCoord + amount1 * 3.0));',
					'	vec2 vTexCoord3 = max(zero, min(one, vTexCoord + amount1 * 6.0));',
					'	vec2 vTexCoord4 = max(zero, min(one, vTexCoord + amount1 * 9.0));',
					'	vec2 vTexCoord5 = max(zero, min(one, vTexCoord - amount1));',
					'	vec2 vTexCoord6 = max(zero, min(one, vTexCoord - amount1 * 3.0));',
					'	vec2 vTexCoord7 = max(zero, min(one, vTexCoord - amount1 * 6.0));',
					'	vec2 vTexCoord8 = max(zero, min(one, vTexCoord - amount1 * 9.0));',
					'#endif',
					'	gl_FragColor = texture2D(source, vTexCoord) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord1) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord2) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord3) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord4) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord5) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord6) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord7) / 9.0;',
					'	gl_FragColor += texture2D(source, vTexCoord8) / 9.0;',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				var i,
					pass,
					amount,
					width,
					height,
					opts = {
						width: 0,
						height: 0,
						blend: false
					},
					previousPass = 1;

				amount = this.inputs.amount;
				if (!amount) {
					uniforms.source = this.inputs.source.texture;
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				if (amount <= 0.01) {
					//horizontal pass
					uniforms.inputScale = 1;
					uniforms.direction = horizontal;
					uniforms.source = this.inputs.source.texture;
					parent(shader, model, uniforms, fbHorizontal.frameBuffer);

					//vertical pass
					uniforms.direction = vertical;
					uniforms.source = fbHorizontal.texture;
					parent(shader, model, uniforms, frameBuffer);
					return;
				}

				loopUniforms.amount = amount;
				loopUniforms.source = this.inputs.source.texture;

				for (i = 0; i < passes.length; i++) {
					pass = Math.min(1, passes[i] / amount);
					width = Math.floor(pass * this.width);
					height = Math.floor(pass * this.height);

					loopUniforms.resolution[0] = width;
					loopUniforms.resolution[1] = height;
					loopUniforms.inputScale = previousPass;
					previousPass = pass;

					opts.width = width;
					opts.height = height;

					//horizontal pass
					loopUniforms.direction = horizontal;
					parent(shader, model, loopUniforms, fbHorizontal.frameBuffer, null, opts);

					//vertical pass
					loopUniforms.inputScale = pass;
					loopUniforms.source = fbHorizontal.texture;
					loopUniforms.direction = vertical;
					parent(shader, model, loopUniforms, i === finalPass ? frameBuffer : fbVertical.frameBuffer, null, opts);

					loopUniforms.source = fbVertical.texture;
				}
			},
			resize: function () {
				loopUniforms.resolution[0] = this.width;
				loopUniforms.resolution[1] = this.height;
				if (fbHorizontal) {
					fbHorizontal.resize(this.width, this.height);
					fbVertical.resize(this.width, this.height);
				}
			},
			destroy: function () {
				if (fbHorizontal) {
					fbHorizontal.destroy();
					fbVertical.destroy();
					fbHorizontal = null;
					fbVertical = null;
				}

				loopUniforms = null;
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				shaderDirty: false
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0.2,
				min: 0,
				max: 1
			}
		},
		title: 'Gaussian Blur'
	});
}));
