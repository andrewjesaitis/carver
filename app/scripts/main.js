// jshint devel:true
'use strict';

import Carver from './carver.js';

$(document).ready(function() {

	var carver = new Carver();

	function loadImage(imgUrl) {
		$('.current-content').slideUp(400, function(){
			$('.intro').hide();
			resetUi();
			carver.setImage(imgUrl);
			$('.current-content').slideDown(600);
		});

	}

	function handleImage(e){
		var reader = new FileReader();
		reader.onload = function(event){
			loadImage(event.target.result);
		};
		reader.readAsDataURL(e.target.files[0]);
	}

	function resetUi() {
		$('#load-image-modal').modal('hide');
		$('.image-canvas').hide();
		$('#no-seams-btn').click();
		$('#original-btn').click();
	}

	$('.ballon-link').on('click', function(){
		loadImage('./images/ballon.jpg');
	});

	$('.tower-link').on('click', function(){
		loadImage('./images/tower.jpg');
	});

	$('.upload-link').on('click', function(e){
		e.preventDefault();
		$('#upload').trigger('click');
	});

	$('#upload').on('change', handleImage);

	$('#resize').on('click', function(e){
		$('#resize').attr({'disabled': 'disabled'}).html('Processing...');
		var newWidth = parseInt($('#horizontal-size').val());
		var newHeight = parseInt($('#vertical-size').val());
		// idk, I guess jquery is so slow that it can't disable the element 
		// before the render loop is blocked?
		setTimeout(function(){carver.resize(newWidth, newHeight);}, 50);
	});

	$('.image-btns').on('click', function(e){
		$('.image-canvas').hide()
;		var id = e.target.id;
		if(id === 'original-btn'){
			$('#canvas').show();
		} else if(id === 'gradiant-btn-dual'){
			$('#gradiant-canvas-dual').show();
		}
	});

	$('.seam-btns').on('click', function(e){
		var id = e.target.id;
		if(id === 'no-seams-btn'){
			carver.hideSeams();
		} else if(id === 'vertical-seams-btn'){
			carver.displayVerticalSeams();
		} else if(id === 'horizontal-seams-btn'){
			carver.displayHorizontalSeams();
		}
	});

	$('.derivative-btns').on('click', function(e){
		var id = e.target.id;
		if(id === 'simple-derivative-btn'){
			carver.selectSimple();
		} else if(id === 'sobel-derivative-btn'){
			carver.selectSobel();
		}
	});

});