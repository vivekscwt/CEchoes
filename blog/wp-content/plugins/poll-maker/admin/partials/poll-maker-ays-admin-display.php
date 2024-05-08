<?php
/**
 * Provide a admin area view for the plugin
 *
 * This file is used to markup the admin-facing aspects of the plugin.
 *
 * @link       https://ays-pro.com/
 * @since      1.0.0
 *
 * @package    Poll_Maker_Ays
 * @subpackage Poll_Maker_Ays/admin/partials
 */


$action = isset($_GET['action']) ? sanitize_text_field( $_GET['action'] ) : '';
$id     = isset($_GET['poll']) ? absint($_GET['poll']) : null;
if ($action == 'duplicate' && $id != null) {
	$this->polls_obj->duplicate_poll($id);
}
$poll_max_id = Poll_Maker_Ays_Admin::get_max_id('polls');
?>

<div class="wrap ays-poll-list-table ays_polls_list_table">
    <div class="ays-poll-heading-box">
        <div class="ays-poll-wordpress-user-manual-box">
            <a href="https://ays-pro.com/wordpress-poll-maker-user-manual" target="_blank" style="text-decoration: none;font-size: 13px;">
                <i class="ays_poll_fas ays_fa_file_text"></i>
                <span style="margin-left: 3px;text-decoration: underline;"><?php echo __("View Documentation", $this->plugin_name); ?></span>
            </a>
        </div>
    </div>
    <h1 class="wp-heading-inline">
		<?php
		echo esc_html(get_admin_page_title());
		echo sprintf('<a href="?page=%s&action=%s" class="page-title-action ays-poll-add-new-button"><img src=' . POLL_MAKER_AYS_ADMIN_URL . '/images/icons/add-new.svg><span>' . __('Add New', $this->plugin_name) . '</span></a>', esc_attr($_REQUEST['page']), 'add');
        ?>
    </h1>
    <div id="poststuff">
        <div id="post-body" class="metabox-holder">
            <div id="post-body-content">
                <div class="meta-box-sortables ui-sortable">
                <?php
                        $this->polls_obj->views();
                    ?>
                    <form method="post">
						<?php
                        $this->polls_obj->prepare_items();
                        $search = __("Search" , $this->plugin_name);
                        $this->polls_obj->search_box($search, $this->plugin_name);
						$this->polls_obj->display();
						?>
                    </form>
                </div>
            </div>
        </div>
        <br class="clear">
    </div>
    
    <?php if($poll_max_id <= 3): ?>
        <div class="ays-poll-create-poll-video-box" style="margin: 80px auto 30px;">
            <div class="ays-poll-create-poll-youtube-video-button-box">
                <?php echo sprintf( '<a href="?page=%s&action=%s" class="ays-poll-add-new-button-video"><img src=' . POLL_MAKER_AYS_ADMIN_URL . '/images/icons/add-new.svg>' . __('Add New', $this->plugin_name) . '</a>', esc_attr( $_REQUEST['page'] ), 'add');?>
            </div>
            <div class="ays-poll-create-poll-title">
                <h4><?php echo __( "Create Your First Poll in Under One Minute", $this->plugin_name ); ?></h4>
            </div>
            <div class="ays-poll-create-poll-youtube-video">
                <iframe width="560" height="315" class="ays-poll-youtube-video-responsive" src="https://www.youtube.com/embed/0dfJQdAwdL4" loading="lazy" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="ays-poll-create-poll-youtube-video-button-box">
                <?php echo sprintf( '<a href="?page=%s&action=%s" class="ays-poll-add-new-button-video"><img src=' . POLL_MAKER_AYS_ADMIN_URL . '/images/icons/add-new.svg>' . __('Add New', $this->plugin_name) . '</a>', esc_attr( $_REQUEST['page'] ), 'add');?>
            </div>
        </div>
    <?php else: ?>
        <div class="ays-poll-create-poll-video-box" style="margin: auto;">
            <div class="ays-poll-create-poll-youtube-video-button-box">
                <?php echo sprintf( '<a href="?page=%s&action=%s" class="ays-poll-add-new-button-video"><img src=' . POLL_MAKER_AYS_ADMIN_URL . '/images/icons/add-new.svg>' . __('Add New', $this->plugin_name) . '</a>', esc_attr( $_REQUEST['page'] ), 'add');?>
            </div>
            <div class="ays-poll-create-poll-youtube-video">
                <a href="https://www.youtube.com/watch?v=0dfJQdAwdL4" target="_blank" title="YouTube video player" >How to create a Poll in Under One Minute</a>
            </div>
        </div>
    <?php endif ?>
</div>
