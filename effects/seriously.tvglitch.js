/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	//particle parameters
	var minVelocity = 0.2,
		maxVelocity = 0.8,
		minSize = 0.02,
		maxSize = 0.3,
		particleCount = 20;

	Seriously.plugin('tvglitch', function () {
		var lastHeight,
			lastTime,
			particleBuffer,
			particleShader,
			particleFrameBuffer,
			gl;

		return {
			initialize: function (parent) {
				var i,
					sizeRange,
					velocityRange,
					particleVertex,
					particleFragment,
					particles;

				gl = this.gl;

				lastHeight = this.height;

				//initialize particles
				particles = [];
				sizeRange = maxSize - minSize;
				velocityRange = maxVelocity - minVelocity;
				for (i = 0; i < particleCount; i++) {
					particles.push(Math.random() * 2 - 1); //position
					particles.push(Math.random() * velocityRange + minVelocity); //velocity
					particles.push(Math.random() * sizeRange + minSize); //size
					particles.push(Math.random() * 0.2); //intensity
				}

				particleBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particles), gl.STATIC_DRAW);
				particleBuffer.itemSize = 4;
				particleBuffer.numItems = particleCount;

				particleVertex = '#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif \n' +
				'\n' +
				'attribute vec4 particle;\n' +
				'\n' +
				'uniform float time;\n' +
				'uniform float height;\n' +
				'\n' +
				'varying float intensity;\n' +
				'\n' +
				'void main(void) {\n' +
				'	float y = particle.x + time * particle.y;\n' +
				'	y = fract((y + 1.0) / 2.0) * 4.0 - 2.0;\n' +
				'	intensity = particle.w;\n' +
				'	gl_Position = vec4(0.0, -y , 1.0, 2.0);\n' +
				//'	gl_Position = vec4(0.0, 1.0 , 1.0, 1.0);\n' +
				'	gl_PointSize = height * particle.z;\n' +
				'}\n';

				particleFragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying float intensity;\n' +
				'\n' +
				'void main(void) {\n' +
				'	gl_FragColor = vec4(1.0);\n' +
				'	gl_FragColor.a = 2.0 * intensity * (1.0 - abs(gl_PointCoord.y - 0.5));\n' +
				'}\n';

				particleShader = new Seriously.util.ShaderProgram(gl, particleVertex, particleFragment);

				particleFrameBuffer = new Seriously.util.FrameBuffer(gl, 1, Math.max(1, this.height / 2));
				parent();
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				//baseShader = this.baseShader;

				shaderSource.fragment = '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					//'#define HardLight(top, bottom) (top < 0.5 ? (2.0 * top * bottom) : (1.0 - 2.0 * (1.0 - top) * (1.0 - bottom)))\n' +
					'#define HardLight(top, bottom)  (1.0 - 2.0 * (1.0 - top) * (1.0 - bottom))\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'varying vec4 vPosition;\n' +
					'\n' +
					'uniform sampler2D source;\n' +
					'uniform sampler2D particles;\n' +
					'uniform float time;\n' +
					'uniform float scanlines;\n' +
					'uniform float lineSync;\n' +
					'uniform float lineHeight;\n' + //for scanlines and distortion
					'uniform float distortion;\n' +
					'uniform float vsync;\n' +
					'uniform float bars;\n' +
					'uniform float frameSharpness;\n' +
					'uniform float frameShape;\n' +
					'uniform float frameLimit;\n' +
					'uniform vec4 frameColor;\n' +
					'\n' +
					//todo: need much better pseudo-random number generator
					Seriously.util.shader.noiseHelpers +
					Seriously.util.shader.snoise2d +
					'\n' +
					'void main(void) {\n' +
					'	vec2 texCoord = vTexCoord;\n' +

						//distortion
					'	float drandom = snoise(vec2(time * 50.0, texCoord.y /lineHeight));\n' +
					'	float distortAmount = distortion * (drandom - 0.25) * 0.5;\n' +
						//line sync
					'	vec4 particleOffset = texture2D(particles, vec2(0.0, texCoord.y));\n' +
					'	distortAmount -= lineSync * (2.0 * particleOffset.a - 0.5);\n' +

					'	texCoord.x -= distortAmount;\n' +
					//'	texCoord.x = max(0.0, texCoord.x);\n' +
					//'	texCoord.x = min(1.0, texCoord.x);\n' +
					'	texCoord.x = mod(texCoord.x, 1.0);\n' +

						//vertical sync
					'	float roll;\n' +
					'	if (vsync != 0.0) {\n' +
					'		roll = fract(time / vsync);\n' +
					'		texCoord.y = mod(texCoord.y - roll, 1.0);\n' +
					'	}\n' +

					'	vec4 pixel = texture2D(source, texCoord);\n' +

						//horizontal bars
					'	float barsAmount = particleOffset.r;\n' +
					'	if (barsAmount > 0.0) {\n' +
					/*
					'		pixel = vec4(HardLight(pixel.r * bars, barsAmount),' +
								'HardLight(pixel.g * bars, barsAmount),' +
								'HardLight(pixel.b * bars, barsAmount),' +
								'pixel.a);\n' +
					*/
					'		pixel = vec4(pixel.r + bars * barsAmount,' +
								'pixel.g + bars * barsAmount,' +
								'pixel.b + bars * barsAmount,' +
								'pixel.a);\n' +
					'	}\n' +

					'	if (mod(texCoord.y / lineHeight, 2.0) < 1.0 ) {\n' +
					'		pixel.rgb *= (1.0 - scanlines);\n' +
					'	}\n' +

					'	float f = (1.0 - vPosition.x * vPosition.x) * (1.0 - vPosition.y * vPosition.y);\n' +
					'	float frame = clamp( frameSharpness * (pow(f, frameShape) - frameLimit), 0.0, 1.0);\n' +

					//'	gl_FragColor.r = vec4(1.0);\n' +

					'	gl_FragColor = mix(frameColor, pixel, frame); //vec4(vec3(particleOffset), 1.0);\n' +
					//'	gl_FragColor = vec4(particleOffset);\n' +
					//'	gl_FragColor.a = 1.0;\n' +
					'}\n';

				return shaderSource;
			},
			resize: function () {
				particleFrameBuffer.resize(1, Math.max(1, this.height / 2));
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				var doParticles = (lastTime !== this.inputs.time),
					vsyncPeriod;

				if (lastHeight !== this.height) {
					lastHeight = this.height;
					doParticles = true;
				}

				//todo: make this configurable?
				uniforms.lineHeight = 1 / this.height;

				if (this.inputs.verticalSync) {
					vsyncPeriod = 0.2 / this.inputs.verticalSync;
					uniforms.vsync = vsyncPeriod;
				} else {
					vsyncPeriod = 1;
					uniforms.vsync = 0;
				}
				uniforms.time = (this.inputs.time % (10000 * vsyncPeriod)) / 1000;
				uniforms.distortion = Math.random() * this.inputs.distortion;

				//render particle canvas and attach uniform
				//todo: this is a good spot for parallel processing. ParallelArray maybe?
				if (doParticles && (this.inputs.lineSync || this.inputs.bars)) {
					particleShader.use();
					gl.viewport(0, 0, 1, this.height / 2);
					gl.bindFramebuffer(gl.FRAMEBUFFER, particleFrameBuffer.frameBuffer);
					gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
					gl.enableVertexAttribArray(particleShader.location.particle);
					gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
					gl.vertexAttribPointer(particleShader.location.particle, particleBuffer.itemSize, gl.FLOAT, false, 0, 0);
					gl.enable(gl.BLEND);
					gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
					particleShader.time.set(uniforms.time);
					particleShader.height.set(this.height);
					gl.drawArrays(gl.POINTS, 0, particleCount);

					lastTime = this.inputs.time;
				}
				uniforms.particles = particleFrameBuffer.texture;

				parent(shader, model, uniforms, frameBuffer);
			},
			destroy: function () {
				particleBuffer = null;
				if (particleFrameBuffer) {
					particleFrameBuffer.destroy();
					particleFrameBuffer = null;
				}
			}
		};
	},
	{
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			time: {
				type: 'number',
				defaultValue: 0
			},
			distortion: {
				type: 'number',
				defaultValue: 0.1,
				min: 0,
				max: 1
			},
			verticalSync: {
				type: 'number',
				defaultValue: 0.1,
				min: 0,
				max: 1
			},
			lineSync: {
				type: 'number',
				uniform: 'lineSync',
				defaultValue: 0.2,
				min: 0,
				max: 1
			},
			scanlines: {
				type: 'number',
				uniform: 'scanlines',
				defaultValue: 0.3,
				min: 0,
				max: 1
			},
			bars: {
				type: 'number',
				uniform: 'bars',
				defaultValue: 0,
				min: 0,
				max: 1
			},
			frameShape: {
				type: 'number',
				uniform: 'frameShape',
				min: 0,
				max: 2,
				defaultValue: 0.27
			},
			frameLimit: {
				type: 'number',
				uniform: 'frameLimit',
				min: -1,
				max: 1,
				defaultValue: 0.34
			},
			frameSharpness: {
				type: 'number',
				uniform: 'frameSharpness',
				min: 0,
				max: 40,
				defaultValue: 8.4
			},
			frameColor: {
				type: 'color',
				uniform: 'frameColor',
				defaultValue: [0, 0, 0, 1]
			}
		},
		title: 'TV Glitch'
	});
}));
