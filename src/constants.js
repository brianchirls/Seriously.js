/*
 *   Global reference variables
 */

// http://www.w3.org/TR/css3-color/#svg-color
const colorNames = {
		transparent: [0, 0, 0, 0],
		black: [0, 0, 0, 1],
		red: [1, 0, 0, 1],
		green: [0, 128 / 255, 0, 1],
		blue: [0, 0, 1, 1],
		white: [1, 1, 1, 1],
		silver: [192 / 255, 192 / 255, 192 / 255, 1],
		gray: [128 / 255, 128 / 255, 128 / 255, 1],
		maroon: [128 / 255, 0, 0, 1],
		purple: [128 / 255, 0, 128 / 255, 1],
		fuchsia: [1, 0, 1, 1],
		lime: [0, 1, 0, 1],
		olive: [128 / 255, 128 / 255, 0, 1],
		yellow: [1, 1, 0, 1],
		navy: [0, 0, 128 / 255, 1],
		teal: [0, 128 / 255, 128 / 255, 1],
		aqua: [0, 1, 1, 1],
		orange: [1, 165 / 255, 0, 1]
	},

	colorRegex = /^(rgb|hsl)a?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*(\d+(\.\d*)?)\s*)?\)/i,
	hexColorRegex = /^#(([0-9a-fA-F]{3,8}))/,

	vectorFields = ['x', 'y', 'z', 'w'],
	colorFields = ['r', 'g', 'b', 'a'],

	outputRenderOptions = {
		srcRGB: 0x0302, //SRC_ALPHA
		dstRGB: 0x0303, //ONE_MINUS_SRC_ALPHA
		srcAlpha: 0x01, //ONE
		dstAlpha: 0x0303 //ONE_MINUS_SRC_ALPHA
	},

	shaderDebugConstants = [
		'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
		'MAX_FRAGMENT_UNIFORM_VECTORS',
		'MAX_TEXTURE_IMAGE_UNITS',
		'MAX_VARYING_VECTORS',
		'MAX_VERTEX_ATTRIBS',
		'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
		'MAX_VERTEX_UNIFORM_VECTORS'
	],

	shaderNameRegex = /^[\t ]*#define[\t ]+SHADER_NAME\s+([^$\n\r]+)/i,

	reservedEffectProperties = [
		'alias',
		'destroy',
		'effect',
		'id',
		'initialize',
		'inputs',
		'isDestroyed',
		'isReady',
		'matte',
		'off',
		'on',
		'readPixels',
		'render',
		'title',
		'update'
	],

	reservedTransformProperties = [
		'alias',
		'destroy',
		'id',
		'inputs',
		'isDestroyed',
		'isReady',
		'off',
		'on',
		'source',
		'title',
		'update'
	],

	reservedNames = [
		'aliases',
		'defaults',
		'destroy',
		'effect',
		'go',
		'id',
		'incompatible',
		'isDestroyed',
		'isEffect',
		'isNode',
		'isSource',
		'isTarget',
		'isTransform',
		'removeAlias',
		'render',
		'source',
		'stop',
		'target',
		'transform'
	],

	baseVertexShader = [
		'precision mediump float;',

		'attribute vec4 position;',
		'attribute vec2 texCoord;',

		'uniform vec2 resolution;',
		'uniform mat4 transform;',

		'varying vec2 vTexCoord;',

		'void main(void) {',
		// first convert to screen space
		'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
		'	screenPosition = transform * screenPosition;',

		// convert back to OpenGL coords
		'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
		'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
		'	gl_Position.w = screenPosition.w;',
		'	vTexCoord = texCoord;',
		'}\n'
	].join('\n'),

	baseFragmentShader = [
		'precision mediump float;',

		'varying vec2 vTexCoord;',

		'uniform sampler2D source;',

		'void main(void) {',
		/*
        '	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThanEqual(vTexCoord, vec2(1.0)))) {',
        '		gl_FragColor = vec4(0.0);',
        '	} else {',
        */
		'		gl_FragColor = texture2D(source, vTexCoord);',
		//'	}',
		'}'
	].join('\n');

let identity;

if (window.Float32Array) {
	identity = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	]);
}


export {
	colorNames,
	colorRegex,
	hexColorRegex,
	vectorFields,
	colorFields,
	outputRenderOptions,
	shaderDebugConstants,
	shaderNameRegex,
	reservedEffectProperties,
	reservedTransformProperties,
	reservedNames,
	baseVertexShader,
	baseFragmentShader,
	identity
};
