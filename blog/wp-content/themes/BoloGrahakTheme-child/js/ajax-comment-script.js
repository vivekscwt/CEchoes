jQuery(document).ready(function($) {
    // Override the default comment submit function
    $('#commentform').submit(function() {
        var form = this;

        // Add a loading indicator
        $('#comment-submit').attr('disabled', 'disabled').after('<span class="comment-loading">Submitting...</span>');

        // Send the AJAX request
        $.ajax({
            type: $(form).attr('method'),
            url: $(form).attr('action'),
            data: $(form).serializeArray(),
            success: function(data) {
                // Check if the comment was added successfully
                if (data === 'success') {
                    // Clear the comment form
                    $(form).find('textarea').val('');
                    $(form).find('.comment-loading').remove();

                    // Display a success message or perform other actions
                    console.log('Comment submitted successfully!');
                } else {
                    // Handle error or display error message
                    console.log('Comment submission error!');
                }

                // Enable the submit button
                $('#comment-submit').removeAttr('disabled');
            },
            error: function() {
                // Handle error or display error message
                console.log('Comment submission error!');
                $('#comment-submit').removeAttr('disabled');
            }
        });

        return false;
    });
});
