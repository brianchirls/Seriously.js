/*!
 * mat4 matrix functions borrowed from gl-matrix by toji
 * https://github.com/toji/gl-matrix
 * License: https://github.com/toji/gl-matrix/blob/master/LICENSE.md
 */
let mat4 = {
	/*
     * mat4.frustum
     * Generates a frustum matrix with the given bounds
     *
     * Params:
     * left, right - scalar, left and right bounds of the frustum
     * bottom, top - scalar, bottom and top bounds of the frustum
     * near, far - scalar, near and far bounds of the frustum
     * dest - Optional, mat4 frustum matrix will be written into
     *
     * Returns:
     * dest if specified, a new mat4 otherwise
     */
	frustum: function (left, right, bottom, top, near, far, dest) {
		if (!dest) {
			// todo: check where did this .create() came from since it's definitely undefined
			dest = mat4.create();
		}

		let rl = (right - left),
			tb = (top - bottom),
			fn = (far - near);

		dest[0] = (near * 2) / rl;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 0;
		dest[5] = (near * 2) / tb;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = (right + left) / rl;
		dest[9] = (top + bottom) / tb;
		dest[10] = -(far + near) / fn;
		dest[11] = -1;
		dest[12] = 0;
		dest[13] = 0;
		dest[14] = -(far * near * 2) / fn;
		dest[15] = 0;

		return dest;
	},

	perspective: function (fovy, aspect, near, far, dest) {
		var top = near * Math.tan(fovy * Math.PI / 360.0),
			right = top * aspect;
		return mat4.frustum(-right, right, -top, top, near, far, dest);
	},
	multiply: function (dest, mat, mat2) {
		// Cache the matrix values (makes for huge speed increases!)
		let a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
			a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
			a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
			a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

			// Cache only the current line of the second matrix
			b0 = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];
		dest[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		dest[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		dest[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		dest[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = mat2[4];
		b1 = mat2[5];
		b2 = mat2[6];
		b3 = mat2[7];
		dest[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		dest[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		dest[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		dest[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = mat2[8];
		b1 = mat2[9];
		b2 = mat2[10];
		b3 = mat2[11];
		dest[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		dest[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		dest[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		dest[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = mat2[12];
		b1 = mat2[13];
		b2 = mat2[14];
		b3 = mat2[15];
		dest[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		dest[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		dest[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		dest[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		return dest;
	},
	identity: function (dest) {
		dest[0] = 1;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		dest[4] = 0;
		dest[5] = 1;
		dest[6] = 0;
		dest[7] = 0;
		dest[8] = 0;
		dest[9] = 0;
		dest[10] = 1;
		dest[11] = 0;
		dest[12] = 0;
		dest[13] = 0;
		dest[14] = 0;
		dest[15] = 1;
		return dest;
	},
	copy: function (out, a) {
		out[0] = a[0];
		out[1] = a[1];
		out[2] = a[2];
		out[3] = a[3];
		out[4] = a[4];
		out[5] = a[5];
		out[6] = a[6];
		out[7] = a[7];
		out[8] = a[8];
		out[9] = a[9];
		out[10] = a[10];
		out[11] = a[11];
		out[12] = a[12];
		out[13] = a[13];
		out[14] = a[14];
		out[15] = a[15];
		return out;
	}
};

//http://www.w3.org/TR/css3-color/#hsl-color
function hslToRgb(h, s, l, a, out) {
	function hueToRgb(m1, m2, h) {
		h = h % 1;
		if (h < 0) {
			h += 1;
		}
		if (h < 1 / 6) {
			return m1 + (m2 - m1) * h * 6;
		}
		if (h < 1 / 2) {
			return m2;
		}
		if (h < 2 / 3) {
			return m1 + (m2 - m1) * (2 / 3 - h) * 6;
		}
		return m1;
	}

	let m1, m2;

	if (l < 0.5) {
		m2 = l * (s + 1);
	} else {
		m2 = l + s - l * s;
	}
	m1 = l * 2 - m2;

	if (!out) {
		out = [];
	}

	out[0] = hueToRgb(m1, m2, h + 1 / 3);
	out[1] = hueToRgb(m1, m2, h);
	out[2] = hueToRgb(m1, m2, h - 1 / 3);
	out[3] = a;

	return out;
}

function colorArrayToHex(color) {
	let i,
		val,
		hex,
		s = '#',
		len = color[3] < 1 ? 4 : 3;

	for (i = 0; i < len; i++) {
		val = Math.min(255, Math.round(color[i] * 255 || 0));
		hex = val.toString(16);
		if (val < 16) {
			hex = '0' + hex;
		}
		s += hex;
	}
	return s;
}


export {
	mat4,
	hslToRgb,
	colorArrayToHex
};
