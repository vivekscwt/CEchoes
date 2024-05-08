<?php
/**
API Name: Blog Home API
API Version: 1.0.1
*/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json; charset=UTF-8");

require( '../wp-load.php' );
global $wpdb;
$postdata = file_get_contents("php://input");
$request = json_decode($postdata, true);
$data = array();
$post_items = [];

$args = array(
    'posts_per_page'  => 1,
    'post_status' => 'publish',
);
query_posts($args);
if (have_posts()) : while (have_posts()) : the_post();
$ID = get_the_ID();
$thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'home-blog-thumb' );
$alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
$title = get_the_title();
$the_title = strip_tags($title);
if(strlen($the_title)>45){
  $the_title = substr($the_title,0,45).'..';
}
  $post_items[] = array(
                    'id' =>  $ID,
                    'title'  =>  $title,
                    'publish_date'  =>  get_the_time(__('M d, Y', 'kubrick')),
                    'thumbnail'  =>  $thumbnail['0'],
                    'thumbnail_alt'  =>  $alt_text,
                    'thumbnail_alt'  =>  $alt_text,
                    'permalink' => get_the_permalink()
                  );
endwhile; endif; wp_reset_query();


$args = array(
    'posts_per_page'  => 2,
    'post_status' => 'publish',
    'offset'  => 1,
);
query_posts($args);
if (have_posts()) : while (have_posts()) : the_post();
$ID = get_the_ID();
$thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'trending-blog-thumb' );
$alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
$title = get_the_title();
$the_title = strip_tags($title);
if(strlen($the_title)>45){
  $the_title = substr($the_title,0,45).'..';
}
  $post_items[] = array(
                    'id' =>  $ID,
                    'title'  =>  $title,
                    'publish_date'  =>  get_the_time(__('M d, Y', 'kubrick')),
                    'thumbnail'  =>  $thumbnail['0'],
                    'thumbnail_alt'  =>  $alt_text,
                    'thumbnail_alt'  =>  $alt_text,
                    'permalink' => get_the_permalink()
                  );
endwhile; endif; wp_reset_query();
if(count($post_items)>0){
  $data = array(
    'status' => 'ok',
    'data' => $post_items,
    'success_message' => 'All posts for home page',
    'error_message' => ''
    );
}else{
  $data = array(
      'status' => 'error',
      'data' => '',
      'success_message' => '',
      'error_message' => 'No result found'
      );
}
echo json_encode($data);
?>