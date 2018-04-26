$(function(){
	$('code').contents().unwrap();
	$('pre').addClass('prettyprint linenums');
	window.prettyPrint && prettyPrint();
});

$(document).ready(function() {
	responsive_image("#body_section img");
});
