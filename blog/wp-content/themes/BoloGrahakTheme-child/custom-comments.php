<?php
/**
 * The template for displaying comments.
 *
 * @package WordPress
 * @subpackage bolo-grahak
 * @since CEchoes Technology 1.0
 */

if ( post_password_required() ) {
    return;
}
?>

<section class="main-content">
	<div class="container">
		<div class="comments-content">
			<div class="comments-form">

    <?php if ( have_comments() ) : ?>

        <ol class="comment-list">
            <?php
            wp_list_comments(
                array(
                    'style'       => 'ol',
                    'short_ping'  => true,
                    'avatar_size' => 42,
                )
            );
            ?>
        </ol><!-- .comment-list -->

        <?php
        the_comments_pagination(
            array(
                'prev_text' => '<span class="screen-reader-text">' . __( 'Previous', 'twentytwenty' ) . '</span>',
                'next_text' => '<span class="screen-reader-text">' . __( 'Next', 'twentytwenty' ) . '</span>',
            )
        );
        ?>

    <?php endif; // Check for have_comments(). ?>



			</div>
		</div>
	</div>
</section><!-- #comments -->