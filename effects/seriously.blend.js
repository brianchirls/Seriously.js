(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

/*
todo: for prototype version, blend only handles two layers. this should handle multiple layers?
todo: if transforms are used, do multiple passes and enable depth testing?
todo: for now, only supporting float blend modes. Add complex ones
todo: apply proper credit and license

** Romain Dura | Romz
** Blog: http://blog.mouaif.org
** Post: http://blog.mouaif.org/?p=94

*/
Seriously.plugin('blend', (function () {
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
	};
	return {
		initialize: function(parent) {
			parent();
		},
		shader: function(inputs, shaderSource, utilities) {
			var mode = inputs.mode || 'normal';
			mode = mode.toLowerCase();
			mode = modes[mode] || 'BlendNormal';
			
			shaderSource.fragment = '#define BlendFunction ' + mode + '\n' +
				'#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'#define BlendLinearDodgef				BlendAddf\n' +
				'#define BlendLinearBurnf				BlendSubtractf\n' +
				'#define BlendAddf(base, blend)			min(base + blend, 1.0)\n' +
				'#define BlendSubtractf(base, blend)	max(base + blend - 1.0, 0.0)\n' +
				'#define BlendLightenf(base, blend)		max(blend, base)\n' +
				'#define BlendDarkenf(base, blend)		min(blend, base)\n' +
				'#define BlendLinearLightf(base, blend)	(blend < 0.5 ? BlendLinearBurnf(base, (2.0 * blend)) : BlendLinearDodgef(base, (2.0 * (blend - 0.5))))\n' +
				'#define BlendScreenf(base, blend)		(1.0 - ((1.0 - base) * (1.0 - blend)))\n' +
				'#define BlendOverlayf(base, blend)		(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))\n' +
				'#define BlendSoftLightf(base, blend)	((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)))\n' +
				'#define BlendColorDodgef(base, blend)	((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0))\n' +
				'#define BlendColorBurnf(base, blend)	((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0))\n' +
				'#define BlendVividLightf(base, blend)	((blend < 0.5) ? BlendColorBurnf(base, (2.0 * blend)) : BlendColorDodgef(base, (2.0 * (blend - 0.5))))\n' +
				'#define BlendPinLightf(base, blend)	((blend < 0.5) ? BlendDarkenf(base, (2.0 * blend)) : BlendLightenf(base, (2.0 *(blend - 0.5))))\n' +
				'#define BlendHardMixf(base, blend)		((BlendVividLightf(base, blend) < 0.5) ? 0.0 : 1.0)\n' +
				'#define BlendReflectf(base, blend)		((blend == 1.0) ? blend : min(base * base / (1.0 - blend), 1.0))\n' +		
				/*
				** Vector3 blending modes
				*/
				
				// Component wise blending
				'#define Blend(base, blend, funcf)		vec3(funcf(base.r, blend.r), funcf(base.g, blend.g), funcf(base.b, blend.b))\n' +
				'#define BlendNormal(base, blend)		(blend)\n' +
				'#define BlendLighten					BlendLightenf\n' +
				'#define BlendDarken					BlendDarkenf\n' +
				'#define BlendMultiply(base, blend)		(base * blend)\n' +
				'#define BlendAverage(base, blend)		((base + blend) / 2.0)\n' +
				'#define BlendAdd(base, blend)			min(base + blend, vec3(1.0))\n' +
				'#define BlendSubtract(base, blend)	max(base + blend - vec3(1.0), vec3(0.0))\n' +
				'#define BlendDifference(base, blend)	abs(base - blend)\n' +
				'#define BlendNegation(base, blend)		(vec3(1.0) - abs(vec3(1.0) - base - blend))\n' +
				'#define BlendExclusion(base, blend)	(base + blend - 2.0 * base * blend)\n' +
				'#define BlendScreen(base, blend)		Blend(base, blend, BlendScreenf)\n' +
				'#define BlendOverlay(base, blend)		Blend(base, blend, BlendOverlayf)\n' +
				'#define BlendSoftLight(base, blend)	Blend(base, blend, BlendSoftLightf)\n' +
				'#define BlendHardLight(base, blend)	BlendOverlay(blend, base)\n' +
				'#define BlendColorDodge(base, blend)	Blend(base, blend, BlendColorDodgef)\n' +
				'#define BlendColorBurn(base, blend)	Blend(base, blend, BlendColorBurnf)\n' +
				'#define BlendLinearDodge				BlendAdd\n' +
				'#define BlendLinearBurn				BlendSubtract\n' +
				// Linear Light is another contrast-increasing mode
				// If the blend color is darker than midgray, Linear Light darkens the image by decreasing the brightness. If the blend color is lighter than midgray, the result is a brighter image due to increased brightness.
				'#define BlendLinearLight(base, blend)	Blend(base, blend, BlendLinearLightf)\n' +
				'#define BlendVividLight(base, blend)	Blend(base, blend, BlendVividLightf)\n' +
				'#define BlendPinLight(base, blend)		Blend(base, blend, BlendPinLightf)\n' +
				'#define BlendHardMix(base, blend)		Blend(base, blend, BlendHardMixf)\n' +
				'#define BlendReflect(base, blend)		Blend(base, blend, BlendReflectf)\n' +
				'#define BlendGlow(base, blend)			BlendReflect(blend, base)\n' +
				'#define BlendPhoenix(base, blend)		(min(base, blend) - max(base, blend) + vec3(1.0))\n' +
//				'#define BlendOpacity(base, blend, F, O)	(F(base, blend) * O + blend * (1.0 - O))\n' +
				'#define BlendOpacity(base, blend, F, O, A)	((F(base.rgb * blend.a * O, blend.rgb * blend.a * O) + base.rgb * base.a * (1.0 - blend.a * O)) / A)\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform sampler2D top;\n' +
				'\n' +
				'uniform sampler2D bottom;\n' +
				'\n' +
				'uniform float opacity;\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec3 color;\n' + 
				'	vec4 topPixel = texture2D(top, vTexCoord);\n' +
				'	vec4 bottomPixel = texture2D(bottom, vTexCoord);\n' +
//				'	topPixel.a *= opacity;\n' +
//				'	float alpha = 1.0 - (1.0 - topPixel.a) * (1.0 - bottomPixel.a);\n' +
				'	float alpha = topPixel.a + bottomPixel.a * (1.0 - topPixel.a);\n' +
				'	if (alpha == 0.0) {\n' +
				'		color = vec3(0.0);\n' +
				'	} else {\n' +
				'		color = BlendOpacity(bottomPixel, topPixel, BlendFunction, opacity, alpha);\n' +
				'	}\n' +
				'	gl_FragColor = vec4(color, alpha);\n' +
				'}\n';
			
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			top: {
				type: 'image',
				uniform: 'top'
			},
			bottom: {
				type: 'image',
				uniform: 'bottom'
			},
			opacity: {
				type: 'number',
				uniform: 'opacity',
				defaultValue: 1,
				min: 0,
				max: 1
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
		},
		description: 'Blend two layers',
		title: 'Blend'
	};
}()) );

}(window));
