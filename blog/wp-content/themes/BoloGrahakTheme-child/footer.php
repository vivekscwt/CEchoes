<?php
/**
 * The template for displaying the footer
 *
 * Contains footer content and the closing of the #main and #page div elements.
 *
 * @package WordPress
 * @subpackage Twenty_Fourteen
 * @since Twenty Fourteen 1.0
 */
?>
      <?php
         if( isset($_GET['from_app']) && $_GET['from_app']=='true' ){
            // Hide header
         }else{
      ?>
      <!-- ============== Footer Start =============== -->
      <footer class="main_footer">
         <div class="container">
            <div class="row">
               <div class="col-md-4 col-sm-6">
                  <div class="footer-part">
                     <a href="<?php echo MAIN_URL_BG; ?>" class="footer-logo">
                     <img src="<?php echo MAIN_URL_BG; ?>/front-end/images/footer-logo.png" alt="Cechoes">
                     </a>
                     <h4>Contact Info</h4>
                     <div class="c-email"><span>Sales:</span> <a href="mailto:sales@CEchoesTechnology.com">Sales@CEchoesTechnology.com</a></div>
                     <div class="c-email"><span>Support:</span> <a href="mailto:support@CEchoesTechnology.com">Support@CEchoesTechnology.com</a></div>
                     <a href="<?php echo MAIN_URL_BG; ?>contact-us" class="c-link"><u>Contact Us</u></a>
                  </div>
               </div>
               <div class="col-md-3 col-sm-6">
                  <div class="footer-part">
                     <h4>Quick Links</h4>
                     <?php wp_nav_menu( array( 'menu'=>'footer_menu', 'container'=> false ) );?>
                  </div>
               </div>
               <div class="col-md-5 col-sm-12">
                  <div class="footer-part">
                     <p>We are coming soon on Google Play and App Store.</p>
                     <div class="app-info">
                        <a href="#"><img src="<?php echo get_stylesheet_directory_uri();?>/images/g-play.png" alt="img" width="183" height="56"></a>
                        <a href="#"><img src="<?php echo get_stylesheet_directory_uri();?>/images/app-store.png" alt="img" width="178" height="56"></a>
                     </div>
                     <div class="social-icons">
                        <a href="https://www.facebook.com/profile.php?id=100094607193555" target="_blank"><i class="fa-brands fa-facebook-f"></i></a><a href="https://twitter.com/GrahakBolo" target="_blank"><i class="fa-brands fa-twitter"></i></a><a href="#" target="_blank"><i class="fa-brands fa-linkedin-in"></i></a><a href="#" target="_blank"><i class="fa-brands fa-instagram"></i></a><a href="https://www.youtube.com/@CEchoesTechnology" target="_blank"><i class="fa-brands fa-youtube"></i></a>
                     </div>
                  </div>
               </div>
            </div>
            <div class="footer-bottom">
               <div class="footer-b-left">
                  <span>Copyright</span> <?php echo date('Y'); ?> <a href="#">CEchoes Technology Pvt Ltd</a>
               </div>
               <div class="footer-b-right">
                  <!--<a href="#">Disclaimer</a> |--> <a href="<?php echo MAIN_URL_BG; ?>privacy-policy">Privacy Policy</a> <!--| <a href="">Terms of Service</a>-->
               </div>
            </div>
         </div>
      </footer>
      <!-- ============== Footer End =============== -->
      <?php }?>      
      <!-- <div class="floating-chat">
         <a href="#">
            <svg width="39" height="32" viewBox="0 0 39 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.36 2.78498C20.5782 2.78498 24.7965 2.78498 29.0159 2.78498C29.1502 2.78498 29.2858 2.77803 29.4201 2.78846C29.5316 2.79657 29.6876 2.73865 29.7343 2.8788C29.7775 3.00621 29.6372 3.07687 29.5568 3.15563C28.5122 4.16911 27.4651 5.18143 26.4192 6.19376C25.648 6.93968 24.878 7.68908 24.1032 8.43153C23.6223 8.89252 23.374 9.43227 23.3896 10.0983C23.41 11.0075 23.3896 11.9179 23.3956 12.8283C23.404 14.1001 24.2711 14.9282 25.5988 14.934C26.5416 14.9387 27.4843 14.9213 28.4258 14.9398C29.0987 14.9526 29.648 14.7174 30.1145 14.2669C30.9709 13.4387 31.8261 12.6105 32.6872 11.787C32.7856 11.6932 32.8707 11.5021 33.0375 11.5843C33.161 11.6446 33.101 11.8218 33.101 11.948C33.1034 16.0795 33.107 20.2111 33.0998 24.3426C33.0962 26.2885 31.5238 27.8116 29.5125 27.8128C23.2744 27.8197 17.0364 27.8232 10.7984 27.8024C10.2838 27.8012 10.0212 27.9691 9.7897 28.3826C9.22119 29.3984 8.6119 30.3945 8.01101 31.393C7.52645 32.1991 6.90037 32.2014 6.42541 31.4046C5.82092 30.3911 5.19604 29.3869 4.62633 28.3548C4.39725 27.9402 4.12739 27.7977 3.64523 27.8035C1.84735 27.8209 0.426071 26.6916 0.0614567 24.9959C0.00988296 24.7584 0.00388602 24.5082 0.00388602 24.2639C0.000287854 18.2837 -0.00211092 12.3024 0.00268663 6.32233C0.00388602 4.29073 1.55829 2.78962 3.65962 2.7873C7.89347 2.78151 12.1261 2.78498 16.36 2.78498ZM16.5243 21.5118C19.741 21.5118 22.9578 21.5118 26.1746 21.5118C26.9098 21.5118 27.2852 21.2767 27.2708 20.8319C27.2564 20.3999 26.899 20.1856 26.1853 20.1856C19.7662 20.1856 13.3471 20.1856 6.92796 20.1856C6.19273 20.1856 5.81732 20.4196 5.83172 20.8643C5.84611 21.2952 6.20473 21.5107 6.91716 21.5107C10.1195 21.513 13.3219 21.5118 16.5243 21.5118ZM12.1969 10.4145C14.0068 10.4145 15.8178 10.4156 17.6277 10.4145C18.2898 10.4133 18.6508 10.177 18.6508 9.75195C18.6508 9.32687 18.291 9.08942 17.6277 9.08942C14.0367 9.08826 10.4458 9.08826 6.8548 9.08942C6.19153 9.08942 5.83172 9.32571 5.83172 9.75195C5.83172 10.177 6.19273 10.4145 6.8548 10.4145C8.63589 10.4156 10.417 10.4145 12.1969 10.4145ZM12.2425 14.6375C10.447 14.6375 8.65148 14.6364 6.856 14.6375C6.19273 14.6387 5.83292 14.8738 5.83172 15.3C5.83172 15.7251 6.19273 15.9626 6.8548 15.9626C10.4458 15.9637 14.0367 15.9637 17.6277 15.9626C18.291 15.9626 18.6508 15.7251 18.6508 15.3C18.6508 14.8738 18.291 14.6387 17.6277 14.6375C15.8334 14.6364 14.0379 14.6375 12.2425 14.6375Z" fill="black"/>
            <path d="M27.0171 13.6668C26.5542 13.6668 26.09 13.6761 25.627 13.6634C25.0297 13.6472 24.7179 13.3483 24.7095 12.7669C24.6963 11.8866 24.7083 11.0052 24.7047 10.1249C24.7035 9.81677 24.8198 9.57006 25.0453 9.35347C27.9994 6.50877 30.9415 3.65364 33.9064 0.819369C35.0614 -0.284457 36.8605 -0.261292 37.9879 0.817053C39.1309 1.91045 39.1609 3.66291 38.0047 4.79106C35.0806 7.64387 32.1337 10.4747 29.1988 13.3171C28.9505 13.558 28.6711 13.6773 28.3197 13.6703C27.8855 13.6611 27.4513 13.668 27.0171 13.6668Z" fill="black"/>
            </svg>
         </a>
      </div> -->
      <!-- Css -->
      <link href="<?php echo get_stylesheet_directory_uri();?>/footer-style.css" rel="stylesheet" type="text/css">
      <!-- Responsive Css -->
      <link href="<?php echo get_stylesheet_directory_uri();?>/responsive/footer-responsive-style.css" media='screen and (max-width:1440.98px)' rel="stylesheet" type="text/css">
      <link href="<?php echo get_stylesheet_directory_uri();?>/css/bootstrap.min.css" rel="stylesheet" type="text/css">
      <!-- <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script> -->
      <script src="<?php echo get_stylesheet_directory_uri();?>/js/bootstrap.min.js"> </script>
      <script src="<?php echo get_stylesheet_directory_uri();?>/js/component.js"> </script>
      <script src="<?php echo get_stylesheet_directory_uri();?>/js/edit-js.js"> </script>

<?php wp_footer(); ?>
</body>
</html>