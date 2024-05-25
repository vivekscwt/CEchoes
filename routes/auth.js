const express = require('express');
const multer = require('multer');

const authController = require('../controllers/auth');
//const db = require('../config');


const router = express.Router();
//const publicPath = path.join(__dirname,'../public');

// Set up multer storage for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const originalname = file.originalname;
        const sanitizedFilename = originalname.replace(/[^a-zA-Z0-9\-\_\.]/g, ''); // Remove symbols and spaces
        const filename = Date.now() + '-' + sanitizedFilename;
        cb(null, filename);
    }
});
// Create multer instance
const upload = multer({ storage: storage });

const csv_storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'company-csv/');
    },
    filename: function (req, file, cb) {
        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day}-${hours}_${minutes}_${seconds}`;

        const originalname = file.originalname;
        const sanitizedFilename = originalname.replace(/[^a-zA-Z0-9\-\_\.]/g, ''); // Remove symbols and spaces
        const filename = formattedDate + '-' + sanitizedFilename;
        cb(null, filename);
    }
});
// Create multer instance
const csvupload = multer({ storage: csv_storage });


router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/frontend-user-register', authController.frontendUserRegister);

router.post('/frontend-user-register-otp', authController.frontendUserRegisterOTP);

router.post('/frontend-user-login', authController.frontendUserLogin);

// company_user_register
router.post('/user-company-register', authController.userCompanyRegistration);

//Create New category--------//
router.post('/create-category', upload.single('cat_image'), authController.createCategory);

//Update category--------//
router.post('/update-category', upload.single('cat_image'), authController.updateCategory);

//Create New User--------//
router.post('/create-user', upload.single('profile_pic'), authController.createUser);
router.put('/edit-user-data', upload.single('profile_pic'), authController.editUserData);
router.post('/delete-user', authController.deleteUser);
router.post('/trash-user', authController.trashUser);
router.post('/restore-user', authController.restoreUser);

//---Company--------//
router.post('/create-company', upload.single('logo'), authController.createCompany);
router.put('/edit-company-data',upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'cover_img', maxCount: 1 },
]), authController.editCompany);
router.post('/company-bulk-upload', csvupload.single('company_file'), authController.companyBulkUpload);
router.post('/delete-company', authController.deleteCompany);
router.post('/deleteCompanies', authController.deleteCompanies);


router.post('/trash-company', authController.trashCompany);
router.post('/trashCompanies', authController.trashCompanies);

router.post('/restore-company', authController.restoreCompany);
router.get('/get-parent-categories',authController.getparentcompany);

// Add FAQ
router.post('/create-faq', authController.createFAQ);

router.post('/delete-payment', authController.deletePayment);

// Update FAQ
router.put('/update-faq', authController.updateFAQ);

// Update FAQ Images
router.post('/faq_images',upload.fields([
    { name: 'banner_img_1', maxCount: 1 },
    { name: 'banner_img_2', maxCount: 1 },
    { name: 'banner_img_3', maxCount: 1 },
    { name: 'banner_img_4', maxCount: 1 },
    { name: 'banner_img_5', maxCount: 1 },
    { name: 'banner_img_6', maxCount: 1 },
    { name: 'banner_img_7', maxCount: 1 },
    { name: 'banner_img_8', maxCount: 1 },
    
    { name: 'app_banner_img', maxCount: 1 }
]), authController.updateFAQImages);

// Update Contacts
router.post('/update-contact', authController.updateContacts);

// Contacts Feedback
router.post('/contact-feedback', authController.contactFeedback);

// Home Page
router.post('/update-home', upload.fields([
    { name: 'banner_img_1', maxCount: 1 },
    { name: 'banner_img_2', maxCount: 1 },
    { name: 'banner_img_3', maxCount: 1 },
    { name: 'banner_img_4', maxCount: 1 },
    { name: 'banner_img_5', maxCount: 1 },
    { name: 'banner_img_6', maxCount: 1 },
    
    { name: 'review_img_1', maxCount: 1 },
    { name: 'review_img_2', maxCount: 1 },
    { name: 'review_img_3', maxCount: 1 },
    { name: 'review_img_4', maxCount: 1 },

    { name: 'cus_right_img_1', maxCount: 1 },
    { name: 'cus_right_img_2', maxCount: 1 },
    { name: 'cus_right_img_3', maxCount: 1 },
    { name: 'cus_right_img_4', maxCount: 1 },
    { name: 'cus_right_img_5', maxCount: 1 },
    { name: 'cus_right_img_6', maxCount: 1 },
    { name: 'cus_right_img_7', maxCount: 1 },
    { name: 'cus_right_img_8', maxCount: 1 },

    { name: 'org_responsibility_img_1', maxCount: 1 },
    { name: 'org_responsibility_img_2', maxCount: 1 },
    { name: 'org_responsibility_img_3', maxCount: 1 },
    { name: 'org_responsibility_img_4', maxCount: 1 },
    { name: 'org_responsibility_img_5', maxCount: 1 },
    { name: 'org_responsibility_img_6', maxCount: 1 },
    { name: 'org_responsibility_img_7', maxCount: 1 },
    { name: 'org_responsibility_img_8', maxCount: 1 },

    { name: 'about_us_img', maxCount: 1 },

    { name: 'map_img', maxCount: 1 },
    
    { name: 'app_cus_right_img', maxCount: 1 },
    { name: 'app_org_responsibility_img', maxCount: 1 },

]), authController.updateHome);

// About Page
router.post('/update-about', upload.fields([
    { name: 'banner_img_1', maxCount: 1 },
    { name: 'banner_img_2', maxCount: 1 },
    { name: 'banner_img_3', maxCount: 1 },
    { name: 'banner_img_4', maxCount: 1 },
    { name: 'banner_img_5', maxCount: 1 },
    { name: 'banner_img_6', maxCount: 1 },
    { name: 'banner_img_7', maxCount: 1 },
    { name: 'banner_img_8', maxCount: 1 },

    { name: 'platform_img_1', maxCount: 1 },
    { name: 'platform_img_2', maxCount: 1 },
    { name: 'platform_img_3', maxCount: 1 },
    { name: 'platform_img_4', maxCount: 1 },
    { name: 'platform_img_5', maxCount: 1 },
    { name: 'platform_img_6', maxCount: 1 },
    { name: 'platform_img_7', maxCount: 1 },
    { name: 'platform_img_8', maxCount: 1 },

    { name: 'right_img_1', maxCount: 1 },
    { name: 'right_img_2', maxCount: 1 },
    
    { name: 'app_banner_img_1', maxCount: 1 },
    { name: 'app_banner_img_2', maxCount: 1 },


]), authController.updateAbout);

router.post('/add-review', authController.submitReview);
router.post('/edit-user-review', authController.editUserReview);
router.post('/delete-review', authController.deleteReview);
router.post('/add-review-reply', authController.submitReviewReply);
//---Rating Tags--------//
router.post('/add-rating-tags', upload.single('rating_image'), authController.createRatingTags);
router.put('/edit-rating-tags', upload.single('rating_image'), authController.editRatingTags);
//---Review--------//
router.put('/edit-review', authController.editCustomerReview);
//---Review reply--------//
router.put('/edit-review-reply', authController.editCustomerReviewReply);

//Create Featured Company
router.post('/create-featured-company', authController.creatFeaturedCompany);

//Update Featured Company
router.post('/update-featured-company', authController.updateFeaturedCompany);

//Delete Featured Company
router.get('/delete-featured-companies/:id', authController.deleteFeaturedCompany);

// Home Page
router.post('/update-business', upload.fields([
    { name: 'banner_img_1', maxCount: 1 },
    { name: 'banner_img_2', maxCount: 1 },
    { name: 'banner_img_3', maxCount: 1 },
    { name: 'banner_img_4', maxCount: 1 },
    { name: 'banner_img_5', maxCount: 1 },
    { name: 'banner_img_6', maxCount: 1 },
    { name: 'banner_img_7', maxCount: 1 },
    { name: 'banner_img_8', maxCount: 1 },


    { name: 'advantage_img_1', maxCount: 1 },
    { name: 'advantage_img_2', maxCount: 1 },
    { name: 'advantage_img_3', maxCount: 1 },
    { name: 'advantage_img_4', maxCount: 1 },
    { name: 'advantage_img_5', maxCount: 1 },
    { name: 'advantage_img_6', maxCount: 1 },
    { name: 'advantage_img_7', maxCount: 1 },
    { name: 'advantage_img_8', maxCount: 1 },

    { name: 'did_you_know_img', maxCount: 1 },

    { name: 'app_banner_img_1', maxCount: 1 },
    { name: 'app_banner_img_2', maxCount: 1 },

]), authController.updateBusiness);

//Update Privacy Policy
router.post('/update-privacy', authController.updatePrivacy);

//Update disclaimer
router.post('/update-disclaimer', authController.updateDisclaimer);

//Update terms-of-service
router.post('/update-terms-of-service', authController.updateTermsOfService);

//Update Complaint register Page
router.post('/update-complaint', upload.fields([
    { name: 'banner_img_1', maxCount: 1 },
    { name: 'banner_img_2', maxCount: 1 },
    { name: 'banner_img_3', maxCount: 1 },
    { name: 'banner_img_4', maxCount: 1 },
    { name: 'banner_img_5', maxCount: 1 },
    { name: 'banner_img_6', maxCount: 1 },
    { name: 'banner_img_7', maxCount: 1 },
    { name: 'banner_img_8', maxCount: 1 },

]), authController.updateComplaint);

//Update My Profile
router.post('/update-myprofile',upload.single('profile_pic'), authController.updateMyProfile);

//Update Global Content
router.post('/update-global-content', authController.updateGlobalContent);

//Update basic-company-profile-management 
//router.post('/basic_company_profile_update', upload.single('logo'), authController.updateBasicCompany);
router.post('/basic_company_profile_update',upload.fields([
    
    { name: 'logo', maxCount: 1 },

    { name: 'gallery_images', maxCount: 100 },

]), authController.updateBasicCompany);

//Update basic-company-profile-management 
router.post('/premium_company_profile_update',  upload.fields([
    
    { name: 'logo', maxCount: 1 },

    { name: 'cover_image', maxCount: 1 },

    { name: 'gallery_images', maxCount: 100 },

    { name: 'promotion_image', maxCount: 100 },

    { name: 'product_image', maxCount: 100 },

]), authController.updatePremiumCompany);

//Delete One Premium Gallery Image
router.post('/deletePremiumImage', authController.deletePremiumImage);

//Delete One Premium Promotion 
router.post('/deletePremiumPromotion', authController.deletePremiumPromotion);

//Delete one Premium Product
router.post('/deletePremiumProduct', authController.deletePremiumProduct);

//Delete one Premium Product
router.post('/frontend-forgot-password', authController.forgotPassword);

//Reset Password
router.post('/reset_password', authController.resetPassword);

//Change Password
router.post('/change_password', authController.changePassword);

//Review Voting (like dislike)
router.post('/reviewVoting', authController.reviewVoting);

//Create Poll
router.post('/create-poll', authController.createPoll);

//Update Poll Expire Date
router.post('/update-poll-expire-date', authController.updatePollExpireDate);

//Polling Route
router.post('/user_polling', authController.userPolling);

//Review Invitation Email
router.post('/review_invitation', authController.reviewInvitation);

//Bulk Review Invitation Email
router.post('/review_bulk_invitation',csvupload.single('email_file'), authController.reviewBulkInvitation);


//Add Review Flag
router.post('/add-review-flag', authController.addReviewFlag);

//Add Review Flag admin response
router.post('/update-review-flag', authController.updateReviewFlag);

//Create discussion
router.post('/create-discussion', authController.createDiscussion);

//updateDiscussion
router.post('/update-discussion',authController.updateDiscussion);

//getDiscussions
router.get('/get-discussions/:id', authController.getDiscussions);

//Create discussion
router.post('/add-comment', authController.addComment);

router.post('/edit-discussion', authController.editDiscussion);

//Create create-company-category
router.post('/create-company-category',upload.fields([

    { name: 'product_image', maxCount: 100 },

]), authController.createCompanyCategory);

//Delete company-category
router.post('/delete-company-category', authController.deleteCompanyCategory);

//Delete company-category
router.post('/delete-company-product', authController.deleteCompanyProduct);

//update-company-product
router.post('/update-company-product', upload.single('product_img'), authController.updateCompanyProduct);

//update-company-product
router.post('/add-company-product', upload.fields([

    { name: 'product_image', maxCount: 100 },

]), authController.addCompanyProduct);

//Update company-category
router.post('/update-company-category', authController.updateCompanyCategory);

//create-company-level
router.post('/create-company-level', authController.createCompanyLevel);

//Delete delete-company-complaint-level
router.post('/delete-company-complaint-level', authController.deleteCompanyComplaintLevel);

//complaint register
router.post('/complaint-register', authController.complaintRegister);

// company-query
router.post('/company-query', authController.companyQuery);

// user-complaint-rating
router.post('/user-complaint-rating', authController.userComplaintRating);

// user-complaint-response
router.post('/user_complaint_response', authController.userComplaintResponse);

// user-complaint-response
router.post('/escalate-next-level', authController.escalateNextLevel);

//Create Survey
router.post('/create-survey', csvupload.single('email_file'), authController.createSurvey);
router.post('/update-survey', authController.updateSurvey);
router.post('/create-survey-answer', authController.createSurveyAnswer);


//Edit Survey Data
router.post('/update-survey-data', csvupload.single('email_file'), authController.updateSurveyData);

router.post('/create-invited-survey-answer', authController.createInvitedSurveyAnswer);

//survey Invitation Email
router.post('/survey_invitation', authController.surveyInvitation);

//Bulk Survey Invitation Email
router.post('/survey_bulk_invitation',csvupload.single('email_file'), authController.surveyBulkInvitation);

router.post('/delete-discussion', authController.deleteDiscussion);

router.post('/delete-poll', authController.deletePoll);

router.post('/delete-complaint', authController.deleteComplaint);

router.post('/delete-survey', authController.deleteSurvey);


router.post('/delete-comment', authController.deleteComment);

//Notification Content
router.post('/notification-content',upload.single('image'), authController.notificationContent);

//Create company discussion tags
router.post('/company-create-tags', authController.companyCreateTags);
//Update company discussion tags
router.post('/update-company-tags', authController.updateCompanyTags);


// company compare-chart-filter
router.post('/compare-chart-filter', authController.compareChartFilter);

// company compare-chart-filter
router.post('/historical-chart-filter', authController.historicalChartFilter);

// company compare-chart-filter
router.post('/competitorCompany-chart', authController.competitorCompanyChart);

// add payment details
router.post('/add-payment', authController.addPayment);

// add payment details
router.post('/edit-payment', authController.editPayment);

//new
router.post('/likeComment',authController.likeComment);
//dislikeComment
// router.post('/dislikeComment',authController.dislikeComment);


//getcompaniesbyCountry
router.get('/getcompaniesbyCountry/:country/:state/:city',authController.getcompaniesbyCountry);




module.exports = router;