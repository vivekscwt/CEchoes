const express = require('express');
const apiController = require('../controllers/api-controller');
const multer = require('multer');
//const db = require('../config');

const router = express.Router();
//const publicPath = path.join(__dirname,'../public');

// Set up multer storage for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
// Create multer instance
const upload = multer({ storage: storage });
router.post('/search-company', apiController.searchCompany);
router.post('/states', apiController.states);
router.put('/edit-profile', upload.single('profile_pic'), apiController.editProfile);

router.post('/search-discussion', apiController.searchDiscussion);


router.post('/complain_category', apiController.complainCategory);

router.post('/complain_sub_category', apiController.complainSubCategory);

router.post('/company_product', apiController.companyProduct);

router.get('/categories/:countryId', apiController.getCategories);

module.exports = router;