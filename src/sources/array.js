import Seriously from '../seriously';

Seriously.source('array', function (source, options, force) {
	var width,
		height,
		typedArray;

	if (options && (Array.isArray(source) ||
			(source && source.BYTES_PER_ELEMENT && 'length' in source))) {

		width = options.width;
		height = options.height;

		if (!width || !height) {
			if (force) {
				throw 'Height and width must be provided with an Array';
			}
			return;
		}

		if (width * height * 4 !== source.length) {
			if (force) {
				throw 'Array length must be height x width x 4.';
			}
			return;
		}

		this.width = width;
		this.height = height;

		//use opposite default for flip
		if (options.flip === undefined) {
			this.flip = false;
		}

		if (!(source instanceof Uint8Array)) {
			typedArray = new Uint8Array(source.length);
		}

		return {
			render: function (gl) {
				var i;
				if (this.dirty) {
					//pixel array can be updated, but we need to load from the typed array
					//todo: see if there's a faster copy method
					if (typedArray) {
						for (i = 0; i < typedArray.length; i++) {
							typedArray[i] = source[i];
						}
					}

					gl.bindTexture(gl.TEXTURE_2D, this.texture);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flip);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, typedArray || source);

					this.lastRenderTime = Date.now() / 1000;

					return true;
				}
			}
		};
	}
}, {
	title: 'Array',
	description: 'Array or Uint8Array'
});
