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
}(this, function (Seriously, undefined) {
	'use strict';

	/*
	todo: if transforms are used, do multiple passes and enable depth testing?
	todo: for now, only supporting float blend modes. Add complex ones
	todo: apply proper credit and license

	Blend mode shader by Romain Dura
	http://mouaif.wordpress.com/2009/01/05/photoshop-math-with-glsl-shaders/

	*/
	var modes = {
		'normal': 'BlendNormal',
		'lighten': 'BlendLighten',
		'darken': 'BlendDarken',
		'multiply': 'BlendMultiply',
		'average': 'BlendAverage',
		'add': 'BlendAdd',
		'subtract': 'BlendSubtract',
		'difference': 'BlendDifference',
		'negation': 'BlendNegation',
		'exclusion': 'BlendExclusion',
		'screen': 'BlendScreen',
		'overlay': 'BlendOverlay',
		'softlight': 'BlendSoftLight',
		'hardlight': 'BlendHardLight',
		'colordodge': 'BlendColorDodge',
		'colorburn': 'BlendColorBurn',
		'lineardodge': 'BlendLinearDodge',
		'linearburn': 'BlendLinearBurn',
		'linearlight': 'BlendLinearLight',
		'vividlight': 'BlendVividLight',
		'pinlight': 'BlendPinLight',
		'hardmix': 'BlendHardMix',
		'reflect': 'BlendReflect',
		'glow': 'BlendGlow',
		'phoenix': 'BlendPhoenix'
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
			};

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

		return {
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
							opacity: 1
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
						'varying vec4 vPosition;',

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
						'	vPosition = gl_Position;',
						'}\n'
					].join('\n');

					shaderSource.fragment = [
						'precision mediump float;',
						'varying vec2 vTexCoord;',
						'varying vec4 vPosition;',
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

				mode = modes[mode] || 'BlendNormal';
				shaderSource.fragment = [
					'#define BlendFunction ' + mode,
					'precision mediump float;',

					'#define BlendLinearDodgef				BlendAddf',
					'#define BlendLinearBurnf				BlendSubtractf',
					'#define BlendAddf(base, blend)			min(base + blend, 1.0)',
					'#define BlendSubtractf(base, blend)	max(base + blend - 1.0, 0.0)',
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
					** Vector3 blending modes
					*/

					// Component wise blending
					'#define Blend(base, blend, funcf)		vec3(funcf(base.r, blend.r), funcf(base.g, blend.g), funcf(base.b, blend.b))',
					'#define BlendNormal(base, blend)		(blend)',
					'#define BlendLighten					BlendLightenf',
					'#define BlendDarken					BlendDarkenf',
					'#define BlendMultiply(base, blend)		(base * blend)',
					'#define BlendAverage(base, blend)		((base + blend) / 2.0)',
					'#define BlendAdd(base, blend)			min(base + blend, vec3(1.0))',
					'#define BlendSubtract(base, blend)	max(base + blend - vec3(1.0), vec3(0.0))',
					'#define BlendDifference(base, blend)	abs(base - blend)',
					'#define BlendNegation(base, blend)		(vec3(1.0) - abs(vec3(1.0) - base - blend))',
					'#define BlendExclusion(base, blend)	(base + blend - 2.0 * base * blend)',
					'#define BlendScreen(base, blend)		Blend(base, blend, BlendScreenf)',
					'#define BlendOverlay(base, blend)		Blend(base, blend, BlendOverlayf)',
					'#define BlendSoftLight(base, blend)	Blend(base, blend, BlendSoftLightf)',
					'#define BlendHardLight(base, blend)	BlendOverlay(blend, base)',
					'#define BlendColorDodge(base, blend)	Blend(base, blend, BlendColorDodgef)',
					'#define BlendColorBurn(base, blend)	Blend(base, blend, BlendColorBurnf)',
					'#define BlendLinearDodge				BlendAdd',
					'#define BlendLinearBurn				BlendSubtract',
					// Linear Light is another contrast-increasing mode
					// If the blend color is darker than midgray, Linear Light darkens the image by decreasing the brightness. If the blend color is lighter than midgray, the result is a brighter image due to increased brightness.
					'#define BlendLinearLight(base, blend)	Blend(base, blend, BlendLinearLightf)',
					'#define BlendVividLight(base, blend)	Blend(base, blend, BlendVividLightf)',
					'#define BlendPinLight(base, blend)		Blend(base, blend, BlendPinLightf)',
					'#define BlendHardMix(base, blend)		Blend(base, blend, BlendHardMixf)',
					'#define BlendReflect(base, blend)		Blend(base, blend, BlendReflectf)',
					'#define BlendGlow(base, blend)			BlendReflect(blend, base)',
					'#define BlendPhoenix(base, blend)		(min(base, blend) - max(base, blend) + vec3(1.0))',
					//'#define BlendOpacity(base, blend, F, O)	(F(base, blend) * O + blend * (1.0 - O))',
					//'#define BlendOpacity(base, blend, BlendFn, Opacity, Alpha)	((BlendFn(base.rgb * blend.a * Opacity, blend.rgb * blend.a * Opacity) + base.rgb * base.a * (1.0 - blend.a * Opacity)) / Alpha)',

					'varying vec2 vTexCoord;',
					'varying vec4 vPosition;',

					'uniform sampler2D top;',
					'uniform sampler2D bottom;',
					'uniform float opacity;',

					'vec3 BlendOpacity(vec4 base, vec4 blend, float opacity, float alpha) {',
					'	vec3 baseRGB = base.rgb * blend.a * opacity;',
					'	vec3 blendRGB = blend.rgb * blend.a * opacity;',
					'	return (BlendFunction(baseRGB, blendRGB) + base.rgb * base.a * (1.0 - blend.a * opacity)) / alpha;',
					'}',

					'void main(void) {',
					'	vec3 color;',
					'	vec4 topPixel = texture2D(top, vTexCoord);',
					'	vec4 bottomPixel = texture2D(bottom, vTexCoord);',

					'	float alpha = topPixel.a + bottomPixel.a * (1.0 - topPixel.a);',
					'	if (alpha == 0.0) {',
					'		color = vec3(0.0);',
					'	} else {',
					'		color = BlendOpacity(bottomPixel, topPixel, opacity, alpha);',
					'	}',
					'	gl_FragColor = vec4(color, alpha);',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				if (nativeBlendModes[this.inputs.mode]) {
					if (this.inputs.bottom) {
						draw(shader, model, bottomUniforms, frameBuffer);
					}

					if (this.inputs.top) {
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
						['substract', 'Substract'],
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
					]
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
