import Seriously from '../seriously';

let mat4 = Seriously.util.mat4;

Seriously.transform('flip', function () {
	let me = this,
		horizontal = true;

	function recompute() {
		let matrix = me.matrix;

		//calculate transformation matrix
		//mat4.identity(matrix);

		//scale
		if (horizontal) {
			matrix[0] = -1;
			matrix[5] = 1;
		} else {
			matrix[0] = 1;
			matrix[5] = -1;
		}
	}

	mat4.identity(me.matrix);
	recompute();

	me.transformDirty = true;

	me.transformed = true;

	return {
		inputs: {
			direction: {
				get: function () {
					return horizontal ? 'horizontal' : 'vertical';
				},
				set: function (d) {
					let horiz = d !== 'vertical';

					if (horiz === horizontal) {
						return false;
					}

					horizontal = horiz;
					recompute();
					return true;
				},
				type: 'string'
			}
		}
	};
}, {
	title: 'Flip',
	description: 'Flip Horizontal/Vertical'
});
