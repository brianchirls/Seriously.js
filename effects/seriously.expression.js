/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'), require('jsep'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously', 'jsep'], factory);
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously, root.jsep);
	}
}(this, function (Seriously, jsep, undefined) {
	'use strict';

	function formatFloat(n) {
		if (n - Math.floor(n) === 0) {
			return n + '.0';
		}
		return n;
	}

	var symbols = {
			red: 'rgba.r',
			blue: 'rgba.b',
			green: 'rgba.g',
			alpha: 'rgba.a',
			x: 'dim.x',
			y: 'dim.y',
			width: 'resolution.x',
			height: 'resolution.y',
			a: 'a',
			b: 'b',
			c: 'c',
			d: 'd',
			luma: 'luma' //todo: multiple dependencies

			/*
			todo:
			- time of day in seconds
			- video time
			- year, month, day
			- datetime in milliseconds
			- transform?
			- transformed position?
			*/
		},
		definitions = {
			and: [
				'float and(float a, float b) {',
				'	if (a == 0.0) {',
				'		return 0.0;',
				'	}',
				'	return b;',
				'}'
			].join('\n'),
			or: [
				'float or(float a, float b) {',
				'	if (a != 0.0) {',
				'		return a;',
				'	}',
				'	return b;',
				'}'
			].join('\n')
		},
		declarations = {
			dim: 'vec2 dim = vTexCoord * resolution;',
			rgba: 'vec4 rgba = texture2D(source, vTexCoord);',
			luma: 'float luma = dot(rgba, vec3(0.2125,0.7154,0.0721));'
		},
		functions = {
			radians: 1,
			degrees: 1,
			sin: 1,
			cos: 1,
			tan: 1,
			asin: 1,
			acos: 1,
			atan: 1,
			//atan2: 2, //todo: define this
			pow: 2,
			exp: 1,
			log: 1,
			exp2: 1,
			log2: 1,
			sqrt: 1,
			inversesqrt: 1,
			abs: 1,
			sign: 1,
			floor: 1,
			ceil: 1,
			fract: 1,
			mod: 2,
			min: 2,
			max: 2,
			clamp: 3,
			mix: 3,
			step: 2,
			smoothstep: 3,

			//custom logic functions
			and: 2,
			or: 2

			/*
			todo:
			noise, random, hue, sat, lightness, hslRed, hslGreen, hslBlue,
			int, sinh, cosh, tanh, mantissa, hypot, lerp, step
			noise with multiple octaves (See fBm)
			*/
		},
		unaryOps = {
			'-': true,
			'!': true,
			//'~': false, //todo: implement this or just get rid of it?
			'+': true
		},
		binaryOps = {
			//true means it's a comparison and needs to be converted to float
			'+': false,
			'-': false,
			'*': false,
			'/': false,
			'%': 'mod',
			'&&': 'and',
			'||': 'or',
			//'^^': false, //todo: implement xor?
			//'&',
			//'|',
			//'<<',
			//'>>',
			'===': '==',
			'==': true,
			'!==': '!=',
			'!=': true,
			'>=': true,
			'<=': true,
			'<': true,
			'>': true
		},
		objRegex = /(\w+)(\.\w+)?/;

	['E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2'].forEach(function (key) {
		symbols[key] = key;
		declarations[key] = 'const float ' + key + ' = ' + Math[key] + ';';
	});

	Seriously.plugin('expression', function () {
		var me = this;

		function updateSingle() {
			var inputs = me.inputs;

			if (inputs.blue === inputs.red &&
				inputs.green === inputs.blue) {
				inputs.rgb = inputs.red;
			} else {
				inputs.rgb = '';
			}
		}

		function resize() {
			if (me.inputs.source) {
				me.width = me.inputs.width = me.inputs.source.width;
				me.height = me.inputs.height = me.inputs.source.height;
			}
		}

		return {
			shader: function (inputs, shaderSource) {
				var expressions = {},
					channels = {
						red: '',
						green: '',
						blue: '',
						alpha: ''
					},
					dependencies = {},
					deps,
					expr,
					key,
					statements,
					cs = [],
					tree;

				function makeExpression(tree) {
					var verb, x, i,
						args;
					/*
					COMPOUND = 'Compound'
					*/

					//We do not have any objects to offer
					if (tree.type === 'MemberExpression') {
						throw new Error('Expression Error: Unknown object "' + (tree.object.name || 'this') + '"');
					}

					if (tree.type === 'BinaryExpression' || tree.type === 'LogicalExpression') {
						if (!tree.right) {
							throw new Error('Expression Error: Bad binary expression');
						}

						//jsep seems to parse some unary expressions as binary with missing left side
						//todo: consider removing this if/when jsep fixes it. file a github issue
						if (!tree.left) {
							tree.type = 'UnaryExpression';
							tree.argument = tree.right;
							return makeExpression(tree);
						}

						verb = tree.operator;
						x = binaryOps[verb];
						if (x === undefined) {
							throw new Error('Expression Error: Unknown operator "' + verb + '"');
						}

						if (typeof x === 'string') {
							if (x in binaryOps) {
								verb = binaryOps[x];
								x = binaryOps[verb];
							} else if (functions[x] === 2) {
								deps[x] = true;
								return x + '(' + makeExpression(tree.left) + ', ' + makeExpression(tree.right) + ')';
							}
						}

						return (x ? 'float' : '') + '(' + makeExpression(tree.left) + ' ' + verb + ' ' + makeExpression(tree.right) + ')';
					}

					if (tree.type === 'CallExpression') {
						if (tree.callee.type !== 'Identifier') {
							throw new Error('Expression Error: Unknown function');
						}

						verb = tree.callee.name;
						x = functions[verb];
						if (x === undefined) {
							throw new Error('Expression Error: Unknown function "' + verb + '"');
						}

						if (x > tree.arguments.length) {
							throw new Error('Expression Error: Function "' + verb + '" requires at least ' + x + ' arguments');
						}

						args = [];
						for (i = 0; i < x; i++) {
							args.push(makeExpression(tree.arguments[i]));
						}
						deps[verb] = true;
						return verb + '(' + args.join(', ') + ')';
					}

					if (tree.type === 'Identifier') {
						x = symbols[tree.name];
						if (!x) {
							throw new Error('Expression Error: Unknown identifier "' + tree.name + '"');
						}

						args = objRegex.exec(x);
						if (args && declarations[args[1]]) {
							deps[args[1]] = true;
						}
						return x;
					}

					if (tree.type === 'Literal') {
						if (tree.raw === 'true') {
							return 1.0;
						}

						if (tree.raw === 'true') {
							return 0.0;
						}

						if (typeof tree.value !== 'number' || isNaN(tree.value)) {
							throw new Error('Expression Error: Invalid literal ' + tree.raw);
						}

						return formatFloat(tree.value);
					}

					if (tree.type === 'UnaryExpression') {
						verb = tree.operator;
						x = unaryOps[verb];
						if (!x) {
							throw new Error('Expression Error: Unknown operator "' + verb + '"');
						}

						//todo: are there any unary operators that could become functions?
						return verb + '(' + makeExpression(tree.argument) + ')';
					}
				}

				for (key in channels) {
					if (channels.hasOwnProperty(key)) {
						expr = inputs[key] || key;
						channels[key] = expr;
						expressions[expr] = '';
					}
				}

				for (expr in expressions) {
					if (expressions.hasOwnProperty(expr)) {
						try {
							deps = {};
							tree = jsep(expr);
							//todo: convert this to a function?
							expressions[expr] = makeExpression(tree);

							//flag any required declarations/precalculations
							for (key in deps) {
								if (deps.hasOwnProperty(key)) {
									dependencies[key] = deps[key];
								}
							}

							//special case for luma. todo: generalize if we need to
							if (deps.luma) {
								dependencies.rgba = true;
							}
						} catch (parseError) {
							console.log(parseError.message);
							expressions[expr] = '0.0';
						}
					}
				}

				statements = [
					'precision mediump float;',
					'varying vec2 vTexCoord;',
					'varying vec4 vPosition;',

					'uniform sampler2D source;',
					'uniform float a, b, c, d;',
					'uniform vec2 resolution;',
				];

				for (key in dependencies) {
					if (dependencies.hasOwnProperty(key)) {
						if (definitions[key]) {
							statements.push(definitions[key]);
						}
					}
				}

				statements.push('void main(void) {');

				for (key in dependencies) {
					if (dependencies.hasOwnProperty(key)) {
						if (declarations[key]) {
							statements.push('\t' + declarations[key]);
						}
					}
				}

				/*
				todo: assign duplicate expressions to temp variables
				for (expr in expressions) {
					if (expressions.hasOwnProperty(expr)) {
						statements.push('float val' + index = )
					}
				}
				*/

				for (key in channels) {
					if (channels.hasOwnProperty(key)) {
						expr = channels[key];
						cs.push(expressions[expr]);
					}
				}

				statements.push(
					'\tgl_FragColor = vec4(',
					'\t\t' + cs.join(',\n\t\t'),
					'\t);',
					'}'
				);

				shaderSource.fragment = statements.join('\n');

				return shaderSource;
			},
			inputs: {
				source: {
					type: 'image',
					uniform: 'source',
					update: resize,
					shaderDirty: true
				},
				a: {
					type: 'number',
					uniform: 'a',
					defaultValue: 0
				},
				b: {
					type: 'number',
					uniform: 'b',
					defaultValue: 0
				},
				c: {
					type: 'number',
					uniform: 'c',
					defaultValue: 0
				},
				d: {
					type: 'number',
					uniform: 'd',
					defaultValue: 0
				},
				rgb: {
					type: 'string',
					update: function (val) {
						var inputs = me.inputs;
						inputs.red = inputs.green = inputs.blue = val;
					},
					shaderDirty: true
				},
				red: {
					type: 'string',
					update: updateSingle,
					shaderDirty: true
				},
				green: {
					type: 'string',
					update: updateSingle,
					shaderDirty: true
				},
				blue: {
					type: 'string',
					update: updateSingle,
					shaderDirty: true
				},
				alpha: {
					type: 'string',
					shaderDirty: true
				},
				width: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				},
				height: {
					type: 'number',
					min: 0,
					step: 1,
					update: resize,
					defaultValue: 0
				}
			}
		};
	},
	{
		inPlace: false,
		title: 'Expression'
	});
}));
