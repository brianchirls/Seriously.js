/* global define, require, exports, Float32Array */
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

	/*
	todo: if transforms are used, do multiple passes and enable depth testing?
	todo: for now, only supporting float blend modes. Add complex ones
	todo: apply proper credit and license

	Adapted from blend mode shader by Romain Dura
	http://mouaif.wordpress.com/2009/01/05/photoshop-math-with-glsl-shaders/
	*/

	function vectorBlendFormula(formula, base, blend) {
		function replace(channel) {
			var r = {
				base: (base || 'base') + '.' + channel,
				blend: (blend || 'blend') + '.' + channel
			};
			return function (match) {
				return r[match] || match;
			};
		}

		return 'vec3(' +
			formula.replace(/blend|base/g, replace('r')) + ', ' +
			formula.replace(/blend|base/g, replace('g')) + ', ' +
			formula.replace(/blend|base/g, replace('b')) +
			')';
	}

	var blendModes = {
		normal: 'blend',
		lighten: 'max(blend, base)',
		darken: 'min(blend, base)',
		multiply: '(base * blend)',
		average: '(base + blend / TWO)',
		add: 'min(base + blend, ONE)',
		subtract: 'max(base + blend - ONE, ZERO)',
		difference: 'abs(base - blend)',
		negation: '(ONE - abs(ONE - base - blend))',
		exclusion: '(base + blend - TWO * base * blend)',
		screen: '(ONE - ((ONE - base) * (ONE - blend)))',
		lineardodge: 'min(base + blend, ONE)',
		phoenix: '(min(base, blend) - max(base, blend) + ONE)',
		linearburn: 'max(base + blend - ONE, ZERO)', //same as subtract?

		overlay: vectorBlendFormula('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))'),
		softlight: vectorBlendFormula('blend < 0.5 ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend))'),
		hardlight: vectorBlendFormula('base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend))', 'blend', 'base'),
		colordodge: vectorBlendFormula('blend == 1.0 ? blend : min(base / (1.0 - blend), 1.0)'),
		colorburn: vectorBlendFormula('blend == 0.0 ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0)'),
		linearlight: vectorBlendFormula('BlendLinearLightf(base, blend)'),
		vividlight: vectorBlendFormula('BlendVividLightf(base, blend)'),
		pinlight: vectorBlendFormula('BlendPinLightf(base, blend)'),
		hardmix: vectorBlendFormula('BlendHardMixf(base, blend)'),
		reflect: vectorBlendFormula('BlendReflectf(base, blend)'),
		glow: vectorBlendFormula('BlendReflectf(blend, base)')
	},
	nativeBlendModes = {
		normal: ['FUNC_ADD', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'SRC_ALPHA', 'DST_ALPHA']/*,
		add: ['FUNC_ADD', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'SRC_ALPHA', 'DST_ALPHA']*/
	},
	identity = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);

	Seriously.plugin('blend', function () {
		var topUniforms,
			bottomUniforms,
			topOpts = {
				clear: false
			},
			inputs,
			gl;

		function updateDrawFunction() {
			var nativeMode = inputs && nativeBlendModes[inputs.mode];
			if (nativeMode && gl) {
				topOpts.blendEquation = gl[nativeMode[0]];
				topOpts.srcRGB = gl[nativeMode[1]];
				topOpts.dstRGB = gl[nativeMode[2]];
				topOpts.srcAlpha = gl[nativeMode[3]];
				topOpts.dstAlpha = gl[nativeMode[4]];
			}
		}

		// custom resize method
		this.resize = function () {
			var width,
				height,
				mode = this.inputs.sizeMode,
				node,
				fn,
				i,
				bottom = this.inputs.bottom,
				top = this.inputs.top;

			if (mode === 'bottom' || mode === 'top') {
				node = this.inputs[mode];
				if (node) {
					width = node.width;
					height = node.height;
				} else {
					width = 1;
					height = 1;
				}
			} else {
				if (bottom) {
					if (top) {
						fn = (mode === 'union' ? Math.max : Math.min);
						width = fn(bottom.width, top.width);
						height = fn(bottom.height, top.height);
					} else {
						width = bottom.width;
						height = bottom.height;
					}
				} else if (top) {
					width = top.width;
					height = top.height;
				} else {
					width = 1;
					height = 1;
				}
			}

			if (this.width !== width || this.height !== height) {
				this.width = width;
				this.height = height;

				this.uniforms.resolution[0] = width;
				this.uniforms.resolution[1] = height;

				if (this.frameBuffer) {
					this.frameBuffer.resize(width, height);
				}

				this.emit('resize');
				this.setDirty();
			}

			this.uniforms.resBottom[0] = bottom.width;
			this.uniforms.resBottom[1] = bottom.height;
			this.uniforms.resTop[0] = top.width;
			this.uniforms.resTop[1] = top.height;

			if (topUniforms) {
				if (bottom) {
					bottomUniforms.resolution[0] = bottom.width;
					bottomUniforms.resolution[1] = bottom.height;
				}
				if (top) {
					topUniforms.resolution[0] = top.width;
					topUniforms.resolution[1] = top.height;
				}
			}

			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		};

		this.uniforms.resTop = [1, 1];
		this.uniforms.resBottom = [1, 1];

		return {
			initialize: function (initialize) {
				inputs = this.inputs;
				initialize();
				gl = this.gl;
				updateDrawFunction();
			},
			shader: function (inputs, shaderSource) {
				var mode = inputs.mode || 'normal',
					node;
				mode = mode.toLowerCase();

				if (nativeBlendModes[mode]) {
					//todo: move this to an 'update' event for 'mode' input
					if (!topUniforms) {
						node = this.inputs.top;
						topUniforms = {
							resolution: [
								node && node.width || 1,
								node && node.height || 1
							],
							targetRes: this.uniforms.resolution,
							source: node,
							transform: node && node.cumulativeMatrix || identity,
							opacity: this.inputs.opacity
						};

						node = this.inputs.bottom;
						bottomUniforms = {
							resolution: [
								node && node.width || 1,
								node && node.height || 1
							],
							targetRes: this.uniforms.resolution,
							source: node,
							transform: node && node.cumulativeMatrix || identity,
							opacity: 1
						};
					}

					shaderSource.vertex = [
						'precision mediump float;',

						'attribute vec4 position;',
						'attribute vec2 texCoord;',

						'uniform vec2 resolution;',
						'uniform vec2 targetRes;',
						'uniform mat4 transform;',

						'varying vec2 vTexCoord;',

						'void main(void) {',
						// first convert to screen space
						'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
						'	screenPosition = transform * screenPosition;',

						// convert back to OpenGL coords
						'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
						'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
						'	gl_Position.xy *= resolution / targetRes;',
						'	gl_Position.w = screenPosition.w;',
						'	vTexCoord = texCoord;',
						'}\n'
					].join('\n');

					shaderSource.fragment = [
						'precision mediump float;',
						'varying vec2 vTexCoord;',
						'uniform sampler2D source;',
						'uniform float opacity;',
						'void main(void) {',
						'	gl_FragColor = texture2D(source, vTexCoord);',
						'	gl_FragColor.a *= opacity;',
						'}'
					].join('\n');

					return shaderSource;
				}

				topUniforms = null;
				bottomUniforms = null;

				//todo: need separate texture coords for different size top/bottom images
				shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 resBottom;',
					'uniform vec2 resTop;',

					'varying vec2 texCoordBottom;',
					'varying vec2 texCoordTop;',

					'const vec2 HALF = vec2(0.5);',

					'void main(void) {',
					//we don't need to do a transform in this shader, since this effect is not "inPlace"
					'	gl_Position = position;',

					'	vec2 adjusted = (texCoord - HALF) * resolution;',

					'	texCoordBottom = adjusted / resBottom + HALF;',
					'	texCoordTop = adjusted / resTop + HALF;',
					'}'
				].join('\n');

				shaderSource.fragment = [
					'precision mediump float;',

					'const vec3 ZERO = vec3(0.0);',
					'const vec3 ONE = vec3(1.0);',
					'const vec3 HALF = vec3(0.5);',
					'const vec3 TWO = vec3(2.0);',

					'#define BlendAddf(base, blend)			min(base + blend, 1.0)',
					'#define BlendSubtractf(base, blend)	max(base + blend - 1.0, 0.0)',
					'#define BlendLinearDodgef(base, blend)	BlendAddf(base, blend)',
					'#define BlendLinearBurnf(base, blend)	BlendSubtractf(base, blend)',
					'#define BlendLightenf(base, blend)		max(blend, base)',
					'#define BlendDarkenf(base, blend)		min(blend, base)',
					'#define BlendLinearLightf(base, blend)	(blend < 0.5 ? BlendLinearBurnf(base, (2.0 * blend)) : BlendLinearDodgef(base, (2.0 * (blend - 0.5))))',
					'#define BlendScreenf(base, blend)		(1.0 - ((1.0 - base) * (1.0 - blend)))',
					'#define BlendOverlayf(base, blend)		(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
					'#define BlendSoftLightf(base, blend)	((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)))',
					'#define BlendColorDodgef(base, blend)	((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0))',
					'#define BlendColorBurnf(base, blend)	((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0))',
					'#define BlendVividLightf(base, blend)	((blend < 0.5) ? BlendColorBurnf(base, (2.0 * blend)) : BlendColorDodgef(base, (2.0 * (blend - 0.5))))',
					'#define BlendPinLightf(base, blend)	((blend < 0.5) ? BlendDarkenf(base, (2.0 * blend)) : BlendLightenf(base, (2.0 *(blend - 0.5))))',
					'#define BlendHardMixf(base, blend)		((BlendVividLightf(base, blend) < 0.5) ? 0.0 : 1.0)',
					'#define BlendReflectf(base, blend)		((blend == 1.0) ? blend : min(base * base / (1.0 - blend), 1.0))',

					/*
					Linear Light is another contrast-increasing mode
					If the blend color is darker than midgray, Linear Light darkens the image
					by decreasing the brightness. If the blend color is lighter than midgray,
					the result is a brighter image due to increased brightness.
					*/

					'#define BlendFunction(base, blend) ' + blendModes[mode],

					'varying vec2 texCoordBottom;',
					'varying vec2 texCoordTop;',

					'uniform sampler2D top;',
					'uniform sampler2D bottom;',
					'uniform float opacity;',

					'vec3 BlendOpacity(vec4 base, vec4 blend, float opacity) {',
					//apply blend, then mix by (opacity * blend.a)
					'	vec3 blendedColor = BlendFunction(base.rgb, blend.rgb);',
					'	return mix(base.rgb, blendedColor, opacity * blend.a);',
					'}',

					'void main(void) {',
					'	vec4 topPixel = texture2D(top, texCoordTop);',
					'	vec4 bottomPixel = texture2D(bottom, texCoordBottom);',

					'	if (topPixel.a == 0.0) {',
					'		gl_FragColor = bottomPixel;',
					'	} else {',
					'		gl_FragColor = vec4(BlendOpacity(bottomPixel, topPixel, opacity), bottomPixel.a);',
					'	}',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				if (nativeBlendModes[this.inputs.mode]) {
					if (this.inputs.bottom) {
						draw(shader, model, bottomUniforms, frameBuffer);
					} else {
						//just clear
						gl.viewport(0, 0, this.width, this.height);
						gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
						gl.clearColor(0.0, 0.0, 0.0, 0.0);
						gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
					}

					if (this.inputs.top && this.inputs.opacity) {
						draw(shader, model, topUniforms, frameBuffer, null, topOpts);
					}
				} else {
					draw(shader, model, uniforms, frameBuffer);
				}
			},
			inputs: {
				top: {
					type: 'image',
					uniform: 'top',
					update: function () {
						if (topUniforms) {
							topUniforms.source = this.inputs.top;
							topUniforms.transform = this.inputs.top.cumulativeMatrix || identity;
						}
						this.resize();
					}
				},
				bottom: {
					type: 'image',
					uniform: 'bottom',
					update: function () {
						if (bottomUniforms) {
							bottomUniforms.source = this.inputs.bottom;
							bottomUniforms.transform = this.inputs.bottom.cumulativeMatrix || identity;
						}
						this.resize();
					}
				},
				opacity: {
					type: 'number',
					uniform: 'opacity',
					defaultValue: 1,
					min: 0,
					max: 1,
					update: function (opacity) {
						if (topUniforms) {
							topUniforms.opacity = opacity;
						}
					}
				},
				sizeMode: {
					type: 'enum',
					defaultValue: 'bottom',
					options: [
						'bottom',
						'top',
						'union',
						'intersection'
					],
					update: function () {
						this.resize();
					}
				},
				mode: {
					type: 'enum',
					shaderDirty: true,
					defaultValue: 'normal',
					options: [
						['normal', 'Normal'],
						['lighten', 'Lighten'],
						['darken', 'Darken'],
						['multiply', 'Multiply'],
						['average', 'Average'],
						['add', 'Add'],
						['subtract', 'Subtract'],
						['difference', 'Difference'],
						['negation', 'Negation'],
						['exclusion', 'Exclusion'],
						['screen', 'Screen'],
						['overlay', 'Overlay'],
						['softlight', 'Soft Light'],
						['hardlight', 'Hard Light'],
						['colordodge', 'Color Dodge'],
						['colorburn', 'Color Burn'],
						['lineardodge', 'Linear Dodge'],
						['linearburn', 'Linear Burn'],
						['linearlight', 'Linear Light'],
						['vividlight', 'Vivid Light'],
						['pinlight', 'Pin Light'],
						['hardmix', 'Hard Mix'],
						['reflect', 'Reflect'],
						['glow', 'Glow'],
						['phoenix', 'Phoenix']
					],
					update: function () {
						updateDrawFunction();
					}
				}
			}
		};
	},
	{
		inPlace: function () {
			return !!nativeBlendModes[this.inputs.mode];
		},
		description: 'Blend two layers',
		title: 'Blend'
	});
}));
