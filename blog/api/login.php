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

$creds = array(
    'user_login' => $request['email'],
    'user_password' => $request['password'],
    'remember' => true
);
$user = wp_signon($creds, false);
echo json_encode($user);
?>