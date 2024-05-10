jQuery(document).ready(function($) {
// /////////////////////////////////////// Auto Field Dropdown Start
var timer;
$("#search-input").keyup(function(){
  clearTimeout(timer);
  var keyword = $(this).val();
  if (keyword.length >= 3) {
    timer = setTimeout(function() {
      performSearch(keyword);
    }, 500);
  } else {
    $('.autofield-dropdown').html(''); // Clear search results if less than three letters
  }
})
// Function to perform the AJAX search
function performSearch(keyword) {
  $.ajax({
    url: blog_search_ajax_object.ajax_url, // Use WordPress AJAX URL
    type: 'POST',
    data: {
      action: 'blog_search_action', // Custom AJAX action
      keyword: keyword // Send the keyword to the server
    },
    success: function(response) {
      // Display search results
      $('.autofield-dropdown').html(response);
      $('.autofield-dropdown').show();
    }
  });
}
});
