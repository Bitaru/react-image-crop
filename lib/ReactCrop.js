import React, { Component, PropTypes } from 'react';
import styleable from 'react-styleable'
import { autobind, debounce } from 'core-decorators';
import CropSelection from './CropSelection';
import css from './ReactCrop.css'

import {
	clamp, arrayToPercent, adjustOnImageLoadCrop, getElementOffset, getClientPos
} from './utils/helpers';

import {
	xOrds, yOrds, xyOrds, nudgeStep, arrowKey, defaultCrop
} from './utils/defaults';

class ReactCrop extends Component {
	static propTypes = {
		src: PropTypes.string.isRequired,
		crop: PropTypes.object,
		minWidth: PropTypes.number,
		minHeight: PropTypes.number,
		keepSelection: PropTypes.bool,
		onChange: PropTypes.func,
		onComplete: PropTypes.func,
		onImageLoaded: PropTypes.func
	};

	state = {
		crop: {
			...this.defaultCrop,
			...this.props.crop
		}
	};

	componentDidMount() {
		document.addEventListener('mousemove', ::this.onDocMouseTouchMove);
		document.addEventListener('touchmove', ::this.onDocMouseTouchMove);
		document.addEventListener('mouseup', ::this.onDocMouseTouchEnd);
		document.addEventListener('touchend', ::this.onDocMouseTouchEnd);
		document.addEventListener('touchcancel', ::this.onDocMouseTouchEnd);
	};

	componentWillUnmount() {
		document.removeEventListener('mousemove', ::this.onDocMouseTouchMove);
		document.removeEventListener('touchmove', ::this.onDocMouseTouchMove);
		document.removeEventListener('mouseup', ::this.onDocMouseTouchEnd);
		document.removeEventListener('touchend', ::this.onDocMouseTouchEnd);
		document.removeEventListener('touchcancel', ::this.onDocMouseTouchEnd);
	};

	getCropStyle() {
		const { y, x, width, height } = this.state.crop;
		return {
			top: y + '%',
			left: x + '%',
			width: width + '%',
			height: height + '%'
		};
	};

	straightenYPath(clientX) {
		const evData = this.evData;
		let ord = evData.ord;
		let cropOffset = evData.cropOffset;
		let cropStartWidth = evData.cropStartWidth / 100 * evData.imageWidth;
		let cropStartHeight = evData.cropStartHeight / 100 * evData.imageHeight;
		let k, d;

		if (ord === 'nw' || ord === 'se') {
			k = cropStartHeight / cropStartWidth;
			d = cropOffset.top - cropOffset.left * k;
		} else {
			k =  - cropStartHeight / cropStartWidth;
			d = (cropOffset.top + cropStartHeight) - cropOffset.left * k;
		}

		return k * clientX + d;
	};

	onDocMouseTouchMove(e) {
		if (!this.mouseDownOnCrop) {
			return;
		}

		let crop = this.state.crop;
		let evData = this.evData;
		let clientPos = getClientPos(e);

		if (evData.isResize && crop.aspect && evData.cropOffset) {
			clientPos.y = this.straightenYPath(clientPos.x);
		}

		let xDiffPx = clientPos.x - evData.clientStartX;
		evData.xDiffPc = xDiffPx / evData.imageWidth * 100;

		let yDiffPx = clientPos.y - evData.clientStartY;
		evData.yDiffPc = yDiffPx / evData.imageHeight * 100;

		if (evData.isResize) {
			this.resizeCrop();
		} else {
			this.dragCrop();
		}

		this.cropInvalid = false;

		if (this.props.onChange) {
			this.props.onChange(crop);
		}

		this.setState({ crop });
	};

	getNewSize() {
		let crop = this.state.crop;
		let evData = this.evData;
		let imageAspect = evData.imageWidth / evData.imageHeight;

		// New width.
		let newWidth = evData.cropStartWidth + evData.xDiffPc;

		if (evData.xCrossOver) {
			newWidth = Math.abs(newWidth);
		}

		let maxWidth = 100;

		// Stop the box expanding on the opposite side when some edges are hit.
		if (!this.state.newCropIsBeingDrawn) {
			maxWidth = (['nw', 'w', 'sw'].indexOf(evData.inversedXOrd || evData.ord) > -1) ?
				evData.cropStartX :
				100 - evData.cropStartX;
		}

		newWidth = clamp(newWidth, this.props.minWidth || 0, maxWidth);

		// New height.
		let newHeight;

		if (crop.aspect) {
			newHeight = (newWidth / crop.aspect) * imageAspect;
		} else {
			newHeight = evData.cropStartHeight + evData.yDiffPc;
		}

		if (evData.yCrossOver) {
			// Cap if polarity is inversed and the shape fills the y space.
			newHeight = Math.min(Math.abs(newHeight), evData.cropStartY);
		}

		let maxHeight = 100;

		// Stop the box expanding on the opposite side when some edges are hit.
		if (!this.state.newCropIsBeingDrawn) {
			maxHeight = (['nw', 'n', 'ne'].indexOf(evData.inversedYOrd || evData.ord) > -1) ?
				evData.cropStartY :
				100 - evData.cropStartY;
		}

		newHeight = clamp(newHeight, this.props.minHeight || 0, maxHeight);

		if (crop.aspect) {
			newWidth = (newHeight * crop.aspect) / imageAspect;
		}

		return {
			width: newWidth,
			height: newHeight
		};
	};

	resizeCrop() {
		let crop = this.state.crop;
		let evData = this.evData;
		let ord = evData.ord;

		// On the inverse change the diff so it's the same and
		// the same algo applies.
		if (evData.xInversed) {
			evData.xDiffPc -= evData.cropStartWidth * 2;
		}
		if (evData.yInversed) {
			evData.yDiffPc -= evData.cropStartHeight * 2;
		}

		// New size.
		let newSize = this.getNewSize();

		// Adjust x/y to give illusion of 'staticness' as width/height is increased
		// when polarity is inversed.
		let newX = evData.cropStartX;
		let newY = evData.cropStartY;

		if (evData.xCrossOver) {
			newX = crop.x + (crop.width - newSize.width);
		}

		if (evData.yCrossOver) {
			// This not only removes the little "shake" when inverting at a diagonal, but for some
			// reason y was way off at fast speeds moving sw->ne with fixed aspect only, I couldn't
			// figure out why.
			if (evData.lastYCrossover === false) {
				newY = crop.y - newSize.height;
			} else {
				newY = crop.y + (crop.height - newSize.height);
			}
		}

		crop.x = clamp(newX, 0, 100 - newSize.width);
		crop.y = clamp(newY, 0, 100 - newSize.height);

		// Apply width/height changes depending on ordinate.
		if (xyOrds.indexOf(ord) > -1) {
			crop.width = newSize.width;
			crop.height = newSize.height;
		} else if (xOrds.indexOf(ord) > -1) {
			crop.width = newSize.width;
		} else if (yOrds.indexOf(ord) > -1) {
			crop.height = newSize.height;
		}

		evData.lastYCrossover = evData.yCrossOver;
		this.crossOverCheck();
	};

	dragCrop() {
		let crop = this.state.crop;
		let evData = this.evData;
		crop.x = clamp(evData.cropStartX + evData.xDiffPc, 0, 100 - crop.width);
		crop.y = clamp(evData.cropStartY + evData.yDiffPc, 0, 100 - crop.height);
	};

	inverseOrd(ord) {
		let inverseOrd;

		if (ord === 'n') inverseOrd = 's';
		else if (ord === 'ne') inverseOrd = 'sw';
		else if (ord === 'e') inverseOrd = 'w';
		else if (ord === 'se') inverseOrd = 'nw';
		else if (ord === 's') inverseOrd = 'n';
		else if (ord === 'sw') inverseOrd = 'ne';
		else if (ord === 'w') inverseOrd = 'e';
		else if (ord === 'nw') inverseOrd = 'se';

		return inverseOrd;
	};

	crossOverCheck() {
		let evData = this.evData;

		if ((!evData.xCrossOver && -Math.abs(evData.cropStartWidth) - evData.xDiffPc >= 0) ||
			(evData.xCrossOver && -Math.abs(evData.cropStartWidth) - evData.xDiffPc <= 0)) {
			evData.xCrossOver = !evData.xCrossOver;
		}

		if ((!evData.yCrossOver && -Math.abs(evData.cropStartHeight) - evData.yDiffPc >= 0) ||
			(evData.yCrossOver && -Math.abs(evData.cropStartHeight) - evData.yDiffPc <= 0)) {
			evData.yCrossOver = !evData.yCrossOver;
		}

		let swapXOrd = evData.xCrossOver !== evData.startXCrossOver;
		let swapYOrd = evData.yCrossOver !== evData.startYCrossOver;

		evData.inversedXOrd = swapXOrd ? this.inverseOrd(evData.ord) : false;
		evData.inversedYOrd = swapYOrd ? this.inverseOrd(evData.ord) : false;
	};

	@autobind
	onCropMouseTouchDown(e) {
		e.preventDefault(); // Stop drag selection.

		let crop = this.state.crop;
		let clientPos = getClientPos(e);

		// Focus for detecting keypress.
		this.refs.component.focus();

		let ord = e.target.dataset.ord;
		let xInversed = ord === 'nw' || ord === 'w' || ord === 'sw';
		let yInversed = ord === 'nw' || ord === 'n' || ord === 'ne';

		let cropOffset;

		if (crop.aspect) {
			cropOffset = getElementOffset(this.refs.cropSelect);
		}

		this.evData = {
			imageWidth: this.refs.image.width,
			imageHeight: this.refs.image.height,
			clientStartX: clientPos.x,
			clientStartY: clientPos.y,
			cropStartWidth: crop.width,
			cropStartHeight: crop.height,
			cropStartX: xInversed ? (crop.x + crop.width) : crop.x,
			cropStartY: yInversed ? (crop.y + crop.height) : crop.y,
			xInversed: xInversed,
			yInversed: yInversed,
			xCrossOver: xInversed,
			yCrossOver: yInversed,
			startXCrossOver: xInversed,
			startYCrossOver: yInversed,
			isResize: e.target.nodeName.toLowerCase() !== 'figure',
			ord: ord,
			cropOffset: cropOffset
		};

		this.mouseDownOnCrop = true;
	};

	@autobind
	onComponentMouseTouchDown(e) {
		if (e.target !== this.refs.imageCopy) {
			return;
		}

		e.preventDefault(); // Stop drag selection.

		let crop = this.props.keepSelection === true ? {} : this.state.crop;
		let clientPos = getClientPos(e);

		// Focus for detecting keypress.
		this.refs.component.focus();

		let imageOffset = getElementOffset(this.refs.image);
		let xPc = (clientPos.x - imageOffset.left) / this.refs.image.width * 100;
		let yPc = (clientPos.y - imageOffset.top) / this.refs.image.height * 100;

		crop.x = xPc;
		crop.y = yPc;
		crop.width = 0;
		crop.height = 0;

		this.evData = {
			imageWidth: this.refs.image.width,
			imageHeight: this.refs.image.height,
			clientStartX: clientPos.x,
			clientStartY: clientPos.y,
			cropStartWidth: crop.width,
			cropStartHeight: crop.height,
			cropStartX: crop.x,
			cropStartY: crop.y,
			xInversed: false,
			yInversed: false,
			xCrossOver: false,
			yCrossOver: false,
			startXCrossOver: false,
			startYCrossOver: false,
			isResize: true,
			ord: 'nw'
		};

		this.mouseDownOnCrop = true;
		this.setState({ newCropIsBeingDrawn: true });
	};

	@autobind
	onComponentKeyDown(e) {
		let keyCode = e.which;
		let crop = this.state.crop;
		let nudged = false;

		if (!crop.width || !crop.height) {
			return;
		}

		if (keyCode === arrowKey.left) {
			crop.x -= nudgeStep;
			nudged = true;
		} else if (keyCode === arrowKey.right) {
			crop.x += nudgeStep;
			nudged = true;
		} else if (keyCode === arrowKey.up) {
			crop.y -= nudgeStep;
			nudged = true;
		} else if (keyCode === arrowKey.down) {
			crop.y += nudgeStep;
			nudged = true;
		}

		if (nudged) {
			if(e) {
				e.preventDefault();
			}
			crop.x = clamp(crop.x, 0, 100 - crop.width);
			crop.y = clamp(crop.y, 0, 100 - crop.height);

			this.setState({ crop: crop });

			if (this.props.onChange) {
				this.props.onChange(crop);
			}
			if (this.props.onComplete) {
				this.props.onComplete(crop);
			}
		}
	};

	@debounce(100)
	onDocMouseTouchEnd(e) {
		if (this.mouseDownOnCrop) {

			this.cropInvalid = !this.state.crop.width && !this.state.crop.height;
			this.mouseDownOnCrop = false;

			if (this.props.onComplete) {
				this.props.onComplete(this.state.crop);
			}

			this.setState({ newCropIsBeingDrawn: false });
		}
	};

	getImageClipStyle() {
		let crop = this.state.crop;

		let right = 100 - (crop.x + crop.width);
		let bottom = 100 - (crop.y + crop.height);

		// Safari doesn't like it if values add up to exactly
		// 100 (it doesn't draw the clip). I have submitted a bug.
		if (crop.x + right === 100) {
			right -= 0.00001;
		}

		if (crop.y + bottom === 100) {
			bottom -= 0.00001;
		}

		let insetVal = 'inset(' + arrayToPercent([
			crop.y,
			right,
			bottom,
			crop.x
		]) +')';

		return {
			WebkitClipPath: insetVal,
			clipPath: insetVal
		};
	};

	@autobind
	onImageLoad(e) {
		let crop = this.state.crop;
		let imageWidth = e.target.naturalWidth;
		let imageHeight = e.target.naturalHeight;
		let imageAspect = imageWidth / imageHeight;

		// If there is a width or height then infer the other to
		// ensure the value is correct.
		if (crop.aspect) {
			if (crop.width) {
				crop.height = (crop.width / crop.aspect) * imageAspect;
			} else if (crop.height) {
				crop.width = (crop.height * crop.aspect) / imageAspect;
			}
			adjustOnImageLoadCrop(crop, imageAspect);
			this.cropInvalid = !crop.width || !crop.height;
			this.setState({ crop: crop });
		}
		if (this.props.onImageLoaded) {
			this.props.onImageLoaded(crop);
		}
	};

	render() {
		let imageClip;
		const { css } = this.props;

		if (!this.cropInvalid) {
			imageClip = this.getImageClipStyle();
		}

		let componentClasses = [css.ReactCrop];

		if (this.state.newCropIsBeingDrawn) {
			componentClasses.push(css.NewCrop);
		}
		if (this.state.crop.aspect) {
			componentClasses.push(css.FixedAspect);
		}
		const cropSelectionProps = {
			style: this.getCropStyle(),
			onMouseDown: this.onCropMouseTouchDown,
			onTouchStart: this.onCropMouseTouchDown,
			css
		}

		return (
			<div ref="component"
				className={componentClasses.join(' ')}
				onTouchStart={this.onComponentMouseTouchDown}
				onMouseDown={this.onComponentMouseTouchDown}
				tabIndex="1"
				onKeyDown={this.onComponentKeyDown}>

				<img ref='image' className={css.Image} src={this.props.src} onLoad={this.onImageLoad} />

				<div className={css.CropWrapper}>
					<img ref='imageCopy' className={css.ImageCopy} src={this.props.src} style={imageClip} />
					<CropSelection {...cropSelectionProps}/>
				</div>

				{ this.props.children }
			</div>
		);
	}
};

export default styleable(css)(ReactCrop);
