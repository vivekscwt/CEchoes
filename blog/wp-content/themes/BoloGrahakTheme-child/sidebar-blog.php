<?php
/**
 * The Sidebar containing the main widget area
 *
 * @package WordPress
 * @subpackage Twenty_Fourteen
 * @since Twenty Fourteen 1.0
 */
?>
    <div class="right-panel">

      <div class="widget-panel">
        <div class="join-area">
          <h2><img src="images/thumb-icon.png" alt=""> DISCOVER YOUR SUPER POWERS</h2>
          <p>Join my mailing list and receive a free meditation designed tounleash your ability to heal and increase overall resilience.</p>
          <div class="form-sec">
            <form>
              <input type="text" placeholder="Name">
              <input type="text" placeholder="Email">
              <input type="submit" value="Join!">
            </form>
          </div>
        </div>
      </div>

      <div class="widget-panel">
        <header>Latest Posts</header>
        <div class="widget-body-panel">
          
          <?php $args = array( 'post_type' => 'post',
                               'posts_per_page' => 3 );
          query_posts($args);
          if (have_posts()) : while (have_posts()) : the_post(); ?>
           <div class="sub-post-sec">
              <h3><a href="<?php the_permalink();?>"><?php the_title();?></a></h3>
              <ul>
                <li><?php echo get_the_date('M j, Y');?></li>
                <li><?php echo get_the_category_list($separator = ', ');?></li>
              </ul>
           </div>
           <?php endwhile; endif; wp_reset_query(); ?>

        </div>
      </div>


      <div class="widget-panel">
        <header>Categories</header>
        <div class="widget-body-panel">
          <ul>
            <?php $categories = get_categories( array(
              'taxonomy' => 'category',
              'hide_empty'   => 1
            ) );
            foreach($categories as $cat) { ?>
              <li><a href="<?php echo get_category_link($cat->term_id); ?>"><?php echo $cat->name; ?></a></li>
            <?php } ?>
          </ul>
        </div>
      </div>


      <div class="widget-panel">
        <header>Archives</header>
        <div class="widget-body-panel">
          <ul>
            <?php $my_archives=wp_get_archives(array( 'post_type'=>'post' ));
            print_r($my_archives); ?>
          </ul>
        </div>
      </div>
      
    </div>