<?php
if(isset($_GET['login_check'])) {
    wp_set_current_user($_GET['login_check']);//Set current user
    wp_set_auth_cookie( $_GET['login_check'], true );
    $home_url = MAIN_URL_BG.ltrim($_GET['currentUrlPath'], '/');
    wp_redirect($home_url);
    exit;
}

add_action( 'after_setup_theme', 'baw_theme_setup' );
function baw_theme_setup() {
 add_image_size( 'latest-blog-thumb', 619, 425, true );
 add_image_size( 'trending-blog-thumb', 264, 215, true );
 add_image_size( 'home-blog-thumb', 564, 387, true );
 add_image_size( 'blog-thumb', 267, 183, true );
 add_image_size( 'blog-banner', 1142, 425, true );
 add_image_size( 'blog-mobile-banner', 551, 205, true );
 add_image_size( 'blog-tab-banner', 745, 277, true );
 add_image_size( 'blog-smalld-banner', 965, 359, true );
}

//------Disable Admin bar----------------------//
function disable_admin_bar_for_all_users() {
    return false;
}
add_filter('show_admin_bar', 'disable_admin_bar_for_all_users');

//----- Disallow to access WP admin dashboard-----------//
function restrict_dashboard_access_for_subscribers() {
    // Check if the user is logged in and has the 'subscriber' role
    if (is_user_logged_in() && current_user_can('subscriber') && is_admin()) {
        // Redirect subscribers to the home URL
        wp_redirect(home_url());
        exit;
    }
}
add_action('admin_init', 'restrict_dashboard_access_for_subscribers');

// Delete Node cookie on WP Logout-------//
function delete_another_cookie_on_logout() {
    // Replace 'cookie_name_to_delete' with the name of the cookie you want to delete
    $cookie_name = 'user';
    $cookie_value = ''; // The value of the cookie is not important for deletion
    $cookie_expiration = time() - 3600; // Set the expiration time to a past date (1 hour ago)

    // Set the cookie with the past expiration time to delete it
    setcookie($cookie_name, $cookie_value, $cookie_expiration, '/');
}
add_action('wp_logout', 'delete_another_cookie_on_logout');



function gsdu(){
    echo get_stylesheet_directory_uri();
}

//To disable the ability to assign posts to the "Uncategorized" category in WordPress
function disable_uncategorized_category($terms, $taxonomy) {
    if ($taxonomy === 'category') {
        foreach ($terms as $key => $term) {
            if ($term->name === 'Uncategorized') {
                unset($terms[$key]);
                break;
            }
        }
    }
    return $terms;
}
add_filter('get_terms', 'disable_uncategorized_category', 10, 2);


// post Details page Custom Comment Form
function enqueue_custom_scripts() {
    wp_enqueue_script('jquery');
    //wp_enqueue_script('custom-script', get_template_directory_uri() . '/js/custom-script.js', array('jquery'), '1.0', true);
    wp_enqueue_script('search-scripts', get_stylesheet_directory_uri() . '/js/search-js.js', array('jquery'), '1.0', true);

    // Localize the AJAX URL
    wp_localize_script('search-scripts', 'blog_search_ajax_object', array(
        'ajax_url' => admin_url('admin-ajax.php')
    ));    
}
add_action('wp_enqueue_scripts', 'enqueue_custom_scripts');

function enable_ajax_comments() {
    wp_enqueue_script('comment-reply');
    if (is_singular() && comments_open() && get_option('thread_comments')) {
        wp_enqueue_script('ajax-comment-script', get_template_directory_uri() . '/js/ajax-comment-script.js', array('jquery'), '1.0', true);
    }
}
add_action('wp_enqueue_scripts', 'enable_ajax_comments');

function handle_ajax_comment_submission() {
    // Check for the custom action
    if (isset($_POST['action']) && $_POST['action'] === 'submit_comment') {
        // Get the comment fields
        $comment_data = array(
            'comment_content' => $_POST['comment'],
            'comment_author'  => $_POST['author'],
            'comment_author_email' => $_POST['email'],
            'comment_author_url'   => $_POST['url'],
            'comment_upload_image' => $_FILES['comment_upload_image'], // Handle the uploaded image
            'comment_designation' => $_POST['comment_designation'], // Get the designation field value
        );

        // Process and save the comment data
        $comment_id = wp_new_comment($comment_data);
        if ($comment_id) {
            echo 'success'; // Send a success response
        } else {
            echo 'error'; // Send an error response
        }
    }

    exit(); // Always exit after processing AJAX requests
}
add_action('wp_ajax_submit_comment', 'handle_ajax_comment_submission');
add_action('wp_ajax_nopriv_submit_comment', 'handle_ajax_comment_submission'); // For non-logged-in users

function remove_comment_form_novalidate( $defaults ) {
    $defaults['novalidate'] = '';
    return $defaults;
}
add_filter( 'comment_form_defaults', 'remove_comment_form_novalidate' );

// Handle the AJAX request and perform the blog search
function blog_search_action_callback() {
    $keyword = $_POST['keyword'];
    $args = array(
      'posts_per_page'   => -1,
      'post_type'        => 'post',
      's'   =>  $keyword, 
      'post_status'      => 'publish'
    );
    query_posts($args);
    $response = '<ul class="p-0 m-0">';
    if (have_posts()) : while (have_posts()) : the_post();
        $response .= '<li><a href="#" data-resulttitle="'.get_the_title().'" data-resultexcerpt="'.get_the_excerpt().'" data-resultpermalink="'.get_the_permalink().'" >'.get_the_title().'</a></li>';
    endwhile; endif; wp_reset_query();
    $response .= '</ul>';
  echo $response;
  wp_die();
}
add_action('wp_ajax_blog_search_action', 'blog_search_action_callback');
add_action('wp_ajax_nopriv_blog_search_action', 'blog_search_action_callback');


//----------Custom User Registration -----------------//
function custom_user_registration_init() {
    register_rest_route('custom/v1', '/register', array(
        'methods' => 'POST',
        'callback' => 'custom_user_registration_handler',
    ));
}
add_action('rest_api_init', 'custom_user_registration_init');

function custom_user_registration_handler($request) {
    $parameters = $request->get_params();

    // Validate user input here (e.g., check required fields, email format, etc.)

    // Example validation for required fields
    if (empty($parameters['username']) || empty($parameters['email']) || empty($parameters['password'])) {
        return new WP_Error('registration_failed', __('Username, email, and password are required.', 'text-domain'), array('status' => 400));
    }

    // Example validation for password strength (customize as needed)
    if (strlen($parameters['password']) < 6) {
        return new WP_Error('weak_password', __('Password should be at least 6 characters long.', 'text-domain'), array('status' => 400));
    }

    // Create the new user
    $user_id = wp_create_user($parameters['username'], $parameters['password'], $parameters['email']);

    if (is_wp_error($user_id)) {
        return new WP_Error('registration_failed', __('User registration failed.', 'text-domain'), array('status' => 500));
    }

    // Set custom user meta (first name and last name)
    update_user_meta($user_id, 'first_name', $parameters['first_name']);
    update_user_meta($user_id, 'last_name', $parameters['last_name']);

    // Return a success response with the user ID
    return array('user_id' => $user_id);
}

//----------Custom User Login -----------------//
// Custom User Login Endpoint
function custom_user_login_init() {
    register_rest_route('custom/v1', '/login', array(
        'methods' => 'POST',
        'callback' => 'custom_user_login_handler',
    ));
}
add_action('rest_api_init', 'custom_user_login_init');

// Custom User Login Handler
function custom_user_login_handler($request) {
    $parameters = $request->get_params();

    // Validate user input here (e.g., check required fields, email format, etc.)

    // Example validation for required fields
    if (empty($parameters['email']) || empty($parameters['password'])) {
        return new WP_Error('login_failed', __('Email and password are required.', 'text-domain'), array('status' => 400));
    }

    // Attempt to log in the user
    $creds = array(
        'user_login' => $parameters['email'],
        'user_password' => $parameters['password'],
        'remember' => true
    );
    $user = wp_signon($creds, false);

    if (is_wp_error($user)) {
        return new WP_Error('login_failed', __('Invalid email or password.', 'text-domain'), array('status' => 401));
    } else {
        // Return the user data if login is successful
        // wp_set_current_user($user->ID);//Set current user
        // wp_set_auth_cookie( $user->ID, true );
        // do_action('wp_login', $parameters['email']);
        // wp_redirect('http://localhost/bolo-grahak/blog/protected-page/');
        // exit;
        return array(
            'status' => 'ok',
            'data' => $user->ID,
            'message' => 'Login successful.'
        );
    }
}


//----------Home Latest Blog API -----------------//
function home_latest_blog_api_init() {
    register_rest_route('custom/v1', '/home-blog', array(
        'methods' => 'GET',
        'callback' => 'home_latest_blog_api_handler',
    ));
}
add_action('rest_api_init', 'home_latest_blog_api_init');

function home_latest_blog_api_handler($request) {
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
        return $data;
    }else{
        $data = array(
            'status' => 'err',
            'data' => '',
            'success_message' => '',
            'error_message' => 'No result found'
            );
        return $data;
    }
}



//----------Popular Tags API -----------------//
function app_popular_tags_api_init() {
    register_rest_route('custom/v1', '/popular-tags', array(
        'methods' => 'GET',
        'callback' => 'app_popular_tags_api_handler',
    ));
}
add_action('rest_api_init', 'app_popular_tags_api_init');

function app_popular_tags_api_handler($request) {
    $popular_tags = get_terms( array(
              'taxonomy' => 'post_tag',
              'orderby' => 'count',
              'order' => 'DESC',
              'number' => 10, // Specify the number of popular tags to retrieve
    ) );

    if(count($popular_tags)>0){
        $data = array(
            'status' => 'success',
            'data' => $popular_tags,
            'success_message' => count($popular_tags). ' tags avilable',
            'error_message' => ''
            );        
        return $data;
    }else{
        $data = array(
            'status' => 'error',
            'data' => '',
            'success_message' => '',
            'error_message' => 'No result found'
            );
        return $data;
    }
}

//----------Popular Category API -----------------//
function app_popular_category_api_init() {
    register_rest_route('custom/v1', '/popular-category', array(
        'methods' => 'GET',
        'callback' => 'app_popular_category_api_handler',
    ));
}
add_action('rest_api_init', 'app_popular_category_api_init');

function app_popular_category_api_handler($request) {
    $popular_categories = get_terms( array(
              'taxonomy' => 'category',
              'orderby' => 'count',
              'order' => 'DESC',
              'number' => 10, // Specify the number of popular tags to retrieve
    ) );

    if(count($popular_categories)>0){
        $data = array(
            'status' => 'success',
            'data' => $popular_categories,
            'success_message' => count($popular_categories). ' category avilable',
            'error_message' => ''
            );        
        return $data;
    }else{
        $data = array(
            'status' => 'error',
            'data' => '',
            'success_message' => '',
            'error_message' => 'No result found'
            );
        return $data;
    }
}

//----------Yearly Archive API -----------------//
function app_yearly_archive_api_init() {
    register_rest_route('custom/v1', '/all-archives', array(
        'methods' => 'GET',
        'callback' => 'app_yearly_archive_api_handler',
    ));
}
add_action('rest_api_init', 'app_yearly_archive_api_init');

function app_yearly_archive_api_handler($request) {
    
    global $wpdb;

    // Query to get all distinct years from the posts table
    $query = "SELECT DISTINCT YEAR(post_date) AS archive_year 
              FROM $wpdb->posts 
              WHERE post_type = 'post' 
              AND post_status = 'publish' 
              ORDER BY archive_year DESC";

    $year_archives = $wpdb->get_col($query);

    if(count($year_archives)>0){
        $data = array(
            'status' => 'success',
            'data' => $year_archives,
            'success_message' => count($year_archives). ' archive avilable',
            'error_message' => ''
            );        
        return $data;
    }else{
        $data = array(
            'status' => 'error',
            'data' => '',
            'success_message' => '',
            'error_message' => 'No archive found'
            );
        return $data;
    }
}

//----------Custom User Reset Password -----------------//
function custom_user_resetpass_init() {
    register_rest_route('custom/v1', '/reset-password', array(
        'methods' => 'POST',
        'callback' => 'custom_user_resetpass_handler',
    ));
}
add_action('rest_api_init', 'custom_user_resetpass_init');

// Custom User Login Handler
function custom_user_resetpass_handler($request) {
    $parameters = $request->get_params();
    $user_name = $parameters['email'];
    $user_new_password = $parameters['password'];
    //-- Check user exist by email ID
    $user_id = username_exists($user_name);
    if ($user_id) {
        wp_set_password($user_new_password, $user_id);
        return array(
            'status' => 'ok',
            'data' => $user_id,
            'message' => 'WP user reset password success'
        );
    } else {
        return array(
            'status' => 'err',
            'data' => '',
            'message' => 'User ID doesnot exist'
        );
    }
}

// ---------------------Logout API--------------------------------//
function custom_user_logout_init() {
    register_rest_route('custom/v1', '/force-logout', array(
        'methods' => 'POST',
        'callback' => 'custom_logout_handler',
        'permission_callback' => function ($request) {
            return true;
        },
    ));
}
add_action('rest_api_init', 'custom_user_logout_init');
function custom_logout_handler($request) {

    // List of WordPress cookies to unset
    $cookies = array(
        'wordpress_logged_in',
        'wp-settings-1',
        'wp-settings-time-1',
        'wp-postpass',
        'wordpress_test_cookie',
        // Add more cookies here if needed
    );

    // Unset each cookie
    foreach ($cookies as $cookie) {
        if (isset($_COOKIE[$cookie])) {
            unset($_COOKIE[$cookie]);
            setcookie($cookie, '', time() - 3600, '/');
        }
    }
}
//---------//
function force_logout_if_action_logout() {
    if (isset($_GET['action']) && $_GET['action'] === 'logout') {
        // Add any additional actions you want before logging the user out
        // For example, you can clear cookies or perform other tasks here
        
        // Log the user out
        wp_logout();

        // Redirect to a specific URL after logout
        wp_redirect(MAIN_URL_BG); // Change the URL as needed
        exit;
    }
}

add_action('init', 'force_logout_if_action_logout');



//----------App Blog Listing -----------------//
/*
    count   => Number of Posts
    type    => trending
*/
function app_dynamic_blog_api_init() {
    register_rest_route('custom/v1', '/blog-listing', array(
        'methods' => 'GET',
        'callback' => 'app_dynamic_blog_api_handler',
    ));
}
add_action('rest_api_init', 'app_dynamic_blog_api_init');
function app_dynamic_blog_api_handler($request) {
    $parameters = $request->get_params();
    $post_items = [];
    $args = array();
    $meta_query = array();
    $tax_query = array();
    $archive_query = array();

    
    if(isset($parameters['type'])){
        //--meta---//
        if($parameters['type'] == 'trending'){
            $meta_query[] = array(
                'key'   => 'trending_blog',
                'value'   => '"yes"',
                'compare' => 'LIKE'
            );
        }
        //--tax---//
        if($parameters['type'] == 'tag'){
            $tax_query[] = array(
                'taxonomy'   => 'post_tag',
                'field'   => 'term_id',
                'terms' => $parameters['term_id']
            );
        }
        if($parameters['type'] == 'category'){
            $tax_query[] = array(
                'taxonomy'   => 'category',
                'field'   => 'term_id',
                'terms' => $parameters['term_id']
            );
        }
        //--Archive------//
        if($parameters['type'] == 'archive'){
            $archive_query[] = array(
                'year' => $parameters['term_id']
            );
        }
    }

    if(count($meta_query) > 0) {
        $args['meta_query'] = $meta_query;
    }
    if(count($meta_query) > 1) {
        $meta_query['relation'] = 'AND';
    }

    if(count($tax_query) > 0) {
        $args['tax_query'] = $tax_query;
    }
    if(count($tax_query) > 1) {
        $tax_query['relation'] = 'AND';
    }

    if(count($archive_query) > 0) {
        $args['date_query'] = $archive_query;
    }

    if(isset($parameters['count'])){
        $args['posts_per_page'] = $parameters['count'];
    }else{
        $args['posts_per_page'] = -1;
    }
    $args['post_type'] = 'post';
    $args['post_status'] = 'publish';
    query_posts($args);
    if (have_posts()) : while (have_posts()) : the_post();
    $ID = get_the_ID();
    $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'trending-blog-thumb' );
    $full = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'full' );
    $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
    $title = get_the_title();
    $categories = get_the_terms( $ID, 'category' );
    $tags = get_the_terms( $ID, 'post_tag' );
    
    $post_items[] = array(
                        'id' =>  $ID,
                        'title'  =>  $title,
                        'publish_date'  =>  get_the_time(__('M d, Y', 'kubrick')),
                        'thumbnail'  =>  $thumbnail['0'],
                        'full'  =>  $full['0'],
                        'thumbnail_alt'  =>  $alt_text,
                        'permalink' => get_the_permalink(),
                        'views_count'  =>  pvc_get_post_views( $ID ),
                        'category'  => $categories,
                        'tag'  => $tags
                      );
    endwhile; endif; wp_reset_query();

    if(count($post_items)>0){
        $data = array(
            'status' => 'success',
            'data' => $post_items,
            'success_message' => count($post_items). ' posts data successfully received',
            'error_message' => ''
            );        
        return $data;
    }else{
        $data = array(
            'status' => 'error',
            'data' => '',
            'success_message' => '',
            'error_message' => 'No result found'
            );
        return $data;
    }
}

//----------App Blog Details -----------------//
function app_blog_details_api_init() {
    register_rest_route('custom/v1', '/blog-details', array(
        'methods' => 'GET',
        'callback' => 'app_blog_details_api_handler',
    ));
}
add_action('rest_api_init', 'app_blog_details_api_init');
function app_blog_details_api_handler($request) {
    $parameters = $request->get_params();
    if(isset($parameters['post_id'])){
        global $wpdb;
        $post_id = $parameters['post_id'];
        $post_items = array();
        $args = array();
        $args['post__in'] = array($post_id);
        $args['posts_per_page'] = 1;
        $args['post_type'] = 'post';
        $args['post_status'] = 'publish';
        query_posts($args);        
        if (have_posts()) : while (have_posts()) : the_post();
        $ID = get_the_ID();
        $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'trending-blog-thumb' );
        $full = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'full' );
        $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
        $title = get_the_title();
        $content = wpautop(get_the_content());
        $categories = get_the_terms( $ID, 'category' );
        $tags = get_the_terms( $ID, 'post_tag' );


        //Poll Data
        $poll_data = [];
        if(get_field('poll_shortcode', $ID)){
            $poll_id = get_field('poll_shortcode', $ID);
            $poll_question_query = $wpdb->prepare(
                "SELECT question FROM `bg_ayspoll_polls` WHERE id = %d",
                $poll_id
            );
            $poll_question_query_results = $wpdb->get_results($poll_question_query);

            $poll_query = $wpdb->prepare(
                "
                SELECT *,
                    votes,
                    ROUND((votes / total_votes * 100), 2) AS vote_percentage
                FROM `bg_ayspoll_answers`
                LEFT JOIN (
                    SELECT SUM(votes) AS total_votes
                    FROM `bg_ayspoll_answers`
                    WHERE poll_id = %d
                ) AS total
                ON 1
                WHERE poll_id = %d
                ",
                $poll_id,
                $poll_id
            );
            $poll_query_results = $wpdb->get_results($poll_query);
            $poll_data = array(
                                'poll_question' => $poll_question_query_results[0]->question,
                                'poll_results' => $poll_query_results
                            );
        }

        $post_items[] = array(
                            'id' =>  $ID,
                            'title'  =>  $title,
                            'content' => $content,
                            'publish_date'  =>  get_the_time(__('M d, Y', 'kubrick')),
                            'thumbnail'  =>  $thumbnail['0'],
                            'full'  =>  $full['0'],
                            'thumbnail_alt'  =>  $alt_text,
                            'permalink' => get_the_permalink(),
                            'views_count'  =>  pvc_get_post_views( $ID ),
                            'category'  => $categories,
                            'tag'  => $tags,
                            'poll_data'  => $poll_data
                        );
        endwhile; endif; wp_reset_query();

        if(count($post_items)>0){
            // Related Posts
            $categories = get_the_category($post_id);
            $category_ids = array();
            foreach ($categories as $category) {
                $category_ids[] = $category->term_id;
            }
            $related_post_items = array();
            $related_args = array(
                'post_type' => 'post',
                'posts_per_page' => 6, // Adjust the number of related posts to display
                'post__not_in' => array($post_id),
                'category__in' => $category_ids,
                'orderby' => 'rand', // Display related posts in random order
            );
            query_posts($related_args);
            if (have_posts()) : while (have_posts()) : the_post();
            $ID = get_the_ID();
            $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'trending-blog-thumb' );
            $full = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'full' );
            $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
            $title = get_the_title();
            $content = get_the_content();
            $categories = get_the_terms( $ID, 'category' );
            $tags = get_the_terms( $ID, 'post_tag' );

            $related_post_items[] = array(
                                'id' =>  $ID,
                                'title'  =>  $title,
                                'publish_date'  =>  get_the_time(__('M d, Y', 'kubrick')),
                                'thumbnail'  =>  $thumbnail['0'],
                                'full'  =>  $full['0'],
                                'thumbnail_alt'  =>  $alt_text,
                                'permalink' => get_the_permalink(),
                                'views_count'  =>  pvc_get_post_views( $ID ),
                                'category'  => $categories,
                                'tag'  => $tags,
                            );
            endwhile; endif; wp_reset_query();
            if(count($related_post_items)>0){
                $post_items[0]['related_posts'] = $related_post_items;
            }
            // Comments
            $comment_args = array(
                'post_id' => $post_id,
                'status' => 'approve',
            );
            $comments = get_comments($comment_args);
            if(count($comments)>0){
                $post_comments = array();
                foreach ($comments as $comment) {
                    $user_data = get_userdata($comment->user_id);
                    //-- Get User Node Info
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

                    $post_comments[] = array(
                        'comment_ID' => $comment->comment_ID,
                        'comment_post_ID' => $comment->comment_post_ID,
                        'comment_author_ID' => $comment->user_id,
                        'comment_date' => date('M d, Y', strtotime($comment->comment_date)),
                        'comment_content' => esc_html($comment->comment_content),
                        'comment_author_details' => $user_query_results
                    );
                }
                $post_items[0]['comments'] = $post_comments;
            }
            $data = array(
                'status' => 'success',
                'data' => $post_items[0],
                'success_message' => 'posts details successfully received',
                'error_message' => ''
            );        
            return $data;
        }else{
            $data = array(
                'status' => 'error',
                'data' => '',
                'success_message' => '',
                'error_message' => 'Invalid Post ID, No result found'
                );
            return $data;
        }
    }else{
        $data = array(
            'status' => 'error',
            'data' => '',
            'success_message' => '',
            'error_message' => 'Post ID Required'
        );
        return $data;
    }
}

//-------- Home API----------------//
function app_home_api_init() {
    register_rest_route('custom/v1', '/home-data', array(
        'methods' => 'GET',
        'callback' => 'app_home_api_handler',
    ));
}
add_action('rest_api_init', 'app_home_api_init');
function app_home_api_handler($request) {
    $home_items = array();
    $latest_posts_items = array();
    $trending_posts_items = array();
    $popular_tags = array();
    $popular_categories = array();
    $year_archives = array();

    //------latest-----------//
    $latest_args = array(
        'posts_per_page'   => 5,
        'post_status'      => 'publish'
    );
    query_posts($latest_args);
    if (have_posts()) : while (have_posts()) : the_post();
    $ID = get_the_ID();
    $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'trending-blog-thumb' );
    $full = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'full' );
    $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
    $title = get_the_title();
    $categories = get_the_terms( $ID, 'category' );
    $tags = get_the_terms( $ID, 'post_tag' );
    
    $latest_posts_items[] = array(
                        'id' =>  $ID,
                        'title'  =>  $title,
                        'publish_date'  =>  get_the_time(__('M d, Y', 'kubrick')),
                        'thumbnail'  =>  $thumbnail['0'],
                        'full'  =>  $full['0'],
                        'thumbnail_alt'  =>  $alt_text,
                        'permalink' => get_the_permalink(),
                        'views_count'  =>  pvc_get_post_views( $ID ),
                        'category'  => $categories,
                        'tag'  => $tags
                    );
    endwhile; endif; wp_reset_query();
    if( count($latest_posts_items)>0 ){
        $home_items[] = array('latest_posts_items' => $latest_posts_items);
    }

    //------trending-----------//
    $trending_args = array(
            'posts_per_page'   => 5,
            'meta_query'  => array(
              array(
                'key'   => 'trending_blog',
                'value'   => '"yes"',
                'compare' => 'LIKE'
              )
            ),
            'post_status'      => 'publish'
        );
    query_posts($trending_args);
    if (have_posts()) : while (have_posts()) : the_post();
    $ID = get_the_ID();
    $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'trending-blog-thumb' );
    $full = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'full' );
    $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
    $title = get_the_title();
    $categories = get_the_terms( $ID, 'category' );
    $tags = get_the_terms( $ID, 'post_tag' );
    
    $trending_posts_items[] = array(
                        'id' =>  $ID,
                        'title'  =>  $title,
                        'publish_date'  =>  get_the_time(__('M d, Y', 'kubrick')),
                        'thumbnail'  =>  $thumbnail['0'],
                        'full'  =>  $full['0'],
                        'thumbnail_alt'  =>  $alt_text,
                        'permalink' => get_the_permalink(),
                        'views_count'  =>  pvc_get_post_views( $ID ),
                        'category'  => $categories,
                        'tag'  => $tags
                    );
    endwhile; endif; wp_reset_query();
    if( count($trending_posts_items)>0 ){
        $home_items[] = array('trending_posts_items' => $trending_posts_items);
    }

    //------tags-----------//
    $popular_tags = get_terms( array(
              'taxonomy' => 'post_tag',
              'orderby' => 'count',
              'order' => 'DESC',
              'number' => 10, // Specify the number of popular tags to retrieve
    ) );

    if(count($popular_tags)>0){
        $home_items[] = array('popular_tags' => $popular_tags);
    }

    //------Categories-----------//

    $popular_categories = get_terms( array(
              'taxonomy' => 'category',
              'orderby' => 'count',
              'order' => 'DESC',
              'number' => 10, // Specify the number of popular tags to retrieve
    ) );

    if(count($popular_categories)>0){
        $home_items[] = array('popular_categories' => $popular_categories);
    }

    //------Archives-----------//

    global $wpdb;

    // Query to get all distinct years from the posts table
    $query = "SELECT DISTINCT YEAR(post_date) AS archive_year 
              FROM $wpdb->posts 
              WHERE post_type = 'post' 
              AND post_status = 'publish' 
              ORDER BY archive_year DESC";

    $year_archives = $wpdb->get_col($query);

    if(count($year_archives)>0){
        $home_items[] = array('archives' => $year_archives);
    }

    $data = array(
        'status' => 'success',
        'data' => $home_items,
        'success_message' => '',
        'error_message' => ''
    );        
    return $data;
}

//----------App Blog Submit Comment -----------------//
function app_blog_comment_submit_api_init() {
    register_rest_route('custom/v1', '/blog-submit-comment', array(
        'methods' => 'POST',
        'callback' => 'app_blog_comment_submit_api_handler',
    ));
}
add_action('rest_api_init', 'app_blog_comment_submit_api_init');
function app_blog_comment_submit_api_handler($request) {
    $parameters = $request->get_params();

    if( isset( $parameters['post_id'] ) && isset( $parameters['user_id'] ) && isset( $parameters['comment_content'] ) ){
        
        $post_id = $parameters['post_id'];
        $user_id = $parameters['user_id'];
        $comment_content = $parameters['comment_content'];

        // verify user id
        $user_data = get_userdata($user_id);
        if($user_data !== false){
            // verify wp post ID
            $post = get_post($post_id);
            if ($post) {
                // Submit Review Query
                $comment_data = array(
                    'comment_post_ID' => $post_id, // Replace with the ID of the post to which you want to add the comment.
                    'comment_author_email' => $user_data->user_email, // Replace with the email address of the comment author.
                    'comment_content' => $comment_content, // Replace with the comment content.
                    'comment_parent' => 0, // ID of the parent comment (0 for top-level comments).
                    'user_id' => $user_id, // ID of the user who submitted the comment (0 for guests).
                    'comment_approved' => 0, // Set to 1 to automatically approve the comment; set to 0 for moderation.
                );

                $comment_id = wp_insert_comment($comment_data);

                if (!is_wp_error($comment_id)) {
                    // Comment was successfully inserted with ID $comment_id.
                    $data = array(
                        'status' => 'success',
                        'data' => $comment_id,
                        'success_message' => 'Comments successfully inserted waiting for admin approval',
                        'error_message' => ''
                    );
                    return $data;
                } else {
                    $data = array(
                        'status' => 'error',
                        'data' => '',
                        'success_message' => '',
                        'error_message' => 'Error: ' . $comment_id->get_error_message()
                    );
                    return $data;
                }
            } else {
                $data = array(
                    'status' => 'error',
                    'data' => '',
                    'success_message' => '',
                    'error_message' => 'Invalid Post ID.'
                );
                return $data;
            }            
        }else{
            $data = array(
                'status' => 'error',
                'data' => '',
                'success_message' => '',
                'error_message' => 'Invalid User ID.'
            );
            return $data;
        }

    }else{
        $data = array(
            'status' => 'error',
            'data' => '',
            'success_message' => '',
            'error_message' => 'post_id, user_id and comment_content all parameters are required'
            );
        return $data;
    }
}

//--------App Blog Submit Poll -----------------//
function app_blog_poll_submit_api_init() {
    register_rest_route('custom/v1', '/blog-submit-poll', array(
        'methods' => 'POST',
        'callback' => 'app_blog_poll_submit_api_handler',
    ));
}
add_action('rest_api_init', 'app_blog_poll_submit_api_init');
function app_blog_poll_submit_api_handler($request) {
    $parameters = $request->get_params();

    if( isset( $parameters['poll_id'] ) && isset( $parameters['user_id'] ) && isset( $parameters['answer_id'] ) ){
        
        $poll_id = $parameters['poll_id'];
        $answer_id = $parameters['answer_id'];
        $user_id = $parameters['user_id'];

        // verify user id
        $user_data = get_userdata($user_id);
        if($user_data !== false){
            // Submit Poll Vote
            global $wpdb;
            $sql = $wpdb->prepare(
                "UPDATE `bg_ayspoll_answers`
                SET votes = votes + 1 
                WHERE poll_id = %d AND id = %d",
                $poll_id,
                $answer_id
            );
            $result = $wpdb->query($sql); 
            if ($result === false) {
                $data = array(
                    'status' => 'error',
                    'data' => '',
                    'success_message' => '',
                    'error_message' => "Error: " .$wpdb->last_error
                );
                return $data;
            }else{
                $data = array(
                    'status' => 'success',
                    'data' => '',
                    'success_message' => 'Vote count updated successfully!',
                    'error_message' => ''
                );
                return $data;
            }
        }else{
            $data = array(
                'status' => 'error',
                'data' => '',
                'success_message' => '',
                'error_message' => 'Invalid User ID.'
            );
            return $data;
        }

    }else{
        $data = array(
            'status' => 'error',
            'data' => '',
            'success_message' => '',
            'error_message' => 'poll_id, answer_id and user_id all parameters are required'
            );
        return $data;
    }
}

//--------App Blog Search By Keyword -----------------//
function app_blog_search_submit_api_init() {
    register_rest_route('custom/v1', '/blog-search', array(
        'methods' => 'GET',
        'callback' => 'app_blog_search_api_handler',
    ));
}
add_action('rest_api_init', 'app_blog_search_submit_api_init');
function app_blog_search_api_handler($request) {
    $parameters = $request->get_params();
    $post_items = [];
    $args = array();
    if(isset($parameters['keyword'])){
        $args['posts_per_page'] = -1;
        $args['s'] = $parameters['keyword'];
        $args['post_type'] = 'post';
        $args['post_status'] = 'publish';
        query_posts($args);
        if (have_posts()) : while (have_posts()) : the_post();
        $ID = get_the_ID();
        $thumbnail = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'trending-blog-thumb' );
        $full = wp_get_attachment_image_src( get_post_thumbnail_id( $ID ), 'full' );
        $alt_text = get_post_meta(get_post_thumbnail_id( $ID ), '_wp_attachment_image_alt', true);
        $title = get_the_title();
        $categories = get_the_terms( $ID, 'category' );
        $tags = get_the_terms( $ID, 'post_tag' );
        
        $post_items[] = array(
                            'id' =>  $ID,
                            'title'  =>  $title,
                            'publish_date'  =>  get_the_time(__('M d, Y', 'kubrick')),
                            'thumbnail'  =>  $thumbnail['0'],
                            'full'  =>  $full['0'],
                            'thumbnail_alt'  =>  $alt_text,
                            'permalink' => get_the_permalink(),
                            'views_count'  =>  pvc_get_post_views( $ID ),
                            'category'  => $categories,
                            'tag'  => $tags
                        );
        endwhile; endif; wp_reset_query();

        if(count($post_items)>0){
            $data = array(
                'status' => 'success',
                'data' => $post_items,
                'success_message' => count($post_items). ' posts data successfully received',
                'error_message' => ''
                );        
            return $data;
        }else{
            $data = array(
                'status' => 'error',
                'data' => '',
                'success_message' => '',
                'error_message' => 'No result found'
                );
            return $data;
        }
    }else{
        $data = array(
            'status' => 'error',
            'data' => '',
            'success_message' => '',
            'error_message' => 'keyword parameter is required'
            );
        return $data;
    }
}
?>
