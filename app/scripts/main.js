// jshint devel:true
'use strict';

$(document).ready(function() {

	var canvas = $('#canvas')[0];
	var ctx = canvas.getContext('2d');

	function loadImage(imgUrl) {
		var img = new Image();
		img.onload = function(){
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);
		};
		img.src = imgUrl;
	}

	function handleImage(e){
		var reader = new FileReader();
		reader.onload = function(event){
			loadImage(event.target.result);
		};
		reader.readAsDataURL(e.target.files[0]);
	}

	$('#ballon-link').on('click', function(){
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

});