// jshint devel:true
'use strict';

import Carver from './carver.js';

$(document).ready(function() {

	var carver = new Carver();

	function loadImage(imgUrl) {
		$('.current-content').slideUp(400, function(){
			$('.intro').hide();
			carver.setImage(imgUrl);
			$(".current-content").slideDown(600);
		});
		
	}

	function handleImage(e){
		var reader = new FileReader();
		reader.onload = function(event){
			loadImage(event.target.result);
		};
		reader.readAsDataURL(e.target.files[0]);
	}

	$('#ballon-link').on('click', function(){
		console.log('called');
		loadImage('./images/ballon.jpg');
	});

	$('#tower-link').on('click', function(){
		loadImage('./images/tower.jpg');
	});

	$('#upload-link').on('click', function(e){
		e.preventDefault();
		$('#upload').trigger('click');
	});

	$('#upload').on('change', handleImage);

	$('#resize').on('click', function(){
		var newWidth = parseInt($('#horizontal-size').val());
		var newHeight = parseInt($('#vertical-size').val());
		carver.resize(newWidth, newHeight);
	});

	$('.image-btns').on('click', function(e){
		$('.image-canvas').hide()
;		var id = e.target.id;
		if(id == 'original-btn'){
			$('#canvas').show();
		} else if(id == 'gradiant-btn-dual'){
			$('#gradiant-canvas-dual').show();
		}
	});

});