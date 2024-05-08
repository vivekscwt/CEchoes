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

$keyword = $request['keyword'];
$args = array(
  'posts_per_page'   => -1,
  'post_type'        => 'post',
  's'   =>  $keyword, 
  'post_status'      => 'publish'
);
query_posts($args);
$response = '<ul class="p-0 m-0">';
if (have_posts()) : while (have_posts()) : the_post();
  $get_the_excerpt = strip_tags(get_the_excerpt());
  $response .= '<li><a href="#" data-resulttitle="'.get_the_title().'" data-resultexcerpt="'.$get_the_excerpt.'" data-resultpermalink="'.get_the_permalink().'" >'.get_the_title().'</a></li>';
endwhile; endif; wp_reset_query();
$response .= '</ul>';
echo json_encode($response);
?>