jQuery(document).ready(function($) {
    $('#commentform').on('submit', function(e) {
        e.preventDefault();

        var formData = new FormData(this);
        formData.append('action', 'submit_comment'); // Add an action for server-side processing

        $.ajax({
            type: 'POST',
            url: ajaxurl,
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                console.log(response);
            }
        });
    });
});
