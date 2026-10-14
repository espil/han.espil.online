$('.item')
	.bind('dragstart', function (evt) {
		evt.dataTransfer.setData('text', this.id);
		$("#cart").addClass('cart-border');
	})

var cart = []
	
$('#cart')
	.bind('dragover', function (evt) {
		evt.preventDefault();
	})
	.bind('dragenter', function (evt) {
		evt.preventDefault();
	})
	.bind('drop', function (evt) {
		var id = evt.dataTransfer.getData('text');
		addToCart(id);
		evt.stopPropagation();
		return false;
	});

$('.item').click(function(event) {
	addToCart(event.currentTarget.id);
})


function addToCart(id) {
	$("#cart").removeClass('cart-border');
	$('#'+id).addClass('in-cart');

	if (inCart(id)) {
		plus(id)
	} else {
		cart.push([id, 1]);
		render_cart()
	}
}

function render_cart() {
	$('.cart-item').remove();
	let total = 0;
	for (let i = 0; i < cart.length; i++) {
		var id = cart[i][0],
			qty = cart[i][1];
		
		var item = $('#' + id),
			price = $('p:eq(1)', item).text()
		
		total += parseFloat(price.split('$')[1]) * qty;

		var itemImg = item.find('img').attr('src');
		var itemName = item.find('p:first').html();

		var divClone = $("#cart_sample").clone();
		divClone.find('.cart-img').attr('src', itemImg);
		divClone.find('.description span:first').html(itemName);
		divClone.find('.description span:eq(1)').html(price);
		divClone.find('.minus-btn').attr('onclick', "minus('" + id + "')");
		divClone.find('.plus-btn').attr('onclick', "plus('" + id + "')");
		divClone.find('.delete-btn').attr('onclick', "remove('" + id + "')");
		divClone.find('input').attr('name', id);
		divClone.find('input').val(qty);
		divClone.find('input').attr('onkeyup', "setQty(event, '" + id + "')");
		divClone.attr("id", "cart_item_" + id);
		divClone.attr("class", "cart-item row");
		$(divClone).insertBefore('#total');		
	}
	
	$("#total span").text(total.toFixed(2));
}

function minus(id, remove = false) {
	for (let i = 0; i < cart.length; i++) {
		if (cart[i][0] == id && cart[i][1] > 1) {
			cart[i][1] -= 1;
			render_cart()
			return true;
		}		
	}
	return false;
}

function remove(id) {
	$('#'+id).removeClass('in-cart');
	rmFromArr(cart, id)
	render_cart()
}

function plus(id) {
	for (let i = 0; i < cart.length; i++) {
		if (cart[i][0] == id) {
			cart[i][1] += 1;
			render_cart()
			return true;
		}		
	}
	return false;
}

function setQty(event, id) {
	if ((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105) || event.key === "Backspace" || event.key === "Delete") { 
		var qty = $(event.target).val();
		for (let i = 0; i < cart.length; i++) {
			if (cart[i][0] == id) {
				cart[i][1] = qty;
				render_cart()
				$("#cart_item_" + id).find("input").focus();
				return true;
			}		
		}
		return false;
	} else {
		event.preventDefault(); // Prevents non-numerical keyboard presses. Not works with Firefox
	}
}



function inCart(id) {
	for (let i = 0; i < cart.length; i++) {
		if (cart[i][0] == id) {
			return true;
		}		
	}
	return false;
}

function rmFromArr(arr, item) {
	for( var i = 0; i < arr.length; i++){ 
		if ( arr[i][0] === item) {
			arr.splice(i, 1);
			return true;
		}
	}
	return false;
}


