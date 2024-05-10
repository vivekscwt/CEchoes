<?php
ob_start();

class Pma_Each_Results_List_Table extends WP_List_Table {
	private $plugin_name;

	/** Class constructor */
	public function __construct( $plugin_name ) {
		$this->plugin_name = $plugin_name;
		parent::__construct(array(
			'singular' => __('Each result', $this->plugin_name), //singular name of the listed records
			'plural'   => __('Each results', $this->plugin_name), //plural name of the listed records
			'ajax'     => false //does this table support ajax?
		));
		add_action('admin_notices', array($this, 'eachresults_notices'));

	}


	/**
	 * Retrieve customers data from the database
	 *
	 * @param int $per_page
	 * @param int $page_number
	 *
	 * @return mixed
	 */
	public static function get_results( $per_page = 50, $page_number = 1 ) {

		global $wpdb;

		$sql = "SELECT r.*, a.answer
        FROM {$wpdb->prefix}ayspoll_reports as r
        INNER JOIN {$wpdb->prefix}ayspoll_answers as a
        ON r.answer_id = a.id
        WHERE a.poll_id = " . absint($_GET['poll']);
		$where_cond = "";
		if (isset($_REQUEST['s']) && $_REQUEST['s'] != '') {
			if (filter_var($_REQUEST['s'], FILTER_VALIDATE_EMAIL)) {
				$where_cond .= " AND r.user_email LIKE ('%".$_REQUEST['s']."%')";
			}
			else{
				$where_cond .= " AND a.answer LIKE ('%".$_REQUEST['s']."%')";
			}
		}
		$sql .= $where_cond;
		if (!empty($_REQUEST['orderby'])) {
			$sql .= " ORDER BY r." . esc_sql($_REQUEST['orderby']);
			$sql .= !empty($_REQUEST['order']) ? " " . esc_sql($_REQUEST['order']) : ' DESC';
		} else {
			$sql .= " ORDER BY r.id DESC";
		}
		$sql .= " LIMIT $per_page";
		$sql .= ' OFFSET ' . ($page_number - 1) * $per_page;

		$result = $wpdb->get_results($sql, 'ARRAY_A');
		return $result;
	}

	public function get_votes_count_by_time_interval( $interval, $poll = 0 ) {
		global $wpdb;
		$today = date("Y-m-d");
		$interval--;
		$start_day = date('Y-m-d', strtotime("-$interval day"));
		if ($interval == 0) {
			$where = "
            DATE({$wpdb->prefix}ayspoll_reports.vote_date) = '$today'";
		} else {
			$where = "
            DATE({$wpdb->prefix}ayspoll_reports.vote_date) <= '$today'
            AND DATE({$wpdb->prefix}ayspoll_reports.vote_date) > '$start_day'";
		}
		if ($poll > 0) {
			$where .= " AND {$wpdb->prefix}ayspoll_answers.poll_id='$poll'";
		}
		$sql         = "SELECT
        {$wpdb->prefix}ayspoll_answers.poll_id,
        {$wpdb->prefix}ayspoll_polls.title,
        Count({$wpdb->prefix}ayspoll_answers.poll_id) AS votes,
        DATE({$wpdb->prefix}ayspoll_reports.vote_date) AS date
        FROM
        {$wpdb->prefix}ayspoll_answers
        JOIN {$wpdb->prefix}ayspoll_polls ON {$wpdb->prefix}ayspoll_polls.id = {$wpdb->prefix}ayspoll_answers.poll_id
        JOIN {$wpdb->prefix}ayspoll_reports ON {$wpdb->prefix}ayspoll_reports.answer_id = {$wpdb->prefix}ayspoll_answers.id
        WHERE
        EXISTS(
            SELECT id FROM {$wpdb->prefix}ayspoll_answers
            WHERE id={$wpdb->prefix}ayspoll_reports.answer_id
        )=1 AND "
		               . $where .
		               "GROUP BY
        {$wpdb->prefix}ayspoll_polls.title";
		$res         = $wpdb->get_results($sql, "ARRAY_A");
		$votes_count = array_sum(array_column($res, 'votes'));

		return $votes_count;
	}

	public function get_voting_first_day() {
		global $wpdb;
		$sql  = "SELECT
        DATE(Min({$wpdb->prefix}ayspoll_reports.vote_date)) AS min_date
        FROM
        {$wpdb->prefix}ayspoll_reports WHERE EXISTS(SELECT id FROM {$wpdb->prefix}ayspoll_answers WHERE id={$wpdb->prefix}ayspoll_reports.answer_id)=1";
		$date = $wpdb->get_var($sql);

		return $date;
	}

	public function get_poll_data_by_day( $day, $id ) {
		global $wpdb;
		$sql     = "SELECT
        {$wpdb->prefix}ayspoll_answers.poll_id AS id,
        {$wpdb->prefix}ayspoll_polls.title,
        COUNT({$wpdb->prefix}ayspoll_answers.poll_id) AS polling_count,
        DATE({$wpdb->prefix}ayspoll_reports.vote_date) AS vote_date_day
        FROM
        {$wpdb->prefix}ayspoll_reports
        JOIN {$wpdb->prefix}ayspoll_answers ON {$wpdb->prefix}ayspoll_reports.answer_id = {$wpdb->prefix}ayspoll_answers.id
        JOIN {$wpdb->prefix}ayspoll_polls ON {$wpdb->prefix}ayspoll_answers.poll_id = {$wpdb->prefix}ayspoll_polls.id
        WHERE DATE({$wpdb->prefix}ayspoll_reports.vote_date)='$day' AND
        {$wpdb->prefix}ayspoll_answers.poll_id ='$id'
        GROUP BY {$wpdb->prefix}ayspoll_answers.poll_id";
		$results = $wpdb->get_row($sql, 'ARRAY_A');

		return $results;
	}

	public function get_poll_data_all( $poll_id = 0 ) {
		global $wpdb;
		// $sql = "SELECT * FROM {$wpdb->prefix}ayspoll_reports WHERE EXISTS(SELECT id FROM {$wpdb->prefix}ayspoll_answers WHERE id={$wpdb->prefix}ayspoll_reports.answer_id)=1";
		$sql = "SELECT * FROM
        {$wpdb->prefix}ayspoll_reports 
        INNER JOIN {$wpdb->prefix}ayspoll_answers
        ON {$wpdb->prefix}ayspoll_reports.answer_id = {$wpdb->prefix}ayspoll_answers.id
        WHERE {$wpdb->prefix}ayspoll_answers.poll_id = " . absint($_GET['poll']);
		$res = $wpdb->get_results($sql, 'ARRAY_A');

		if (empty($res)) {
			return $res;
		}

		$start_day = strtotime($this->get_voting_first_day());
		$end_day   = time();
		$datediff  = $end_day - $start_day;
		$day_count = ceil($datediff / (60 * 60 * 24));
		$data      = array();
		$next      = date('Y-m-d', $start_day);

		if ($day_count > 0) {
			$polls = $this->get_polls();
			for ( $i = 1; $i <= $day_count; $i++ ) {
				$day = array();

				$temp = $this->get_poll_data_by_day($next, $poll_id);
				if (!empty($temp)) {
					$day[] = $temp;
				} else {
					$day[] = array(
						'id'            => $poll_id,
						'title'         => $polls[array_search($poll_id, array_column($polls, 'id'))]['title'],
						'polling_count' => 0,
						'vote_date_day' => $next,
						'user_ip'       => $res['user_ip'],
						'answer_id'     => $res['answer_id']
					);
				}

				$data[] = $day;
				$next   = date('Y-m-d', strtotime("+$i day", $start_day));
			}
		}

		return $data;
	}

	// === OLD VERSION ===
	// public function get_poll_data_pie( $poll_id ) {
	// 	global $wpdb;
	// 	$sql = "SELECT
    //     {$wpdb->prefix}ayspoll_answers.answer,
    //     {$wpdb->prefix}ayspoll_answers.votes
    //     FROM
    //     {$wpdb->prefix}ayspoll_answers
    //     WHERE
    //     {$wpdb->prefix}ayspoll_answers.poll_id = '$poll_id'";

	// 	$result = $wpdb->get_results($sql, 'ARRAY_A');

	// 	$votes     = array_column($result, 'votes');
	// 	$votes_sum = array_sum($votes);
	// 	for ( $i = 0; $i < count($result); $i++ ) {
	// 		$result[$i]['answer'] = stripslashes($result[$i]['answer']);
	// 	}

	// 	// echo "<pre>";
	// 	// print_r($result);
	// 	// wp_die();
	// 	return $result;
	// }

	public function get_poll_data_chart( $poll_id ) {
		global $wpdb;

		$sql = "SELECT a.*, 
				       JSON_EXTRACT(p.styles, '$.show_chart_type') AS show_chart_type,
					   JSON_EXTRACT(p.styles, '$.result_in_rgba') AS result_in_rgba,
					   JSON_EXTRACT(p.styles, '$.main_color') AS main_color,
					   JSON_EXTRACT(p.styles, '$.poll_enable_answer_image_after_voting') AS show_answer_images,
					   p.type,
					   p.view_type
				FROM `{$wpdb->prefix}ayspoll_answers` AS a 
				JOIN `{$wpdb->prefix}ayspoll_polls` AS p ON a.poll_id = p.id 
				WHERE a.poll_id = $poll_id";
		$result = $wpdb->get_results($sql, "ARRAY_A");


		return $result;
	}


	public static function get_report_by_id( $id ) {
		global $wpdb;

		$sql = "SELECT * FROM {$wpdb->prefix}ayspoll_reports WHERE id=" . absint(intval($id));

		$result = $wpdb->get_row($sql, 'ARRAY_A');

		return $result;
	}

	/**
	 * Delete a customer record.
	 *
	 * @param int $id customer ID
	 */
	public static function delete_results( $id ) {
		global $wpdb;
		$wpdb->delete(
			"{$wpdb->prefix}ayspoll_reports",
			array('id' => $id),
			array('%d')
		);
	}


	/**
	 * Returns the count of records in the database.
	 *
	 * @return null|string
	 */
	public static function record_count() {
		global $wpdb;

		$sql = "SELECT
		COUNT(r.id)
        FROM
        {$wpdb->prefix}ayspoll_reports as r
        INNER JOIN {$wpdb->prefix}ayspoll_answers as a
        ON r.answer_id = a.id
        WHERE a.poll_id = " . absint($_GET['poll']);

		return $wpdb->get_var($sql);
	}

	/** Text displayed when no customer data is available */
	public function no_items() {
		_e('There are no results yet.', $this->plugin_name);
	}


	/**
	 * Render a column when no column specific method exist.
	 *
	 * @param array $item
	 * @param string $column_name
	 *
	 * @return mixed
	 */
	public function column_default( $item, $column_name ) {
		$other_info = json_decode($item['other_info'], true);

		switch ( $column_name ) {
			case 'user_ip':
			case 'answer_id':
			case 'vote_date':
			case 'vote_reason':
			case 'unread':
				return $item[$column_name];
				break;
			case 'user_id':
				return (!empty($item[$column_name]) && $item[$column_name] > 0) ? get_user_by('ID', $item[$column_name])->display_name : __("Guest", $this->plugin_name);
				break;
			case 'user_email':
				$email = '';

				if ($item[$column_name] != '') {
					$email = $item[$column_name];
				} elseif (isset($other_info['email']) && !empty($other_info['email'])) {
					$email = $other_info['email'];
				}
				return $email;
				break;
			case 'user_name':
				$name = '';

				if (isset($other_info['name']) && !empty($other_info['name'])) {
					$name = $other_info['name'];
				}
				elseif (isset($other_info['Name']) && !empty($other_info['Name'])) {
					$name = $other_info['Name'];
				}
				return $name;
				break;
			case 'user_phone':
				if (!empty($other_info)) {
					return isset($other_info['phone']) ? $other_info['phone'] : "";
				} else {
					return "";
				}
				break;
			default:
				return print_r($item, true); //Show the whole array for troubleshooting purposes
				break;
		}
	}

	/**
	 * Render the bulk edit checkbox
	 *
	 * @param array $item
	 *
	 * @return string
	 */
	function column_cb( $item ) {
		return sprintf(
			'<input type="checkbox" name="bulk-action[]" value="%s" />', $item['id']
		);
	}

	/**
	 * Method for name column
	 *
	 * @param array $item an array of DB data
	 *
	 * @return string
	 */
	function column_answer_id( $item ) {
		$answer = sprintf('<a href="javascript:void(0)" data-result="%d" class="%s">' . stripslashes($item['answer']) . '</a>', absint($item['id']), 'ays-show-results');

		return $answer;
	}

	function column_vote_date( $item ) {
		return date('H:i:s d.m.Y', strtotime($item['vote_date']));
	}

	function column_vote_reason( $item ) {
		$info = json_decode($item['other_info'], true);
		$vote_reason = '';

		if (isset($info['voteReason']) && !empty($info['voteReason'])) {
			$vote_reason = $info['voteReason'];
		}

		if (isset($info['vote_reason']) && !empty($info['vote_reason'])) {
			$vote_reason = $info['vote_reason'];
		}

		return $vote_reason;
	}

	function column_unread( $item ) {
		$unread = $item['unread'] == 1 ? "unread-result" : "";

		return "<div class='unread-result-badge $unread'></div>";
	}


	/**
	 *  Associative array of columns
	 *
	 * @return array
	 */
	function get_columns() {
		$columns = array(
			'cb'          => '<input type="checkbox" />',
			'answer_id'   => __('Answer', $this->plugin_name),
			'user_ip'     => __('User IP', $this->plugin_name),
			'user_id'     => __('WP User', $this->plugin_name),
			'user_email'  => __('User Email', $this->plugin_name),
			'user_name'   => __('User Name', $this->plugin_name),
			'user_phone'  => __('User Phone', $this->plugin_name),
			'vote_date'   => __('Vote Datetime', $this->plugin_name),
			'vote_reason' => __('Vote Reason', $this->plugin_name),
			'unread'      => __('Read Status', $this->plugin_name)
		);

		return $columns;
	}


	/**
	 * Columns to make sortable.
	 *
	 * @return array
	 */
	public function get_sortable_columns() {
			$sortable_columns = array(
			'id'        	=> array('id', true),
			'answer_id' 	=> array('answer_id', true),
			'user_ip' 		=> array('user_ip', true),
			'user_id' 		=> array('user_id', true),
			'user_email'	=> array('user_email', true),
			'vote_date' 	=> array('vote_date', true),
			'vote_reason'	=> array('vote_reason', true),
			'unread'		=> array('unread', true),
		);


		return $sortable_columns;
	}

	/**
	 * Returns an associative array containing the bulk action
	 *
	 * @return array
	 */
	public function get_bulk_actions() {
		$actions = array(
			'bulk-delete' => __('Delete', $this->plugin_name),
			'bulk-read'   => __('Mark as read', $this->plugin_name),
		);

		return $actions;
	}


	/**
	 * Handles data query and filter, sorting, and pagination.
	 */
	public function prepare_items() {

		$this->_column_headers = $this->get_column_info();
		/** Process bulk action */
		$this->process_bulk_action();

		$per_page     = $this->get_items_per_page('poll_each_results_per_page', 50);
		$current_page = $this->get_pagenum();
		$total_items  = self::record_count();

		$this->set_pagination_args(array(
			'total_items' => $total_items, //WE have to calculate the total number of items
			'per_page'    => $per_page //WE have to determine how many items to show on a page
		));

		$this->items = self::get_results($per_page, $current_page);
	}

	public static function mark_as_read_reports( $id ) {
		global $wpdb;
		$wpdb->update(
			"{$wpdb->prefix}ayspoll_reports",
			array(
				"unread" => 0
			),
			array(
				"id" => absint($id)
			)
		);
	}

	public static function delete_reports( $id ) {
		global $wpdb;
		$res_answ = self::get_report_by_id($id);

		$res_votes_count = $wpdb->get_var(
			"SELECT votes FROM {$wpdb->prefix}ayspoll_answers WHERE id =".$res_answ['answer_id']
		);

		if (intval($res_votes_count) > 0) {			
			$wpdb->update(
				"{$wpdb->prefix}ayspoll_answers",
				array(
					"votes" => intval($res_votes_count) - 1
				),
				array(
					'id' => $res_answ['answer_id']
				)
			);		
		}

		$res = $wpdb->delete(
			"{$wpdb->prefix}ayspoll_reports",
			array(
				"id" => absint($id)
			)
		);

		return $res;
	}

	public function process_bulk_action() {
		// If the delete bulk action is triggered
		if ((isset($_POST['action']) && $_POST['action'] == 'bulk-delete')
		    || (isset($_POST['action2']) && $_POST['action2'] == 'bulk-delete')
		) {
			$delete_ids = esc_sql($_POST['bulk-action']);

			// loop over the array of record IDs and delete them
			foreach ( $delete_ids as $id ) {
				self::delete_reports($id);
			}

			// esc_url_raw() is used to prevent converting ampersand in url to "#038;"
			// add_query_arg() return the current url

			$message = 'deleted';
			$url     = esc_url_raw(remove_query_arg(['action', 'result', '_wpnonce'])) . '&status=' . $message;
			wp_redirect($url);
		} elseif ((isset($_POST['action']) && $_POST['action'] == 'bulk-read')
		          || (isset($_POST['action2']) && $_POST['action2'] == 'bulk-read')
		) {

			$read_ids = esc_sql($_POST['bulk-action']);

			// loop over the array of record IDs and mark as read them
			foreach ( $read_ids as $id ) {
				echo $id . "<br>";
				self::mark_as_read_reports($id);
			}

			// esc_url_raw() is used to prevent converting ampersand in url to "#038;"
			// add_query_arg() return the current url

			$message = 'read';
			$url     = esc_url_raw(remove_query_arg(['action', 'result', '_wpnonce'])) . '&status=' . $message;
			wp_redirect($url);
		}
	}

	public function eachresults_notices() {
		$status = (isset($_REQUEST['status'])) ? sanitize_text_field($_REQUEST['status']) : '';

		if (empty($status)) {
			return;
		}

		if ('deleted' == $status) {
			$updated_message = esc_html(__('Result(s) deleted.', $this->plugin_name));
		}
		if ('read' == $status) {
			$updated_message = esc_html(__('Result(s) marked as read.', $this->plugin_name));
		}

		if (empty($updated_message)) {
			return;
		}

		?>
        <div class="notice notice-success is-dismissible">
            <p>
	            <?php echo $updated_message; ?>
            </p>
        </div>
		<?php
	}
}