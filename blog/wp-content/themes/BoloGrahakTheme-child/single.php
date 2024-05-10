<?php
/**
 * The Template for displaying all single posts
 *
 * @package WordPress
 * @subpackage bolo_grahak
 * @since CEchoes Technology 1.0
 */
if (is_user_logged_in()) {
	$current_user = wp_get_current_user();
	$user_full_name = $current_user->user_firstname.' '.$current_user->user_lastname;
    $user_email = $current_user->user_email;
}else{
	$user_full_name = '';
    $user_email = '';
}
get_header(); ?>
<?php
	if( isset($_GET['from_app']) && $_GET['from_app']=='true' ){
		// Hide header
	}else{
?>
<!-- ============== Inner Heading Start =============== -->
<section class="inner-page-heading">
	<div class="container">
		<div class="inner-page-heading-in">
			<div class="left-inner-head">
				<div class="bread-crumb">
					<ul>
						<li><a href="<?php echo MAIN_URL_BG; ?>">Home</a></li>
						<li><a href="<?php echo site_url(); ?>/"><?php echo get_the_title(10); ?></a></li>
						<li><?php the_title(); ?></li>
					</ul>
				</div>
			</div>
			<div class="right-inner-head">
			</div>
		</div>
	</div>
</section>
<!-- ============== Inner Heading End =============== -->
<?php }?>
<!-- ============== Blog Cover Start =============== -->
<section class="main-content">
	<div class="container">
		<?php if (have_posts()) : while (have_posts()) : the_post();
			$current_post_ID = get_the_ID();
            $blog_banner = wp_get_attachment_image_src( get_post_thumbnail_id( $current_post_ID ), 'blog-banner' );
            $blog_mobile_banner = wp_get_attachment_image_src( get_post_thumbnail_id( $current_post_ID ), 'blog-mobile-banner' );
            $blog_tab_banner = wp_get_attachment_image_src( get_post_thumbnail_id( $current_post_ID ), 'blog-tab-banner' );
            $blog_smalld_banner = wp_get_attachment_image_src( get_post_thumbnail_id( $current_post_ID ), 'blog-smalld-banner' );
            $alt_text = get_post_meta(get_post_thumbnail_id( $current_post_ID ), '_wp_attachment_image_alt', true);
		?>
		<div class="blog-cover position-relative mb-sm-5 mb-4">
			<?php if($blog_banner){?>
			<picture>
				<source media="(max-width:575px)" srcset="<?php echo $blog_mobile_banner['0']; ?>" width="551" height="205">
				<source media="(max-width:767px)" srcset="<?php echo $blog_tab_banner['0']; ?>" width="745" height="277">
				<source media="(max-width:991px)" srcset="<?php echo $blog_smalld_banner['0']; ?>" width="965" height="359">
				<img src="<?php echo $blog_banner['0']; ?>" alt="<?php echo $alt_text;?>" width="1142" height="425" loading="lazy" class="w-100">
			</picture>
			<?php }else{?>
			<picture>
				<source media="(max-width:575px)" srcset="<?php echo get_stylesheet_directory_uri();?>/images/no-banner.jpg" width="551" height="205">
				<source media="(max-width:767px)" srcset="<?php echo get_stylesheet_directory_uri();?>/images/no-banner.jpg" width="745" height="277">
				<source media="(max-width:991px)" srcset="<?php echo get_stylesheet_directory_uri();?>/images/no-banner.jpg" width="965" height="359">
				<img src="<?php echo get_stylesheet_directory_uri();?>/images/no-banner.jpg" alt="<?php echo $alt_text;?>" width="1142" height="425" loading="lazy" class="w-100">
			</picture>
			<?php }?>
			
			<div class="blog-cover-overlay">
				<span class="date-tag"><?php the_time(__('M d, Y', 'kubrick')) ?></span>
				<span class="viewers-tag"><i class="fa-regular fa-eye"></i><?php echo pvc_get_post_views( $current_post_ID ); ?> views</span>
				<h1><?php the_title(); ?></h1>
				<p class="m-0">
         <?php 
            $categories = get_the_category();

            if (!empty($categories)) {
                $excluded_category = get_term_by('name', 'Uncategorized', 'category');
                if ($excluded_category) {
                    $excluded_category_id = $excluded_category->term_id;
                    $categories = array_filter($categories, function ($category) use ($excluded_category_id) {
                        return $category->term_id !== $excluded_category_id;
                    });
                }

                if (!empty($categories)) {
                    $category_links = array_map(function ($category) {
                        return sprintf('<a href="%s">%s</a>', esc_url(get_category_link($category->term_id)), esc_html($category->name));
                    }, $categories);

                    $category_list = implode(', ', $category_links);

                    printf(__('Category: %s', 'kubrick'), $category_list);
                }
            }
         ?>
				</p>
			</div>
		</div>

		<div class="default-content">
			<?php if( isset($_GET['from_app']) && $_GET['from_app']=='true' ){ ?>
				<div class="inner-tags">
					<?php
					$tags = get_the_tags(); // Get the tags associated with the current post

					if ($tags) {
						echo '<strong>Tags:</strong> ';

						foreach ($tags as $tag) {
							echo $tag->name; // Display the tag name without the link
							if ($tag !== end($tags)) {
								echo ', '; // Add a comma and space between tags
							}
						}
					}
					?>
				</div>
			<?php }else{?>
				<div class="inner-tags"><?php the_tags(__('Tags:', 'kubrick') . ' ', ', ', '<br />'); ?></div>
			<?php }?>
			<?php the_content(); ?>
			<div class="social-icons">
				<a href="https://www.facebook.com/sharer?u=<?php echo urlencode(get_the_permalink($current_post_ID));?>&t=<?php echo urlencode(get_the_title($current_post_ID));?>" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-facebook-f"></i></a>
				<a href="https://twitter.com/intent/tweet?text=<?php echo get_the_title($current_post_ID); ?>&url=<?php echo urlencode(get_the_permalink($current_post_ID));?>" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-twitter"></i></a>
				<a href="https://www.linkedin.com/shareArticle?mini=true&url=<?php echo urlencode(get_the_permalink($current_post_ID));?>&title=<?php echo urlencode(get_the_title($current_post_ID));?>&summary=<?php echo urlencode(get_the_excerpt($current_post_ID));?>&source=<?php bloginfo('name');?>" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-linkedin-in"></i></a>
				<a href="https://api.whatsapp.com/send?text=<?php echo urlencode(get_the_title($current_post_ID));?>%0a<?php echo urlencode(get_the_permalink($current_post_ID));?>" target="_blank"><i class="fa-brands fa-whatsapp"></i></a>
			</div>
		</div>
	<?php endwhile; endif; ?>
	</div>
</section>
<!-- ============== Blog Cover End =============== -->
<!-- ============== Liking Article Start =============== -->
<?php if(get_field('poll_shortcode')){
	$shortcode = "[ays_poll id=".get_field('poll_shortcode')."]";
?>
<section class="main-content liking-article">
	<div class="container">
		<!-- <h2 class="main-head text-center">How Are you Liking The Article</h2>
		<img src="<?php echo get_stylesheet_directory_uri();?>/images/progress-bar.png" alt="img" class="w-100">
		<div class="text-center"><input type="submit" class="btn-default btn-warning" name="" value="Submit"></div> -->
		<?php echo do_shortcode( $shortcode ); ?>
	</div>
</section>
<?php } ?>
<!-- ============== Liking Article End =============== -->
<!-- ============== Blog Start =============== -->
<?php
// if (comments_open() || get_comments_number()) {
//     comments_template('/custom-comments.php');
// }
?>
<section class="main-content">
	<div class="container">
		<div class="comments-content">
			<div class="comments-form">
				<h2 class="main-head text-center">Your Comment</h2>
				<?php $commenter = wp_get_current_commenter(); ?>
				<form action="<?php echo esc_url(site_url('/wp-comments-post.php')); ?>" method="post" id="commentform" class="comment-form" enctype="multipart/form-data">
				   <div class="row">
				      <div class="col-sm-6">
				         <div class="input-wrap"><input id="author" class="form-control" placeholder="Name" name="author" type="text" value="<?php echo $user_full_name; ?>" required=""></div>
				      </div>
				      <div class="col-sm-6">
				         <div class="input-wrap"><input id="email" name="email" type="email" placeholder="Email" class="form-control" value="<?php echo $user_email; ?>" required=""></div>
				      </div>
					  
				      <!--<div id="acf-form-data" class="acf-hidden">
							   <input type="hidden" id="_acf_screen" name="_acf_screen" value="comment">
							   <input type="hidden" id="_acf_post_id" name="_acf_post_id" value="0">
							   <input type="hidden" id="_acf_validation" name="_acf_validation" value="1">
							   <input type="hidden" id="_acf_nonce" name="_acf_nonce" value="cfeccf9c96">
							   <input type="hidden" id="_acf_changed" name="_acf_changed" value="0">	
							</div>
				      <div class="col-sm-6">
				         <div class="input-wrap">
				         		<input type="hidden" class="form-control" name="acf[field_64a7c8d163da7]" value="" data-name="id">
				         		<input type="file" name="acf[field_64a7c8d163da7]" class="form-control" id="acf-field_64a7c8d163da7" key="field_64a7c8d163da7" accept="image/png, image/jpeg">
				         		<input type="hidden" name="acf[field_64a7c8d163da7_file_nonce]" value="f963efb260">
				         </div>
				      </div>
				      <div class="col-sm-6">
				         <div class="input-wrap">
				        	<input type="text" id="acf-field_64a7c8f963da8" class="form-control" placeholder="Designation" name="acf[field_64a7c8f963da8]">
				         </div>
				      </div>-->
				   </div>
				   <div class="row">
				      <div class="col-sm-12">
				         <div class="input-wrap"><textarea id="comment" name="comment" rows="4" class="form-control" placeholder="Comments" required=""></textarea></div>
				      </div>
				   </div>
				   <p class="comment-form-cookies-consent"><input id="wp-comment-cookies-consent" name="wp-comment-cookies-consent" type="checkbox" value="yes" checked=""> <label for="wp-comment-cookies-consent">Save my name, email, and website in this browser for the next time I comment.</label></p>
				   <div class="col-sm-12">
				      <div class="text-center">
				      	<input name="submit" type="submit" id="submit" class="btn-default btn-warning" value="Send">
				      	<input type="hidden" name="comment_post_ID" value="<?php echo get_the_ID(); ?>" id="comment_post_ID">
				        <input type="hidden" name="comment_parent" id="comment_parent" value="0">
				      </div>
				   </div>
				</form>
				<div id="comment-success-message" class="text-center" style="display:none; margin-top: 20px;"><p>Thank you for your comment, Your comment is awaiting moderation.</p></div>	
			</div>
		</div>
	</div>
</section>
<?php
$args = array(
    'post_id' => $current_post_ID, // Set the post ID
    'status' => 'approve', // Retrieve only approved/published comments
);
$comments = get_comments($args);
if($comments){
?>
<section class="main-content pt-0">
	<div class="comments-show">
		<h2 class="main-head text-center">All Comments</h2>
		<div class="comment-slider">
		<?php foreach ($comments as $comment) {
			//-- Get Comment User Node Info
			$user_query = $wpdb->prepare(
				"
				SELECT ur.user_id, ur.email, ur.first_name, ur.last_name, urm.profile_pic
				FROM `users` ur
				LEFT JOIN `user_customer_meta` urm ON ur.user_id = urm.user_id
				WHERE ur.email = %s
				",
				$comment->comment_author_email
			);
			$user_query_results = $wpdb->get_results($user_query);
			if($user_query_results[0]->profile_pic!=''){
				$profile_pic = $user_query_results[0]->profile_pic;
			}else{
				$profile_pic = 'assets/media/avatars/blank.png';
			}
		?>
		  <div class="item">
		  	<div class="comments-box">
		  		<div class="user-img">
		  			<img src="<?php echo MAIN_URL_BG.$profile_pic;?>" alt="<?php echo $comment->comment_author; ?>" width="80" height="80" loading="lazy">
		  		</div>
		  		<div class="user-comments">
		  			<div class="user-comments-wrap">
						  <p><?php echo $comment->comment_content; ?></p>
						  <h4 class="m-0"><?php echo $comment->comment_author; ?></h4>
						  <?php if(get_field('designation', $comment)){ ?>
						  	<p class="m-0"><small>14th July, 2023</small></p>
							<?php } ?>
					  </div>
					</div>
			 </div>
		  </div>
			<?php } ?>
	   </div>
	</div>
</section>
<?php } ?>
<?php
	if( isset($_GET['from_app']) && $_GET['from_app']=='true' ){
	// Hide header
	}else{
?>
<section class="main-content bottom-main-content pt-0">
  <div class="container">
		<?php $categories = get_the_category($current_post_ID);
			$category_ids = array();
			foreach ($categories as $category) {
			    $category_ids[] = $category->term_id;
			}
			$args = array(
			    'post_type' => 'post',
			    'posts_per_page' => 6, // Adjust the number of related posts to display
			    'post__not_in' => array($current_post_ID),
			    'category__in' => $category_ids,
			    'orderby' => 'rand', // Display related posts in random order
			);
			$related_query = new WP_Query($args);
		if ($related_query->have_posts()) {		
		?>
		<div class="relate-post-content">
			<h2 class="main-head text-center">Related <span>Post</span></h2>
			<div class="trending-blog">
				<div class="row">
				<?php while ($related_query->have_posts()) { $related_query->the_post();
	                $ID = get_the_ID();
	                $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'trending-blog-thumb' );
	                $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
				?>
					<div class="col-md-6">
						<div class="relate-post-wrap">
							<div class="row">
								<div class="col-6 my-auto">
									<div class="small-blog-img">
										<img src="<?php echo $thumbnail['0']; ?>" alt="<?php echo $alt_text;?>" loading="lazy" width="264" height="215">
									</div>
								</div>
								<div class="col-6 my-auto">
									<div class="small-blog-text">
										<span class="date-tag"><?php the_time(__('M d, Y', 'kubrick')) ?></span>
										<span class="viewers-tag"><i class="fa-regular fa-eye"></i> <?php echo pvc_get_post_views( $ID ); ?> views</span>
										<h4><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h4>
										<p class="category-name m-0">
                     <?php 
                        $categories = get_the_category();

                        if (!empty($categories)) {
                            $excluded_category = get_term_by('name', 'Uncategorized', 'category');
                            if ($excluded_category) {
                                $excluded_category_id = $excluded_category->term_id;
                                $categories = array_filter($categories, function ($category) use ($excluded_category_id) {
                                    return $category->term_id !== $excluded_category_id;
                                });
                            }

                            if (!empty($categories)) {
                                $category_links = array_map(function ($category) {
                                    return sprintf('<a href="%s">%s</a>', esc_url(get_category_link($category->term_id)), esc_html($category->name));
                                }, $categories);

                                $category_list = implode(', ', $category_links);

                                printf(__('Category: %s', 'kubrick'), $category_list);
                            }
                        }
                     ?>
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				<?php } ?>
				</div>
			</div>
		</div>
		<?php } wp_reset_postdata(); ?>
	</div>
</section>
<!-- ============== Blog End =============== -->
<?php }?>
<?php get_footer();?>
<script>
	jQuery(document).ready(function($) {
	    // Remove the 'novalidate' attribute from the comment form
	    $('#commentform').removeAttr('novalidate');

	    // Check if the URL contains "#comment-"
	    if (window.location.hash.indexOf('#comment-') !== -1) {
	        $('#comment-success-message').show();
	        var targetOffset = $('#commentform').offset().top;
	        // Scroll to the target element smoothly
			    $('html, body').animate({
			        scrollTop: targetOffset
			    }, 800); // Adjust the animation duration as needed
	    }	    
	});
</script>
