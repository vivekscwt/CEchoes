jQuery(function ($) {

  $(document).ready(function() {
    $('#preloder').fadeOut();
  });
  
  // /////////////////////////////////////// Nav Menu start
  function sidemenu() {
    $('.nav_sec').toggleClass('slidein');
    $(".nav_sec").find("ul > li").addClass("hover-target");
    $('.nav_sec').prepend('<div class="cls-btn"></div>');

    $('.cls-btn').on('click', function () {
      $('.nav_sec').removeClass('slidein');
      $(".nav_sec").find("ul > li").removeClass("hover-target");
    });
  }
  $('body').find('.toggle-menu').on('click', sidemenu);

  $('.nav_sec ul > li > ul').parent().prepend('<i class="arw-nav"></i>');
  function subMenu() {
    $(this).parent('li').find('> ul').stop(true, true).slideToggle();
    $(this).parents('li').siblings().find('ul').stop(true, true).slideUp();
    $(this).toggleClass('actv');
    $(this).parent().siblings().find('.arw-nav').removeClass('actv');
  }
  $('.nav_sec ul > li > .arw-nav').on('click', subMenu);

  /* Anything that gets to the document
     will hide the dropdown */
  $(document).click(function () {
    $(".nav_sec").removeClass('slidein');
  });

  /* Clicks within the dropdown won't make
     it past the dropdown itself */
  $(".toggle-menu").click(function (e) {
    e.stopPropagation();
  });

  // /////////////////////////////////////// Nav Menu End

  // ///////////////// Aos Animation Start ////////////////////////////
  AOS.init({
    offset: 200,
    delay: 100,
    duration: 800,
  });

  //refresh animations
  $(window).on('load', function () {
    AOS.refresh();
  });
  // ///////////////// Aos Animation End ////////////////////////////

  // /////////////////////////////////////// Fixed Top Start
  $(window).scroll(function () {
    var scroll = $(window).scrollTop();
    if (scroll >= 50) {
      $(".main_header").addClass("fixed-top");
    } else {
      $(".main_header").removeClass("fixed-top");
    }
  });

  // /////////////////////////////////////// Fixed Top End

  // /////////////////////////////////////// Auto Field Dropdown Start
  $(".search-area input").keyup(function () {
    $(".autofield-dropdown").show();
  })

  $(window).click(function () {
    $(".autofield-dropdown").hide();
  });
  // /////////////////////////////////////// Auto Field Dropdown End


  // /////////////////////////////////////// Slick Slider start
  $('.banner-slider1').slick({
    dots: false,
    infinite: true,
    speed: 1800,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.banner-slider2').slick({
    dots: false,
    infinite: true,
    speed: 2000,
    autoplay: true,
    autoplaySpeed: 2000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.banner-slider3').slick({
    dots: false,
    infinite: true,
    speed: 1400,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.post-slider').slick({
    dots: false,
    infinite: true,
    speed: 1000,
    autoplay: false,
    pauseOnHover: false,
    arrows: true,
    prevArrow: '<i class="fa-solid fa-chevron-left slick-arrow-left"></i>',
    nextArrow: '<i class="fa-solid fa-chevron-right slick-arrow-right"></i>',
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.gr-slider1').slick({
    dots: false,
    infinite: true,
    speed: 1800,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.gr-slider2').slick({
    dots: false,
    infinite: true,
    speed: 2000,
    autoplay: true,
    autoplaySpeed: 2000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.gr-slider3').slick({
    dots: false,
    infinite: true,
    speed: 2600,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.gr-slider4').slick({
    dots: false,
    infinite: true,
    speed: 3000,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.comment-slider').slick({
    centerMode: true,
    arrows: false,
    speed: 2000,
    dots: false,
    centerPadding: '400px',
    slidesToShow: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          arrows: false,
          centerMode: true,
          centerPadding: '300px',
          slidesToShow: 1
        }
      },
      {
        breakpoint: 1080,
        settings: {
          arrows: false,
          centerMode: true,
          centerPadding: '200px',
          slidesToShow: 1
        }
      },

      {
        breakpoint: 991,
        settings: {
          arrows: false,
          centerMode: true,
          centerPadding: '150px',
          slidesToShow: 1
        }
      },
      {
        breakpoint: 768,
        settings: {
          arrows: false,
          centerMode: true,
          centerPadding: false,
          slidesToShow: 2
        }
      },
      {
        breakpoint: 640,
        settings: {
          arrows: false,
          centerMode: false,
          centerPadding: false,
          slidesToShow: 1
        }
      }
    ]
  });

  $('.v-slider').slick({
    dots: true,
    infinite: true,
    speed: 1800,
    autoplay: false,
    arrows: false,
    autoplaySpeed: 4000,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.featured-slider').slick({
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false,
    dots: false,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1320,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          infinite: true,
          dots: false
        }
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 620,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 440,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        },
      }
      // You can unslick at a given breakpoint now by adding:
      // settings: "unslick"
      // instead of a settings object
    ]
  });

  $('.review-slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    arrows: true,
    prevArrow: '<i class="fa-solid fa-chevron-left slick-arrow-left"></i>',
    nextArrow: '<i class="fa-solid fa-chevron-right slick-arrow-right"></i>',
    dots: false,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  });

  $('.review-slider2').slick({
    slidesToShow: 2,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false,
    dots: false,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 840,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  });

  $('.review-company-slider').slick({
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false,
    dots: false,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 840,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 440,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1
        }
      }
    ]
  });

  $('.review-big-slider1').slick({
    dots: false,
    infinite: true,
    speed: 1800,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.review-small-slider2').slick({
    dots: false,
    infinite: true,
    speed: 1400,
    autoplay: true,
    autoplaySpeed: 2000,
    pauseOnHover: false,
    arrows: false,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1
  });
  $('.promotion-slider').slick({
    arrows: true,
    prevArrow: '<div class="slick-prev"><i class="fa fa-angle-left" aria-hidden="true"></i></div>',
    nextArrow: '<div class="slick-next"><i class="fa fa-angle-right" aria-hidden="true"></i></div>',
    speed: 2000,
    dots: false,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 5000,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: 4
        }
      },
      {
        breakpoint: 1080,
        settings: {
          slidesToShow: 3
        }
      },

      {
        breakpoint: 991,
        settings: {
          slidesToShow: 3
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2
        }
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1
        }
      }
    ]
  });

  $('.home-popular-review-slider1').slick({
    dots: false,
    infinite: true,
    speed: 1800,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: false,
    arrows: false,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $('.home-popular-review-slider').slick({
    dots: false,
    infinite: true,
    speed: 1400,
    autoplay: true,
    autoplaySpeed: 2000,
    pauseOnHover: true,
    arrows: false,
    prevArrow: '<i class="fa-solid fa-chevron-left slick-arrow-left"></i>',
    nextArrow: '<i class="fa-solid fa-chevron-right slick-arrow-right"></i>',
    slidesToShow: 1,
    slidesToScroll: 1
  });



  var time = 2;
  var $bar,
    $slick,
    isPause,
    tick,
    percentTime;

  $slick = $('.modal-slide-in');
  $slick.slick({
    infinite: true,
    speed: 1400,
    autoplay: false,
    autoplaySpeed: 12000,
    pauseOnHover: true,
    dots: true,
    arrows: false,
    slidesToShow: 1,
    slidesToScroll: 1
  });

  $bar = $('.slider-progress .progress');

  function startProgressbar() {
    resetProgressbar();
    percentTime = 0;
    isPause = false;
    tick = setInterval(interval, 30);
  }

  function interval() {
    if (isPause === false) {
      percentTime += 1 / (time + 0.1);
      $bar.css({
        width: percentTime + "%"
      });
      if (percentTime >= 100) {
        $slick.slick('slickNext');
        startProgressbar();
      }
    }
  }

  function resetProgressbar() {
    $bar.css({
      width: 0 + '%'
    });
    clearTimeout(tick);
  }

  startProgressbar();

  $('.modal-slide-in .slick-dots li').click(function() {
    startProgressbar();
  });



  // /////////////////////////////////////// Slick Slider end


  // /////////////////////////////////////// language / Country and custom Select start
  $(".lang-arw").click(function (e) {
    e.preventDefault();
    $(".lang-dropdown").slideToggle();
  });

  //SELECT OPTIONS AND HIDE OPTION AFTER SELECTION
  $(".lang-dropdown ul li a").click(function (e) {
    e.preventDefault();
    var text = $(this).html();
    $(".language-select").find(".lang-change").html(text);
    $(".language-select").find(".lang-dropdown").slideUp();
  });

  //HIDE OPTIONS IF CLICKED ANYWHERE ELSE ON PAGE
  $(document).bind('click', function (e) {
    var $clicked = $(e.target);
    if (!$clicked.parents().hasClass("language-select"))
      $(".lang-dropdown").slideUp();
  });

 // ================ Country-select-box start ====================

  $(".country-arw").click(function (e) {
    e.preventDefault();
    $(".country-dropdown").slideToggle();
  });

  //SELECT OPTIONS AND HIDE OPTION AFTER SELECTION
  $(".country-dropdown ul li a").click(function (e) {
    e.preventDefault();
    var text = $(this).html();
    $(".country-select").find(".country-change").html(text);
    $(".country-select").find(".country-dropdown").slideUp();
  });

  //HIDE OPTIONS IF CLICKED ANYWHERE ELSE ON PAGE
  $(document).bind('click', function (e) {
    var $clicked = $(e.target);
    if (!$clicked.parents().hasClass("country-select"))
      $(".country-dropdown").slideUp();
  });

  // ================ Custom-select-box start ====================

  $(".custom-select-change").click(function (e) {
    e.preventDefault();
    $(".custom-select-dropdown").slideToggle();
  });

  //SELECT OPTIONS AND HIDE OPTION AFTER SELECTION
  $(".custom-select-dropdown ul li a").click(function (e) {
    e.preventDefault();
    var text = $(this).html();
    $(".custom-select-box").find(".custom-select-change").html(text);
    $(".custom-select-box").find(".custom-select-dropdown").slideUp();
  });

  //HIDE OPTIONS IF CLICKED ANYWHERE ELSE ON PAGE
  $(document).bind('click', function (e) {
    var $clicked = $(e.target);
    if (!$clicked.parents().hasClass("custom-select-box"))
      $(".custom-select-dropdown").slideUp();
  });

  // =================================table action button start

  $(".action-select").click(function (e) {
    e.preventDefault();
    $(this).find(".action-dropdown").slideToggle();
  });

  // $(".action-dropdown ul li a").click(function (e) {
  //   e.preventDefault();
  //   var text = $(this).html();
  //   $(this).parents(".action-select").find(".action-change").html(text);
  //   $(this).parents(".action-select").find(".action-dropdown").slideUp();
  // });

  // /////////////////////////////////////// language / Country and custom Select end

  // /////////////////////////////////////// Load More Blog slice Start
  $(".more-blog-btn").click(function (e) {
    e.preventDefault();
    $(".load-blogs-slice").slice(0, 1).fadeIn().css("margin-top", "40px");
    $(this).hide();
    $(".blog-slice-btn").show();
    $(".blog-slice-btn .view-more").click(function (e) {
      e.preventDefault();
      $(".load-blogs-slice:hidden").slice(0, 1).fadeIn();
      if ($(".load-blogs-slice:hidden").length == 0) {
        $(".blog-slice-btn").hide();
      }
    });
  });

  $(".accordion-repeat").slice(0, 6).show();
  $(".load-slice-btn").click(function (e) {
    e.preventDefault();
    $(".accordion-repeat:hidden").slice(0, 6).fadeIn("slow");

    if ($(".accordion-repeat:hidden").length == 0) {
      $(".load-slice-btn").hide();
    }
  });

  $(".tab-content-wrap").find(".discussion-load-panel").slice(0, 4).show();
  $(".discussion-load-btn").click(function (e) {
    e.preventDefault();
    $(".tab-content-wrap").find(".discussion-load-panel:hidden").slice(0, 4).fadeIn("slow");

    if ($(".tab-content-wrap").find(".discussion-load-panel:hidden").length == 0) {
      $(".discussion-load-btn").hide();
    }
  });
  $(window).on('load', function(){
    if($(".tab-content-wrap").find(".discussion-load-panel:hidden").length == 0){
         $(".discussion-load-btn").hide();
    }
  });

  $(".all-cat-slice").slice(0,20).show();
  $(".load-all-categories").click(function(e){
    e.preventDefault();
    $(".all-cat-slice:hidden").slice(0,4).fadeIn("slow");
    
    if($(".all-cat-slice:hidden").length == 0){
       $(".load-all-categories").hide();
      }
  });
  $(window).on('load', function(){
    if($(".all-cat-slice:hidden").length == 0){
         $(".load-all-categories").hide();
    }
  });

  // $(".add-option").click(function(e){
  //   e.preventDefault();
  //   $(this).parent(".create-survey-field-repater").find(".multiple-ans-repeat:hidden").slice(0,1).fadeIn("slow");
  // });

  // $(".qst-repeat").slice(0,1).show();
  // $(".add-qut").click(function(e){
  //   e.preventDefault();
  //   $(".qst-repeat:hidden").slice(0,1).fadeIn("slow");
  // });



  //$(".multiple-ans-repeat").slice(0,0).show();
  // $(".add-ans-btn").click(function(e){
  //   e.preventDefault();
  //   $(".multiple-ans-repeat:hidden").slice(0,1).fadeIn("slow");
  // });

  // $(".tab-content-wrap").find(".discussion-load-panel").slice(0, 4).show();
  // $(".discussion-load-btn").click(function (e) {
  //   e.preventDefault();
  //   $(this).parent(".tab-content-wrap").find(".discussion-load-panel:hidden").slice(0, 4).fadeIn("slow");

  //   if ($(".tab-content-wrap").find(".discussion-load-panel:hidden").length == 0) {
  //     $(".discussion-load-btn").hide();
  //   }
  // });
  // $(window).on('load', function(){
  //   if($(".tab-content-wrap").find(".discussion-load-panel:hidden").length == 0){
  //        $(".discussion-load-btn").hide();
  //   }
  // });

  // $(".customer-review-wrap").slice(0, 3).show();
  // $(".show-comment-slice").click(function (e) {
  //   e.preventDefault();
  //   $(".customer-review-wrap:hidden").slice(0, 3).fadeIn("slow");

  //   if ($(".customer-review-wrap:hidden").length == 0) {
  //     $(".show-comment-slice").hide();
  //     $(".btn-border-top").hide();
  //   }
  // });
  
  // /////////////////////////////////////// Load More Blog slice end

  // /////////////////////////////////////// Archive Slide Start
  $(".archive-slide").click(function (e) {
    e.preventDefault();
    $(".archive-dropdwn").slideToggle();
  });
  // /////////////////////////////////////// Archive Slide end

  // /////////////////////////////////////// search Box open start
  $(".search-pop").click(function (e) {
    e.preventDefault()
    $("#search-box").addClass("-open").fadeIn();
    setTimeout(function () {
      inputSearch.focus();
    }, 800);
  });

  $('a[href="#close"]').click(function (e) {
    e.preventDefault()
    $("#search-box").removeClass("-open").fadeOut();
  });

  $(document).keyup(function (e) {
    if (e.keyCode == 27) { // escape key maps to keycode `27`
      $("#search-box").removeClass("-open");
    }
  });
  // /////////////////////////////////////// search Box open end

  // /////////////////////////////////////// Switch Toggle business show start
  $(document).ready(function () {
    $("#flexSwitchCheckChecked").click(function () {
      var checked = $(this).is(':checked');
      if (checked) {
        $(".business-right").hide();
        $(".business-left").show();
      } else {
        $(".business-left").hide();
        $(".business-right").show();
      }
    });
  });
  // /////////////////////////////////////// Switch Toggle business show End

  // /////////////////////////////////////// Modal Start
  $(".autofield-dropdown ul > li ").click(function () {
     $(".custom-modal").fadeIn();
  });

  $(document).on('click','.custom_link',function(){
    location.replace($(this).attr('href'));
  })



  $(".custom-modal-close").click(function (e) {
    e.preventDefault();
    $(".custom-modal").fadeOut();
  });

  $(".login").click(function (e) {
    e.preventDefault();
    $(".login-modal").fadeIn();
    $('.nav_sec').removeClass('slidein');

    $(".login-modal-close").click(function (e) {
      e.preventDefault();
      $(".login-modal").fadeOut();
    });

  });

  // $(window).load(function () {
  //   setTimeout(function () {
  //     $("#quickloginmodal").modal('show');
  //   }, 10000);
  // });

  $(window).load(function () {
    setTimeout(function () {
      $("#premiumcompanymodal").modal('show');
    }, 5000);
  });
  $('.modal').on('shown.bs.modal', function (e) {
    $('.modal-slide-in').slick('setPosition');
  })
  

  // setTimeout(function () {
  //   $("body").find('.login').trigger('click');
  // }, 60000);

  $(".quicklog").click(function (e) {
    e.preventDefault();
    $("#quickloginmodal").modal('hide');
    $(".login-modal").fadeIn();
    $(".login-modal-close").click(function (e) {
      e.preventDefault();
      $(".login-modal").fadeOut();
    });
  });
  // /////////////////////////////////////// Modal End

  // /////////////////////////////////////// Password eye hide show Start
  $('.eye-change').click(function () {

    if ($(this).hasClass('fa-eye-slash')) {

      $(this).removeClass('fa-eye-slash');

      $(this).addClass('fa-eye');

      $(this).parents(".custom-form").find('.password').attr('type', 'text');

    } else {

      $(this).removeClass('fa-eye');

      $(this).addClass('fa-eye-slash');

      $(this).parents(".custom-form").find('.password').attr('type', 'password');
    }
  });
  // /////////////////////////////////////// Password eye hide show End

  ////////////////////////////// Accordion Start

  $(".custom-accordion").on("click", ".acc_heading", function () {
    $(this).toggleClass("active").next().slideToggle();
    $(this).parent(".c_accordion_wrap").addClass("yellow-border");
    $(".acc_contents").not($(this).next()).slideUp(300);
    $(".acc_contents").not($(this).next()).parent(".c_accordion_wrap").removeClass("yellow-border");
    $(this).parents('.accordion-repeat').siblings().find('.acc_heading').removeClass("active");
  });

  ////////////////////////////// Accordion End

  ////////////////////////////// Tooltip Start
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  })
  ////////////////////////////// Tooltip End

  // ////////////////////////////// Range Slider Start

  //  const rangeTexts = {
  //     0: "Lowest",
  //     0.5: "Low",
  //     1: "Not Bad",
  //     1.5: "Medium",
  //     2: "Average",
  //     2.5: "Good",
  //     3: "Very Good",
  //     3.5: "Awesome",
  //     4: "Exellent",
  //     4.5: "High",
  //     5: "Highest",
  //   };

  //   const rangeEmojis = {
  //     0: "😠",
  //     0.5: "😦",
  //     1: "☹️",
  //     1.5: "🙁",
  //     2: "😐",
  //     2.5: "🙂",
  //     3: "😊",
  //     3.5: "😄",
  //     4: "😃",
  //     4.5: "😍",
  //     5: "🤩",
  //   };

  //   $("#rating-range").slider({
  //     step: 0.5,
  //     range: true, 
  //     min: 0, 
  //     max: 5, 
  //     values: [0, 5], 
  //     slide: function(event, ui)
  //     {
  //       $("#ratingcounter").val(ui.values[0] + " / " + ui.values[1]);
  //       $("#ratingvalue").val(ui.values[0]);
  //       // When slider values change, update the text
  //       $("#selected-range-text").text(rangeTexts[ui.values[0]]);
  //       $("#selected-range-emojis").text(rangeEmojis[ui.values[0]]);
  //     }
  //     });
  //     $("#ratingcounter").val($("#rating-range").slider("values", 0) + " / " + $("#rating-range").slider("values", 1));


  //   $(document).ready(function() {
  //     var rangeSlider = $('#rating-range');

  //     rangeSlider.on('input', function() {

  //         // Show the appropriate element based on the range
  //         if (sliderValue >= 0.5 && sliderValue < 1) {
  //             $('.range-tag1').show();
  //         } else if (sliderValue >= 1 && sliderValue < 1.5) {
  //             $('.range-tag2').show();
  //         } else if (sliderValue >= 1.5 && sliderValue <= 2) {
  //             $('range-tag3').show();
  //         }
  //     });
  // });

  ////////////////////////////// Range Slider End


  // /////////////////////////////  read more read less script
  $(".read-review").click(function (e) {
    e.preventDefault();
    $(this).parents(".user-review-text").find(".review-full-description").slideToggle();
    if ($(this).text() == "View More") {
      $(this).text("View Less").addClass("arrowup");
    } else {
      $(this).text("View More").removeClass("arrowup");
    }
  });
  // /////////////////////////////  read more read less script


  // /////////////////////////////  Text typing script start start
  function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function typeWrite(span) {
    var text = $('#' + span).text();
    var randInt = 0
    for (var i = 0; i < text.length; i++) {
      randInt += parseInt(randomIntFromInterval(1, 50));
      var typing = setTimeout(function (y) {
        $('#' + span).append(text.charAt(y));
      }, randInt, i);
    };
  }

  $(document).ready(function () {
    typeWrite('type-writing');
  });

  function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function typeWrite(span) {
    var text = $('#' + span).text();
    var randInt = 0
    for (var i = 0; i < text.length; i++) {
      randInt += parseInt(randomIntFromInterval(1, 50));
      var typing = setTimeout(function (y) {
        $('#' + span).append(text.charAt(y));
      }, randInt, i);
    };
  }

  $(document).ready(function () {
    typeWrite('type-writing2');
  });

  // /////////////////////////////  Text typing script end

  // /////////////////////////////  Dashboard page review slide script end
  $('.profile-menu-list ul > li > ul').parent().prepend('<i class="arw-down"></i>');
  function subMenu() {
    $(this).parent('li').find('> ul').stop(true, true).slideToggle();
    $(this).parents('li').siblings().find('ul').stop(true, true).slideUp();
    $(this).toggleClass('actv');
    $(this).parent().siblings().find('.arw-down').removeClass('actv');
  }
  $('.profile-menu-list ul > li > .arw-down').on('click', subMenu);
  // /////////////////////////////  Dashboard page review slide end

  // ///////////////////////////// Fancybox Config start
  $('[data-fancybox="gallery"]').fancybox({
    buttons: [
      "slideShow",
      "thumbs",
      "zoom",
      "fullScreen",
      "share",
      "close"
    ],
    loop: false,
    protect: true
  });

  // ///////////////////////////// Fancybox Config end

  // ///////////////////////////// category page class add start
  if ($(".category-premium, .category-free").length > 0) {
    $(".inner-page-heading").addClass("category-head");
  }
  // ///////////////////////////// category page class add end

  //  ================ Faq page tabination =============

  $('.faq-categories').find('.faq-cat-body ul li a').click(function (e) {
    e.preventDefault();
    var clickedIndex = $(this).parent().index();
    $(this).parent().toggleClass('active');
    $(this).parent().siblings().removeClass('active');
    $('.custom-accordion').eq(clickedIndex).show().siblings().hide();
  });
  $('.faq-categories').find('.faq-cat-body ul li:first a').trigger('click');

  //  ================ Faq page tabination ============= 

  // ///////////////////////////// Login profile doropdown start
  // $(".user-login-profile-icon").click(function () {
  //   $(".user-log-profile-dropdown").slideToggle();
  // });

  // ///////////////////////////// Login profile doropdown end

  /*=========================== sandip counter js =================*/

    $('.count').each(function () {
      $(this).prop('Counter', 0).animate({
        Counter: $(this).text()
      }, {
        duration: 3000,
        easing: 'swing',
        step: function (now) {
          $(this).text(Math.ceil(now));
        }
      });
    });

  /*=========================== sandip counter js End =================*/

/*=========================== Easy Responsive Tabs Start =================*/
$('#horizontalTab').easyResponsiveTabs({
    type: 'default', //Types: default, vertical, accordion           
    width: 'auto', //auto or any width like 600px
    fit: true,   // 100% fit in a container
    closed: 'accordion', // Start closed if in accordion view
    activate: function(event) { // Callback function if tab is switched
    var $tab = $(this);
    var $info = $('#tabInfo');
    var $name = $('span', $info);
    $name.text($tab.text());
    $info.show();
    }
    });
    $('#verticalTab').easyResponsiveTabs({
    type: 'vertical',
    width: 'auto',
    fit: true
  });
  /*=========================== Easy Responsive Tabs End =================*/

  /*=========================== Math random review box function start =================*/
  $(function () {
    if($(window).width()>840){
    setRandomClass();
    setInterval(function () {
      setRandomClass();
    }, 2000);
  
    function setRandomClass() {
      var teamList = $(".home-popular-review-box-wrapper");
      var teamItem = teamList.find(".home-popular-review-box");
      var number = teamItem.length;
      var random = Math.floor(Math.random() * number);
      if (teamItem.eq(random).hasClass("home-popular-review-box_active")) {
        var random = random + 1;
      }
      $(".home-popular-review-box_active")
        .addClass("home-popular-review-box_old")
        .siblings()
        .removeClass("home-popular-review-box_old");
      teamItem
        .eq(random)
        .addClass("home-popular-review-box_active")
        .siblings()
        .removeClass("home-popular-review-box_active");
    }
  }
  });
/*=========================== Math random review box function End =================*/

/*=========================== Discussion scroll function Start =================*/
$('.discussionscrollbtn').click(function(e) {
  e.preventDefault();
  var headerHeight = $(".inner_header").innerHeight();
  $('html, body').animate({
    scrollTop: $("#discussiontext").offset().top - headerHeight
  }, 1000);
});
/*=========================== Discussion scroll function End =================*/

/*=========================== Creat a Poll slidedown function start =================*/
$(".create-poll-btn .btn-default").click(function(e){
  e.preventDefault();
  $(".creat-poll-field").slideToggle();
});
/*=========================== Creat a Poll slidedown function End =================*/

/*=========================== Remove multiple answer function End =================*/
// $(".remove-ans").click(function(){
//   $(this).parents(".multiple-ans-repeat").find(".custom-form").hide();
// });

/*=========================== Remove multiple answer function End =================*/

/*=========================== Send Review request tags start =================*/
$("#sendreviewtags input").on({
  focusout : function() {
    var txt = this.value.replace(/[^a-z0-9\+\-\.\@]/ig,''); // allowed characters
    if(txt) $("<span/>", {text:txt.toLowerCase(), insertBefore:this});
    this.value = "";
  },
  keyup : function(ev) {
    // if: comma|enter (delimit more keyCodes with | pipe)
    if(/(188|13)/.test(ev.which)) $(this).focusout(); 
  }
});
$('#sendreviewtags').on('click', 'span', function() {
  if(confirm("Remove "+ $(this).text() +"?")) $(this).remove(); 
});
/*=========================== Send Review request tags End =================*/

/*=========================== Create survey add question add option Start =================*/
// $('.form-check-input').click(function() {
//   if($(this).is(':checked')) {
//       if($(this).val() == 'type_radio'){
//         $(this).parents(".qst-repeat").find('.create-survey-field-repater').show();    
//       }
//       else if($(this).val() == 'type_checkbox'){
//         $(this).parents(".qst-repeat").find('.create-survey-field-repater').hide();
//       }else{
//         $(this).parents(".qst-repeat").find('.create-survey-field-repater').hide();
//       }
//     }
// });

// $('.form-check-input').click(function() {
//   if($(this).is(':checked')) {
//       if($(this).val() == 'type_checkbox'){
//         $(this).parents(".qst-repeat").find('.create-survey-field-repater2').show();    
//       }
//       else if($(this).val() == 'type_radio'){
//         $(this).parents(".qst-repeat").find('.create-survey-field-repater2').hide();
//       }else{
//         $(this).parents(".qst-repeat").find('.create-survey-field-repater2').hide();
//       }
//     }
// });
/*=========================== Create survey add question add option End =================*/

/*=========================== btn switch toggle start =================*/
$('.premium-alert-box .btn-toggle').click(function() {
  $(this).find('.btn').toggleClass('active'); 
  if ($(this).find('.btn-primary').length>0) {
    $(this).find('.btn').toggleClass('btn-primary');
  }
});
/*=========================== btn switch toggle End =================*/

/*=========================== Repeater function start =================*/
// $(".add-new-hops").click(function(e){
//   e.preventDefault();
//   var totalLevel = $(this).parents(".premium-complain-m-wrap").find(".premium-complain-m-content-body").length;
//   //console.log(totalLevel, 'hi');
//   if (totalLevel >= 5) {
//     console.log('কিছু হবে না');
//   }else {
//     //console.log(totalLevel+1,'cloned');
//     var count = totalLevel+1;
//     $(this).parents(".premium-complain-m-wrap").find(".premium-complain-clone").append('<div class=premium-complain-m-content-body><form class=level_form><input class=label_count name=label_count type=hidden value="'+count+'"><input type="hidden" name="company_id" value="<%= company.ID %>" ><div class=premium-complain-m-content-repeat><div class="premium-complain-m-content-part count_number">'+count+'</div><div class=premium-complain-m-content-part><a class="btn-default btn-warning edit-save-btn"href=#>Edit</a></div></div><div class=edit-email><div class="mb-2 g-2 justify-content-around row align-items-center"><div class=col-sm-6><label class=col-form-label for=""><strong>ETA Days</strong></label></div><div class=col-sm-6><input class=form-control name=eta_days type=number></div></div><div class="mb-2 g-2 justify-content-around row"><div class="col-sm-6 email_field_label"><label class=col-form-label for=""><strong>Enter Your E-Mail Address</strong></label></div><div class="col-sm-6 email_clone_div"><div class="mb-2 add-email-field"><input class=form-control name=emails type=email></div><a class=add-email-btn href=#><i class="fa-solid fa-circle-plus"></i></a></div></div><div class="align-items-center d-flex justify-content-end"><button class="btn-default btn-warning each_form_submut"type=submit>Save</button></div></div><a class=close-level href=#><i class="fa-solid fa-circle-xmark"></i></a></form></div>');
//     if(totalLevel >= 4){
//       $('body').find(".add-new-hops").hide();
//     }
//   }
// });

/*=========================== Repeater function End =================*/

/*=========================== Edit email start =================*/
$("body").on('click' , '.edit-save-btn' , function (e){
  e.preventDefault();
  $(this).parents(".premium-complain-m-content-body").find(".edit-email").slideToggle();
  $(this).parents(".premium-complain-m-content-body").toggleClass("active");
  if ($(this).text() == "Edit") {
    $(this).text("Edited");
  } else {
    $(this).text("Edit");
  }
});
/*=========================== Edit email End =================*/

/*=========================== email repeater Start =================*/
$("body").on('click' , '.add-email-btn-1' , function (e) {
  e.preventDefault();
  $(this).parents(".email_clone_div").append('<div class="add-email-field-1 add-email-field mb-2"> <input type="email" name="emails_1" id="" class="form-control"><a href="#" class="close-email-field"><i class="fa-solid fa-circle-xmark"></i></a> </div>');
});

$("body").on('click' , '.add-email-btn-2' , function (e) {
  e.preventDefault();
  $(this).parents(".email_clone_div").append('<div class="add-email-field-2 add-email-field mb-2"> <input type="email" name="emails_2" id="" class="form-control"><a href="#" class="close-email-field"><i class="fa-solid fa-circle-xmark"></i></a> </div>');
});

$("body").on('click' , '.add-email-btn-3' , function (e) {
  e.preventDefault();
  $(this).parents(".email_clone_div").append('<div class="add-email-field-3 add-email-field mb-2"> <input type="email" name="emails_3" id="" class="form-control"><a href="#" class="close-email-field"><i class="fa-solid fa-circle-xmark"></i></a> </div>');
});

/*=========================== email repeater End =================*/


/*=========================== Level Email repeater close Start =================*/
  $("body").on('click' , '.close-level' , function (e){
    e.preventDefault();
    var levelcloseLength = $(this).parents('.premium-complain-clone').find('.premium-complain-m-content-body').length-1;
    $(this).parents('.premium-complain-m-content-body').remove();
    setTimeout(function () {
      console.log('hi');
      $('body').find('.premium-complain-clone').find('.premium-complain-m-content-body').each(function(index){
        console.log(index+1);
        $(this).find('.count_number').text(index+1);
      });
    }, 100);
    if(levelcloseLength < 5 ){
      $(".add-new-hops").show();
    }else{
      $(".add-new-hops").hide();
    }
  });
  
  $("body").on('click' , '.close-email-field' , function (e){
    e.preventDefault();
    $(this).parent().remove();
  });
  
/*=========================== Level Email repeater close End =================*/




labels = document.querySelectorAll('.ongoing-poll')

for(var i=0;i<labels.length;i++){
    labels[i].addEventListener('click',function(){
         
        for(var j=0;j<labels.length;j++){
            labels[j].classList.remove('selected')
        }

        for(var k=0;k<labels.length;k++){
            labels[k].querySelector('.progress-bar').style.width='0%'
            labels[k].querySelector('.progress').style.display='none'
        }


       setTimeout(function(){
        for(var k=0;k<labels.length;k++){
           values = labels[k].querySelector('.progress-bar').style.getPropertyValue('--w');
           labels[k].querySelector('.progress-bar').style.width = values + "%"
 
       
            labels[k].querySelector('.progress').style.display='block'
         
        }
       },500)
        this.classList.add('selected')
    })
}



});
