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

export {
	extend,
	isArrayLike
};
