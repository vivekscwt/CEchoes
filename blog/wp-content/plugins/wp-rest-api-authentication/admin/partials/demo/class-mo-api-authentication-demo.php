<?php
/**
 * Provide a admin area view for the plugin
 * This file is used to markup the admin-facing aspects of the plugin.
 *
 * @package    Miniorange_Api_Authentication
 * @author     miniOrange <info@miniorange.com>
 * @license    MIT/Expat
 * @link       https://miniorange.com
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * [Handle Demo request]
 */
class Mo_API_Authentication_Demo {

	/**
	 * Internal redirect for processing demo request
	 *
	 * @return void
	 */
	public static function mo_api_authentication_requestfordemo() {
		self::demo_request();
	}
	/**
	 * Processing demo request
	 *
	 * @return void
	 */
	public static function demo_request() {
		?>
		<div id="mo_api_authentication_password_setting_layout" class="mo_api_authentication_support_layout">
		<h2 style="font-size: 20px;font-weight: 700">Demo/Trial Request for Premium plans</h2>
		<?php

		if ( get_option( 'mo_api_authentication_demo_creds' ) ) {

			$demo_credentials   = get_option( 'mo_api_authentication_demo_creds' );
			$site_url           = $demo_credentials['site_url'];
			$email              = $demo_credentials['email'];
			$temporary_password = $demo_credentials['temporary_password'];
			$password_link      = $demo_credentials['password_link'];
			$validity           = $demo_credentials['validity'];
			?>
			<p style="font-size: 14px;font-weight: 400">You have successfully availed the trial for the <i>full featured</i> <b>All-Inclusive plan</b> Premium plugin. Please find the details below.</p>
			<br>
			<div class="mo_api_authentication_support_layout" style="padding-left: 5px;width: 90%">
				<br>
				<table width="50%">
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">Trial URL : </p>
				</td>
				<td>
					<p><a href="<?php echo esc_url( $site_url . '/admin.php?page=mo_api_authentication_settings' ); ?>" target="_blank"><b>[Click Here]</b></a>
				</td>
			</tr>
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">Username : </p>
				</td>
				<td>
					<p><?php echo esc_html( $email ); ?></p>
				</td>
			</tr>
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">Password : </p>
				</td>
				<td>
					<p>
						<?php echo esc_html( $temporary_password ); ?>
					</p>
				</td>
			</tr>
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">Valid Till: </p>
				</td>
				<td>
					<p>
						<?php echo esc_html( $validity ); ?>
					</p>
				</td>
			</tr>
		</table>
		<p style="font-size: 14px;font-weight: 400;padding-left:20px">You can also reset your trial password using this <a href="<?php echo esc_url( $password_link ); ?>" target="_blank"><b>[LINK]</b></a>.</p>
		</div>
		<br>
		<p style="padding-left: 10px;padding-right: 10px;user-select: none"><b>Tip:</b> You must have received an email as well for these credentials to access this trial. <br><br> Also, if you face any issues or still not convinced with this trial, don't hesitate to contact us at <b><a href="mailto:apisupport@xecurify.com?subject=WP REST API Authentication Plugin - Enquiry">apisupport@xecurify.com</a></b>.</p>
		&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

			<?php
		} else {
			?>

		<p style="font-size: 14px;font-weight: 400">Make a request for the demo/trial of the Premium plans of the plugin to try all the features.</p>
		<br>
		<form method="post" action="">
		<div class="mo_api_authentication_support_layout" style="padding-left: 5px;width: 90%">
		<br>

		<input type="hidden" name="option" value="mo_api_authentication_demo_request_form" />
			<?php wp_nonce_field( 'mo_api_authentication_demo_request_form', 'mo_api_authentication_demo_request_field' ); ?>

		<table width="90%">
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">Email : </p>
				</td>
				<td>
					<p><input required type="text" style="width: 80%" name="mo_api_authentication_demo_email" placeholder="person@example.com" value="<?php echo esc_attr( get_option( 'mo_api_authentication_admin_email' ) ); ?>">
				</td>
			</tr>
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">Select Premium Plan : </p>
				</td>
				<td>
					<p><select required style="width: 80%" name="mo_api_authentication_demo_plan" id="mo_api_authentication_demo_plan_id">
									<option disabled >------------------ Select ------------------</option>
									<option value="miniorange-api-authentication-plugin@40.1.0" seleced>WP API Authentication All-Inclusive Plan</option>
									<option value="Not Sure">Not Sure</option>
					</select></p>
				</td>
			</tr>
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">Use Case and Requirements : </p>
				</td>
				<td>
					<p>
						<textarea type="text" minlength="15" name="mo_api_authentication_demo_usecase" style="resize: vertical; width:80%; height:100px;" rows="4" placeholder="Write us about your usecase" required value=""></textarea>
					</p>
				</td>
			</tr>
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">Authentication Methods: </p>
				</td>
				<td>
					<p>
						<p><input type="checkbox" name="mo_api_authentication_demo_basic_auth">Basic Authentication
						<p><input type="checkbox" name="mo_api_authentication_demo_jwt_auth">JWT Authentication
						<p><input type="checkbox" name="mo_api_authentication_demo_apikey_auth">API Key Authentication
						<p><input type="checkbox" name="mo_api_authentication_demo_oauth_auth">OAuth 2.0 Authentication
						<p><input type="checkbox" name="mo_api_authentication_demo_thirdparty_auth">Third Party Authentication
					</p>
				</td>
			</tr>
			<tr>
				<td>
					<p style="font-size: 15px;font-weight: 500;margin-left: 20px">REST API Endpoints: </p>
				</td>
				<td>
					<p>
						<br>
						<p><input type="checkbox" name="mo_api_authentication_demo_endpoints_wp_rest_api">WP REST APIs
						<p><input type="checkbox" name="mo_api_authentication_demo_endpoints_custom_api">WP Third Party/ Custom APIs
					</p>
					<br>
				</td>
			</tr>
			<tr>
				<td></td>
				<td><input type="submit" name="submit" value="Submit Request" class="button button-primary button-large" style="width:120px;background: #473970" /></td>
			</tr>
		</table>
		<br>

	</div>

	<p style="padding-left: 10px;padding-right: 10px;user-select: none"><b>Tip:</b> You will receive the email shortly with the demo details once you successfully make the demo/trial request. If not received, please check out your spam folder or contact us at <a href="mailto:apisupport@xecurify.com?subject=WP REST API Authentication Plugin - Enquiry">apisupport@xecurify.com</a>.</p>
		&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
	</form>

		</div>
			<?php
		}
	}
}
