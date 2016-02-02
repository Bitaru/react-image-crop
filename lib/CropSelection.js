import React from 'react';
import cx from 'classnames';

export default ({css, ...props}) => {
	return (
		<figure {...props}
			className={css.CropSelection}>
			<div className={cx(css.DragBar, css.ordN)} data-ord='n'></div>
			<div className={cx(css.DragBar, css.ordE)} data-ord='e'></div>
			<div className={cx(css.DragBar, css.ordS)} data-ord='s'></div>
			<div className={cx(css.DragBar, css.ordW)} data-ord='w'></div>
			<div className={cx(css.DragHandle, css.ordNW)} data-ord='nw'></div>
			<div className={cx(css.DragHandle, css.ordN)} data-ord='n'></div>
			<div className={cx(css.DragHandle, css.ordNE)} data-ord='ne'></div>
			<div className={cx(css.DragHandle, css.ordE)} data-ord='e'></div>
			<div className={cx(css.DragHandle, css.ordSE)} data-ord='se'></div>
			<div className={cx(css.DragHandle, css.ordS)} data-ord='s'></div>
			<div className={cx(css.DragHandle, css.ordSW)} data-ord='sw'></div>
			<div className={cx(css.DragHandle, css.ordW)} data-ord='w'></div>
		</figure>
  );
};
