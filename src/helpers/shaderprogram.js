import { shaderDebugConstants, shaderNameRegex } from '../constants';
import logger from '../logger';

/**
 *  Utility class for building and accessing WebGL shaders.
 *
 *  @class ShaderProgram
 */

function ShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
	let program,
		vertexShader,
		fragmentShader,
		programError = '',
		shaderError,
		i, l,
		shaderNameRegexMatch,
		obj;

	function compileShader(source, fragment) {
		let shader;

		if (fragment) {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else {
			shader = gl.createShader(gl.VERTEX_SHADER);
		}

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			source = source.split(/[\n\r]/);
			for (let j = 0; j < source.length; j++) {
				source[j] = (j + 1) + ':\t' + source[j];
			}
			source.unshift('Error compiling ' + (fragment ? 'fragment' : 'vertex') + ' shader:');
			logger.error(source.join('\n'));
			throw new Error('Shader error: ' + gl.getShaderInfoLog(shader));
		}

		return shader;
	}

	function makeShaderSetter(info, loc) {
		if (info.type === gl.SAMPLER_2D) {
			return function (value) {
				info.glTexture = gl['TEXTURE' + value];
				gl.uniform1i(loc, value);
			};
		}

		if (info.type === gl.BOOL || info.type === gl.INT) {
			if (info.size > 1) {
				return function (value) {
					gl.uniform1iv(loc, value);
				};
			}

			return function (value) {
				gl.uniform1i(loc, value);
			};
		}

		if (info.type === gl.FLOAT) {
			if (info.size > 1) {
				return function (value) {
					gl.uniform1fv(loc, value);
				};
			}

			return function (value) {
				gl.uniform1f(loc, value);
			};
		}

		if (info.type === gl.FLOAT_VEC2) {
			return function (obj) {
				gl.uniform2f(loc, obj[0], obj[1]);
			};
		}

		if (info.type === gl.FLOAT_VEC3) {
			return function (obj) {
				gl.uniform3f(loc, obj[0], obj[1], obj[2]);
			};
		}

		if (info.type === gl.FLOAT_VEC4) {
			return function (obj) {
				gl.uniform4f(loc, obj[0], obj[1], obj[2], obj[3]);
			};
		}

		if (info.type === gl.FLOAT_MAT3) {
			return function (mat3) {
				gl.uniformMatrix3fv(loc, false, mat3);
			};
		}

		if (info.type === gl.FLOAT_MAT4) {
			return function (mat4) {
				gl.uniformMatrix4fv(loc, false, mat4);
			};
		}

		throw new Error('Unknown shader uniform type: ' + info.type);
	}

	function makeShaderGetter(loc) {
		return function () {
			return gl.getUniform(program, loc);
		};
	}

	vertexShader = compileShader(vertexShaderSource);
	fragmentShader = compileShader(fragmentShaderSource, true);

	program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	shaderError = gl.getShaderInfoLog(vertexShader);
	if (shaderError) {
		programError += 'Vertex shader error: ' + shaderError + '\n';
	}
	gl.attachShader(program, fragmentShader);
	shaderError = gl.getShaderInfoLog(fragmentShader);
	if (shaderError) {
		programError += 'Fragment shader error: ' + shaderError + '\n';
	}
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		programError += gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		shaderNameRegexMatch = shaderNameRegex.exec(vertexShaderSource) ||
			shaderNameRegex.exec(fragmentShaderSource);

		if (shaderNameRegexMatch) {
			programError = 'Shader = ' + shaderNameRegexMatch[1] + '\n' + programError;
		}

		shaderDebugConstants.forEach(function (c) {
			programError += '\n' + c + ': ' + gl.getParameter(gl[c]);
		});

		throw new Error('Could not initialize shader:\n' + programError);
	}

	gl.useProgram(program);

	this.uniforms = {};

	l = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
	for (i = 0; i < l; ++i) {
		obj = {
			info: gl.getActiveUniform(program, i)
		};

		obj.name = obj.info.name.replace(/\[0\]$/, '');
		obj.loc = gl.getUniformLocation(program, obj.name);
		obj.set = makeShaderSetter(obj.info, obj.loc);
		obj.get = makeShaderGetter(obj.loc);
		this.uniforms[obj.name] = obj;

		if (!this[obj.name]) {
			//for convenience
			this[obj.name] = obj;
		}
	}

	this.attributes = {};
	this.location = {};
	l = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
	for (i = 0; i < l; ++i) {
		obj = {
			info: gl.getActiveAttrib(program, i)
		};

		obj.name = obj.info.name;
		obj.location = gl.getAttribLocation(program, obj.name);
		this.attributes[obj.name] = obj;
		this.location[obj.name] = obj.location;
	}

	this.gl = gl;
	this.program = program;

	this.destroy = function () {
		if (gl) {
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
		}

		for (let key in this) {
			if (this.hasOwnProperty(key)) {
				delete this[key];
			}
		}

		program = null;
		vertexShader = null;
		fragmentShader = null;
	};
}

ShaderProgram.prototype.use = function () {
	this.gl.useProgram(this.program);
};

export default ShaderProgram;
