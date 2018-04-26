function responsive_image(selector){
	$(selector).each(function () {
        var img = $(this);
        img.addClass("img-responsive"); //adds the bootstrap class
    });
}