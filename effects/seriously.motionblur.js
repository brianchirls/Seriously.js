/*
Motion Blur effect

Adapted from v002 by Anton Marini and Tom Butterworth
* Copyright vade - Anton Marini
* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

http://v002.info/plugins/v002-blurs/
*/
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

	var passes = [0.2, 0.3, 0.5, 0.8],
		identity = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);

	Seriously.plugin('motionblur', function () {
		var fbs,
			baseShader,
			loopUniforms = {
				amount: 0,
				angle: 0,
				resolution: [0, 0],
				transform: identity,
				projection: new Float32Array([
					1, 0, 0, 0,
					0, 1, 0, 0,
					0, 0, 1, 0,
					0, 0, 0, 1
				])
			};

		return {
			initialize: function (parent) {
				var gl;

				parent();

				gl = this.gl;

				if (!gl) {
					return;
				}

				fbs = [
					new Seriously.util.FrameBuffer(gl, this.width, this.height),
					new Seriously.util.FrameBuffer(gl, this.width, this.height)
				];
			},
			shader: function (inputs, shaderSource) {
				baseShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, shaderSource.fragment);

				shaderSource.vertex = [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif ',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 projection;',
					'uniform mat4 transform;',

					'varying vec2 vTexCoord;',
					'varying vec4 vPosition;',

					'uniform float angle;',
					'uniform float amount;',
					'varying vec2 vTexCoord1;',
					'varying vec2 vTexCoord2;',
					'varying vec2 vTexCoord3;',
					'varying vec2 vTexCoord4;',
					'varying vec2 vTexCoord5;',
					'varying vec2 vTexCoord6;',
					'varying vec2 vTexCoord7;',
					'varying vec2 vTexCoord8;',

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position = screenPosition;',
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	vTexCoord = texCoord;',
					'	vPosition = gl_Position;',

					'	vec2 amount1 = vec2(cos(angle), sin(angle)) * amount * 5.0 / resolution;',
					'	vec2 amount2 = amount1 * 3.0;',
					'	vec2 amount3 = amount1 * 6.0;',
					'	vec2 amount4 = amount1 * 9.0;',
					'	vec2 amount5 = -amount1;',
					'	vec2 amount6 = amount5 * 3.0;',
					'	vec2 amount7 = amount5 * 6.0;',
					'	vec2 amount8 = amount5 * 9.0;',
					'	vTexCoord = vec2(texCoord.s, texCoord.t);',
					'	vTexCoord1 = vTexCoord + amount1;',
					'	vTexCoord2 = vTexCoord + amount2;',
					'	vTexCoord3 = vTexCoord + amount3;',
					'	vTexCoord4 = vTexCoord + amount4;',
					'	vTexCoord5 = vTexCoord + amount5;',
					'	vTexCoord6 = vTexCoord + amount6;',
					'	vTexCoord7 = vTexCoord + amount7;',
					'	vTexCoord8 = vTexCoord + amount8;',
					'}'
				].join('\n');
				shaderSource.fragment = [
					'#ifdef GL_ES\n',
					'precision mediump float;\n',
					'#endif\n',

					'varying vec2 vTexCoord;',
					'varying vec4 vPosition;',

					'uniform sampler2D source;',
					'uniform float angle;',
					'uniform float amount;',
					'varying vec2 vTexCoord1;',
					'varying vec2 vTexCoord2;',
					'varying vec2 vTexCoord3;',
					'varying vec2 vTexCoord4;',
					'varying vec2 vTexCoord5;',
					'varying vec2 vTexCoord6;',
					'varying vec2 vTexCoord7;',
					'varying vec2 vTexCoord8;',

					'void main(void) {',
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
					fb,
					pass,
					amount,
					width,
					height,
					opts = {
						width: 0,
						height: 0,
						blend: false
					};

				amount = this.inputs.amount;
				if (!amount) {
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				if (amount <= 0.01) {
					parent(shader, model, uniforms, frameBuffer);
					return;
				}

				loopUniforms.amount = amount;
				loopUniforms.angle = this.inputs.angle;
				loopUniforms.projection[0] = this.height / this.width;

				for (i = 0; i < passes.length; i++) {
					pass = Math.min(1, passes[i] / amount);
					width = Math.floor(pass * this.width);
					height = Math.floor(pass * this.height);

					loopUniforms.source = fb ? fb.texture : this.inputs.source.texture;
					loopUniforms.resolution[0] = width;
					loopUniforms.resolution[1] = height;
					opts.width = width;
					opts.height = height;

					fb = fbs[i % 2];
					fb.resize(width, height);
					parent(shader, model, loopUniforms, fb.frameBuffer, null, opts);
				}

				loopUniforms.source = fb.texture;
				loopUniforms.resolution[0] = this.width;
				loopUniforms.resolution[1] = this.height;
				parent(shader, model, loopUniforms, frameBuffer);
			},
			destroy: function () {
				if (fbs) {
					fbs[0].destroy();
					fbs[1].destroy();
					fbs = null;
				}

				if (baseShader) {
					baseShader.destroy();
				}

				loopUniforms = null;
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0,
				min: 0,
				max: 1
			},
			angle: {
				type: 'number',
				uniform: 'angle',
				defaultValue: 0
			}
		},
		title: 'Motion Blur'
	});
}));
