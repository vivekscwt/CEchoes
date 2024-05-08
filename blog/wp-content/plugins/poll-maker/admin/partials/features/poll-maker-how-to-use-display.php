<?php 

$add_new_url = sprintf('?page=%s&action=%s', 'poll-maker-ays', 'add');
$poll_page_url = sprintf('?page=%s', 'poll-maker-ays');

 ?>

<div class="wrap">
    <div class="ays-poll-heading-box">
        <div class="ays-poll-wordpress-user-manual-box">
            <a href="https://ays-pro.com/wordpress-poll-maker-user-manual" target="_blank" style="text-decoration: none;font-size: 13px;">
                <i class="ays_poll_fas ays_fa_file_text"></i>
                <span style="margin-left: 3px;text-decoration: underline;"><?php echo __("View Documentation", $this->plugin_name); ?></span>
            </a>
        </div>
    </div>
    <div class="ays-poll-maker-htu-header">
        <h1 class="ays-poll-maker-wrapper ays_heart_beat">
            <?php echo __(esc_html(get_admin_page_title()),$this->plugin_name); ?> <i class="ays_fa ays_poll_fa_heart_o animated"></i>
        </h1>
    </div>

    <div class="ays-poll-faq-main">
        <h2><?php echo __("How to create a simple poll in 4 steps with the help of the Poll Maker plugin.", $this->plugin_name ); ?></h2>
        <fieldset style="border:1px solid #ccc; padding:10px;width:fit-content; margin:0 auto;">
            <div class="ays-poll-ol-container">
                <ol>
                    <li><?php echo __( "Go to the", $this->plugin_name ) . ' <strong><a href="'. $poll_page_url .'" target="_blank">'. __( "Poll" , $this->plugin_name ) .'</a></strong> ' .  __( "page", $this->plugin_name ); ?>,</li>
                    <li><?php echo __( "Create a new poll by clicking on the", $this->plugin_name ) . ' <strong><a href="'. $add_new_url .'" target="_blank">'. __( "Add New" , $this->plugin_name ) .'</a></strong> ' .  __( "button", $this->plugin_name ); ?>,</li>
                    <li><?php echo __( "Fill out the information.", $this->plugin_name ); ?></li>
                    <li><?php echo __( "Copy the", $this->plugin_name ) . ' <strong>'. __( "shortcode" , $this->plugin_name ) .'</strong> ' .  __( "of the poll and paste it into any post․", $this->plugin_name ); ?></li>
                </ol>
            </div>
            <div class="ays-poll-p-container">
                <p><?php echo __("Congrats! You have already created your first poll." , $this->plugin_name); ?></p>
            </div>
        </fieldset>
        <br>
        <div class="ays-poll-community-wrap">
            <div class="ays-poll-community-title">
                <h4><?php echo __( "Community", $this->plugin_name ); ?></h4>
            </div>
            <div class="ays-poll-community-youtube-video">
                <iframe width="560" height="315" src="https://www.youtube.com/embed/RDKZXFmG6Pc" loading="lazy" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="ays-poll-community-container">
                <div class="ays-poll-community-item">
                    <div>
                        <a href="https://www.youtube.com/channel/UC-1vioc90xaKjE7stq30wmA" target="_blank" class="ays-poll-community-item-cover">
                            <img src="<?php echo POLL_MAKER_AYS_ADMIN_URL . '/images/icons/poll-maker-how-to-use-youtube.svg';?> " class="ays-poll-community-item-img">
                        </a>
                    </div>
                    <h3 class="ays-poll-community-item-title"><?php echo __( "YouTube community", $this->plugin_name ); ?></h3>
                    <p class="ays-poll-community-item-desc"><?php echo __("Our YouTube community  guides you to step by step tutorials about our products and not only...", $this->plugin_name); ?></p>
                    <div class="ays-poll-community-item-footer">
                        <a href="https://www.youtube.com/channel/UC-1vioc90xaKjE7stq30wmA" target="_blank" class="button"><?php echo __( "Subscribe", $this->plugin_name ); ?></a>
                    </div>
                </div>
                <div class="ays-poll-community-item">
                    <a href="https://wordpress.org/support/plugin/poll-maker/" target="_blank" class="ays-poll-community-item-cover" style="color: #0073aa;">
                        <img src="<?php echo POLL_MAKER_AYS_ADMIN_URL . '/images/icons/poll-maker-how-to-use-wordpress.svg';?> " class="ays-poll-community-item-img">
                    </a>
                    <h3 class="ays-poll-community-item-title"><?php echo __( "Best Free Support", $this->plugin_name ); ?></h3>
                    <p class="ays-poll-community-item-desc"><?php echo __( "With the Free version, you get a lifetime usage for the plugin, however, you will get new updates and support for only 1 month.", $this->plugin_name ); ?></p>
                    <div class="ays-poll-community-item-footer">
                        <a href="https://wordpress.org/support/plugin/poll-maker/" target="_blank" class="button"><?php echo __( "Join", $this->plugin_name ); ?></a>
                    </div>
                </div>
                <div class="ays-poll-community-item">
                    <a href="https://ays-pro.com/contact" target="_blank" class="ays-poll-community-item-cover" style="color: #ff0000;">
                        <i class="ays-poll-community-item-img ays_poll_fas ays_fa_users" aria-hidden="true"></i>
                    </a>
                    <h3 class="ays-poll-community-item-title"><?php echo __( "Premium support", $this->plugin_name ); ?></h3>
                    <p class="ays-poll-community-item-desc"><?php echo __( "Get 12 months updates and support for the Business package and lifetime updates and support for the Developer package.", $this->plugin_name ); ?></p>
                    <div class="ays-poll-community-item-footer">
                        <a href="https://ays-pro.com/contact" target="_blank" class="button"><?php echo __( "Contact", $this->plugin_name ); ?></a>
                    </div>
                </div>
            </div>
        </div>
        <div class="ays-poll-asked-questions">
            <h4><?php echo __("FAQs" , $this->plugin_name); ?></h4>
            <div class="ays-poll-asked-question">
                <div class="ays-poll-asked-question__header">
                    <div class="ays-poll-asked-question__title">
                        <h4><strong><?php echo __("How do I change the design of the poll?" , $this->plugin_name); ?></strong></h4>
                    </div>
                    <div class="ays-poll-asked-question__arrow"><i class="fa fa-chevron-down"></i></div>
                </div>
                <div class="ays-poll-asked-question__body">                      
                    <p>
                        <?php 
                            echo sprintf( 
                                __( "To do that, please go to the %sStyles%s tab of the given poll. The plugin suggests you 7 awesome ready-to-use themes.  After choosing your preferred theme, you can customize it with 15+ style options to create attractive polls that people love to vote on, including %smain color, background image, background gradient, box-shadow, answers hover%s and etc. Moreover, you can use the %sCustom CSS%s written field to fully match your preferred design for your website and brand.", $this->plugin_name ),
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>'
                            ); 
                        ?>
                    </p>
                </div>
            </div>
            <div class="ays-poll-asked-question">
                <div class="ays-poll-asked-question__header">
                    <div class="ays-poll-asked-question__title">
                        <h4><strong><?php echo __( "Can I organize anonymous polls?" , $this->plugin_name ); ?></strong></h4>
                    </div>
                    <div class="ays-poll-asked-question__arrow"><i class="fa fa-chevron-down"></i></div>
                </div>
                <div class="ays-poll-asked-question__body">                      
                    <p>
                        <?php 
                            echo sprintf( 
                                __( "%sYes!%s Please go to the Settings tab of the given poll, and find the %sAllow anonymity%s option there. Enable it, and it will allow participants to respond to your polls without ever revealing their identities, even if they are registered on your website. After enabling the option, the wp _user and User IP will not be stored in the database. A giant step toward democracy!", $this->plugin_name ),
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>'
                            ); 
                        ?>
                    </p>
                </div>
            </div>
            <div class="ays-poll-asked-question">
                <div class="ays-poll-asked-question__header">
                    <div class="ays-poll-asked-question__title">
                        <h4><strong><?php echo __( "How do I limit access to the poll?", $this->plugin_name ); ?></strong></h4>
                    </div>
                    <div class="ays-poll-asked-question__arrow"><i class="fa fa-chevron-down"></i></div>
                </div>
                <div class="ays-poll-asked-question__body">                      
                    <p>
                        <?php 
                            echo sprintf( 
                                __( "To do that, please go to the %sLimitation%s tab of the given poll. The plugin suggests two methods to prevent repeat voting from the same person. Those are %sLimit the user to rate only once by IP%s or %sLimit the user to rate only once by User ID.%s The other awesome functionality that the plugin suggests is %sOnly for logged in users%s to enable access to the poll those, who have logged in. This option will allow you to precisely target your respondents, and not receive unnecessary votes from others, who have not logged in. Moreover, with the help of the %sOnly selected user role%s option, you can select your preferred user role for example administrator, editor, subscriber, customer and etc.", $this->plugin_name ),
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>'
                            ); 
                        ?>
                    </p>
                </div>
            </div>
            <div class="ays-poll-asked-question">
                <div class="ays-poll-asked-question__header">
                    <div class="ays-poll-asked-question__title">
                        <h4><strong><?php echo __( "Can I know more about my respondents?", $this->plugin_name ); ?></strong></h4>
                    </div>
                    <div class="ays-poll-asked-question__arrow"><i class="fa fa-chevron-down"></i></div>
                </div>
                <div class="ays-poll-asked-question__body">                      
                    <p>
                        <?php 
                            echo sprintf( 
                                __( "%sYou are in a right place!%s You just need to enable the %sInformation Form%s from the %sUser Data%s tab of the given poll, create your preferred %scustom fields%s in the %sCustom Fields%s page from the plugin left navbar, and come up with a clear picture of who your poll participants are, where they live, what their lifestyle and personality are like, etc.", $this->plugin_name ),
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>'
                            ); 
                        ?>
                    </p>
                </div>
            </div>
            <div class="ays-poll-asked-question">
                <div class="ays-poll-asked-question__header">
                    <div class="ays-poll-asked-question__title">
                        <h4><strong><?php echo __( "Can I get notified every time a vote is submitted?", $this->plugin_name ); ?></strong></h4>
                    </div>
                    <div class="ays-poll-asked-question__arrow"><i class="fa fa-chevron-down"></i></div>
                </div>
                <div class="ays-poll-asked-question__body">                      
                    <p>
                        <?php 
                            echo sprintf( 
                                __( "%sYou can!%s To enable it, please go to the %sEmail%s tab of the given poll. There you will find the %sResults notification by email%s option. After enabling the option, the admin(or your provided email) will receive an email notification about votes at each time.", $this->plugin_name ),
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>',
                                '<strong>',
                                '</strong>'
                            ); 
                        ?>
                    </p>
                </div>
            </div>
            <div class="ays-poll-asked-question">
                <div class="ays-poll-asked-question__header">
                    <div class="ays-poll-asked-question__title">
                        <h4><strong><?php echo __( "Will I lose the data after the upgrade?", $this->plugin_name ); ?></strong></h4>
                    </div>
                    <div class="ays-poll-asked-question__arrow"><i class="fa fa-chevron-down"></i></div>
                </div>
                <div class="ays-poll-asked-question__body">                      
                    <p>
                        <?php 
                            echo sprintf( 
                                __( "%sNope!%s All your content and assigned settings of the plugin will remain unchanged even after switching to the Pro version. You don’t need to redo what you have already built with the free version. For the detailed instruction, please take a look at our %supgrade guide%s", $this->plugin_name ),
                                '<strong>',
                                '</strong>',
                                '<a href="https://ays-pro.com/wordpress-poll-maker-user-manual#frag_poll_upgrade" target="_blank">',
                                '</a>'
                            ); 
                        ?>
                    </p>
                </div>
            </div>
        </div>
        <p class="ays-poll-faq-footer">
            <?php echo __( "For more advanced needs, please take a look at our" , $this->plugin_name ); ?> 
            <a href="https://ays-pro.com/wordpress-poll-maker-user-manual" target="_blank"><?php echo __( "Poll Maker plugin User Manual." , $this->plugin_name ); ?></a>
            <br>
            <?php echo __( "If none of these guides help you, ask your question by contacting our" , $this->plugin_name ); ?>
            <a href="https://ays-pro.com/contact" target="_blank"><?php echo __( "support specialists." , $this->plugin_name ); ?></a> 
            <?php echo __( "and get a reply within a day." , $this->plugin_name ); ?>
        </p>
    </div>
</div>

<script>
    var acc = document.getElementsByClassName("ays-poll-asked-question__header");
    var i;

    for (i = 0; i < acc.length; i++) {
      acc[i].addEventListener("click", function() {
        
        var panel = this.nextElementSibling;
        
        
        if (panel.style.maxHeight) {
          panel.style.maxHeight = null;
          this.children[1].children[0].style.transform="rotate(0deg)";
        } else {
          panel.style.maxHeight = panel.scrollHeight + "px";
          this.children[1].children[0].style.transform="rotate(180deg)";
        } 
      });
    }
</script>


