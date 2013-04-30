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
				srsSize: [0, 0, 1],
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
					'uniform float angle;\n' +
					'uniform float amount;\n' +
					'varying vec2 vTexCoord1;\n' +
					'varying vec2 vTexCoord2;\n' +
					'varying vec2 vTexCoord3;\n' +
					'varying vec2 vTexCoord4;\n' +
					'varying vec2 vTexCoord5;\n' +
					'varying vec2 vTexCoord6;\n' +
					'varying vec2 vTexCoord7;\n' +
					'varying vec2 vTexCoord8;\n' +
					'\n' +
					'void main(void) {\n' +
					'	vec4 pos = position * vec4(srsSize.x / srsSize.y, 1.0, 1.0, 1.0);\n' +
					'	gl_Position = transform * pos;\n' +
					'	gl_Position.z -= srsSize.z;\n' +
					'	gl_Position = projection * gl_Position;\n' +
					'	gl_Position.z = 0.0;\n' + //prevent near clipping

					'	vec2 size = srsSize.xy;\n' +
					'	vec2 amount1 = vec2(cos(angle), sin(angle)) * amount * 5.0 / size;\n' +
					'	vec2 amount2 = amount1 * 3.0;\n' +
					'	vec2 amount3 = amount1 * 6.0;\n' +
					'	vec2 amount4 = amount1 * 9.0;\n' +
					'	vec2 amount5 = -amount1;\n' +
					'	vec2 amount6 = amount5 * 3.0;\n' +
					'	vec2 amount7 = amount5 * 6.0;\n' +
					'	vec2 amount8 = amount5 * 9.0;\n' +
					'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
					'	vTexCoord1 = vTexCoord + amount1;\n' +
					'	vTexCoord2 = vTexCoord + amount2;\n' +
					'	vTexCoord3 = vTexCoord + amount3;\n' +
					'	vTexCoord4 = vTexCoord + amount4;\n' +
					'	vTexCoord5 = vTexCoord + amount5;\n' +
					'	vTexCoord6 = vTexCoord + amount6;\n' +
					'	vTexCoord7 = vTexCoord + amount7;\n' +
					'	vTexCoord8 = vTexCoord + amount8;\n' +
					'}\n';
				shaderSource.fragment = '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'varying vec4 vPosition;\n' +
					'\n' +
					'uniform sampler2D source;\n' +
					'uniform float angle;\n' +
					'uniform float amount;\n' +
					'varying vec2 vTexCoord1;\n' +
					'varying vec2 vTexCoord2;\n' +
					'varying vec2 vTexCoord3;\n' +
					'varying vec2 vTexCoord4;\n' +
					'varying vec2 vTexCoord5;\n' +
					'varying vec2 vTexCoord6;\n' +
					'varying vec2 vTexCoord7;\n' +
					'varying vec2 vTexCoord8;\n' +
					'\n' +
					'void main(void) {\n' +
					'	gl_FragColor = texture2D(source, vTexCoord) / 9.0;\n' +
					'	gl_FragColor += texture2D(source, vTexCoord1) / 9.0;\n' +
					'	gl_FragColor += texture2D(source, vTexCoord2) / 9.0;\n' +
					'	gl_FragColor += texture2D(source, vTexCoord3) / 9.0;\n' +
					'	gl_FragColor += texture2D(source, vTexCoord4) / 9.0;\n' +
					'	gl_FragColor += texture2D(source, vTexCoord5) / 9.0;\n' +
					'	gl_FragColor += texture2D(source, vTexCoord6) / 9.0;\n' +
					'	gl_FragColor += texture2D(source, vTexCoord7) / 9.0;\n' +
					'	gl_FragColor += texture2D(source, vTexCoord8) / 9.0;\n' +
					'}\n';

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
					loopUniforms.srsSize[0] = width;
					loopUniforms.srsSize[1] = height;
					opts.width = width;
					opts.height = height;

					fb = fbs[i % 2];
					fb.resize(width, height);
					parent(shader, model, loopUniforms, fb.frameBuffer, null, opts);
				}

				loopUniforms.source = fb.texture;
				loopUniforms.srsSize[0] = this.width;
				loopUniforms.srsSize[1] = this.height;
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
