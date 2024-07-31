const util = require('util');
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const db = require('./config');
const passport = require('passport');
const session = require('express-session');
const axios = require('axios');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const useragent = require('useragent');
const requestIp = require('request-ip');
const FacebookStrategy = require('passport-facebook').Strategy;
const querystring = require('querystring');
const bodyParser = require('body-parser');
const comFunction = require('./common_function');
const mdlconfig = require('./config-module');
const bcrypt = require('bcryptjs');
const helmet = require('helmet')

dotenv.config({ path: './.env' });
const query = util.promisify(db.query).bind(db);

const app = express();
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'uploads');
app.use(cookieParser());
app.use(express.static(publicPath));
app.use(express.static(uploadsPath));
app.set('view engine', 'ejs');


app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Set up express-session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Include the Passport configuration from passport-setup.js
require('./passport-setup');
// Serialize and deserialize user data
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Set up express-session middleware
// app.use(session({
//     secret: 'your-secret-key',
//     resave: false,
//     saveUninitialized: false
// }));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Google login route
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/facebook', passport.authenticate('facebook',{scope:'email'}));

// Google login callback
app.get(
    '/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/google-user-data',
      failureRedirect: '/fail',
    })
);

// FB Login Callback
app.get(
    '/auth/facebook/callback',
    passport.authenticate('facebook', {
      successRedirect: '/facebook-user-data',
      failureRedirect: '/fail',
    })
);
app.get('/fail', async (req, res) => {
    res.send("Failed attempt");
});

app.get('/google-user-data', async(req, res) => {
    const user = req.user;
    //res.json(user);
    try {
        const UserResponse = await comFunction.saveUserGoogleLoginDataToDB(user);
        //console.log('Google Login User Response',UserResponse);
        //res.json(UserResponse);
        if(UserResponse.status == 0){

            //Register Code
            const userFirstName = UserResponse.first_name;
            const userLastName = UserResponse.last_name;
            const userEmail = UserResponse.email;
            const userPicture = UserResponse.profile_pic;
            const external_id = UserResponse.external_registration_id;

            const currentDate = new Date();

            const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

            let hasPassword = await bcrypt.hash(userEmail, 8);

            const user_insert_query = 'INSERT INTO users (first_name, last_name, email, password, register_from, external_registration_id, user_registered, user_status, user_type_id, alise_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const user_insert_values = [userFirstName, userLastName, userEmail, hasPassword, 'gmail', external_id, formattedDate, 1, 2, userFirstName + userLastName ];
            if(userEmail){
                user_insert_values[7] = 1;
            }else{
                user_insert_values[7] = 0;
            }
            try{
                const user_insert_results = await query(user_insert_query, user_insert_values);
                if (user_insert_results.insertId) {
                    const newuserID = user_insert_results.insertId;
                    const user_meta_insert_query = 'INSERT INTO user_customer_meta (user_id, review_count, profile_pic) VALUES (?, ?, ?)';
                    const user_meta_insert_values = [newuserID, 0, userPicture];
                    try{
                        const user_meta_insert_results = await query(user_meta_insert_query, user_meta_insert_values);
                        //**Send Welcome Email to User**/
                        var mailOptions = {
                            from: process.env.MAIL_USER,
                            //to: 'pranab@scwebtech.com',
                            to: userEmail,
                            subject: 'Welcome Email',
                            html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                            <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tbody>
                            <tr>
                            <td align="center" valign="top">
                                <div id="template_header_image"><p style="margin-top: 0;"></p></div>
                                <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tbody>
                                    <tr>
                                    <td align="center" valign="top">
                                    <!-- Header -->
                                    <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
                                        <tbody>
                                        <tr>
                                        <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                            <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                            <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome Email</h1>
                                            </td>
                    
                                        </tr>
                                        </tbody>
                                    </table>
                                <!-- End Header -->
                                </td>
                                    </tr>
                                    <tr>
                                    <td align="center" valign="top">
                                    <!-- Body -->
                                    <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
                                        <tbody>
                                        <tr>
                                            <td id="body_content" style="background-color: #fdfdfd;" valign="top">
                                            <!-- Content -->
                                            <table border="0" cellpadding="20" cellspacing="0" width="100%">
                                            <tbody>
                                                <tr>
                                                <td style="padding: 48px;" valign="top">
                                                <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">
                                                    
                                                    <table border="0" cellpadding="4" cellspacing="0" width="90%">
                                                    <tr>
                                                        <td colspan="2">
                                                            <strong>Hello ${userFirstName},</strong>
                                                            <p style="font-size:15px; line-height:20px">Warm greetings from the CEchoes Technology team!
                                                            You have joined a community dedicated to empowering all Grahaks (Customers) and ensuring their voices are heard <b>LOUD</b> and <b>C L E A R</b>.</p>
                                                            <p style="font-size:15px; line-height:20px"> Keep sharing your Customer experiences (positive or negative), read about others' experience and get to know Customer centric information.</p>
                                                            <p style="font-size:15px; line-height:20px">Share this platform with all your friends and family.
                                                            Together, we can make Organisations listen and improve because <b>#CustomersHavePower</b>.</p><p style="font-size:15px; line-height:20px">Let's usher in this Customer Revolution coz <b>#CustomerRightsMatter</b>.</p><p style="font-size:15px; line-height:20px">Welcome Onboard!</p><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
                                                        </td>
                                                    </tr>
                                                    </table>
                                                    <p style="font-size:15px; line-height:20px">Download the app from Google Playstore or visit  <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology.com </a>.</p>
                                                </div>
                                                </td>
                                                </tr>
                                            </tbody>
                                            </table>
                                            <!-- End Content -->
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                    <!-- End Body -->
                                    </td>
                                    </tr>
                                    <tr>
                                    <td align="center" valign="top">
                                    <!-- Footer -->
                                    <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
                                        <tbody>
                                        <tr>
                                        <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
                                        <table border="0" cellpadding="10" cellspacing="0" width="100%">
                                            <tbody>
                                            <tr>
                                                <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
                                                    <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
                                                </td>
                                            </tr>
                                            </tbody>
                                        </table>
                                        </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                    <!-- End Footer -->
                                    </td>
                                    </tr>
                                </tbody>
                                </table>
                            </td>
                            </tr>
                            </tbody>
                            </table>
                        </div>`
                        }
                        await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                            if (err) {
                                console.log(err);
                                // return res.send({
                                //     status: 'not ok',
                                //     message: 'Something went wrong'
                                // });
                            } else {
                                console.log('Mail Send: ', info.response);
                                // return res.send({
                                //     status: 'ok',
                                //     message: ''
                                // });
                            }
                        })
                        //--- WP User Register-------//
                        const userRegistrationData = {
                            username: userEmail,
                            email: userEmail,
                            password: userEmail,
                            first_name: userFirstName,
                            last_name: userLastName,
                        };
            
                        axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData)
                        .then((response) => {
                            //console.log('User registration successful. User ID:', response.data.user_id);
            
                            //-------User Auto Login --------------//
                            const userAgent = req.headers['user-agent'];
                            const agent = useragent.parse(userAgent);
            
                            // Set a cookie
                            const userData = {
                                user_id: newuserID,
                                first_name: userFirstName,
                                last_name: userLastName,
                                email: userEmail,
                                user_type_id: 2,
                                profile_pic: userPicture
                            };
                            const encodedUserData = JSON.stringify(userData);
                            res.cookie('user', encodedUserData);
            
                            (async () => {
                                //---- Login to Wordpress Blog-----//
                                //let wp_user_data;
                                try {
                                    const userLoginData = {
                                        email: userEmail,
                                        password: userEmail,
                                    };
                                    const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
                                    const wp_user_data = response.data.data;
            
                                    //-- check last Login Info-----//
                                    const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
                                    db.query(device_query, [newuserID], async (err, device_query_results) => {
                                        const currentDate = new Date();
                                        const year = currentDate.getFullYear();
                                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                        const day = String(currentDate.getDate()).padStart(2, '0');
                                        const hours = String(currentDate.getHours()).padStart(2, '0');
                                        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
                                        const seconds = String(currentDate.getSeconds()).padStart(2, '0');
                                        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            
                                        if (device_query_results.length > 0) {
                                            // User exist update info
                                            const device_update_query = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
                                            const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, newuserID];
                                            db.query(device_update_query, values, (err, device_update_query_results) => {
                                                //   return res.send(
                                                //       {
                                                //           status: 'ok',
                                                //           data: userData,
                                                //           wp_user: wp_user_data,
                                                //           currentUrlPath: '/',
                                                //           message: 'Registration successful you are automatically login to your dashboard'
                                                //       }
                                                //   )
                                                if(wp_user_data){
                                                    res.redirect(process.env.BLOG_URL+"?login_check="+wp_user_data+"&currentUrlPath=");
                                                }
                                            })
                                        } else {
                                            // User doesnot exist Insert New Row.
            
                                            const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                            const values = [newuserID, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];
            
                                            db.query(device_insert_query, values, (err, device_insert_query_results) => {
                                                //   return res.send(
                                                //       {
                                                //           status: 'ok',
                                                //           data: userData,
                                                //           wp_user: wp_user_data,
                                                //           currentUrlPath: req.body.currentUrlPath,
                                                //           message: 'Registration successful you are automatically login to your dashboard'
                                                //       }
                                                //   )
                                                if(wp_user_data){
                                                    res.redirect(process.env.BLOG_URL+"?login_check="+wp_user_data+"&currentUrlPath=");
                                                }
                                            })
            
                                        }
                                    })
                                } catch (error) {
                                    // console.error('User login failed. Error:', error);
                                    // if (error.response && error.response.data) {
                                    //     console.log('Error response data:', error.response.data);
                                    // }
                                    res.json(error);
                                }
                            })();
                        })
                        .catch((error) => {
                            //console.error('User registration failed:', );
                            res.json(error);
                            // return res.send(
                            //     {
                            //         status: 'err',
                            //         data: '',
                            //         message: error.response.data
                            //     }
                            // )
                        });
        
                    //return {first_name:userFullNameArray[0], last_name:userFullNameArray[1], user_id: newuserID, status: 0};
                    }catch(error){
                        res.json(error);
                        //console.error('Error during user_meta_insert_query:', error);
                    }
                }
            }catch(error){
                res.json(error);
                //console.error('Error during user_insert_query:', error);
            }

        }else{
            if(UserResponse.register_from=='web'){
                //alert('This email-ID already exist please login with your email and password.');
                return res.redirect('/?error='+UserResponse.register_from);
            }else{
                //login code gose here
                const userFirstName = UserResponse.first_name;
                const userLastName = UserResponse.last_name;
                const userEmail = UserResponse.email;
                const userPicture = UserResponse.profile_pic;
                const external_id = UserResponse.external_registration_id;

                //----User Login to Node and WP---------//
                const userAgent = req.headers['user-agent'];
                const agent = useragent.parse(userAgent);
                db.query('SELECT * FROM users WHERE email = ?', [userEmail], async (err, results) => {
                    if (err) {
                        // return res.send(
                        //     {
                        //         status: 'err',
                        //         data: '',
                        //         message: 'An error occurred while processing your request' + err
                        //     }
                        // )
                        res.json(err);
                    } else {
                        if (results.length > 0) {
                            const user = results[0];
                            //console.log(user);
            
                            //check Customer Login
                            if (user.user_type_id == 2 && user.user_status == 1) {
                                const query = `
                                            SELECT user_meta.*, c.name as country_name, s.name as state_name, ccr.company_id as claimed_comp_id
                                            FROM user_customer_meta user_meta
                                            LEFT JOIN countries c ON user_meta.country = c.id
                                            LEFT JOIN states s ON user_meta.state = s.id
                                            LEFT JOIN company_claim_request ccr ON user_meta.user_id = ccr.claimed_by
                                            WHERE user_id = ?
                                            `;
                                db.query(query, [user.user_id], async (err, results) => {
                                    let userData = {};
                                    if (results.length > 0) {
                                        const user_meta = results[0];
                                        //console.log(user_meta,'aaaaaaaa');
                                        // Set a cookie
                                        const dateString = user_meta.date_of_birth;
                                        const date_of_birth_date = new Date(dateString);
                                        const formattedDate = date_of_birth_date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
            
                                        let userData = {
                                            user_id: user.user_id,
                                            first_name: user.first_name,
                                            last_name: user.last_name,
                                            email: user.email,
                                            phone: user.phone,
                                            user_type_id: user.user_type_id,
                                            address: user_meta.address,
                                            country: user_meta.country,
                                            country_name: user_meta.country_name,
                                            state: user_meta.state,
                                            state_name: user_meta.state_name,
                                            city: user_meta.city,
                                            zip: user_meta.zip,
                                            review_count: user_meta.review_count,
                                            date_of_birth: formattedDate,
                                            occupation: user_meta.occupation,
                                            gender: user_meta.gender,
                                            profile_pic: user_meta.profile_pic,
                                            claimed_comp_id: user_meta.claimed_comp_id
                                        };
                                        const encodedUserData = JSON.stringify(userData);
                                        res.cookie('user', encodedUserData);
                                        console.log(encodedUserData, 'login user data');
                                    } else {
                                        // Set a cookie
                                        let userData = {
                                            user_id: user.user_id,
                                            first_name: user.first_name,
                                            last_name: user.last_name,
                                            email: user.email,
                                            phone: user.phone,
                                            user_type_id: user.user_type_id,
                                            claimed_comp_id: ''
                                        };
                                        const encodedUserData = JSON.stringify(userData);
                                        res.cookie('user', encodedUserData);
                                    }
            
                                    (async () => {
                                        //---- Login to Wordpress Blog-----//
                                        //let wp_user_data;
                                        try {
                                            const userLoginData = {
                                                email: userEmail,
                                                password: userEmail,
                                            };
            
                                            const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
                                            const wp_user_data = response.data.data;
            
                                            //-- check last Login Info-----//
                                            const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
                                            db.query(device_query, [user.user_id], async (err, device_query_results) => {
                                                const currentDate = new Date();
                                                const year = currentDate.getFullYear();
                                                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                                const day = String(currentDate.getDate()).padStart(2, '0');
                                                const hours = String(currentDate.getHours()).padStart(2, '0');
                                                const minutes = String(currentDate.getMinutes()).padStart(2, '0');
                                                const seconds = String(currentDate.getSeconds()).padStart(2, '0');
                                                const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            
                                                if (device_query_results.length > 0) {
                                                    // User exist update info
                                                    const device_update_query = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
                                                    const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, user.user_id];
                                                    db.query(device_update_query, values, (err, device_update_query_results) => {
                                                        // return res.send(
                                                        //     {
                                                        //         status: 'ok',
                                                        //         data: userData,
                                                        //         wp_user: wp_user_data,
                                                        //         currentUrlPath: '/',
                                                        //         message: 'Login Successful'
                                                        //     }
                                                        // )
                                                        if(wp_user_data){
                                                            res.redirect(process.env.BLOG_URL+"?login_check="+wp_user_data+"&currentUrlPath=");
                                                        }
                                                    })
                                                } else {
                                                    // User doesnot exist Insert New Row.
            
                                                    const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                                    const values = [user.user_id, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];
            
                                                    db.query(device_insert_query, values, (err, device_insert_query_results) => {
                                                        // return res.send(
                                                        //     {
                                                        //         status: 'ok',
                                                        //         data: userData,
                                                        //         wp_user: wp_user_data,
                                                        //         currentUrlPath: '/',
                                                        //         message: 'Login Successful'
                                                        //     }
                                                        // )
                                                        if(wp_user_data){
                                                            res.redirect(process.env.BLOG_URL+"?login_check="+wp_user_data+"&currentUrlPath=");
                                                        }
                                                    })
            
                                                }
                                            })
                                        } catch (error) {
                                            console.error('User login failed. Error:', error);
                                            if (error.response && error.response.data) {
                                                console.log('Error response data:', error.response.data);
                                            }
                                        }
                                    })();
                                })
                            } else {
                                let err_msg = '';
                                if (user.user_status == 0) {
                                    err_msg = 'your account is inactive, please contact with administrator.';
                                } else {
                                    err_msg = 'Do you want to login as administrator, then please go to proper route';
                                }
                                res.json(
                                    {
                                        status: 'err',
                                        data: '',
                                        message: err_msg
                                    }
                                )
                            }
                        } else {
                            // return res.send(
                            //     {
                            //         status: 'err',
                            //         data: '',
                            //         message: 'Invalid Email'
                            //     }
                            // )
                            res.json(
                                {
                                    status: 'err',
                                    data: '',
                                    message: 'Invalid Email'
                                }
                            );
                        }
                    }
                })
            }

        }            
    } catch (error) {
        console.error('Error saving user data:', error);
        return res.redirect('/error/'+error.message);
    }    
});

app.get('/facebook-user-data', async(req, res) => {
        const user = req.user;
        //res.json(user);
        try {
            const UserResponse = await comFunction.saveUserFacebookLoginDataToDB(user);
            //console.log('FB Login User Response',UserResponse);
            //res.json(UserResponse);
            if(UserResponse.status == 0){

                //Register Code
                const userFirstName = UserResponse.first_name;
                const userLastName = UserResponse.last_name;
                const userEmail = UserResponse.email;
                const userPicture = UserResponse.profile_pic;
                const external_id = UserResponse.external_registration_id;

                const currentDate = new Date();

                const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

                let hasPassword = await bcrypt.hash(userEmail, 8);

                const user_insert_query = 'INSERT INTO users (first_name, last_name, email, password, register_from, external_registration_id, user_registered, user_status, user_type_id, alise_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                const user_insert_values = [userFirstName, userLastName, userEmail, hasPassword, 'facebook', external_id, formattedDate, 1, 2, userFirstName + userLastName];
                if(userEmail){
                    user_insert_values[7] = 1;
                }else{
                    user_insert_values[7] = 0;
                }
                try{
                    const user_insert_results = await query(user_insert_query, user_insert_values);
                    if (user_insert_results.insertId) {
                        const newuserID = user_insert_results.insertId;
                        const user_meta_insert_query = 'INSERT INTO user_customer_meta (user_id, review_count, profile_pic) VALUES (?, ?, ?)';
                        const user_meta_insert_values = [newuserID, 0, userPicture];
                        try{
                            const user_meta_insert_results = await query(user_meta_insert_query, user_meta_insert_values);
                            //**Send Welcome Email to User**/
                            var mailOptions = {
                                from: process.env.MAIL_USER,
                                //to: 'pranab@scwebtech.com',
                                to: userEmail,
                                subject: 'Welcome Email',
                                html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                                <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tbody>
                                <tr>
                                <td align="center" valign="top">
                                    <div id="template_header_image"><p style="margin-top: 0;"></p></div>
                                    <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
                                    <tbody>
                                        <tr>
                                        <td align="center" valign="top">
                                        <!-- Header -->
                                        <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
                                            <tbody>
                                            <tr>
                                            <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                                <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome Email</h1>
                                                </td>
                        
                                            </tr>
                                            </tbody>
                                        </table>
                                    <!-- End Header -->
                                    </td>
                                        </tr>
                                        <tr>
                                        <td align="center" valign="top">
                                        <!-- Body -->
                                        <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
                                            <tbody>
                                            <tr>
                                                <td id="body_content" style="background-color: #fdfdfd;" valign="top">
                                                <!-- Content -->
                                                <table border="0" cellpadding="20" cellspacing="0" width="100%">
                                                <tbody>
                                                    <tr>
                                                    <td style="padding: 48px;" valign="top">
                                                    <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">
                                                        
                                                        <table border="0" cellpadding="4" cellspacing="0" width="90%">
                                                        <tr>
                                                            <td colspan="2">
                                                                <strong>Hello ${userFirstName},</strong>
                                                                <p style="font-size:15px; line-height:20px">Warm greetings from the CEchoes Technology team!
                                                                You have joined a community dedicated to empowering all Grahaks (Customers) and ensuring their voices are heard <b>LOUD</b> and <b>C L E A R</b>.</p>
                                                                <p style="font-size:15px; line-height:20px"> Keep sharing your Customer experiences (positive or negative), read about others' experience and get to know Customer centric information.</p>
                                                                <p style="font-size:15px; line-height:20px">Share this platform with all your friends and family.
                                                                Together, we can make Organisations listen and improve because <b>#CustomersHavePower</b>.</p><p style="font-size:15px; line-height:20px">Let's usher in this Customer Revolution coz <b>#CustomerRightsMatter</b>.</p><p style="font-size:15px; line-height:20px">Welcome Onboard!</p><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
                                                            </td>
                                                        </tr>
                                                        </table>
                                                        <p style="font-size:15px; line-height:20px">Download the app from Google Playstore or visit  <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology.com </a>.</p>
                                                    </div>
                                                    </td>
                                                    </tr>
                                                </tbody>
                                                </table>
                                                <!-- End Content -->
                                                </td>
                                            </tr>
                                            </tbody>
                                        </table>
                                        <!-- End Body -->
                                        </td>
                                        </tr>
                                        <tr>
                                        <td align="center" valign="top">
                                        <!-- Footer -->
                                        <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
                                            <tbody>
                                            <tr>
                                            <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
                                            <table border="0" cellpadding="10" cellspacing="0" width="100%">
                                                <tbody>
                                                <tr>
                                                    <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
                                                        <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
                                                    </td>
                                                </tr>
                                                </tbody>
                                            </table>
                                            </td>
                                            </tr>
                                            </tbody>
                                        </table>
                                        <!-- End Footer -->
                                        </td>
                                        </tr>
                                    </tbody>
                                    </table>
                                </td>
                                </tr>
                                </tbody>
                                </table>
                            </div>`
                            }
                            await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                                if (err) {
                                    console.log(err);
                                    // return res.send({
                                    //     status: 'not ok',
                                    //     message: 'Something went wrong'
                                    // });
                                } else {
                                    console.log('Mail Send: ', info.response);
                                    // return res.send({
                                    //     status: 'ok',
                                    //     message: ''
                                    // });
                                }
                            })
                            //--- WP User Register-------//
                            const userRegistrationData = {
                                username: userEmail,
                                email: userEmail,
                                password: userEmail,
                                first_name: userFirstName,
                                last_name: userLastName,
                            };
                
                            axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData)
                            .then((response) => {
                                //console.log('User registration successful. User ID:', response.data.user_id);
                
                                //-------User Auto Login --------------//
                                const userAgent = req.headers['user-agent'];
                                const agent = useragent.parse(userAgent);
                
                                // Set a cookie
                                const userData = {
                                    user_id: newuserID,
                                    first_name: userFirstName,
                                    last_name: userLastName,
                                    email: userEmail,
                                    user_type_id: 2,
                                    profile_pic: userPicture
                                };
                                const encodedUserData = JSON.stringify(userData);
                                res.cookie('user', encodedUserData);
                
                                (async () => {
                                    //---- Login to Wordpress Blog-----//
                                    //let wp_user_data;
                                    try {
                                        const userLoginData = {
                                            email: userEmail,
                                            password: userEmail,
                                        };
                                        const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
                                        const wp_user_data = response.data.data;
                
                                        //-- check last Login Info-----//
                                        const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
                                        db.query(device_query, [newuserID], async (err, device_query_results) => {
                                            const currentDate = new Date();
                                            const year = currentDate.getFullYear();
                                            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                            const day = String(currentDate.getDate()).padStart(2, '0');
                                            const hours = String(currentDate.getHours()).padStart(2, '0');
                                            const minutes = String(currentDate.getMinutes()).padStart(2, '0');
                                            const seconds = String(currentDate.getSeconds()).padStart(2, '0');
                                            const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                
                                            if (device_query_results.length > 0) {
                                                // User exist update info
                                                const device_update_query = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
                                                const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, newuserID];
                                                db.query(device_update_query, values, (err, device_update_query_results) => {
                                                    //   return res.send(
                                                    //       {
                                                    //           status: 'ok',
                                                    //           data: userData,
                                                    //           wp_user: wp_user_data,
                                                    //           currentUrlPath: '/',
                                                    //           message: 'Registration successful you are automatically login to your dashboard'
                                                    //       }
                                                    //   )
                                                    if(wp_user_data){
                                                        res.redirect(process.env.BLOG_URL+"?login_check="+wp_user_data+"&currentUrlPath=");
                                                    }
                                                })
                                            } else {
                                                // User doesnot exist Insert New Row.
                
                                                const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                                const values = [newuserID, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];
                
                                                db.query(device_insert_query, values, (err, device_insert_query_results) => {
                                                    //   return res.send(
                                                    //       {
                                                    //           status: 'ok',
                                                    //           data: userData,
                                                    //           wp_user: wp_user_data,
                                                    //           currentUrlPath: req.body.currentUrlPath,
                                                    //           message: 'Registration successful you are automatically login to your dashboard'
                                                    //       }
                                                    //   )
                                                    if(wp_user_data){
                                                        res.redirect(process.env.BLOG_URL+"?login_check="+wp_user_data+"&currentUrlPath=");
                                                    }
                                                })
                
                                            }
                                        })
                                    } catch (error) {
                                        // console.error('User login failed. Error:', error);
                                        // if (error.response && error.response.data) {
                                        //     console.log('Error response data:', error.response.data);
                                        // }
                                        res.json(error);
                                    }
                                })();
                            })
                            .catch((error) => {
                                //console.error('User registration failed:', );
                                res.json(error);
                                // return res.send(
                                //     {
                                //         status: 'err',
                                //         data: '',
                                //         message: error.response.data
                                //     }
                                // )
                            });
            
                        //return {first_name:userFullNameArray[0], last_name:userFullNameArray[1], user_id: newuserID, status: 0};
                        }catch(error){
                            res.json(error);
                            //console.error('Error during user_meta_insert_query:', error);
                        }
                    }
                }catch(error){
                    res.json(error);
                    //console.error('Error during user_insert_query:', error);
                }

            }else{
                if(UserResponse.register_from=='web'){
                    return res.redirect('/?error='+UserResponse.register_from);
                }else{
                    //login code gose here
                    const userFirstName = UserResponse.first_name;
                    const userLastName = UserResponse.last_name;
                    const userEmail = UserResponse.email;
                    const userPicture = UserResponse.profile_pic;
                    const external_id = UserResponse.external_registration_id;

                    //----User Login to Node and WP---------//
                    const userAgent = req.headers['user-agent'];
                    const agent = useragent.parse(userAgent);
                    db.query('SELECT * FROM users WHERE email = ?', [userEmail], async (err, results) => {
                        if (err) {
                            // return res.send(
                            //     {
                            //         status: 'err',
                            //         data: '',
                            //         message: 'An error occurred while processing your request' + err
                            //     }
                            // )
                            res.json(err);
                        } else {
                            if (results.length > 0) {
                                const user = results[0];
                                //console.log(user);
                
                                //check Customer Login
                                if (user.user_type_id == 2 && user.user_status == 1) {
                                    const query = `
                                                SELECT user_meta.*, c.name as country_name, s.name as state_name, ccr.company_id as claimed_comp_id
                                                FROM user_customer_meta user_meta
                                                LEFT JOIN countries c ON user_meta.country = c.id
                                                LEFT JOIN states s ON user_meta.state = s.id
                                                LEFT JOIN company_claim_request ccr ON user_meta.user_id = ccr.claimed_by
                                                WHERE user_id = ?
                                                `;
                                    db.query(query, [user.user_id], async (err, results) => {
                                        let userData = {};
                                        if (results.length > 0) {
                                            const user_meta = results[0];
                                            //console.log(user_meta,'aaaaaaaa');
                                            // Set a cookie
                                            const dateString = user_meta.date_of_birth;
                                            const date_of_birth_date = new Date(dateString);
                                            const formattedDate = date_of_birth_date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                
                                            let userData = {
                                                user_id: user.user_id,
                                                first_name: user.first_name,
                                                last_name: user.last_name,
                                                email: user.email,
                                                phone: user.phone,
                                                user_type_id: user.user_type_id,
                                                address: user_meta.address,
                                                country: user_meta.country,
                                                country_name: user_meta.country_name,
                                                state: user_meta.state,
                                                state_name: user_meta.state_name,
                                                city: user_meta.city,
                                                zip: user_meta.zip,
                                                review_count: user_meta.review_count,
                                                date_of_birth: formattedDate,
                                                occupation: user_meta.occupation,
                                                gender: user_meta.gender,
                                                profile_pic: user_meta.profile_pic,
                                                claimed_comp_id: user_meta.claimed_comp_id
                                            };
                                            const encodedUserData = JSON.stringify(userData);
                                            res.cookie('user', encodedUserData);
                                            console.log(encodedUserData, 'login user data');
                                        } else {
                                            // Set a cookie
                                            let userData = {
                                                user_id: user.user_id,
                                                first_name: user.first_name,
                                                last_name: user.last_name,
                                                email: user.email,
                                                phone: user.phone,
                                                user_type_id: user.user_type_id,
                                                claimed_comp_id: ''
                                            };
                                            const encodedUserData = JSON.stringify(userData);
                                            res.cookie('user', encodedUserData);
                                        }
                
                                        (async () => {
                                            //---- Login to Wordpress Blog-----//
                                            //let wp_user_data;
                                            try {
                                                const userLoginData = {
                                                    email: userEmail,
                                                    password: userEmail,
                                                };
                
                                                const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
                                                const wp_user_data = response.data.data;
                
                                                //-- check last Login Info-----//
                                                const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
                                                db.query(device_query, [user.user_id], async (err, device_query_results) => {
                                                    const currentDate = new Date();
                                                    const year = currentDate.getFullYear();
                                                    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                                    const day = String(currentDate.getDate()).padStart(2, '0');
                                                    const hours = String(currentDate.getHours()).padStart(2, '0');
                                                    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
                                                    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
                                                    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                
                                                    if (device_query_results.length > 0) {
                                                        // User exist update info
                                                        const device_update_query = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
                                                        const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, user.user_id];
                                                        db.query(device_update_query, values, (err, device_update_query_results) => {
                                                            // return res.send(
                                                            //     {
                                                            //         status: 'ok',
                                                            //         data: userData,
                                                            //         wp_user: wp_user_data,
                                                            //         currentUrlPath: '/',
                                                            //         message: 'Login Successful'
                                                            //     }
                                                            // )
                                                            if(wp_user_data){
                                                                res.redirect(process.env.BLOG_URL+"?login_check="+wp_user_data+"&currentUrlPath=");
                                                            }
                                                        })
                                                    } else {
                                                        // User doesnot exist Insert New Row.
                
                                                        const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                                        const values = [user.user_id, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];
                
                                                        db.query(device_insert_query, values, (err, device_insert_query_results) => {
                                                            // return res.send(
                                                            //     {
                                                            //         status: 'ok',
                                                            //         data: userData,
                                                            //         wp_user: wp_user_data,
                                                            //         currentUrlPath: '/',
                                                            //         message: 'Login Successful'
                                                            //     }
                                                            // )
                                                            if(wp_user_data){
                                                                res.redirect(process.env.BLOG_URL+"?login_check="+wp_user_data+"&currentUrlPath=");
                                                            }
                                                        })
                
                                                    }
                                                })
                                            } catch (error) {
                                                console.error('User login failed. Error:', error);
                                                if (error.response && error.response.data) {
                                                    console.log('Error response data:', error.response.data);
                                                }
                                            }
                                        })();
                                    })
                                } else {
                                    let err_msg = '';
                                    if (user.user_status == 0) {
                                        err_msg = 'your account is inactive, please contact with administrator.';
                                    } else {
                                        err_msg = 'Do you want to login as administrator, then please go to proper route';
                                    }
                                    res.json(
                                        {
                                            status: 'err',
                                            data: '',
                                            message: err_msg
                                        }
                                    )
                                }
                            } else {
                                // return res.send(
                                //     {
                                //         status: 'err',
                                //         data: '',
                                //         message: 'Invalid Email'
                                //     }
                                // )
                                res.json(
                                    {
                                        status: 'err',
                                        data: '',
                                        message: 'Invalid Email'
                                    }
                                );
                            }
                        }
                    }) 
                }               

            }            
        } catch (error) {
            console.error('Error saving user data:', error);
            return res.redirect('/error');
        }
});

// Define Routes
app.use('/authentication', require('./routes/authentication'));
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));


app.listen(5000);
