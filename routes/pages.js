const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../config');
var moment = require('moment');
const { error, log, Console } = require('console');
const async = require('async');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const crypto = require('crypto');
const app = express();
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const comFunction = require('../common_function');
const comFunction2 = require('../common_function2');
const comFuncApi = require('../common_function_api');
var slugify = require('slugify')
const util = require('util');
const query = util.promisify(db.query).bind(db);
const router = express.Router();
const publicPath = path.join(__dirname, '../public');
const requestIp = require('request-ip');
const he = require('he');
const queryAsync = util.promisify(db.query).bind(db);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const dns = require('dns');
const { login } = require('../controllers/auth');
const multer = require('multer');

function decodeHTMLEntities(text) {
    return he.decode(text);
}

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


router.get('/countries', (req, res) => {
    db.query('SELECT * FROM countries', (err, results) => {
        if (err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        } else {
            if (results.length > 0) {
                return res.status(200).json({
                    status: 'ok',
                    data: results,
                    message: 'All countries received',
                });
            }
        }
    })
});

router.get('/admin-login', (req, res) => {
    const encodedUserData = req.cookies.user;
    // const apiKey = process.env.GEO_LOCATION_API_KEY;
    // console.log("apiKey",apiKey);
    if (encodedUserData) {
        res.redirect('dashboard');
    } else {
        res.render('sign-in', { message: '' })
    }
});

router.get('/register-user', async (req, res) => {
    console.log(req.query);
    const userResponse = JSON.parse(req.query.userResponse);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    res.json({
        menu_active_id: req.query.menu_active_id,
        page_title: req.query.page_title,
        userResponse: userResponse
    });
});

// Middleware function to check if user CookieValue Exist
const checkCookieValue = (req, res, next) => {
    // Check if the 'userData' cookie exists and has a value
    res.locals.globalData = {
        BLOG_URL: process.env.BLOG_URL,
        MAIN_URL: process.env.MAIN_URL,
        // Add other variables as needed
    };
    if (req.cookies.user) {
        // If it exists, set the 'userData' property on the request object to the cookie value
        req.userData = req.cookies.user;
    } else {
        // If the cookie doesn't exist or has no value, set 'userData' to null
        req.userData = null;
    }
    // Call the next middleware or route handler
    next();
};

router.get('/user-company-register', async (req, res) => {
    let currentUserData = '';
    try {
        res.locals.globalData = {
            BLOG_URL: process.env.BLOG_URL,
            MAIN_URL: process.env.MAIN_URL,
        };
        var url = process.env.MAIN_URL
        console.log("url", url);

        const [globalPageMeta, countries] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction.getCountries(),
        ]);
        res.render('front-end/company_user_register', {
            menu_active_id: 'User Register',
            page_title: 'User Register',
            currentUserData,
            globalPageMeta: globalPageMeta,
            countries: countries,
            url: url
        });
    } catch (error) {
        console.error('Error fetching blog posts:', error);
    }
});

// router.get('', checkCookieValue, async (req, res) => {
//     let currentUserData = JSON.parse(req.userData);
//     let userId = '';
//     if (currentUserData) {
//         userId = currentUserData.user_id;
//     }
//     const apiKey = process.env.GEO_LOCATION_API_KEY
//     console.log("apiKey",apiKey);
//     console.log("currentUserData",currentUserData);

//     const country_name = req.cookies.countryName
//      || 'India';
//     let country_code = req.cookies.countryCode 
//     || 'IN';
//     console.log("country_namesland", country_name);
//     console.log("country_codesland", country_code);

//     if (country_code != 'UK' && country_code != 'JP') {
//         country_code = 'US';
//     }

//     const getbusinessquery = `SELECT * FROM users WHERE user_id= "${userId}"`;
//     const getbusinessvalue = await queryAsync(getbusinessquery);
//     if(getbusinessvalue.length>0){
//         console.log("getbusinessvalue",getbusinessvalue);
//         var user_status = getbusinessvalue[0].user_status;
//         console.log("user_status",user_status);
//         if (getbusinessvalue[0].user_status == "3") {
//             res.redirect('/logout');
//         }
//     }

//     const [allRatingTags, globalPageMeta, latestReviews, AllReviewTags, AllReviewVoting, PopularCategories, ReviewCount, UserCount, PositiveReviewsCompany, NegativeReviewsCompany, HomeMeta, VisitorCheck, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getCountries] = await Promise.all([
//         comFunction.getAllRatingTags(),
//         comFunction2.getPageMetaValues('global'),
//         //comFunction2.getlatestReviews(18, country_name),
//         comFunction2.getlatestReviews(18),
//         comFunction2.getAllReviewTags(),
//         comFunction2.getAllReviewVoting(),
//         //comFunction.getPopularCategories(country_code),
//         comFunction.getPopularCategories(),
//         comFunction.getReviewCount(),
//         comFunction.getUserCount(),
//         comFunction.getPositiveReviewsCompany(),
//         comFunction.getNegativeReviewsCompany(),
//         // comFunction.getPositiveReviewsCompany(country_code),
//         // comFunction.getNegativeReviewsCompany(country_code),

//         //comFunction2.getPageMetaValues('home'),
//         comFunction2.getPageMetaValue('home',country_code),
//         comFunction.getVisitorCheck(requestIp.getClientIp(req)),
//         //comFunction2.getAllLatestDiscussion(20, country_name),
//         comFunction2.getAllLatestDiscussion(20),
//         //comFunction2.getAllPopularDiscussion(country_name),
//         comFunction2.getAllPopularDiscussion(),
//         //comFunction2.getAllDiscussions(),
//         comFunction2.getAllDiscussion(),
//         //comFunction2.getAllDiscussion(country_name),
//         comFunction.getCountries(),
//     ]);
//     const rangeTexts = {};

//     //console.log("PopularCategories", PopularCategories);
//     // console.log("getPositiveReviewsCompany",PositiveReviewsCompany);
//     // console.log("getNegativeReviewsCompany",NegativeReviewsCompany);
//     // console.log("getCountries", getCountries);
//     console.log("HomeMeta",HomeMeta);

//     try {
//         // Make API request to fetch blog posts
//         const apiUrl = process.env.BLOG_API_ENDPOINT + '/home-blog';
//         const response = await axios.get(apiUrl);
//         const blogPosts = response.data;
//         const restructuredResponse = {
//             "status": blogPosts.status,
//             "data": blogPosts.data.map(item => ({
//                 ...item,
//                 "title": decodeHTMLEntities(item.title)
//             })),
//             "success_message": blogPosts.success_message,
//             "error_message": blogPosts.error_message
//         };
//         //console.log('restructuredResponse', restructuredResponse);

//         const sql = `SELECT * FROM page_info where secret_Key = 'home' AND country= "${country_code}"`;
//         db.query(sql, (err, results, fields) => {
//             if (err) throw err;
//             const home = results[0];
//             console.log("home",home);
//             const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
//             db.query(meta_sql, async (meta_err, _meta_result) => {
//                 if (meta_err) throw meta_err;

//                 const meta_values = _meta_result;
//                 let meta_values_array = {};
//                 await meta_values.forEach((item) => {
//                     meta_values_array[item.page_meta_key] = item.page_meta_value;
//                 })
//                 console.log("meta_values_array",meta_values_array);
//                 //console.log(allRatingTags);
//                 const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
//                         JOIN company ON featured_companies.company_id = company.ID 
//                         WHERE featured_companies.status = 'active' 
//                         ORDER BY featured_companies.ordering ASC `;

//                 // const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
//                 //         JOIN company ON featured_companies.company_id = company.ID 
//                 //         WHERE featured_companies.status = 'active' AND company.main_address_country = "${country_code}"
//                 //         ORDER BY featured_companies.ordering ASC `;
//                 db.query(featured_sql, (featured_err, featured_result) => {
//                     var featured_comps = featured_result;
//                     // res.json( {
//                     //     menu_active_id: 'landing',
//                     //     page_title: home.title,
//                     //     currentUserData: currentUserData,
//                     //     homePosts: restructuredResponse.status === 'ok' ? restructuredResponse.data : [],
//                     //     home,
//                     //     meta_values_array,
//                     //     featured_comps,
//                     //     allRatingTags: allRatingTags,
//                     //     AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
//                     //     globalPageMeta:globalPageMeta,
//                     //     latestReviews: latestReviews,
//                     //     AllReviewTags: AllReviewTags,
//                     //     AllReviewVoting:AllReviewVoting,
//                     //     PopularCategories,
//                     //     ReviewCount,
//                     //     UserCount,
//                     //     PositiveReviewsCompany,
//                     //     NegativeReviewsCompany,
//                     //     HomeMeta,
//                     //     VisitorCheck
//                     // });
//                     res.render('front-end/landing', {
//                         menu_active_id: 'landing',
//                         page_title: home.title,
//                         currentUserData: currentUserData,
//                         homePosts: restructuredResponse.status === 'ok' ? restructuredResponse.data : [],
//                         home,
//                         meta_values_array,
//                         featured_comps,
//                         allRatingTags: allRatingTags,
//                         AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
//                         globalPageMeta: globalPageMeta,
//                         latestReviews: latestReviews,
//                         AllReviewTags: AllReviewTags,
//                         AllReviewVoting: AllReviewVoting,
//                         PopularCategories,
//                         ReviewCount,
//                         UserCount,
//                         PositiveReviewsCompany,
//                         NegativeReviewsCompany,
//                         HomeMeta,
//                         VisitorCheck,
//                         AllLatestDiscussion: getAllLatestDiscussion,
//                         AllPopularDiscussion: getAllPopularDiscussion,
//                         AllDiscussions: getAllDiscussions,
//                         getCountries: getCountries,
//                         country_name: country_name,
//                         countryname: country_code,
//                         apiKey
//                     });
//                 })

//             })

//         })
//     } catch (error) {
//         console.error('Error fetching blog posts:', error);
//         const sql = `SELECT * FROM page_info where secret_Key = 'home' `;
//         db.query(sql, (err, results, fields) => {
//             if (err) throw err;
//             const home = results[0];
//             const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
//             db.query(meta_sql, async (meta_err, _meta_result) => {
//                 if (meta_err) throw meta_err;

//                 const meta_values = _meta_result;
//                 let meta_values_array = {};
//                 await meta_values.forEach((item) => {
//                     meta_values_array[item.page_meta_key] = item.page_meta_value;
//                 })

//                 const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.company_name FROM featured_companies 
//                         JOIN company ON featured_companies.company_id = company.ID 
//                         WHERE featured_companies.status = 'active' 
//                         ORDER BY featured_companies.ordering ASC `;
//                 db.query(featured_sql, (featured_err, featured_result) => {
//                     var featured_comps = featured_result;
//                     res.render('front-end/landing', {
//                         menu_active_id: 'landing',
//                         page_title: home.title,
//                         currentUserData: currentUserData,
//                         homePosts: [],
//                         home,
//                         meta_values_array,
//                         featured_comps,
//                         allRatingTags: allRatingTags,
//                         AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
//                         globalPageMeta: globalPageMeta,
//                         latestReviews: latestReviews,
//                         AllReviewTags: AllReviewTags,
//                         AllReviewVoting: AllReviewVoting,
//                         PositiveReviewsCompany,
//                         NegativeReviewsCompany,
//                         PopularCategories,
//                         ReviewCount,
//                         UserCount,
//                         PositiveReviewsCompany,
//                         NegativeReviewsCompany,
//                         HomeMeta,
//                         VisitorCheck,
//                         AllLatestDiscussion: getAllLatestDiscussion,
//                         AllPopularDiscussion: getAllPopularDiscussion,
//                         AllDiscussions: getAllDiscussions,
//                         getCountries: getCountries,
//                         apiKey
//                     });
//                 })
//             })
//         })
//     }
// });

router.get('', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    let userId = '';
    if (currentUserData) {
        userId = currentUserData.user_id;
    }
    const apiKey = process.env.GEO_LOCATION_API_KEY
    console.log("apiKey", apiKey);
    console.log("currentUserData", currentUserData);

    const country_name = req.cookies.countryName
        || 'India';

    let country_code = req.cookies.countryCode
        || 'IN';
    console.log("country_namesland", country_name);
    console.log("country_codesland", country_code);

    if (country_code != 'UK' && country_code != 'JP') {
        country_code = 'US';
    }

    if(req.cookies.countryCode != 'All'){
        const new_country_code_query = `SELECT shortname FROM countries WHERE name="${country_name}"`;
        const new_country_code_val = await queryAsync(new_country_code_query);
        console.log("new_country_code_val", new_country_code_val);
        var new_country_code = new_country_code_val[0].shortname;
        console.log("new_country_code", new_country_code);
    
        const getbusinessquery = `SELECT * FROM users WHERE user_id= "${userId}"`;
        const getbusinessvalue = await queryAsync(getbusinessquery);
        if (getbusinessvalue.length > 0) {
            console.log("getbusinessvalue", getbusinessvalue);
            var user_status = getbusinessvalue[0].user_status;
            console.log("user_status", user_status);
            if (getbusinessvalue[0].user_status == "3") {
                res.redirect('/logout');
            }
        }
    
        var [allRatingTags, globalPageMeta, latestReviews, AllReviewTags, AllReviewVoting, PopularCategories, ReviewCount, UserCount, PositiveReviewsCompany, NegativeReviewsCompany, HomeMeta, VisitorCheck, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getCountries] = await Promise.all([
            comFunction.getAllRatingTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getlatestReviews(18, new_country_code),
            //comFunction2.getlatestReviews(18),
            comFunction2.getAllReviewTags(),
            comFunction2.getAllReviewVoting(),
            comFunction.getPopularCategories(new_country_code),
            //comFunction.getPopularCategories(),
            comFunction.getReviewCount(),
            comFunction.getUserCount(),
            // comFunction.getPositiveReviewsCompany(),
            // comFunction.getNegativeReviewsCompany(),
            comFunction.getPositiveReviewsCompany(new_country_code),
            comFunction.getNegativeReviewsCompany(new_country_code),
    
            //comFunction2.getPageMetaValues('home'),
            comFunction2.getPageMetaValue('home', country_code),
            comFunction.getVisitorCheck(requestIp.getClientIp(req)),
            comFunction2.getAllLatestDiscussion(20, country_name),
            //comFunction2.getAllLatestDiscussion(20),
            comFunction2.getAllPopularDiscussion(country_name),
            //comFunction2.getAllPopularDiscussion(),
            //comFunction2.getAllDiscussions(),
            //comFunction2.getAllDiscussion(),
            comFunction2.getAllDiscussion(country_name),
            comFunction.getCountries(),
        ]);
        var featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
        JOIN company ON featured_companies.company_id = company.ID 
        WHERE featured_companies.status = 'active' AND company.main_address_country = "${new_country_code}"
        ORDER BY featured_companies.ordering ASC `;
    }
    else{
        const getbusinessquery = `SELECT * FROM users WHERE user_id= "${userId}"`;
        const getbusinessvalue = await queryAsync(getbusinessquery);
        if (getbusinessvalue.length > 0) {
            console.log("getbusinessvalue", getbusinessvalue);
            var user_status = getbusinessvalue[0].user_status;
            console.log("user_status", user_status);
            if (getbusinessvalue[0].user_status == "3") {
                res.redirect('/logout');
            }
        }
    
        var [allRatingTags, globalPageMeta, latestReviews, AllReviewTags, AllReviewVoting, PopularCategories, ReviewCount, UserCount, PositiveReviewsCompany, NegativeReviewsCompany, HomeMeta, VisitorCheck, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getCountries] = await Promise.all([
            comFunction.getAllRatingTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getlatestReviews(18, ),
            //comFunction2.getlatestReviews(18),
            comFunction2.getAllReviewTags(),
            comFunction2.getAllReviewVoting(),
            comFunction.getPopularCategories(),
            //comFunction.getPopularCategories(),
            comFunction.getReviewCount(),
            comFunction.getUserCount(),
            // comFunction.getPositiveReviewsCompany(),
            // comFunction.getNegativeReviewsCompany(),
            comFunction.getPositiveReviewsCompany(),
            comFunction.getNegativeReviewsCompany(),
    
            //comFunction2.getPageMetaValues('home'),
            comFunction2.getPageMetaValue('home', country_code),
            comFunction.getVisitorCheck(requestIp.getClientIp(req)),
            comFunction2.getAllLatestDiscussion(20),
            //comFunction2.getAllLatestDiscussion(20),
            comFunction2.getAllPopularDiscussion(),
            //comFunction2.getAllPopularDiscussion(),
            //comFunction2.getAllDiscussions(),
            //comFunction2.getAllDiscussion(),
            comFunction2.getAllDiscussion(),
            comFunction.getCountries(),
        ]);
        var featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
        JOIN company ON featured_companies.company_id = company.ID 
        WHERE featured_companies.status = 'active'
        ORDER BY featured_companies.ordering ASC `;
    }


    const rangeTexts = {};

    //console.log("PopularCategories", PopularCategories);
    // console.log("getPositiveReviewsCompany",PositiveReviewsCompany);
    // console.log("getNegativeReviewsCompany",NegativeReviewsCompany);
    // console.log("getCountries", getCountries);
    //console.log("HomeMeta", HomeMeta);

    try {
        // Make API request to fetch blog posts
        const apiUrl = process.env.BLOG_API_ENDPOINT + '/home-blog';
        const response = await axios.get(apiUrl);
        const blogPosts = response.data;
        const restructuredResponse = {
                "status": blogPosts.status,
                "data": blogPosts.data.map(item => ({
                ...item,
            "title": decodeHTMLEntities(item.title)
        })),
                "success_message": blogPosts.success_message,
                "error_message": blogPosts.error_message
        };
        console.log('restructuredResponse', restructuredResponse);

        const sql = `SELECT * FROM page_info where secret_Key = 'home' AND country= "${country_code}"`;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const home = results[0];
            console.log("home", home);
            const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                //console.log("meta_values_array", meta_values_array);
                //console.log(allRatingTags);
                // const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
                //         JOIN company ON featured_companies.company_id = company.ID 
                //         WHERE featured_companies.status = 'active' 
                //         ORDER BY featured_companies.ordering ASC `;


                db.query(featured_sql, (featured_err, featured_result) => {
                    var featured_comps = featured_result;
                    console.log("featured_comps",featured_comps);
                    
                    // res.json( {
                    //     menu_active_id: 'landing',
                    //     page_title: home.title,
                    //     currentUserData: currentUserData,
                    //     homePosts: restructuredResponse.status === 'ok' ? restructuredResponse.data : [],
                    //     home,
                    //     meta_values_array,
                    //     featured_comps,
                    //     allRatingTags: allRatingTags,
                    //     AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
                    //     globalPageMeta:globalPageMeta,
                    //     latestReviews: latestReviews,
                    //     AllReviewTags: AllReviewTags,
                    //     AllReviewVoting:AllReviewVoting,
                    //     PopularCategories,
                    //     ReviewCount,
                    //     UserCount,
                    //     PositiveReviewsCompany,
                    //     NegativeReviewsCompany,
                    //     HomeMeta,
                    //     VisitorCheck
                    // });
                    res.render('front-end/landing', {
                        menu_active_id: 'landing',
                        page_title: home.title,
                        currentUserData: currentUserData,
                        homePosts: restructuredResponse.status === 'ok' ? restructuredResponse.data : [],
                        home,
                        meta_values_array,
                        featured_comps,
                        allRatingTags: allRatingTags,
                        AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
                        globalPageMeta: globalPageMeta,
                        latestReviews: latestReviews,
                        AllReviewTags: AllReviewTags,
                        AllReviewVoting: AllReviewVoting,
                        PopularCategories,
                        ReviewCount,
                        UserCount,
                        PositiveReviewsCompany,
                        NegativeReviewsCompany,
                        HomeMeta,
                        VisitorCheck,
                        AllLatestDiscussion: getAllLatestDiscussion,
                        AllPopularDiscussion: getAllPopularDiscussion,
                        AllDiscussions: getAllDiscussions,
                        getCountries: getCountries,
                        country_name: country_name,
                        countryname: country_code,
                        apiKey
                    });
                })

            })

        })
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        const sql = `SELECT * FROM page_info where secret_Key = 'home' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const home = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })

                const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.slug,company.logo,company.company_name FROM featured_companies 
                        JOIN company ON featured_companies.company_id = company.ID 
                        WHERE featured_companies.status = 'active' 
                        ORDER BY featured_companies.ordering ASC `;
                db.query(featured_sql, (featured_err, featured_result) => {
                    var featured_comps = featured_result;
                    console.log("featured_comps",featured_comps);
                    res.render('front-end/landing', {
                        menu_active_id: 'landing',
                        page_title: home.title,
                        currentUserData: currentUserData,
                        homePosts: [],
                        home,
                        meta_values_array,
                        featured_comps,
                        allRatingTags: allRatingTags,
                        AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
                        globalPageMeta: globalPageMeta,
                        latestReviews: latestReviews,
                        AllReviewTags: AllReviewTags,
                        AllReviewVoting: AllReviewVoting,
                        PositiveReviewsCompany,
                        NegativeReviewsCompany,
                        PopularCategories,
                        ReviewCount,
                        UserCount,
                        PositiveReviewsCompany,
                        NegativeReviewsCompany,
                        HomeMeta,
                        VisitorCheck,
                        AllLatestDiscussion: getAllLatestDiscussion,
                        AllPopularDiscussion: getAllPopularDiscussion,
                        AllDiscussions: getAllDiscussions,
                        getCountries: getCountries,
                        apiKey
                    });
                })
            })
        })
    }
});

router.get('/home/:getcountryhome', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    let userId = '';
    if (currentUserData) {
        userId = currentUserData.user_id;
    }
    const apiKey = process.env.GEO_LOCATION_API_KEY
    console.log("apiKey", apiKey);
    console.log("currentUserData", currentUserData);

    const country_name = req.cookies.countryName
        || 'India';

    let country_code = req.cookies.countryCode
       || 'IN';
    console.log("country_namesland", country_name);
    console.log("country_codesland", country_code);

    if (country_code != 'UK' && country_code != 'JP') {
        country_code = 'US';
    }

    if(req.cookies.countryCode != 'All'){
        console.log("notall");
        const new_country_code_query = `SELECT name FROM countries WHERE shortname="${country_code}"`;
        const new_country_code_val = await queryAsync(new_country_code_query);
        console.log("new_country_code_val", new_country_code_val);
        var new_country_name = new_country_code_val[0].name;
        console.log("new_country_name", new_country_name);
    
        const getbusinessquery = `SELECT * FROM users WHERE user_id= "${userId}"`;
        const getbusinessvalue = await queryAsync(getbusinessquery);
        if (getbusinessvalue.length > 0) {
            console.log("getbusinessvalue", getbusinessvalue);
            var user_status = getbusinessvalue[0].user_status;
            console.log("user_status", user_status);
            if (getbusinessvalue[0].user_status == "3") {
                res.redirect('/logout');
            }
        }
    
        var [allRatingTags, globalPageMeta, latestReviews, AllReviewTags, AllReviewVoting, PopularCategories, ReviewCount, UserCount, PositiveReviewsCompany, NegativeReviewsCompany, HomeMeta, VisitorCheck, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getCountries] = await Promise.all([
            comFunction.getAllRatingTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getlatestReviews(18, country_code),
            //comFunction2.getlatestReviews(18),
            comFunction2.getAllReviewTags(),
            comFunction2.getAllReviewVoting(),
            comFunction.getPopularCategories(country_code),
            //comFunction.getPopularCategories(),
            comFunction.getReviewCount(),
            comFunction.getUserCount(),
            // comFunction.getPositiveReviewsCompany(),
            // comFunction.getNegativeReviewsCompany(),
            comFunction.getPositiveReviewsCompany(country_code),
            comFunction.getNegativeReviewsCompany(country_code),
    
            //comFunction2.getPageMetaValues('home'),
            comFunction2.getPageMetaValue('home', country_code),
            comFunction.getVisitorCheck(requestIp.getClientIp(req)),
            comFunction2.getAllLatestDiscussion(20, new_country_name),
            //comFunction2.getAllLatestDiscussion(20),
            comFunction2.getAllPopularDiscussion(new_country_name),
            //comFunction2.getAllPopularDiscussion(),
            //comFunction2.getAllDiscussions(),
            //comFunction2.getAllDiscussion(),
            comFunction2.getAllDiscussion(new_country_name),
            comFunction.getCountries(),
        ]);
        var featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
        JOIN company ON featured_companies.company_id = company.ID 
        WHERE featured_companies.status = 'active' AND company.main_address_country = "${country_code}"
        ORDER BY featured_companies.ordering ASC `;
    }
    else{
        console.log("allll");
        const getbusinessquery = `SELECT * FROM users WHERE user_id= "${userId}"`;
        const getbusinessvalue = await queryAsync(getbusinessquery);
        if (getbusinessvalue.length > 0) {
            console.log("getbusinessvalue", getbusinessvalue);
            var user_status = getbusinessvalue[0].user_status;
            console.log("user_status", user_status);
            if (getbusinessvalue[0].user_status == "3") {
                res.redirect('/logout');
            }
        }
    
        var [allRatingTags, globalPageMeta, latestReviews, AllReviewTags, AllReviewVoting, PopularCategories, ReviewCount, UserCount, PositiveReviewsCompany, NegativeReviewsCompany, HomeMeta, VisitorCheck, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getCountries] = await Promise.all([
            comFunction.getAllRatingTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getlatestReviews(18),
            //comFunction2.getlatestReviews(18),
            comFunction2.getAllReviewTags(),
            comFunction2.getAllReviewVoting(),
            comFunction.getPopularCategories(),
            //comFunction.getPopularCategories(),
            comFunction.getReviewCount(),
            comFunction.getUserCount(),
            // comFunction.getPositiveReviewsCompany(),
            // comFunction.getNegativeReviewsCompany(),
            comFunction.getPositiveReviewsCompany(),
            comFunction.getNegativeReviewsCompany(),
    
            //comFunction2.getPageMetaValues('home'),
            comFunction2.getPageMetaValue('home', country_code),
            comFunction.getVisitorCheck(requestIp.getClientIp(req)),
            comFunction2.getAllLatestDiscussion(20, ),
            //comFunction2.getAllLatestDiscussion(20),
            comFunction2.getAllPopularDiscussion(),
            //comFunction2.getAllPopularDiscussion(),
            //comFunction2.getAllDiscussions(),
            //comFunction2.getAllDiscussion(),
            comFunction2.getAllDiscussion(),
            comFunction.getCountries(),
        ]);
        var featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
        JOIN company ON featured_companies.company_id = company.ID 
        WHERE featured_companies.status = 'active'
        ORDER BY featured_companies.ordering ASC `;
    }

    const rangeTexts = {};

    //console.log("PopularCategories", PopularCategories);
    // console.log("getPositiveReviewsCompany",PositiveReviewsCompany);
    // console.log("getNegativeReviewsCompany",NegativeReviewsCompany);
    // console.log("getCountries", getCountries);
    console.log("HomeMeta", HomeMeta);

    try {
        const apiUrl = process.env.BLOG_API_ENDPOINT + '/home-blog';
        const response = await axios.get(apiUrl);
        const blogPosts = response.data;
        const restructuredResponse = {
            "status": blogPosts.status,
            "data": blogPosts.data.map(item => ({
                ...item,
                "title": decodeHTMLEntities(item.title)
            })),
            "success_message": blogPosts.success_message,
            "error_message": blogPosts.error_message
        };
        //console.log('restructuredResponse', restructuredResponse);

        const sql = `SELECT * FROM page_info where secret_Key = 'home' AND country= "${country_code}"`;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const home = results[0];
            console.log("home", home);
            const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                console.log("meta_values_array", meta_values_array);
                //console.log(allRatingTags);
                // const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
                //         JOIN company ON featured_companies.company_id = company.ID 
                //         WHERE featured_companies.status = 'active' 
                //         ORDER BY featured_companies.ordering ASC `;

                db.query(featured_sql, (featured_err, featured_result) => {
                    var featured_comps = featured_result;
                    console.log("featured_comps",featured_comps);
                    res.render('front-end/us_landing', {
                        menu_active_id: 'landing',
                        page_title: home.title,
                        currentUserData: currentUserData,
                        homePosts: restructuredResponse.status === 'ok' ? restructuredResponse.data : [],
                        home,
                        meta_values_array,
                        featured_comps,
                        allRatingTags: allRatingTags,
                        AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
                        globalPageMeta: globalPageMeta,
                        latestReviews: latestReviews,
                        AllReviewTags: AllReviewTags,
                        AllReviewVoting: AllReviewVoting,
                        PopularCategories,
                        ReviewCount,
                        UserCount,
                        PositiveReviewsCompany,
                        NegativeReviewsCompany,
                        HomeMeta,
                        VisitorCheck,
                        AllLatestDiscussion: getAllLatestDiscussion,
                        AllPopularDiscussion: getAllPopularDiscussion,
                        AllDiscussions: getAllDiscussions,
                        getCountries: getCountries,
                        country_name: country_name,
                        countryname: country_code,
                        apiKey
                    });
                })

            })

        })
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        const sql = `SELECT * FROM page_info where secret_Key = 'home' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const home = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })

                var featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
                JOIN company ON featured_companies.company_id = company.ID 
                WHERE featured_companies.status = 'active'
                ORDER BY featured_companies.ordering ASC `;
                    
                db.query(featured_sql, (featured_err, featured_result) => {
                    var featured_comps = featured_result;
                    console.log("featured_comps",featured_comps);
                    res.render('front-end/us_landing', {
                        menu_active_id: 'landing',
                        page_title: home.title,
                        currentUserData: currentUserData,
                        homePosts: [],
                        home,
                        meta_values_array,
                        featured_comps,
                        allRatingTags: allRatingTags,
                        AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
                        globalPageMeta: globalPageMeta,
                        latestReviews: latestReviews,
                        AllReviewTags: AllReviewTags,
                        AllReviewVoting: AllReviewVoting,
                        PositiveReviewsCompany,
                        NegativeReviewsCompany,
                        PopularCategories,
                        ReviewCount,
                        UserCount,
                        PositiveReviewsCompany,
                        NegativeReviewsCompany,
                        HomeMeta,
                        VisitorCheck,
                        AllLatestDiscussion: getAllLatestDiscussion,
                        AllPopularDiscussion: getAllPopularDiscussion,
                        AllDiscussions: getAllDiscussions,
                        getCountries: getCountries,
                        apiKey
                    });
                })
            })
        })
    }
});

// router.get('/home/:getcountryhome', checkCookieValue, async (req, res) => {
//     let currentUserData = JSON.parse(req.userData);
//     let userId = '';
//     if (currentUserData) {
//         userId = currentUserData.user_id;
//     }
//     let getcountryhome = req.params.getcountryhome;
//     console.log("getcountryhome",getcountryhome);

//     const apiKey = process.env.GEO_LOCATION_API_KEY
//     console.log("apiKey",apiKey);

//     const country_name = req.cookies.countryName
//      || 'India';
//     let country_code = req.cookies.countryCode 
//     || 'IN';
//     console.log("country_namesland", country_name);
//     console.log("country_codesland", country_code);


//     if (getcountryhome != 'UK' && getcountryhome != 'JP') {
//         getcountryhome = 'US';
//     }

//     const [allRatingTags, globalPageMeta, latestReviews, AllReviewTags, AllReviewVoting, PopularCategories, ReviewCount, UserCount, PositiveReviewsCompany, NegativeReviewsCompany, HomeMeta, VisitorCheck, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getCountries] = await Promise.all([
//         comFunction.getAllRatingTags(),
//         comFunction2.getPageMetaValues('global'),
//         //comFunction2.getlatestReviews(18, country_name),
//         comFunction2.getlatestReviews(18),
//         comFunction2.getAllReviewTags(),
//         comFunction2.getAllReviewVoting(),
//         //comFunction.getPopularCategories(country_code),
//         comFunction.getPopularCategories(),
//         comFunction.getReviewCount(),
//         comFunction.getUserCount(),
//         comFunction.getPositiveReviewsCompany(),
//         comFunction.getNegativeReviewsCompany(),
//         // comFunction.getPositiveReviewsCompany(country_code),
//         // comFunction.getNegativeReviewsCompany(country_code),

//         //comFunction2.getPageMetaValues('home'),
//         comFunction2.getPageMetaValue('home',getcountryhome),
//         comFunction.getVisitorCheck(requestIp.getClientIp(req)),
//         //comFunction2.getAllLatestDiscussion(20, country_name),
//         comFunction2.getAllLatestDiscussion(20),
//         //comFunction2.getAllPopularDiscussion(country_name),
//         comFunction2.getAllPopularDiscussion(),
//         //comFunction2.getAllDiscussions(),
//         comFunction2.getAllDiscussion(),
//         //comFunction2.getAllDiscussion(country_name),
//         comFunction.getCountries(),
//     ]);
//     const rangeTexts = {};

//     console.log("PopularCategories", PopularCategories);
//     // console.log("getPositiveReviewsCompany",PositiveReviewsCompany);
//     // console.log("getNegativeReviewsCompany",NegativeReviewsCompany);
//     // console.log("getCountries", getCountries);
//     console.log("HomeMeta",HomeMeta);

//     try {
//         // Make API request to fetch blog posts
//         const apiUrl = process.env.BLOG_API_ENDPOINT + '/home-blog';
//         const response = await axios.get(apiUrl);
//         const blogPosts = response.data;
//         const restructuredResponse = {
//             "status": blogPosts.status,
//             "data": blogPosts.data.map(item => ({
//                 ...item,
//                 "title": decodeHTMLEntities(item.title)
//             })),
//             "success_message": blogPosts.success_message,
//             "error_message": blogPosts.error_message
//         };
//         //console.log('restructuredResponse', restructuredResponse);

//         const sql = `SELECT * FROM page_info where secret_Key = 'home' AND country= "${getcountryhome}"`;
//         db.query(sql, (err, results, fields) => {
//             if (err) throw err;
//             const home = results[0];
//             const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
//             db.query(meta_sql, async (meta_err, _meta_result) => {
//                 if (meta_err) throw meta_err;

//                 const meta_values = _meta_result;
//                 let meta_values_array = {};
//                 await meta_values.forEach((item) => {
//                     meta_values_array[item.page_meta_key] = item.page_meta_value;
//                 })
//                 //console.log("meta_values_array",meta_values_array);
//                 console.log("allRatingTags",allRatingTags);
//                 const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
//                         JOIN company ON featured_companies.company_id = company.ID 
//                         WHERE featured_companies.status = 'active' 
//                         ORDER BY featured_companies.ordering ASC `;

//                 // const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
//                 //         JOIN company ON featured_companies.company_id = company.ID 
//                 //         WHERE featured_companies.status = 'active' AND company.main_address_country = "${country_code}"
//                 //         ORDER BY featured_companies.ordering ASC `;
//                 db.query(featured_sql, (featured_err, featured_result) => {
//                     var featured_comps = featured_result;
//                     res.render('front-end/us_landing', {
//                         menu_active_id: 'landing',
//                         page_title: home.title,
//                         currentUserData: currentUserData,
//                         homePosts: restructuredResponse.status === 'ok' ? restructuredResponse.data : [],
//                         home,
//                         meta_values_array,
//                         featured_comps,
//                         allRatingTags: allRatingTags,
//                         AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
//                         globalPageMeta: globalPageMeta,
//                         latestReviews: latestReviews,
//                         AllReviewTags: AllReviewTags,
//                         AllReviewVoting: AllReviewVoting,
//                         PopularCategories,
//                         ReviewCount,
//                         UserCount,
//                         PositiveReviewsCompany,
//                         NegativeReviewsCompany,
//                         HomeMeta,
//                         VisitorCheck,
//                         AllLatestDiscussion: getAllLatestDiscussion,
//                         AllPopularDiscussion: getAllPopularDiscussion,
//                         AllDiscussions: getAllDiscussions,
//                         getCountries: getCountries,
//                         country_name: country_name,
//                         countryname: country_code,
//                         apiKey
//                     });
//                 })

//             })

//         })
//     } catch (error) {
//         console.error('Error fetching blog posts:', error);
//         const sql = `SELECT * FROM page_info where secret_Key = 'home' `;
//         db.query(sql, (err, results, fields) => {
//             if (err) throw err;
//             const home = results[0];
//             const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
//             db.query(meta_sql, async (meta_err, _meta_result) => {
//                 if (meta_err) throw meta_err;

//                 const meta_values = _meta_result;
//                 let meta_values_array = {};
//                 await meta_values.forEach((item) => {
//                     meta_values_array[item.page_meta_key] = item.page_meta_value;
//                 })

//                 const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.company_name FROM featured_companies 
//                         JOIN company ON featured_companies.company_id = company.ID 
//                         WHERE featured_companies.status = 'active' 
//                         ORDER BY featured_companies.ordering ASC `;
//                 db.query(featured_sql, (featured_err, featured_result) => {
//                     var featured_comps = featured_result;
//                     res.render('front-end/us_landing', {
//                         menu_active_id: 'landing',
//                         page_title: home.title,
//                         currentUserData: currentUserData,
//                         homePosts: [],
//                         home,
//                         meta_values_array,
//                         featured_comps,
//                         allRatingTags: allRatingTags,
//                         AddressapiKey: process.env.ADDRESS_GOOGLE_API_Key,
//                         globalPageMeta: globalPageMeta,
//                         latestReviews: latestReviews,
//                         AllReviewTags: AllReviewTags,
//                         AllReviewVoting: AllReviewVoting,
//                         PositiveReviewsCompany,
//                         NegativeReviewsCompany,
//                         PopularCategories,
//                         ReviewCount,
//                         UserCount,
//                         PositiveReviewsCompany,
//                         NegativeReviewsCompany,
//                         HomeMeta,
//                         VisitorCheck,
//                         AllLatestDiscussion: getAllLatestDiscussion,
//                         AllPopularDiscussion: getAllPopularDiscussion,
//                         AllDiscussions: getAllDiscussions,
//                         getCountries: getCountries,
//                         apiKey
//                     });
//                 })
//             })
//         })
//     }
// });

router.post('/setCountry', (req, res) => {
    const { countryName, countryCode } = req.body;

    // Save country information in session or wherever needed
    req.session.countryName = countryName;
    req.session.countryCode = countryCode;

    res.status(200).send('Country information saved successfully.');
});

//view Contact Us Page
router.get('/contact-us', checkCookieValue, async (req, res) => {
    //resp.sendFile(`${publicPath}/index.html`)
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    const sql = `SELECT * FROM contacts`;
    db.query(sql, (err, results, fields) => {
        if (err) throw err;
        const social_sql = `SELECT * FROM socials`;
        db.query(social_sql, (error, social_results, fields) => {
            //console.log(results[0], social_results[0]);
            const contacts = results[0];
            const page_title = results[0].title;
            const socials = social_results[0];

            const contact_address_sql = `SELECT * FROM contact_address`;
            db.query(contact_address_sql, (errors, address_results, fieldss) => {
                const address = address_results[0];
                console.log("address", address);
                console.log("socials", socials);


                res.render('front-end/contact', {
                    menu_active_id: 'contact', page_title: page_title, currentUserData, contacts, socials, address,
                    globalPageMeta: globalPageMeta
                });

            })
        })
    })

});

router.get('/contact-us/:getcountryname', checkCookieValue, async (req, res) => {
    //resp.sendFile(`${publicPath}/index.html`)
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    const getcountryname = req.params.getcountryname;
    console.log("getcountryname", getcountryname);

    //     const country_name = req.cookies.countryName
    //     || 'India';
    //    let country_code = req.cookies.countryCode 
    //    || 'IN';
    //    console.log("country_namesland", country_name);
    //    console.log("country_codesland", country_code);

    //    if (country_code != 'UK' && country_code != 'JP') {
    //        country_code = 'US';
    //    }

    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    const sql = `SELECT * FROM contacts WHERE country="${getcountryname}"`;
    db.query(sql, (err, results, fields) => {
        if (err) throw err;
        const social_sql = `SELECT * FROM socials`;
        db.query(social_sql, (error, social_results, fields) => {
            //console.log(results[0], social_results[0]);
            const contacts = results[0];
            const page_title = results[0].title;
            const socials = social_results[0];

            const contact_address_sql = `SELECT * FROM contact_address`;
            db.query(contact_address_sql, (errors, address_results, fieldss) => {
                const address = address_results[0];
                console.log("address", address);
                console.log("socials", socials);


                res.render('front-end/contact', {
                    menu_active_id: 'contact', page_title: page_title, currentUserData, contacts, socials, address,
                    globalPageMeta: globalPageMeta
                });

            })
        })
    })

});

//View About us Page
router.get('/about-us', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    try {
        let country_name = req.cookies.countryName
            || 'India';
        let country_code = req.cookies.countryCode
            || 'IN';
        console.log("country_namesland", country_name);
        console.log("country_codesland", country_code);

        if (country_code != 'UK' && country_code != 'JP') {
            country_code = 'US';
        }

        let [PageInfo, PageMetaValues, globalPageMeta] = await Promise.all([
            comFunction2.getPageInfo('about'),
            comFunction2.getPageMetaValue('about', country_code),
            comFunction2.getPageMetaValues('global'),
        ]);
        //console.log(globalPageMeta)
        res.render('front-end/about', {
            menu_active_id: 'about',
            page_title: PageInfo.title,
            currentUserData: currentUserData,
            common: PageInfo,
            meta_values_array: PageMetaValues,
            globalPageMeta: globalPageMeta
        });
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.render('front-end/about', {
            menu_active_id: 'about',
            page_title: common.title,
            page_title: PageInfo.title,
            currentUserData: currentUserData,
            common,
            meta_values_array
        });
        // res.status(500).send('An error occurred');
    }
    //res.render('front-end/about', { menu_active_id: 'about', page_title: 'About Us', currentUserData });
});

router.get('/about-us/:getcountryname', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
   // console.log("apiKey", apiKey);

    let getcountryname = req.params.getcountryname;
    console.log("getcountryname", getcountryname);

    try {
        let country_name = req.cookies.countryName
        //|| 'India';
        let country_code = req.cookies.countryCode
            //|| 'IN';
        console.log("country_namesland", country_name);
        console.log("country_codesland", country_code);

        if (getcountryname != 'UK' && getcountryname != 'JP' && getcountryname != 'All') {
            getcountryname = 'US';
        }
        if(getcountryname == 'All'){  
            console.log("fggfgfh");        
            var [PageInfo, PageMetaValues, globalPageMeta] = await Promise.all([
                comFunction2.getPageInfo('about'),
                comFunction2.getPageMetaValue('about', 'US'),
                comFunction2.getPageMetaValues('global'),
            ]);
        } else{
            var [PageInfo, PageMetaValues, globalPageMeta] = await Promise.all([
                comFunction2.getPageInfo('about'),
                comFunction2.getPageMetaValue('about', getcountryname),
                comFunction2.getPageMetaValues('global'),
            ]);
        }

        //console.log(globalPageMeta)
        res.render('front-end/abouts', {
            menu_active_id: 'about',
            page_title: PageInfo.title,
            currentUserData: currentUserData,
            common: PageInfo,
            meta_values_array: PageMetaValues,
            globalPageMeta: globalPageMeta
        });
    } catch (error) {
        console.error('Error fetching blog posts:', error);
    }
    //res.render('front-end/about', { menu_active_id: 'about', page_title: 'About Us', currentUserData });
});

router.get('/review', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        console.log(currentUserData);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        //console.log("apiKey", apiKey);

        const country_name = req.cookies.countryName || 'India';
        const country_code = req.cookies.countryCode || 'IN';


        console.log("country_namesreview", country_name);
        console.log("country_codesreview", country_code);

        let new_country_code;

        if(req.cookies.countryCode != 'All'){
            const new_country_code_query = `SELECT shortname FROM countries WHERE name="${country_name}"`;
            const new_country_code_val = await queryAsync(new_country_code_query);
            console.log("new_country_code_val", new_country_code_val);
            new_country_code = new_country_code_val[0].shortname;
            console.log("new_country_code", new_country_code);
            var [latestReviews, AllReviews, AllTrendingReviews, AllReviewTags, allRatingTags, globalPageMeta, homePageMeta, AllReviewVoting, getCountries] = await Promise.all([
                comFunction2.getlatestReviews(20,new_country_code),
                comFunction2.getAllReviews(new_country_code),
                comFunction2.getAllTrendingReviews(new_country_code),
                //comFunction2.getlatestReviews(20),
                //comFunction2.getAllReviews(),
                //comFunction2.getAllTrendingReviews(),
                comFunction2.getAllReviewTags(),
                comFunction.getAllRatingTags(),
                comFunction2.getPageMetaValues('global'),
                comFunction2.getPageMetaValues('home'),
                comFunction2.getAllReviewVoting(),
                comFunction.getCountries(),
    
            ]);
        } else {
            var [latestReviews, AllReviews, AllTrendingReviews, AllReviewTags, allRatingTags, globalPageMeta, homePageMeta, AllReviewVoting, getCountries] = await Promise.all([
                comFunction2.getlatestReviews(20),
                comFunction2.getAllReviews(),
                comFunction2.getAllTrendingReviews(),
                //comFunction2.getlatestReviews(20),
                //comFunction2.getAllReviews(),
                //comFunction2.getAllTrendingReviews(),
                comFunction2.getAllReviewTags(),
                comFunction.getAllRatingTags(),
                comFunction2.getPageMetaValues('global'),
                comFunction2.getPageMetaValues('home'),
                comFunction2.getAllReviewVoting(),
                comFunction.getCountries(),
    
            ]);
        }
        const api_key = process.env.GEO_LOCATION_API_KEY
        //console.log("getCountries",getCountries);
       // console.log("AllTrendingReviews", AllTrendingReviews);
        // res.json({
        //     menu_active_id: 'review',
        //     page_title: 'Customer Reviews',
        //     currentUserData,
        //     latestReviews: latestReviews,
        //     AllReviews: AllReviews,
        //     allRatingTags: allRatingTags,
        //     AllReviewTags: AllReviewTags,
        //     AllTrendingReviews: AllTrendingReviews,
        //     globalPageMeta:globalPageMeta,
        //     homePageMeta:homePageMeta
        // });
        res.render('front-end/review', {
            menu_active_id: 'review',
            page_title: 'Customer Reviews',
            currentUserData,
            latestReviews: latestReviews,
            AllReviews: AllReviews,
            allRatingTags: allRatingTags,
            AllReviewTags: AllReviewTags,
            AllTrendingReviews: AllTrendingReviews,
            globalPageMeta: globalPageMeta,
            homePageMeta: homePageMeta,
            AllReviewVoting: AllReviewVoting,
            getCountries: getCountries,
            // ip_address: ipAddress,
            country_name: country_name,
            countryname: country_code,
            apiKey: apiKey
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.get('/review/:getcountryname', checkCookieValue, async (req, res) => {
    try {
        var getcountryname = req.params.getcountryname;
        let currentUserData = JSON.parse(req.userData);
        console.log(currentUserData);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);

        // const ipAddress = requestIp.getClientIp(req); 
        // const ipAddress = '45.64.221.211';
        // console.log('Client IP Address:', ipAddress);

        const country_name = req.cookies.countryName || 'India';
        const country_code = req.cookies.countryCode || 'IN';


        console.log("country_namesreview", country_name);
        console.log("country_codesreview", country_code);


        if (req.cookies.countryCode !== 'All') {
            const new_country_code_query = `SELECT shortname FROM countries WHERE name="${country_name}"`;
            const new_country_code_val = await queryAsync(new_country_code_query);
            console.log("new_country_code_val", new_country_code_val);
            var new_country_code = new_country_code_val[0].shortname;
            console.log("new_country_code", new_country_code);
            var [latestReviews, AllReviews, AllTrendingReviews, AllReviewTags, allRatingTags, globalPageMeta, homePageMeta, AllReviewVoting, getCountries] = await Promise.all([
                comFunction2.getlatestReviews(20,country_code),
                comFunction2.getAllReviews(country_code),
                comFunction2.getAllTrendingReviews(country_code),
                //comFunction2.getlatestReviews(20),
                //comFunction2.getAllReviews(),
                //comFunction2.getAllTrendingReviews(),
                comFunction2.getAllReviewTags(),
                comFunction.getAllRatingTags(),
                comFunction2.getPageMetaValues('global'),
                comFunction2.getPageMetaValues('home'),
                comFunction2.getAllReviewVoting(),
                comFunction.getCountries(),
    
            ]);
        }
        else{
            var [latestReviews, AllReviews, AllTrendingReviews, AllReviewTags, allRatingTags, globalPageMeta, homePageMeta, AllReviewVoting, getCountries] = await Promise.all([
                comFunction2.getlatestReviews(20),
                comFunction2.getAllReviews(),
                comFunction2.getAllTrendingReviews(),
                //comFunction2.getlatestReviews(20),
                //comFunction2.getAllReviews(),
                //comFunction2.getAllTrendingReviews(),
                comFunction2.getAllReviewTags(),
                comFunction.getAllRatingTags(),
                comFunction2.getPageMetaValues('global'),
                comFunction2.getPageMetaValues('home'),
                comFunction2.getAllReviewVoting(),
                comFunction.getCountries(),
    
            ]);
        }



        const api_key = process.env.GEO_LOCATION_API_KEY





        //console.log("getCountries",getCountries);
       // console.log("AllTrendingReviews", AllTrendingReviews);
        // res.json({
        //     menu_active_id: 'review',
        //     page_title: 'Customer Reviews',
        //     currentUserData,
        //     latestReviews: latestReviews,
        //     AllReviews: AllReviews,
        //     allRatingTags: allRatingTags,
        //     AllReviewTags: AllReviewTags,
        //     AllTrendingReviews: AllTrendingReviews,
        //     globalPageMeta:globalPageMeta,
        //     homePageMeta:homePageMeta
        // });
        res.render('front-end/country-review', {
            menu_active_id: 'review',
            page_title: 'Customer Reviews',
            currentUserData,
            latestReviews: latestReviews,
            AllReviews: AllReviews,
            allRatingTags: allRatingTags,
            AllReviewTags: AllReviewTags,
            AllTrendingReviews: AllTrendingReviews,
            globalPageMeta: globalPageMeta,
            homePageMeta: homePageMeta,
            AllReviewVoting: AllReviewVoting,
            getCountries: getCountries,
            // ip_address: ipAddress,
            country_name: country_name,
            countryname: country_code,
            apiKey: apiKey
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.get('/get-country', async (req, res) => {
    try {
        let country_name = req.cookies.countryName || 'India';
        let country_code = req.cookies.countryCode || 'IN';

        console.log("country_names", country_name);
        console.log("country_codes", country_code);

        res.json({
            countryName: country_name,
            countryCode: country_code
        });
    } catch (err) {
        console.error('Error retrieving country information:', err);
        res.status(500).send('An error occurred');
    }
});

router.get('/getStates', async (req, res) => {
    try {
        const country = req.query.country;
        console.log("countryname", country);

        const getcountryquery = `SELECT * FROM countries WHERE shortname = "${country}" `;
        const getcountryval = await queryAsync(getcountryquery);

        var coun = getcountryval[0].id;
        console.log("getcountryval", getcountryval[0].id);

        const states = await comFunction.getStatesByCountryID(coun);
        console.log("States:", states);

        return res.json(states);
    } catch (error) {
        console.error("error", error);
        res.status(500).send('An error occurred');
    }
});

router.get('/getStatesbycountryid', async (req, res) => {
    try {
        const country = req.query.country;
        console.log("countryid", country);

        // const getcountryquery = `SELECT * FROM countries WHERE id = "${country}" `;
        // const getcountryval = await queryAsync(getcountryquery);

        // var coun= getcountryval[0].id;
        // console.log("getcountryval",getcountryval[0].id);

        const states = await comFunction.getStatesByCountryID(country);
        //console.log("States:", states);

        return res.json(states);
    } catch (error) {
        console.error("error", error);
        res.status(500).send('An error occurred');
    }
});

router.get('/faq', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        const apiKey = process.env.GEO_LOCATION_API_KEY;

        let country_name = req.cookies.countryName
            || 'India';
        let country_code = req.cookies.countryCode
            || 'IN';
        console.log("country_namesfaq", country_name);
        console.log("country_codesfaq", country_code);

        if (country_code != 'UK' && country_code != 'JP' && country_code != 'All') {
            country_code = 'US';
        }

        if(country_code != 'All'){
            var [faqPageData, faqCategoriesData, faqItemsData, globalPageMeta] = await Promise.all([
                comFunction2.getFaqPages(country_code),
                comFunction2.getFaqCategories(country_code),
                comFunction2.getFaqItems(country_code),
                comFunction2.getPageMetaValues('global'),
            ]);
    
        } else{
            var [faqPageData, faqCategoriesData, faqItemsData, globalPageMeta] = await Promise.all([
                comFunction2.getFaqPages('US'),
                comFunction2.getFaqCategories('US'),
                comFunction2.getFaqItems('US'),
                comFunction2.getPageMetaValues('global'),
            ]);
        }

        //console.log("apiKey", apiKey);
        console.log("faqPageData", faqPageData);
        console.log("faqPageDataabanner_img_1", faqPageData[0].banner_img_1);
        // Render the 'add-page' EJS view and pass the data
        res.render('front-end/faq', {
            menu_active_id: 'faq',
            page_title: 'FAQ ',
            currentUserData,
            faqPageData,
            faqCategoriesData,
            faqItemsData,
            globalPageMeta: globalPageMeta
        });
        // res.json({
        //     menu_active_id: 'faq',
        //     page_title: 'FAQ ',
        //     currentUserData,
        //     faqPageData,
        //     faqCategoriesData,
        //     faqItemsData,
        //     globalPageMeta: globalPageMeta
        // });
    } catch (error) {
        console.error("error",error);
        res.status(500).send('An error occurred');
    }

    //res.render('front-end/faq', { menu_active_id: 'faq', page_title: 'FAQ', currentUserData });
});

router.get('/faq/:getcountryname', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        // const faqPageData = await comFunction2.getFaqPage();
        // const faqCategoriesData = await comFunction2.getFaqCategories();
        // const faqItemsData = await comFunction2.getFaqItems();
        const getcountryname = req.params.getcountryname;
        console.log("getcountrynamefaq", getcountryname);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);

        let country_name = req.cookies.countryName
        || 'India';
        let country_code = req.cookies.countryCode
            || 'IN';
        console.log("country_namesfaq", country_name);
        console.log("country_codesfaq", country_code);

        if (country_code != 'UK' && country_code != 'JP' && country_code != 'All') {
            country_code = 'US';
        }

        if(country_code != 'All'){
            var [faqPageData, faqCategoriesData, faqItemsData, globalPageMeta] = await Promise.all([
                comFunction2.getFaqPages(country_code),
                comFunction2.getFaqCategories(country_code),
                comFunction2.getFaqItems(country_code),
                comFunction2.getPageMetaValues('global'),
            ]);
    
        } else{
            var [faqPageData, faqCategoriesData, faqItemsData, globalPageMeta] = await Promise.all([
                comFunction2.getFaqPages('US'),
                comFunction2.getFaqCategories('US'),
                comFunction2.getFaqItems('US'),
                comFunction2.getPageMetaValues('global'),
            ]);
        }
        console.log("faqPageDataa", faqPageData);
        console.log("faqPageDataabanner_img_1", faqPageData.banner_img_1);
        res.render('front-end/faq', {
            menu_active_id: 'faq',
            page_title: 'FAQ ',
            currentUserData,
            faqPageData,
            faqCategoriesData,
            faqItemsData,
            globalPageMeta: globalPageMeta
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
});

router.get('/staging-business', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        console.log("currentUserData", currentUserData);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);

        if (currentUserData) {
            var user_id = currentUserData.user_id;
            console.log("user_id", user_id);
            var encryptedEmail = await comFunction2.encryptEmail(currentUserData.email);
            console.log("encryptedEmail", encryptedEmail);
        }



        const getbusinessquery = `SELECT * FROM users WHERE user_id= "${user_id}"`;
        const getbusinessvalue = await queryAsync(getbusinessquery);
        console.log("getbusinessvalue", getbusinessvalue);
        if (getbusinessvalue.length > 0) {
            console.log("getbusinessvalue", getbusinessvalue);
            var user_status = getbusinessvalue[0].user_status;
            console.log("user_status", user_status);
            if (getbusinessvalue[0].user_status == "3") {
                res.redirect('/logout');
            }
        }

        const api_key = process.env.GEO_LOCATION_API_KEY;
        let country_name = req.cookies.countryName || 'India';
        let country_code = req.cookies.countryCode || 'IN';
        console.log("country_names", country_name);
        console.log("country_codes", country_code);

        if (country_code != 'UK' && country_code != 'JP') {
            country_code = 'US';
        }

        const [globalPageMeta, getplans, getSubscribedUsers] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getplans(country_name),
            comFunction2.getSubscribedUsers(user_id)
        ]);
        console.log("getplans", getplans);
        console.log("getSubscribedUserssss", getSubscribedUsers);

        const sql = `SELECT * FROM page_info where secret_Key = 'business' AND country = "${country_code}"`;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                const UpcomingBusinessFeature = await comFunction2.getUpcomingBusinessFeature();
                const BusinessFeature = await comFunction2.getBusinessFeature();
                //console.log(meta_values_array);
                res.render('front-end/staging-business', {
                    menu_active_id: 'business',
                    page_title: common.title,
                    currentUserData,
                    common,
                    meta_values_array,
                    UpcomingBusinessFeature,
                    BusinessFeature,
                    globalPageMeta: globalPageMeta,
                    getplans: getplans,
                    country_name: country_name,
                    getSubscribedUsers: getSubscribedUsers,
                    encryptedEmail: encryptedEmail
                });
            })

        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/staging-business', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        console.log("currentUserData", currentUserData);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);

        if (currentUserData) {
            var user_id = currentUserData.user_id;
            console.log("user_id", user_id);
            var encryptedEmail = await comFunction2.encryptEmail(currentUserData.email);
            console.log("encryptedEmail", encryptedEmail);
        }



        const getbusinessquery = `SELECT * FROM users WHERE user_id= "${user_id}"`;
        const getbusinessvalue = await queryAsync(getbusinessquery);
        console.log("getbusinessvalue", getbusinessvalue);
        if (getbusinessvalue.length > 0) {
            console.log("getbusinessvalue", getbusinessvalue);
            var user_status = getbusinessvalue[0].user_status;
            console.log("user_status", user_status);
            if (getbusinessvalue[0].user_status == "3") {
                res.redirect('/logout');
            }
        }

        const api_key = process.env.GEO_LOCATION_API_KEY;
        let country_name = req.cookies.countryName || 'India';
        let country_code = req.cookies.countryCode || 'IN';
        console.log("country_names", country_name);
        console.log("country_codes", country_code);

        if (country_code != 'UK' && country_code != 'JP') {
            country_code = 'US';
        }

        const [globalPageMeta, getplans, getSubscribedUsers] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getplans(country_name),
            comFunction2.getSubscribedUsers(user_id)
        ]);
        console.log("getplans", getplans);
        console.log("getSubscribedUserssss", getSubscribedUsers);

        const sql = `SELECT * FROM page_info where secret_Key = 'business' AND country = "${country_code}"`;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                const UpcomingBusinessFeature = await comFunction2.getUpcomingBusinessFeature();
                const BusinessFeature = await comFunction2.getBusinessFeature();
                //console.log(meta_values_array);
                res.render('front-end/staging-business', {
                    menu_active_id: 'business',
                    page_title: common.title,
                    currentUserData,
                    common,
                    meta_values_array,
                    UpcomingBusinessFeature,
                    BusinessFeature,
                    globalPageMeta: globalPageMeta,
                    getplans: getplans,
                    country_name: country_name,
                    getSubscribedUsers: getSubscribedUsers,
                    encryptedEmail: encryptedEmail
                });
            })

        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/checkSubscriptionStatus/:subscriptionId', async (req, res) => {
    const { subscriptionId } = req.params.subscriptionId; // Extract subscriptionId from route parameters

    if (!subscriptionId) {
        return res.status(400).send('Subscription ID is required');
    }

    const apiUrl = `https://api.razorpay.com/v1/subscriptions/${subscriptionId}`;

    try {
        // Fetch subscription details using Razorpay SDK
        const subscriptionDetails = await razorpay.subscriptions.fetch(subscriptionId);
        console.log('Subscription details:', subscriptionDetails);

        const status = subscriptionDetails.status;

        if (status === 'active') {
            res.status(200).json({ status: 'active' });
        } else {
            res.status(200).json({ status: 'inactive' });
        }
    } catch (err) {
        console.error('Error fetching subscription status:', err);
        res.status(500).send('An error occurred while checking subscription status');
    }
});




router.get('/business', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        console.log("currentUserData", currentUserData);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);

        if (currentUserData) {
            var user_id = currentUserData.user_id;
            console.log("user_id", user_id);
            var encryptedEmail = await comFunction2.encryptEmail(currentUserData.email);
            console.log("encryptedEmail", encryptedEmail);
        }

        const getbusinessquery = `SELECT * FROM users WHERE user_id= "${user_id}"`;
        const getbusinessvalue = await queryAsync(getbusinessquery);
        console.log("getbusinessvalue", getbusinessvalue);
        if (getbusinessvalue.length > 0) {
            console.log("getbusinessvalue", getbusinessvalue);
            var user_status = getbusinessvalue[0].user_status;
            console.log("user_status", user_status);
        }

        const api_key = process.env.GEO_LOCATION_API_KEY;
        let country_name = req.cookies.countryName || 'India';
        let country_code = req.cookies.countryCode || 'IN';
        console.log("country_names", country_name);
        console.log("country_codes", country_code);

        if (country_code != 'UK' && country_code != 'JP') {
            country_code = 'US';
        }
        if(country_name == 'All'){
            country_name= 'India'
        }

        console.log("country_code",country_code);


        const [globalPageMeta, getplans, getSubscribedUsers] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getplans(country_name),
            comFunction2.getSubscribedUsers(user_id)
        ]);
        console.log("getplans", getplans);
        console.log("getSubscribedUserssss", getSubscribedUsers);

        const sql = `SELECT * FROM page_info where secret_Key = 'business' AND country = "${country_code}"`;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                const UpcomingBusinessFeature = await comFunction2.getUpcomingBusinessFeature();
                const BusinessFeature = await comFunction2.getBusinessFeature();
                //console.log(meta_values_array);
                res.render('front-end/business', {
                    menu_active_id: 'business',
                    page_title: common.title,
                    currentUserData,
                    common,
                    meta_values_array,
                    UpcomingBusinessFeature,
                    BusinessFeature,
                    globalPageMeta: globalPageMeta,
                    getplans: getplans,
                    country_name: country_name,
                    getSubscribedUsers: getSubscribedUsers,
                    encryptedEmail: encryptedEmail
                });
            })

        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/business/:getcountryname', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        console.log("currentUserData", currentUserData);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);
        let getcountryname = req.params.getcountryname;
        console.log("getcountrynamebusiness", getcountryname);

        if (currentUserData) {
            var user_id = currentUserData.user_id;
            console.log("user_id", user_id);
            var encryptedEmail = await comFunction2.encryptEmail(currentUserData.email);
            console.log("encryptedEmail", encryptedEmail);
        }
        const api_key = process.env.GEO_LOCATION_API_KEY;
        let country_name = req.cookies.countryName || 'India';
        let country_code = req.cookies.countryCode || 'IN';
        console.log("country_names", country_name);
        console.log("country_codes", country_code);

        // if (country_code != 'UK' && country_code != 'JP' && country_code!= 'All') {
        //     country_code = 'US';
        // }
        // if(country_name == 'All'){
        //     country_name= 'US'
        // }

            if (getcountryname != 'UK' && getcountryname != 'JP' && getcountryname != 'All') {
                getcountryname = 'US';
            }
            if(getcountryname == 'All'){  
                console.log("fggfgfh");        
                var [globalPageMeta, getplans, getSubscribedUsers] = await Promise.all([
                    comFunction2.getPageMetaValues('global'),
                    comFunction2.getplans('US'),
                    comFunction2.getSubscribedUsers(user_id)
                ]);
                console.log("getplans", getplans);
                console.log("getSubscribedUsers", getSubscribedUsers);
        
                const sql = `SELECT * FROM page_info where secret_Key = 'business' AND country = "US"`;
                db.query(sql, (err, results, fields) => {
                    if (err) throw err;
                    const common = results[0];
                    const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                    db.query(meta_sql, async (meta_err, _meta_result) => {
                        if (meta_err) throw meta_err;
        
                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        await meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        })
                        const UpcomingBusinessFeature = await comFunction2.getUpcomingBusinessFeature();
                        const BusinessFeature = await comFunction2.getBusinessFeature();
                        //console.log(meta_values_array);
                        res.render('front-end/business', {
                            menu_active_id: 'business',
                            page_title: common.title,
                            currentUserData,
                            common,
                            meta_values_array,
                            UpcomingBusinessFeature,
                            BusinessFeature,
                            globalPageMeta: globalPageMeta,
                            getplans: getplans,
                            country_name: country_name,
                            getSubscribedUsers: getSubscribedUsers,
                            encryptedEmail: encryptedEmail
                        });
                    })
        
                })
            } else{
                var [globalPageMeta, getplans, getSubscribedUsers] = await Promise.all([
                    comFunction2.getPageMetaValues('global'),
                    comFunction2.getplans(country_name),
                    comFunction2.getSubscribedUsers(user_id)
                ]);
                console.log("getplans", getplans);
                console.log("getSubscribedUsers", getSubscribedUsers);
        
                const sql = `SELECT * FROM page_info where secret_Key = 'business' AND country = "${getcountryname}"`;
                db.query(sql, (err, results, fields) => {
                    if (err) throw err;
                    const common = results[0];
                    const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                    db.query(meta_sql, async (meta_err, _meta_result) => {
                        if (meta_err) throw meta_err;
        
                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        await meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        })
                        const UpcomingBusinessFeature = await comFunction2.getUpcomingBusinessFeature();
                        const BusinessFeature = await comFunction2.getBusinessFeature();
                        //console.log(meta_values_array);
                        res.render('front-end/business', {
                            menu_active_id: 'business',
                            page_title: common.title,
                            currentUserData,
                            common,
                            meta_values_array,
                            UpcomingBusinessFeature,
                            BusinessFeature,
                            globalPageMeta: globalPageMeta,
                            getplans: getplans,
                            country_name: country_name,
                            getSubscribedUsers: getSubscribedUsers,
                            encryptedEmail: encryptedEmail
                        });
                    })
        
                })
            }

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/stripe-payment', checkCookieValue, async (req, res) => {
    try {
        const { planId, planPrice, monthly, memberCount, total_price, encryptedEmail } = req.query;
        console.log("req.query-monthly", req.query);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        //console.log("apiKey",apiKey);

        let currentUserData = JSON.parse(req.userData);
        console.log("currentUserData", currentUserData);

        const razorpay_key = process.env.RAZORPAY_KEY_ID;

        if (currentUserData != null) {
            var user_id = currentUserData.user_id;
            console.log("user_idsssss", user_id);

            const decryptedEmail = await comFunction2.decryptEmail(encryptedEmail);
            if (decryptedEmail !== currentUserData.email) {
                return res.status(500).send('You are not authorized to access the payment page.');
            }
        }

        let country_name = req.cookies.countryName || 'India';
        let country_code = req.cookies.countryCode || 'IN';

        console.log("country_names", country_name);
        console.log("country_codes", country_code);

        const planids = `SELECT * FROM plan_management WHERE name = "${planId}"`;
        const planidvalue = await queryAsync(planids);
        //console.log("planidvalue", planidvalue[0].id);
        const planID = planidvalue[0].id;
        var monthly_plan_price = planidvalue[0].monthly_price;
        console.log("monthly_plan_price", monthly_plan_price);
        var yearly_price = planidvalue[0].yearly_price;
        console.log("yearly_price", yearly_price);
        var per_user_prices = planidvalue[0].per_user_price;
        console.log("per_user_prices", per_user_prices);

        const getcurencyquery = `SELECT * FROM currency_conversion`;
        const getcurrencyval = await queryAsync(getcurencyquery);
        console.log("getcurrencyval", getcurrencyval);

        var indian_currency = getcurrencyval[0].inr_currency;
        console.log("indian_currency", indian_currency);
        var jp_currency = getcurrencyval[0].jpy_currency;
        console.log("jp_currency", jp_currency);

        if (country_code == 'IN') {
            var per_user_price = per_user_prices * indian_currency;
        } else if (country_code == 'JP') {
            var per_user_price = per_user_prices * jp_currency;
        } else {
            var per_user_price = per_user_prices
        }

        const exchangeRates = await comFunction2.getCurrency();
        //console.log("exchangeRates",exchangeRates);

        const [latestReviews, getCountries] = await Promise.all([
            comFunction2.getlatestReviews(20),
            comFunction.getCountries(),
        ]);
        console.log("getCountries", getCountries);

        res.render('front-end/stripe_payment', {
            page_title: "Monthly Subscription",
            menu_active_id: "Monthly Subscription",
            planId,
            planPrice,
            monthly,
            planID,
            currentUserData,
            memberCount,
            total_price,
            country_code: country_code,
            exchangeRates: exchangeRates,
            encryptedEmail,
            user_id,
            getCountries,
            razorpay_key: razorpay_key,
            monthly_plan_price,
            per_user_price,
            yearly_price
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
router.get('/stripe-year-payment', checkCookieValue, async (req, res) => {
    try {
        const { planId, planPrice, yearly, memberCount, total_price, encryptedEmail } = req.query;
        console.log("req.query-yearly", req.query);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);

        const razorpay_key = process.env.RAZORPAY_KEY_ID;

        let country_name = req.cookies.countryName || 'India';
        let country_code = req.cookies.countryCode || 'IN';

        console.log("country_names", country_name);
        console.log("country_codes", country_code);

        const getcountrcodequery = `SELECT * FROM countries WHERE shortname= "${country_code}"`;
        const getcountrycodeval = await queryAsync(getcountrcodequery);
        if (getcountrycodeval.length > 0) {
            var country_no = getcountrycodeval[0].id;
            console.log("country_no", country_no);
        }

        let currentUserData = JSON.parse(req.userData);
        const planids = `SELECT * FROM plan_management WHERE name = "${planId}"`;
        const planidvalue = await queryAsync(planids);
        const planID = planidvalue[0].id;

        var monthly_plan_price = planidvalue[0].monthly_price;
        console.log("monthly_plan_price", monthly_plan_price);
        var yearly_price = planidvalue[0].yearly_price;
        console.log("yearly_price", yearly_price);
        var per_user_prices = planidvalue[0].per_user_price;
        console.log("per_user_prices", per_user_prices);

        const getcurencyquery = `SELECT * FROM currency_conversion`;
        const getcurrencyval = await queryAsync(getcurencyquery);
        console.log("getcurrencyval", getcurrencyval);

        var indian_currency = getcurrencyval[0].inr_currency;
        console.log("indian_currency", indian_currency);
        var jp_currency = getcurrencyval[0].jpy_currency;
        console.log("jp_currency", jp_currency);

        if (country_code == 'IN') {
            var per_user_price = per_user_prices * indian_currency;
        } else if (country_code == 'JP') {
            var per_user_price = per_user_prices * jp_currency;
        } else {
            var per_user_price = per_user_prices
        }

        const decryptedEmail = await comFunction2.decryptEmail(encryptedEmail);
        if (decryptedEmail !== currentUserData.email) {
            return res.status(500).send('You are not authorized to access the payment page.');
        }

        const exchangeRates = await comFunction2.getCurrency();
        const getstatesquery = `SELECT * FROM states WHERE country_id = ?`;
        const getstatevalue = await queryAsync(getstatesquery, [country_no]);
        //console.log("getstatevalue",getstatevalue);

        const [latestReviews, getCountries, globalPageMeta] = await Promise.all([
            comFunction2.getlatestReviews(20),
            comFunction.getCountries(),
            comFunction2.getPageMetaValues('global'),
        ]);
        console.log("getCountries", getCountries);

        res.render('front-end/stripe_payment_yearly', {
            menu_active_id: 'Subscription',
            page_title: 'Subscription creation',
            globalPageMeta,
            planId,
            planPrice,
            yearly,
            planID,
            memberCount,
            currentUserData,
            total_price,
            country_code: country_code,
            exchangeRates: exchangeRates,
            getstatevalue: getstatevalue,
            getCountries: getCountries,
            razorpay_key: razorpay_key,
            monthly_plan_price,
            per_user_price,
            yearly_price
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/create-user-company-subscription', checkCookieValue, async (req, res) => {
    try {
        const { planName, planPrice, monthly, memberCount, total_price, encryptedEmail, subscriptionType } = req.query;
        console.log("req.query-monthly", req.query);
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        //console.log("apiKey",apiKey);
        const razorpay_key = process.env.RAZORPAY_KEY_ID;

        let currentUserData = JSON.parse(req.userData);
        console.log("currentUserData", currentUserData);
        if (currentUserData != null) {
            var user_id = currentUserData.user_id;
            console.log("user_idsssss", user_id);

            // const decryptedEmail = await comFunction2.decryptEmail(encryptedEmail);
            // if (decryptedEmail !== currentUserData.email) {
            //     return res.status(500).send('You are not authorized to access the payment page.');
            // }
        }

        let country_name = req.cookies.countryName || 'India';
        let country_code = req.cookies.countryCode || 'IN';

        console.log("country_names", country_name);
        console.log("country_codes", country_code);

        const planids = `SELECT * FROM plan_management WHERE name = "${planName}"`;
        const planidvalue = await queryAsync(planids);
        //console.log("planidvalue", planidvalue[0].id);
        if (planidvalue.length > 0) {
            var planID = planidvalue[0].id;
            console.log("planID", planID);
            var monthly_plan_price = planidvalue[0].monthly_price;
            console.log("monthly_plan_price", monthly_plan_price);
            var yearly_price = planidvalue[0].yearly_price;
            console.log("yearly_price", yearly_price);
            var per_user_prices = planidvalue[0].per_user_price;
            console.log("per_user_prices", per_user_prices);
        }
        const getcurencyquery = `SELECT * FROM currency_conversion`;
        const getcurrencyval = await queryAsync(getcurencyquery);
        console.log("getcurrencyval", getcurrencyval);

        var indian_currency = getcurrencyval[0].inr_currency;
        console.log("indian_currency", indian_currency);
        var jp_currency = getcurrencyval[0].jpy_currency;
        console.log("jp_currency", jp_currency);

        if (country_code == 'IN') {
            var per_user_price = per_user_prices * indian_currency;
        } else if (country_code == 'JP') {
            var per_user_price = per_user_prices * jp_currency;
        } else {
            var per_user_price = per_user_prices
        }


        const exchangeRates = await comFunction2.getCurrency();
        //console.log("exchangeRates",exchangeRates);

        const [globalPageMeta, getplans, getCountries, getCountriesList] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getplans(country_name),
            comFunction.getCountries(),
            comFunction.getCountriesList()
        ]);
        //console.log("getCountriesList",getCountriesList);

        res.render('front-end/company-subscription-monthly', {
            menu_active_id: 'Subscription',
            page_title: 'Company creation',
            planName,
            //planId,
            planPrice,
            monthly,
            planID,
            currentUserData,
            memberCount,
            total_price,
            country_code: country_code,
            exchangeRates: exchangeRates,
            encryptedEmail,
            user_id,
            globalPageMeta,
            getCountries,
            getCountriesList,
            razorpay_key: razorpay_key,
            subscriptionType: subscriptionType,
            monthly_plan_price: monthly_plan_price,
            yearly_price: yearly_price,
            per_user_price
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
})



router.get('/checkEmailAvailability', async (req, res) => {
    const { email } = req.query;

    try {
        const emailExists = await new Promise((resolve, reject) => {
            db.query('SELECT email, register_from FROM users WHERE email = ?', [email], (err, results) => {
                if (err) {
                    console.error('Database query error:', err);
                    reject({ status: 'error', message: 'Database query error' });
                } else {
                    if (results.length > 0) {
                        const register_from = results[0].register_from;
                        resolve({ available: false, message: 'Email already exists.' });
                    } else {
                        resolve({ available: true, message: 'Email available.' });
                    }
                }
            });
        });

        res.json(emailExists);
    } catch (error) {
        console.error('Error checking email availability:', error);
        res.status(500).json({ message: 'Failed to check email availability' });
    }
});

router.get('/get-exist-company', async (req, res) => {
    try {
        const { company_name, main_address_country, parent_id } = req.query;
        console.log("getexistcomp", req.query);
        if (parent_id == 0) {
            const companyquery = `SELECT * FROM company WHERE company_name = ? AND main_address_country = ?`;
            const companyvalue = await query(companyquery, [company_name, main_address_country]);

            console.log("companyvalue", companyvalue);

            if (companyvalue.length > 0) {
                return res.json({
                    status: 'err',
                    data: '',
                    message: 'Organization name already exists.'
                });
            } else {
                return res.json({
                    status: 'success',
                    data: '',
                    message: 'Organization name is available.'
                });
            }
        } else {
            return res.json({
                status: 'success',
                data: '',
                message: 'Parent ID is not 0, skipping company name check.'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.json({
            status: 'err',
            message: error.message
        });
    }
});


router.get('/checkcompanyEmailAvailability', async (req, res) => {
    const { email } = req.query;

    try {
        const emailExists = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM company WHERE comp_email = ?', [email], (err, results) => {
                if (err) {
                    console.error('Database query error:', err);
                    reject({ status: 'error', message: 'Database query error' });
                } else {
                    if (results.length > 0) {
                        const register_from = results[0].register_from;
                        resolve({ available: false, message: 'Email already exists for another company.' });
                    } else {
                        resolve({ available: true, message: 'Email available.' });
                    }
                }
            });
        });

        res.json(emailExists);
    } catch (error) {
        console.error('Error checking email availability:', error);
        res.status(500).json({ message: 'Failed to check email availability' });
    }
});
router.get('/checkcompanyPhoneAvailability', async (req, res) => {
    const { comp_phone } = req.query;

    try {
        const emailExists = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM company WHERE comp_phone = ?', [comp_phone], (err, results) => {
                if (err) {
                    console.error('Database query error:', err);
                    reject({ status: 'error', message: 'Database query error' });
                } else {
                    if (results.length > 0) {
                        const register_from = results[0].register_from;
                        resolve({ available: false, message: 'Phone number already exists for another company.' });
                    } else {
                        resolve({ available: true, message: 'Phone number available.' });
                    }
                }
            });
        });

        res.json(emailExists);
    } catch (error) {
        console.error('Error checking email availability:', error);
        res.status(500).json({ message: 'Failed to check email availability' });
    }
});
router.get('/checkuserPhoneAvailability', async (req, res) => {
    const { phone } = req.query;

    try {
        const emailExists = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM users WHERE phone = ?', [phone], (err, results) => {
                if (err) {
                    console.error('Database query error:', err);
                    reject({ status: 'error', message: 'Database query error' });
                } else {
                    if (results.length > 0) {
                        const register_from = results[0].register_from;
                        resolve({ available: false, message: 'Phone number already exists for another user.' });
                    } else {
                        resolve({ available: true, message: 'Phone number available.' });
                    }
                }
            });
        });

        res.json(emailExists);
    } catch (error) {
        console.error('Error checking Phone availability:', error);
        res.status(500).json({ message: 'Failed to check Phone availability' });
    }
});

router.get('/checkCompanyAvailability', async (req, res) => {
    const { company_name, country, parent_id } = req.query;

    try {
        if (parent_id == 0) {
            const companyQuery = 'SELECT * FROM company WHERE company_name = ? AND main_address_country = ?';
            const companyValue = await query(companyQuery, [company_name, country]);

            if (companyValue.length > 0) {
                return res.status(400).json({ status: 'error', message: 'Organization name already exists.' });
            }
        }
        res.json({ status: 'success', message: 'Company name is available.' });
    } catch (error) {
        console.error('Error checking company availability:', error);
        res.status(500).json({ message: 'Failed to check company availability' });
    }
});



router.post('/create-subscription', async (req, res) => {
    try {
        const { fullName, email, address } = req.body;
        const apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);

        const customer = await stripe.customers.create({
            email: email,
            name: fullName,
            address: {
                line1: address,
                // Add other address fields as needed
            }
        });

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
        });

        res.json(subscription);
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

router.get('/privacy-policy', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);

    let country_name = req.cookies.countryName
        || 'India';
    let country_code = req.cookies.countryCode
        || 'IN';
    console.log("country_namesprivacy", country_name);
    console.log("country_codesprivacy", country_code);

    // if (country_code != 'UK' && country_code != 'JP') {
    //     country_code = 'US';
    // }

    if (country_code != 'UK' && country_code != 'JP' && country_code != 'All') {
        country_code = 'US';
    }
    if(country_code == 'All'){
        country_name= 'India'
    }

    try {
        if(country_code != 'All'){
            console.log("NOTALL");
        const sql = `SELECT * FROM page_info where secret_Key = 'privacy' AND country= "${country_code}"`;
        console.log("fsdasdf", country_code);
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            console.log("common", common);

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                console.log("meta_values_arraySS", meta_values_array);
                res.render('front-end/privacy-policy', {
                    menu_active_id: 'privacy-policy',
                    page_title: common.title,
                    currentUserData,
                    common,
                    meta_values_array,
                    globalPageMeta: globalPageMeta,
                    apiKey
                });
            })

        })
    } else{
        console.log("ALLss");
        const sql = `SELECT * FROM page_info where secret_Key = 'privacy' AND country= "US"`;
        console.log("fsdasdf", country_code);
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            console.log("common", common);

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                console.log("meta_values_arraySS", meta_values_array);
                res.render('front-end/privacy-policy', {
                    menu_active_id: 'privacy-policy',
                    page_title: common.title,
                    currentUserData,
                    common,
                    meta_values_array,
                    globalPageMeta: globalPageMeta,
                    apiKey
                });
            })

        })
    }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
router.get('/privacy-policy/:getcountryname', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    let getcountryname = req.params.getcountryname;
    console.log("privacygetcountryname", getcountryname);

    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);

    let country_name = req.cookies.countryName
        || 'India';
    let country_code = req.cookies.countryCode
        || 'IN';
    console.log("country_namesprivacy", country_name);
    console.log("country_codesprivacy", country_code);

    if (country_code != 'UK' && country_code != 'JP' && country_code != 'All') {
        country_code = 'US';
    }
    if(country_code == 'All'){
        country_name= 'India'
    }

    try {
        if(country_code != 'All'){
            const sql = `SELECT * FROM page_info where secret_Key = 'privacy' AND country= "${getcountryname}"`;
            console.log("fsdasdf", country_code);
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                console.log("common", common);

                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;

                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log("meta_values_arraySS", meta_values_array);
                    res.render('front-end/privacy-policy', {
                        menu_active_id: 'privacy-policy',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta,
                        apiKey
                    });
                })

            })
        } else{
            const sql = `SELECT * FROM page_info where secret_Key = 'privacy' AND country= "US"`;
            console.log("fsdasdf", country_code);
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                console.log("common", common);

                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;

                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log("meta_values_arraySS", meta_values_array);
                    res.render('front-end/privacy-policy', {
                        menu_active_id: 'privacy-policy',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta,
                        apiKey
                    });
                })

            })
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/disclaimer', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    const country_name = req.cookies.countryName
        || 'India';
    let country_code = req.cookies.countryCode
        || 'IN';
    console.log("country_namesprivacy", country_name);
    console.log("country_codesprivacy", country_code);

    if (country_code != 'UK' && country_code != 'JP' && country_code != 'All') {
        country_code = 'US';
    }
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        if (country_code !='All') {
            console.log("notall");
            const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' AND country= "${country_code}" `;
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;
    
                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log(meta_values_array);
                    res.render('front-end/disclaimer', {
                        menu_active_id: 'disclaimer',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta
                    });
                })
    
            })
        }else{
            console.log("alll");
            const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' AND country= "US" `;
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;
    
                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log(meta_values_array);
                    res.render('front-end/disclaimer', {
                        menu_active_id: 'disclaimer',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta
                    });
                })
    
            })
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/disclaimer', { menu_active_id: 'disclaimer', page_title: 'Disclaimer', currentUserData });
});
router.get('/disclaimer/:getcountryname', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    let getcountryname = req.params.getcountryname;
    console.log("privacygetcountryname", getcountryname);

    const country_name = req.cookies.countryName
        || 'India';
    let country_code = req.cookies.countryCode
        || 'IN';
    console.log("country_namesprivacy", country_name);
    console.log("country_codesprivacy", country_code);

    if (country_code != 'UK' && country_code != 'JP') {
        country_code = 'US';
    }
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        if (country_code !='All') {
            console.log("notall");
            const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' AND country= "${country_code}" `;
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;
    
                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log(meta_values_array);
                    res.render('front-end/disclaimer', {
                        menu_active_id: 'disclaimer',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta
                    });
                })
    
            })
        }else{
            console.log("alll");
            const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' AND country= "US" `;
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;
    
                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log(meta_values_array);
                    res.render('front-end/disclaimer', {
                        menu_active_id: 'disclaimer',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta
                    });
                })
    
            })
        }
    }catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/disclaimer', { menu_active_id: 'disclaimer', page_title: 'Disclaimer', currentUserData });
});

router.get('/terms-of-service', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    const country_name = req.cookies.countryName
        || 'India';
    let country_code = req.cookies.countryCode
        || 'IN';
    console.log("country_namesprivacy", country_name);
    console.log("country_codesprivacy", country_code);

    if (country_code != 'UK' && country_code != 'JP' && country_code != 'All') {
        country_code = 'US';
    }

    console.log("apiKey", apiKey);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        if(country_code!='All'){
            const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' AND country="${country_code}"`;
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;
    
                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log(meta_values_array);
                    res.render('front-end/terms-of-service', {
                        menu_active_id: 'terms-of-service',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta
                    });
                })
    
            })
        } else{
            const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' AND country="US"`;
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;
    
                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log(meta_values_array);
                    res.render('front-end/terms-of-service', {
                        menu_active_id: 'terms-of-service',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta
                    });
                })
    
            })
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

router.get('/terms-of-service/:getcountryname', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    const getcountryname = req.params.getcountryname;
    const country_name = req.cookies.countryName
        || 'India';
    let country_code = req.cookies.countryCode
        || 'IN';
    console.log("country_namesprivacy", country_name);
    console.log("country_codesprivacy", country_code);

    if (country_code != 'UK' && country_code != 'JP' && country_code!= 'All') {
        country_code = 'US';
    }

    console.log("apiKey", apiKey);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        if(country_code != 'All'){
            const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' AND country="${getcountryname}"`;
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;
    
                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log(meta_values_array);
                    res.render('front-end/terms-of-service', {
                        menu_active_id: 'terms-of-service',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta
                    });
                })
    
            })
        } else{
            const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' AND country="US"`;
            db.query(sql, (err, results, fields) => {
                if (err) throw err;
                const common = results[0];
                const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
                db.query(meta_sql, async (meta_err, _meta_result) => {
                    if (meta_err) throw meta_err;
    
                    const meta_values = _meta_result;
                    let meta_values_array = {};
                    await meta_values.forEach((item) => {
                        meta_values_array[item.page_meta_key] = item.page_meta_value;
                    })
                    console.log(meta_values_array);
                    res.render('front-end/terms-of-service', {
                        menu_active_id: 'terms-of-service',
                        page_title: common.title,
                        currentUserData,
                        common,
                        meta_values_array,
                        globalPageMeta: globalPageMeta
                    });
                })
    
            })
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

router.get('/refund-policy', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        const sql = `SELECT * FROM page_info where secret_Key = 'cancellation_refund_policy' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                console.log(meta_values_array);
                res.render('front-end/refund-policy', {
                    menu_active_id: 'cancellation refund policy',
                    page_title: common.title,
                    currentUserData,
                    common,
                    meta_values_array,
                    globalPageMeta: globalPageMeta
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

router.get('/company/:slug', checkCookieValue, async (req, res) => {
    const slug = req.params.slug;
    console.log("slug", slug);
    const labeltype = req.query.type || null;
    console.log(labeltype)
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    console.log("comp_res", comp_res);

    if (typeof comp_res == 'undefined') {
        const [globalPageMeta] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
        ]);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } else {
        console.log('comp_res', comp_res);
        const companyID = comp_res.ID;
        console.log("fggfgh");
        // console.log(companyID);
        // countInvitationLabels 1=No Labels,2=Invitation
        const [allRatingTags, CompanyInfo, companyReviewNumbers, getCompanyReviews, globalPageMeta, PremiumCompanyData, CompanyPollDetails, countInvitationLabels, CompanySurveyDetails, CompanySurveySubmitionsCount, getCompanyCategory] = await Promise.all([
            comFunction.getAllRatingTags(),
            comFunction.getCompany(companyID),
            comFunction.getCompanyReviewNumbers(companyID),
            comFunction.getCompanyReviews(companyID),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getPremiumCompanyData(companyID),
            comFunction2.getCompanyPollDetails(companyID),
            comFunction2.countInvitationLabels('2', companyID),
            comFunction.getCompanyOngoingSurveyDetails(companyID),
            comFunction.getCompanySurveySubmitionsCount(),
            comFunction2.getCompanyCategory(companyID),
        ]);

        // console.log(get_company_id.ID)
        // console.log(slug)
        // return false;
        // console.log("CompanyInfo",CompanyInfo);


        let cover_img = '';
        let youtube_iframe = '';
        let gallery_img = [];
        let products = [];
        let promotions = [];
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';
        let support_data = {};

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            youtube_iframe = PremiumCompanyData.youtube_iframe;
            gallery_img = JSON.parse(PremiumCompanyData.gallery_img);
            products = JSON.parse(PremiumCompanyData.products);
            promotions = JSON.parse(PremiumCompanyData.promotions);
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
            support_data = { support_email: PremiumCompanyData.support_email, escalation_one: PremiumCompanyData.escalation_one, escalation_two: PremiumCompanyData.escalation_two, escalation_three: PremiumCompanyData.escalation_three }

        }
        console.log("products", products);

        if (CompanyInfo) {
            //console.log("CompanyInfo",CompanyInfo);
            //if (CompanyInfo.paid_status.trim() == 'paid' && CompanyInfo.membership_type_id) {
            if (CompanyInfo.paid_status && CompanyInfo.paid_status.trim() === 'paid' && CompanyInfo.membership_type_id) {
                console.log("bbbbbbbbbb");
                const PollDetails = CompanyPollDetails.map((row) => ({
                    poll_id: row.id,
                    company_id: row.company_id,
                    poll_creator_id: row.poll_creator_id,
                    created_at: row.created_at,
                    expired_at: row.expired_at,
                    question: row.question,
                    poll_answer: row.poll_answer ? row.poll_answer.split(',') : [],
                    poll_answer_id: row.poll_answer_id ? row.poll_answer_id.split(',') : [],
                    voting_answer_id: row.voting_answer_id ? row.voting_answer_id.split(',') : [],
                    voting_user_id: row.voting_user_id ? row.voting_user_id.split(',') : [],
                }));


                const submitionsCountMap = CompanySurveySubmitionsCount.reduce((map, item) => {
                    map[item.survey_unique_id] = item;
                    return map;
                }, {});

                const CompanySurveyDetails_formatted = CompanySurveyDetails.map(detail => ({
                    ...detail,
                    ...(submitionsCountMap[detail.unique_id] || {}) // Add submitionsCount if it exists
                }));

                // res.json(
                // {
                //     menu_active_id: 'company',
                //     page_title: 'Organization Details',
                //     currentUserData,
                //     allRatingTags,
                //     company:CompanyInfo,
                //     CompanyInfo,
                //     companyReviewNumbers,
                //     getCompanyReviews,
                //     globalPageMeta:globalPageMeta,
                //     cover_img:cover_img,
                //     gallery_img:gallery_img,
                //     youtube_iframe:youtube_iframe,
                //     products:products,
                //     promotions:promotions,
                //     facebook_url:facebook_url,
                //     twitter_url:twitter_url,
                //     instagram_url:instagram_url,
                //     linkedin_url:linkedin_url,
                //     youtube_url:youtube_url,
                //     support_data:support_data,
                //     PollDetails,
                //     labeltype,
                //     countInvitationLabels,
                //     CompanySurveyDetails_formatted,
                //     CompanyCategory:getCompanyCategory
                // });
                res.render('front-end/category-details-premium',
                    {
                        menu_active_id: 'company',
                        page_title: 'Organization Details',
                        currentUserData,
                        allRatingTags,
                        company: CompanyInfo,
                        CompanyInfo,
                        companyReviewNumbers,
                        getCompanyReviews,
                        globalPageMeta: globalPageMeta,
                        cover_img: cover_img,
                        gallery_img: gallery_img,
                        youtube_iframe: youtube_iframe,
                        products: products,
                        promotions: promotions,
                        facebook_url: facebook_url,
                        twitter_url: twitter_url,
                        instagram_url: instagram_url,
                        linkedin_url: linkedin_url,
                        youtube_url: youtube_url,
                        support_data: support_data,
                        PollDetails,
                        labeltype,
                        countInvitationLabels,
                        CompanySurveyDetails_formatted,
                        CompanyCategory: getCompanyCategory
                    });
            } else {
                console.log("aaaaa");
                // res.json(
                // {
                //     menu_active_id: 'company',
                //     page_title: 'Organization Details',
                //     currentUserData,
                //     allRatingTags,
                //     company:CompanyInfo,
                //     CompanyInfo,
                //     companyReviewNumbers,
                //     getCompanyReviews,
                //     globalPageMeta:globalPageMeta,
                //     labeltype,
                //     countInvitationLabels,
                //     gallery_img:gallery_img
                // });
                res.render('front-end/company-details',
                    {
                        menu_active_id: 'company',
                        page_title: 'Organization Details',
                        currentUserData,
                        allRatingTags,
                        company: CompanyInfo,
                        CompanyInfo,
                        companyReviewNumbers,
                        getCompanyReviews,
                        globalPageMeta: globalPageMeta,
                        labeltype,
                        countInvitationLabels,
                        gallery_img: gallery_img,
                        CompanyCategory: getCompanyCategory
                    });
            }
        } else {
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: globalPageMeta
            });
        }
    }


});

router.get('/home/company/:slug', checkCookieValue, async (req, res) => {
    const slug = req.params.slug;
    console.log("slug", slug);
    const labeltype = req.query.type || null;
    console.log(labeltype)
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    console.log("comp_res", comp_res);

    if (typeof comp_res == 'undefined') {
        const [globalPageMeta] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
        ]);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } else {
        console.log('comp_res', comp_res);
        const companyID = comp_res.ID;
        console.log("fggfgh");
        // console.log(companyID);
        // countInvitationLabels 1=No Labels,2=Invitation
        const [allRatingTags, CompanyInfo, companyReviewNumbers, getCompanyReviews, globalPageMeta, PremiumCompanyData, CompanyPollDetails, countInvitationLabels, CompanySurveyDetails, CompanySurveySubmitionsCount, getCompanyCategory] = await Promise.all([
            comFunction.getAllRatingTags(),
            comFunction.getCompany(companyID),
            comFunction.getCompanyReviewNumbers(companyID),
            comFunction.getCompanyReviews(companyID),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getPremiumCompanyData(companyID),
            comFunction2.getCompanyPollDetails(companyID),
            comFunction2.countInvitationLabels('2', companyID),
            comFunction.getCompanyOngoingSurveyDetails(companyID),
            comFunction.getCompanySurveySubmitionsCount(),
            comFunction2.getCompanyCategory(companyID),
        ]);

        // console.log(get_company_id.ID)
        // console.log(slug)
        // return false;
        // console.log("CompanyInfo",CompanyInfo);


        let cover_img = '';
        let youtube_iframe = '';
        let gallery_img = [];
        let products = [];
        let promotions = [];
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';
        let support_data = {};

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            youtube_iframe = PremiumCompanyData.youtube_iframe;
            gallery_img = JSON.parse(PremiumCompanyData.gallery_img);
            products = JSON.parse(PremiumCompanyData.products);
            promotions = JSON.parse(PremiumCompanyData.promotions);
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
            support_data = { support_email: PremiumCompanyData.support_email, escalation_one: PremiumCompanyData.escalation_one, escalation_two: PremiumCompanyData.escalation_two, escalation_three: PremiumCompanyData.escalation_three }

        }
        console.log("products", products);

        if (CompanyInfo) {
            //console.log("CompanyInfo",CompanyInfo);
            //if (CompanyInfo.paid_status.trim() == 'paid' && CompanyInfo.membership_type_id) {
            if (CompanyInfo.paid_status && CompanyInfo.paid_status.trim() === 'paid' && CompanyInfo.membership_type_id) {
                console.log("bbbbbbbbbb");
                const PollDetails = CompanyPollDetails.map((row) => ({
                    poll_id: row.id,
                    company_id: row.company_id,
                    poll_creator_id: row.poll_creator_id,
                    created_at: row.created_at,
                    expired_at: row.expired_at,
                    question: row.question,
                    poll_answer: row.poll_answer ? row.poll_answer.split(',') : [],
                    poll_answer_id: row.poll_answer_id ? row.poll_answer_id.split(',') : [],
                    voting_answer_id: row.voting_answer_id ? row.voting_answer_id.split(',') : [],
                    voting_user_id: row.voting_user_id ? row.voting_user_id.split(',') : [],
                }));


                const submitionsCountMap = CompanySurveySubmitionsCount.reduce((map, item) => {
                    map[item.survey_unique_id] = item;
                    return map;
                }, {});

                const CompanySurveyDetails_formatted = CompanySurveyDetails.map(detail => ({
                    ...detail,
                    ...(submitionsCountMap[detail.unique_id] || {}) // Add submitionsCount if it exists
                }));

                // res.json(
                // {
                //     menu_active_id: 'company',
                //     page_title: 'Organization Details',
                //     currentUserData,
                //     allRatingTags,
                //     company:CompanyInfo,
                //     CompanyInfo,
                //     companyReviewNumbers,
                //     getCompanyReviews,
                //     globalPageMeta:globalPageMeta,
                //     cover_img:cover_img,
                //     gallery_img:gallery_img,
                //     youtube_iframe:youtube_iframe,
                //     products:products,
                //     promotions:promotions,
                //     facebook_url:facebook_url,
                //     twitter_url:twitter_url,
                //     instagram_url:instagram_url,
                //     linkedin_url:linkedin_url,
                //     youtube_url:youtube_url,
                //     support_data:support_data,
                //     PollDetails,
                //     labeltype,
                //     countInvitationLabels,
                //     CompanySurveyDetails_formatted,
                //     CompanyCategory:getCompanyCategory
                // });
                res.render('front-end/category-details-premium',
                    {
                        menu_active_id: 'company',
                        page_title: 'Organization Details',
                        currentUserData,
                        allRatingTags,
                        company: CompanyInfo,
                        CompanyInfo,
                        companyReviewNumbers,
                        getCompanyReviews,
                        globalPageMeta: globalPageMeta,
                        cover_img: cover_img,
                        gallery_img: gallery_img,
                        youtube_iframe: youtube_iframe,
                        products: products,
                        promotions: promotions,
                        facebook_url: facebook_url,
                        twitter_url: twitter_url,
                        instagram_url: instagram_url,
                        linkedin_url: linkedin_url,
                        youtube_url: youtube_url,
                        support_data: support_data,
                        PollDetails,
                        labeltype,
                        countInvitationLabels,
                        CompanySurveyDetails_formatted,
                        CompanyCategory: getCompanyCategory
                    });
            } else {
                console.log("aaaaa");
                // res.json(
                // {
                //     menu_active_id: 'company',
                //     page_title: 'Organization Details',
                //     currentUserData,
                //     allRatingTags,
                //     company:CompanyInfo,
                //     CompanyInfo,
                //     companyReviewNumbers,
                //     getCompanyReviews,
                //     globalPageMeta:globalPageMeta,
                //     labeltype,
                //     countInvitationLabels,
                //     gallery_img:gallery_img
                // });
                res.render('front-end/company-details',
                    {
                        menu_active_id: 'company',
                        page_title: 'Organization Details',
                        currentUserData,
                        allRatingTags,
                        company: CompanyInfo,
                        CompanyInfo,
                        companyReviewNumbers,
                        getCompanyReviews,
                        globalPageMeta: globalPageMeta,
                        labeltype,
                        countInvitationLabels,
                        gallery_img: gallery_img,
                        CompanyCategory: getCompanyCategory
                    });
            }
        } else {
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: globalPageMeta
            });
        }
    }


});
router.get('/home/company/:slug', checkCookieValue, async (req, res) => {
    const slug = req.params.slug;
    console.log("slug",slug);
    const labeltype = req.query.type || null;
    console.log(labeltype)
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey",apiKey);

    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    console.log("comp_res",comp_res);

    if (typeof comp_res == 'undefined') {
        const [globalPageMeta] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
        ]);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } else {
        console.log('comp_res', comp_res);
        const companyID = comp_res.ID;
        console.log("fggfgh");
        // console.log(companyID);
        // countInvitationLabels 1=No Labels,2=Invitation
        const [allRatingTags, CompanyInfo, companyReviewNumbers, getCompanyReviews, globalPageMeta, PremiumCompanyData, CompanyPollDetails, countInvitationLabels, CompanySurveyDetails, CompanySurveySubmitionsCount, getCompanyCategory] = await Promise.all([
            comFunction.getAllRatingTags(),
            comFunction.getCompany(companyID),
            comFunction.getCompanyReviewNumbers(companyID),
            comFunction.getCompanyReviews(companyID),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getPremiumCompanyData(companyID),
            comFunction2.getCompanyPollDetails(companyID),
            comFunction2.countInvitationLabels('2', companyID),
            comFunction.getCompanyOngoingSurveyDetails(companyID),
            comFunction.getCompanySurveySubmitionsCount(),
            comFunction2.getCompanyCategory(companyID),
        ]);

        // console.log(get_company_id.ID)
        // console.log(slug)
        // return false;
        // console.log("CompanyInfo",CompanyInfo);


        let cover_img = '';
        let youtube_iframe = '';
        let gallery_img = [];
        let products = [];
        let promotions = [];
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';
        let support_data = {};

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            youtube_iframe = PremiumCompanyData.youtube_iframe;
            gallery_img = JSON.parse(PremiumCompanyData.gallery_img);
            products = JSON.parse(PremiumCompanyData.products);
            promotions = JSON.parse(PremiumCompanyData.promotions);
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
            support_data = { support_email: PremiumCompanyData.support_email, escalation_one: PremiumCompanyData.escalation_one, escalation_two: PremiumCompanyData.escalation_two, escalation_three: PremiumCompanyData.escalation_three }

        }
        console.log("products", products);

        if (CompanyInfo) {
            //console.log("CompanyInfo",CompanyInfo);
            //if (CompanyInfo.paid_status.trim() == 'paid' && CompanyInfo.membership_type_id) {
            if (CompanyInfo.paid_status && CompanyInfo.paid_status.trim() === 'paid' && CompanyInfo.membership_type_id) {
                console.log("bbbbbbbbbb");
                const PollDetails = CompanyPollDetails.map((row) => ({
                    poll_id: row.id,
                    company_id: row.company_id,
                    poll_creator_id: row.poll_creator_id,
                    created_at: row.created_at,
                    expired_at: row.expired_at,
                    question: row.question,
                    poll_answer: row.poll_answer ? row.poll_answer.split(',') : [],
                    poll_answer_id: row.poll_answer_id ? row.poll_answer_id.split(',') : [],
                    voting_answer_id: row.voting_answer_id ? row.voting_answer_id.split(',') : [],
                    voting_user_id: row.voting_user_id ? row.voting_user_id.split(',') : [],
                }));


                const submitionsCountMap = CompanySurveySubmitionsCount.reduce((map, item) => {
                    map[item.survey_unique_id] = item;
                    return map;
                }, {});

                const CompanySurveyDetails_formatted = CompanySurveyDetails.map(detail => ({
                    ...detail,
                    ...(submitionsCountMap[detail.unique_id] || {}) // Add submitionsCount if it exists
                }));

                // res.json(
                // {
                //     menu_active_id: 'company',
                //     page_title: 'Organization Details',
                //     currentUserData,
                //     allRatingTags,
                //     company:CompanyInfo,
                //     CompanyInfo,
                //     companyReviewNumbers,
                //     getCompanyReviews,
                //     globalPageMeta:globalPageMeta,
                //     cover_img:cover_img,
                //     gallery_img:gallery_img,
                //     youtube_iframe:youtube_iframe,
                //     products:products,
                //     promotions:promotions,
                //     facebook_url:facebook_url,
                //     twitter_url:twitter_url,
                //     instagram_url:instagram_url,
                //     linkedin_url:linkedin_url,
                //     youtube_url:youtube_url,
                //     support_data:support_data,
                //     PollDetails,
                //     labeltype,
                //     countInvitationLabels,
                //     CompanySurveyDetails_formatted,
                //     CompanyCategory:getCompanyCategory
                // });
                res.render('front-end/category-details-premium',
                    {
                        menu_active_id: 'company',
                        page_title: 'Organization Details',
                        currentUserData,
                        allRatingTags,
                        company: CompanyInfo,
                        CompanyInfo,
                        companyReviewNumbers,
                        getCompanyReviews,
                        globalPageMeta: globalPageMeta,
                        cover_img: cover_img,
                        gallery_img: gallery_img,
                        youtube_iframe: youtube_iframe,
                        products: products,
                        promotions: promotions,
                        facebook_url: facebook_url,
                        twitter_url: twitter_url,
                        instagram_url: instagram_url,
                        linkedin_url: linkedin_url,
                        youtube_url: youtube_url,
                        support_data: support_data,
                        PollDetails,
                        labeltype,
                        countInvitationLabels,
                        CompanySurveyDetails_formatted,
                        CompanyCategory: getCompanyCategory
                    });
            } else {
                console.log("aaaaa");
                // res.json(
                // {
                //     menu_active_id: 'company',
                //     page_title: 'Organization Details',
                //     currentUserData,
                //     allRatingTags,
                //     company:CompanyInfo,
                //     CompanyInfo,
                //     companyReviewNumbers,
                //     getCompanyReviews,
                //     globalPageMeta:globalPageMeta,
                //     labeltype,
                //     countInvitationLabels,
                //     gallery_img:gallery_img
                // });
                res.render('front-end/company-details',
                    {
                        menu_active_id: 'company',
                        page_title: 'Organization Details',
                        currentUserData,
                        allRatingTags,
                        company: CompanyInfo,
                        CompanyInfo,
                        companyReviewNumbers,
                        getCompanyReviews,
                        globalPageMeta: globalPageMeta,
                        labeltype,
                        countInvitationLabels,
                        gallery_img: gallery_img,
                        CompanyCategory: getCompanyCategory
                    });
            }
        } else {
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: globalPageMeta
            });
        }
    }


});

// category listing page
// router.get('/categories', checkCookieValue, async (req, res) => {
//     let currentUserData = JSON.parse(req.userData);
//     const apiKey = process.env.GEO_LOCATION_API_KEY;
//     console.log("apiKey",apiKey);


//     let country_name = req.cookies.countryName || 'India';
//     let country_code = req.cookies.countryCode || 'IN';

//     console.log("country_names", country_name);
//     console.log("country_codes", country_code);

//     const getcountry_code = `SELECT id FROM countries WHERE shortname = "${country_code}"`;
//     const getcountryval = await query(getcountry_code);
//     if (getcountryval.length > 0) {
//         var country_id = getcountryval[0].id;
//         console.log("country_id", country_id);
//     }


//     const [globalPageMeta] = await Promise.all([
//         comFunction2.getPageMetaValues('global'),
//     ]);
//     try {
//         const cat_query = `
//         SELECT category.ID AS category_id, category.category_slug, category.category_name AS category_name, category.category_img AS category_img, c.category_name AS parent_name, GROUP_CONCAT(countries.name) AS country_names, category_country_relation.country_id AS country
//         FROM category
//         JOIN category_country_relation ON category.id = category_country_relation.cat_id
//         JOIN countries ON category_country_relation.country_id = countries.id
//         LEFT JOIN category AS c ON c.ID = category.parent_id
//         WHERE category.parent_id = 0 AND category_country_relation.country_id= "${country_id}"
//         GROUP BY category.category_name `;
//         db.query(cat_query, async (err, results) => {
//             if (err) {
//                 return res.send(
//                     {
//                         status: 'err',
//                         data: '',
//                         message: 'An error occurred while processing your request' + err
//                     }
//                 )
//             } else {
//                 console.log("results", results);
//                 var country = results.country;
//                 console.log("country", country);
//                 var country_names = `SELECT shortname FROM countries WHERE id ="${country}"`;
//                 if (country_names.length > 0) {
//                     var getcountry = country_names[0].shortname;
//                     console.log("getcountry", getcountry);
//                 }

//                 const categories = results.map((row) => ({
//                     categoryId: row.category_id,
//                     categoryName: row.category_name,
//                     category_slug: row.category_slug,
//                     parentName: row.parent_name,
//                     categoryImage: row.category_img,
//                     countryNames: row.country_names.split(','),
//                     //country: row.country
//                 }));

//                 try {
//                     for (const category of categories) {
//                         const countryNames = category.countryNames;
//                         const placeholders = countryNames.map(() => '?').join(',');
//                         const countryShortnamesQuery = `SELECT name, shortname FROM countries WHERE name IN (${placeholders})`;
//                         const [countryShortnamesResults] = await db.promise().query(countryShortnamesQuery, countryNames);

//                         // Convert the array of shortnames to a single string
//                         const countryCodes = countryShortnamesResults.map(row => row.shortname).join(', ');
//                         category.countryCodes = countryCodes;
//                     }
//                 } catch (error) {
//                     console.error('Error fetching country short names:', error);
//                     return res.send({
//                         status: 'err',
//                         data: '',
//                         message: 'An error occurred while fetching country short names' + error
//                     });
//                 }

//                 var allCategories = categories.map(function (category) {
//                     return {
//                         category_slug: category.category_slug,
//                         categoryName: category.categoryName,
//                         categoryImage: category.categoryImage
//                     };
//                 });
//                 console.log("categories", categories);

//                 // res.json({
//                 //     menu_active_id: 'category-listing',
//                 //     page_title: 'All Categories',
//                 //     currentUserData,
//                 //     globalPageMeta:globalPageMeta,
//                 //     categories: categories 
//                 // });    
//                 res.render('front-end/category-listing', {
//                     menu_active_id: 'category-listing',
//                     page_title: 'All Categories',
//                     currentUserData,
//                     globalPageMeta: globalPageMeta,
//                     categories: categories,
//                     allCategories
//                 });
//             }

//         })

//     } catch (err) {
//         console.error(err);
//         res.status(500).send('An error occurred');
//     }
// });

//actual
router.get('/categories', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);


    let country_name = req.cookies.countryName || 'India';
    let country_code = req.cookies.countryCode || 'IN';

    console.log("country_names", country_name);
    console.log("country_codes", country_code);

    const getcountry_code = `SELECT id FROM countries WHERE shortname = "${country_code}"`;
    const getcountryval = await query(getcountry_code);
    if (getcountryval.length > 0) {
        var country_id = getcountryval[0].id;
        console.log("country_id", country_id);
    }


    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        // const cat_query = `
        // SELECT category.ID AS category_id, category.category_slug, category.category_name AS category_name, category.category_img AS category_img, c.category_name AS parent_name, GROUP_CONCAT(countries.name) AS country_names, category_country_relation.country_id AS country
        // FROM category
        // JOIN category_country_relation ON category.id = category_country_relation.cat_id
        // JOIN countries ON category_country_relation.country_id = countries.id
        // LEFT JOIN category AS c ON c.ID = category.parent_id
        // WHERE category.parent_id = 0
        // GROUP BY category.category_name`;
        const cat_query = `
        SELECT category.ID AS category_id, category.category_slug, category.category_name AS category_name, category.category_img AS category_img, c.category_name AS parent_name, GROUP_CONCAT(countries.name) AS country_names, category_country_relation.country_id AS country, countries.shortname
        FROM category
        JOIN category_country_relation ON category.id = category_country_relation.cat_id
        JOIN countries ON category_country_relation.country_id = countries.id
        LEFT JOIN category AS c ON c.ID = category.parent_id
        WHERE category.parent_id = 0
        GROUP BY category.category_name`;
        db.query(cat_query, async (err, results) => {
            if (err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request' + err
                    }
                )
            } else {
                console.log("results", results);
                var country = results.country;
                console.log("country", country);
                var country_names = `SELECT shortname FROM countries WHERE id ="${country}"`;
                if (country_names.length > 0) {
                    var getcountry = country_names[0].shortname;
                    console.log("getcountry", getcountry);
                }

                const categories = results.map((row) => ({
                    categoryId: row.category_id,
                    //categoryName: row.category_name,
                    category_slug: row.category_slug,
                    parentName: row.parent_name,
                    categoryImage: row.category_img,
                    countryNames: row.country_names.split(','),
                    //country: row.country
                    categoryName: `${row.category_name} - ${row.shortname}`,
                    // shortname: row.shortname
                }));

                try {
                    for (const category of categories) {
                        const countryNames = category.countryNames;
                        const placeholders = countryNames.map(() => '?').join(',');
                        const countryShortnamesQuery = `SELECT name, shortname FROM countries WHERE name IN (${placeholders})`;
                        const [countryShortnamesResults] = await db.promise().query(countryShortnamesQuery, countryNames);

                        // Convert the array of shortnames to a single string
                        const countryCodes = countryShortnamesResults.map(row => row.shortname).join(', ');
                        category.countryCodes = countryCodes;
                    }
                } catch (error) {
                    console.error('Error fetching country short names:', error);
                    return res.send({
                        status: 'err',
                        data: '',
                        message: 'An error occurred while fetching country short names' + error
                    });
                }

                var allCategories = categories.map(function (category) {
                    return {
                        category_slug: category.category_slug,
                        categoryName: category.categoryName,
                        categoryImage: category.categoryImage
                    };
                });
                console.log("categories", categories);

                // res.json({
                //     menu_active_id: 'category-listing',
                //     page_title: 'All Categories',
                //     currentUserData,
                //     globalPageMeta:globalPageMeta,
                //     categories: categories 
                // });    
                res.render('front-end/category-listing', {
                    menu_active_id: 'category-listing',
                    page_title: 'All Categories',
                    currentUserData,
                    globalPageMeta: globalPageMeta,
                    categories: categories,
                    allCategories
                });
            }

        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

// router.get('/categories', checkCookieValue, async (req, res) => {
//     let currentUserData = JSON.parse(req.userData);
//     const apiKey = process.env.GEO_LOCATION_API_KEY;
//     console.log("apiKey", apiKey);

//     let country_name = req.cookies.countryName || 'India';
//     let country_code = req.cookies.countryCode || 'IN';

//     console.log("country_names", country_name);
//     console.log("country_codes", country_code);

//     const getcountry_code = `SELECT id FROM countries WHERE shortname = "${country_code}"`;
//     const getcountryval = await query(getcountry_code);
//     if (getcountryval.length > 0) {
//         var country_id = getcountryval[0].id;
//         console.log("country_id", country_id);
//     }

//     const [globalPageMeta] = await Promise.all([
//         comFunction2.getPageMetaValues('global'),
//     ]);
//     try {
//         const cat_query = `
//         SELECT category.ID AS category_id, category.category_slug, category.category_name AS category_name, category.category_img AS category_img, c.category_name AS parent_name, GROUP_CONCAT(countries.name) AS country_names, GROUP_CONCAT(countries.shortname) AS country_shortnames, category_country_relation.country_id AS country_id
//         FROM category
//         JOIN category_country_relation ON category.id = category_country_relation.cat_id
//         JOIN countries ON category_country_relation.country_id = countries.id
//         LEFT JOIN category AS c ON c.ID = category.parent_id
//         WHERE category.parent_id = 0
//         GROUP BY category.category_name, category_country_relation.country_id `;

//         db.query(cat_query, async (err, results) => {
//             if (err) {
//                 return res.send({
//                     status: 'err',
//                     data: '',
//                     message: 'An error occurred while processing your request' + err
//                 });
//             } else {
//                 console.log("results", results);

//                 const categories = results.map((row) => ({
//                     categoryId: row.category_id,
//                     categoryName: `${row.category_name}-${row.country_shortnames}`,
//                     category_slug: row.category_slug,
//                     parentName: row.parent_name,
//                     categoryImage: row.category_img,
//                     countryNames: row.country_names.split(','),
//                     countryShortnames: row.country_shortnames.split(','),
//                     countryId: row.country_id,
//                 }));

//                 try {
//                     for (const category of categories) {
//                         const countryNames = category.countryNames;
//                         const placeholders = countryNames.map(() => '?').join(',');
//                         const countryShortnamesQuery = `SELECT name, shortname FROM countries WHERE name IN (${placeholders})`;
//                         const [countryShortnamesResults] = await db.promise().query(countryShortnamesQuery, countryNames);
//                         const countryCodes = countryShortnamesResults.map(row => row.shortname).join(', ');
//                         category.countryCodes = countryCodes;
//                     }
//                 } catch (error) {
//                     console.error('Error fetching country short names:', error);
//                     return res.send({
//                         status: 'err',
//                         data: '',
//                         message: 'An error occurred while fetching country short names' + error
//                     });
//                 }

//                 var allCategories = categories.map(function (category) {
//                     return {
//                         category_slug: category.category_slug,
//                         categoryName: category.categoryName,
//                         categoryImage: category.categoryImage,
//                         countryCodes: category.countryCodes, 
//                     };
//                 });
//                 console.log("categories", categories);

//                 res.render('front-end/category-listing', {
//                     menu_active_id: 'category-listing',
//                     page_title: 'All Categories',
//                     currentUserData,
//                     globalPageMeta: globalPageMeta,
//                     categories: categories,
//                     allCategories
//                 });
//             }
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('An error occurred');
//     }
// });



//category Company Listing page
// router.get('/category/:category_slug', checkCookieValue, async (req, res) => {
router.get('/category/:category_slug/:country', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const category_slug = req.params.category_slug;
    const country = req.params.country;
    const baseURL = process.env.MAIN_URL;
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    console.log("countrysss", country);


    let country_name = req.cookies.countryName || 'India';
    let country_code = req.cookies.countryCode || 'IN';

    console.log("country_names", country_name);
    console.log("country_codes", country_code);

    const [globalPageMeta, getSubCategories, companyDetails, AllRatingTags, CategoryDetails] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getsubCategories(category_slug),
        comFunction2.getCompanyDetails(category_slug, country),
        comFunction.getAllRatingTags(),
        comFunction.getCategoryDetails(category_slug),
        //comFunction.getParentCategories(category_slug),
    ]);

    const categoryParentId = CategoryDetails[0].parent_id;
    const ParentCategories = await comFunction.getParentCategories(categoryParentId);

    console.log("getSubCategories", getSubCategories);

    try {

        const subcategories = getSubCategories.map((row) => ({
            categoryName: row.category_name,
            categorySlug: row.category_slug,
            subCategoryNames: row.subcategories ? row.subcategories.split(',') : [],
            subCategorySlug: row.subcategoriesSlug ? row.subcategoriesSlug.split(',') : [],
            country: row.shortname
        }));
        console.log("newsubcategories", subcategories);

        // res.json({
        //     menu_active_id: 'company-listing',
        //     page_title: subcategories[0].categoryName,
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     subCategories:subcategories[0],
        //     companyDetails:companyDetails,
        //     AllRatingTags:AllRatingTags,
        //     baseURL:baseURL,
        //     filter_value:'',
        //     CategoryDetails,
        //     ParentCategories
        // });
        res.render('front-end/company-listing', {
            menu_active_id: 'company-listing',
            page_title: subcategories[0].categoryName,
            currentUserData,
            globalPageMeta: globalPageMeta,
            subCategories: subcategories[0],
            companyDetails: companyDetails,
            AllRatingTags: AllRatingTags,
            baseURL: baseURL,
            filter_value: '',
            CategoryDetails,
            ParentCategories,
            category_country: country
        });
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
});

router.get('/home/category/:category_slug/:country', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const category_slug = req.params.category_slug;
    const country = req.params.country;
    const baseURL = process.env.MAIN_URL;
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    console.log("countrysss", country);


    let country_name = req.cookies.countryName || 'India';
    let country_code = req.cookies.countryCode || 'IN';

    console.log("country_names", country_name);
    console.log("country_codes", country_code);

    const [globalPageMeta, getSubCategories, companyDetails, AllRatingTags, CategoryDetails] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getsubCategories(category_slug),
        comFunction2.getCompanyDetails(category_slug, country),
        comFunction.getAllRatingTags(),
        comFunction.getCategoryDetails(category_slug),
        //comFunction.getParentCategories(category_slug),
    ]);

    const categoryParentId = CategoryDetails[0].parent_id;
    const ParentCategories = await comFunction.getParentCategories(categoryParentId);

    console.log("getSubCategories", getSubCategories);

    try {

        const subcategories = getSubCategories.map((row) => ({
            categoryName: row.category_name,
            categorySlug: row.category_slug,
            subCategoryNames: row.subcategories ? row.subcategories.split(',') : [],
            subCategorySlug: row.subcategoriesSlug ? row.subcategoriesSlug.split(',') : [],
            country: row.shortname
        }));
        console.log("newsubcategories", subcategories);

        // res.json({
        //     menu_active_id: 'company-listing',
        //     page_title: subcategories[0].categoryName,
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     subCategories:subcategories[0],
        //     companyDetails:companyDetails,
        //     AllRatingTags:AllRatingTags,
        //     baseURL:baseURL,
        //     filter_value:'',
        //     CategoryDetails,
        //     ParentCategories
        // });
        res.render('front-end/company-listing', {
            menu_active_id: 'company-listing',
            page_title: subcategories[0].categoryName,
            currentUserData,
            globalPageMeta: globalPageMeta,
            subCategories: subcategories[0],
            companyDetails: companyDetails,
            AllRatingTags: AllRatingTags,
            baseURL: baseURL,
            filter_value: '',
            CategoryDetails,
            ParentCategories,
            category_country: country
        });
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
});

// router.get('/category/:category_slug', checkCookieValue, async (req, res) => {
//     let currentUserData = JSON.parse(req.userData);
//     const category_slug = req.params.category_slug;
//     const country = req.params.country;
//     const baseURL = process.env.MAIN_URL;
//     const apiKey = process.env.GEO_LOCATION_API_KEY;
//     console.log("apiKey",apiKey);


//     let country_name = req.cookies.countryName || 'India';
//     let country_code = req.cookies.countryCode || 'IN';

//     console.log("country_names", country_name);
//     console.log("country_codes", country_code);

//     const [globalPageMeta, getSubCategories, companyDetails, AllRatingTags, CategoryDetails] = await Promise.all([
//         comFunction2.getPageMetaValues('global'),
//         comFunction2.getSubCategories(category_slug),
//         // comFunction2.getCompanyDetails(category_slug, country_code),
//         comFunction2.getCompanyDetails(category_slug),
//         comFunction.getAllRatingTags(),
//         comFunction.getCategoryDetails(category_slug),
//         //comFunction.getParentCategories(category_slug),
//     ]);

//     const categoryParentId = CategoryDetails[0].parent_id;
//     const ParentCategories = await comFunction.getParentCategories(categoryParentId);

//     try {

//         const subcategories = getSubCategories.map((row) => ({
//             categoryName: row.category_name,
//             categorySlug: row.category_slug,
//             subCategoryNames: row.subcategories ? row.subcategories.split(',') : [],
//             subCategorySlug: row.subcategoriesSlug ? row.subcategoriesSlug.split(',') : [],
//         }));

//         // res.json({
//         //     menu_active_id: 'company-listing',
//         //     page_title: subcategories[0].categoryName,
//         //     currentUserData,
//         //     globalPageMeta:globalPageMeta,
//         //     subCategories:subcategories[0],
//         //     companyDetails:companyDetails,
//         //     AllRatingTags:AllRatingTags,
//         //     baseURL:baseURL,
//         //     filter_value:'',
//         //     CategoryDetails,
//         //     ParentCategories
//         // });
//         res.render('front-end/company-listing', {
//             menu_active_id: 'company-listing',
//             page_title: subcategories[0].categoryName,
//             currentUserData,
//             globalPageMeta: globalPageMeta,
//             subCategories: subcategories[0],
//             companyDetails: companyDetails,
//             AllRatingTags: AllRatingTags,
//             baseURL: baseURL,
//             filter_value: '',
//             CategoryDetails,
//             ParentCategories
//         });
//     } catch (err) {
//         console.error(err);
//         res.render('front-end/404', {
//             menu_active_id: '404',
//             page_title: '404',
//             currentUserData,
//             globalPageMeta: globalPageMeta
//         });
//     }
// });

//category filter company Listing page
// router.get('/category/:category_slug/:country/:filter', checkCookieValue, async (req, res) => {
//     let currentUserData = JSON.parse(req.userData);
//     const category_slug = req.params.category_slug;
//     const country = req.params.country;
//     const filter_value = req.params.filter;
//     const baseURL = process.env.MAIN_URL;

//     const apiKey = process.env.GEO_LOCATION_API_KEY;
//     console.log("apiKey",apiKey);

//     let country_name = req.cookies.countryName || 'India';
//     let country_code = req.cookies.countryCode || 'IN';

//     console.log("country_names", country_name);
//     console.log("country_codes", country_code);


//     const [globalPageMeta, getSubCategories, companyDetails, AllRatingTags, CategoryDetails] = await Promise.all([
//         comFunction2.getPageMetaValues('global'),
//         comFunction2.getSubCategories(category_slug),
//         //comFunction2.getFilteredCompanyDetails(category_slug, filter_value, country_code),
//         comFunction2.getFilteredCompanyDetails(category_slug, filter_value),
//         comFunction.getAllRatingTags(),
//         comFunction.getCategoryDetails(category_slug),
//     ]);
//     if (filter_value == 'latest' || filter_value == 'trending' || filter_value == 'verified') {

//         const categoryParentId = CategoryDetails[0].parent_id;
//         const ParentCategories = await comFunction.getParentCategories(categoryParentId);
//         try {

//             const subcategories = getSubCategories.map((row) => ({
//                 categoryName: row.category_name,
//                 categorySlug: row.category_slug,
//                 subCategoryNames: row.subcategories ? row.subcategories.split(',') : [],
//                 subCategorySlug: row.subcategoriesSlug ? row.subcategoriesSlug.split(',') : [],
//             }));

//             // res.json( {
//             //     menu_active_id: 'company-listing',
//             //     page_title: 'Company Name',
//             //     currentUserData,
//             //     globalPageMeta:globalPageMeta,
//             //     subCategories:subcategories[0],
//             //     companyDetails:companyDetails,
//             //     AllRatingTags,
//             //     ParentCategories
//             // });
//             res.render('front-end/company-listing', {
//                 menu_active_id: 'company-listing',
//                 page_title: subcategories[0].categoryName,
//                 currentUserData,
//                 globalPageMeta: globalPageMeta,
//                 subCategories: subcategories[0],
//                 companyDetails: companyDetails,
//                 AllRatingTags,
//                 baseURL: baseURL,
//                 filter_value: filter_value,
//                 ParentCategories
//             });
//         } catch (err) {
//             console.error(err);
//             res.render('front-end/404', {
//                 menu_active_id: '404',
//                 page_title: '404',
//                 currentUserData,
//                 globalPageMeta: globalPageMeta
//             });
//         }
//     } else {
//         res.redirect(`/category/${category_slug}`);
//     }

// });


// router.get('/category/:category_slug/:filter', checkCookieValue, async (req, res) => {
//     let currentUserData = JSON.parse(req.userData);
//     const category_slug = req.params.category_slug;
//     //const country = req.params.country;
//     const filter_value = req.params.filter;
//     const baseURL = process.env.MAIN_URL;

//     const apiKey = process.env.GEO_LOCATION_API_KEY;
//     console.log("apiKey",apiKey);

//     let country_name = req.cookies.countryName || 'India';
//     let country_code = req.cookies.countryCode || 'IN';

//     console.log("country_names", country_name);
//     console.log("country_codes", country_code);


//     const [globalPageMeta, getSubCategories, companyDetails, AllRatingTags, CategoryDetails] = await Promise.all([
//         comFunction2.getPageMetaValues('global'),
//         comFunction2.getSubCategories(category_slug),
//         comFunction2.getFilteredCompanyDetails(category_slug, filter_value, country_code),
//         //comFunction2.getFilteredCompanyDetails(category_slug, filter_value),
//         comFunction.getAllRatingTags(),
//         comFunction.getCategoryDetails(category_slug),
//     ]);
//     if (filter_value == 'latest' || filter_value == 'trending' || filter_value == 'verified') {

//         const categoryParentId = CategoryDetails[0].parent_id;
//         const ParentCategories = await comFunction.getParentCategories(categoryParentId);
//         try {

//             const subcategories = getSubCategories.map((row) => ({
//                 categoryName: row.category_name,
//                 categorySlug: row.category_slug,
//                 subCategoryNames: row.subcategories ? row.subcategories.split(',') : [],
//                 subCategorySlug: row.subcategoriesSlug ? row.subcategoriesSlug.split(',') : [],
//             }));

//             // res.json( {
//             //     menu_active_id: 'company-listing',
//             //     page_title: 'Company Name',
//             //     currentUserData,
//             //     globalPageMeta:globalPageMeta,
//             //     subCategories:subcategories[0],
//             //     companyDetails:companyDetails,
//             //     AllRatingTags,
//             //     ParentCategories
//             // });
//             res.render('front-end/company-listing', {
//                 menu_active_id: 'company-listing',
//                 page_title: subcategories[0].categoryName,
//                 currentUserData,
//                 globalPageMeta: globalPageMeta,
//                 subCategories: subcategories[0],
//                 companyDetails: companyDetails,
//                 AllRatingTags,
//                 baseURL: baseURL,
//                 filter_value: filter_value,
//                 ParentCategories
//             });
//         } catch (err) {
//             console.error(err);
//             res.render('front-end/404', {
//                 menu_active_id: '404',
//                 page_title: '404',
//                 currentUserData,
//                 globalPageMeta: globalPageMeta
//             });
//         }
//     } else {
//         res.redirect(`/category/${category_slug}`);
//     }

// });


router.get('/category/:category_slug/:country/:filter', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const category_slug = req.params.category_slug;
    const country = req.params.country;
    const filter_value = req.params.filter;
    const baseURL = process.env.MAIN_URL;

    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    let country_name = req.cookies.countryName || 'India';
    let country_code = req.cookies.countryCode || 'IN';

    console.log("country_names", country_name);
    console.log("country_codes", country_code);

    try {
        const [globalPageMeta, getSubCategories, companyDetails, AllRatingTags, CategoryDetails] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getSubCategories(category_slug),
            comFunction2.getFilteredCompanyDetails(category_slug, filter_value, country),
            comFunction.getAllRatingTags(),
            comFunction.getCategoryDetails(category_slug),
        ]);

        if (filter_value == 'latest' || filter_value == 'trending' || filter_value == 'verified' || filter_value == 'all') {
            const categoryParentId = CategoryDetails[0].parent_id;
            const ParentCategories = await comFunction.getParentCategories(categoryParentId);

            const subcategories = getSubCategories.map((row) => ({
                categoryName: row.category_name,
                categorySlug: row.category_slug,
                country: country,
                subCategoryNames: row.subcategories ? row.subcategories.split(',') : [],
                subCategorySlug: row.subcategoriesSlug ? row.subcategoriesSlug.split(',') : [],
            }));

            res.render('front-end/company-listing', {
                menu_active_id: 'company-listing',
                page_title: subcategories[0].categoryName,
                currentUserData,
                globalPageMeta: globalPageMeta,
                subCategories: subcategories[0],
                companyDetails: companyDetails,
                AllRatingTags,
                baseURL: baseURL,
                filter_value: filter_value,
                ParentCategories
            });
        } else {
            res.redirect(`/category/${category_slug}`);
        }
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
});


//New Home page
router.get('/home', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {

        res.render('front-end/home', {
            menu_active_id: 'home',
            page_title: 'Home',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//Discussion page
router.get('/discussion', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);

    const apiKey = process.env.GEO_LOCATION_API_KEY;
    //console.log("apiKey", apiKey);

    let country_name = req.cookies.countryName || 'India';
    let country_code = req.cookies.countryCode || 'IN';

    console.log("country_names", country_name);
    console.log("country_codes", country_code);

    if (req.cookies.countryCode !== 'All') {       
    const new_country_code_query = `SELECT shortname FROM countries WHERE name="${country_name}"`;
    const new_country_code_val = await queryAsync(new_country_code_query);
    console.log("new_country_code_val", new_country_code_val);
    var new_country_code = new_country_code_val[0].shortname;
    console.log("new_country_code", new_country_code);
        var [globalPageMeta, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getAllViewedDiscussion, getPopularTags, getCountries] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllLatestDiscussion(20, country_name),
            comFunction2.getAllPopularDiscussion(country_name),
            comFunction2.getAllDiscussion(country_name),
            comFunction2.getAllViewedDiscussion(country_name),
            // comFunction2.getAllLatestDiscussion(20),
            // comFunction2.getAllPopularDiscussion(),
            // comFunction2.getAllDiscussion(),
            // comFunction2.getAllViewedDiscussion(country_name),
            comFunction2.getPopularTags(country_name,20),
            comFunction.getCountries(),
        ]);
    }else{
        var [globalPageMeta, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getAllViewedDiscussion, getPopularTags, getCountries] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllLatestDiscussion(20),
            comFunction2.getAllPopularDiscussion(),
            comFunction2.getAllDiscussion(),
            comFunction2.getAllViewedDiscussion(),
            // comFunction2.getAllLatestDiscussion(20),
            // comFunction2.getAllPopularDiscussion(),
            // comFunction2.getAllDiscussion(),
            // comFunction2.getAllViewedDiscussion(country_name),
            comFunction2.getPopularTags(20),
            comFunction.getCountries(),
        ]);
    }


    console.log("getAllLatestDiscussion",getAllLatestDiscussion);
    console.log("getPopularTags",getPopularTags);
    try {
        // res.json( {
        //     menu_active_id: 'discussion',
        //     page_title: 'Discussions',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     AllLatestDiscussion: getAllLatestDiscussion,
        //     AllPopularDiscussion: getAllPopularDiscussion,
        //     AllDiscussions: getAllDiscussions,
        //     AllViewedDiscussion: getAllViewedDiscussion,
        //     PopularTags: getPopularTags

        // });
        res.render('front-end/discussion', {
            menu_active_id: 'discussion',
            page_title: 'Queries',
            currentUserData,
            globalPageMeta: globalPageMeta,
            AllLatestDiscussion: getAllLatestDiscussion,
            AllPopularDiscussion: getAllPopularDiscussion,
            AllDiscussions: getAllDiscussions,
            AllViewedDiscussion: getAllViewedDiscussion,
            PopularTags: getPopularTags,
            getCountries: getCountries

        });
    } catch (err) {
        res.redirect('admin-login');
        // console.error(err);
        // res.status(500).send('An error occurred');
    }
});
router.get('/discussion/:getcountryname', checkCookieValue, async (req, res) => {
    var getcountryname = req.params.getcountryname;
    let currentUserData = JSON.parse(req.userData);

    const apiKey = process.env.GEO_LOCATION_API_KEY;
    //console.log("apiKey", apiKey);

    let country_name = req.cookies.countryName || 'India';
    let country_code = req.cookies.countryCode || 'IN';

    console.log("country_names", country_name);
    console.log("country_codes", country_code);

    if (req.cookies.countryCode !== 'All') {
        const new_country_code_query = `SELECT shortname FROM countries WHERE name="${country_name}"`;
        const new_country_code_val = await queryAsync(new_country_code_query);
        console.log("new_country_code_val", new_country_code_val);
        var new_country_code = new_country_code_val[0].shortname;
        console.log("new_country_code", new_country_code);
    
        var [globalPageMeta, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getAllViewedDiscussion, getPopularTags, getCountries] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllLatestDiscussion(20, country_name),
            comFunction2.getAllPopularDiscussion(country_name),
            comFunction2.getAllDiscussion(country_name),
            comFunction2.getAllViewedDiscussion(country_name),
            // comFunction2.getAllLatestDiscussion(20),
            // comFunction2.getAllPopularDiscussion(),
            // comFunction2.getAllDiscussion(),
            comFunction2.getAllViewedDiscussion(country_name),
            comFunction2.getPopularTags(20),
            comFunction.getCountries(),
        ]);
    }else{
        var [globalPageMeta, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getAllViewedDiscussion, getPopularTags, getCountries] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllLatestDiscussion(20),
            comFunction2.getAllPopularDiscussion(),
            comFunction2.getAllDiscussion(),
            comFunction2.getAllViewedDiscussion(),
            // comFunction2.getAllLatestDiscussion(20),
            // comFunction2.getAllPopularDiscussion(),
            // comFunction2.getAllDiscussion(),
            comFunction2.getAllViewedDiscussion(),
            comFunction2.getPopularTags(20),
            comFunction.getCountries(),
        ]);
    }
    //console.log(getAllLatestDiscussion);
    console.log("getPopularTags",getPopularTags);
    try {
        // res.json( {
        //     menu_active_id: 'discussion',
        //     page_title: 'Discussions',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     AllLatestDiscussion: getAllLatestDiscussion,
        //     AllPopularDiscussion: getAllPopularDiscussion,
        //     AllDiscussions: getAllDiscussions,
        //     AllViewedDiscussion: getAllViewedDiscussion,
        //     PopularTags: getPopularTags

        // });
        res.render('front-end/country_discussion', {
            menu_active_id: 'discussion',
            page_title: 'Queries',
            currentUserData,
            globalPageMeta: globalPageMeta,
            AllLatestDiscussion: getAllLatestDiscussion,
            AllPopularDiscussion: getAllPopularDiscussion,
            AllDiscussions: getAllDiscussions,
            AllViewedDiscussion: getAllViewedDiscussion,
            PopularTags: getPopularTags,
            getCountries: getCountries

        });
    } catch (err) {
        res.redirect('admin-login');
        // console.error(err);
        // res.status(500).send('An error occurred');
    }
});

//Discussion page
router.get('/translate', async (req, res) => {
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    try {
        res.render('front-end/translate', {
            menu_active_id: 'translate',
            page_title: 'translate',
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


//Discussion Details page
// router.get('/discussion-details/:discussion_id', checkCookieValue, async (req, res) => {
//     let currentUserData = JSON.parse(req.userData);
//     console.log("currentUserData",currentUserData);

//     if (currentUserData !== null) {
//         const numProperties = Object.keys(currentUserData).length;
//         console.log(`Number of properties: ${numProperties}`);
//     } else {
//         console.log('currentUserData is null.');
//     }
//     const discussion_id = req.params.discussion_id;
//     const [globalPageMeta, insertDiscussionResponse, getAllCommentByDiscusId, getAllDiscussions, getcommentvoting, getUserLikedComments] = await Promise.all([
//         comFunction2.getPageMetaValues('global'),
//         comFunction2.insertDiscussionResponse(discussion_id,  requestIp.getClientIp(req)),
//         comFunction2.getAllCommentByDiscusId(discussion_id),
//         comFunction2.getAllDiscussion(),
//         comFunction2.getcommentsCount(discussion_id),
//         comFunction2.getUserLikedComments(discussion_id,user_ID)
//     ]);
//     console.log("getcommentvoting",getcommentvoting);
//     console.log("getUserLikedComments",getUserLikedComments);
//     try {
//         // res.json( {
//         //     menu_active_id: 'discussion-details',
//         //     page_title: 'Comments',
//         //     currentUserData,
//         //     globalPageMeta:globalPageMeta,
//         //     commentID:insertDiscussionResponse,
//         //     AllCommentByDiscusId:getAllCommentByDiscusId,
//         //     AllDiscussions:getAllDiscussions
//         // });
//         res.render('front-end/discussion-details', {
//             menu_active_id: 'discussion-details',
//             page_title: 'Queries',
//             currentUserData,
//             globalPageMeta:globalPageMeta,
//             commentID:insertDiscussionResponse,
//             AllCommentByDiscusId:getAllCommentByDiscusId,
//             AllDiscussions:getAllDiscussions,
//             getcommentvoting: getcommentvoting,
//             userLikedComments: getUserLikedComments
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('An error occurred');
//     }
// });

router.get('/discussion-details/:discussion_id', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    console.log("currentUserData", currentUserData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    try {
        const discussion_id = req.params.discussion_id;
        const [globalPageMeta, insertDiscussionResponse, getAllCommentByDiscusId, getAllDiscussions, getcommentvoting, getUserLikedComments] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.insertDiscussionResponse(discussion_id, requestIp.getClientIp(req)),
            comFunction2.getAllCommentByDiscusId(discussion_id),
            comFunction2.getAllDiscussion(),
            comFunction2.getcommentsCount(discussion_id),
            currentUserData !== null ? comFunction2.getUserLikedComments(discussion_id, currentUserData.user_id) : null
        ]);

        console.log("getcommentvoting", getcommentvoting);
        console.log("getUserLikedComments", getUserLikedComments);
        console.log("getAllCommentByDiscusId", getAllCommentByDiscusId);

        try {
            // res.json( {
            //     menu_active_id: 'discussion-details',
            //     page_title: 'Comments',
            //     currentUserData,
            //     globalPageMeta:globalPageMeta,
            //     commentID:insertDiscussionResponse,
            //     AllCommentByDiscusId:getAllCommentByDiscusId,
            //     AllDiscussions:getAllDiscussions
            // });
            res.render('front-end/discussion-details', {
                menu_active_id: 'discussion-details',
                page_title: 'Queries',
                currentUserData,
                globalPageMeta: globalPageMeta,
                commentID: insertDiscussionResponse,
                AllCommentByDiscusId: getAllCommentByDiscusId,
                AllDiscussions: getAllDiscussions,
                getcommentvoting: getcommentvoting,
                userLikedComments: getUserLikedComments
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred');
        }

        // res.render('front-end/discussion-details', {
        //     menu_active_id: 'discussion-details',
        //     page_title: 'Queries',
        //     currentUserData,
        //     globalPageMeta,
        //     commentID: insertDiscussionResponse,
        //     AllCommentByDiscusId,
        //     AllDiscussions,
        //     getcommentvoting,
        //     userLikedComments: getUserLikedComments
        // });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


//Discussion Details page
router.get('/similar-discussions/:tag', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const tag = req.params.tag;
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    const [globalPageMeta, getDiscussionListingByTag] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getDiscussionListingByTag(tag),
    ]);
    try {
        // res.json( {
        //     menu_active_id: 'similler-discussions',
        //     page_title: 'Similler Discussions',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     DiscussionListingByTag:getDiscussionListingByTag
        // });
        res.render('front-end/similler-discussions', {
            menu_active_id: 'similar-discussions',
            page_title: 'Similar Discussions',
            currentUserData,
            globalPageMeta: globalPageMeta,
            DiscussionListingByTag: getDiscussionListingByTag
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Survey page
router.get('/:slug/survey/:id', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const survey_uniqueid = req.params.id;
    //console.log('aaaaaaaaaaaaa')
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);
    try {
        const [globalPageMeta, company, companySurveyQuestions, AllRatingTags, companySurveyAnswersByUser] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction.getCompany(companyId),
            comFunction.getCompanySurveyQuestions(survey_uniqueid, companyId),
            comFunction.getAllRatingTags(),
            comFunction.getCompanySurveyAnswersByUser(survey_uniqueid, currentUserData.user_id),
        ]);
        if (companySurveyQuestions.length > 0) {
            // res.json({
            //     menu_active_id: 'survey',
            //     page_title: 'Survey',
            //     currentUserData,
            //     globalPageMeta:globalPageMeta,
            //     company:company,
            //     companySurveyQuestions,
            //     AllRatingTags,
            //     companySurveyAnswersByUser
            // });
            res.render('front-end/survey', {
                menu_active_id: 'survey',
                page_title: 'Survey',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companySurveyQuestions,
                AllRatingTags,
                companySurveyAnswersByUser
            });
        } else {
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: globalPageMeta
            });
        }
    } catch (err) {
        res.redirect('/');
    }
});

//Invited Survey page
router.get('/:slug/survey/:id/:email', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    console.log("currentUserData", currentUserData);
    res.locals.globalData = {
        BLOG_URL: process.env.BLOG_URL,
        MAIN_URL: process.env.MAIN_URL,
        // Add other variables as needed
    };
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const survey_uniqueid = req.params.id;
    const encryptEmail = req.params.email;
    console.log("encryptEmail", encryptEmail);

    const [globalPageMeta, company, companySurveyQuestions, AllRatingTags, getSurveyInvitedEmail] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanySurveyQuestions(survey_uniqueid, companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getSurveyInvitedEmail(encryptEmail),
    ]);
    //console.log('/:slug/survey/:id/:email')

    //const user_existance_query = await query(`SELECT emails FROM suvey_invitation_details WHERE encrypted_email = "${encryptEmail}"`);
    //const user_email = user_existance_query[0].emails;
    //console.log("user_email",user_email);

    // if(user_email){
    //     var userData = await query(`SELECT * FROM users WHERE email = "${user_email}"`);
    //     //console.log("userData",userData);
    // }

    console.log("SurveyInvitedEmail", getSurveyInvitedEmail);
    const emailss = getSurveyInvitedEmail[0].emails;
    console.log("emailss", emailss);

    try {

        //console.log('getSurveyInvitedEmail', getSurveyInvitedEmail,companySurveyQuestions);
        if (companySurveyQuestions.length > 0 && getSurveyInvitedEmail.length > 0) {
            const userEmail = getSurveyInvitedEmail[0].emails;
            console.log("userEmail", userEmail);
            // res.json( {
            //     menu_active_id: 'survey-invitation',
            //     page_title: 'Invited Survey',
            //     currentUserData,
            //     globalPageMeta:globalPageMeta,
            //     company:company,
            //     companySurveyQuestions,
            //     AllRatingTags,
            //     SurveyInvitedEmail : getSurveyInvitedEmail
            // });

            res.render('front-end/survey-invitation', {
                menu_active_id: 'survey-invitation',
                page_title: 'Invited Survey',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companySurveyQuestions,
                AllRatingTags,
                SurveyInvitedEmail: getSurveyInvitedEmail,
                userEmail
                //userData
            });
        } else {
            //console.log('catch AAAAAAAAAAAAA')
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: globalPageMeta
            });
        }
    } catch (err) {
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
});

//Create Survey page
router.get('/create-survey/:slug', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;

    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    const currentDate = new Date();
    // Get the day, month, and year components
    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1; // Note: Months are zero-based
    const year = currentDate.getFullYear();
    const formattedDate = `${day < 10 ? '0' : ''}${day}/${month < 10 ? '0' : ''}${month}/${year}`;


    const [globalPageMeta, company, allRatingTags, companyReviewNumbers, allCompanyReviews, allCompanyReviewTags, PremiumCompanyData, reviewTagsCount, CompanySurveyDetails, CompanySurveySubmitionsCount] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getAllRatingTags(),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllReviewsByCompanyID(companyId),
        comFunction2.getAllReviewTags(),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.reviewTagsCountByCompanyID(companyId),
        comFunction.getCompanySurveyDetails(companyId),
        comFunction.getCompanySurveySubmitionsCount()
    ]);

    let facebook_url = '';
    let twitter_url = '';
    let instagram_url = '';
    let linkedin_url = '';
    let youtube_url = '';

    if (typeof PremiumCompanyData !== 'undefined') {
        facebook_url = PremiumCompanyData.facebook_url;
        twitter_url = PremiumCompanyData.twitter_url;
        instagram_url = PremiumCompanyData.instagram_url;
        linkedin_url = PremiumCompanyData.linkedin_url;
        youtube_url = PremiumCompanyData.youtube_url;
    }

    const reviewTagsMap = {};
    allCompanyReviewTags.forEach(tag => {
        if (!reviewTagsMap[tag.review_id]) {
            reviewTagsMap[tag.review_id] = [];
        }
        reviewTagsMap[tag.review_id].push({ review_id: tag.review_id, tag_name: tag.tag_name });
    });
    // Merge allReviews with their associated tags
    const finalCompanyallReviews = allCompanyReviews.map(review => {
        return {
            ...review,
            Tags: reviewTagsMap[review.id] || []
        };
    });

    const xValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    const reviewReatingChartArray = xValues.map(xValue => {
        const matchingItem = companyReviewNumbers.rewiew_rating_count.find(item => item.rating === xValue);
        const yValue = matchingItem ? matchingItem.cnt_rat : 0;
        return { x: xValue, y: yValue, color: '#F8A401' };
    });

    const companyPaidStatus = company.paid_status.trim();;
    if (companyPaidStatus == 'free') {
        res.redirect('/');
    } else {
        const submitionsCountMap = CompanySurveySubmitionsCount.reduce((map, item) => {
            map[item.survey_unique_id] = item;
            return map;
        }, {});

        const CompanySurveyDetails_formatted = CompanySurveyDetails.map(detail => ({
            ...detail,
            ...(submitionsCountMap[detail.unique_id] || {}) // Add submitionsCount if it exists
        }));
        // res.json(
        // { 
        //     menu_active_id: 'survey',
        //     page_title: 'Create Survey',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     allRatingTags,
        //     formattedDate,
        //     companyReviewNumbers,
        //     finalCompanyallReviews,
        //     reviewReatingChartArray,
        //     reviewTagsCount,
        //     reviewReatingChartArray,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     CompanySurveyDetails_formatted
        // });

        res.render('front-end/premium-company-create-survey',
            {
                menu_active_id: 'survey',
                page_title: 'Create Survey',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company,
                allRatingTags,
                formattedDate,
                companyReviewNumbers,
                finalCompanyallReviews,
                reviewReatingChartArray,
                reviewTagsCount,
                reviewReatingChartArray,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url,
                CompanySurveyDetails_formatted
            });
    }
});

//Create Survey page
router.get('/update-survey/:slug/:survey_id', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const surveyUniqueId = req.params.survey_id;

    const currentDate = new Date();
    // Get the day, month, and year components
    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1; // Note: Months are zero-based
    const year = currentDate.getFullYear();
    const formattedDate = `${day < 10 ? '0' : ''}${day}/${month < 10 ? '0' : ''}${month}/${year}`;


    const [globalPageMeta, company, allRatingTags, companyReviewNumbers, allCompanyReviews, allCompanyReviewTags, PremiumCompanyData, reviewTagsCount, CompanySurveyDetails, CompanySurveySubmitionsCount, SurveyAnswerCount, getSurveyemailDetailsByUniqueId] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getAllRatingTags(),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllReviewsByCompanyID(companyId),
        comFunction2.getAllReviewTags(),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.reviewTagsCountByCompanyID(companyId),
        comFunction2.getSurveyDetailsByUniqueId(surveyUniqueId),
        comFunction.getCompanySurveySubmitionsCount(),
        comFunction2.countSurveyAnswerByUniqueId(surveyUniqueId),
        comFunction2.getSurveyemailDetailsByUniqueId(surveyUniqueId)
    ]);
    console.log('SurveyAnswerCount', SurveyAnswerCount);
    console.log("getSurveyemailDetailsByUniqueId",getSurveyemailDetailsByUniqueId);

    var emailAddresses = getSurveyemailDetailsByUniqueId.map(function(item) {
        return item.emails;
    });
    var jsonStringa = JSON.stringify(emailAddresses);
    console.log("jsonStringa",jsonStringa);
    

    let facebook_url = '';
    let twitter_url = '';
    let instagram_url = '';
    let linkedin_url = '';
    let youtube_url = '';

    if (typeof PremiumCompanyData !== 'undefined') {
        facebook_url = PremiumCompanyData.facebook_url;
        twitter_url = PremiumCompanyData.twitter_url;
        instagram_url = PremiumCompanyData.instagram_url;
        linkedin_url = PremiumCompanyData.linkedin_url;
        youtube_url = PremiumCompanyData.youtube_url;
    }

    const reviewTagsMap = {};
    allCompanyReviewTags.forEach(tag => {
        if (!reviewTagsMap[tag.review_id]) {
            reviewTagsMap[tag.review_id] = [];
        }
        reviewTagsMap[tag.review_id].push({ review_id: tag.review_id, tag_name: tag.tag_name });
    });
    // Merge allReviews with their associated tags
    const finalCompanyallReviews = allCompanyReviews.map(review => {
        return {
            ...review,
            Tags: reviewTagsMap[review.id] || []
        };
    });

    const xValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    const reviewReatingChartArray = xValues.map(xValue => {
        const matchingItem = companyReviewNumbers.rewiew_rating_count.find(item => item.rating === xValue);
        const yValue = matchingItem ? matchingItem.cnt_rat : 0;
        return { x: xValue, y: yValue, color: '#F8A401' };
    });

    const companyPaidStatus = company.paid_status.trim();
    if (companyPaidStatus == 'free') {
        res.redirect('/');
    } else {
        const submitionsCountMap = CompanySurveySubmitionsCount.reduce((map, item) => {
            map[item.survey_unique_id] = item;
            return map;
        }, {});

        const CompanySurveyDetails_formatted = CompanySurveyDetails.map(detail => ({
            ...detail,
            ...(submitionsCountMap[detail.unique_id] || {}) // Add submitionsCount if it exists
        }));

        console.log("CompanySurveyDetails_formatted",CompanySurveyDetails_formatted);
        
        // res.json(
        // { 
        //     menu_active_id: 'survey',
        //     page_title: 'Create Survey',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     allRatingTags,
        //     formattedDate,
        //     companyReviewNumbers,
        //     finalCompanyallReviews,
        //     reviewReatingChartArray,
        //     reviewTagsCount,
        //     reviewReatingChartArray,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     CompanySurveyDetails_formatted
        // });

        res.render('front-end/premium-company-update-survey',
            {
                menu_active_id: 'survey',
                page_title: 'Update Survey',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company,
                allRatingTags,
                formattedDate,
                companyReviewNumbers,
                finalCompanyallReviews,
                reviewReatingChartArray,
                reviewTagsCount,
                reviewReatingChartArray,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url,
                CompanySurveyDetails_formatted,
                SurveyAnswerCount,
                jsonStringa: jsonStringa
            });
    }
});

//Company Survey Submissions
router.get('/survey-submissions/:slug/:survey_id', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const survey_unique_id = req.params.survey_id;

    const [globalPageMeta, company, CompanySurveyDetails, companySurveySubmissions, AllRatingTags, getCompanySurveyDetailsByID, getsurveyratingData] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanySurveyDetailsBySurveyID(survey_unique_id),
        comFunction.getCompanySurveySubmissions(companyId, survey_unique_id),
        comFunction.getAllRatingTags(),
        comFunction2.getCompanySurveyDetailsByID(survey_unique_id),
        comFunction2.getsurveyratingData(survey_unique_id)
        //comFunction.getcompanysurveysubmission(companyId, survey_unique_id)
    ]);
    //console.log("companySurveySubmissions:", companySurveySubmissions);
    console.log("getsurveyratingData", getsurveyratingData);

    CompanySurveyDetails.forEach(item => {
        item.questions = JSON.parse(item.questions);
    });

    console.log(typeof companySurveySubmissions);
    //console.log("companySurveySubmissions",companySurveySubmissions);

    companySurveySubmissions.forEach(item => {
        item.answer = JSON.parse(item.answer);
    });




    // if (Array.isArray(companySurveySubmissions)) {
    //     // If it's an array, then proceed with forEach
    //     companySurveySubmissions.forEach(item => {
    //         item.answer = JSON.parse(item.answer);
    //     });
    // } else {
    //     // Log an error or handle the case where it's not an array
    //     console.error('companySurveySubmissions is not an array:', companySurveySubmissions);
    // }


    //
    // try {
    //     if (Array.isArray(getcompanysurveysubmission)) {
    //         getcompanysurveysubmission.forEach(item => {
    //             item.answer = JSON.parse(item.answer);
    //         });
    //     } else {
    //         console.error('getcompanysurveysubmission is not an array:', getcompanysurveysubmission);
    //     }
    // } catch (error) {
    //     console.error('Error parsing getcompanysurveysubmission answer:', error);
    // }

    const companyPaidStatus = company.paid_status.trim();
    if (companyPaidStatus == 'free') {
        res.redirect('/');
    } else {
        // res.json( {
        //     menu_active_id: 'survey-submissions',
        //     page_title: 'Survey Submissions',
        //     currentUserData,
        //     company,
        //     AllRatingTags,
        //     CompanySurveyDetails,
        //     companySurveySubmissions,
        //     globalPageMeta:globalPageMeta
        // });
        res.render('front-end/survey-submissions', {
            menu_active_id: 'survey-submissions',
            page_title: 'Survey Submissions',
            currentUserData,
            company,
            AllRatingTags,
            CompanySurveyDetails,
            companySurveySubmissions,
            getCompanySurveyDetailsByID,
            getsurveyratingData,
            //getcompanysurveysubmission,
            globalPageMeta: globalPageMeta
        });
    }
});

//Survey page
router.get('/survey-submission-details/:slug/:survey_uniqueid/:submission_id', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const survey_uniqueid = req.params.survey_uniqueid;
    const survey_submission_id = req.params.submission_id;

    try {
        const [globalPageMeta, company, companySurveyQuestions, AllRatingTags, companySurveyAnswersByID] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction.getCompany(companyId),
            comFunction.getCompanySurveyQuestions(survey_uniqueid, companyId),
            comFunction.getAllRatingTags(),
            comFunction.getCompanySurveyAnswersByID(survey_submission_id),
        ]);
        if (companySurveyQuestions.length > 0) {
            // res.json({
            //     menu_active_id: 'survey',
            //     page_title: 'Survey',
            //     currentUserData,
            //     globalPageMeta:globalPageMeta,
            //     company:company,
            //     companySurveyQuestions,
            //     AllRatingTags,
            //     companySurveyAnswersByID
            // });
            res.render('front-end/survey-submission-details', {
                menu_active_id: 'survey',
                page_title: 'Survey',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companySurveyQuestions,
                AllRatingTags,
                companySurveyAnswersByID
            });
        } else {
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: globalPageMeta
            });
        }
    } catch (err) {
        res.redirect('/');
    }
});







//permium complain alert page
router.get('/premium-alert', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {

        res.render('front-end/premium-alert', {
            menu_active_id: 'premium-alert',
            page_title: 'Dashboard',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//permium create category page
router.get('/premium-create-category', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {

        res.render('front-end/premium-create-category', {
            menu_active_id: 'premium-create-category',
            page_title: 'Create Category',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//basic create category page
router.get('/basic-create-category', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {

        res.render('front-end/basic-create-category', {
            menu_active_id: 'basic-create-category',
            page_title: 'Create Category',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//premium company-complain-details
router.get('/premium-company-complain-details', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {

        res.render('front-end/premium-company-complain-details', {
            menu_active_id: 'premium-company-complain-details',
            page_title: 'Company Complain',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//basic company-complain-details
router.get('/basic-company-complain-details', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {

        res.render('front-end/basic-company-complain-details', {
            menu_active_id: 'basic-company-complain-details',
            page_title: 'Company Complain',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//premium customer-complain-details
router.get('/premium-customer-complain-details', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {

        res.render('front-end/premium-customer-complain-details', {
            menu_active_id: 'premium-customer-complain-details',
            page_title: 'Customer Complain',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//basic customer-complain-details
router.get('/basic-customer-complain-details', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {

        res.render('front-end/basic-customer-complain-details', {
            menu_active_id: 'basic-customer-complain-details',
            page_title: 'Customer Complain',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});


//-----------------------------------------------------------------//



// Middleware function to check if user is Claimed a Company or not
async function checkClientClaimedCompany(req, res, next) {
    res.locals.globalData = {
        BLOG_URL: process.env.BLOG_URL,
        MAIN_URL: process.env.MAIN_URL,
        // Add other variables as needed
    };

    //const userId = UserJsonData.user_id;
    //try {

    // if (req.cookies.user) {
    //     const encodedUserData = req.cookies.user;
    //     const UserJsonData = JSON.parse(encodedUserData);
    //     if (UserJsonData && UserJsonData.claimed_comp_slug == req.params.slug) {
    //         next();
    //     } else {
    //         res.redirect('/logout');
    //     }

    // } else {
    //     res.redirect('/');
    // }
    if (req.cookies.user) {
        const encodedUserData = req.cookies.user;
        console.log("encodedUserData",encodedUserData);
        const UserJsonData = JSON.parse(encodedUserData);
        console.log("UserJsonData",UserJsonData);

        if (UserJsonData && UserJsonData.claimed_comp_slug == req.params.slug || UserJsonData.emails == UserJsonData.email) {
            next();
        }else{
            res.redirect('/logout');
        }
        
    } else {
        res.redirect('/');
    }
    // } catch (err) {
    //     console.error(err);
    //     res.status(500).send('An error occurred');
    // }
}
//Basic company profile dashboard Page 
router.get('/company-dashboard/:slug', checkClientClaimedCompany, async (req, res) => {

    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    //let currentUserData = JSON.parse(req.userData);
    const slug = req.params.slug;
    console.log("slugs", slug);
    console.log("currentUserData", currentUserData);

    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const userId = currentUserData.user_id;
    const companyId = comp_res.ID;
    const [globalPageMeta, company, companyReviewNumbers, allRatingTags, allCompanyReviews, allCompanyReviewTags, PremiumCompanyData, reviewTagsCount, TotalReplied, getCompanyReviewsBetween, getCompanyHistoricalReviewBetween, getSimilarCompany] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction.getAllReviewsByCompanyID(companyId),
        comFunction2.getAllReviewTags(),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.reviewTagsCountByCompanyID(companyId),
        comFunction2.TotalReplied(userId),
        comFunction.getCompanyReviewsBetween(companyId),
        comFunction2.getCompanyHistoricalReviewBetween(companyId),
        comFunction2.getSimilarCompany(companyId),
    ]);
    //console.log('getSimilarCompany:', getSimilarCompany);

    const productGraphData = allCompanyReviews.map(entry => ({
        name: (entry.review_title && entry.review_title.trim() !== '') ? entry.review_title : 'General',
        new_name: (entry.review_title ? entry.review_title.replace(/\s/g, '').toLowerCase() : '')
    }))

    const countMap = productGraphData.reduce((acc, entry) => {
        const { name, new_name } = entry;

        if (!acc[new_name]) {
            acc[new_name] = { name, count: 1 };
        } else {
            acc[new_name].count += 1;
        }

        return acc;
    }, {});

    const productGraphArray = Object.values(countMap);

    //console.log(productGraphData);
    // Transform the fetched data to match the chart's data structure
    const CompanyHistoricalReviewData = getCompanyHistoricalReviewBetween.map(entry => ({
        x: new Date(entry.created_at).toISOString().split('T')[0],
        y: entry.average_rating
    }));

    //console.log('CompanyHistoricalReviewData', CompanyHistoricalReviewData)

    let facebook_url = '';
    let twitter_url = '';
    let instagram_url = '';
    let linkedin_url = '';
    let youtube_url = '';

    if (typeof PremiumCompanyData !== 'undefined') {
        facebook_url = PremiumCompanyData.facebook_url;
        twitter_url = PremiumCompanyData.twitter_url;
        instagram_url = PremiumCompanyData.instagram_url;
        linkedin_url = PremiumCompanyData.linkedin_url;
        youtube_url = PremiumCompanyData.youtube_url;
    }

    const reviewTagsMap = {};
    allCompanyReviewTags.forEach(tag => {
        if (!reviewTagsMap[tag.review_id]) {
            reviewTagsMap[tag.review_id] = [];
        }
        reviewTagsMap[tag.review_id].push({ review_id: tag.review_id, tag_name: tag.tag_name });
    });
    // Merge allReviews with their associated tags
    const finalCompanyallReviews = allCompanyReviews.map(review => {
        return {
            ...review,
            Tags: reviewTagsMap[review.id] || []
        };
    });

    const xValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    const reviewReatingChartArray = xValues.map(xValue => {
        const matchingItem = companyReviewNumbers.rewiew_rating_count.find(item => item.rating === xValue);
        const yValue = matchingItem ? matchingItem.cnt_rat : 0;
        return { x: xValue, y: yValue, color: '#F8A401' };
    });

    const companyPaidStatus = company.paid_status.trim();
    //console.log(companyPaidStatus);
    if (companyPaidStatus == 'free') {
        // res.json(
        // { 
        //     menu_active_id: 'company-dashboard', 
        //     page_title: 'Company Dashboard', 
        //     currentUserData, 
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     companyReviewNumbers,
        //     allRatingTags,
        //     finalCompanyallReviews,
        //     reviewReatingChartArray,
        //     reviewTagsCount,
        //     TotalReplied:TotalReplied
        // });
        res.render('front-end/basic-company-profile-dashboard',
            {
                menu_active_id: 'company-dashboard',
                page_title: 'Organization Dashboard',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company,
                companyReviewNumbers,
                allRatingTags,
                finalCompanyallReviews,
                reviewReatingChartArray,
                reviewTagsCount,
                TotalReplied: TotalReplied,
                productGraphArray: productGraphArray,
            });
    } else {
        // res.json(
        // { 
        //     menu_active_id: 'company-dashboard', 
        //     page_title: 'Company Dashboard', 
        //     currentUserData, 
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     companyReviewNumbers,
        //     CompanyReviewsBetween:getCompanyReviewsBetween,
        //     allRatingTags,
        //     finalCompanyallReviews,
        //     reviewReatingChartArray,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     reviewTagsCount,
        //     TotalReplied:TotalReplied,
        //     CompanyHistoricalReviewData:CompanyHistoricalReviewData,
        //     productGraphArray:productGraphArray,
        //    getSimilarCompany:getSimilarCompany
        // });
        res.render('front-end/premium-company-profile-dashboard',
            {
                menu_active_id: 'company-dashboard',
                page_title: 'Organization Dashboard',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company,
                companyReviewNumbers,
                CompanyReviewsBetween: getCompanyReviewsBetween,
                allRatingTags,
                finalCompanyallReviews,
                reviewReatingChartArray,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url,
                reviewTagsCount,
                TotalReplied: TotalReplied,
                CompanyHistoricalReviewData: CompanyHistoricalReviewData,
                productGraphArray: productGraphArray,
                getSimilarCompany: getSimilarCompany
            });
    }
});

//company dashboard management Page 
router.get('/company-profile-management/:slug', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    //const companyId = req.params.compID;

    const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, getCompanyReviews, allRatingTags] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getCompanyReviews(companyId),
        comFunction.getAllRatingTags(),
    ]);

    const companyPaidStatus = company.paid_status.trim();
    if (companyPaidStatus == 'free') {
        let gallery_img = [];
        if (typeof PremiumCompanyData !== 'undefined') {
            gallery_img = JSON.parse(PremiumCompanyData.gallery_img);
        }
        //    res.json( 
        //    { 
        //        menu_active_id: 'company-profile-management', 
        //        page_title: 'Profile Management', 
        //        currentUserData, 
        //        globalPageMeta:globalPageMeta,
        //        company:company,
        //        companyReviewNumbers,
        //        getCompanyReviews,
        //        allRatingTags,
        //        gallery_img:gallery_img
        //    });     
        res.render('front-end/basic-company-profile-management',
            {
                menu_active_id: 'company-profile-management',
                page_title: 'Profile Management',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                getCompanyReviews,
                allRatingTags,
                gallery_img: gallery_img
            });
    } else {
        let cover_img = '';
        let youtube_iframe = '';
        let gallery_img = [];
        let product = [];
        let promotions = [];
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';
        let support_data = {};

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            youtube_iframe = PremiumCompanyData.youtube_iframe;
            gallery_img = JSON.parse(PremiumCompanyData.gallery_img);
            product = JSON.parse(PremiumCompanyData.products);
            promotions = JSON.parse(PremiumCompanyData.promotions);
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
            support_data = { support_email: PremiumCompanyData.support_email, escalation_one: PremiumCompanyData.escalation_one, escalation_two: PremiumCompanyData.escalation_two, escalation_three: PremiumCompanyData.escalation_three }
        }

        res.render('front-end/premium-company-profile-management',
            {
                menu_active_id: 'company-profile-management',
                page_title: 'Profile Management',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                cover_img: cover_img,
                gallery_img: gallery_img,
                youtube_iframe: youtube_iframe,
                products: product,
                promotions: promotions,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url,
                support_data: support_data,
                companyReviewNumbers,
                getCompanyReviews,
                allRatingTags
            });
    }
});


router.get('/header-ej', async (req, res) => {
    const encodedUserData = req.cookies.user;
    console.log("encodedUserData", encodedUserData);
    const currentUserData = JSON.parse(encodedUserData);
    const apiKey = process.env.GEO_LOCATION_API_KEY;
    console.log("apiKey", apiKey);

    res.locals.globalData = {
        BLOG_URL: process.env.BLOG_URL,
        MAIN_URL: process.env.MAIN_URL,
        // Add other variables as needed
    };

    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    console.log("apiKey-------", apiKey);
    res.render('front-end/common/header',
        {
            menu_active_id: 'company-profile-management',
            page_title: 'Profile Management',
            currentUserData,
            globalPageMeta: globalPageMeta,
            myData: "sudipta"
        });
});


//company dashboard Review listing Page 
router.get('/company-review-listing/:slug', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    //const companyId = req.params.compID;
    const [globalPageMeta, company, allReviews, allReviewTags, companyReviewNumbers, getCompanyReviews, allRatingTags, PremiumCompanyData] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction2.getAllReviewsByCompanyID(companyId),
        comFunction2.getAllReviewTags(),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getCompanyReviews(companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getPremiumCompanyData(companyId)
    ]);

    const reviewTagsMap = {};
    allReviewTags.forEach(tag => {
        if (!reviewTagsMap[tag.review_id]) {
            reviewTagsMap[tag.review_id] = [];
        }
        reviewTagsMap[tag.review_id].push({ review_id: tag.review_id, tag_name: tag.tag_name });
    });
    // Merge allReviews with their associated tags
    const finalallReviews = allReviews.map(review => {
        return {
            ...review,
            Tags: reviewTagsMap[review.id] || []
        };
    });
    const companyPaidStatus = company.paid_status.trim();;
    if (companyPaidStatus == 'free') {
        res.render('front-end/basic-company-dashboard-review-listing',
            {
                menu_active_id: 'company-review-listing',
                page_title: 'Review Listing',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                finalallReviews,
                companyReviewNumbers,
                getCompanyReviews,
                allRatingTags
            });
    } else {
        let cover_img = '';
        let youtube_iframe = '';
        let gallery_img = [];
        let product = [];
        let promotions = [];
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            youtube_iframe = PremiumCompanyData.youtube_iframe;
            gallery_img = JSON.parse(PremiumCompanyData.gallery_img);
            product = JSON.parse(PremiumCompanyData.products);
            promotions = JSON.parse(PremiumCompanyData.promotions);
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        res.render('front-end/premium-company-dashboard-review-listing',
            {
                menu_active_id: 'company-review-listing',
                page_title: 'Review Listing',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                finalallReviews,
                companyReviewNumbers,
                getCompanyReviews,
                allRatingTags,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url
            });
        // res.json(
        // {
        //     menu_active_id: 'company-review-listing',
        //     page_title: 'Review Listing',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company:company,
        //     finalallReviews,
        //     companyReviewNumbers,
        //     getCompanyReviews,
        //     allRatingTags,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url
        // });
    }
});

//company dashboard Review replay Page 
router.get('/company-dashboard-review-replay/:slug/:reviewID', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    //let currentUserData = JSON.parse(req.userData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    //const companyId = req.params.compID;
    const reviewId = req.params.reviewID;
    const [globalPageMeta, company, companyReviewNumbers, allRatingTags, allCompanyReviews, allCompanyReviewTags, singleReviewData, singleReviewReplyData, PremiumCompanyData] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction.getAllReviewsByCompanyID(companyId),
        comFunction2.getAllReviewTags(),
        comFunction.getReviewByID(reviewId),
        comFunction.getReviewReplyDataByID(reviewId),
        comFunction2.getPremiumCompanyData(companyId),
    ]);

    const reviewTagsMap = {};
    allCompanyReviewTags.forEach(tag => {
        if (!reviewTagsMap[tag.review_id]) {
            reviewTagsMap[tag.review_id] = [];
        }
        reviewTagsMap[tag.review_id].push({ review_id: tag.review_id, tag_name: tag.tag_name });
    });
    // Merge allReviews with their associated tags
    const finalsingleReviewData = singleReviewData.map(review => {
        return {
            ...review,
            Tags: reviewTagsMap[review.id] || []
        };
    });

    const companyPaidStatus = company.paid_status.trim();;
    //console.log(companyPaidStatus);
    if (companyPaidStatus == 'free') {
        if (Array.isArray(singleReviewData) && singleReviewData.length > 0) {
            if (Array.isArray(singleReviewData) && singleReviewData[0].company_owner == currentUserData.user_id && singleReviewData[0].company_id == company.ID) {
                res.render('front-end/basic-company-review-replay',
                    {
                        menu_active_id: 'company-review-listing',
                        page_title: 'Company Review Replay',
                        currentUserData,
                        globalPageMeta: globalPageMeta,
                        company,
                        companyReviewNumbers,
                        allRatingTags,
                        finalsingleReviewData,
                        singleReviewReplyData
                    });
                // res.json(
                // { 
                //     menu_active_id: 'company-review-listing', 
                //     page_title: 'Company Review Replay', 
                //     currentUserData, 
                //     globalPageMeta:globalPageMeta,
                //     company,
                //     companyReviewNumbers,
                //     allRatingTags,
                //     finalsingleReviewData,
                //     singleReviewReplyData
                // });
            } else {
                res.redirect('/company-review-listing/' + company.slug);
            }
        } else {
            res.redirect('/company-review-listing/' + company.slug);
        }
    } else {
        let cover_img = '';
        let youtube_iframe = '';
        let gallery_img = [];
        let product = [];
        let promotions = [];
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            youtube_iframe = PremiumCompanyData.youtube_iframe;
            gallery_img = JSON.parse(PremiumCompanyData.gallery_img);
            product = JSON.parse(PremiumCompanyData.products);
            promotions = JSON.parse(PremiumCompanyData.promotions);
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        if (Array.isArray(singleReviewData) && singleReviewData.length > 0) {
            if (Array.isArray(singleReviewData) && singleReviewData[0].company_owner == currentUserData.user_id && singleReviewData[0].company_id == company.ID) {
                // res.json(
                // { 
                //     menu_active_id: 'company-review-listing', 
                //     page_title: 'Company Review Replay', 
                //     currentUserData, 
                //     globalPageMeta:globalPageMeta,
                //     company,
                //     companyReviewNumbers,
                //     allRatingTags,
                //     finalsingleReviewData,
                //     singleReviewReplyData,
                //     facebook_url:facebook_url,
                //     twitter_url:twitter_url,
                //     instagram_url:instagram_url,
                //     linkedin_url:linkedin_url,
                //     youtube_url:youtube_url
                // });
                res.render('front-end/premium-company-review-replay',
                    {
                        menu_active_id: 'company-review-listing',
                        page_title: 'Company Review Replay',
                        currentUserData,
                        globalPageMeta: globalPageMeta,
                        company,
                        companyReviewNumbers,
                        allRatingTags,
                        finalsingleReviewData,
                        singleReviewReplyData,
                        facebook_url: facebook_url,
                        twitter_url: twitter_url,
                        instagram_url: instagram_url,
                        linkedin_url: linkedin_url,
                        youtube_url: youtube_url
                    });
            } else {
                res.redirect('/company-review-listing/' + company.slug);
            }
        } else {
            res.redirect('/company-review-listing/' + company.slug);
        }
    }

});

//company dashboard Review replay Page 
router.get('/company-dashboard-review-flag/:slug/:reviewID', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    //let currentUserData = JSON.parse(req.userData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    //const companyId = req.params.compID;
    const reviewId = req.params.reviewID;
    const [globalPageMeta, company, companyReviewNumbers, allRatingTags, allCompanyReviews, allCompanyReviewTags, singleReviewData, singleReviewReplyData, PremiumCompanyData] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction.getAllReviewsByCompanyID(companyId),
        comFunction2.getAllReviewTags(),
        comFunction.getReviewByID(reviewId),
        comFunction.getReviewReplyDataByID(reviewId),
        comFunction2.getPremiumCompanyData(companyId),
    ]);

    const reviewTagsMap = {};
    allCompanyReviewTags.forEach(tag => {
        if (!reviewTagsMap[tag.review_id]) {
            reviewTagsMap[tag.review_id] = [];
        }
        reviewTagsMap[tag.review_id].push({ review_id: tag.review_id, tag_name: tag.tag_name });
    });
    // Merge allReviews with their associated tags
    const finalsingleReviewData = singleReviewData.map(review => {
        return {
            ...review,
            Tags: reviewTagsMap[review.id] || []
        };
    });

    const companyPaidStatus = company.paid_status.trim();;
    //console.log(companyPaidStatus);
    let cover_img = '';
    let youtube_iframe = '';
    let gallery_img = [];
    let product = [];
    let promotions = [];
    let facebook_url = '';
    let twitter_url = '';
    let instagram_url = '';
    let linkedin_url = '';
    let youtube_url = '';

    if (typeof PremiumCompanyData !== 'undefined') {
        cover_img = PremiumCompanyData.cover_img;
        youtube_iframe = PremiumCompanyData.youtube_iframe;
        gallery_img = JSON.parse(PremiumCompanyData.gallery_img);
        product = JSON.parse(PremiumCompanyData.products);
        promotions = JSON.parse(PremiumCompanyData.promotions);
        facebook_url = PremiumCompanyData.facebook_url;
        twitter_url = PremiumCompanyData.twitter_url;
        instagram_url = PremiumCompanyData.instagram_url;
        linkedin_url = PremiumCompanyData.linkedin_url;
        youtube_url = PremiumCompanyData.youtube_url;
    }
    if (Array.isArray(singleReviewData) && singleReviewData.length > 0) {
        if (Array.isArray(singleReviewData) && singleReviewData[0].company_owner == currentUserData.user_id && singleReviewData[0].company_id == company.ID) {
            res.render('front-end/premium-company-review-flag',
                {
                    menu_active_id: 'company-review-listing',
                    page_title: 'Company Review Flag',
                    currentUserData,
                    globalPageMeta: globalPageMeta,
                    company,
                    companyReviewNumbers,
                    allRatingTags,
                    finalsingleReviewData,
                    singleReviewReplyData,
                    facebook_url: facebook_url,
                    twitter_url: twitter_url,
                    instagram_url: instagram_url,
                    linkedin_url: linkedin_url,
                    youtube_url: youtube_url
                });
            // res.json( 
            // { 
            //     menu_active_id: 'company-review-listing', 
            //     page_title: 'Company Review Replay', 
            //     currentUserData, 
            //     globalPageMeta:globalPageMeta,
            //     company,
            //     companyReviewNumbers,
            //     allRatingTags,
            //     finalsingleReviewData,
            //     singleReviewReplyData,
            //     facebook_url:facebook_url,
            //     twitter_url:twitter_url,
            //     instagram_url:instagram_url,
            //     linkedin_url:linkedin_url,
            //     youtube_url:youtube_url
            // });
        } else {
            res.redirect('/company-review-listing/' + company.slug);
        }
    } else {
        res.redirect('/company-review-listing/' + company.slug);
    }

});

//company Poll Listing page
router.get('/company-poll-listing/:slug', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, CompanyPollDetails, allRatingTags] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction2.getCompanyPollDetails(companyId),
        comFunction.getAllRatingTags(),
    ]);
    //console.log(CompanyPollDetails);
    const PollDetails = CompanyPollDetails.map((row) => ({
        poll_id: row.id,
        company_id: row.company_id,
        poll_creator_id: row.poll_creator_id,
        created_at: row.created_at,
        expired_at: row.expired_at,
        question: row.question,
        poll_answer: row.poll_answer ? row.poll_answer.split(',') : [],
        poll_answer_id: row.poll_answer_id ? row.poll_answer_id.split(',') : [],
        voting_answer_id: row.voting_answer_id ? row.voting_answer_id.split(',') : [],
    }));
    console.log("PollDetails", PollDetails);
    try {
        let cover_img = '';
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json( {
        //     menu_active_id: 'company-poll-listing',
        //     page_title: 'Company Name',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     companyReviewNumbers,
        //    PollDetails,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url
        // });
        res.render('front-end/company-poll-listing', {
            menu_active_id: 'company-poll-listing',
            page_title: 'Company Name',
            currentUserData,
            globalPageMeta: globalPageMeta,
            company,
            companyReviewNumbers,
            PollDetails,
            facebook_url: facebook_url,
            twitter_url: twitter_url,
            instagram_url: instagram_url,
            linkedin_url: linkedin_url,
            youtube_url: youtube_url,
            allRatingTags
        });
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//send review invitation page
router.get('/send-review-invitation/:slug', checkClientClaimedCompany, async (req, res) => {

    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, allRatingTags, companyReviewInvitationNumbers] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction.getCompanyReviewInvitationNumbers(companyId)
    ]);

    try {
        let cover_img = '';
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json({
        //     menu_active_id: 'send-review-invitation',
        //     page_title: 'Send Review Invitation',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     companyReviewNumbers,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     allRatingTags,
        //     companyReviewInvitationNumbers
        // });
        res.render('front-end/send-review-invitation', {
            menu_active_id: 'send-review-invitation',
            page_title: 'Send Review Invitation',
            currentUserData,
            globalPageMeta: globalPageMeta,
            company,
            companyReviewNumbers,
            facebook_url: facebook_url,
            twitter_url: twitter_url,
            instagram_url: instagram_url,
            linkedin_url: linkedin_url,
            youtube_url: youtube_url,
            allRatingTags,
            companyReviewInvitationNumbers
        });
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
    /////////////////////////////////////////////////

});

//company create category Page 
router.get('/create-category/:slug', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    //const companyId = req.params.compID;
    const [globalPageMeta, company, companyReviewNumbers, PremiumCompanyData, getCompanyCategories, allRatingTags] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction2.getCompanyCategories(companyId),
        comFunction.getAllRatingTags(),
    ]);

    const companyPaidStatus = company.paid_status.trim();;
    if (companyPaidStatus == 'free') {
        res.render('front-end/basic-create-category',
            {
                menu_active_id: 'settings',
                page_title: 'Create Category',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                allRatingTags,
                CompanyCategories: getCompanyCategories
            });
    } else {
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json(
        // {
        //     menu_active_id: 'create-category',
        //     page_title: 'Create Category',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company:company,
        //     companyReviewNumbers,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     CompanyCategories:getCompanyCategories
        // });
        res.render('front-end/premium-create-category',
            {
                menu_active_id: 'settings',
                page_title: 'Create Category',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                allRatingTags,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url,
                CompanyCategories: getCompanyCategories
            });

    }
});

router.get('/get-eta-days/:companyId', async (req, res) => {
    const companyId = req.params.companyId;

    const sql = `
        SELECT DISTINCT eta_days, level
        FROM complaint_level_management
        WHERE company_id = ?
    `;

    try {
        const results = await query(sql, [companyId]); // Pass companyId as a parameter to prevent SQL injection

        if (results.length > 0) {
            res.json(results); // Return the results as a JSON array
        } else {
            res.status(404).json({ error_message: 'No data found for the given company ID' }); // No data found
        }
    } catch (error) {
        console.error('Error during fetching ETA days:', error);
        res.status(500).json({ error_message: 'An error occurred while fetching ETA days. Please try again later.' });
    }
});

router.get('/getusers/:categoryId', async (req, res) => {
    var categoryId = req.params.categoryId;
    //const getuserslistofcategory = `SELECT users.first_name,users.last_name, `
    const sql = `
            SELECT DISTINCT
            complaint_level_management.emails,
            complaint_level_management.level,
            complaint_level_management.company_id
            FROM 
              complaint_level_management
            WHERE complaint_level_management.category_id = "${categoryId}"
            `;

    try {
        const results = await query(sql);
        console.log("getusersresults", results);
        if (results.length > 0) {
            return res.json({
                status: 'ok',
                users: results,  // Use "users" key to align with client expectations
                message: 'Users fetched successfully.'
            });
        } else {
            return res.status(404).json({
                status: 'no',
                message: 'No users found.'
            });
        }
    } catch (error) {
        console.error('Error during fetch all complaint details: ', error);
        return res.status(500).json({
            status: 'error',
            message: 'Server error during fetching users.'
        });
    }

})

router.get('/getuserss/:companyId/:level/:category_id', (req, res) => {
    const { companyId, level, category_id } = req.params;

    console.log("Received parameters:", companyId, level, category_id); // Log parameters

    const sql = `
      SELECT emails
      FROM complaint_level_management
      WHERE company_id = ? AND level = ? AND category_id = ?
    `;

    db.query(sql, [companyId, level, category_id], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log("resultsss", results);

        if (results.length > 0) {
            res.json({ status: 'ok', users: results, message: 'Users fetched successfully.' });
        } else {
            res.status(404).json({ status: 'error', message: 'No data found for the given parameters.' });
        }
    });
});

router.get('/get-management-users', async (req, res) => {
    try{
        const companyId = req.query.company_id;
        const managementquery = `SELECT level_user_type FROM company_level_manage_users WHERE company_id= "${companyId}"`;
        const managementUsers = await queryAsync(managementquery);
    
        console.log("managementUsers",managementUsers);
    
        return res.json(managementUsers);

    } catch(error){
        console.error('Error while fetching data:', error);
        return res.status(500).send('Internal Server Error');
    }
})

//send survey invitation page
router.get('/new_complain/:slug', checkClientClaimedCompany, async (req, res) => {
    //new_complain
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        //console.log("currentUserData,",currentUserData);
        const slug = req.params.slug;
        console.log("req.params.slug",slug);
    
        //const company_id = req.params.company_Id;
        const comp_res =await comFunction2.getCompanyIdBySlug(slug);
        console.log("comp_res",comp_res);
        const companyId = comp_res.ID;
        console.log("companyId",companyId);
    
        const get_complaint_status = `SELECT complaint_status FROM company WHERE ID= "${companyId}"`;
        const complaintStatusResult = await query(get_complaint_status);
        if (complaintStatusResult && complaintStatusResult.length > 0) {
            var complaintStatus = complaintStatusResult[0].complaint_status;
            //console.log("complaintStatus", complaintStatus); 
        }
    
        const get_complaint_level = `SELECT complaint_level FROM company WHERE ID= "${companyId}"`;
        const complaintlevelResult = await query(get_complaint_level);
        
        if (complaintlevelResult && complaintlevelResult.length > 0) {
            var complaintLevel = complaintlevelResult[0].complaint_level;
            //console.log("complaintLevel", complaintLevel); 
        }
    
        //const companyId = req.params.companyId;
        const [globalPageMeta, company, companyReviewNumbers, PremiumCompanyData, allRatingTags, getComplaintLevelDetails, geCompanyCategories, getcategoriesUsers, getEtaDays,geCompanyCategorieslength,getmanagementUsers ] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction.getCompany(companyId),
            comFunction.getCompanyReviewNumbers(companyId),
            comFunction2.getPremiumCompanyData(companyId),
            comFunction.getAllRatingTags(),
            comFunction2.getComplaintAllLevelDetails(companyId),
            comFunction2.geCompanyCategories(companyId),
            comFunction2.getcategoriesUsers(companyId),
            comFunction2.getEtaDays(companyId),
            comFunction2.geCompanyCategorieslength(companyId),
            comFunction2.getmanagementUsers(companyId)
        ]);
    
        // console.log("getCompany",company);
        // console.log("geCompanyCategories",geCompanyCategories);
        // console.log("getcategoriesUsers",getcategoriesUsers);
        // console.log("getEtaDays",getEtaDays);
        console.log("getmanagementUsers",getmanagementUsers);
    
        console.log("geCompanyCategories",geCompanyCategories);
        console.log("geCompanyCategorieslength",geCompanyCategorieslength);
    
        const companyPaidStatus = company.paid_status.trim();
        //console.log("companyPaidStatus",companyPaidStatus);
        if(companyPaidStatus=='free'){
            res.render('front-end/basic-complain-management',
            {
                menu_active_id: 'settings',
                page_title: 'Complaint Management',
                currentUserData,
                globalPageMeta:globalPageMeta,
                company:company,
                companyReviewNumbers,
                allRatingTags,
                ComplaintLevelDetails:getComplaintLevelDetails,
                companyId: companyId,
                complaintStatus: complaintStatus,
                geCompanyCategories: geCompanyCategories,
                complaintLevel: complaintLevel,
                getEtaDays: getEtaDays,
                geCompanyCategorieslength: geCompanyCategorieslength,
                getmanagementUsers: getmanagementUsers
            });
        }else{
            let facebook_url = '';
            let twitter_url = '';
            let instagram_url = '';
            let linkedin_url = '';
            let youtube_url = '';
        
            if(typeof PremiumCompanyData !== 'undefined' ){
                 facebook_url = PremiumCompanyData.facebook_url;
                 twitter_url = PremiumCompanyData.twitter_url;
                 instagram_url = PremiumCompanyData.instagram_url;
                 linkedin_url = PremiumCompanyData.linkedin_url;
                 youtube_url = PremiumCompanyData.youtube_url;
            }
    
            // res.json(
            // {
            //     menu_active_id: 'complaint',
            //     page_title: 'Complaint Management',
            //     currentUserData,
            //     globalPageMeta:globalPageMeta,
            //     company:company,
            //     companyReviewNumbers,
            //     allRatingTags,
            //     facebook_url:facebook_url,
            //     twitter_url:twitter_url,
            //     instagram_url:instagram_url,
            //     linkedin_url:linkedin_url,
            //     youtube_url:youtube_url,
            //     ComplaintLevelDetails:getComplaintLevelDetails,
            // });
    
            res.render('front-end/new_complaint',
            {
                menu_active_id: 'complaint',
                page_title: 'Complaint Management',
                currentUserData,
                globalPageMeta:globalPageMeta,
                company:company,
                companyReviewNumbers,
                allRatingTags,
                facebook_url:facebook_url,
                twitter_url:twitter_url,
                instagram_url:instagram_url,
                linkedin_url:linkedin_url,
                youtube_url:youtube_url,
                ComplaintLevelDetails:getComplaintLevelDetails,
                companyId: companyId,
                complaintStatus: complaintStatus,
                geCompanyCategories: geCompanyCategories,
                complaintLevel: complaintLevel,
                getcategoriesUsers:getcategoriesUsers,
                getEtaDays: getEtaDays,
                geCompanyCategorieslength: geCompanyCategorieslength,
                getmanagementUsers: getmanagementUsers
            });
            
        }
        /////////////////////////////////////////////////
      
    });
    

//company complaint-level-management Page 
router.get('/complaint-level-management/:slug', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    //const companyId = req.params.compID;
    const [globalPageMeta, company, companyReviewNumbers, PremiumCompanyData, allRatingTags, getComplaintLevelDetails] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getComplaintLevelDetails(companyId),
    ]);

    const companyPaidStatus = company.paid_status.trim();;
    if (companyPaidStatus == 'free') {
        res.render('front-end/basic-complain-management',
            {
                menu_active_id: 'settings',
                page_title: 'Complaint Management',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                allRatingTags,
                ComplaintLevelDetails: getComplaintLevelDetails,
            });
    } else {
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }

        // res.json(
        // {
        //     menu_active_id: 'complaint',
        //     page_title: 'Complaint Management',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company:company,
        //     companyReviewNumbers,
        //     allRatingTags,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     ComplaintLevelDetails:getComplaintLevelDetails,
        // });

        res.render('front-end/premium-complain-management',
            {
                menu_active_id: 'complaint',
                page_title: 'Complaint Management',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                allRatingTags,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url,
                ComplaintLevelDetails: getComplaintLevelDetails,
            });

    }
});

//company dashboard Review listing Page 
router.get('/company-complaint-listing/:slug', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    console.log("companyId", companyId);
    //const companyId = req.params.compID;
    const [globalPageMeta, company, companyReviewNumbers, allRatingTags, PremiumCompanyData, getAllComplaintsByCompanyId, getuserslistofcompanycategory, getuserslistofescalatecategory, getcategories, geCompanyCategories, geCompanyCategorieslength] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction2.getAllComplaintsByCompanyId(companyId),
        comFunction2.getuserslistofcompanycategory(companyId),
        comFunction2.getuserslistofescalatecategory(companyId),
        comFunction2.getcategories(companyId),
        comFunction2.geCompanyCategories(companyId),
        comFunction2.geCompanyCategorieslength(companyId)
        //comFunction2.sendemailtolevelUsers(),
    ]);
    //console.log("getAllComplaintsByCompanyId",getAllComplaintsByCompanyId);
    console.log("getuserslistofcompanycategory", getuserslistofcompanycategory);
    var company_level = company.complaint_level;
    console.log("company_level", company_level);
    const get_complaint_level = `SELECT complaint_level FROM company WHERE ID= "${companyId}"`;
    const complaintlevelResult = await query(get_complaint_level);

    if (complaintlevelResult && complaintlevelResult.length > 0) {
        var complaintLevel = complaintlevelResult[0].complaint_level;
        console.log("complaintLevel", complaintLevel);
    }
    const formattedCoplaintData = getAllComplaintsByCompanyId.map(item => {
        let responsesArray = [];
        let comp_query = [];
        let cus_response = [];
        if (item.notification_statuses != null) {
            responsesArray = item.notification_statuses.split(',');
        }
        if (item.company_query != null) {
            comp_query = item.company_query.split(',');
        }
        if (item.user_response != null) {
            cus_response = item.user_response.split(',');
        }
        return {
            ...item,
            notification_statuses: responsesArray,
            company_query: comp_query,
            customer_response: cus_response
        };
    });

    //console.log("formattedCoplaintData",formattedCoplaintData);
    //console.log("getuserslistofcompanycategory",getuserslistofcompanycategory);
    console.log("geCompanyCategorieslength", geCompanyCategorieslength);
    const companyPaidStatus = company.paid_status.trim();;
    if (companyPaidStatus == 'free') {
        res.render('front-end/basic-complaint-listing',
            {
                menu_active_id: 'complaint',
                page_title: 'Complaint Listing',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                allRatingTags,
                AllComplaintsByCompanyId: formattedCoplaintData,
                getuserslistofcompanycategory: getuserslistofcompanycategory,
                companyId: companyId,
                company_level: company_level,
                getcategories: getcategories,
                geCompanyCategories: geCompanyCategories,
                getuserslistofescalatecategory: getuserslistofescalatecategory,
                complaintLevel: complaintLevel,
                geCompanyCategorieslength: geCompanyCategorieslength
                //sendemailtolevelUsers: sendemailtolevelUsers
            });
    } else {
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json(
        // {
        //     menu_active_id: 'complaint',
        //     page_title: 'Complaint Listing',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company:company,
        //     companyReviewNumbers,
        //     allRatingTags,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     AllComplaintsByCompanyId:formattedCoplaintData
        // });
        res.render('front-end/premium-complaint-listing',
            {
                menu_active_id: 'complaint',
                page_title: 'Complaint Listing',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                allRatingTags,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url,
                AllComplaintsByCompanyId: formattedCoplaintData,
                getuserslistofcompanycategory: getuserslistofcompanycategory,
                companyId: companyId,
                company_level: company_level,
                getcategories: getcategories,
                geCompanyCategories: geCompanyCategories,
                getuserslistofescalatecategory: getuserslistofescalatecategory,
                complaintLevel: complaintLevel,
                geCompanyCategorieslength: geCompanyCategorieslength
                //sendemailtolevelUsers: sendemailtolevelUsers
            });
    }
});

router.get('/manage-complaint-listing/:slug',checkFrontEndLoggedIn,async(req, res) => {
    //company-complaint-listing
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    //console.log("currentUserData",currentUserData);
    var email = currentUserData.email;
    //console.log("currentUserData.email",email);
    const slug = req.params.slug;
    const comp_res =await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    log("companyId",companyId)
    //const companyId = req.params.compID;
    const [globalPageMeta, company, companyReviewNumbers, allRatingTags, PremiumCompanyData, getAllComplaintsByCompanyId, getAllComplaintsByUserId,getuserslistofcompanycategory,getcategories] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction2.getAllComplaintsByCompanyuserId(companyId,email),
        //getAllComplaintsByCompanyuserId
        comFunction2.getAllComplaintsByUserId(companyId),
        
        comFunction2.getuserslistofcompanycategory(companyId),
        comFunction2.getcategories(companyId),
        //comFunction2.sendemailtolevelUsers(),
    ]);
    var company_level = company.complaint_level;
    // console.log("company_level",company_level);
    // console.log("getAllComplaintsByCompanyId",getAllComplaintsByCompanyId);
        const formattedCoplaintData = getAllComplaintsByCompanyId.map(item => {
            let responsesArray = [];
            let comp_query = [];
            let cus_response = [];
            if (item.notification_statuses != null) {
                    responsesArray = item.notification_statuses.split(',');
            }
            if (item.company_query != null) {
                comp_query = item.company_query.split(',');
            }
            if (item.user_response != null) {
                cus_response = item.user_response.split(',');
            }
            return {
                ...item,
                notification_statuses: responsesArray,
                company_query : comp_query,
                customer_response:cus_response
            };
        });
        
        //console.log("formattedCoplaintData",formattedCoplaintData);
        //console.log("getuserslistofcompanycategory",getuserslistofcompanycategory);
    const companyPaidStatus = company.paid_status.trim();;
    if(companyPaidStatus=='free'){
        res.render('front-end/basic-complaint-listing',
        {
            menu_active_id: 'complaint',
            page_title: 'Complaint Listing',
            currentUserData,
            globalPageMeta:globalPageMeta,
            company:company,
            companyReviewNumbers,
            allRatingTags,
            AllComplaintsByCompanyId:formattedCoplaintData,
            getuserslistofcompanycategory: getuserslistofcompanycategory,
            companyId: companyId,
            company_level: company_level,
            getcategories: getcategories,
            getAllComplaintsByUserId: getAllComplaintsByUserId
            //sendemailtolevelUsers: sendemailtolevelUsers
        });
    }else{
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';
    
        if(typeof PremiumCompanyData !== 'undefined' ){
             facebook_url = PremiumCompanyData.facebook_url;
             twitter_url = PremiumCompanyData.twitter_url;
             instagram_url = PremiumCompanyData.instagram_url;
             linkedin_url = PremiumCompanyData.linkedin_url;
             youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json(
        // {
        //     menu_active_id: 'complaint',
        //     page_title: 'Complaint Listing',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company:company,
        //     companyReviewNumbers,
        //     allRatingTags,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     AllComplaintsByCompanyId:formattedCoplaintData
        // });
        res.render('front-end/manage-complaint-listing',
        {
            menu_active_id: 'complaint',
            page_title: 'Complaint Listing',
            currentUserData,
            globalPageMeta:globalPageMeta,
            company:company,
            companyReviewNumbers,
            allRatingTags,
            facebook_url:facebook_url,
            twitter_url:twitter_url,
            instagram_url:instagram_url,
            linkedin_url:linkedin_url,
            youtube_url:youtube_url,
            AllComplaintsByCompanyId:formattedCoplaintData,
            getuserslistofcompanycategory: getuserslistofcompanycategory,
            companyId: companyId,
            company_level: company_level,
            getcategories: getcategories,
            getAllComplaintsByUserId: getAllComplaintsByUserId
            //sendemailtolevelUsers: sendemailtolevelUsers
        });
    }
})
router.get('/manage-compnaint-details/:slug/:complaintId', checkFrontEndLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const complaintId = req.params.complaintId;
    // const companyId = req.params.compID;

    const user_email = currentUserData.email;
    console.log("user_email",user_email);
    const leveluserquery = `SELECT * FROM complaint_level_management WHERE emails="${user_email}"`;
    const leveluservalue = await query(leveluserquery);
    //console.log("leveluservalue",leveluservalue[0]);
    var leveluservalues = leveluservalue[0];
    if(leveluservalue.length> 0){
        console.log(("leveluservalue",leveluservalue));
    }
    try {
        const [globalPageMeta, company, companyReviewNumbers, allRatingTags, PremiumCompanyData, getAllComplaintsByComplaintId, updateCompanyrNotificationStatus, complaintHistory] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction.getCompany(companyId),
            comFunction.getCompanyReviewNumbers(companyId),
            comFunction.getAllRatingTags(),
            comFunction2.getPremiumCompanyData(companyId),
            comFunction2.getAllComplaintsByComplaintId(complaintId),
            comFunction2.updateCompanyrNotificationStatus(complaintId),
            comFunction2.getcomplaintHistory(complaintId),
            //comFunction2.sendemailtolevelUsers()
        ]);

        const overallDaysquery = `SELECT created_at FROM complaint WHERE id=?`;
        const overallDaysvalue = await query(overallDaysquery,[complaintId]);
        const overalldays = overallDaysvalue[0].created_at;
        //console.log("overalldays",overalldays);
        const givenDate = new Date(overalldays);
        const currentDate = new Date();
        const differenceInMs = currentDate - givenDate;
        const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);
        const approximateDifferenceInDays = Math.round(differenceInDays);
        //console.log("Difference in days:", approximateDifferenceInDays);
        

        //console.log("complaintHistory", complaintHistory);
        
        const companyPaidStatus = company.paid_status.trim();
        if (companyPaidStatus == 'free') {
            res.render('front-end/basic-company-complain-details', {
                menu_active_id: 'complaint',
                page_title: 'Complaint Listing',
                currentUserData,
                globalPageMeta,
                company,
                companyReviewNumbers,
                allRatingTags,
                ComplaintsByComplaintId: getAllComplaintsByComplaintId[0],
                getcomplaintHistory: complaintHistory,
                approximateDifferenceInDays: approximateDifferenceInDays,
                leveluservalues: leveluservalues
                //sendemailtolevelUsers: sendemailtolevelUsers
            });

        } else {
            let facebook_url = '';
            let twitter_url = '';
            let instagram_url = '';
            let linkedin_url = '';
            let youtube_url = '';

            if (typeof PremiumCompanyData !== 'undefined') {
                facebook_url = PremiumCompanyData.facebook_url;
                twitter_url = PremiumCompanyData.twitter_url;
                instagram_url = PremiumCompanyData.instagram_url;
                linkedin_url = PremiumCompanyData.linkedin_url;
                youtube_url = PremiumCompanyData.youtube_url;
            }

            res.render('front-end/manage-compnaint-details', {
                menu_active_id: 'complaint',
                page_title: 'Complaint Details',
                currentUserData,
                globalPageMeta,
                company,
                companyReviewNumbers,
                allRatingTags,
                facebook_url,
                twitter_url,
                instagram_url,
                linkedin_url,
                youtube_url,
                ComplaintsByComplaintId: getAllComplaintsByComplaintId[0],
                getcomplaintHistory: complaintHistory,
                approximateDifferenceInDays: approximateDifferenceInDays,
                leveluservalues: leveluservalues
                //sendemailtolevelUsers: sendemailtolevelUsers
            });
        }
    } catch (error) {
        console.error('Error while fetching data:', error);
        // Handle error response
        res.status(500).send('Internal Server Error');
    }
});


//company dashboard Review listing Page 
router.get('/company-compnaint-details/:slug/:complaintId', checkClientClaimedCompany, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const complaintId = req.params.complaintId;
    //const companyId = req.params.compID;
    const [globalPageMeta, company, companyReviewNumbers, allRatingTags, PremiumCompanyData, getAllComplaintsByComplaintId] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction2.getAllComplaintsByComplaintId(complaintId),
        comFunction2.updateCompanyrNotificationStatus(complaintId),
      
    ]);
    try {
        var complaintHistory = await comFunction2.getcomplaintHistory(complaintId);
        console.log("complaintHistory", complaintHistory);
        // Continue with using complaintHistory
    } catch (error) {
        console.error('Error fetching complaint history:', error);
        var complaintHistory = [];
    }

    const companyPaidStatus = company.paid_status.trim();;
    if (companyPaidStatus == 'free') {
        res.render('front-end/basic-company-complain-details',
            {
                menu_active_id: 'complaint',
                page_title: 'Complaint Listing',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                allRatingTags,
                ComplaintsByComplaintId: getAllComplaintsByComplaintId[0]
            });
    } else {
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json(
        // {
        //     menu_active_id: 'complaint',
        //     page_title: 'Complaint Details',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company:company,
        //     companyReviewNumbers,
        //     allRatingTags,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     ComplaintsByComplaintId:getAllComplaintsByComplaintId[0]
        // });
        res.render('front-end/premium-company-complain-details',
            {
                menu_active_id: 'complaint',
                page_title: 'Complaint Details',
                currentUserData,
                globalPageMeta: globalPageMeta,
                company: company,
                companyReviewNumbers,
                allRatingTags,
                facebook_url: facebook_url,
                twitter_url: twitter_url,
                instagram_url: instagram_url,
                linkedin_url: linkedin_url,
                youtube_url: youtube_url,
                ComplaintsByComplaintId: getAllComplaintsByComplaintId[0],
                getcomplaintHistory: complaintHistory,
            });
    }
});
router.get('/company-compnaint-detail/:slug/:complaintId', async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const complaintId = req.params.complaintId;
    // const companyId = req.params.compID;

    const user_email = currentUserData.email;
    console.log("user_email",user_email);
    const leveluserquery = `SELECT * FROM complaint_level_management WHERE emails="${user_email}"`;
    const leveluservalue = await query(leveluserquery);
    //console.log("leveluservalue",leveluservalue[0]);
    var leveluservalues = leveluservalue[0];
    if(leveluservalue.length> 0){
        console.log(("leveluservalue",leveluservalue));
    }
    try {
        const [globalPageMeta, company, companyReviewNumbers, allRatingTags, PremiumCompanyData, getAllComplaintsByComplaintId, updateCompanyrNotificationStatus, complaintHistory] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction.getCompany(companyId),
            comFunction.getCompanyReviewNumbers(companyId),
            comFunction.getAllRatingTags(),
            comFunction2.getPremiumCompanyData(companyId),
            comFunction2.getAllComplaintsByComplaintId(complaintId),
            comFunction2.updateCompanyrNotificationStatus(complaintId),
            comFunction2.getcomplaintHistory(complaintId),
            //comFunction2.sendemailtolevelUsers()
        ]);

        const overallDaysquery = `SELECT created_at FROM complaint WHERE id=?`;
        const overallDaysvalue = await query(overallDaysquery,[complaintId]);
        const overalldays = overallDaysvalue[0].created_at;
        //console.log("overalldays",overalldays);
        const givenDate = new Date(overalldays);
        const currentDate = new Date();
        const differenceInMs = currentDate - givenDate;
        const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);
        const approximateDifferenceInDays = Math.round(differenceInDays);
        //console.log("Difference in days:", approximateDifferenceInDays);
        

        //console.log("complaintHistory", complaintHistory);
        
        const companyPaidStatus = company.paid_status.trim();
        if (companyPaidStatus == 'free') {
            res.render('front-end/basic-company-complain-details', {
                menu_active_id: 'complaint',
                page_title: 'Complaint Listing',
                currentUserData,
                globalPageMeta,
                company,
                companyReviewNumbers,
                allRatingTags,
                ComplaintsByComplaintId: getAllComplaintsByComplaintId[0],
                getcomplaintHistory: complaintHistory,
                approximateDifferenceInDays: approximateDifferenceInDays,
                leveluservalues: leveluservalues
                //sendemailtolevelUsers: sendemailtolevelUsers
            });

        } else {
            let facebook_url = '';
            let twitter_url = '';
            let instagram_url = '';
            let linkedin_url = '';
            let youtube_url = '';

            if (typeof PremiumCompanyData !== 'undefined') {
                facebook_url = PremiumCompanyData.facebook_url;
                twitter_url = PremiumCompanyData.twitter_url;
                instagram_url = PremiumCompanyData.instagram_url;
                linkedin_url = PremiumCompanyData.linkedin_url;
                youtube_url = PremiumCompanyData.youtube_url;
            }

            res.render('front-end/premium-company-complain-details', {
                menu_active_id: 'complaint',
                page_title: 'Complaint Details',
                currentUserData,
                globalPageMeta,
                company,
                companyReviewNumbers,
                allRatingTags,
                facebook_url,
                twitter_url,
                instagram_url,
                linkedin_url,
                youtube_url,
                ComplaintsByComplaintId: getAllComplaintsByComplaintId[0],
                getcomplaintHistory: complaintHistory,
                approximateDifferenceInDays: approximateDifferenceInDays,
                leveluservalues: leveluservalues
                //sendemailtolevelUsers: sendemailtolevelUsers
            });
        }
    } catch (error) {
        console.error('Error while fetching data:', error);
        // Handle error response
        res.status(500).send('Internal Server Error');
    }
});

//send survey invitation page
router.get('/send-survey-invitation/:slug', checkClientClaimedCompany, async (req, res) => {

    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, allRatingTags, getCompanyOngoingSurveyDetails] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction.getCompanyOngoingSurveyDetails(companyId),
    ]);

    try {
        let cover_img = '';
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json( {
        //     menu_active_id: 'survey',
        //     page_title: 'Send Survey Invitation',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     companyReviewNumbers,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     allRatingTags,
        //     CompanyOngoingSurveyDetails:getCompanyOngoingSurveyDetails
        // });
        res.render('front-end/send-survey-invitation', {
            menu_active_id: 'survey',
            page_title: 'Send Survey Invitation',
            currentUserData,
            globalPageMeta: globalPageMeta,
            company,
            companyReviewNumbers,
            facebook_url: facebook_url,
            twitter_url: twitter_url,
            instagram_url: instagram_url,
            linkedin_url: linkedin_url,
            youtube_url: youtube_url,
            allRatingTags,
            CompanyOngoingSurveyDetails: getCompanyOngoingSurveyDetails
        });
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
    /////////////////////////////////////////////////

});

//send survey invitation page
// router.get('/new_complain/:slug', checkClientClaimedCompany, async (req, res) => {

//     const encodedUserData = req.cookies.user;
//     const currentUserData = JSON.parse(encodedUserData);
//     const slug = req.params.slug;
//     const comp_res = await comFunction2.getCompanyIdBySlug(slug);
//     const companyId = comp_res.ID;
//     const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, allRatingTags, getCompanyOngoingSurveyDetails] = await Promise.all([
//         comFunction2.getPageMetaValues('global'),
//         comFunction.getCompany(companyId),
//         comFunction2.getPremiumCompanyData(companyId),
//         comFunction.getCompanyReviewNumbers(companyId),
//         comFunction.getAllRatingTags(),
//         comFunction.getCompanyOngoingSurveyDetails(companyId),
//     ]);

//     try {
//         let cover_img = '';
//         let facebook_url = '';
//         let twitter_url = '';
//         let instagram_url = '';
//         let linkedin_url = '';
//         let youtube_url = '';

//         if (typeof PremiumCompanyData !== 'undefined') {
//             cover_img = PremiumCompanyData.cover_img;
//             facebook_url = PremiumCompanyData.facebook_url;
//             twitter_url = PremiumCompanyData.twitter_url;
//             instagram_url = PremiumCompanyData.instagram_url;
//             linkedin_url = PremiumCompanyData.linkedin_url;
//             youtube_url = PremiumCompanyData.youtube_url;
//         }
//         // res.json( {
//         //     menu_active_id: 'survey',
//         //     page_title: 'Send Survey Invitation',
//         //     currentUserData,
//         //     globalPageMeta:globalPageMeta,
//         //     company,
//         //     companyReviewNumbers,
//         //     facebook_url:facebook_url,
//         //     twitter_url:twitter_url,
//         //     instagram_url:instagram_url,
//         //     linkedin_url:linkedin_url,
//         //     youtube_url:youtube_url,
//         //     allRatingTags,
//         //     CompanyOngoingSurveyDetails:getCompanyOngoingSurveyDetails
//         // });
//         res.render('front-end/new_complaint', {
//             menu_active_id: 'survey',
//             page_title: 'Send Survey Invitation',
//             currentUserData,
//             globalPageMeta: globalPageMeta,
//             company,
//             companyReviewNumbers,
//             facebook_url: facebook_url,
//             twitter_url: twitter_url,
//             instagram_url: instagram_url,
//             linkedin_url: linkedin_url,
//             youtube_url: youtube_url,
//             allRatingTags,
//             CompanyOngoingSurveyDetails: getCompanyOngoingSurveyDetails
//         });
//     } catch (err) {
//         console.error(err);
//         res.render('front-end/404', {
//             menu_active_id: '404',
//             page_title: '404',
//             currentUserData,
//             globalPageMeta: globalPageMeta
//         });
//     }
//     /////////////////////////////////////////////////

// });

//complaint level listing page
router.get('/complain_level_list/:slug', checkClientClaimedCompany, async (req, res) => {

    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, allRatingTags, getCompanyOngoingSurveyDetails] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction.getCompanyOngoingSurveyDetails(companyId),
    ]);

    try {
        let cover_img = '';
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json( {
        //     menu_active_id: 'survey',
        //     page_title: 'Send Survey Invitation',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     companyReviewNumbers,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     allRatingTags,
        //     CompanyOngoingSurveyDetails:getCompanyOngoingSurveyDetails
        // });
        res.render('front-end/complain_level_list', {
            menu_active_id: 'survey',
            page_title: 'Send Survey Invitation',
            currentUserData,
            globalPageMeta: globalPageMeta,
            company,
            companyReviewNumbers,
            facebook_url: facebook_url,
            twitter_url: twitter_url,
            instagram_url: instagram_url,
            linkedin_url: linkedin_url,
            youtube_url: youtube_url,
            allRatingTags,
            CompanyOngoingSurveyDetails: getCompanyOngoingSurveyDetails
        });
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
    /////////////////////////////////////////////////

});

//View company product
// router.get('/view-company-product/:slug/:cat_id', checkClientClaimedCompany, async (req, res) => {

//     const encodedUserData = req.cookies.user;
//     const currentUserData = JSON.parse(encodedUserData);
//     const slug = req.params.slug;
//     const cat_id = req.params.cat_id;
//     const comp_res =await comFunction2.getCompanyIdBySlug(slug);
//     const companyId = comp_res.ID;
//     const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, allRatingTags, getCompanyCategoryProducts ] = await Promise.all([
//         comFunction2.getPageMetaValues('global'),
//         comFunction.getCompany(companyId),
//         comFunction2.getPremiumCompanyData(companyId),
//         comFunction.getCompanyReviewNumbers(companyId),
//         comFunction.getAllRatingTags(),
//         comFunction2.getCompanyCategoryProducts(cat_id),
//     ]);
//    //console.log('getCompanyCategoryProducts', getCompanyCategoryProducts);
//     try {
//         let cover_img = '';
//         let facebook_url = '';
//         let twitter_url = '';
//         let instagram_url = '';
//         let linkedin_url = '';
//         let youtube_url = '';

//         if(typeof PremiumCompanyData !== 'undefined' ){
//              cover_img = PremiumCompanyData.cover_img;
//              facebook_url = PremiumCompanyData.facebook_url;
//              twitter_url = PremiumCompanyData.twitter_url;
//              instagram_url = PremiumCompanyData.instagram_url;
//              linkedin_url = PremiumCompanyData.linkedin_url;
//              youtube_url = PremiumCompanyData.youtube_url;
//         }
//         // res.json( {
//         //     menu_active_id: 'survey',
//         //     page_title: 'Company Product Listing',
//         //     currentUserData,
//         //     globalPageMeta:globalPageMeta,
//         //     company,
//         //     companyReviewNumbers,
//         //     facebook_url:facebook_url,
//         //     twitter_url:twitter_url,
//         //     instagram_url:instagram_url,
//         //     linkedin_url:linkedin_url,
//         //     youtube_url:youtube_url,
//         //     allRatingTags,
//         //     CompanyCategoryProducts:getCompanyCategoryProducts
//         // });
//         res.render('front-end/company-product-listing', {
//             menu_active_id: 'settings',
//             page_title: 'Company Product Listing',
//             currentUserData,
//             globalPageMeta:globalPageMeta,
//             company,
//             companyReviewNumbers,
//             facebook_url:facebook_url,
//             twitter_url:twitter_url,
//             instagram_url:instagram_url,
//             linkedin_url:linkedin_url,
//             youtube_url:youtube_url,
//             allRatingTags,
//             CompanyCategoryProducts:getCompanyCategoryProducts
//         });
//     } catch (err) {
//         console.error(err);
//         res.render('front-end/404', {
//             menu_active_id: '404',
//             page_title: '404',
//             currentUserData,
//             globalPageMeta:globalPageMeta
//         });
//     }
//     /////////////////////////////////////////////////

// });


router.get('/view-company-product/:slug', checkClientClaimedCompany, async (req, res) => {

    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    // const cat_id = req.params.cat_id;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, allRatingTags, getCompanyCategoryProducts, getcategories, getsubcategories] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getCompanyProducts(companyId),
        comFunction2.getcategories(companyId),
        comFunction2.getsubcategories(companyId)
    ]);
    console.log('getCompanyCategoryProducts', getCompanyCategoryProducts);
    console.log('getcategories', getcategories);
    console.log('getsubcategories', getsubcategories);
    try {
        let cover_img = '';
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json( {
        //     menu_active_id: 'survey',
        //     page_title: 'Company Product Listing',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     companyReviewNumbers,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     allRatingTags,
        //     CompanyCategoryProducts:getCompanyCategoryProducts
        // });
        res.render('front-end/company-products', {
            menu_active_id: 'settings',
            page_title: 'Company Product Listing',
            currentUserData,
            globalPageMeta: globalPageMeta,
            company,
            companyReviewNumbers,
            facebook_url: facebook_url,
            twitter_url: twitter_url,
            instagram_url: instagram_url,
            linkedin_url: linkedin_url,
            youtube_url: youtube_url,
            allRatingTags,
            CompanyCategoryProducts: getCompanyCategoryProducts,
            Companycategories: getcategories,
            Companysubcategories: getsubcategories
        });
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
    /////////////////////////////////////////////////

});

//send review invitation page
router.get('/discussion-tag-management/:slug', checkClientClaimedCompany, async (req, res) => {

    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const slug = req.params.slug;
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
    const companyId = comp_res.ID;
    const [globalPageMeta, company, PremiumCompanyData, companyReviewNumbers, allRatingTags, getCompanyCreatedTags] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getCompanyCreatedTags(companyId),
    ]);

    try {
        let cover_img = '';
        let facebook_url = '';
        let twitter_url = '';
        let instagram_url = '';
        let linkedin_url = '';
        let youtube_url = '';

        if (typeof PremiumCompanyData !== 'undefined') {
            cover_img = PremiumCompanyData.cover_img;
            facebook_url = PremiumCompanyData.facebook_url;
            twitter_url = PremiumCompanyData.twitter_url;
            instagram_url = PremiumCompanyData.instagram_url;
            linkedin_url = PremiumCompanyData.linkedin_url;
            youtube_url = PremiumCompanyData.youtube_url;
        }
        // res.json( {
        //     menu_active_id: 'survey',
        //     page_title: 'Send Survey Invitation',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     company,
        //     companyReviewNumbers,
        //     facebook_url:facebook_url,
        //     twitter_url:twitter_url,
        //     instagram_url:instagram_url,
        //     linkedin_url:linkedin_url,
        //     youtube_url:youtube_url,
        //     allRatingTags,
        //     CompanyOngoingSurveyDetails:getCompanyOngoingSurveyDetails
        // });
        res.render('front-end/discussion-tag-management', {
            menu_active_id: 'settings',
            page_title: 'Discussion Tag Managemen',
            currentUserData,
            globalPageMeta: globalPageMeta,
            company,
            companyReviewNumbers,
            facebook_url: facebook_url,
            twitter_url: twitter_url,
            instagram_url: instagram_url,
            linkedin_url: linkedin_url,
            youtube_url: youtube_url,
            allRatingTags,
            CompanyCreatedTags: getCompanyCreatedTags
        });
    } catch (err) {
        console.error(err);
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    }
    /////////////////////////////////////////////////

});

///////////////////////////////////////////////////////////////////////
// Middleware function to check if user is logged in
async function checkLoggedIn(req, res, next) {
    res.locals.globalData = {
        BLOG_URL: process.env.BLOG_URL,
        MAIN_URL: process.env.MAIN_URL,
        // Add other variables as needed
    };
    const encodedUserData = req.cookies.user;
    console.log("encodedUserData", encodedUserData);
    try {
        if (encodedUserData) {
            console.log("jhuhjh");
            const UserJsonData = JSON.parse(encodedUserData);
            console.log(UserJsonData.user_type_id);
            // User is logged in, proceed to the next middleware or route handler
            if (UserJsonData.user_type_id == 1 || UserJsonData.user_type_id == 3) {
                next();
            } else {
                res.redirect('/');
            }

        } else {
            res.redirect('admin-login');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
}
// Middleware function to check if user is Administrator or not
async function checkLoggedInAdministrator(req, res, next) {
    res.locals.globalData = {
        BLOG_URL: process.env.BLOG_URL,
        MAIN_URL: process.env.MAIN_URL,
        // Add other variables as needed
    };
    const encodedUserData = req.cookies.user;
    try {
        if (encodedUserData) {
            const UserJsonData = JSON.parse(encodedUserData);
            console.log(UserJsonData.user_type_id);
            // User is logged in, proceed to the next middleware or route handler
            if (UserJsonData.user_type_id == 1) {
                next();
            } else {
                res.redirect('/');
            }

        } else {
            res.redirect('admin-login');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
}

router.get('/dashboard', checkLoggedIn, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    res.render('dashboard', { menu_active_id: 'dashboard', page_title: 'Dashboard', currentUserData });
});

router.get('/profile', checkLoggedIn, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    res.render('profile', { menu_active_id: 'profile', page_title: 'User Profile', currentUserData });
});

router.get('/edit-profile', checkLoggedIn, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    let country_response = [];
    //-- Get Country List --/
    db.query('SELECT * FROM countries', (err, results) => {
        if (err) {
            console.log(err);
        } else {
            if (results.length > 0) {
                //console.log(results);
                country_response = results;
                if (!currentUserData.country) {
                    res.render('edit-profile', { page_title: 'Account Settings', currentUserData, country_response });
                } else {
                    // -- send state list --//
                    db.query('SELECT * FROM states WHERE country_id=?', [currentUserData.country], (err, state_results) => {
                        if (err) {
                            console.log(err);
                        } else {
                            if (state_results.length > 0) {
                                state_response = state_results;
                                res.render('edit-profile', { menu_active_id: 'profile', page_title: 'Account Settings', currentUserData, country_response, state_response });
                            }
                        }
                    })
                }

            }
        }
    })
});

router.get('/edit-category/:id/:kk', checkLoggedIn, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    let country_response = [];
    //-- Get Country List --/
    db.query('SELECT * FROM countries', (err, results) => {
        if (err) {
            console.log(err);
        } else {
            if (results.length > 0) {
                //console.log(results);
                country_response = results;
                if (!currentUserData.country) {
                    res.render('edit-profile', { page_title: 'Account Settings', currentUserData, country_response });
                } else {
                    // -- send state list --//
                    db.query('SELECT * FROM states WHERE country_id=?', [currentUserData.country], (err, state_results) => {
                        if (err) {
                            console.log(err);
                        } else {
                            if (state_results.length > 0) {
                                state_response = state_results;
                                res.render('edit-category', { menu_active_id: 'company', page_title: 'Account Settings', currentUserData, country_response, state_response });
                            }
                        }
                    })
                }

            }
        }
    })
});

router.get('/users', checkLoggedInAdministrator, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    //res.render('users', { menu_active_id: 'user', page_title: 'Users', currentUserData });

    const user_query = `
                    SELECT users.*, user_customer_meta.*, user_account_type.role_name, user_device_info.last_logged_in
                    FROM users
                    JOIN user_customer_meta ON users.user_id = user_customer_meta.user_id
                    JOIN user_account_type ON users.user_type_id = user_account_type.ID
                    LEFT JOIN user_device_info ON users.user_id = user_device_info.user_id
                    WHERE users.user_status = '1'
                    `;
    db.query(user_query, (err, results) => {
        if (err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        } else {
            if (results.length > 0) {
                const users = results.map((user) => ({
                    ...user,
                    registered_date: moment(user.last_logged_in).format('Do MMMM YYYY, h:mm:ss a'),
                }));


                //res.json({ currentUserData, 'allusers': users });
                res.render('users', { menu_active_id: 'user', page_title: 'Users', currentUserData, 'allusers': users });
            }
        }
    })
});

router.get('/trashed-users', checkLoggedInAdministrator, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    //res.render('users', { menu_active_id: 'user', page_title: 'Users', currentUserData });

    const user_query = `
                    SELECT users.*, user_customer_meta.*, user_account_type.role_name, user_device_info.last_logged_in
                    FROM users
                    JOIN user_customer_meta ON users.user_id = user_customer_meta.user_id
                    JOIN user_account_type ON users.user_type_id = user_account_type.ID
                    LEFT JOIN user_device_info ON users.user_id = user_device_info.user_id
                    WHERE users.user_status = '0'
                    `;
    db.query(user_query, (err, results) => {
        if (err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        } else {
            if (results.length > 0) {
                const users = results.map((user) => ({
                    ...user,
                    registered_date: moment(user.last_logged_in).format('Do MMMM YYYY, h:mm:ss a'),
                }));
                //res.json({ currentUserData, 'allusers': users });
                res.render('trashed-users', { menu_active_id: 'user', page_title: 'Trashed Users', currentUserData, 'allusers': users });
            } else {
                res.render('trashed-users', { menu_active_id: 'user', page_title: 'Trashed Users', currentUserData, 'allusers': [] });
            }
        }
    })
});

router.get('/pending-users', checkLoggedInAdministrator, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    //res.render('users', { menu_active_id: 'user', page_title: 'Users', currentUserData });

    const user_query = `
                    SELECT users.*, user_customer_meta.*, user_account_type.role_name, user_device_info.last_logged_in
                    FROM users
                    JOIN user_customer_meta ON users.user_id = user_customer_meta.user_id
                    JOIN user_account_type ON users.user_type_id = user_account_type.ID
                    LEFT JOIN user_device_info ON users.user_id = user_device_info.user_id
                    WHERE users.user_status = '3'
                    `;
    db.query(user_query, (err, results) => {
        if (err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        } else {
            if (results.length > 0) {
                const users = results.map((user) => ({
                    ...user,
                    registered_date: moment(user.last_logged_in).format('Do MMMM YYYY, h:mm:ss a'),
                }));
                //res.json({ currentUserData, 'allusers': users });
                console.log("usersss", users);
                res.render('pending-users', { menu_active_id: 'user', page_title: 'Pending Users', currentUserData, 'allusers': users });
            } else {
                res.render('pending-users', { menu_active_id: 'user', page_title: 'Pending Users', currentUserData, 'allusers': [] });
            }
        }
    })
});

router.get('/add-user', checkLoggedIn, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    let country_response = [];
    let accounts_response = [];
    const auto_password = generateRandomPassword();
    //-- Get Country List --/
    db.query('SELECT * FROM countries', (err, results) => {
        if (err) {
            console.log(err);
        } else {
            if (results.length > 0) {
                //console.log(results);
                country_response = results;
                db.query('SELECT * FROM user_account_type', (err, accountresults) => {
                    if (err) {
                        console.log(err);
                    } else {
                        if (accountresults.length > 0) {
                            //console.log(results);
                            accounts_response = accountresults;
                            res.render('add-user', { menu_active_id: 'user', page_title: 'Add New User', currentUserData, country_response, accounts_response, auto_password });

                        }
                    }
                })

            }
        }
    })
});


//View Categories
router.get('/manage-categories', checkLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const selectedCountryId = req.query.country || 101;
    console.log("selectedCountryId", selectedCountryId);
    //res.render('users', { menu_active_id: 'user', page_title: 'Users', currentUserData });



    const countries = await comFunction.getCountries();
    //console.log("countries",countries);

    const cat_query = `
                        SELECT category.ID AS category_id,category.category_name AS category_name, category.category_img AS category_img, c.category_name AS parent_name, GROUP_CONCAT(countries.name) AS country_names
                        FROM category
                        JOIN category_country_relation ON category.id = category_country_relation.cat_id
                        JOIN countries ON category_country_relation.country_id = countries.id
                        LEFT JOIN category AS c ON c.ID = category.parent_id 
                        WHERE category_country_relation.country_id = "${selectedCountryId}"
                        GROUP BY category.category_name `;
    db.query(cat_query, async (err, results) => {
        if (err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        } else {
            const categories = results.map((row) => ({
                categoryId: row.category_id,
                categoryName: row.category_name,
                parentName: row.parent_name,
                categoryImage: row.category_img,
                countryNames: row.country_names.split(','),
            }));

            for (const category of categories) {
                const countryNames = category.countryNames;
                const placeholders = countryNames.map(() => '?').join(',');
                const countryShortnamesQuery = `SELECT name, shortname,id FROM countries WHERE name IN (${placeholders})`;
                const [countryShortnamesResults] = await db.promise().query(countryShortnamesQuery, countryNames);

                // Convert the array of shortnames to a single string
                const countryCodes = countryShortnamesResults.map(row => row.id).join(', ');
                category.countryCodes = countryCodes;
            }

            console.log("categories", categories);
            //res.json({ menu_active_id: 'category', page_title: 'Categories', currentUserData, 'categories': categories });
            res.render('categories', { menu_active_id: 'company', page_title: 'Categories', currentUserData, 'categoriess': categories, countries: countries, selectedCountryId: selectedCountryId });
        }
    })
});

//Add Category
router.get('/add-category', checkLoggedIn, (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    let country_response = [];
    let accounts_response = [];
    //-- Get Country List --/
    db.query('SELECT * FROM countries', (err, results) => {
        if (err) {
            console.log(err);
        } else {
            if (results.length > 0) {
                //console.log(results);
                country_response = results;
                let cat_data = [];
                console.log("cat_data", cat_data);
                const sql = "SELECT * FROM category"
                db.query(sql, (error, cat_result) => {
                    if (error) {
                        console.log(error);
                    } else {
                        if (cat_result.length > 0) {
                            console.log("cat_result", cat_result);
                            cat_data = cat_result;
                            res.render('add-category', { menu_active_id: 'company', page_title: 'Add New Category', currentUserData, country_response, cat_data });

                        } else {
                            res.render('add-category', { menu_active_id: 'company', page_title: 'Add New Category', currentUserData, country_response, cat_data });
                        }
                    }
                })

            }
        }
    })
});

//Edit Category
router.get('/edit-category', checkLoggedIn, async (req, res, next) => {

    console.log(req.query.id);
    const cat_id = req.query.id;
    const country_id = req.query.country_id;
    const cat_name = req.query.cat_name;
    // console.log("country_id", country_id);
    // console.log("cat_name", cat_name);

    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    let country_response = [];
    let accounts_response = [];
    let cat_data = [];
    let edit_data = [];

    var getcountries = await comFunction.getCountries();
    //console.log("getcountries",getcountries);

    var getcategorycountry = `SELECT country_id FROM category_country_relation WHERE cat_id= "${cat_id}"`;
    var getcountryvalue = await queryAsync(getcategorycountry);
    var getcountriesval = getcountryvalue[0].country_id
    //console.log("getcountryvalue",getcountriesval);

    var getcategoryquery = `SELECT category.* FROM category LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id  WHERE category.parent_id="0" AND category_country_relation.country_id="${getcountriesval}" AND category.ID!="null"`;
    var getcategoryvalue = await queryAsync(getcategoryquery);
    //console.log("getcategoryvalue",getcategoryvalue);

    var filteredCategories = getcategoryvalue.filter(category => category.ID != cat_id);

    //console.log("filteredCategories", filteredCategories);

    var getparentcategoryquery = `SELECT parent_id FROM category WHERE ID="${cat_id}"`;
    var getparentcategoryval = await queryAsync(getparentcategoryquery);
    var parentcat = getparentcategoryval[0].parent_id;
    //console.log("parentcat",parentcat);

    //-- Get Country List --/
    db.query('SELECT * FROM countries', (err, results) => {

        if (err) {
            console.log(err);
        } else {
            if (results.length > 0) {
                console.log("results", results);
                country_response = results;
                const sql = "SELECT * FROM category"
                db.query(sql, (cat_err, cat_res) => {

                    if (cat_err) {
                        console.log(cat_err);
                    } else {
                        cat_data = cat_res;
                        const cat_query = `SELECT category.ID AS category_id,category.category_name AS category_name,category.category_slug  AS category_slug , category.category_img AS category_img, category.parent_id AS parent_id, c.category_name AS parent_name,GROUP_CONCAT(countries.id) AS country_id, GROUP_CONCAT(countries.name) AS country_names
                        FROM category
                        JOIN category_country_relation ON category.id = category_country_relation.cat_id
                        JOIN countries ON category_country_relation.country_id = countries.id
                        LEFT JOIN category AS c ON c.ID = category.parent_id   WHERE category.ID = ${req.query.id}`;

                        // const cat_query = `SELECT category.ID AS category_id,category.category_name AS category_name,category.category_slug  AS category_slug , category.category_img AS category_img, category.parent_id AS parent_id, c.category_name AS parent_name,GROUP_CONCAT(countries.id) AS country_id, GROUP_CONCAT(countries.name) AS country_names
                        // FROM category
                        // JOIN category_country_relation ON category.id = category_country_relation.cat_id
                        // JOIN countries ON category_country_relation.country_id = countries.id
                        // LEFT JOIN category AS c ON c.ID = category.parent_id WHERE category.category_name = "${cat_name}"`
                        db.query(cat_query, (cat_error, cat_result) => {

                            if (cat_error) {
                                console.log(cat_error);
                            } else {
                                if (cat_result.length > 0) {
                                    edit_data = cat_result[0];
                                    const country = edit_data.country_names.split(',');
                                    const country_id = edit_data.country_id.split(',');
                                    const country_arr = country;
                                    console.log(edit_data);
                                    console.log(country, country_id);
                                    // res.json( { menu_active_id: 'company', page_title: 'Add New Category', currentUserData, country_response, cat_data, edit_data, country_arr, country_id });

                                    res.render('edit-category', { menu_active_id: 'company', page_title: 'Add New Category', currentUserData, country_response, cat_data, edit_data, country_arr, country_id, getcountries, getcountriesval, parentcat, getcategoryvalue: filteredCategories });
                                    //res.render('edit-category', { menu_active_id: 'category', page_title: 'Add New Category', currentUserData, 'ids': req.params.id });
                                }
                            }
                        })

                    }
                })
            }
        }
    })

});

//Delete Category
router.get('/delete-category', checkLoggedIn, (req, res, next) => {

    const file_query = `SELECT category_img FROM category WHERE ID = ${req.query.id}`;
    db.query(file_query, async function (img_err, img_res) {
        console.log("img_res", img_res);
        if (img_res[0].category_img != 'NULL') {
            const filename = img_res[0].category_img;
            const filePath = `uploads/${filename}`;
            //console.log(filePath);

            fs.unlink(filePath, await function () {
                console.log('file deleted');
            })
            const sql = `DELETE FROM category WHERE ID = ${req.query.id}`;
            db.query(sql, (err, result) => {
                const country_sql = `DELETE FROM category_country_relation WHERE cat_id = ${req.query.id}`;
                db.query(country_sql, (country_err, country_res) => {
                    if (err) {
                        console.log(err);
                    } else {
                        return res.send(
                            {
                                status: 'ok',
                                data: result,
                                message: 'Category deleted'
                            }
                        )
                    }
                })

            })
        } else {
            //console.log("no file");
            const sql = `DELETE FROM category WHERE ID = ${req.query.id}`;
            db.query(sql, (err, result) => {
                const country_sql = `DELETE FROM category_country_relation WHERE cat_id = ${req.query.id}`;
                db.query(country_sql, (country_err, country_res) => {
                    if (err) {
                        console.log(err);
                    } else {
                        return res.send(
                            {
                                status: 'ok',
                                data: result,
                                message: 'Category deleted'
                            }
                        )
                    }
                })
            })
        }
    })

});

router.post('/delete-categories', checkLoggedIn, (req, res) => {
    try {
        const ids = req.body.ids;
        console.log("delete-categoriesids", ids);
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).send({
                status: 'error',
                message: 'No categories selected for deletion'
            });
        }

        // Construct query to select category images
        const fileQuery = `SELECT category_img FROM category WHERE ID IN (${ids.join(',')})`;
        db.query(fileQuery, (imgErr, imgRes) => {
            if (imgErr) {
                return res.status(500).send({
                    status: 'error',
                    message: 'Failed to fetch category images'
                });
            }

            // Delete images if they exist
            imgRes.forEach(row => {
                if (row.category_img && row.category_img !== 'NULL') {
                    const filePath = `uploads/${row.category_img}`;
                    fs.unlink(filePath, err => {
                        if (err) console.error(`Failed to delete file ${filePath}:`, err);
                    });
                }
            });

            // Construct query to delete categories
            const deleteCategoryQuery = `DELETE FROM category WHERE ID IN (${ids.join(',')})`;
            db.query(deleteCategoryQuery, (err, result) => {
                if (err) {
                    return res.status(500).send({
                        status: 'error',
                        message: 'Failed to delete categories'
                    });
                }

                // Construct query to delete category-country relations
                const deleteCountryQuery = `DELETE FROM category_country_relation WHERE cat_id IN (${ids.join(',')})`;
                db.query(deleteCountryQuery, (countryErr, countryRes) => {
                    if (countryErr) {
                        return res.status(500).send({
                            status: 'error',
                            message: 'Failed to delete category-country relations'
                        });
                    }

                    return res.send({
                        status: 'ok',
                        message: 'Categories deleted successfully'
                    });
                });
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});





router.get('/fetch-parent-categories', async (req, res) => {
    const { countryId } = req.query;
    console.log("countryId", countryId);
    const querys = `
        SELECT 
            category.ID AS category_id,
            category.category_slug,
            category.category_name AS category_name,
            category.category_img AS category_img,
            countries.shortname
        FROM 
            category
        JOIN 
            category_country_relation ON category.id = category_country_relation.cat_id
        JOIN 
            countries ON category_country_relation.country_id = countries.id
        LEFT JOIN 
            category AS c ON c.ID = category.parent_id
        WHERE 
            category.parent_id = 0
            AND countries.id = ?
        GROUP BY 
            category.category_name`;

    try {
        const results = await queryAsync(querys, [countryId]);
        console.log("results", results);

        res.json(results);
    } catch (error) {
        console.error('Error fetching parent categories:', error);
        res.status(500).json({ error: 'Error fetching parent categories' });
    }
});


router.get('/edit-user/:id', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const userId = req.params.id;
        console.log('editUserID: ', userId);

        // Fetch all the required data asynchronously
        const [user, userMeta, countries, userRoles, states] = await Promise.all([
            comFunction.getUser(userId),
            comFunction.getUserMeta(userId),
            comFunction.getCountries(),
            comFunction.getUserRoles(),
            comFunction.getStatesByUserID(userId)
        ]);

        // Render the 'edit-user' EJS view and pass the data
        // res.json({
        //     menu_active_id: 'user',
        //     page_title: 'Edit User',
        //     currentUserData,
        //     user: user,
        //     userMeta: userMeta,
        //     countries: countries,
        //     userRoles: userRoles,
        //     states: states
        // });
        res.render('edit-user', {
            menu_active_id: 'user',
            page_title: 'Edit User',
            currentUserData,
            user: user,
            userMeta: userMeta,
            countries: countries,
            userRoles: userRoles,
            states: states
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//---Company--//
router.get('/add-company', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [company_all_categories, getCountries, getParentCompany] = await Promise.all([
            //comFunction.getCompanyCategory(),
            comFunction2.getCompanyCategoriess(),
            comFunction.getCountries(),
            comFunction.getParentCompany()

        ]);
        // console.log("getCountries", getCountries);
        // console.log("getParentCompany", getParentCompany);

        // Render the 'edit-user' EJS view and pass the data
        res.render('add-company', {
            menu_active_id: 'company',
            page_title: 'Add Organization',
            currentUserData,
            company_categories: company_all_categories,
            getCountries: getCountries,
            getParentCompany: getParentCompany
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.get('/categories/:countryId', async (req, res) => {
    const countryId = req.params.countryId;

    const getcountryquery = `SELECT * FROM countries WHERE shortname = "${countryId}"`;
    const getcountryval = await queryAsync(getcountryquery);
    if (getcountryval.length > 0) {
        var countryid = getcountryval[0].id;
        console.log("countryid", countryid);
    }
    else {
        countryid = "101"
    }

    try {
        const nestedCategoriesHTML = await comFunction2.getCompanyCategoriess(countryid);
        console.log("nestedCategoriesHTML", nestedCategoriesHTML);
        res.status(200).send(nestedCategoriesHTML);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Error fetching categories');
    }
})
router.get('/edit-categories/:countryId/:compid', async (req, res) => {
    const countryId = req.params.countryId;
    const compid = req.params.compid;
    console.log("editcompid", compid);

    const getcountryquery = `SELECT * FROM countries WHERE shortname = "${countryId}"`;
    const getcountryval = await queryAsync(getcountryquery);
    if (getcountryval.length > 0) {
        var countryid = getcountryval[0].id;
        console.log("countryid", countryid);
    }
    else {
        var countryid = "101"
    }

    try {
        const nestedCategoriesHTML = await comFunction2.getCompanyCategoryBuID(countryid, compid);
        console.log("nestedCategoriesHTML", nestedCategoriesHTML);
        res.status(200).send(nestedCategoriesHTML);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Error fetching categories');
    }
})


// router.get('/companies', checkLoggedIn, async (req, res) => {
//     try {
//         const encodedUserData = req.cookies.user;
//         const currentUserData = JSON.parse(encodedUserData);

//         const [allcompany] = await Promise.all([
//             comFunction.getAllCompany(),
//         ]);

//         let countries = [];
//         await Promise.all(allcompany.map(async company => {
//             if (company.main_address_country && !countries.includes(company.main_address_country)) {
//                 countries.push(company.main_address_country);

//                 var company_country_query = `SELECT name FROM countries WHERE shortname= ?`;
//                 var company_country_value = await query(company_country_query, [company.main_address_country]);

//                 if (company_country_value.length > 0) {
//                     company.country_name = company_country_value[0].name;
//                 } else {
//                     company.country_name = null;
//                 }
//             }
//         }));

//         res.render('companies', {
//             menu_active_id: 'company',
//             page_title: 'Organizations',
//             currentUserData,
//             allcompany: allcompany,
//             countries: countries
//         });
//     } catch (error) {
//         console.error("Error:", error);
//         res.status(500).send("Internal Server Error");
//     }

// });

router.get('/companies', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        const [allcompany] = await Promise.all([
            comFunction2.getAllParentCompany(),
        ]);

        console.log("allcompany", allcompany);
        let countries = [];
        // await Promise.all(allcompany.map(async company => {
        //     if (company.main_address_country && !countries.includes(company.main_address_country)) {
        //         countries.push(company.main_address_country);

        //         var company_country_query = `SELECT name FROM countries WHERE shortname= ?`;
        //         var company_country_value = await query(company_country_query, [company.main_address_country]);
        //         console.log("company_country_value[0].name;",company_country_value[0].name);

        //         if (company_country_value.length > 0) {
        //             company.country_name = company_country_value[0].name;
        //         } else {
        //             company.country_name = null;
        //         }
        //     }
        // }));

        await Promise.all(allcompany.map(async company => {
            try {
                if (company.main_address_country) {
                    countries.push(company.main_address_country);

                    var company_country_query = `SELECT name FROM countries WHERE shortname = ?`;
                    var company_country_value = await query(company_country_query, [company.main_address_country]);

                    if (company_country_value.length > 0) {
                        company.country_name = company_country_value[0].name;
                    } else {
                        company.country_name = null;
                    }
                } else {
                    company.country_name = null;
                }
            } catch (error) {
                console.error(`Error fetching country name for company ID ${company.id}:`, error);
                company.country_name = null;
            }
        }));


        res.render('companies', {
            menu_active_id: 'company',
            page_title: 'Organizations',
            currentUserData,
            allcompany: allcompany,
            countries: countries
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }

});

router.get('/new-companies', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        const [allcompany] = await Promise.all([
            comFunction2.getAllnewParentCompany(),
        ]);
        console.log("allcompany", allcompany);
        let countries = [];
        await Promise.all(allcompany.map(async company => {
            try {
                if (company.main_address_country) {
                    countries.push(company.main_address_country);

                    var company_country_query = `SELECT name FROM countries WHERE shortname = ?`;
                    var company_country_value = await query(company_country_query, [company.main_address_country]);

                    if (company_country_value.length > 0) {
                        company.country_name = company_country_value[0].name;
                    } else {
                        company.country_name = null;
                    }
                } else {
                    company.country_name = null;
                }
            } catch (error) {
                console.error(`Error fetching country name for company ID ${company.id}:`, error);
                company.country_name = null;
            }
        }));
        res.render('temp-company', {
            menu_active_id: 'company',
            page_title: 'Organizations',
            currentUserData,
            currentUserData,
            allcompany: allcompany,
            countries: countries
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }

});

router.get('/trashed-companies', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [allcompany] = await Promise.all([
            comFunction.getAllTrashedCompany(),
        ]);

        // Render the 'edit-user' EJS view and pass the data
        // res.json({
        //     allcompany: allcompany
        // });
        res.render('trashed-companies', {
            menu_active_id: 'company',
            page_title: 'Trashed Companies',
            currentUserData,
            allcompany: allcompany
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/edit-company/:id', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const companyId = req.params.id;

        const getcompanyquery = `SELECT *
        FROM company 
        WHERE company.ID = ?`;
        const getcompanyvalue = await query(getcompanyquery, [companyId]);
        if (getcompanyvalue.length > 0) {
            var comp_state_id = getcompanyvalue[0].main_address_state;
            //console.log("comp_state_id",comp_state_id);
            var comp_country_shortname = getcompanyvalue[0].main_address_country;
            //console.log("comp_country_shortname",comp_country_shortname);
        }
        const getcountryidquery = `SELECT * FROM countries WHERE shortname=?`;
        const getcountryidvalue = await query(getcountryidquery, [comp_country_shortname]);
        if (getcountryidvalue.length > 0) {
            var comp_country_id = getcountryidvalue[0].id;
            //console.log("comp_country_id",comp_country_id);
        }

        const getstatequery = `SELECT * FROM states WHERE country_id=?`;
        const getstatevalue = await query(getstatequery, [comp_country_id]);

        if (getstatevalue.length > 0) {
            var statevalue = getstatevalue[0].name;
            //console.log("statevalue",statevalue);
        }



        // Fetch all the required data asynchronously
        const [company, company_all_categories, users, getParentCompany, getCountries, getStatesByCountryID, getChildCompany] = await Promise.all([
            comFunction.getCompany(companyId),
            comFunction.getCompanyCategoryBuID(companyId),
            comFunction.getUsersByRole(2),
            comFunction.getParentCompany(),
            comFunction.getCountries(),
            comFunction.getStatesByCountryID(comp_country_id),
            comFunction2.getChildCompany(companyId)
            //comFunction.getCompanyMeta(userId),
            //comFunction.getCountries(),
            //comFunction.getStatesByUserID(userId)
        ]);
        console.log("company", company);
        console.log("getStatesByCountryID", getStatesByCountryID);
        //console.log("getChildCompany", getChildCompany);

        let countries = [];
        await Promise.all(getChildCompany.map(async company => {
            if (company.main_address_country && !countries.includes(company.main_address_country)) {
                countries.push(company.main_address_country);

                var company_country_query = `SELECT name FROM countries WHERE shortname= ?`;
                var company_country_value = await query(company_country_query, [company.main_address_country]);

                if (company_country_value.length > 0) {
                    company.country_name = company_country_value[0].name;
                } else {
                    company.country_name = null;
                }
            }
        }));





        // Render the 'edit-user' EJS view and pass the data
        // res.json({
        //     menu_active_id: 'company',
        //     page_title: 'Edit Company',
        //     currentUserData,
        //     company: company,
        //     company_all_categories: company_all_categories,
        //     users: users
        //     //countries: countries,
        //     //states: states            
        // });
        res.render('edit-company', {
            menu_active_id: 'company',
            page_title: 'Edit Company',
            currentUserData,
            company: company,
            company_all_categories: company_all_categories,
            Allusers: users,
            getParentCompany: getParentCompany,
            getCountries: getCountries,
            statevalue: statevalue,
            getStatesByCountryID: getStatesByCountryID,
            getChildCompany: getChildCompany,
            countries: countries
            //countries: countries,
            //states: states            
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/edit-new-company/:id', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const companyId = req.params.id;

        const getcompanyquery = `SELECT *
        FROM temp_company 
        WHERE temp_company.ID = ?`;
        const getcompanyvalue = await query(getcompanyquery, [companyId]);
        if (getcompanyvalue.length > 0) {
            var comp_state_id = getcompanyvalue[0].main_address_state;
            //console.log("comp_state_id",comp_state_id);
            var comp_country_shortname = getcompanyvalue[0].main_address_country;
            //console.log("comp_country_shortname",comp_country_shortname);
        }
        const getcountryidquery = `SELECT * FROM countries WHERE shortname=?`;
        const getcountryidvalue = await query(getcountryidquery, [comp_country_shortname]);
        if (getcountryidvalue.length > 0) {
            var comp_country_id = getcountryidvalue[0].id;
            //console.log("comp_country_id",comp_country_id);
        }

        const getstatequery = `SELECT * FROM states WHERE country_id=?`;
        const getstatevalue = await query(getstatequery, [comp_country_id]);

        if (getstatevalue.length > 0) {
            var statevalue = getstatevalue[0].name;
            //console.log("statevalue",statevalue);
        }



        // Fetch all the required data asynchronously
        const [company, company_all_categories, users, getParentCompany, getCountries, getStatesByCountryID, getChildCompany] = await Promise.all([
            comFunction.getnewCompany(companyId),
            comFunction.getCompanyCategoryBuID(companyId),
            comFunction.getUsersByRole(2),
            comFunction.getParentCompany(),
            comFunction.getCountries(),
            comFunction.getStatesByCountryID(comp_country_id),
        ]);
        console.log("companysss", company);


        let countries = [];

        res.render('edit-new-company', {
            menu_active_id: 'company',
            page_title: 'Edit Company',
            currentUserData,
            company: company,
            Allusers: users,
            getParentCompany: getParentCompany,
            getCountries: getCountries,
            statevalue: statevalue,
            getStatesByCountryID: getStatesByCountryID,
            countries: countries
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.post('/edit-new-company-data/:id', upload.single('logo'), async (req, res) => {
    //console.log(req.body);
    console.log('editCompany', req.body);
    //return false;
    try {
        const companyID = req.body.company_id;
        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        db.query(`SELECT slug FROM temp_company WHERE slug = '${req.body.company_slug}' AND ID != '${companyID}' `, async (slugErr, slugResult) => {
            if (slugErr) {
                return res.send({
                    status: 'err',
                    data: '',
                    message: 'An error occurred while updating the company details: ' + slugErr
                });
            }
            if (slugResult.length > 0) {
                return res.send({
                    status: 'err',
                    data: '',
                    message: 'Company slug already exist'
                });
            } else {
                // Update company details in the company table
                const updateQuery = 'UPDATE temp_company SET company_name = ?, heading = ?, logo = ?, about_company = ?, comp_phone = ?, comp_email = ?, comp_registration_id = ?, status = ?, trending = ?, updated_date = ?, tollfree_number = ?, main_address = ?, main_address_pin_code = ?, address_map_url = ?, main_address_country = ?, main_address_state = ?, main_address_city = ?, verified = ?, paid_status = ?, slug = ?, membership_type_id = ?, complaint_status = ?, complaint_level = ?, parent_id = ?, review_display_type = ? WHERE ID = ?';
                const updateValues = [
                    req.body.company_name,
                    req.body.heading,
                    '',
                    req.body.about_company,
                    req.body.comp_phone,
                    req.body.comp_email,
                    req.body.comp_registration_id,
                    req.body.status,
                    req.body.trending,
                    formattedDate,
                    req.body.tollfree_number,
                    req.body.main_address,
                    req.body.main_address_pin_code,
                    req.body.address_map_url,
                    req.body.main_address_country,
                    req.body.main_address_state,
                    req.body.main_address_city,
                    req.body.verified,
                    req.body.payment_status.trim(),
                    req.body.company_slug,
                    req.body.membership_type_id,
                    req.body.complaint_status,
                    req.body.complaint_level,
                    req.body.parent_id,
                    req.body.review_display_type,
                    companyID
                ];

                if (req.files.logo) {
                    // Unlink (delete) the previous file
                    const unlinkcompanylogo = "uploads/" + req.body.previous_logo;
                    fs.unlink(unlinkcompanylogo, (err) => {
                        if (err) {
                            //console.error('Error deleting file:', err);
                        } else {
                            //console.log('Previous file deleted');
                        }
                    });

                    updateValues[2] = req.files.logo[0].filename;
                } else {
                    updateValues[2] = req.body.previous_logo;
                }
                if (req.files.cover_img) {
                    // Unlink (delete) the previous file
                    const unlinkcompanycover_img = "uploads/" + req.body.previous_cover_img;
                    fs.unlink(unlinkcompanycover_img, (err) => {
                        if (err) {
                            //console.error('Error deleting file:', err);
                        } else {
                            //console.log('Previous file deleted');
                        }
                    });
                }
                db.query(updateQuery, updateValues, (err, results) => {
                    if (err) {
                        // Handle the error
                        return res.send({
                            status: 'err',
                            data: '',
                            message: 'An error occurred while updating the company details: ' + err
                        });
                    }
                    else {
                        return res.send({
                            status: 'ok',
                            data: companyID,
                            message: 'Company details updated successfully'
                        });
                    }
                })
            }
        })
    } catch (error) {
        console.error('Error:', error);
        return res.send({
            status: 'err',
            //data: companyId,
            message: error.message
        });
    }
})


router.get('/edit-complaints/:id', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const complaintId = req.params.id;
        console.log("complaintId", complaintId);

        const getcompanyquery = `SELECT *
        FROM complaint 
        WHERE complaint.id = ?`;
        const getcompanyvalue = await query(getcompanyquery, [complaintId]);
        if (getcompanyvalue.length > 0) {
            console.log("getcompanyvalue", getcompanyvalue);
            var companyID = getcompanyvalue[0].company_id;
            console.log("companyID", companyID);
        }
        const [complaint, getAllCompany] = await Promise.all([
            comFunction.getComplaint(complaintId),
            comFunction.getAllCompany(),
        ]);
        console.log("complaint", complaint);

        var getcomplaintcategory = `SELECT * FROM complaint_category WHERE company_id = ? AND parent_id = 0`;
        var getcomplaintcategoryval = await queryAsync(getcomplaintcategory, [companyID]);
        console.log("getcomplaintcategoryval", getcomplaintcategoryval);

        res.render('edit-complaint', {
            menu_active_id: 'complaint',
            page_title: 'Edit complaint',
            currentUserData,
            complaint: complaint,
            allcompany: getAllCompany,
            getcomplaintcategoryval: getcomplaintcategoryval
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
// router.get('/complain-sub-category', (req, res) => {
//     const category_id = req.query.category_id;
//     console.log("complain-sub-category_cat",category_id);

//     db.query('SELECT * FROM complaint_category WHERE  parent_id = ? ', [category_id], (err, results) => {
//         if (err) {
//             return res.send({
//                 status: 'err',
//                 data: '',
//                 message: 'An error occurred while processing your request: ' + err
//             });
//         } else {
//             if (results.length > 0) {
//                 console.log("Subcategories",results);
//                 return res.send({
//                     status: 'ok',
//                     data: results,
//                     message: 'Subcategories received'
//                 });
//             } else {
//                 return res.send({
//                     status: 'err',
//                     data: '',
//                     message: 'No subcategories available for this category ID'
//                 });
//             }
//         }
//     });
// });

router.get('/complain-sub-category', (req, res) => {
    const category_id = req.query.category_id;
    console.log("complain-sub-category_cat", category_id);

    const defaultSubCategory = { id: 0, category_name: 'General' };

    if (category_id == 0) {
        return res.send({
            status: 'ok',
            data: [defaultSubCategory],
            message: 'General sub-category returned'
        });
    } else {
        db.query('SELECT * FROM complaint_category WHERE parent_id = ?', [category_id], (err, results) => {
            if (err) {
                return res.send({
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request: ' + err
                });
            } else {
                if (results.length > 0) {
                    console.log("Subcategories", results);
                    return res.send({
                        status: 'ok',
                        data: results,
                        message: 'Subcategories received'
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        data: [defaultSubCategory],
                        message: 'No subcategories available for this category ID, returning General'
                    });
                }
            }
        });
    }
});



router.get('/plans', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const companyId = req.params.id;

        const getcompanyquery = `SELECT *
        FROM company 
        WHERE company.ID = ?`;
        const getcompanyvalue = await query(getcompanyquery, [companyId]);
        if (getcompanyvalue.length > 0) {
            var comp_state_id = getcompanyvalue[0].main_address_state;
            //console.log("comp_state_id",comp_state_id);
            var comp_country_shortname = getcompanyvalue[0].main_address_country;
            //console.log("comp_country_shortname",comp_country_shortname);
        }
        const getcountryidquery = `SELECT * FROM countries WHERE shortname=?`;
        const getcountryidvalue = await query(getcountryidquery, [comp_country_shortname]);
        if (getcountryidvalue.length > 0) {
            var comp_country_id = getcountryidvalue[0].id;
            //console.log("comp_country_id",comp_country_id);
        }

        const getstatequery = `SELECT * FROM states WHERE country_id=?`;
        const getstatevalue = await query(getstatequery, [comp_country_id]);

        if (getstatevalue.length > 0) {
            var statevalue = getstatevalue[0].name;
            //console.log("statevalue",statevalue);
        }


        const basic_query = `SELECT * FROM plan_management WHERE name = 'Basic'`;
        const basic_value = await query(basic_query);
        if (basic_value.length > 0) {
            var basic_val = basic_value[0];
            console.log("basic_val", basic_val);
            //return res.status(500).json({ message: 'Already added for Basic Plan Managemnet.' });
        }


        const standard_query = `SELECT * FROM plan_management WHERE name = 'standard'`;
        const standard_value = await query(standard_query);
        if (standard_value.length > 0) {
            var standard_val = standard_value[0];
            //console.log("standard_val",standard_val);
            //return res.status(500).json({ message: 'Already added for Standard Plan Managemnet.' });
        }


        const advanced_query = `SELECT * FROM plan_management WHERE name = 'advanced'`;
        const advanced_value = await query(advanced_query);
        if (advanced_value.length > 0) {
            var advanced_val = advanced_value[0];
            //console.log("advanced_val",advanced_val);
            //return res.status(500).json({ message: 'Already added for Advanced Plan Managemnet.' });
        }


        const premium_query = `SELECT * FROM plan_management WHERE name = 'premium'`;
        const premium_value = await query(premium_query);
        if (premium_value.length > 0) {
            var premium_val = premium_value[0];
            console.log("premium_value", premium_val);
            //return res.status(500).json({ message: 'Already added for Premium Plan Managemnet.' });
        }

        const enterprise_query = `SELECT * FROM plan_management WHERE name = 'enterprise'`;
        const enterprise_value = await query(enterprise_query);
        if (enterprise_value.length > 0) {
            var enterprise_val = enterprise_value[0];
            //console.log("enterprise_val",enterprise_val);
        }


        // Fetch all the required data asynchronously
        const [company, company_all_categories, company_plans] = await Promise.all([
            comFunction.getCompany(companyId),
            comFunction.getCompanyCategoryBuID(companyId),
        ]);

        res.render('plans', {
            menu_active_id: 'company',
            page_title: 'Plans',
            currentUserData,
            company: company,
            company_all_categories: company_all_categories,
            basic_val,
            standard_val,
            advanced_val,
            premium_val,
            enterprise_val

        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.get('/currency-conversion', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const companyId = req.params.id;

        const getquery = `SELECT * FROM currency_conversion`;
        const getval = await queryAsync(getquery)
        if (getval.length > 0) {
            var getcurrency = getval[0]
        }
        //else{
        //     var getcurrency = null
        // }
        console.log("getcurrency", getcurrency);

        return res.render('curreny_conversion', {
            menu_active_id: 'company',
            page_title: 'Currency Convertion',
            currentUserData,
            getcurrency
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.get('/success', (req, res) => {
    res.send('Subscription successful!');
});

router.get('/cancel', (req, res) => {
    res.send('Subscription canceled.');
});


router.get('/subscription', async (req, res) => {
    const planName = req.query.plan;
    console.log("planName", planName);

    try {
        const query = 'SELECT * FROM plan_management WHERE name = ?';
        const rows = await queryAsync(query, [planName]);
        console.log("rows", rows);

        if (rows.length > 0) {
            const planDetails = rows;
            console.log("planDetails", planDetails);
            res.render('front-end/subscription', { plan: planDetails });
        } else {
            res.status(404).send('Plan not found');
        }
    } catch (error) {
        console.error('Error fetching plan details:', error);
        res.status(500).send('Internal Server Error');
    }
});



//router.post('/api/v1/create-subscription-checkout-session', async (req, res) => {
// router.post('/api/v1/create-checkout-session', async (req, res) => {

//     const { planId } = req.body;

//     try {
//         const session = await stripe.checkout.sessions.create({
//             mode: 'subscription',
//             payment_method_types: ['card'],
//             line_items: [
//                 {
//                     price: planId,
//                     quantity: 1,
//                 },
//             ],
//             success_url: 'http://localhost:2000/success',
//             cancel_url: 'http://localhost:2000/cancel',
//         });

//         res.json({ id: session.id });
//     } catch (error) {
//         console.error('Error creating checkout session:', error);
//         res.status(500).json({ error: 'Failed to create checkout session' });
//     }
// });

router.post('/api/v1/create-checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment', // Use payment mode instead of subscription mode
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: 'Product 1',
                    },
                    unit_amount: Math.round(1000), // £10.00
                },
                quantity: 1,
            },
            {
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: 'Product 4',
                    },
                    unit_amount: Math.round(750), // £7.50
                },
                quantity: 3,
            }
            ],
            success_url: 'http://localhost:2000/success',
            cancel_url: 'http://localhost:2000/cancel',
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});




//

router.get('/discussion-listing', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [AllDiscussions] = await Promise.all([
            comFunction2.getAllDiscussions(),
        ]);

        // Render the 'edit-user' EJS view and pass the data
        // res.json( {
        //     menu_active_id: 'pages',
        //     page_title: 'Discussion Listing',
        //     currentUserData,
        //     AllDiscussions: AllDiscussions
        // });
        res.render('discussion-listing', {
            menu_active_id: 'miscellaneous',
            page_title: 'Discussion Listing',
            currentUserData,
            AllDiscussions: AllDiscussions
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});



router.get('/edit-discussion/:id', checkLoggedIn, async (req, res) => {
    try {
        console.log("AAAA")
        const encodedUserData = req.cookies.user;

        if (!encodedUserData) {
            // If user is not logged in, redirect to admin-login
            return res.redirect('/admin-login');
        }

        const currentUserData = JSON.parse(encodedUserData);
        const review_Id = req.params.id;
        const discussion_Id = req.params.id;

        const admin_mail = await query(`SELECT email FROM users WHERE user_type_id = '1'`);
        const admin_email = admin_mail[0].email;
        console.log("admin_email", admin_email);


        // Fetch all the required data asynchronously
        const [getDiscussionByDiscusId] = await Promise.all([

            comFunction2.getDiscussionByDiscusId(discussion_Id),
        ]);
        console.log("getDiscussionByDiscusId", getDiscussionByDiscusId);
        if (getDiscussionByDiscusId) {
            res.render('edit-discussion', {
                menu_active_id: 'miscellaneous',
                page_title: 'Edit Discussion',
                currentUserData,
                DiscussionDetails: getDiscussionByDiscusId,
                admin_email
            });
        } else {
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: []
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});





router.get('/poll-listing', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [getAllPolls] = await Promise.all([
            comFunction2.getAllPolls(),
        ]);
        res.render('poll-listing', {
            menu_active_id: 'miscellaneous',
            page_title: 'Poll Listing',
            currentUserData,
            AllPolls: getAllPolls
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/complaint-listing', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [getAllComplaints] = await Promise.all([
            comFunction2.getAllComplaints(),
        ]);
        //console.log('getAllComplaints',getAllComplaints)
        // Render the 'edit-user' EJS view and pass the data
        // res.json( {
        //     menu_active_id: 'pages',
        //     page_title: 'Discussion Listing',
        //     currentUserData,
        //     AllDiscussions: AllDiscussions
        // });
        res.render('complaint-listing', {
            menu_active_id: 'miscellaneous',
            page_title: 'Complaint Listing',
            currentUserData,
            AllComplaints: getAllComplaints
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/survey-listing', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [getAllSurveys] = await Promise.all([
            comFunction2.getAllSurveys(),
        ]);
        //console.log('getAllSurveys',getAllSurveys)
        res.render('survey-listing', {
            menu_active_id: 'miscellaneous',
            page_title: 'Survey Listing',
            currentUserData,
            AllSurveys: getAllSurveys
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
//---Review Rating Tag--//
router.get('/add-rating-tag', checkLoggedInAdministrator, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        res.render('add-rating-tag', {
            menu_active_id: 'rating-tag',
            page_title: 'Add Tag',
            currentUserData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/review-rating-tags', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [allRatingTags] = await Promise.all([
            comFunction.getAllRatingTags(),
        ]);

        res.render('review-rating-tags', {
            menu_active_id: 'rating-tag',
            page_title: 'All Tags',
            currentUserData,
            allRatingTags: allRatingTags
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/edit-rating-tag/:id', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const review_rating_Id = req.params.id;

        // Fetch all the required data asynchronously
        const [reviewRatingData] = await Promise.all([
            comFunction.getReviewRatingData(review_rating_Id),
            //comFunction.getCompanyCategoryBuID(companyId)
            //comFunction.getCompanyMeta(userId),
        ]);

        // Render the 'edit-user' EJS view and pass the data
        // res.json({
        //     menu_active_id: 'rating-tag',
        //     page_title: 'Edit Rating Tag',
        //     currentUserData,
        //     reviewRatingData: reviewRatingData          
        // });
        res.render('edit-rating-tag', {
            menu_active_id: 'rating-tag',
            page_title: 'Edit Rating Tag',
            currentUserData,
            reviewRatingData: reviewRatingData
            //countries: countries,
            //states: states            
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/all-review', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [allReviews, AllReviewTags] = await Promise.all([
            comFunction.getAllReviews(),
            comFunction2.getAllReviewTags(),
        ]);
        //console.log(currentUserData);

        // res.json({
        //     menu_active_id: 'review',
        //     page_title: 'All Review',
        //     currentUserData,
        //     allReviews: allReviews
        // });
        res.render('all-review', {
            menu_active_id: 'review',
            page_title: 'All Review',
            currentUserData,
            allReviews: allReviews,
            AllReviewTags: AllReviewTags
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/temporay-review', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [allReviews, AllReviewTags] = await Promise.all([
            comFunction.getTempReviews(),
            comFunction2.getAlltempReviewTags(),
        ]);
        console.log("allReviews", allReviews);

        // res.json({
        //     menu_active_id: 'review',
        //     page_title: 'All Review',
        //     currentUserData,
        //     allReviews: allReviews
        // });
        res.render('temp-reviews', {
            menu_active_id: 'review',
            page_title: 'Temp Review',
            currentUserData,
            allReviews: allReviews,
            AllReviewTags: AllReviewTags
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/flag-review', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [allReviews, AllReviewTags] = await Promise.all([
            comFunction2.getAllFlaggedReviews(),
            comFunction2.getAllReviewTags(),
        ]);
        //console.log(currentUserData);

        // res.json({
        //     menu_active_id: 'review',
        //     page_title: 'All Review',
        //     currentUserData,
        //     allReviews: allReviews
        // });
        res.render('flag-review', {
            menu_active_id: 'review',
            page_title: 'Flag Reviews',
            currentUserData,
            allReviews: allReviews,
            AllReviewTags: AllReviewTags
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/edit-review/:id', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const review_Id = req.params.id;

        // Fetch all the required data asynchronously
        const [reviewData, reviewTagData, allcompany, getCompanyCategoryByReviewId, getCompanyProductByReviewId] = await Promise.all([
            comFunction.getCustomerReviewData(review_Id),
            comFunction.getCustomerReviewTagRelationData(review_Id),
            comFunction.getAllCompany(),
            comFunction2.getCompanyCategoryByReviewId(review_Id),
            comFunction2.getCompanyProductByReviewId(review_Id),
        ]);
        console.log("reviewData", reviewData);
        //console.log("allcompany",allcompany);
        // Render the 'edit-user' EJS view and pass the data
        // res.json({
        //     reviewData: reviewData,
        //     reviewTagData: reviewTagData,
        //     allcompany      
        // });
        if (reviewData) {
            // res.json( {
            //     menu_active_id: 'review',
            //     page_title: 'Edit Review',
            //     currentUserData,
            //     reviewData,
            //     reviewTagData: reviewTagData,
            //     allcompany,
            //     CompanyCategory:getCompanyCategoryByReviewId,
            //     Companyproduct:getCompanyProductByReviewId             
            // });
            res.render('edit-review', {
                menu_active_id: 'review',
                page_title: 'Edit Review',
                currentUserData,
                reviewData,
                reviewTagData: reviewTagData,
                allcompany,
                CompanyCategory: getCompanyCategoryByReviewId,
                Companyproduct: getCompanyProductByReviewId
            });
        } else {
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: []
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
//edit flagged reviews
router.get('/edit-flagged-review/:id', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const review_Id = req.params.id;

        // Fetch all the required data asynchronously
        const [reviewData, reviewTagData, allcompany] = await Promise.all([
            comFunction.getCustomerReviewData(review_Id),
            comFunction.getCustomerReviewTagRelationData(review_Id),
            comFunction.getAllCompany()
        ]);
        //console.log(reviewData);
        // Render the 'edit-user' EJS view and pass the data
        // res.json({
        //     reviewData: reviewData,
        //     reviewTagData: reviewTagData,
        //     allcompany      
        // });
        if (reviewData) {
            // res.json({
            //     menu_active_id: 'review',
            //     page_title: 'Edit Review',
            //     currentUserData,
            //     reviewData,
            //     reviewTagData: reviewTagData,
            //     allcompany            
            // });
            res.render('edit-flagged-review', {
                menu_active_id: 'review',
                page_title: 'Edit Flagged Review',
                currentUserData,
                reviewData,
                reviewTagData: reviewTagData,
                allcompany
            });
        } else {
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: []
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
//Add FAQ Page
router.get('/add-faq', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const faqPageData = await comFunction2.getFaqPage();
        // Render the 'add-page' EJS view and pass the data
        res.render('faq/add-faq', {
            menu_active_id: 'pages',
            page_title: 'FAQs ',
            currentUserData,
            faqPageData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit FAQ Page
router.get('/edit-faq', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        let country_name = req.cookies.countryName
            || 'India';
        let country_code = req.cookies.countryCode
            || 'IN';
        console.log("country_namesfaq", country_name);
        console.log("country_codesfaq", country_code);

        if (country_code != 'UK' && country_code != 'JP') {
            country_code = 'US';
        }

        const faqPageDatas = await comFunction2.getFaqPage();
        const faqCategoriesData = await comFunction2.getFaqCategories('US');
        const faqItemsData = await comFunction2.getFaqItems('US');
        console.log("faqPageDatas", faqPageDatas);
        console.log("faqCategoriesData", faqCategoriesData);
        console.log("faqItemsData", faqItemsData);
        var faqPageData = faqPageDatas[0];
        console.log("faqPageData", faqPageData);

        res.render('faq/edit-faq', {
            menu_active_id: 'pages',
            page_title: 'Edit FAQs ',
            currentUserData,
            faqPageData,
            faqCategoriesData,
            faqItemsData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.get('/uk-edit-faq', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        let country_name = req.cookies.countryName
            || 'India';
        let country_code = req.cookies.countryCode
            || 'IN';
        console.log("country_namesfaq", country_name);
        console.log("country_codesfaq", country_code);

        if (country_code != 'UK' && country_code != 'JP') {
            country_code = 'US';
        }

        const faqPageDatas = await comFunction2.getFaqPage();
        const faqCategoriesData1 = await comFunction2.getFaqCategories('UK');
        const faqItemsData1 = await comFunction2.getFaqItems('UK');
        console.log("faqPageDatas", faqPageDatas);
        console.log("faqCategoriesData1", faqCategoriesData1);
        console.log("faqItemsData1", faqItemsData1);
        var faqPageData1 = faqPageDatas[1];
        console.log("faqPageData", faqPageData1);

        res.render('faq/uk-edit-faq', {
            menu_active_id: 'pages',
            page_title: 'Edit FAQs ',
            currentUserData,
            faqPageData1,
            faqCategoriesData1,
            faqItemsData1
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/jp-edit-faq', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        let country_name = req.cookies.countryName
            || 'India';
        let country_code = req.cookies.countryCode
            || 'IN';
        console.log("country_namesfaq", country_name);
        console.log("country_codesfaq", country_code);

        if (country_code != 'UK' && country_code != 'JP') {
            country_code = 'US';
        }

        const faqPageDatas = await comFunction2.getFaqPage();
        const faqCategoriesData2 = await comFunction2.getFaqCategories('JP');
        const faqItemsData2 = await comFunction2.getFaqItems('JP');
        console.log("faqPageDatas", faqPageDatas);
        console.log("faqCategoriesData2", faqCategoriesData2);
        console.log("faqItemsData2", faqItemsData2);
        var faqPageData2 = faqPageDatas[2];
        console.log("faqPageData2", faqPageData2);

        res.render('faq/jp-edit-faq', {
            menu_active_id: 'pages',
            page_title: 'Edit FAQs ',
            currentUserData,
            faqPageData2,
            faqCategoriesData2,
            faqItemsData2,
            activeCountry: 'JP'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit Contact Page
router.get('/edit-contacts', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        let country_name = req.cookies.countryName
            || 'India';
        let country_code = req.cookies.countryCode
            || 'IN';
        console.log("country_namesfaq", country_name);
        console.log("country_codesfaq", country_code);

        if (country_code != 'UK' && country_code != 'JP') {
            country_code = 'US';
        }
        const sql = `SELECT * FROM contacts WHERE country = "${country_code}"`;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const social_sql = `SELECT * FROM socials`;
            db.query(social_sql, (error, social_results, fields) => {
                const contacts = results[0];
                const socials = social_results[0];
                //Render the 'update-contact' EJS view and pass the data

                const contact_address_sql = `SELECT * FROM contact_address`;
                db.query(contact_address_sql, (errors, address_results, fieldss) => {
                    const address = address_results[0];
                    console.log("address", address);
                    console.log("socials", socials);


                    res.render('pages/update-contact', {
                        menu_active_id: 'pages',
                        page_title: 'Update Contacts',
                        currentUserData,
                        contacts,
                        socials,
                        address
                    });
                })
            })
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/uk-edit-contacts', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM contacts`;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const social_sql = `SELECT * FROM socials`;
            db.query(social_sql, (error, social_results, fields) => {
                const contacts = results[0];
                const socials = social_results[0];

                const contacts1 = results[1];
                const socials1 = social_results[1];

                const contacts2 = results[2];
                const socials2 = social_results[2];

                // console.log("contacts",contacts);
                // console.log("contacts1",contacts1);
                // console.log("contacts2",contacts2);

                // console.log("socials",socials);
                // console.log("socials1",socials1);
                // console.log("socials2",socials2);

                //Render the 'update-contact' EJS view and pass the data
                res.render('pages/uk-update-contact', {
                    menu_active_id: 'pages',
                    page_title: 'Update Contacts',
                    currentUserData,
                    contacts,
                    contacts1,
                    contacts2,
                    socials,
                    socials1,
                    socials2
                });
            })
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/jp-edit-contacts', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM contacts`;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const social_sql = `SELECT * FROM socials`;
            db.query(social_sql, (error, social_results, fields) => {
                const contacts = results[0];
                const socials = social_results[0];

                const contacts1 = results[1];
                const socials1 = social_results[1];

                const contacts2 = results[2];
                const socials2 = social_results[2];

                // console.log("contacts",contacts);
                // console.log("contacts1",contacts1);
                // console.log("contacts2",contacts2);

                // console.log("socials",socials);
                // console.log("socials1",socials1);
                // console.log("socials2",socials2);

                //Render the 'update-contact' EJS view and pass the data
                res.render('pages/jp-update-contact', {
                    menu_active_id: 'pages',
                    page_title: 'Update Contacts',
                    currentUserData,
                    contacts,
                    contacts1,
                    contacts2,
                    socials,
                    socials1,
                    socials2
                });
            })
        })
        //})

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit Home Page
// router.get('/edit-home', checkLoggedIn, async (req, res) => {

//     const [ReviewCount, UserCount, VisitorCheck] = await Promise.all([
//         comFunction.getReviewCount(),
//         comFunction.getUserCount(),
//         comFunction.getVisitorCheck(requestIp.getClientIp(req))
//     ]);

//     try {
//         const encodedUserData = req.cookies.user;
//         const currentUserData = JSON.parse(encodedUserData);
//         const sql = `SELECT * FROM page_info where secret_Key = 'home' `;
//         db.query(sql, (err, results, fields) => {
//             if (err) throw err;
//             var home = results[0];
//             console.log("homeaaaa",home);


//             if(home){
//             const meta_sql = `SELECT * FROM page_meta where page_id = ${home.id}`;
//             db.query(meta_sql, async (meta_err, _meta_result) => {
//                 if (meta_err) throw meta_err;

//                 const meta_values = _meta_result;
//                 let meta_values_array = {};
//                 await meta_values.forEach((item) => {
//                     meta_values_array[item.page_meta_key] = item.page_meta_value;
//                 })
//                 console.log("meta_values_array",meta_values_array);

//                 res.render('pages/update-home', {
//                     menu_active_id: 'pages',
//                     page_title: 'Update Home',
//                     currentUserData,
//                     home,
//                     meta_values_array,
//                     ReviewCount,
//                     UserCount,
//                     VisitorCheck
//                 });
//             })
//             }
//         })

//     } catch (err) {
//         console.error(err);
//         res.status(500).send('An error occurred');
//     }
// });

router.get('/edit-home', checkLoggedIn, async (req, res) => {
    const [ReviewCount, UserCount, VisitorCheck] = await Promise.all([
        comFunction.getReviewCount(),
        comFunction.getUserCount(),
        comFunction.getVisitorCheck(requestIp.getClientIp(req))
    ]);

    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info WHERE secret_Key = 'home'`;

        db.query(sql, async (err, results, fields) => {
            if (err) throw err;

            const home = results[0];
            const home1 = results[1];
            const home2 = results[2];

            const metaPromises = [home, home1, home2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }

                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });

            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

            res.render('pages/usa-home', {
                menu_active_id: 'pages',
                page_title: 'Home',
                currentUserData,
                home,
                home1,
                home2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2,
                ReviewCount,
                UserCount,
                VisitorCheck
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/uk-edit-home', checkLoggedIn, async (req, res) => {
    const [ReviewCount, UserCount, VisitorCheck] = await Promise.all([
        comFunction.getReviewCount(),
        comFunction.getUserCount(),
        comFunction.getVisitorCheck(requestIp.getClientIp(req))
    ]);

    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info WHERE secret_Key = 'home'`;

        db.query(sql, async (err, results, fields) => {
            if (err) throw err;

            const home = results[0];
            const home1 = results[1];
            const home2 = results[2];

            const metaPromises = [home, home1, home2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }

                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });

            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

            res.render('pages/uk-home', {
                menu_active_id: 'pages',
                page_title: 'UK Home',
                currentUserData,
                home,
                home1,
                home2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2,
                ReviewCount,
                UserCount,
                VisitorCheck
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
router.get('/jp-edit-home', checkLoggedIn, async (req, res) => {
    const [ReviewCount, UserCount, VisitorCheck] = await Promise.all([
        comFunction.getReviewCount(),
        comFunction.getUserCount(),
        comFunction.getVisitorCheck(requestIp.getClientIp(req))
    ]);

    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info WHERE secret_Key = 'home'`;

        db.query(sql, async (err, results, fields) => {
            if (err) throw err;

            const home = results[0];
            const home1 = results[1];
            const home2 = results[2];

            const metaPromises = [home, home1, home2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }

                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });

            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

            res.render('pages/jp-home', {
                menu_active_id: 'pages',
                page_title: 'JAPAN Home',
                currentUserData,
                home,
                home1,
                home2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2,
                ReviewCount,
                UserCount,
                VisitorCheck
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});



//Edit About Page
// router.get('/edit-about', checkLoggedIn, (req, res) => {
//     try {
//         const encodedUserData = req.cookies.user;
//         const currentUserData = JSON.parse(encodedUserData);
//         const sql = `SELECT * FROM page_info where secret_Key = 'about' `;
//         db.query(sql, (err, results, fields) => {
//             if (err) throw err;
//             const about_info = results[0];
//             const meta_sql = `SELECT * FROM page_meta where page_id = ${about_info.id}`;
//             db.query(meta_sql, async (meta_err, _meta_result) => {
//                 if (meta_err) throw meta_err;

//                 const meta_values = _meta_result;
//                 let meta_values_array = {};
//                 await meta_values.forEach((item) => {
//                     meta_values_array[item.page_meta_key] = item.page_meta_value;
//                 })
//                 //console.log(meta_values_array);
//                 res.render('pages/update-about', {
//                     menu_active_id: 'pages',
//                     page_title: 'Update About',
//                     currentUserData,
//                     about_info,
//                     meta_values_array
//                 });
//                 //comFunction.getMetaValue(home.id, 'about_us_button_link');

//                 // res.json({
//                 //     menu_active_id: 'pages',
//                 //     page_title: 'Update Home',
//                 //     currentUserData,
//                 //     home,
//                 //     meta_values_array
//                 // });
//             })

//         })

//     } catch (err) {
//         console.error(err);
//         res.status(500).send('An error occurred');
//     }
// });

router.get('/edit-about', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'about' `;
        db.query(sql, async (err, results, fields) => {
            if (err) throw err;
            const about_info = results[0];
            const about_info1 = results[1];
            const about_info2 = results[2];

            console.log("about_info1", about_info1);

            const metaPromises = [about_info, about_info1, about_info2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }
                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });
            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

            //console.log(meta_values_array);
            res.render('pages/update-about', {
                menu_active_id: 'pages',
                page_title: 'Update About',
                currentUserData,
                about_info,
                about_info1,
                about_info2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2
            });
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/uk-edit-about', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'about' `;
        db.query(sql, async (err, results, fields) => {
            if (err) throw err;
            const about_info = results[0];
            const about_info1 = results[1];
            const about_info2 = results[2];

            const metaPromises = [about_info, about_info1, about_info2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }
                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });
            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

            //console.log(meta_values_array);
            res.render('pages/uk-about-us', {
                menu_active_id: 'pages',
                page_title: 'UK About Us',
                currentUserData,
                about_info,
                about_info1,
                about_info2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2
            });
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/jp-edit-about', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'about' `;
        db.query(sql, async (err, results, fields) => {
            if (err) throw err;
            const about_info = results[0];
            const about_info1 = results[1];
            const about_info2 = results[2];
            console.log("about_info1", about_info1);

            const metaPromises = [about_info, about_info1, about_info2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }
                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });
            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

            //console.log(meta_values_array);
            res.render('pages/jp-about-us', {
                menu_active_id: 'pages',
                page_title: 'Japan About Us',
                currentUserData,
                about_info,
                about_info1,
                about_info2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2
            });
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


//---Add Featured Company--//
router.get('/add-featured-company', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM company where 1`;
        db.query(sql, (err, companies, fields) => {
            // Render the 'edit-user' EJS view and pass the data
            res.render('pages/add-featured-company', {
                menu_active_id: 'company',
                page_title: 'Add Featured Company',
                currentUserData,
                companies
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//---Edit Featured Company--//
router.get('/edit-featured-company/:id', checkLoggedIn, async (req, res) => {
    try {
        const comp_id = req.params.id;
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.status,featured_companies.ordering,featured_companies.short_desc,featured_companies.link,company.logo,company.company_name FROM featured_companies 
                        JOIN company ON featured_companies.company_id = company.ID 
                        WHERE featured_companies.id = ${comp_id} `;
        db.query(sql, (err, company, fields) => {
            // Render the 'edit-user' EJS view and pass the data
            //console.log(company);
            const f_company = company[0];
            res.render('pages/edit-featured-company', {
                menu_active_id: 'company',
                page_title: 'Update Featured Company',
                currentUserData,
                f_company
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//---Edit Featured Company--//
router.get('/delete-featured-companies/:id', checkLoggedIn, async (req, res) => {
    try {
        const comp_id = req.params.id;
        sql = `DELETE FROM featured_companies WHERE id = ?`;
        const data = [comp_id];
        db.query(sql, data, (err, result) => {
            if (err) {
                return res.send({
                    status: 'not ok',
                    message: 'Something went wrong'
                });
            } else {
                return res.send({
                    status: 'ok',
                    message: 'Featured Company Deleted Successfully'
                });
            }

        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//---View Featured Company--//
router.get('/view-featured-companies', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.status,featured_companies.ordering,featured_companies.short_desc,featured_companies.link,company.logo, ,company.slug, company.company_name FROM featured_companies 
                        JOIN company ON featured_companies.company_id = company.ID 
                        ORDER BY featured_companies.ordering ASC `;

        db.query(featured_sql, (err, companies, fields) => {
            res.render('pages/view-featured-companies', {
                menu_active_id: 'company',
                page_title: 'Featured Companies',
                currentUserData,
                companies
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit Businesss Page
router.get('/edit-business', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        const sql = `SELECT * FROM page_info where secret_Key = 'business' `;
        db.query(sql, async (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const metaPromises = [common, common1, common2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }
                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });
            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
            const UpcomingBusinessFeature = await comFunction2.getUpcomingBusinessFeature();
            const BusinessFeature = await comFunction2.getBusinessFeature();
            console.log("meta_values_array", meta_values_array);
            res.render('pages/update-business', {
                menu_active_id: 'pages',
                page_title: 'Update Business',
                currentUserData,
                common,
                common1,
                common2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2,
                UpcomingBusinessFeature,
                BusinessFeature
            });
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/uk-edit-business', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        const sql = `SELECT * FROM page_info where secret_Key = 'business' `;
        db.query(sql, async (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const metaPromises = [common, common1, common2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }
                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });
            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
            const UpcomingBusinessFeature = await comFunction2.getUpcomingBusinessFeature();
            const BusinessFeature = await comFunction2.getBusinessFeature();
            console.log("meta_values_array", meta_values_array);
            res.render('pages/uk-edit-business', {
                menu_active_id: 'pages',
                page_title: 'UK Business',
                currentUserData,
                common,
                common1,
                common2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2,
                UpcomingBusinessFeature,
                BusinessFeature
            });
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/jp-edit-business', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        const sql = `SELECT * FROM page_info where secret_Key = 'business' `;
        db.query(sql, async (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const metaPromises = [common, common1, common2].map((homeEntry) => {
                return new Promise((resolve, reject) => {
                    if (!homeEntry) {
                        resolve(null);
                        return;
                    }
                    const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                    db.query(meta_sql, (meta_err, _meta_result) => {
                        if (meta_err) return reject(meta_err);

                        const meta_values = _meta_result;
                        let meta_values_array = {};
                        meta_values.forEach((item) => {
                            meta_values_array[item.page_meta_key] = item.page_meta_value;
                        });

                        resolve(meta_values_array);
                    });
                });
            });
            const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
            const UpcomingBusinessFeature = await comFunction2.getUpcomingBusinessFeature();
            const BusinessFeature = await comFunction2.getBusinessFeature();
            console.log("meta_values_array", meta_values_array);
            res.render('pages/jp-edit-business', {
                menu_active_id: 'pages',
                page_title: 'Japan Business',
                currentUserData,
                common,
                common1,
                common2,
                meta_values_array,
                meta_values_array1,
                meta_values_array2,
                UpcomingBusinessFeature,
                BusinessFeature
            });
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit privacy-policy Page
router.get('/edit-privacy-policy', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'privacy' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }

                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });

                            resolve(meta_values_array);
                        });
                    });
                });

                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

                res.render('pages/update-privacy-policy', {
                    menu_active_id: 'pages',
                    page_title: 'Update Privacy Policy',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2,
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/uk-edit-privacy-policy', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'privacy' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }

                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });

                            resolve(meta_values_array);
                        });
                    });
                });

                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

                res.render('pages/uk-edit-privacy-policy', {
                    menu_active_id: 'pages',
                    page_title: 'Update Privacy Policy',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2,
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/jp-edit-privacy-policy', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'privacy' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }

                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });

                            resolve(meta_values_array);
                        });
                    });
                });

                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);

                res.render('pages/jp-edit-privacy-policy', {
                    menu_active_id: 'pages',
                    page_title: 'Update Privacy Policy',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2,
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit disclaimer Page
router.get('/edit-disclaimer', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            console.log("common", common);
            console.log("common1", common1);
            console.log("common2", common2);

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log(meta_values_array);
                res.render('pages/update-disclaimer', {
                    menu_active_id: 'pages',
                    page_title: 'Update Disclaimer',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/uk-edit-disclaimer', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log("meta_values_array", meta_values_array);
                res.render('pages/uk-edit-disclaimer', {
                    menu_active_id: 'pages',
                    page_title: 'Update Disclaimer',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/jp-edit-disclaimer', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log(meta_values_array);
                res.render('pages/jp-edit-disclaimer', {
                    menu_active_id: 'pages',
                    page_title: 'Update Disclaimer',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit terms-of-service Page
router.get('/edit-terms-of-service', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log("meta_values_array", meta_values_array);
                res.render('pages/update-terms-of-service', {
                    menu_active_id: 'pages',
                    page_title: 'Update Terms of Service',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
//
router.get('/edit-cancellation-refund-policy', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'cancellation_refund_policy' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                console.log(meta_values_array);
                res.render('pages/update-refund-policy', {
                    menu_active_id: 'pages',
                    page_title: 'Update Refund Policy',
                    currentUserData,
                    common,
                    meta_values_array,
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/uk-edit-terms-of-service', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log("meta_values_array", meta_values_array);
                res.render('pages/uk-edit-terms-of-service', {
                    menu_active_id: 'pages',
                    page_title: 'Update Terms of Service',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/jp-edit-terms-of-service', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log("meta_values_array", meta_values_array);
                res.render('pages/jp-edit-terms-of-service', {
                    menu_active_id: 'pages',
                    page_title: 'Update Terms of Service',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


//Edit Global Page Management
router.get('/edit-global', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'global' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                //console.log(meta_values_array);
                res.render('pages/update-global', {
                    menu_active_id: 'pages',
                    page_title: 'Global Content',
                    currentUserData,
                    common,
                    meta_values_array,
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


//Edit Complaint ragister Page
router.get('/edit-complaint', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'complaint' `;

        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log("meta_values_array", meta_values_array);
                res.render('pages/update-complaint', {
                    menu_active_id: 'pages',
                    page_title: 'Update Complaint Register',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/uk-edit-complaint', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'complaint' `;

        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log("meta_values_array", meta_values_array);
                res.render('pages/uk-edit-complaint', {
                    menu_active_id: 'pages',
                    page_title: 'Update Complaint Register',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/jp-edit-complaint', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'complaint' `;

        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const common1 = results[1];
            const common2 = results[2];

            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;
                const metaPromises = [common, common1, common2].map((homeEntry) => {
                    return new Promise((resolve, reject) => {
                        if (!homeEntry) {
                            resolve(null);
                            return;
                        }
                        const meta_sql = `SELECT * FROM page_meta WHERE page_id = ${homeEntry.id}`;
                        db.query(meta_sql, (meta_err, _meta_result) => {
                            if (meta_err) return reject(meta_err);

                            const meta_values = _meta_result;
                            let meta_values_array = {};
                            meta_values.forEach((item) => {
                                meta_values_array[item.page_meta_key] = item.page_meta_value;
                            });
                            resolve(meta_values_array);
                        });
                    });
                });
                const [meta_values_array, meta_values_array1, meta_values_array2] = await Promise.all(metaPromises);
                console.log("meta_values_array", meta_values_array);
                res.render('pages/jp-edit-complaint', {
                    menu_active_id: 'pages',
                    page_title: 'Update Complaint Register',
                    currentUserData,
                    common,
                    common1,
                    common2,
                    meta_values_array,
                    meta_values_array1,
                    meta_values_array2
                });
            })
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});



//push-notification Page
router.get('/push-notification', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        res.render('pages/push-notification', {
            menu_active_id: 'miscellaneous',
            page_title: 'Push Notification',
            currentUserData,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//---Add Payment--//
router.get('/add-payment', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [companies, getmembershipPlans] = await Promise.all([
            comFunction.getAllCompany(),
            comFunction2.getmembershipPlans()
        ]);
        //console.log(getmembershipPlans);
        // Render the 'edit-user' EJS view and pass the data
        res.render('add-payment', {
            menu_active_id: 'company',
            page_title: 'Add Payment',
            currentUserData,
            companies: companies,
            membershipPlans: getmembershipPlans
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//---Payments--//
router.get('/payments', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [getAllPayments] = await Promise.all([
            comFunction2.getAllPayments(),
        ]);
        console.log(getAllPayments);
        // Render the 'edit-user' EJS view and pass the data
        // res.json({
        //     allcompany: allcompany
        // });
        res.render('payments', {
            menu_active_id: 'miscellaneous',
            page_title: 'Payments',
            currentUserData,
            allPayments: getAllPayments
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/payment_history', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        // Fetch all the required data asynchronously
        const [getAllPayments] = await Promise.all([
            comFunction2.getAllPaymentHistory(),
        ]);
        // console.log("getAllPayments",getAllPayments);

        res.render('payment_history', {
            menu_active_id: 'miscellaneous',
            page_title: 'Payment History ',
            currentUserData,
            allPayments: getAllPayments,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/user_payment_history', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        var userId = currentUserData.user_id;

        console.log("currentUserData", currentUserData);

        // Fetch all the required data asynchronously
        const [getAllPayments, getUser, getUserMeta, globalPageMeta, AllCompaniesReviews] = await Promise.all([
            comFunction2.getuserAllPaymentHistory(userId),
            comFunction.getUser(userId),
            comFunction.getUserMeta(userId),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllCompaniesReviews(userId),
        ]);
        console.log("getAllPayments", getAllPayments);

        res.render('front-end/user_payment_history', {
            menu_active_id: 'miscellaneous',
            page_title: 'Payment History ',
            currentUserData,
            allPayments: getAllPayments,
            user: getUser,
            userMeta: getUserMeta,
            globalPageMeta: globalPageMeta,
            AllCompaniesReviews: AllCompaniesReviews
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//---Edit Payment--//
router.get('/edit-payment/:paymentId', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const paymentId = req.params.paymentId;

        // Fetch all the required data asynchronously
        const [companies, getmembershipPlans, getpaymentDetailsById] = await Promise.all([
            comFunction.getAllCompany(),
            comFunction2.getmembershipPlans(),
            comFunction2.getpaymentDetailsById(paymentId)
        ]);
        //console.log(getpaymentDetailsById);
        // Render the 'edit-user' EJS view and pass the data
        res.render('edit-payment', {
            menu_active_id: 'company',
            page_title: 'Edit Payment',
            currentUserData,
            companies: companies,
            membershipPlans: getmembershipPlans,
            paymentDetails: getpaymentDetailsById[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit Global Page Management
router.get('/edit-survey/:id', checkLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const surveyId = req.params.id;

        const [getSurveyDetails] = await Promise.all([
            comFunction2.getSurveyDetails(surveyId),
        ]);

        console.log('getSurveyDetails', getSurveyDetails);

        const sql = `SELECT * FROM page_info where secret_Key = 'global' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const common = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                //console.log(meta_values_array);
                res.render('edit-survey', {
                    menu_active_id: 'miscellaneous',
                    page_title: 'Edit Survey',
                    currentUserData,
                    common,
                    meta_values_array,
                    SurveyDetails: getSurveyDetails
                });
            })

        })
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.get('/getcompanies', async (req, res) => {
    try {
        // const country = req.params.country;
        // const state = req.params.state;
        // const city = req.params.city;

        const country = req.query.country;
        const state = req.query.state;
        const city = req.query.city

        console.log("country,state,city", country, state, city);


        if (!country) {
            return res.status(400).json({ error: 'Country is required' });
        }

        let sqlQuery = `SELECT * FROM company WHERE main_address_country = ? AND status = '1'`;
        let queryParams = [country];


        if (state) {
            console.log("sdfdfs");
            sqlQuery += ' AND main_address_state = ?';
            queryParams.push(state);
        }
        if (city) {
            sqlQuery += ' AND main_address_city = ?';
            queryParams.push(city);
        }
        console.log("SQL Query:", sqlQuery);
        console.log("Query Params:", queryParams);


        db.query(sqlQuery, queryParams, (err, results) => {
            if (err) {
                console.log("aaasssvvv")
                console.error('Error executing SQL query:', err);
                return res.status(500).json({ error: 'An error occurred while fetching companies' });
            } else {
                console.log("bbbbaaasssvvv");
                console.log("companyresults", results);
                return res.json(results);
            }
        });

    } catch (error) {
        return res.send({
            status: 'not ok',
            message: 'Something went wrong'
        });
    }
})

//get states of country
router.get('/getstatebyCountry', async (req, res) => {
    try {
        const country_ID = req.query.country_ID;
        console.log("country_ID", country_ID);

        let statequery = `SELECT id FROM countries WHERE shortname = ?`;
        let sttatevalue = await query(statequery, [country_ID]);
        if (sttatevalue.length > 0) {
            var state_id = sttatevalue[0].id;
            console.log("state_id", state_id);
        }

        let sqlQuery = 'SELECT * FROM states WHERE country_id = ?';
        let queryParams = [state_id];

        db.query(sqlQuery, queryParams, (err, results) => {
            if (err) {
                console.log("aaasssvvv")
                console.error('Error executing SQL query:', err);
                return res.status(500).json({ error: 'An error occurred while fetching companies' });
            } else {
                console.log("results", results);
                return res.json(results);
            }
        });

    } catch (error) {
        return res.send({
            status: 'not ok',
            message: 'Something went wrong'
        });
    }
})

router.get('/getstatebyCountries', async (req, res) => {
    try {
        const country_ID = req.query.country_ID;
        console.log("country_ID", country_ID);

        // let statequery = `SELECT id FROM countries WHERE shortname = ?`;
        // let sttatevalue = await query(statequery,[country_ID]);
        // if(sttatevalue.length >0){
        //     var state_id = sttatevalue[0].id;
        //     console.log("state_id",state_id);
        // }

        let sqlQuery = 'SELECT * FROM states WHERE country_id = ?';
        let queryParams = [country_ID];

        db.query(sqlQuery, queryParams, (err, results) => {
            if (err) {
                console.log("aaasssvvv")
                console.error('Error executing SQL query:', err);
                return res.status(500).json({ error: 'An error occurred while fetching companies' });
            } else {
                console.log("results", results);
                return res.json(results);
            }
        });

    } catch (error) {
        return res.send({
            status: 'not ok',
            message: 'Something went wrong'
        });
    }
})
router.get('/getcomplaintcompanies', async (req, res) => {
    try {

        const country = req.query.country;
        const state = req.query.state;
        const city = req.query.city

        console.log("country,state,city", country, state, city);


        if (!country) {
            return res.status(400).json({ error: 'Country is required' });
        }

        // let sqlQuery =`SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories
        // FROM company c
        // LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
        // LEFT JOIN category cat ON cr.category_id = cat.ID
        // WHERE c.status != '3' AND c.membership_type_id >=3 AND c.complaint_status = '1' AND c.main_address_country = ?`;

        let sqlQuery = `SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories
        FROM company c
        left JOIN company_cactgory_relation cr ON c.ID = cr.company_id
        left JOIN category cat ON cr.category_id = cat.ID
        WHERE c.status = '1' AND c.complaint_status = '1' AND c.main_address_country=?
        `;


        // let sqlQuery = `SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories
        // FROM company c
        // LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
        // LEFT JOIN category cat ON cr.category_id = cat.ID
        // WHERE c.status = '1' AND c.membership_type_id >=3 AND c.complaint_status = '1' AND c.main_address_country=?
        // `;

        let queryParams = [country];


        if (state) {
            console.log("sdfdfs");
            sqlQuery += ' AND c.main_address_state = ?';
            queryParams.push(state);
        }
        if (city) {
            sqlQuery += ' AND c.main_address_city = ?';
            queryParams.push(city);
        }
        sqlQuery += ' GROUP BY c.ID';

        console.log("SQL Query:", sqlQuery);
        console.log("Query Params:", queryParams);


        db.query(sqlQuery, queryParams, (err, results) => {
            if (err) {
                console.log("aaasssvvv");
                console.error('Error executing SQL query:', err);
                return res.status(500).json({ error: 'An error occurred while fetching companies' });
            } else {
                console.log("bbbbaaasssvvv");
                console.log("getcomplaintcompaniesresults", results);
                return res.json(results);
            }
        });

    } catch (error) {
        return res.send({
            status: 'not ok',
            message: 'Something went wrong'
        });
    }
})

router.get('/get-plan', async (req, res) => {
    const planName = req.query.plan_name;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM plan_management WHERE name = ?', [planName]);

        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.json({ success: false, message: 'Plan not found' });
        }

        await connection.end();
    } catch (error) {
        console.error('Error fetching plan data:', error);
        res.status(500).json({ success: false, message: 'An error occurred', error: error.message });
    }
});




//-----------------------------------------------------------------//



// Middleware function to check if user is logged in Frontend
async function checkFrontEndLoggedIn(req, res, next) {

    res.locals.globalData = {
        BLOG_URL: process.env.BLOG_URL,
        MAIN_URL: process.env.MAIN_URL,
        // Add other variables as needed
    };
    const encodedUserData = req.cookies.user;
    //const currentUserData = JSON.parse(encodedUserData);

    try {
        if (encodedUserData) {
            // User is logged in, proceed to the next middleware or route handler
            next();
        } else {
            res.redirect('/');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
}

router.get('/myprofile', checkFrontEndLoggedIn, async (req, res) => {

    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const userId = currentUserData.user_id;
        //console.log('editUserID: ', currentUserData);

        const email_query = `SELECT email FROM users WHERE user_id =?`;
        const emailData = await query(email_query,[userId]);
        console.log("emailData",emailData[0].email);

        const getManagerQuery = `SELECT company_level_manage_users.*,company.slug FROM company_level_manage_users LEFT JOIN company ON company_level_manage_users.company_id = company.ID WHERE company_level_manage_users.emails=?`;
        const getManagerData = await query(getManagerQuery, [emailData[0].email]);
        //console.log("getManagerData", getManagerData[0]);

        const getQuery = `SELECT complaint_assigned_users.*,company.slug FROM complaint_assigned_users LEFT JOIN company ON complaint_assigned_users.company_id = company.ID WHERE complaint_assigned_users.user_email=?`;
        const getData = await query(getQuery, [emailData[0].email]);
        // console.log("getData", getData[0]);

        // Fetch all the required data asynchronously
        const [user, userMeta, globalPageMeta, AllCompaniesReviews] = await Promise.all([
            comFunction.getUser(userId),
            comFunction.getUserMeta(userId),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllCompaniesReviews(userId),
        ]);

        // Render the 'edit-user' EJS view and pass the data
        res.render('front-end/myprofile', {
            menu_active_id: 'myprofile',
            page_title: 'My Profile',
            currentUserData,
            user: user,
            userMeta: userMeta,
            globalPageMeta: globalPageMeta,
            AllCompaniesReviews: AllCompaniesReviews,
            getManagerData: getManagerData,
            getData: getData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//FrontEnd profile-dashboard page
router.get('/profile-dashboard', checkFrontEndLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const userId = currentUserData.user_id;
        console.log('editUserID: ', userId);

        const email_query = `SELECT email FROM users WHERE user_id =?`;
        const emailData = await query(email_query,[userId]);
        console.log("emailData",emailData[0].email);

        const getManagerQuery = `SELECT company_level_manage_users.*,company.slug FROM company_level_manage_users LEFT JOIN company ON company_level_manage_users.company_id = company.ID WHERE company_level_manage_users.emails=?`;
        const getManagerData = await query(getManagerQuery, [emailData[0].email]);
        console.log("getManagerData", getManagerData[0]);

        const getQuery = `SELECT complaint_assigned_users.*,company.slug FROM complaint_assigned_users LEFT JOIN company ON complaint_assigned_users.company_id = company.ID WHERE complaint_assigned_users.user_email=?`;
        const getData = await query(getQuery, [emailData[0].email]);
        console.log("getData", getData[0]);

        // Fetch all the required data asynchronously
        const [user, userMeta, ReviewedCompanies, AllCompaniesReviews, AllReviewTags, allRatingTags, globalPageMeta,AllReviewVoting] = await Promise.all([
            comFunction.getUser(userId),
            comFunction.getUserMeta(userId),
            comFunction2.getReviewedCompanies(userId),
            comFunction2.getAllCompaniesReviews(userId),
            comFunction2.getAllReviewTags(),
            comFunction.getAllRatingTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllReviewVoting()
        ]);
        log("userMeta",userMeta);
        // res.json( {
        //     menu_active_id: 'profile-dashboard',
        //     page_title: 'My Dashboard',
        //     currentUserData,
        //     user: user,
        //     userMeta: userMeta,
        //     ReviewedCompanies: ReviewedCompanies,
        //     AllCompaniesReviews: AllCompaniesReviews,
        //     allRatingTags:allRatingTags,
        //     AllReviewTags:AllReviewTags,
        //     globalPageMeta:globalPageMeta,
        //     AllReviewVoting:AllReviewVoting
        // });
        res.render('front-end/profile-dashboard', {
            menu_active_id: 'profile-dashboard',
            page_title: 'My Dashboard',
            currentUserData,
            user: user,
            userMeta: userMeta,
            ReviewedCompanies: ReviewedCompanies,
            AllCompaniesReviews: AllCompaniesReviews,
            allRatingTags:allRatingTags,
            AllReviewTags:AllReviewTags,
            globalPageMeta:globalPageMeta,
            AllReviewVoting:AllReviewVoting,
            getManagerData: getManagerData,
            getData: getData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/profile-dashboard', { menu_active_id: 'profile-dashboard', page_title: 'My Dashboard', currentUserData });
});

//FrontEnd profile-dashboard page
router.get('/my-reviews', checkFrontEndLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const userId = currentUserData.user_id;
        console.log('editUserID: ', userId);

        // Fetch all the required data asynchronously
        const [AllCompaniesReviews, AllReviewTags, allRatingTags, globalPageMeta, AllReviewVoting] = await Promise.all([
            comFunction2.getCompaniesReviewsbyuserId(userId),
            comFunction2.getAllReviewTags(),
            comFunction.getAllRatingTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllReviewVoting(),
        ]);
        //console.log(AllReviewTags);
        //Render the 'edit-user' EJS view and pass the data
        // res.json( {
        //     menu_active_id: 'profile-dashboard',
        //     page_title: 'My Reviews',
        //     currentUserData,
        //     AllCompaniesReviews: AllCompaniesReviews,
        //     allRatingTags:allRatingTags,
        //     AllReviewTags:AllReviewTags,
        //     globalPageMeta:globalPageMeta,
        //     AllReviewVoting:AllReviewVoting
        // });
        res.render('front-end/user-all-reviews', {
            menu_active_id: 'user-all-review',
            page_title: 'My Reviews',
            currentUserData,
            AllCompaniesReviews: AllCompaniesReviews,
            allRatingTags: allRatingTags,
            AllReviewTags: AllReviewTags,
            globalPageMeta: globalPageMeta,
            AllReviewVoting: AllReviewVoting
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/profile-dashboard', { menu_active_id: 'profile-dashboard', page_title: 'My Dashboard', currentUserData });
});

//FrontEnd myprofile page
router.get('/edit-myprofile', checkFrontEndLoggedIn, async (req, res) => {

    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const userId = currentUserData.user_id;
        console.log('editUserID: ', userId);

        const email_query = `SELECT email FROM users WHERE user_id =?`;
        const emailData = await query(email_query,[userId]);
        console.log("emailData",emailData[0].email);

        const getManagerQuery = `SELECT company_level_manage_users.*,company.slug FROM company_level_manage_users LEFT JOIN company ON company_level_manage_users.company_id = company.ID WHERE company_level_manage_users.emails=?`;
        const getManagerData = await query(getManagerQuery, [emailData[0].email]);
        console.log("getManagerData", getManagerData[0]);
        const getQuery = `SELECT complaint_assigned_users.*,company.slug FROM complaint_assigned_users LEFT JOIN company ON complaint_assigned_users.company_id = company.ID WHERE complaint_assigned_users.user_email=?`;
        const getData = await query(getQuery, [emailData[0].email]);
        // console.log("getData", getData[0]);

        // Fetch all the required data asynchronously
        const [user, userMeta, countries, states, globalPageMeta, AllCompaniesReviews] = await Promise.all([
            comFunction.getUser(userId),
            comFunction.getUserMeta(userId),
            comFunction.getCountries(),
            comFunction.getStatesByUserID(userId),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllCompaniesReviews(userId),
        ]);

        // Render the 'edit-user' EJS view and pass the data
        res.render('front-end/update-myprofile', {
            menu_active_id: 'edit-myprofile',
            page_title: 'Update My Profile',
            currentUserData,
            user: user,
            userMeta: userMeta,
            countries: countries,
            states: states,
            globalPageMeta: globalPageMeta,
            AllCompaniesReviews: AllCompaniesReviews,
            getData: getData,
            getManagerData: getManagerData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//FrontEnd Change Password page
router.get('/change-password', checkFrontEndLoggedIn, async (req, res) => {

    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const userId = currentUserData.user_id;
        //console.log('editUserID: ', currentUserData);

        // Fetch all the required data asynchronously
        const [globalPageMeta] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
        ]);

        // Render the 'edit-user' EJS view and pass the data
        res.render('front-end/change-password', {
            menu_active_id: 'change-password',
            page_title: 'Change Password',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//FrontEnd Edit Review page
router.get('/edit-user-review/:reviewId', checkFrontEndLoggedIn, async (req, res) => {

    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const userId = currentUserData.user_id;
        const reviewId = req.params.reviewId;
        //console.log('editUserID: ', currentUserData);

        const [allRatingTags, reviewDataById, AllReviewTags, globalPageMeta, getCompanyCategoryByReviewId] = await Promise.all([
            comFunction.getAllRatingTags(),
            comFunction2.reviewDataById(reviewId, userId),
            comFunction2.getAllReviewTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getCompanyCategoryByReviewId(reviewId),
        ]);

        // Create a mapping of review_id to tags
        const reviewTagsMap = {};

        AllReviewTags.forEach((tag) => {
            const { review_id, tag_name } = tag;
            if (!reviewTagsMap[review_id]) {
                reviewTagsMap[review_id] = [];
            }
            reviewTagsMap[review_id].push(tag_name);
        });

        // Map the tags to reviewDataById by review_id
        const reviewDataWithTags = reviewDataById.map((review) => {
            var tags = reviewTagsMap[review.id] || [];
            return {
                ...review,
                tags,
            };
        });

        //console.log(reviewDataWithTags)
        // Render the 'edit-user' EJS view and pass the data

        // res.json({
        //      menu_active_id: 'edit-review',
        //     page_title: 'Edit Review',
        //     currentUserData,
        //     allRatingTags:allRatingTags,
        //     globalPageMeta:globalPageMeta,
        //     reviewDataById:reviewDataWithTags[0],
        //     CompanyCategory:getCompanyCategoryByReviewId
        //  });
        if (reviewDataById.length > 0) {
            res.render('front-end/edit-user-review', {
                menu_active_id: 'edit-review',
                page_title: 'Edit Review',
                currentUserData,
                allRatingTags: allRatingTags,
                globalPageMeta: globalPageMeta,
                reviewDataById: reviewDataWithTags[0],
                CompanyCategory: getCompanyCategoryByReviewId
            });
        } else {
            res.redirect('/profile-dashboard');
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//FrontEnd user discussion listing  page
router.get('/my-discussions', checkFrontEndLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const userId = currentUserData.user_id;
        console.log('editUserID: ', userId);

        // Fetch all the required data asynchronously
        const [globalPageMeta, getDiscussionsByUserId] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getDiscussionsByUserId(userId),
        ]);
        console.log("getDiscussionsByUserId", getDiscussionsByUserId);
        //console.log(AllReviewTags);
        // res.json( {
        //     menu_active_id: 'profile-dashboard',
        //     page_title: 'My Reviews',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     DiscussionsByUserId: getDiscussionsByUserId
        // });
        res.render('front-end/user-all-discussion', {
            menu_active_id: 'user-all-discussions',
            page_title: 'My Discussions',
            currentUserData,
            globalPageMeta: globalPageMeta,
            DiscussionsByUserId: getDiscussionsByUserId
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/profile-dashboard', { menu_active_id: 'profile-dashboard', page_title: 'My Dashboard', currentUserData });
});

//FrontEnd user discussion listing  page
router.get('/update-discussion/:discussion_id', checkFrontEndLoggedIn, async (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const discussion_id = req.params.discussion_id
        console.log('discussion_id: ', discussion_id);

        // Fetch all the required data asynchronously
        const [globalPageMeta, getDiscussionByDiscusId] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
            comFunction2.getDiscussionByDiscusId(discussion_id),
        ]);
        //console.log(AllReviewTags);
        // res.json( {
        //     menu_active_id: 'profile-dashboard',
        //     page_title: 'My Reviews',
        //     currentUserData,
        //     globalPageMeta:globalPageMeta,
        //     DiscussionsByUserId: getDiscussionsByUserId
        // });
        res.render('front-end/update-discussion', {
            menu_active_id: 'update-discussion',
            page_title: 'edit Discussions',
            currentUserData,
            globalPageMeta: globalPageMeta,
            getDiscussionByDiscusId: getDiscussionByDiscusId
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/profile-dashboard', { menu_active_id: 'profile-dashboard', page_title: 'My Dashboard', currentUserData });
});


//register complaint page
router.get('/register-complaint', checkFrontEndLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const [globalPageMeta, PageMetaValues, getAllPremiumCompany, getCountries] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getPageMetaValues('complaint'),
        comFunction2.getAllPremiumCompany(),
        comFunction.getCountries()
    ]);
    console.log("getCountries", getCountries);
    try {

        res.render('front-end/register-complain', {
            menu_active_id: 'register-complaint',
            page_title: 'Complaint Registration',
            currentUserData,
            globalPageMeta: globalPageMeta,
            meta_values_array: PageMetaValues,
            AllCompany: getAllPremiumCompany,
            getCountries: getCountries
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

router.get('/register-complaint/:getcountryname', checkFrontEndLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    

    const getcountryname = req.params.getcountryname;
    console.log("getcountrynamebusiness",getcountryname);

    if (currentUserData) {
        var user_id = currentUserData.user_id;
        console.log("user_id", user_id);
        var encryptedEmail = await comFunction2.encryptEmail(currentUserData.email);
        console.log("encryptedEmail",encryptedEmail);
    }
    const api_key = process.env.GEO_LOCATION_API_KEY;
    let country_name = req.cookies.countryName || 'India';
    let country_code = req.cookies.countryCode || 'IN';
    console.log("country_names", country_name);
    console.log("country_codes", country_code);

    if (country_code != 'UK' && country_code != 'JP') {
        country_code = 'US';
    }

    const [globalPageMeta, PageMetaValues, getAllPremiumCompany, getCountries] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getPageMetaValues('complaint'),
        comFunction2.getAllPremiumCompany(),
        comFunction.getCountries()
    ]);
    console.log("getCountries",getCountries);
    try {

        res.render('front-end/register-complain', {
            menu_active_id: 'register-complaint',
            page_title: 'Complaint Registration',
            currentUserData,
            globalPageMeta: globalPageMeta,
            meta_values_array: PageMetaValues,
            AllCompany: getAllPremiumCompany,
            getCountries: getCountries
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

//register complaint page
router.get('/register-cechoes-complaint', checkFrontEndLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const country_name = req.cookies.countryName
        || 'India';
    let country_code = req.cookies.countryCode
        || 'IN';
    console.log("country_namesprivacy", country_name);
    console.log("country_codesprivacy", country_code);

    if (country_code != 'UK' && country_code != 'JP') {
        country_code = 'US';
    }
    const [globalPageMeta, PageMetaValues, getAllPremiumCompany, getCountries] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        //comFunction2.getPageMetaValues('complaint'),
        comFunction2.getPageMetaValue('complaint', country_code),
        comFunction2.getAllPremiumCompany(),
        comFunction.getCountries()
    ]);
    try {

        res.render('front-end/cechoes_complaint', {
            menu_active_id: 'cechoes_complaint',
            page_title: 'Cechoes Complaint',
            currentUserData,
            globalPageMeta: globalPageMeta,
            meta_values_array: PageMetaValues,
            AllCompany: getAllPremiumCompany,
            getCountries: getCountries
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

router.get('/:getcountryname/register-cechoes-complaint', checkFrontEndLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const getcountryname = req.params.getcountryname;
    console.log("getcountrynameregistercomplaint", getcountryname);
    const [globalPageMeta, PageMetaValues, getAllPremiumCompany, getCountries] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getPageMetaValue('complaint', getcountryname),
        comFunction2.getAllPremiumCompany(),
        comFunction.getCountries()
    ]);
    try {

        res.render('front-end/cechoes_complaint', {
            menu_active_id: 'cechoes_complaint',
            page_title: 'Cechoes Complaint',
            currentUserData,
            globalPageMeta: globalPageMeta,
            meta_values_array: PageMetaValues,
            AllCompany: getAllPremiumCompany,
            getCountries: getCountries
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//user complain listing page
router.get('/my-complaints', checkFrontEndLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    console.log("currentUserData/my-complaints",currentUserData);
    const userId = currentUserData.user_id;
    const [user, userMeta, globalPageMeta, AllCompaniesReviews, getAllComplaintsByUserId] = await Promise.all([
        comFunction.getUser(userId),
        comFunction.getUserMeta(userId),
        comFunction2.getPageMetaValues('global'),
        comFunction2.getAllCompaniesReviews(userId),
        comFunction2.getAllComplaintsByUserId(userId),
    ]);

    const email_query = `SELECT email FROM users WHERE user_id =?`;
    const emailData = await query(email_query,[userId]);
    console.log("emailData",emailData);
    console.log("emailData",emailData[0].email);

    const getManagerQuery = `SELECT company_level_manage_users.*,company.slug FROM company_level_manage_users LEFT JOIN company ON company_level_manage_users.company_id = company.ID WHERE company_level_manage_users.emails=?`;
    const getManagerData = await query(getManagerQuery, [emailData[0].email]);
    //console.log("getManagerData", getManagerData[0]);

    const getQuery = `SELECT complaint_assigned_users.*,company.slug FROM complaint_assigned_users LEFT JOIN company ON complaint_assigned_users.company_id = company.ID WHERE complaint_assigned_users.user_email=?`;
    const getData = await query(getQuery, [emailData[0].email]);
    // console.log("getData", getData[0]);

    const formattedCoplaintData = getAllComplaintsByUserId.map(item => {
        let responsesArray = [];
        let comp_query = [];
        let cus_response = [];
        if (item.notification_statuses != null) {
            responsesArray = item.notification_statuses.split(',');
        }
        if (item.company_query != null) {
            comp_query = item.company_query.split(',');
        }
        if (item.user_response != null) {
            cus_response = item.user_response.split(',');
        }
        return {
            ...item,
            notification_statuses: responsesArray,
            company_query: comp_query,
            customer_response: cus_response
        };
    });
    //console.log(getAllComplaintsByUserId);
    console.log("AllComplaintsByUserId", formattedCoplaintData);

    try {
        // res.json( {
        //     menu_active_id: 'complain-profile',
        //     page_title: 'Dashboard',
        //     currentUserData,
        //     user: user,
        //     userMeta: userMeta,
        //     globalPageMeta:globalPageMeta,
        //     AllCompaniesReviews: AllCompaniesReviews,
        //     AllComplaintsByUserId:formattedCoplaintData
        // });
        res.render('front-end/complain-profile', {
            menu_active_id: 'complain-profile',
            page_title: 'Dashboard',
            currentUserData,
            user: user,
            userMeta: userMeta,
            globalPageMeta: globalPageMeta,
            AllCompaniesReviews: AllCompaniesReviews,
            AllComplaintsByUserId: formattedCoplaintData,
            getManagerData: getManagerData,
            getData: getData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//basic register complain page
router.get('/user-compnaint-details/:complainId', checkFrontEndLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const userId = currentUserData.user_id;
    const complaintId = req.params.complainId
    const [user, userMeta, globalPageMeta, AllCompaniesReviews, getAllComplaintsByComplaintId] = await Promise.all([
        comFunction.getUser(userId),
        comFunction.getUserMeta(userId),
        comFunction2.getPageMetaValues('global'),
        comFunction2.getAllCompaniesReviews(userId),
        comFunction2.getAllComplaintsByComplaintId(complaintId),
        comFunction2.updateUserNotificationStatus(complaintId),
    ]);
    const email_query = `SELECT email FROM users WHERE user_id =?`;
    const emailData = await query(email_query,[userId]);
    console.log("emailData",emailData[0].email);

    const getManagerQuery = `SELECT company_level_manage_users.*,company.slug FROM company_level_manage_users LEFT JOIN company ON company_level_manage_users.company_id = company.ID WHERE company_level_manage_users.emails=?`;
    const getManagerData = await query(getManagerQuery, [emailData[0].email]);
    //console.log("getManagerData", getManagerData[0]);

    const getQuery = `SELECT complaint_assigned_users.*,company.slug FROM complaint_assigned_users LEFT JOIN company ON complaint_assigned_users.company_id = company.ID WHERE complaint_assigned_users.user_email=?`;
    const getData = await query(getQuery, [emailData[0].email]);
    try {

        // res.json( {
        //     menu_active_id: 'complain-profile',
        //     page_title: 'Dashboard',
        //     currentUserData,
        //     user: user,
        //     userMeta: userMeta,
        //     globalPageMeta:globalPageMeta,
        //     AllCompaniesReviews: AllCompaniesReviews,
        //     ComplaintsByComplaintId:getAllComplaintsByComplaintId[0]
        // });
        res.render('front-end/user-complaint-details', {
            menu_active_id: 'complain-profile',
            page_title: 'Dashboard',
            currentUserData,
            user: user,
            userMeta: userMeta,
            globalPageMeta: globalPageMeta,
            AllCompaniesReviews: AllCompaniesReviews,
            ComplaintsByComplaintId: getAllComplaintsByComplaintId[0],
            getManagerData: getManagerData,
            getData: getData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/getCountryIdByShortName', async (req, res) => {
    try {
        const countryShortName = req.query.countryShortName;
        console.log(countryShortName, "countryShortName");
        const countryIdquery = `SELECT * FROM countries WHERE shortname=
        "${countryShortName}"`;
        const countryIdS = await query(countryIdquery);
        //console.log("countryIdS",countryIdS);
        if (countryIdS.length > 0) {
            var countryId = countryIdS[0].id;
            //console.log("countryId",countryId);
        }

        return res.json({ countryId: countryId });
    } catch (error) {
        console.error('Error fetching country ID:', error);
        return res.status(500).json({ error: 'An error occurred while fetching country ID' });
    }
});

router.get('/getCountryIdByName', async (req, res) => {
    try {
        const countryShortName = req.query.countryShortName;
        console.log(countryShortName, "countryShortName");
        const countryIdquery = `SELECT * FROM countries WHERE name=
        "${countryShortName}"`;
        const countryIdS = await query(countryIdquery);
        //console.log("countryIdS",countryIdS);
        if (countryIdS.length > 0) {
            var countryId = countryIdS[0].id;
            //console.log("countryId",countryId);
        }

        return res.json({ countryId: countryId });
    } catch (error) {
        console.error('Error fetching country ID:', error);
        return res.status(500).json({ error: 'An error occurred while fetching country ID' });
    }
});

router.get('/getcatsbyCountry', async (req, res) => {
    try {
        const countryId = req.query.countryId;
        // const getcategoryquery = `
        //     SELECT category.* 
        //     FROM category 
        //     LEFT JOIN category_country_relation 
        //     ON category.id = category_country_relation.cat_id 
        //     WHERE category_country_relation.country_id = ?
        // `;
        // const categories = await query(getcategoryquery, [countryId]);
        // console.log("getcatsbyCountry",categories);

        // if (!categories || categories.length === 0) {
        //     return res.json({
        //         status: 'ok',
        //         categories: [],
        //         message: 'No categories found for the selected country.'
        //     });
        // }

        const cat_query = `
        SELECT category.ID AS category_id,category.category_name AS category_name, category.category_img AS category_img, c.category_name AS parent_name, GROUP_CONCAT(countries.name) AS country_names
        FROM category
        JOIN category_country_relation ON category.id = category_country_relation.cat_id
        JOIN countries ON category_country_relation.country_id = countries.id
        LEFT JOIN category AS c ON c.ID = category.parent_id 
        WHERE category_country_relation.country_id = "${countryId}"
        GROUP BY category.category_name `;
        db.query(cat_query, async (err, results) => {
            if (err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request' + err
                    }
                )
            } else {
                const categories = results.map((row) => ({
                    categoryId: row.category_id,
                    categoryName: row.category_name,
                    parentName: row.parent_name,
                    categoryImage: row.category_img,
                    countryNames: row.country_names.split(','),
                }));

                for (const category of categories) {
                    const countryNames = category.countryNames;
                    const placeholders = countryNames.map(() => '?').join(',');
                    const countryShortnamesQuery = `SELECT name, shortname,id FROM countries WHERE name IN (${placeholders})`;
                    const [countryShortnamesResults] = await db.promise().query(countryShortnamesQuery, countryNames);

                    // Convert the array of shortnames to a single string
                    const countryCodes = countryShortnamesResults.map(row => row.id).join(', ');
                    category.countryCodes = countryCodes;
                }

                console.log("categories", categories);
                // //res.json({ menu_active_id: 'category', page_title: 'Categories', currentUserData, 'categories': categories });
                // res.render('categories', { menu_active_id: 'company', page_title: 'Categories', currentUserData, 'categoriess': categories, countries: countries, selectedCountryId :selectedCountryId  });

                return res.json({
                    status: 'ok',
                    categories: categories,
                    message: 'Categories fetched successfully.'
                });
            }
        })



    } catch (error) {
        console.error('Error:', error);
        return res.json({
            status: 'err',
            message: error.message
        });
    }
});
//-----------------------------------------------------------------//



router.get('/reset-password/:email', checkCookieValue, async (req, res) => {

    try {
        let currentUserData = JSON.parse(req.userData);

        const encryptEmail = req.params.email;
        //console.log(encryptEmail);
        const passphrase = process.env.ENCRYPT_DECRYPT_SECRET;
        const decipher = crypto.createDecipher('aes-256-cbc', passphrase);
        let decrypted = decipher.update(encryptEmail, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const decrypted_email = decrypted;
        //console.log('Decrypted:', decrypted);
        const [globalPageMeta] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
        ]);

        res.render('front-end/reset-password', {
            menu_active_id: 'reset-password',
            page_title: 'Reset Password',
            currentUserData,
            globalPageMeta: globalPageMeta,
            decrypted_email,
            error_message: ''
        });
    } catch (err) {
        console.error(err);
        let currentUserData = JSON.parse(req.userData);
        const [globalPageMeta] = await Promise.all([
            comFunction2.getPageMetaValues('global'),
        ]);
        //res.status(500).send('An error occurred');
        res.render('front-end/reset-password', {
            menu_active_id: 'reset-password',
            page_title: 'Reset Password',
            currentUserData,
            globalPageMeta: globalPageMeta,
            error_message: 'urlNotCorrect'
        });
    }

    //res.sendFile(`${publicPath}/nopage.html`)
});

router.get('/logout', (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    //console.log(currentUserData);

    //--WP Logout--//
    (async () => {
        try {
            const wpUserLoginData = {
                email: currentUserData.email,
                user_type: currentUserData.user_type_id
            };
            const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/force-logout', wpUserLoginData);
            //console.log(response);
            const wp_user_data = response.data;
            //console.log(wp_user_data);
            if (wp_user_data.user_nonce != '') {
                if (currentUserData.user_type_id == 2) {
                    res.clearCookie('user');
                    //res.redirect('/');
                    res.redirect(process.env.BLOG_URL + 'wp-login.php?action=logout&redirect_to=' + process.env.MAIN_URL + '&_wpnonce=' + wp_user_data.user_nonce);
                } else {
                    res.clearCookie('user');
                    res.redirect(process.env.BLOG_URL + 'wp-login.php?action=logout&redirect_to=' + process.env.MAIN_URL + 'admin-login&_wpnonce=' + wp_user_data.user_nonce);
                }
            } else {
                //Logout Only From Node.
                if (currentUserData.user_type_id == 2) {
                    res.clearCookie('user');
                    res.redirect('/');
                } else {
                    res.clearCookie('user');
                    res.redirect('/admin-login');
                }
            }
        } catch (error) {
            console.log('Error: ', error);
            // return res.send(
            //     {
            //         status: 'err',
            //         data: '',
            //         message: ''
            //     }
            // )
        }
    })();

});

// auto fill database with company slug 
router.get('/fill_database_with_company_slug', (req, res) => {
    console.log('/fill_database_with_slug');
    sql = `SELECT ID, company_name FROM company WHERE 1`;
    db.query(sql, (err, results) => {
        // if (err){
        //     console.log(err);
        // } 
        if (results.length > 0) {
            console.log(results)
            let count = 0;
            results.forEach((value, index) => {
                comFunction2.generateUniqueSlug(value.company_name, (error, companySlug) => {
                    if (error) {
                        console.log('Err: ', error.message);
                    } else {
                        console.log('companySlug', companySlug);
                        const updateQuery = `UPDATE company SET slug = '${companySlug}' WHERE ID = '${value.ID}' `;
                        db.query(updateQuery, (updateError, updateResult) => {
                            if (updateError) {
                                count++;
                                const newSlug = `${companySlug}_${count}`;
                                const reUpdateQuery = `UPDATE company SET slug = '${companySlug}' WHERE ID = '${value.ID}' `;
                                db.query(reUpdateQuery);
                            }
                        })
                    }
                })

            })

        }
    })
})

// auto fill database with category slug 
router.get('/fill_database_with_category_slug', (req, res) => {
    console.log('/fill_database_with_slug');
    sql = `SELECT ID, category_name FROM category WHERE 1`;
    db.query(sql, (err, results) => {
        // if (err){
        //     console.log(err);
        // } 
        if (results.length > 0) {
            console.log(results)
            let count = 0;
            results.forEach((value, index) => {
                comFunction2.generateUniqueSlugCategory(value.category_name, (error, categorySlug) => {
                    if (error) {
                        console.log('Err: ', error.message);
                    } else {
                        console.log('companySlug', categorySlug);
                        const updateQuery = `UPDATE category SET category_slug  = '${categorySlug}' WHERE ID = '${value.ID}' `;
                        db.query(updateQuery, (updateError, updateResult) => {
                            if (updateError) {
                                count++;
                                const newSlug = `${categorySlug}_${count}`;
                                const reUpdateQuery = `UPDATE category SET category_slug  = '${categorySlug}' WHERE ID = '${value.ID}' `;
                                db.query(reUpdateQuery);
                            }
                        })
                    }
                })
            })

        }
    })
})

// auto fill database with category slug 
router.get('/fill_database_with_company_status', (req, res) => {
    console.log('/fill_database_with_company_status');
    const sql = `UPDATE company SET paid_status = 'free', membership_type_id = '0' WHERE membership_type_id IS NULL`;
    db.query(sql, (err, results) => {
        if (err) {
            console.log('Err: ', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            const updateQuery = `UPDATE company SET complaint_status = '0' WHERE complaint_status IS NULL`;
            db.query(updateQuery, (updateErr, updateRes) => {
                if (updateErr) {
                    console.log('Err: ', updateErr);
                    res.status(500).json({ error: 'Internal Server Error' });
                } else {
                    res.json('Company paid status, membership id and complaint status updated');
                }
            })
        }
    });
});

// auto fill database with category slug 
router.get('/fill_database_with_alias_name', (req, res) => {
    console.log('/fill_database_with_alias_name');
    const sql = `SELECT * FROM users WHERE alise_name IS NULL`;

    db.query(sql, (err, results) => {
        if (err) {
            console.log('Err: ', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            if (results.length > 0) {
                results.forEach((result) => {
                    const updateQuery = `UPDATE users SET alise_name = '${result.first_name}${result.last_name}' WHERE user_id = ${result.user_id}`;
                    db.query(updateQuery, (updateErr, updateRes) => {
                        if (updateErr) {
                            console.log('Err: ', updateErr);
                            res.status(500).json({ error: 'Internal Server Error' });
                        } else {
                        }
                    })
                })

            }
        }

        res.json('User table filled with Alias name.');
    });
});



//-- 404---//
router.get('*', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        res.render('front-end/404', {
            menu_active_id: '404',
            page_title: '404',
            currentUserData,
            globalPageMeta: globalPageMeta
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.sendFile(`${publicPath}/nopage.html`)
});


function generateRandomPassword() {
    // Logic to generate a random password
    // For simplicity, this example generates a password of 8 characters with letters and numbers
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#!^&*()%';
    let password = '';
    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters.charAt(randomIndex);
    }
    return password;
}

module.exports = router;