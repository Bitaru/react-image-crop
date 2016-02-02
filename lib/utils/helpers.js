export const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

export const arrayToPercent = (arr, delimeter) => {
	delimeter = delimeter || ' ';
	return arr.map(number => number + '%').join(delimeter);
};

export const adjustOnImageLoadCrop = (crop, imageAspect) => {
	if (crop.y + crop.height > 100) {
		crop.height = 100 - crop.y;
		crop.width = (crop.height * crop.aspect) / imageAspect;
	}
	if (crop.x + crop.width > 100) {
		crop.width = 100 - crop.x;
		crop.height = (crop.width / crop.aspect) * imageAspect;
	}
};

export const getElementOffset = (el) => {
	const rect = el.getBoundingClientRect();
	const docEl = document.documentElement;
	const top = rect.top + window.pageYOffset - docEl.clientTop;
	const left = rect.left + window.pageXOffset - docEl.clientLeft;
	return { top, left };
};

export const getClientPos = (e) => {
	let x, y;
	if (e.touches) {
		x = e.touches[0].pageX;
		y = e.touches[0].pageY;
	} else {
		x = e.pageX;
		y = e.pageY;
	}
	return { x, y };
};
