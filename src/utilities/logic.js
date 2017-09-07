function extend(dest, src) {
	let property,
		descriptor;

	//todo: are we sure this is safe?
	if (dest.prototype && src.prototype && dest.prototype !== src.prototype) {
		extend(dest.prototype, src.prototype);
	}

	for (property in src) {
		if (src.hasOwnProperty(property)) {
			descriptor = Object.getOwnPropertyDescriptor(src, property);

			if (descriptor.get || descriptor.set) {
				Object.defineProperty(dest, property, {
					configurable: true,
					enumerable: true,
					get: descriptor.get,
					set: descriptor.set
				});
			} else {
				dest[property] = src[property];
			}
		}
	}

	return dest;
}

function isArrayLike(obj) {
	return Array.isArray(obj) ||
		(obj && obj.BYTES_PER_ELEMENT && 'length' in obj);
}

function validateInputSpecs(plugin) {
	let input,
		options,
		name;

	function normalizeEnumOption(option, i) {
		let key,
			name;

		if (isArrayLike(option)) {
			key = option[0];
			name = option[1] || key;
		} else {
			key = option;
		}

		if (typeof key === 'string') {
			key = key.toLowerCase();
		} else if (typeof key === 'number') {
			key = String(key);
		} else if (!key) {
			key = '';
		}

		options[key] = name;

		if (!i) {
			input.firstValue = key;
		}
	}

	function passThrough(value) {
		return value;
	}

	for (name in plugin.inputs) {
		if (plugin.inputs.hasOwnProperty(name)) {
			if (plugin.reserved.indexOf(name) >= 0 || Object.prototype[name]) {
				throw new Error('Reserved input name: ' + name);
			}

			input = plugin.inputs[name];
			input.name = name;

			if (isNaN(input.min)) {
				input.min = -Infinity;
			}

			if (isNaN(input.max)) {
				input.max = Infinity;
			}

			if (isNaN(input.minCount)) {
				input.minCount = -Infinity;
			}

			if (isNaN(input.maxCount)) {
				input.maxCount = Infinity;
			}

			if (isNaN(input.step)) {
				input.step = 0;
			}

			if (isNaN(input.mod)) {
				input.mod = 0;
			}

			if (input.type === 'enum') {
				/*
                Normalize options to make validation easy
                - all items will have both a key and a name
                - all keys will be lowercase strings
                */
				if (input.options && isArrayLike(input.options) && input.options.length) {
					options = {};
					input.options.forEach(normalizeEnumOption);
					input.options = options;
				}
			}

			if (input.type === 'vector') {
				if (input.dimensions < 2) {
					input.dimensions = 2;
				} else if (input.dimensions > 4) {
					input.dimensions = 4;
				} else if (!input.dimensions || isNaN(input.dimensions)) {
					input.dimensions = 4;
				} else {
					input.dimensions = Math.round(input.dimensions);
				}
			} else {
				input.dimensions = 1;
			}

			input.shaderDirty = !!input.shaderDirty;

			if (typeof input.validate !== 'function') {
				input.validate = Seriously.inputValidators[input.type] || passThrough;
			}

			if (!plugin.defaultImageInput && input.type === 'image') {
				plugin.defaultImageInput = name;
			}
		}
	}
}

export {
	extend,
	isArrayLike,
	validateInputSpecs
};
