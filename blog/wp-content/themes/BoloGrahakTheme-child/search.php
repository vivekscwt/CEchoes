<?php
/**
 * The template for displaying Search Results pages
 *
 * @package WordPress
 * @subpackage bolo_grahak
 * @since CEchoes Technology 1.0
 */
get_header();?>
<!-- ============== Inner Heading Start =============== -->
<section class="inner-page-heading">
   <div class="container">
      <div class="inner-page-heading-in">
         <div class="left-inner-head">
            <h2 class="m-0">
				<?php printf( __( 'Search Results for: %s', 'twentyfourteen' ), get_search_query() ); ?>
            </h2>
         </div>
         <div class="right-inner-head">
            <div class="bread-crumb">
               <ul>
                  <li><a href="<?php echo MAIN_URL_BG; ?>">Home</a></li>
                  <li><?php echo get_the_title(10); ?></li>
               </ul>
            </div>
         </div>
      </div>
   </div>
</section>
<!-- ============== Inner Heading End =============== -->

<!-- ============== Latest Post Start =============== -->
<section class="main-content latest-post-content">
   <div class="container">
      <h2 class="main-head"><small>View Our</small> <br>Latest <span>Post</span></h2>
      <div class="post-slider">
        <?php
        $args = array(
            'posts_per_page'   => 5,
            'post_status'      => 'publish'
        );
        query_posts($args);
        // $the_query = new WP_Query( $args );
        // echo $the_query->found_posts;
        ?>
        <?php if (have_posts()) : while (have_posts()) : the_post();
                $ID = get_the_ID();
                $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'latest-blog-thumb' );
                $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
          ?>
         <div class="item">
            <div class="post-box position-relative">
               <div class="post-left">
                  <img src="<?php echo $thumbnail['0']; ?>" alt="<?php echo $alt_text;?>" width="619" height="425">
               </div>
               <div class="post-right">
                  <div class="post-right-wrap">
                     <span class="date-tag"><?php the_time(__('M d, Y', 'kubrick')) ?></span>
                     <span class="viewers-tag"><i class="fa-regular fa-eye"></i> <?php echo pvc_get_post_views( $ID ); ?> views</span>
                     <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                     <p><?php echo get_the_excerpt(); ?></p>
                     <div class="show-category position-relative d-flex align-items-center justify-content-between">
                        <div class="category-name">
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
                        </div>
                        <div class="over-angle-right"><a href="<?php the_permalink(); ?>"><i class="fa-solid fa-angle-right"></i></a>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
        <?php endwhile; endif; wp_reset_query(); ?>
      </div>
   </div>
</section>
<!-- ============== Latest Post End =============== -->
 <?php 
  $popular_tags = get_terms( array(
      'taxonomy' => 'post_tag',
      'orderby' => 'count',
      'order' => 'DESC',
      'number' => 10, // Specify the number of popular tags to retrieve
  ) );
  if ( ! empty( $popular_tags ) && ! is_wp_error( $popular_tags ) ) {
 ?>
<!-- ============== Populra Tag Start =============== -->
<section class="main-content popular-tag-content d-md-block d-none">
   <div class="container">
      <div class="pop-all-tags position-relative">
         <span>
            <h2 class="main-head m-0">Popular Tags :</h2>
         </span>
         <marquee behavior="scroll" direction="left" onmouseover="this.stop();" onmouseout="this.start();">
            <ul class="p-0 m-0">
              <?php foreach ( $popular_tags as $tag ) { ?>
                <li><a href="<?php echo get_term_link( $tag ); ?>"><?php echo $tag->name; ?></a></li>
              <?php } ?>
            </ul>
         </marquee>
      </div>
   </div>
</section>
<!-- ============== Populra Tag End =============== -->
<?php } ?>
<!-- ============== Blog Start =============== -->
<section class="main-content bottom-main-content">
   <div class="container">
   	<div class="row">
         <div class="col-md-12">
            <div class="all-blogs">
               <div class="all-blogs-head d-flex align-items-center justify-content-between position-relative">
                  <div class="h-item">
                     <h2 class="main-head m-0">Search Results for: <span><?php printf( __( '%s', 'twentyfourteen' ), get_search_query() ); ?></span></h2>
                  </div>
                  <div class="h-item"><a href="#" class="search-pop"><i class="fa-solid fa-magnifying-glass"></i></a><a href="#" class="archive-slide"><i class="fa-regular fa-sliders"></i></a></div>
                  <div class="archive-dropdwn">
                     <ul class="p-0 m-0">
                      <?php $args = array(
                              'type' => 'yearly',
                            );
                          echo wp_get_archives( $args );
                      ?>
                     </ul>
                  </div>
               </div>
            </div>
         </div>   		
   	</div>
      <?php
      $args_last = array(
          'posts_per_page'  => -1,
          'post_status' => 'publish',
    	  's' => $_GET['s'],
      );
      query_posts($args_last);
      ?>
      <?php if (have_posts()) :?>
      <div class="load-blogs-slice" style="display: block;">
         <div class="row">
          <?php 
                $row_item_count = 1;  
                while (have_posts()) : the_post();
                $ID = get_the_ID();
                $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'blog-thumb' );
                $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
          ?>
            <div class="col-lg-3 col-sm-6">
               <div class="all-blogs-part position-relative">
                  <a href="<?php the_permalink(); ?>"><img src="<?php echo $thumbnail['0']; ?>" alt="<?php echo $alt_text;?>" loading="lazy" width="564" height="387" class="w-100"></a>
                  <div class="blog-overlay-caption">
                     <span class="date-tag"><?php the_time(__('M d, Y', 'kubrick')) ?></span>
                     <span class="viewers-tag"><i class="fa-regular fa-eye"></i> <?php echo pvc_get_post_views( $ID ); ?> views</span>
                     <h3 title="<?php the_title(); ?>"><a href="<?php the_permalink(); ?>">
                      <?php 
                        $title = get_the_title();
                        $the_title = strip_tags($title);
                        if(strlen($the_title)>35){
                        $the_title = substr($the_title,0,35).'..';
                        echo $the_title;
                        }else{
                        echo $the_title;
                        }     
                      ?>
                     </a> <span><a href="<?php the_permalink(); ?>"><i class="fa-solid fa-angle-right"></i></a></span></h3>
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
            <?php if($row_item_count==4){?>
              </div></div><div class="load-blogs-slice" style="display: block;"><div class="row">
            <?php $row_item_count = 0; } ?>
          <?php $row_item_count++; endwhile;?>
         </div>
      </div>
      <?php else : ?>
      	<div class="row"><p class="center"><?php _e('No result found', 'kubrick'); ?></p></div>
      <?php endif; wp_reset_query(); ?>
      <!-- ==================== Load blog slice End ===================== -->
   </div>
</section>
<!-- ============== Blog End =============== -->
<div id="search-box">
   <div class="container">
      <a class="close" href="#close"></a>
      <div class="search-main">
         <div class="search-inner">
          <form method="get" action="<?php echo home_url( '/' ); ?>">
            <input type="text" id="inputSearch" name="s" placeholder="Search..">
            <input type="hidden" name="post_type" value="post">
            <input type="submit">
          </form>
         </div>
      </div>
   </div>
</div>
<?php get_footer();?>