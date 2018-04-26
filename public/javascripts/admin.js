$(function() {
    $(window).bind("load resize", function() {
        topOffset = 50;
        width = (this.window.innerWidth > 0) ? this.window.innerWidth : this.screen.width;

        height = ((this.window.innerHeight > 0) ? this.window.innerHeight : this.screen.height) - 1;
        height = height - topOffset;
        if (height < 1) height = 1;
        if (height > topOffset) {
            $("#page-wrapper").css("min-height", (height) + "px");
        }
		
		// get the page and resize accordingly
		var full_pathname = window.location.pathname;
		var arr_pathname = full_pathname.split('/');
		
		if(arr_pathname[2] == "dashboard"){
			set_height("#dashboard_wrapper",["#dash_header_row", ".panel-heading"], 20);
			fill_parent("#dashboard_body","#dashboard_wrapper", 90);
		}
		
		if(arr_pathname[2] == "preview"){
			set_height("#preview_body",["#preview_header_row", ".panel-heading", ".navbar", ".breadcrumb"], 15);
		}
		
		if(arr_pathname[2] == "editor"){
			set_height("#wrap_post_body",["#editor_header_row", ".navbar"], 30);
			set_height("#editor_body_li",["#editor_header_row", ".navbar", ".panel-heading", ".panel-footer"], 113);
			set_height("#frm_post_body",["#editor_header_row", ".navbar", ".panel-heading", ".md-header", ".panel-footer"], 115);
		}	
    });
	
	$(document).ready(function() {
		$('#frm_datetimepicker').datetimepicker(
		{
			formatTime:'H:i',
			format: 'd/m/Y H:i',
		});
		
		$( '.swipebox' ).swipebox();
			
		// makes the table rows clickable and link to the respective page
		$(".dashboard_list").click(function() {
			window.document.location = $(this).attr("href");
		}).hover( function() {
			$(this).toggleClass('hover');
		});	
		$("#clear_loglogo").click(function() {
			window.location = "clearlogo";
		});
				
		// takes to top of page when nav toggle is clicked on mobile
		$(".navbar-toggle").click(function() {
			$('html, body').animate({ scrollTop: 0 }, 0);
		});
			
		// toggles the class to show the sidebar on mobile
		$('[data-toggle=offcanvas]').click(function() {
			$('.row-offcanvas').toggleClass('active');
		});
		
		// validates the user form
		$().user_validation("#user_form");

		// makes the table rows clickable and link to the respective page
		$(".dashboard_list").click(function() {
			window.document.location = $(this).attr("href");
		}).hover( function() {
			$(this).toggleClass('hover');
		});
		
		// adds the markdown editor
		var windowsize = $(window).width();
		var hidden_buttons = ["cmdCode", "cmdQuote"];
		if(windowsize < 768){
			$("#frm_post_body").markdown({autofocus:true, iconlibrary: "fa", hiddenButtons: hidden_buttons});
		}else{
			$("#frm_post_body").markdown({autofocus:true, iconlibrary: "fa",
		
			additionalButtons: [
			    [{
			          name: "groupCustom",
			          data: [{
			            name: "cmdBeer",
			            toggle: true, // this param only take effect if you load bootstrap.js
			            title: "Insert image",
			            icon: "glyphicon glyphicon-glass",
			            callback: function(e){
			              // Give random drink
						  var chunk = "test1";

			              // transform selection and set the cursor into chunked text
			              e.replaceSelection(chunk);
			            }
			          }]
			    }]
			  ]
		  	}
			);
		}
	});
	
	function show_modal(){
		alert("test");
	}
	
    var url = window.location;
    var element = $('ul.nav a').filter(function() {
        return this.href == url;
    }).addClass('active').parent().parent().addClass('in').parent();
    if (element.is('li')) {
        element.addClass('active');
    }
	
	fix_status_style();
	$("#draft_status").click(function() {
		$("#status_dropdown").text("Draft");
		$("#frm_post_status").val(0);
		fix_status_style();
    });
    $("#published_status").click(function() {
        $("#status_dropdown").text("Published");
		$("#frm_post_status").val(1);
		fix_status_style();
    });
});

function fix_status_style(){	
	// set the status to draft on new posts
	if($("#frm_post_status").val() === ""){
		$("#frm_post_status").val("0");
	}
	
	// check the current status, changes and text and adds the correct classes
	if($("#frm_post_status").val() == 0){
		$("#status_text").text("Draft");
		if($("#status_dropdown").hasClass("btn-success")){
			$("#status_dropdown").removeClass("btn-success");
			$("#status_dropdown").addClass("btn-danger");
		}else{
			$("#status_dropdown").addClass("btn-danger");
		}
	}
	if($("#frm_post_status").val() == 1){
		$("#status_text").text("Published");
		if($("#status_dropdown").hasClass("btn-danger")){
			$("#status_dropdown").removeClass("btn-danger");
			$("#status_dropdown").addClass("btn-success");
		}else{
			$("#status_dropdown").addClass("btn-success");
		}
	}
}

function set_height(re_div, offset_array, padding){
    var full_page_height = $(window).height();
    for (i = 0; i < offset_array.length; i++) {
        var element_height = $(offset_array[i]).outerHeight();
        full_page_height = full_page_height - element_height;
    }
	$(re_div).height(full_page_height - padding);
}

function fill_parent(element, parent_element, offset){
    var parent_div_height = $(parent_element).innerHeight() - offset;
    $(element).height(parent_div_height);
}