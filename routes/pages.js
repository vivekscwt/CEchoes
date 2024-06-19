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

function decodeHTMLEntities(text) {
    return he.decode(text);
}


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
    if (encodedUserData) {
        res.redirect('dashboard');
    } else {
        res.render('sign-in', { message: '' })
    }
});

router.get('/register-user', async (req, res) => {
    console.log(req.query);
    const userResponse = JSON.parse(req.query.userResponse);
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

router.get('', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    let userId = '';
    if (currentUserData) {
        userId = currentUserData.user_id;
    }

    let ipAddress = req.ip;
    ipAddress = ipAddress.toString().replace('::ffff:', '');
    console.log("ipAddress", ipAddress);


    const api_key = process.env.GEO_LOCATION_API_KEY
    // const getcountrybyIp = await Promise.all([comFunction2.getcountrynamebyIp(ipAddress,api_key)]) 
    // const country_name = getcountrybyIp[0];
    // console.log("country_code",country_name);

    const { country_name, country_code } = await comFunction2.getcountrynamebyIp(ipAddress, api_key);
    console.log("Country Name:", country_name);
    console.log("Country Code:", country_code);

    const [allRatingTags, globalPageMeta, latestReviews, AllReviewTags, AllReviewVoting, PopularCategories, ReviewCount, UserCount, PositiveReviewsCompany, NegativeReviewsCompany, HomeMeta, VisitorCheck, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getCountries] = await Promise.all([
        comFunction.getAllRatingTags(),
        comFunction2.getPageMetaValues('global'),
        comFunction2.getlatestReviews(18, country_name),
        comFunction2.getAllReviewTags(),
        comFunction2.getAllReviewVoting(),
        comFunction.getPopularCategories(country_code),
        comFunction.getReviewCount(),
        comFunction.getUserCount(),
        comFunction.getPositiveReviewsCompany(),
        comFunction.getNegativeReviewsCompany(),
        comFunction2.getPageMetaValues('home'),
        comFunction.getVisitorCheck(requestIp.getClientIp(req)),
        comFunction2.getAllLatestDiscussion(20, country_name),
        comFunction2.getAllPopularDiscussion(country_name),
        //comFunction2.getAllDiscussions(),
        comFunction2.getAllDiscussion(country_name),
        comFunction.getCountries()
    ]);
    const rangeTexts = {};

    console.log("PopularCategories", PopularCategories);

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
        //console.log('restructuredResponse', restructuredResponse);

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
                //console.log(allRatingTags);
                // const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
                //         JOIN company ON featured_companies.company_id = company.ID 
                //         WHERE featured_companies.status = 'active' 
                //         ORDER BY featured_companies.ordering ASC `;

                const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.slug, company.company_name FROM featured_companies 
                        JOIN company ON featured_companies.company_id = company.ID 
                        WHERE featured_companies.status = 'active' AND company.main_address_country = "${country_code}"
                        ORDER BY featured_companies.ordering ASC `;
                db.query(featured_sql, (featured_err, featured_result) => {
                    var featured_comps = featured_result;
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
                        countryname: country_code
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

                const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.short_desc,featured_companies.link,company.logo,company.company_name FROM featured_companies 
                        JOIN company ON featured_companies.company_id = company.ID 
                        WHERE featured_companies.status = 'active' 
                        ORDER BY featured_companies.ordering ASC `;
                db.query(featured_sql, (featured_err, featured_result) => {
                    var featured_comps = featured_result;
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
                        getCountries: getCountries
                    });
                })

            })

        })
    }
});
//view Contact Us Page
router.get('/contact-us', checkCookieValue, async (req, res) => {
    //resp.sendFile(`${publicPath}/index.html`)
    let currentUserData = JSON.parse(req.userData);
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
            res.render('front-end/contact', {
                menu_active_id: 'contact', page_title: page_title, currentUserData, contacts, socials,
                globalPageMeta: globalPageMeta
            });

        })
    })

});

//View About us Page
router.get('/about-us', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    try {
        const [PageInfo, PageMetaValues, globalPageMeta] = await Promise.all([
            comFunction2.getPageInfo('about'),
            comFunction2.getPageMetaValues('about'),
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
            currentUserData: currentUserData,
            common,
            meta_values_array
        });
    }
    //res.render('front-end/about', { menu_active_id: 'about', page_title: 'About Us', currentUserData });
});

router.get('/review', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        console.log(currentUserData);

        let ipAddress = req.ip;
        ipAddress = ipAddress.toString().replace('::ffff:', '');
        console.log("ipAddress", ipAddress);

        const api_key = process.env.GEO_LOCATION_API_KEY

        // const getcountrybyIp = await Promise.all([comFunction2.getcountrynamebyIp(ipAddress,api_key)]) 
        // const country_name = getcountrybyIp[0];
        // console.log("country_code",country_name);

        // const getcountrynamebyIp = await Promise.all([comFunction2.getcountrybyIp(ipAddress,api_key)]) 
        // const countryname = getcountrynamebyIp[0];
        // console.log("countrynamesss",countryname);

        const { country_name, country_code } = await comFunction2.getcountrynamebyIp(ipAddress, api_key);
        console.log("Country Name:", country_name);
        console.log("Country Code:", country_code);

        const [latestReviews, AllReviews, AllTrendingReviews, AllReviewTags, allRatingTags, globalPageMeta, homePageMeta, AllReviewVoting, getCountries] = await Promise.all([
            comFunction2.getlatestReviews(20, country_name),
            comFunction2.getAllReviews(country_name),
            comFunction2.getAllTrendingReviews(country_name),
            comFunction2.getAllReviewTags(),
            comFunction.getAllRatingTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getPageMetaValues('home'),
            comFunction2.getAllReviewVoting(),
            comFunction.getCountries(),

        ]);


        //console.log(getPageMetaValues);
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
            ip_address: ipAddress,
            country_name: country_name,
            countryname: country_code
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.get('/get-country', async (req, res) => {
    try {
        let ipAddress = req.ip;
        ipAddress = ipAddress.toString().replace('::ffff:', '');
        console.log("ipAddress", ipAddress);

        const api_key = process.env.GEO_LOCATION_API_KEY

        const response = axios.get(`https://ipgeolocation.abstractapi.com/v1/?api_key=${api_key}&ip_address=${ipAddress}`)
            .then(response => {
                var country_name = response.data;
                console.log("country_name", country_name);
            })
            .catch(error => {
                console.log(error);
            });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/faq', checkCookieValue, async (req, res) => {
    try {
        let currentUserData = JSON.parse(req.userData);
        // const faqPageData = await comFunction2.getFaqPage();
        // const faqCategoriesData = await comFunction2.getFaqCategories();
        // const faqItemsData = await comFunction2.getFaqItems();
        const [faqPageData, faqCategoriesData, faqItemsData, globalPageMeta] = await Promise.all([
            comFunction2.getFaqPage(),
            comFunction2.getFaqCategories(),
            comFunction2.getFaqItems(),
            comFunction2.getPageMetaValues('global'),
        ]);
        // Render the 'add-page' EJS view and pass the data
        // res.render('front-end/faq', {
        //     menu_active_id: 'faq',
        //     page_title: 'FAQ ',
        //     currentUserData,
        //     faqPageData,
        //     faqCategoriesData,
        //     faqItemsData,
        //     globalPageMeta:globalPageMeta
        // });
        res.json({
            menu_active_id: 'faq',
            page_title: 'FAQ ',
            currentUserData,
            faqPageData,
            faqCategoriesData,
            faqItemsData,
            globalPageMeta: globalPageMeta
        });
    } catch (error) {
        console.error(err);
        res.status(500).send('An error occurred');
    }

    //res.render('front-end/faq', { menu_active_id: 'faq', page_title: 'FAQ', currentUserData });
});

router.get('/business', checkCookieValue, async (req, res) => {

    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);

    try {
        let currentUserData = JSON.parse(req.userData);
        const sql = `SELECT * FROM page_info where secret_Key = 'business' `;
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
                    globalPageMeta: globalPageMeta
                });
            })

        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/stripe-payment', checkCookieValue, async (req, res) => {
    try {
        const { planId, planPrice, monthly, memberCount, total_price } = req.query;
        console.log("req.query-monthly", req.query);

        let ipAddress = req.ip;
        ipAddress = ipAddress.toString().replace('::ffff:', '');
        console.log("ipAddress", ipAddress);

        const api_key = process.env.GEO_LOCATION_API_KEY;
        //const api_key = 'AIzaSyCc5pts6Y3V7g9ZGGVsCcEi0WD8seu1VJ8';

        const { country_name, country_code } = await comFunction2.getcountrynamebyIp(ipAddress, api_key);
        console.log("Country Name:", country_name);
        console.log("Country Code:", country_code);

        let currentUserData = JSON.parse(req.userData);
        console.log("currentUserData", currentUserData);
        const planids = `SELECT * FROM plan_management WHERE name = "${planId}"`;
        const planidvalue = await queryAsync(planids);
        console.log("planidvalue", planidvalue[0].id);
        const planID = planidvalue[0].id;

        res.render('front-end/stripe_payment', {
            planId,
            planPrice,
            monthly,
            planID,
            currentUserData,
            memberCount,
            total_price,
            country_code: country_code
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});
router.get('/stripe-year-payment', checkCookieValue, async (req, res) => {
    try {
        const { planId, planPrice, yearly, memberCount, total_price } = req.query;
        console.log("req.query-yearly", req.query);

        
        let ipAddress = req.ip;
        ipAddress = ipAddress.toString().replace('::ffff:', '');
        console.log("ipAddress", ipAddress);

        const api_key = process.env.GEO_LOCATION_API_KEY;
        //const api_key = 'AIzaSyCc5pts6Y3V7g9ZGGVsCcEi0WD8seu1VJ8';

        const { country_name, country_code } = await comFunction2.getcountrynamebyIp(ipAddress, api_key);
        console.log("Country Name:", country_name);
        console.log("Country Code:", country_code);

        let currentUserData = JSON.parse(req.userData);
        console.log("currentUserData", currentUserData);
        const planids = `SELECT * FROM plan_management WHERE name = "${planId}"`;
        const planidvalue = await queryAsync(planids);
        console.log("planidvalue", planidvalue[0].id);
        const planID = planidvalue[0].id;


        res.render('front-end/stripe_payment_yearly', {
            planId,
            planPrice,
            yearly,
            planID,
            memberCount,
            currentUserData,
            total_price,
            country_code: country_code
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});


router.post('/create-subscription', async (req, res) => {
    try {
        const { fullName, email, address } = req.body;

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
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        const sql = `SELECT * FROM page_info where secret_Key = 'privacy' `;
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
                res.render('front-end/privacy-policy', {
                    menu_active_id: 'privacy-policy',
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
});

router.get('/disclaimer', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' `;
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
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/disclaimer', { menu_active_id: 'disclaimer', page_title: 'Disclaimer', currentUserData });
});

router.get('/terms-of-service', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const [globalPageMeta] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
    ]);
    try {
        const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' `;
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
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
});

router.get('/company/:slug', checkCookieValue, async (req, res) => {
    const slug = req.params.slug;
    const labeltype = req.query.type || null;
    console.log(labeltype)
    let currentUserData = JSON.parse(req.userData);
    const comp_res = await comFunction2.getCompanyIdBySlug(slug);
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
router.get('/categories', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);

    let ipAddress = req.ip;
    ipAddress = ipAddress.toString().replace('::ffff:', '');
    console.log("ipAddress", ipAddress);

    const api_key = process.env.GEO_LOCATION_API_KEY
    // const getcountrybyIp = await Promise.all([comFunction2.getcountrynamebyIp(ipAddress,api_key)]) 
    // const country_name = getcountrybyIp[0];
    // console.log("country_code",country_name);

    const { country_name, country_code } = await comFunction2.getcountrynamebyIp(ipAddress, api_key);
    console.log("Country Name:", country_name);
    console.log("Country Code:", country_code);

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
        const cat_query = `
        SELECT category.ID AS category_id, category.category_slug, category.category_name AS category_name, category.category_img AS category_img, c.category_name AS parent_name, GROUP_CONCAT(countries.name) AS country_names, category_country_relation.country_id AS country
        FROM category
        JOIN category_country_relation ON category.id = category_country_relation.cat_id
        JOIN countries ON category_country_relation.country_id = countries.id
        LEFT JOIN category AS c ON c.ID = category.parent_id
        WHERE category.parent_id = 0 AND category_country_relation.country_id= "${country_id}"
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
                    categoryName: row.category_name,
                    category_slug: row.category_slug,
                    parentName: row.parent_name,
                    categoryImage: row.category_img,
                    countryNames: row.country_names.split(','),
                    //country: row.country
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

//category Company Listing page
// router.get('/category/:category_slug', checkCookieValue, async (req, res) => {
router.get('/category/:category_slug/:country', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const category_slug = req.params.category_slug;
    const country = req.params.country;
    const baseURL = process.env.MAIN_URL;

    let ipAddress = req.ip;
    ipAddress = ipAddress.toString().replace('::ffff:', '');
    console.log("ipAddress", ipAddress);

    const api_key = process.env.GEO_LOCATION_API_KEY
    // const getcountrybyIp = await Promise.all([comFunction2.getcountrynamebyIp(ipAddress,api_key)]) 
    // const country_name = getcountrybyIp[0];
    // console.log("country_code",country_name);

    const { country_name, country_code } = await comFunction2.getcountrynamebyIp(ipAddress, api_key);
    console.log("Country Name:", country_name);
    console.log("Country Code:", country_code);

    const [globalPageMeta, getSubCategories, companyDetails, AllRatingTags, CategoryDetails] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getSubCategories(category_slug),
        comFunction2.getCompanyDetails(category_slug, country_code),
        comFunction.getAllRatingTags(),
        comFunction.getCategoryDetails(category_slug),
        //comFunction.getParentCategories(category_slug),
    ]);

    const categoryParentId = CategoryDetails[0].parent_id;
    const ParentCategories = await comFunction.getParentCategories(categoryParentId);

    try {

        const subcategories = getSubCategories.map((row) => ({
            categoryName: row.category_name,
            categorySlug: row.category_slug,
            subCategoryNames: row.subcategories ? row.subcategories.split(',') : [],
            subCategorySlug: row.subcategoriesSlug ? row.subcategoriesSlug.split(',') : [],
        }));

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
            ParentCategories
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

//category filter company Listing page
router.get('/category/:category_slug/:country/:filter', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
    const category_slug = req.params.category_slug;
    const country = req.params.country;
    const filter_value = req.params.filter;
    const baseURL = process.env.MAIN_URL;

    let ipAddress = req.ip;
    ipAddress = ipAddress.toString().replace('::ffff:', '');
    console.log("ipAddress", ipAddress);

    const api_key = process.env.GEO_LOCATION_API_KEY

    // const getcountrybyIp = await Promise.all([comFunction2.getcountrynamebyIp(ipAddress,api_key)]) 
    // const country_name = getcountrybyIp[0];
    // console.log("country_code",country_name);

    const { country_name, country_code } = await comFunction2.getcountrynamebyIp(ipAddress, api_key);
    console.log("Country Name:", country_name);
    console.log("Country Code:", country_code);


    const [globalPageMeta, getSubCategories, companyDetails, AllRatingTags, CategoryDetails] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getSubCategories(category_slug),
        comFunction2.getFilteredCompanyDetails(category_slug, filter_value, country_code),
        comFunction.getAllRatingTags(),
        comFunction.getCategoryDetails(category_slug),
    ]);
    if (filter_value == 'latest' || filter_value == 'trending' || filter_value == 'verified') {

        const categoryParentId = CategoryDetails[0].parent_id;
        const ParentCategories = await comFunction.getParentCategories(categoryParentId);
        try {

            const subcategories = getSubCategories.map((row) => ({
                categoryName: row.category_name,
                categorySlug: row.category_slug,
                subCategoryNames: row.subcategories ? row.subcategories.split(',') : [],
                subCategorySlug: row.subcategoriesSlug ? row.subcategoriesSlug.split(',') : [],
            }));

            // res.json( {
            //     menu_active_id: 'company-listing',
            //     page_title: 'Company Name',
            //     currentUserData,
            //     globalPageMeta:globalPageMeta,
            //     subCategories:subcategories[0],
            //     companyDetails:companyDetails,
            //     AllRatingTags,
            //     ParentCategories
            // });
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
        } catch (err) {
            console.error(err);
            res.render('front-end/404', {
                menu_active_id: '404',
                page_title: '404',
                currentUserData,
                globalPageMeta: globalPageMeta
            });
        }
    } else {
        res.redirect(`/category/${category_slug}`);
    }

});

//New Home page
router.get('/home', checkCookieValue, async (req, res) => {
    let currentUserData = JSON.parse(req.userData);
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
    let ipAddress = req.ip;
    ipAddress = ipAddress.toString().replace('::ffff:', '');
    console.log("ipAddress", ipAddress);

    const api_key = process.env.GEO_LOCATION_API_KEY;

    const getcountrybyIp = await Promise.all([comFunction2.getcountrybyIp(ipAddress, api_key)])
    const country_name = getcountrybyIp[0];
    console.log("country_name", country_name);

    const [globalPageMeta, getAllLatestDiscussion, getAllPopularDiscussion, getAllDiscussions, getAllViewedDiscussion, getPopularTags, getCountries] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getAllLatestDiscussion(20, country_name),
        comFunction2.getAllPopularDiscussion(country_name),
        comFunction2.getAllDiscussion(country_name),
        comFunction2.getAllViewedDiscussion(country_name),
        comFunction2.getPopularTags(20),
        comFunction.getCountries(),
    ]);
    //console.log(getAllLatestDiscussion);
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

//Discussion page
router.get('/translate', async (req, res) => {
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


    const [globalPageMeta, company, allRatingTags, companyReviewNumbers, allCompanyReviews, allCompanyReviewTags, PremiumCompanyData, reviewTagsCount, CompanySurveyDetails, CompanySurveySubmitionsCount, SurveyAnswerCount, a] = await Promise.all([
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
    ]);
    console.log('SurveyAnswerCount', SurveyAnswerCount)

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
                SurveyAnswerCount
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

    if (req.cookies.user) {
        const encodedUserData = req.cookies.user;
        const UserJsonData = JSON.parse(encodedUserData);
        if (UserJsonData && UserJsonData.claimed_comp_slug == req.params.slug) {
            next();
        } else {
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
                page_title: 'Company Dashboard',
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
                page_title: 'Company Dashboard',
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

    const companyPaidStatus = company.paid_status.trim();;
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
    //const companyId = req.params.compID;
    const [globalPageMeta, company, companyReviewNumbers, allRatingTags, PremiumCompanyData, getAllComplaintsByCompanyId] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction.getCompany(companyId),
        comFunction.getCompanyReviewNumbers(companyId),
        comFunction.getAllRatingTags(),
        comFunction2.getPremiumCompanyData(companyId),
        comFunction2.getAllComplaintsByCompanyId(companyId),
    ]);
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
                AllComplaintsByCompanyId: formattedCoplaintData
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
                AllComplaintsByCompanyId: formattedCoplaintData
            });
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
        comFunction2.updateCompanyrNotificationStatus(complaintId)
    ]);


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
                ComplaintsByComplaintId: getAllComplaintsByComplaintId[0]
            });
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
router.get('/new_complain/:slug', checkClientClaimedCompany, async (req, res) => {

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
        res.render('front-end/new_complaint', {
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
                const sql = "SELECT * FROM category"
                db.query(sql, (error, cat_result) => {
                    if (error) {
                        console.log(error);
                    } else {
                        if (cat_result.length > 0) {
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
router.get('/edit-category', checkLoggedIn, (req, res, next) => {

    console.log(req.query.id);
    const cat_id = req.query.id;
    const country_id = req.query.country_id;
    const cat_name = req.query.cat_name;
    console.log("country_id", country_id);
    console.log("cat_name", cat_name);

    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    let country_response = [];
    let accounts_response = [];
    let cat_data = [];
    let edit_data = [];
    //-- Get Country List --/
    db.query('SELECT * FROM countries', (err, results) => {

        if (err) {
            console.log(err);
        } else {
            if (results.length > 0) {
                //console.log(results);
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
                                    //console.log(edit_data);
                                    //console.log(country, country_id);
                                    // res.json( { menu_active_id: 'company', page_title: 'Add New Category', currentUserData, country_response, cat_data, edit_data, country_arr, country_id });

                                    res.render('edit-category', { menu_active_id: 'company', page_title: 'Add New Category', currentUserData, country_response, cat_data, edit_data, country_arr, country_id });
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
            comFunction.getCompanyCategory(),
            comFunction.getCountries(),
            comFunction.getParentCompany()
        ]);
        console.log("getCountries", getCountries);
        console.log("getParentCompany", getParentCompany);

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

        let countries = [];
        await Promise.all(allcompany.map(async company => {
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
        // console.log("company", company);
        // console.log("getStatesByCountryID",getStatesByCountryID);
        console.log("getChildCompany", getChildCompany);

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
        //console.log(reviewData);
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

        const faqPageData = await comFunction2.getFaqPage();
        const faqCategoriesData = await comFunction2.getFaqCategories();
        const faqItemsData = await comFunction2.getFaqItems();
        // Render the 'add-page' EJS view and pass the data
        // res.json({
        //     menu_active_id: 'pages',
        //     page_title: 'Edit FAQs ',
        //     currentUserData,
        //     faqPageData,
        //     faqCategoriesData,
        //     faqItemsData
        // });
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

//Edit Contact Page
router.get('/edit-contacts', checkLoggedIn, (req, res) => {
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
                //Render the 'update-contact' EJS view and pass the data
                res.render('pages/update-contact', {
                    menu_active_id: 'pages',
                    page_title: 'Update Contacts',
                    currentUserData,
                    contacts,
                    socials
                });
            })
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit Home Page
router.get('/edit-home', checkLoggedIn, async (req, res) => {

    const [ReviewCount, UserCount, VisitorCheck] = await Promise.all([
        comFunction.getReviewCount(),
        comFunction.getUserCount(),
        comFunction.getVisitorCheck(requestIp.getClientIp(req))
    ]);

    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
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
                //console.log(meta_values_array);
                res.render('pages/update-home', {
                    menu_active_id: 'pages',
                    page_title: 'Update Home',
                    currentUserData,
                    home,
                    meta_values_array,
                    ReviewCount,
                    UserCount,
                    VisitorCheck
                });
            })

        })

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

//Edit About Page
router.get('/edit-about', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'about' `;
        db.query(sql, (err, results, fields) => {
            if (err) throw err;
            const about_info = results[0];
            const meta_sql = `SELECT * FROM page_meta where page_id = ${about_info.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                //console.log(meta_values_array);
                res.render('pages/update-about', {
                    menu_active_id: 'pages',
                    page_title: 'Update About',
                    currentUserData,
                    about_info,
                    meta_values_array
                });
                //comFunction.getMetaValue(home.id, 'about_us_button_link');

                // res.json({
                //     menu_active_id: 'pages',
                //     page_title: 'Update Home',
                //     currentUserData,
                //     home,
                //     meta_values_array
                // });
            })

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
        const featured_sql = `SELECT featured_companies.id,featured_companies.company_id,featured_companies.status,featured_companies.ordering,featured_companies.short_desc,featured_companies.link,company.logo,company.company_name FROM featured_companies 
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
                res.render('pages/update-business', {
                    menu_active_id: 'pages',
                    page_title: 'Update Business',
                    currentUserData,
                    common,
                    meta_values_array,
                    UpcomingBusinessFeature,
                    BusinessFeature
                });
            })

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
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                console.log(meta_values_array);
                res.render('pages/update-privacy-policy', {
                    menu_active_id: 'pages',
                    page_title: 'Update Privacy Policy',
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
//Edit disclaimer Page
router.get('/edit-disclaimer', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'disclaimer' `;
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
                res.render('pages/update-disclaimer', {
                    menu_active_id: 'pages',
                    page_title: 'Update Disclaimer',
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
//Edit terms-of-service Page
router.get('/edit-terms-of-service', checkLoggedIn, (req, res) => {
    try {
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);
        const sql = `SELECT * FROM page_info where secret_Key = 'terms_of_service' `;
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
                res.render('pages/update-terms-of-service', {
                    menu_active_id: 'pages',
                    page_title: 'Update Terms of Service',
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
            const meta_sql = `SELECT * FROM page_meta where page_id = ${common.id}`;
            db.query(meta_sql, async (meta_err, _meta_result) => {
                if (meta_err) throw meta_err;

                const meta_values = _meta_result;
                let meta_values_array = {};
                await meta_values.forEach((item) => {
                    meta_values_array[item.page_meta_key] = item.page_meta_value;
                })
                console.log(meta_values_array);
                res.render('pages/update-complaint', {
                    menu_active_id: 'pages',
                    page_title: 'Update Complaint Register',
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
            menu_active_id: 'company',
            page_title: 'Payments',
            currentUserData,
            allPayments: getAllPayments
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
        LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
        LEFT JOIN category cat ON cr.category_id = cat.ID
        WHERE c.status = '1' AND c.membership_type_id >=3 AND c.complaint_status = '1' AND main_address_country=?
        `;

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
            AllCompaniesReviews: AllCompaniesReviews
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

        // Fetch all the required data asynchronously
        const [user, userMeta, ReviewedCompanies, AllCompaniesReviews, AllReviewTags, allRatingTags, globalPageMeta, AllReviewVoting] = await Promise.all([
            comFunction.getUser(userId),
            comFunction.getUserMeta(userId),
            comFunction2.getReviewedCompanies(userId),
            comFunction2.getAllCompaniesReviews(userId),
            comFunction2.getAllReviewTags(),
            comFunction.getAllRatingTags(),
            comFunction2.getPageMetaValues('global'),
            comFunction2.getAllReviewVoting(),
        ]);
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
            AllCompaniesReviews: AllCompaniesReviews
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
    const [globalPageMeta, PageMetaValues, getAllPremiumCompany, getCountries] = await Promise.all([
        comFunction2.getPageMetaValues('global'),
        comFunction2.getPageMetaValues('complaint'),
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

//user complain listing page
router.get('/my-complaints', checkFrontEndLoggedIn, async (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const userId = currentUserData.user_id;
    const [user, userMeta, globalPageMeta, AllCompaniesReviews, getAllComplaintsByUserId] = await Promise.all([
        comFunction.getUser(userId),
        comFunction.getUserMeta(userId),
        comFunction2.getPageMetaValues('global'),
        comFunction2.getAllCompaniesReviews(userId),
        comFunction2.getAllComplaintsByUserId(userId),
    ]);

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
            AllComplaintsByUserId: formattedCoplaintData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
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
            ComplaintsByComplaintId: getAllComplaintsByComplaintId[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
    //res.render('front-end/terms-of-service', { menu_active_id: 'terms-of-service', page_title: 'Terms Of Service', currentUserData });
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