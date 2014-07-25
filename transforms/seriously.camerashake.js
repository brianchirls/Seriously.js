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
		/*
		todo: build out-of-order loading for sources and transforms or remove this
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		*/
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	/*
	Camera Shake
	- amplitude (x/y)
	- rotation (degrees)
	- frequency
	- octaves
	- autoScale (true/false)
	*/


	/*
	Simplex Noise
	adapted from https://github.com/jwagner/simplex-noise.js
	*/

	var mat4 = Seriously.util.mat4,

		PI = Math.PI,

		f2 = 0.5 * (Math.sqrt(3.0) - 1.0),
		g2 = (3.0 - Math.sqrt(3.0)) / 6.0,

		random = Math.random,
		p,
		perm,
		permMod12,
		grad3,
		initialized = false;

	function initializeSimplex() {
		//initialize simplex lookup tables
		var i;
		if (!initialized) {
			p = new Uint8Array(256);
			perm = new Uint8Array(512);
			permMod12  = new Uint8Array(512);
			grad3 = new Float32Array([
				1, 1, 0,
				- 1, 1, 0,
				1, - 1, 0,

				- 1, - 1, 0,
				1, 0, 1,
				- 1, 0, 1,

				1, 0, - 1,
				- 1, 0, - 1,
				0, 1, 1,

				0, - 1, 1,
				0, 1, - 1,
				0, - 1, - 1
			]);

			for (i = 0; i < 256; i++) {
				p[i] = random() * 256;
			}
			for (i = 0; i < 512; i++) {
				perm[i] = p[i & 255];
				permMod12[i] = perm[i] % 12;
			}
			initialized = true;
		}
	}

	function noise2D(xin, yin) {
		var n0 = 0, // Noise contributions from the three corners
			n1 = 0, // Skew the input space to determine which simplex cell we're in
			n2 = 0,

			s = (xin + yin) * f2, // Hairy factor for 2D
			i = Math.floor(xin + s),
			j = Math.floor(yin + s),
			t = (i + j) * g2,

			xx0 = i - t, // Unskew the cell origin back to (x,y) space
			yy0 = j - t,

			x0 = xin - xx0,
			y0 = yin - yy0,

			/*
			For the 2D case, the simplex shape is an equilateral triangle.
			Determine which simplex we are in.

			Offsets for second (middle) corner of simplex in (i,j) coords
			*/
			i1 = x0 > y0 ? 1 : 0,
			j1 = (i1 + 1) % 2, //opposite of i1

			x1 = x0 - i1 + g2,
			y1 = y0 - j1 + g2,
			x2 = x0 - 1 + 2 * g2,
			y2 = y0 - 1 + 2 * g2,

			ii = i & 255,
			jj = j & 255,

			t0 = 0.5 - x0 * x0 - y0 * y0,

			t1,
			t2,

			gi;

		if (t0 >= 0) {
            gi = permMod12[ii + perm[jj]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi] * x0 + grad3[gi + 1] * y0); // (x,y) of grad3 used for 2D gradient
        }

        t1 = 0.5 - x1 * x1 - y1 * y1;
		if (t1 >= 0) {
			gi = permMod12[ii + i1 + perm[jj + j1]] * 3;
			t1 *= t1;
			n1 = t1 * t1 * (grad3[gi] * x1 + grad3[gi + 1] * y1);
		}

		t2 = 0.5 - x2 * x2 - y2 * y2;
		if (t2 >= 0) {
			gi = permMod12[ii + 1 + perm[jj + 1]] * 3;
			t2 *= t2;
			n2 = t2 * t2 * (grad3[gi] * x2 + grad3[gi + 1] * y2);
		}

		return 70.0 * (n0 + n1 + n2);
	}

	Seriously.transform('camerashake', function () {
		var me = this,
			octaves = 1,
			time = 0,
			amplitudeX = 0,
			amplitudeY = 0,
			frequency = 1,
			rotation = 0,
			preScale = 0,
			autoScale = true,
			maxScale = 1;

		function calcScale(x, y, angle) {
			var width = me.width,
				height = me.height,
				scale = 1,
				x0, y0,
				x1, y1,
				x2, y2,
				sin,
				cos;

			// angle mod 180
			angle = angle - PI * Math.floor(angle / PI);

			if (angle) {
				sin = Math.sin(angle);
				cos = Math.sqrt(1 - sin * sin);

				/*
				Take two top corner points, rotate them and find absolute value.
				This should find the bounding box of the rotated recangle,
				assuming it's centered at 0, 0
				*/

				// rotate point top right corner
				x0 = width / 2;
				y0 = height / 2;
				x1 = Math.abs(x0 * cos - y0 * sin);
				y1 = Math.abs(x0 * sin + y0 * cos);

				// rotate point top left corner
				x0 = -x0;
				x2 = Math.abs(x0 * cos - y0 * sin);
				y2 = Math.abs(x0 * sin + y0 * cos);

				// find maximum scale
				scale = 2 * Math.max(x1 / width, x2 / width, y1 / height, y2 / height);
			}

			scale *= Math.max(
				(2 * Math.abs(x) + width) / width,
				(2 * Math.abs(y) + height) / height
			);

			return scale;
		}

		function recompute() {
			var matrix = me.matrix,
				s, c,
				t,
				freq,
				amp,
				adjust = 0,
				i,
				scale = 1,
				translateX = 0,
				translateY = 0,
				rotationZ = 0,
				angle = 0,
				m00,
				m01,
				m02,
				m03,
				m10,
				m11,
				m12,
				m13;

			function translate(x, y) {
				matrix[12] = matrix[0] * x + matrix[4] * y + matrix[12];
				matrix[13] = matrix[1] * x + matrix[5] * y + matrix[13];
				matrix[14] = matrix[2] * x + matrix[6] * y + matrix[14];
				matrix[15] = matrix[3] * x + matrix[7] * y + matrix[15];
			}

			function rotateZ() {
				if (!rotationZ) {
					return;
				}

				s = Math.sin(angle);
				c = Math.cos(angle);

				m00 = matrix[0];
				m01 = matrix[1];
				m02 = matrix[2];
				m03 = matrix[3];
				m10 = matrix[4];
				m11 = matrix[5];
				m12 = matrix[6];
				m13 = matrix[7];

				matrix[0] = m00 * c + m10 * s;
				matrix[1] = m01 * c + m11 * s;
				matrix[2] = m02 * c + m12 * s;
				matrix[3] = m03 * c + m13 * s;
				matrix[4] = m10 * c - m00 * s;
				matrix[5] = m11 * c - m01 * s;
				matrix[6] = m12 * c - m02 * s;
				matrix[7] = m13 * c - m03 * s;
			}

			if (!amplitudeX &&
					!amplitudeY &&
					!rotation
					) {
				me.transformed = false;
				return;
			}

			t = time * frequency;

			for (i = 0; i < octaves; i++) {
				freq = Math.pow(2, i);
				amp = Math.pow(0.5, i);
				adjust += amp;
				if (rotation) {
					rotationZ += noise2D(t * freq, 7 * freq) * amp;
				}
				if (amplitudeX) {
					translateX += noise2D(t * freq, 11 * freq) * amp;
				}
				if (amplitudeY) {
					translateY += noise2D(t * freq, 13 * freq) * amp;
				}
			}
			rotationZ *= rotation / adjust;
			translateX *= amplitudeX / adjust;
			translateY *= amplitudeY / adjust;
			angle = rotationZ * PI / 180;

			//calculate transformation matrix
			mat4.identity(matrix);

			translate(translateX, translateY);

			rotateZ();

			if (autoScale) {
				if (preScale === 1) {
					scale = maxScale;
				} else {
					scale = calcScale(translateX, translateY, angle);
					scale = preScale * maxScale + (1 - preScale) * scale;
				}

				//scale
				if (scale !== 1) {
					matrix[0] *= scale;
					matrix[1] *= scale;
					matrix[2] *= scale;
					matrix[3] *= scale;
					matrix[4] *= scale;
					matrix[5] *= scale;
					matrix[6] *= scale;
					matrix[7] *= scale;
				}
			}

			me.transformed = true;
		}

		initializeSimplex();

		return {
			resize: recompute,
			inputs: {
				time: {
					get: function () {
						return time;
					},
					set: function (t) {
						if (t === time) {
							return false;
						}

						time = t;

						recompute();
						return true;
					},
					type: 'number'
				},
				frequency: {
					get: function () {
						return frequency;
					},
					set: function (f) {
						if (f === frequency) {
							return false;
						}

						frequency = f;

						recompute();
						return true;
					},
					type: 'number'
				},
				octaves: {
					get: function () {
						return octaves;
					},
					set: function (o) {
						o = Math.max(1, o);
						if (o === octaves) {
							return false;
						}

						octaves = o;

						recompute();
						return true;
					},
					type: 'number'
				},
				rotation: {
					get: function () {
						return rotation;
					},
					set: function (r) {
						if (r === rotation) {
							return false;
						}

						rotation = r;

						maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
						recompute();
						return true;
					},
					type: 'number'
				},
				amplitudeX: {
					get: function () {
						return amplitudeX;
					},
					set: function (x) {
						x = Math.max(0, x);
						if (x === amplitudeX) {
							return false;
						}

						amplitudeX = x;

						maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
						recompute();
						return true;
					},
					type: 'number'
				},
				amplitudeY: {
					get: function () {
						return amplitudeY;
					},
					set: function (y) {
						y = Math.max(0, y);
						if (y === amplitudeY) {
							return false;
						}

						amplitudeY = y;

						maxScale = calcScale(amplitudeX, amplitudeY, rotation * PI / 180);
						recompute();
						return true;
					},
					type: 'number'
				},
				autoScale: {
					get: function () {
						return autoScale;
					},
					set: function (a) {
						a = !!a;
						if (a === autoScale) {
							return false;
						}

						autoScale = a;

						recompute();
						return true;
					},
					type: 'boolean'
				},
				preScale: {
					get: function () {
						return preScale;
					},
					set: function (ps) {
						ps = Math.max(0, Math.min(1, ps));
						if (ps === preScale) {
							return false;
						}

						preScale = ps;

						recompute();
						return true;
					},
					type: 'number'
				}
			}
		};
	}, {
		title: 'Camera Shake'
	});
}));