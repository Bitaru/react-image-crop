import React from 'react';
import ReactDOM from 'react-dom';
import ReactCrop from '../lib/ReactCrop.js';

/**
 * Select an image file.
 */
var imageType = /^image\//;
var fileInput = document.querySelector('#file-picker');

fileInput.addEventListener('change', function(e) {
	var file = e.target.files.item(0);

	if (!file || !imageType.test(file.type)) {
		return;
	}

	var reader = new FileReader();

	reader.onload = function(e) {
		loadEditView(e.target.result);
	};

	reader.readAsDataURL(file);
});

/**
 * Load the image in the crop editor.
 */
var cropEditor = document.querySelector('#crop-editor');

var crop = {
	x: 20,
	y: 10,
	width: 60,
	height: 60
};
ReactDOM.render(<ReactCrop crop={crop} src={'./cute.jpg'} onImageLoaded={onImageLoaded} onComplete={onCropComplete} />, cropEditor);

function onImageLoaded(crop) {
	console.log("Image was loaded. Crop:", crop);
}

/**
 * On crop complete update the preview.
 */
function onCropComplete (crop) {
	console.log('Crop move complete:', crop);
}

window.React = React;
