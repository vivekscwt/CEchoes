const util = require('util');
const express = require('express');
const db = require('../config');

const mdlconfig = require('../config-module');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const useragent = require('useragent');
const requestIp = require('request-ip');
const fs = require('fs');
const ExcelJS = require('exceljs');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const bodyParser = require('body-parser');
const querystring = require('querystring');
const app = express();
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
var cron = require('node-cron');
const base64url = require('base64url');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const query = util.promisify(db.query).bind(db);
const queryAsync = util.promisify(db.query).bind(db);
const mysql = require('mysql2/promise');
const dbConfig = {
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
};
const secretKey = 'grahak-secret-key';

const comFunction = require('../common_function');
const comFunction2 = require('../common_function2');
const axios = require('axios');
const { log } = require('console');

const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: process.env.DESIRED_TIMEZONE,
    hour12: true, // Set to true or false based on your preference
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
});


//-- Register Function--//
exports.register = (req, res) => {
    //console.log(req.body);

    const { first_name, last_name, email, phone, password, confirm_password, toc } = req.body;

    db.query('SELECT email FROM users WHERE email = ? OR phone = ?', [email, phone], async (err, results) => {
        if (err) {
            // return res.render('sign-up', {
            //     message: 'An error occurred while processing your request' + err
            // })
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        }

        if (results.length > 0) {
            // return res.render('sign-up', {
            //     message: 'Email ID already exist'
            // })
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'Email ID or Phone number already exist'
                }
            )
        }

        let hasPassword = await bcrypt.hash(password, 8);
        //console.log(hasPassword);
        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        db.query('INSERT INTO users SET ?', { first_name: first_name, last_name: last_name, email: email, phone: phone, password: hasPassword, user_registered: formattedDate, user_status: 1, user_type_id: 2 }, (err, results) => {
            if (err) {
                // return res.render('sign-up', {
                //     message: 'An error occurred while processing your request' + err
                // })

                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request' + err
                    }
                )
            } else {
                //console.log(results,'User Table');
                //-- Insert User data to meta table--------//
                db.query('INSERT INTO user_customer_meta SET ?', { user_id: results.insertId, address: '', country: '', state: '', city: '', zip: '', review_count: 0, date_of_birth: '', occupation: '', gender: '', profile_pic: '' }, (err, results) => {

                    return res.send(
                        {
                            status: 'ok',
                            data: results,
                            message: 'User registered'
                        }
                    )
                })
            }
        })
    })
}

//-- Frontend User Register Function--//
exports.frontendUserRegister = async (req, res) => {
    console.log(req.body);

    const { first_name, last_name, email, register_password, register_confirm_password, signup_otp } = req.body;

    // Validation: Check if passwords match
    if (register_password !== register_confirm_password) {
        return res.status(400).json({ status: 'err', message: 'Passwords does not match.' });
    }

    try {
        // Check if the email already exists in the "users" table
        const emailExists = await new Promise((resolve, reject) => {
            db.query('SELECT email, register_from FROM users WHERE email = ?', [email], (err, results) => {
                if (err) reject(err);

                if (results.length > 0) {
                    var register_from = results[0].register_from;
                    if (register_from == 'web') {
                        var message = 'Email ID already exists, Please login with your email-ID and password';
                    } else {
                        if (register_from == 'gmail') {
                            register_from = 'google';
                        }
                        var message = 'Email ID already exists, login with ' + register_from;
                    }
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: message
                        }
                    )
                }

                resolve(results.length > 0);
            });
        });

        // Check if the otp exists in the "signup_otp_veryfy" table
        const verifyOTP = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM signup_otp_veryfy WHERE email = ? AND otp = ? ', [email, signup_otp], (OTPerr, OTPresults) => {
                if (OTPerr) reject(OTPerr);

                if (OTPresults.length > 0) {

                    const currentTime = new Date();
                    if (currentTime < new Date(OTPresults[0].expire_at)) {
                        // OTP is valid
                        console.log('OTP is valid');
                        //resolve(true);
                    } else {
                        // OTP has expired
                        console.log('OTP has expired');
                        return res.send({
                            status: 'err',
                            data: '',
                            message: 'OTP has expired'
                        });
                    }

                } else {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'OTP is not valid'
                        }
                    )
                }

                resolve(OTPresults.length > 0);
            });
        });

        // Hash the password asynchronously
        const hashedPassword = await bcrypt.hash(register_password, 8);
        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const userInsertQuery = 'INSERT INTO users (first_name, last_name, email, password, register_from, user_registered, user_status, user_type_id, alise_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(userInsertQuery, [first_name, last_name, email, hashedPassword, 'web', formattedDate, 1, 2, first_name + last_name], async (err, userResults) => {
            if (err) {
                console.error('Error inserting user into "users" table:', err);
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request' + err
                    }
                )
            }


            var mailOptions = {
                from: process.env.MAIL_USER,
                //to: 'pranab@scwebtech.com',
                to: email,
                subject: 'Welcome e-mail',
                html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                <style>
                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                }
                </style>
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
                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome</h1>
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
                                                <strong>Hello ${first_name},</strong>
                                                <p style="font-size:15px; line-height:20px">Warm greetings from the CEchoes Technology team! You have joined a community dedicated to empowering all Customers and ensuring their voices are heard <b>LOUD </b> and <b>CLEAR</b>.</p>
                                                <p style="font-size:15px; line-height:20px"> Keep sharing your Customer experiences (positive or negative), read about others' experience, post your queries on Products/Services, participate in Surveys, Lodge Complaints and get to know Customer-centric information.</p>
                                                <p style="font-size:15px; line-height:20px">Share this platform with all your friends and family. Together, we can make Organisations Listen and improve because  <b>#CustomersHave Power</b>.</p><p style="font-size:15px; line-height:20px">Let's usher in this Customer Revolution coz <b> #CustomerRights Matter</b>.</p><p style="font-size:15px; line-height:20px">Welcome Onboard!</p><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
                                            </td>
                                          </tr>
                                        </table>
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
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong'
                    });
                } else {
                    console.log('Mail Send: ', info.response);
                    return res.send({
                        status: 'ok',
                        message: ''
                    });

                }
            })
            // Insert the user into the "user_customer_meta" table
            const userMetaInsertQuery = 'INSERT INTO user_customer_meta (user_id, review_count) VALUES (?, ?)';
            db.query(userMetaInsertQuery, [userResults.insertId, 0], (err, metaResults) => {
                if (err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request' + err
                        }
                    )
                }

                const userRegistrationData = {
                    username: email,
                    email: email,
                    password: register_password,
                    first_name: first_name,
                    last_name: last_name,
                };
                axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData)
                    .then((response) => {
                        //console.log('User registration successful. User ID:', response.data.user_id);

                        //-------User Auto Login --------------//
                        const userAgent = req.headers['user-agent'];
                        const agent = useragent.parse(userAgent);

                        // Set a cookie
                        const userData = {
                            user_id: userResults.insertId,
                            first_name: first_name,
                            last_name: last_name,
                            email: email,
                            user_type_id: 2
                        };
                        const encodedUserData = JSON.stringify(userData);
                        res.cookie('user', encodedUserData);

                        (async () => {
                            //---- Login to Wordpress Blog-----//
                            //let wp_user_data;
                            try {
                                const userLoginData = {
                                    email: email,
                                    password: register_password,
                                };
                                const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
                                const wp_user_data = response.data.data;



                                //-- check last Login Info-----//
                                const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
                                db.query(device_query, [userResults.insertId], async (err, device_query_results) => {
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
                                        const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, userResults.insertId];
                                        db.query(device_update_query, values, (err, device_update_query_results) => {

                                            const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
                                            db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
                                                if (OTPdelErr) {
                                                    console.log(OTPdelErr);
                                                    return res.send({
                                                        status: 'not ok',
                                                        message: 'Something went wrong'
                                                    });
                                                } else {
                                                    console.log('otp deleted');
                                                    return res.send(
                                                        {
                                                            status: 'ok',
                                                            data: userData,
                                                            wp_user: wp_user_data,
                                                            currentUrlPath: req.body.currentUrlPath,
                                                            message: 'Registration successful you are automatically login to your dashboard'
                                                        }
                                                    )
                                                }

                                            })


                                        })
                                    } else {
                                        // User doesnot exist Insert New Row.

                                        const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                        const values = [userResults.insertId, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];

                                        db.query(device_insert_query, values, (err, device_insert_query_results) => {
                                            const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
                                            db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
                                                if (OTPdelErr) {
                                                    console.log(OTPdelErr);
                                                    return res.send({
                                                        status: 'not ok',
                                                        message: 'Something went wrong'
                                                    });
                                                } else {
                                                    console.log('otp deleted')
                                                    return res.send(
                                                        {
                                                            status: 'ok',
                                                            data: userData,
                                                            wp_user: wp_user_data,
                                                            currentUrlPath: req.body.currentUrlPath,
                                                            message: 'Registration successful you are automatically login to your dashboard'
                                                        }
                                                    )
                                                }

                                            })

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
                    .catch((error) => {
                        //console.error('User registration failed:', );
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: error.response.data
                            }
                        )
                    });
            })
        })
    }
    catch (error) {
        console.error('Error during user registration:', error);
        return res.status(500).json({ status: 'err', message: 'An error occurred while processing your request.' });
    }
}

//-- Frontend User Register Function--//
exports.frontendUserRegisterOTP = async (req, res) => {
    console.log('frontendUserRegisterOTP', req.body);
    //return false;
    const { first_name, last_name, email, register_password, register_confirm_password } = req.body;


    const otp = Math.floor(1000 + Math.random() * 9000);

    // Validation: Check if passwords match
    if (register_password !== register_confirm_password) {
        return res.status(400).json({ status: 'err', message: 'Passwords does not match.' });
    }

    try {
        // Check if the email already exists in the "users" table
        const emailExists = await new Promise((resolve, reject) => {
            db.query('SELECT email, register_from FROM users WHERE email = ?', [email], (err, results) => {
                if (err) reject(err);

                if (results.length > 0) {
                    var register_from = results[0].register_from;
                    if (register_from == 'web') {
                        console.log("aaaa");
                        var message = 'Email ID already exists, Please login with your email-ID and password';
                    } else {
                        if (register_from == 'gmail') {
                            register_from = 'google';
                        }
                        var message = 'Email ID already exists, login with ' + register_from;
                    }
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: message
                        }
                    )
                }

                resolve(results.length > 0);
            });
        });

        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const expirationDate = new Date(currentDate.getTime() + 5 * 60 * 1000);

        const userInsertQuery = 'INSERT INTO signup_otp_veryfy ( email, otp,  created_at, expire_at) VALUES (?, ?, ?, ?)';
        db.query(userInsertQuery, [email, otp, currentDate, expirationDate], async (err, userResults) => {
            if (err) {
                console.error('Error inserting user into "users" table:', err);
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request' + err
                    }
                )
            }
            var mailOptions = {
                from: process.env.MAIL_USER,
                //to: 'pranab@scwebtech.com',
                to: email,
                subject: 'Your One Time Password (OTP)',
                html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                <style>
                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                }
                </style>
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
                               <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome</h1>
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
                                                <strong>Hello ${first_name},</strong>
                                                <p style="font-size:15px; line-height:20px">Your One Time Password (OTP) is: ${otp}</p>
                                                <p style="font-size:15px; line-height:20px"> Please use this OTP to complete your Registration on the Cechoes platform. Do not share this OTP with anyone for security reasons</p>
                                                <p style="font-size:15px; line-height:20px">This OTP is valid for the next 5 minutes.</p><br>
                                                <p style="font-size:15px; line-height:20px">Thank you,</p>
                                                <p style="font-size:15px; line-height:20px">CEchoesTechnology</p>
                                            </td>
                                          </tr>
                                        </table>
                                        <p style="font-size:15px; line-height:20px">Download the app from Google Playstore or visit  <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology.com </a></p>
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
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong'
                    });
                } else {
                    console.log('Mail Send: ', info.response);
                    return res.send({
                        status: 'ok',
                        message: 'An OTP has been sent to your email address. Please check your email and enter the OTP to validate your account. The OTP is valid for the next 5 minutes.'
                    });
                }
            })

        })
    }
    catch (error) {
        console.error('Error during user registration:', error);
        return res.status(500).json({ status: 'err', message: 'An error occurred while processing your request.' });
    }
}

//-- Frontend User Login Function--//
exports.frontendUserLogin = (req, res) => {
    //console.log(req.body);
    const userAgent = req.headers['user-agent'];
    const agent = useragent.parse(userAgent);

    //res.json(deviceInfo);

    const { email, password } = req.body;

    db.query(`SELECT * FROM users WHERE email = ?`, [email], async (err, results) => {
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
                const user = results[0];
                console.log("usersaas", user);
                // Compare the provided password with the stored hashed password
                bcrypt.compare(password, user.password, (err, result) => {
                    if (err) {
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: 'Error: ' + err
                            }
                        )
                    }
                    if (result) {
                        //check Customer Login
                        if (user.user_type_id == 2 && user.user_status == 1) {
                            const query = `
                                        SELECT user_meta.*, c.name as country_name, s.name as state_name, ccr.company_id as claimed_comp_id, company.slug
                                        FROM user_customer_meta user_meta
                                        LEFT JOIN countries c ON user_meta.country = c.id
                                        LEFT JOIN states s ON user_meta.state = s.id
                                        LEFT JOIN company_claim_request ccr ON user_meta.user_id = ccr.claimed_by
                                        LEFT JOIN company ON company.ID = ccr.company_id
                                        WHERE user_id = ?
                                        `;
                            db.query(query, [user.user_id], async (err, results) => {
                                let userData = {};
                                if (results.length > 0) {
                                    const user_meta = results[0];
                                    console.log(user_meta, 'aaaaaaaa');
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
                                        user_status: user.user_status,
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
                                        claimed_comp_id: user_meta.claimed_comp_id,
                                        claimed_comp_slug: user_meta.slug
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
                                        claimed_comp_id: '',
                                        claimed_comp_slug: ''
                                    };
                                    const encodedUserData = JSON.stringify(userData);
                                    res.cookie('user', encodedUserData);
                                }

                                (async () => {
                                    //---- Login to Wordpress Blog-----//
                                    //let wp_user_data;
                                    try {
                                        const userLoginData = {
                                            email: email,
                                            password: password,
                                        };
                                        // axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData)
                                        // .then((response) => {
                                        //     wp_user_data = response.data.data;
                                        //     console.log('User login successful. Response data:', response.data);
                                        // })
                                        // .catch((error) => {
                                        //     console.error('User login failed. Error:', error);
                                        //     if (error.response && error.response.data) {
                                        //         console.log('Error response data:', error.response.data);
                                        //     }
                                        // });
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
                                                    return res.send(
                                                        {
                                                            status: 'ok',
                                                            data: userData,
                                                            wp_user: wp_user_data,
                                                            currentUrlPath: req.body.currentUrlPath,
                                                            message: 'Login Successful'
                                                        }
                                                    )
                                                })
                                            } else {
                                                // User doesnot exist Insert New Row.

                                                const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                                const values = [user.user_id, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];

                                                db.query(device_insert_query, values, (err, device_insert_query_results) => {
                                                    return res.send(
                                                        {
                                                            status: 'ok',
                                                            data: userData,
                                                            wp_user: wp_user_data,
                                                            currentUrlPath: req.body.currentUrlPath,
                                                            message: 'Login Successful'
                                                        }
                                                    )
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
                            if (user.user_status == 0 || user.user_status == 3) {
                                err_msg = 'your account is inactive, please contact with administrator.';
                            } else {
                                err_msg = 'Do you want to login as administrator, then please go to proper route';
                            }
                            return res.send(
                                {
                                    status: 'err',
                                    data: '',
                                    message: err_msg
                                }
                            )
                        }
                    } else {
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: 'Invalid password'
                            }
                        )
                    }
                });
            } else {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'Invalid Email'
                    }
                )
            }
        }
    })
}


//-- Login Function --//
exports.login = (req, res) => {
    //console.log(req.body);
    const userAgent = req.headers['user-agent'];
    const agent = useragent.parse(userAgent);

    //res.json(deviceInfo);

    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
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
                const user = results[0];
                //console.log(user);
                // Compare the provided password with the stored hashed password
                bcrypt.compare(password, user.password, (err, result) => {
                    if (err) {
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: 'Error: ' + err
                            }
                        )
                    }
                    if (result) {
                        //check Administrative Login
                        if ((user.user_type_id == 1 || user.user_type_id == 3) && user.user_status == 1) {
                            const query = `
                                        SELECT user_meta.*, c.name as country_name, s.name as state_name, ccr.company_id as claimed_comp_id, company.slug
                                        FROM user_customer_meta user_meta
                                        LEFT JOIN countries c ON user_meta.country = c.id
                                        LEFT JOIN states s ON user_meta.state = s.id
                                        LEFT JOIN company_claim_request ccr ON user_meta.user_id = ccr.claimed_by
                                        LEFT JOIN company ON company.ID = ccr.company_id
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
                                        user_status: user.user_status,
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
                                        claimed_comp_id: user_meta.claimed_comp_id,
                                        claimed_comp_slug: user_meta.slug
                                    };
                                    const encodedUserData = JSON.stringify(userData);
                                    res.cookie('user', encodedUserData);
                                    //console.log(encodedUserData, 'login user data');
                                } else {
                                    // Set a cookie
                                    let userData = {
                                        user_id: user.user_id,
                                        first_name: user.first_name,
                                        last_name: user.last_name,
                                        email: user.email,
                                        phone: user.phone,
                                        user_type_id: user.user_type_id,
                                        claimed_comp_id: '',
                                        claimed_comp_slug: ''
                                    };
                                    const encodedUserData = JSON.stringify(userData);
                                    res.cookie('user', encodedUserData);
                                }
                                //console.log(userData, 'User data');
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
                                            return res.send(
                                                {
                                                    status: 'ok',
                                                    data: userData,
                                                    message: 'Login Successfull'
                                                }
                                            )
                                        })
                                    } else {
                                        // User doesnot exist Insert New Row.

                                        const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                        const values = [user.user_id, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];

                                        db.query(device_insert_query, values, (err, device_insert_query_results) => {
                                            return res.send(
                                                {
                                                    status: 'ok',
                                                    data: userData,
                                                    message: 'Login Successfull'
                                                }
                                            )
                                        })

                                    }
                                })
                            })
                        } else {
                            let err_msg = '';
                            if (user.user_status == 0) {
                                err_msg = 'your account is inactive, please contact with administrator.';
                            } else {
                                err_msg = 'You do not have permission to login as administrator.';
                            }
                            return res.send(
                                {
                                    status: 'err',
                                    data: '',
                                    message: err_msg
                                }
                            )
                        }
                    } else {
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: 'Invalid password'
                            }
                        )
                    }
                });
            } else {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'Invalid Email'
                    }
                )
            }
        }
    })
}


//--- Create New User ----//
exports.createUser = (req, res) => {
    db.query('SELECT email FROM users WHERE email = ? OR phone = ?', [req.body.email, req.body.phone], async (err, results) => {
        if (err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        }

        if (results.length > 0) {

            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'Email ID or Phone number already exist'
                }
            )
        }

        let hasPassword = await bcrypt.hash(req.body.password, 8);
        //console.log(hasPassword);
        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        db.query('INSERT INTO users SET ?',
            {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                email: req.body.email,
                phone: req.body.phone,
                password: hasPassword,
                user_registered: formattedDate,
                user_status: 1,
                user_type_id: req.body.user_type_id
            }, (err, results) => {
                if (err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request' + err
                        }
                    )
                } else {
                    //console.log(results,'User Table');
                    //-- Insert User data to meta table--------//
                    var insert_values = [];
                    if (req.file) {
                        insert_values = [results.insertId, req.body.address, req.body.country, req.body.state, req.body.city, req.body.zip, 0, req.body.date_of_birth, req.body.occupation, req.body.gender, req.file.filename, req.body.alternate_phone, req.body.marital_status, req.body.about];
                    } else {
                        insert_values = [results.insertId, req.body.address, req.body.country, req.body.state, req.body.city, req.body.zip, 0, req.body.date_of_birth, req.body.occupation, req.body.gender, '', req.body.alternate_phone, req.body.marital_status, req.body.about];
                    }

                    const insertQuery = 'INSERT INTO user_customer_meta (user_id, address, country, state, city, zip, review_count, date_of_birth, occupation, gender, profile_pic, alternate_phone, marital_status, about) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    db.query(insertQuery, insert_values, (error, results, fields) => {
                        if (err) {
                            console.log(err);
                        } else {
                            // var mailOptions = {
                            //     from: 'vivek@scwebtech.com',
                            //     to: req.body.email,
                            //     subject: 'Test Message From CEchoes Technology',
                            //     text: 'Test Message bidy'
                            // }
                            // mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                            //     if (err) {
                            //         console.log(err);
                            //     } else {
                            //         console.log('Mail Send: ', info.response);
                            //     }
                            // })
                            return res.send(
                                {
                                    status: 'ok',
                                    data: results,
                                    message: 'New user created'
                                }
                            )
                        }
                    });
                }
            })
    })
}

//Create New Category
// exports.createCategory = async (req, res) => {
//     //console.log('category', req.body);
//     const { cat_name, cat_parent_id, country } = req.body;

//     const catSlug = await new Promise((resolve, reject) => {
//         comFunction2.generateUniqueSlugCategory(cat_name, (error, generatedSlug) => {
//             if (error) {
//                 console.log('Error:', error.message);
//                 reject(error);
//             } else {
//                 // console.log('Generated Company Slug:', generatedSlug);
//                 resolve(generatedSlug);
//             }
//         });
//     });
//     // const cat_sql = "SELECT category_name FROM category WHERE category_name = ?";
//     const cat_sql = "SELECT category.category_name FROM category LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id WHERE category.category_name = ? AND category_country_relation.country_id=?";
//     db.query(cat_sql, [cat_name, country], (cat_err, cat_result) => {
//         if (cat_err) throw cat_err;
//         if (cat_result.length > 0) {
//             return res.send(
//                 {
//                     status: 'Not ok',
//                     message: 'Category name already exists '
//                 }
//             )
//         } else {
//             if (req.file) {
//                 if (cat_parent_id == '') {
//                     const val = [cat_name, 0, req.file.filename, catSlug];
//                     const sql = 'INSERT INTO category (category_name, parent_id, category_img, category_slug ) VALUES (?, ?, ?, ?)';
//                     db.query(sql, val, async (err, result) => {
//                         if (err) {
//                             console.log(err)
//                         } else {
//                             for (var i = 0; i < country.length; i++) {
//                                 db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country[i]} )`, await function (err, country_val) {
//                                     if (err) throw err;

//                                 });
//                             }
//                             return res.send(
//                                 {
//                                     status: 'ok',
//                                     data: result,
//                                     message: 'New Category created'
//                                 }
//                             )
//                         }
//                     })
//                 } else {
//                     const val = [cat_name, cat_parent_id, req.file.filename, catSlug];
//                     const sql = 'INSERT INTO category (category_name, parent_id, category_img, category_slug ) VALUES (?, ?, ?, ?)';
//                     db.query(sql, val, async (err, result) => {
//                         if (err) {
//                             console.log(err)
//                         } else {
//                             for (var i = 0; i < country.length; i++) {
//                                 db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country[i]} )`, await function (err, country_val) {
//                                     if (err) throw err;

//                                 });
//                             }
//                             return res.send(
//                                 {
//                                     status: 'ok',
//                                     data: result,
//                                     message: 'New Category created'
//                                 }
//                             )
//                         }
//                     })
//                 }
//             } else {
//                 if (cat_parent_id == '') {
//                     const val = [cat_name, 0, 'NULL', catSlug];
//                     const sql = 'INSERT INTO category (category_name, parent_id, category_img, category_slug ) VALUES (?, ?, ?, ?)';
//                     db.query(sql, val, async (err, result) => {
//                         if (err) {
//                             console.log(err)
//                         } else {
//                             for (var i = 0; i < country.length; i++) {
//                                 db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country[i]} )`, await function (err, country_val) {
//                                     if (err) throw err;

//                                 });
//                             }
//                             return res.send(
//                                 {
//                                     status: 'ok',
//                                     data: result,
//                                     message: 'New Category created'
//                                 }
//                             )
//                         }
//                     })
//                 } else {
//                     const val = [cat_name, cat_parent_id, 'NULL', catSlug];
//                     const sql = 'INSERT INTO category (category_name, parent_id, category_img, category_slug ) VALUES (?, ?, ?, ?)';
//                     db.query(sql, val, async (err, result) => {
//                         if (err) {
//                             console.log(err)
//                         } else {
//                             for (var i = 0; i < country.length; i++) {
//                                 db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country[i]} )`, await function (err, country_val) {
//                                     if (err) throw err;

//                                 });
//                             }
//                             return res.send(
//                                 {
//                                     status: 'ok',
//                                     data: result,
//                                     message: 'New Category created'
//                                 }
//                             )
//                         }
//                     })
//                 }
//             }
//         }
//     })

// }
exports.createCategory = async (req, res) => {
    console.log('category', req.body);
    const { cat_name, cat_parent_id, country } = req.body;

    const catSlug = await new Promise((resolve, reject) => {
        comFunction2.generateUniqueSlugCategory(cat_name, (error, generatedSlug) => {
            if (error) {
                console.log('Error:', error.message);
                reject(error);
            } else {
                console.log('Generated Company Slug:', generatedSlug);
                resolve(generatedSlug);
            }
        });
    });
    // const cat_sql = "SELECT category_name FROM category WHERE category_name = ?";
    const cat_sql = "SELECT category.category_name FROM category LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id WHERE category.category_name = ? AND category_country_relation.country_id=?";
    db.query(cat_sql, [cat_name, country], (cat_err, cat_result) => {
        if (cat_err) throw cat_err;
        if (cat_result.length > 0) {
            return res.send(
                {
                    status: 'Not ok',
                    message: 'Category name already exists '
                }
            )
        } else {
            if (req.file) {
                if (cat_parent_id == '') {
                    const val = [cat_name, 0, req.file.filename, catSlug];
                    const sql = 'INSERT INTO category (category_name, parent_id, category_img, category_slug ) VALUES (?, ?, ?, ?)';
                    db.query(sql, val, async (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            // for (var i = 0; i < country.length; i++) {
                            //     db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country[i]} )`, await function (err, country_val) {
                            //         if (err) throw err;

                            //     });
                            // }
                            db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country} )`, await function (err, country_val) {
                                if (err) throw err;

                            });
                            return res.send(
                                {
                                    status: 'ok',
                                    data: result,
                                    message: 'New Category created'
                                }
                            )
                        }
                    })
                } else {
                    const val = [cat_name, cat_parent_id, req.file.filename, catSlug];
                    const sql = 'INSERT INTO category (category_name, parent_id, category_img, category_slug ) VALUES (?, ?, ?, ?)';
                    db.query(sql, val, async (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            // for (var i = 0; i < country.length; i++) {
                            //     db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country[i]} )`, await function (err, country_val) {
                            //         if (err) throw err;

                            //     });
                            // }
                            db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country} )`, await function (err, country_val) {
                                if (err) throw err;

                            });
                            return res.send(
                                {
                                    status: 'ok',
                                    data: result,
                                    message: 'New Category created'
                                }
                            )
                        }
                    })
                }
            } else {
                if (cat_parent_id == '') {
                    const val = [cat_name, 0, 'NULL', catSlug];
                    const sql = 'INSERT INTO category (category_name, parent_id, category_img, category_slug ) VALUES (?, ?, ?, ?)';
                    db.query(sql, val, async (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            // for (var i = 0; i < country.length; i++) {
                            //     db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country[i]} )`, await function (err, country_val) {
                            //         if (err) throw err;

                            //     });
                            // }
                            db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country} )`, await function (err, country_val) {
                                if (err) throw err;

                            });
                            return res.send(
                                {
                                    status: 'ok',
                                    data: result,
                                    message: 'New Category created'
                                }
                            )
                        }
                    })
                } else {
                    const val = [cat_name, cat_parent_id, 'NULL', catSlug];
                    const sql = 'INSERT INTO category (category_name, parent_id, category_img, category_slug ) VALUES (?, ?, ?, ?)';
                    db.query(sql, val, async (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            // for (var i = 0; i < country.length; i++) {
                            //     db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country[i]} )`, await function (err, country_val) {
                            //         if (err) throw err;

                            //     });
                            // }
                            db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${result.insertId}, ${country} )`, await function (err, country_val) {
                                if (err) throw err;

                            });
                            return res.send(
                                {
                                    status: 'ok',
                                    data: result,
                                    message: 'New Category created'
                                }
                            )
                        }
                    })
                }
            }
        }
    })

}

//Update Category
exports.updateCategory = (req, res) => {
    console.log('category', req.body, req.file);
    const { cat_id, cat_name, category_slug, cat_parent_id, country } = req.body;
    const check_arr = [cat_name, cat_id]
    const cat_sql = "SELECT category.category_name FROM category LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id WHERE category.category_name = ? AND category_country_relation.country_id = ?";
    db.query(cat_sql, check_arr, (cat_err, cat_result) => {
        if (cat_err) throw cat_err;
        if (cat_result.length > 0) {
            return res.send(
                {
                    status: 'Not ok',
                    message: 'Category name already exists '
                }
            )
        } else {
            if (req.file) {
                const file_query = `SELECT category_img FROM category WHERE ID = ${cat_id}`;
                db.query(file_query, async function (img_err, img_res) {
                    console.log(img_res);
                    if (img_res[0].category_img != 'NULL') {
                        const filename = img_res[0].category_img;
                        const filePath = `uploads/${filename}`;
                        console.log(filePath);

                        fs.unlink(filePath, await function () {
                            console.log('file deleted');
                        })
                    }
                })
                if (cat_parent_id == '') {
                    const val = [cat_name, category_slug, req.file.filename, cat_id];
                    const sql = `UPDATE category SET category_name = ?, category_slug  = ?, category_img = ? WHERE ID = ?`;
                    db.query(sql, val, async (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            const delete_query = `DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`;
                            db.query(`DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`, await function (del_err, del_res) {

                            });
                            for (var i = 0; i < country.length; i++) {
                                db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country[i]} )`, await function (err, country_val) {
                                    if (err) throw err;

                                });
                            }
                            return res.send(
                                {
                                    status: 'ok',
                                    data: result,
                                    message: 'Category updated'
                                }
                            )
                        }
                    })
                } else {
                    const val = [cat_name, category_slug, cat_parent_id, req.file.filename, cat_id];

                    const sql = `UPDATE category SET category_name = ?,category_slug  = ?, parent_id = ?, category_img = ? WHERE ID = ?`;
                    db.query(sql, val, async (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            const delete_query = `DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`;
                            db.query(`DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`, await function (del_err, del_res) {

                            });

                            for (var i = 0; i < country.length; i++) {
                                db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country[i]} )`, await function (err, country_val) {
                                    if (err) throw err;

                                });
                            }
                            return res.send(
                                {
                                    status: 'ok',
                                    data: result,
                                    message: 'Category updated'
                                }
                            )
                        }
                    })
                }

            } else {
                if (cat_parent_id == '') {
                    const val = [cat_name, category_slug, cat_id];

                    const sql = `UPDATE category SET category_name = ?, category_slug =?  WHERE ID = ?`;
                    db.query(sql, val, async (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            const delete_query = `DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`;
                            db.query(`DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`, await function (del_err, del_res) {

                            });
                            for (var i = 0; i < country.length; i++) {
                                db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country[i]} )`, await function (err, country_val) {
                                    if (err) throw err;

                                });
                            }
                            return res.send(
                                {
                                    status: 'ok',
                                    data: result,
                                    message: 'Category updated'
                                }
                            )
                        }
                    })
                } else {
                    const val = [cat_name, category_slug, cat_parent_id, cat_id];

                    const sql = `UPDATE category SET category_name = ?,category_slug = ?, parent_id = ?  WHERE ID = ?`;
                    db.query(sql, val, async (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            const delete_query = `DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`;
                            db.query(`DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`, await function (del_err, del_res) {

                            });
                            for (var i = 0; i < country.length; i++) {
                                db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country[i]} )`, await function (err, country_val) {
                                    if (err) throw err;

                                });
                            }
                            return res.send(
                                {
                                    status: 'ok',
                                    data: result,
                                    message: 'Category updated'
                                }
                            )
                        }
                    })
                }
            }
        }
    })
}

exports.getcatsbyCountry = async (req, res) => {
    try {
        const countryId = req.query.countryId;
        const getcategoryquery = `
            SELECT category.* 
            FROM category 
            LEFT JOIN category_country_relation 
            ON category.id = category_country_relation.cat_id 
            WHERE category_country_relation.country_id = ?
        `;
        const categories = await query(getcategoryquery, [countryId]);
        console.log("getcatsbyCountry", categories);

        if (!categories || categories.length === 0) {
            return res.json({
                status: 'ok',
                categories: [],
                message: 'No categories found for the selected country.'
            });
        }

        return res.json({
            status: 'ok',
            categories: categories,
            message: 'Categories fetched successfully.'
        });

    } catch (error) {
        console.error('Error:', error);
        return res.json({
            status: 'err',
            message: error.message
        });
    }
};


// exports.updateCategory = (req, res) => {
//     console.log('category', req.body, req.file);
//     const { cat_id, cat_name, category_slug, cat_parent_id, country } = req.body;
//     // const check_arr = [cat_name, cat_id]
//     //const cat_sql = "SELECT category_name FROM category WHERE category_name = ? AND ID != ?";

//     const cat_sql = "SELECT category.category_name FROM category LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id WHERE category.category_name = ? AND category_country_relation.country_id = ?";
//     db.query(cat_sql, [cat_name,country], (cat_err, cat_result) => {
//         if (cat_err) throw cat_err;
//         if (cat_result.length > 0) {
//             return res.send(
//                 {
//                     status: 'Not ok',
//                     message: 'Category name already exists '
//                 }
//             )
//         } else {
//             if (req.file) {
//                 const file_query = `SELECT category_img FROM category WHERE ID = ${cat_id}`;
//                 db.query(file_query, async function (img_err, img_res) {
//                     console.log(img_res);
//                     if (img_res[0].category_img != 'NULL') {
//                         const filename = img_res[0].category_img;
//                         const filePath = `uploads/${filename}`;
//                         console.log(filePath);

//                         fs.unlink(filePath, await function () {
//                             console.log('file deleted');
//                         })
//                     }
//                 })
//                 if (cat_parent_id == '') {
//                     const val = [cat_name, category_slug, req.file.filename, cat_id];
//                     const sql = `UPDATE category SET category_name = ?, category_slug  = ?, category_img = ? WHERE ID = ?`;
//                     db.query(sql, val, async (err, result) => {
//                         if (err) {
//                             console.log(err)
//                         } else {
//                             const delete_query = `DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`;
//                             db.query(`DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`, await function (del_err, del_res) {

//                             });
//                             // for (var i = 0; i < country.length; i++) {
//                             //     db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country[i]} )`, await function (err, country_val) {
//                             //         if (err) throw err;

//                             //     });
//                             // }
//                             db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country} )`, await function (err, country_val) {
//                                 if (err) throw err;

//                             });
//                             return res.send(
//                                 {
//                                     status: 'ok',
//                                     data: result,
//                                     message: 'Category updated'
//                                 }
//                             )
//                         }
//                     })
//                 } else {
//                     const val = [cat_name, category_slug, cat_parent_id, req.file.filename, cat_id];

//                     const sql = `UPDATE category SET category_name = ?,category_slug  = ?, parent_id = ?, category_img = ? WHERE ID = ?`;
//                     db.query(sql, val, async (err, result) => {
//                         if (err) {
//                             console.log(err)
//                         } else {
//                             const delete_query = `DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`;
//                             db.query(`DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`, await function (del_err, del_res) {

//                             });

//                             // for (var i = 0; i < country.length; i++) {
//                             //     db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country[i]} )`, await function (err, country_val) {
//                             //         if (err) throw err;

//                             //     });
//                             // }
//                             db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country} )`, await function (err, country_val) {
//                                 if (err) throw err;

//                             });
//                             return res.send(
//                                 {
//                                     status: 'ok',
//                                     data: result,
//                                     message: 'Category updated'
//                                 }
//                             )
//                         }
//                     })
//                 }

//             } else {
//                 if (cat_parent_id == '') {
//                     const val = [cat_name, category_slug, cat_id];

//                     const sql = `UPDATE category SET category_name = ?, category_slug =?  WHERE ID = ?`;
//                     db.query(sql, val, async (err, result) => {
//                         if (err) {
//                             console.log(err)
//                         } else {
//                             const delete_query = `DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`;
//                             db.query(`DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`, await function (del_err, del_res) {

//                             });
//                             // for (var i = 0; i < country.length; i++) {
//                             //     db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country[i]} )`, await function (err, country_val) {
//                             //         if (err) throw err;

//                             //     });
//                             // }
//                             db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country} )`, await function (err, country_val) {
//                                 if (err) throw err;

//                             });
//                             return res.send(
//                                 {
//                                     status: 'ok',
//                                     data: result,
//                                     message: 'Category updated'
//                                 }
//                             )
//                         }
//                     })
//                 } else {
//                     const val = [cat_name, category_slug, cat_parent_id, cat_id];

//                     const sql = `UPDATE category SET category_name = ?,category_slug = ?, parent_id = ?  WHERE ID = ?`;
//                     db.query(sql, val, async (err, result) => {
//                         if (err) {
//                             console.log(err)
//                         } else {
//                             const delete_query = `DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`;
//                             db.query(`DELETE FROM category_country_relation WHERE cat_id = ${cat_id}`, await function (del_err, del_res) {

//                             });
//                             // for (var i = 0; i < country.length; i++) {
//                             //     db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country[i]} )`, await function (err, country_val) {
//                             //         if (err) throw err;

//                             //     });
//                             // }
//                             db.query(`INSERT INTO category_country_relation (cat_id , country_id) VALUES (${cat_id}, ${country} )`, await function (err, country_val) {
//                                 if (err) throw err;

//                             });
//                             return res.send(
//                                 {
//                                     status: 'ok',
//                                     data: result,
//                                     message: 'Category updated'
//                                 }
//                             )
//                         }
//                     })
//                 }
//             }
//         }
//     })
// }

//-- User Profile Edit --//
exports.editUserData = (req, res) => {
    console.log(req.body);
    //return false
    const userId = req.body.user_id;

    // Update the user's data
    const updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, phone = ?, user_type_id = ? WHERE user_id = ?';
    db.query(updateQuery, [req.body.first_name, req.body.last_name, req.body.phone, req.body.user_type_id, userId], (updateError, updateResults) => {

        if (updateError) {
            //console.log(updateError);
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + updateError
                }
            )
        } else {
            // Update the user's meta data

            if (req.file) {
                // Unlink (delete) the previous file
                const unlinkprofilePicture = "uploads/" + req.body.previous_profile_pic;
                fs.unlink(unlinkprofilePicture, (err) => {
                    if (err) {
                        //console.error('Error deleting file:', err);
                    } else {
                        //console.log('Previous file deleted');
                    }
                });
            }
            const userCustomerMetaUpdateData = {
                address: req.body.address || null,
                country: req.body.country || null,
                state: req.body.state || null,
                city: req.body.city || null,
                zip: req.body.zip || null,
                date_of_birth: req.body.date_of_birth || null,
                occupation: req.body.occupation || null,
                gender: req.body.gender || null,
                profile_pic: req.file ? req.file.filename : req.body.previous_profile_pic,
                alternate_phone: req.body.alternate_phone || null,
                marital_status: req.body.marital_status || null,
                about: req.body.about || null,
            };
            //const updateQueryMeta = 'UPDATE user_customer_meta SET address = ?, country = ?, state = ?, city = ?, zip = ?, date_of_birth = ?, occupation = ?, gender = ?, profile_pic = ?, alternate_phone = ?, about = ? WHERE user_id = ?';
            const updateQueryMeta = `UPDATE user_customer_meta SET ? WHERE user_id = ?`;

            db.query(updateQueryMeta, [userCustomerMetaUpdateData, userId], (updateError, updateResults) => {
                if (updateError) {
                    return res.send(
                        {
                            status: 'err',
                            data: userId,
                            message: 'An error occurred while processing your request' + updateError
                        }
                    )
                } else {
                    return res.send(
                        {
                            status: 'ok',
                            data: userId,
                            message: 'Update Successfull'
                        }
                    )
                }
            });
        }



    });
}

//--- Delete User ----//
exports.deleteUser = (req, res) => {
    console.log(req.body);

    const userId = req.body.userid;
    const userEmail = req.body.userEmail;
    const deleteQueries = [
        `DELETE FROM user_code_verify WHERE user_id = '${userId}'`,
        `DELETE FROM users WHERE user_id = '${userId}'`,
        `DELETE FROM user_customer_meta WHERE user_id = ${userId}`,

        `DELETE bg_users, bg_usermeta
        FROM bg_users
        LEFT JOIN bg_usermeta ON bg_users.ID = bg_usermeta.user_id
        WHERE bg_users.user_login = '${userEmail}';
        `,

        `DELETE FROM user_device_info WHERE user_id = '${userId}'`,
        `DELETE discussions, discussions_user_response
        FROM discussions
        LEFT JOIN discussions_user_response ON discussions.id = discussions_user_response.discussion_id
        WHERE discussions.user_id = '${userId}';
        `,
        `DELETE complaint, complaint_rating,complaint_query_response
        FROM complaint
        LEFT JOIN complaint_rating ON complaint.id = complaint_rating.complaint_id
        LEFT JOIN complaint_query_response ON complaint.id = complaint_query_response.complaint_id                               
        WHERE complaint.user_id = '${userId}';
        `,
        `DELETE FROM poll_voting WHERE user_id = '${userId}'`,
        `DELETE reviews,review_reply,review_voting
        FROM reviews
        LEFT JOIN review_reply ON reviews.id = review_reply.review_id 
        LEFT JOIN review_voting ON reviews.id = review_voting.review_id                           
        WHERE reviews.customer_id = '${userId}';
        `,
        `DELETE FROM survey_customer_answers WHERE customer_id = '${userId}'`,
        `DELETE FROM company_claim_request WHERE claimed_by = '${userId}'`,
    ];

    const executeDeleteQuery = (index) => {
        if (index < deleteQueries.length) {
            const query = deleteQueries[index];
            db.query(query, (err, result) => {
                if (err) {
                    console.error('Query error:', err);

                    return res.send({
                        status: 'error',
                        message: `Failed to execute query: ${query}`,
                    });
                }

                // Continue with the next query
                executeDeleteQuery(index + 1);
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'User permanently deleted.',
            });
        }
    };

    executeDeleteQuery(0);
};


//--- Trash User ----//
exports.trashUser = (req, res) => {
    console.log(req.body.userid);
    sql = `UPDATE users SET user_status = '0' WHERE user_id = ?`;
    const data = [req.body.userid];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: 'Something went wrong' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'User successfully move to trash'
            });
        }
    })
}

//--- Restore User ----//
exports.restoreUser = (req, res) => {
    console.log(req.body.userid);
    sql = `UPDATE users SET user_status = '1' WHERE user_id = ?`;
    const data = [req.body.userid];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: 'Something went wrong' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'User successfully restore .'
            });
        }
    })
}

//--- Create New Company ----//
// exports.createCompany = async (req, res) => {
//     //console.log(req.body);
//     const encodedUserData = req.cookies.user;
//     const currentUserData = JSON.parse(encodedUserData);

//     const currentDate = new Date();

//     const year = currentDate.getFullYear();
//     const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//     const day = String(currentDate.getDate()).padStart(2, '0');
//     const hours = String(currentDate.getHours()).padStart(2, '0');
//     const minutes = String(currentDate.getMinutes()).padStart(2, '0');
//     const seconds = String(currentDate.getSeconds()).padStart(2, '0');

//     const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

//     // const [companySlug] = await Promise.all( [
//     //     comFunction2.generateUniqueSlug(req.body.company_name)
//     // ]);
//     comFunction2.generateUniqueSlug(req.body.company_name, (error, companySlug) => {
//         if (error) {
//             console.log('Err: ', error.message);
//         } else {
//             console.log('companySlug', companySlug);
//             var insert_values = [];
//             if (req.file) {
//                 insert_values = [currentUserData.user_id, req.body.company_name, req.body.heading, req.file.filename, req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, req.body.status, req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.main_address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug];
//             } else {
//                 insert_values = [currentUserData.user_id, req.body.company_name, req.body.heading, '', req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, req.body.status, req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.main_address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug];
//             }

//             const insertQuery = 'INSERT INTO company (user_created_by, company_name, heading, logo, about_company, comp_phone, comp_email, comp_registration_id, status, trending, created_date, updated_date, tollfree_number, main_address, main_address_pin_code, address_map_url, main_address_country, main_address_state, main_address_city, verified, paid_status, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//             db.query(insertQuery, insert_values, (err, results, fields) => {
//                 if (err) {
//                     return res.send(
//                         {
//                             status: 'err',
//                             data: '',
//                             message: 'An error occurred while processing your request' + err
//                         }
//                     )
//                 } else {
//                     const companyId = results.insertId;
//                     const categoryArray = Array.isArray(req.body.category) ? req.body.category : [req.body.category];

//                     // Filter out undefined values from categoryArray
//                     const validCategoryArray = categoryArray.filter(categoryID => categoryID !== undefined);

//                     console.log('categoryArray:', categoryArray);
//                     if (validCategoryArray.length > 0) {
//                         const companyCategoryData = validCategoryArray.map((categoryID) => [companyId, categoryID]);
//                         db.query('INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?', [companyCategoryData], function (error, results) {
//                             if (error) {
//                                 console.log(error);
//                                 res.status(400).json({
//                                     status: 'err',
//                                     message: 'Error while creating company category'
//                                 });
//                             }
//                             else {
//                                 return res.send(
//                                     {
//                                         status: 'ok',
//                                         data: companyId,
//                                         message: 'New company created'
//                                     }
//                                 )
//                             }
//                         });
//                     } else {
//                         return res.send(
//                             {
//                                 status: 'ok',
//                                 data: companyId,
//                                 message: 'New company created without any category.'
//                             }
//                         )
//                     }
//                 }
//             })

//         }
//     });




// }
exports.getExistCompany = async (req, res) => {
    try {
        const { company_name, main_address_country, parent_id } = req.query;
        if (parent_id == 0) {
            const companyquery = `SELECT * FROM company WHERE company_name = ? AND main_address_country =? `;
            const companyvalue = await query(companyquery, [company_name, main_address_country]);

            console.log("companyvalue", companyvalue);

            if (companyvalue.length > 0) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'Organization name already exist.'
                    }
                )
            }
        }
    } catch (error) {
        console.error('Error:', error);
        return res.send({
            status: 'err',
            //data: companyId,
            message: error.message
        });
    }
}



exports.createCompany = async (req, res) => {
    try {
        console.log("createCompany", req.body);
        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        if (req.body.parent_id == 0) {
            const companyquery = `SELECT * FROM company WHERE company_name = ? AND main_address_country =? `;
            const companyvalue = await query(companyquery, [req.body.company_name, req.body.main_address_country]);

            console.log("companyvalue", companyvalue);

            if (companyvalue.length > 0) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'Organization name already exist.'
                    }
                )
            }
        }



        if (!req.body.parent_id || req.body.parent_id === "Select Parent") {
            req.body.parent_id = 0;
        }

        // const slugquery = `SELECT slug FROM company WHERE company_name = ?`;
        // const slugvalue = await query(slugquery,[req.body.company_name]);

        // if(slugquery.length>0){
        //     console.log("aaaaaaa");
        //     var companySlug = slugvalue[0].slug;
        //     console.log("companySlug",companySlug);

        //     // comFunction2.generateUniqueSlug(req.body.company_name, (error, companySlug) => {
        //         // comFunction2.generateUniqueSlug(req.body.company_name, main_address_country, (err, companySlug) => {
        //         // if (error) {
        //         //     console.log('Err: ', error.message);
        //         // } else {
        //             console.log('companySlug', companySlug);
        //             var insert_values = [];
        //             if (req.file) {
        //                 insert_values = [currentUserData.user_id, req.body.company_name, req.body.heading, req.file.filename, req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, req.body.status, req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.main_address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug, req.body.parent_id];
        //             } else {
        //                 insert_values = [currentUserData.user_id, req.body.company_name, req.body.heading, '', req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, req.body.status, req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.main_address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug, req.body.parent_id];
        //             }

        //             const insertQuery = 'INSERT INTO company (user_created_by, company_name, heading, logo, about_company, comp_phone, comp_email, comp_registration_id, status, trending, created_date, updated_date, tollfree_number, main_address, main_address_pin_code, address_map_url, main_address_country, main_address_state, main_address_city, verified, paid_status, slug,parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)';
        //             db.query(insertQuery, insert_values, (err, results, fields) => {
        //                 if (err) {
        //                     return res.send(
        //                         {
        //                             status: 'err',
        //                             data: '',
        //                             message: 'An error occurred while processing your request' + err
        //                         }
        //                     )
        //                 } else {
        //                     console.log("company results",results);

        //                     var companyId = results.insertId;
        //                     const categoryArray = Array.isArray(req.body.category) ? req.body.category : [req.body.category];

        //                     // Filter out undefined values from categoryArray
        //                     const validCategoryArray = categoryArray.filter(categoryID => categoryID !== undefined);

        //                     console.log('categoryArray:', categoryArray);
        //                     if (validCategoryArray.length > 0) {
        //                         const companyCategoryData = validCategoryArray.map((categoryID) => [companyId, categoryID]);
        //                         db.query('INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?', [companyCategoryData], function (error, results) {
        //                             if (error) {
        //                                 console.log(error);
        //                                 res.status(400).json({
        //                                     status: 'err',
        //                                     message: 'Error while creating company category'
        //                                 });
        //                             }
        //                             else {
        //                                 return res.send(
        //                                     {
        //                                         status: 'ok',
        //                                         data: companyId,
        //                                         message: 'New company created'
        //                                     }
        //                                 )
        //                             }
        //                         });
        //                     } else {
        //                         return res.send(
        //                             {
        //                                 status: 'ok',
        //                                 data: companyId,
        //                                 message: 'New company created without any category.'
        //                             }
        //                         )
        //                     }
        //                 }
        //             })

        //         // }
        //     // });



        // }else{
        //     ("bbbbbbb")
        //     var [companySlug] = await Promise.all( [
        //         comFunction2.generateUniqueSlug(req.body.company_name)
        //     ]);
        //     console.log("companySlugsss",companySlug);




        // }

        comFunction2.generateUniqueSlug(req.body.company_name, (error, companySlug) => {
            // comFunction2.generateUniqueSlug(req.body.company_name, main_address_country, (err, companySlug) => {
            if (error) {
                console.log('Err: ', error.message);
            } else {
                console.log('companySlug', companySlug);
                var insert_values = [];
                if (req.file) {
                    insert_values = [currentUserData.user_id, req.body.company_name, req.body.heading, req.file.filename, req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, req.body.status, req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.main_address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug, req.body.parent_id];
                } else {
                    insert_values = [currentUserData.user_id, req.body.company_name, req.body.heading, '', req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, req.body.status, req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.main_address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug, req.body.parent_id];
                }

                const insertQuery = 'INSERT INTO company (user_created_by, company_name, heading, logo, about_company, comp_phone, comp_email, comp_registration_id, status, trending, created_date, updated_date, tollfree_number, main_address, main_address_pin_code, address_map_url, main_address_country, main_address_state, main_address_city, verified, paid_status, slug,parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)';
                db.query(insertQuery, insert_values, (err, results, fields) => {
                    if (err) {
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: 'An error occurred while processing your request' + err
                            }
                        )
                    } else {
                        console.log("company results", results);

                        var companyId = results.insertId;
                        const categoryArray = Array.isArray(req.body.category) ? req.body.category : [req.body.category];

                        // Filter out undefined values from categoryArray
                        const validCategoryArray = categoryArray.filter(categoryID => categoryID !== undefined);

                        console.log('categoryArray:', categoryArray);
                        if (validCategoryArray.length > 0) {
                            const companyCategoryData = validCategoryArray.map((categoryID) => [companyId, categoryID]);
                            db.query('INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?', [companyCategoryData], function (error, results) {
                                if (error) {
                                    console.log(error);
                                    res.status(400).json({
                                        status: 'err',
                                        message: 'Error while creating company category'
                                    });
                                }
                                else {
                                    return res.send(
                                        {
                                            status: 'ok',
                                            data: companyId,
                                            message: 'New company created'
                                        }
                                    )
                                }
                            });
                        } else {
                            return res.send(
                                {
                                    status: 'ok',
                                    data: companyId,
                                    message: 'New company created without any category.'
                                }
                            )
                        }
                    }
                })

            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.send({
            status: 'err',
            //data: companyId,
            message: error.message
        });
    }
}

//-- Company Edit --//
// exports.editCompany = (req, res) => {
//     //console.log(req.body);
//     //console.log('editCompany',req.files);
//     //return false;
//     const companyID = req.body.company_id;
//     const currentDate = new Date();

//     const year = currentDate.getFullYear();
//     const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//     const day = String(currentDate.getDate()).padStart(2, '0');
//     const hours = String(currentDate.getHours()).padStart(2, '0');
//     const minutes = String(currentDate.getMinutes()).padStart(2, '0');
//     const seconds = String(currentDate.getSeconds()).padStart(2, '0');

//     const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

//     db.query(`SELECT slug FROM company WHERE slug = '${req.body.company_slug}' AND ID != '${companyID}' `, async (slugErr, slugResult) => {
//         if (slugErr) {
//             return res.send({
//                 status: 'err',
//                 data: '',
//                 message: 'An error occurred while updating the company details: ' + slugErr
//             });
//         }
//         if (slugResult.length > 0) {
//             return res.send({
//                 status: 'err',
//                 data: '',
//                 message: 'Company slug already exist'
//             });
//         } else {
//             // Update company details in the company table
//             const updateQuery = 'UPDATE company SET company_name = ?, heading = ?, logo = ?, about_company = ?, comp_phone = ?, comp_email = ?, comp_registration_id = ?, status = ?, trending = ?, updated_date = ?, tollfree_number = ?, main_address = ?, main_address_pin_code = ?, address_map_url = ?, main_address_country = ?, main_address_state = ?, main_address_city = ?, verified = ?, paid_status = ?, slug = ?, membership_type_id = ?, complaint_status = ?, complaint_level = ? WHERE ID = ?';
//             const updateValues = [
//                 req.body.company_name,
//                 req.body.heading,
//                 '',
//                 req.body.about_company,
//                 req.body.comp_phone,
//                 req.body.comp_email,
//                 req.body.comp_registration_id,
//                 req.body.status,
//                 req.body.trending,
//                 formattedDate,
//                 req.body.tollfree_number,
//                 req.body.main_address,
//                 req.body.main_address_pin_code,
//                 req.body.address_map_url,
//                 req.body.main_address_country,
//                 req.body.main_address_state,
//                 req.body.main_address_city,
//                 req.body.verified,
//                 req.body.payment_status.trim(),
//                 req.body.company_slug,
//                 req.body.membership_type_id,
//                 req.body.complaint_status,
//                 req.body.complaint_level,
//                 companyID
//             ];

//             if (req.files.logo) {
//                 // Unlink (delete) the previous file
//                 const unlinkcompanylogo = "uploads/" + req.body.previous_logo;
//                 fs.unlink(unlinkcompanylogo, (err) => {
//                     if (err) {
//                         //console.error('Error deleting file:', err);
//                     } else {
//                         //console.log('Previous file deleted');
//                     }
//                 });

//                 updateValues[2] = req.files.logo[0].filename;
//             } else {
//                 updateValues[2] = req.body.previous_logo;
//             }
//             if (req.files.cover_img) {
//                 // Unlink (delete) the previous file
//                 const unlinkcompanycover_img = "uploads/" + req.body.previous_cover_img;
//                 fs.unlink(unlinkcompanycover_img, (err) => {
//                     if (err) {
//                         //console.error('Error deleting file:', err);
//                     } else {
//                         //console.log('Previous file deleted');
//                     }
//                 });

//                 db.query(`SELECT * FROM premium_company_data WHERE company_id = '${companyID}' `, (coverErr, coverRes) => {
//                     if (coverErr) {
//                         console.log(coverErr)
//                     }
//                     if (coverRes.length > 0) {
//                         db.query(`UPDATE premium_company_data SET cover_img = '${req.files.cover_img[0].filename}' WHERE company_id = ${companyID}`, (coverUpdateErr, coverUpdateRes) => {
//                             if (coverUpdateErr) {
//                                 console.log(coverUpdateErr)
//                             }
//                         })
//                     } else {
//                         db.query(`INSERT INTO premium_company_data( company_id, cover_img, gallery_img, promotions, products) VALUES ('${companyID}', '${req.files.cover_img[0].filename}', '[]', '[]','[]' )`, (coverInsertErr, coverInsertRes) => {
//                             if (coverInsertErr) {
//                                 console.log(coverInsertErr)
//                             }
//                         })
//                     }
//                 })

//             }
//             db.query(updateQuery, updateValues, (err, results) => {
//                 if (err) {
//                     // Handle the error
//                     return res.send({
//                         status: 'err',
//                         data: '',
//                         message: 'An error occurred while updating the company details: ' + err
//                     });
//                 }

//                 // Update company categories in the company_cactgory_relation table
//                 const deleteQuery = 'DELETE FROM company_cactgory_relation WHERE company_id = ?';
//                 db.query(deleteQuery, [companyID], (err) => {
//                     if (err) {
//                         // Handle the error
//                         return res.send({
//                             status: 'err',
//                             data: '',
//                             message: 'An error occurred while deleting existing company categories: ' + err
//                         });
//                     }

//                     if (req.body.category) {
//                         // Create an array of arrays for bulk insert
//                         const categoryArray = Array.isArray(req.body.category) ? req.body.category : [req.body.category];
//                         const insertValues = categoryArray.map((categoryID) => [companyID, categoryID]);

//                         const insertQuery = 'INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?';

//                         db.query(insertQuery, [insertValues], (err) => {
//                             if (err) {
//                                 // Handle the error
//                                 return res.send({
//                                     status: 'err',
//                                     data: '',
//                                     message: 'An error occurred while updating company categories: ' + err
//                                 });
//                             }

//                             // Insert claim request if req.body.claimed_by exists
//                             if (req.body.claimed_by) {
//                                 const checkClaimRequestQuery = 'SELECT * FROM company_claim_request WHERE company_id = ?';
//                                 db.query(checkClaimRequestQuery, [companyID], async (err, claimRequestResults) => {
//                                     if (err) {
//                                         // Handle the error
//                                         return res.send({
//                                             status: 'err',
//                                             data: '',
//                                             message: 'An error occurred while checking company claim request: ' + err
//                                         });
//                                     }

//                                     if (claimRequestResults.length > 0) {

//                                         console.log('checkClaimRequestQuery', claimRequestResults)
//                                         const ReviewReplyByQuery = 'UPDATE review_reply SET reply_by = ? WHERE company_id = ? AND reply_by = ?';
//                                         const ReviewReplyByData = [req.body.claimed_by, companyID, claimRequestResults[0].claimed_by]
//                                         db.query(ReviewReplyByQuery, ReviewReplyByData, (ReviewReplyByErr, ReviewReplyByResult) => {
//                                             const ReviewReplyToQuery = 'UPDATE review_reply SET reply_to = ? WHERE company_id = ? AND reply_to = ?';
//                                             const ReviewReplyToData = [req.body.claimed_by, companyID, claimRequestResults[0].claimed_by]
//                                             db.query(ReviewReplyToQuery, ReviewReplyToData, (ReviewReplyToErr, ReviewReplyToResult) => {
//                                                 // Claim request already exists, handle accordingly
//                                                 const updateClaimRequestQuery = 'UPDATE company_claim_request SET claimed_by = ?, claimed_date = ? WHERE company_id = ?';
//                                                 const updateClaimRequestValues = [req.body.claimed_by, formattedDate, companyID];

//                                                 db.query(updateClaimRequestQuery, updateClaimRequestValues, (err) => {
//                                                     if (err) {
//                                                         // Handle the error
//                                                         return res.send({
//                                                             status: 'err',
//                                                             data: '',
//                                                             message: 'An error occurred while updating company claim request: ' + err
//                                                         });
//                                                     }

//                                                     // Return success response
//                                                     return res.send({
//                                                         status: 'ok',
//                                                         data: companyID,
//                                                         message: 'Company details updated successfully'
//                                                     });
//                                                 });
//                                             })
//                                         })


//                                     } else {
//                                         const claimRequestQuery = 'INSERT INTO company_claim_request (company_id, claimed_by, status, claimed_date) VALUES (?, ?, ?, ?)';
//                                         const claimRequestValues = [companyID, req.body.claimed_by, '1', formattedDate];

//                                         db.query(claimRequestQuery, claimRequestValues, (err) => {
//                                             if (err) {
//                                                 // Handle the error
//                                                 return res.send({
//                                                     status: 'err',
//                                                     data: '',
//                                                     message: 'An error occurred while inserting company claim request: ' + err
//                                                 });
//                                             }

//                                             // Return success response
//                                             return res.send({
//                                                 status: 'ok',
//                                                 data: companyID,
//                                                 message: 'Company details updated successfully'
//                                             });
//                                         });
//                                     }
//                                 });
//                             } else {
//                                 // Return success response
//                                 return res.send({
//                                     status: 'ok',
//                                     data: companyID,
//                                     message: 'Company details updated successfully'
//                                 });
//                             }
//                         })
//                     } else {
//                         // Insert claim request if req.body.claimed_by exists
//                         if (req.body.claimed_by) {
//                             const checkClaimRequestQuery = 'SELECT * FROM company_claim_request WHERE company_id = ?';
//                             db.query(checkClaimRequestQuery, [companyID], (err, claimRequestResults) => {
//                                 if (err) {
//                                     // Handle the error
//                                     return res.send({
//                                         status: 'err',
//                                         data: '',
//                                         message: 'An error occurred while checking company claim request: ' + err
//                                     });
//                                 }

//                                 if (claimRequestResults.length > 0) {

//                                     console.log('checkClaimRequestQuery', claimRequestResults)
//                                     const ReviewReplyByQuery = 'UPDATE review_reply SET reply_by = ? WHERE company_id = ? AND reply_by = ?';
//                                     const ReviewReplyByData = [req.body.claimed_by, companyID, claimRequestResults[0].claimed_by]
//                                     db.query(ReviewReplyByQuery, ReviewReplyByData, (ReviewReplyByErr, ReviewReplyByResult) => {
//                                         const ReviewReplyToQuery = 'UPDATE review_reply SET reply_to = ? WHERE company_id = ? AND reply_to = ?';
//                                         const ReviewReplyToData = [req.body.claimed_by, companyID, claimRequestResults[0].claimed_by]
//                                         db.query(ReviewReplyToQuery, ReviewReplyToData, (ReviewReplyToErr, ReviewReplyToResult) => {
//                                             // Claim request already exists, handle accordingly
//                                             const updateClaimRequestQuery = 'UPDATE company_claim_request SET claimed_by = ?, claimed_date = ? WHERE company_id = ?';
//                                             const updateClaimRequestValues = [req.body.claimed_by, formattedDate, companyID];

//                                             db.query(updateClaimRequestQuery, updateClaimRequestValues, (err) => {
//                                                 if (err) {
//                                                     // Handle the error
//                                                     return res.send({
//                                                         status: 'err',
//                                                         data: '',
//                                                         message: 'An error occurred while updating company claim request: ' + err
//                                                     });
//                                                 }

//                                                 // Return success response
//                                                 return res.send({
//                                                     status: 'ok',
//                                                     data: companyID,
//                                                     message: 'Company details updated successfully'
//                                                 });
//                                             });
//                                         })
//                                     })

//                                 } else {
//                                     const claimRequestQuery = 'INSERT INTO company_claim_request (company_id, claimed_by, status, claimed_date) VALUES (?, ?, ?, ?)';
//                                     const claimRequestValues = [companyID, req.body.claimed_by, '1', formattedDate];

//                                     db.query(claimRequestQuery, claimRequestValues, (err) => {
//                                         if (err) {
//                                             // Handle the error
//                                             return res.send({
//                                                 status: 'err',
//                                                 data: '',
//                                                 message: 'An error occurred while inserting company claim request: ' + err
//                                             });
//                                         }

//                                         // Return success response
//                                         return res.send({
//                                             status: 'ok',
//                                             data: companyID,
//                                             message: 'Company details updated successfully'
//                                         });
//                                     });
//                                 }
//                             });
//                         } else {
//                             // Return success response
//                             return res.send({
//                                 status: 'ok',
//                                 data: companyID,
//                                 message: 'Company details updated successfully'
//                             });
//                         }
//                     }
//                 })
//             })
//         }
//     })
// }

exports.editCompany = async (req, res) => {
    //console.log(req.body);
    //console.log('editCompany',req.files);
    //return false;
    const companyID = req.body.company_id;
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // if (req.body.parent_id == 0) {
    //     const companyquery = `SELECT * FROM company WHERE company_name = ? AND main_address_country =? `;
    //     const companyvalue = await query(companyquery, [req.body.company_name, req.body.main_address_country]);

    //     console.log("companyvalue", companyvalue);

    //     if (companyvalue.length > 0) {
    //         return res.send(
    //             {
    //                 status: 'err',
    //                 data: '',
    //                 message: 'Organization name already exist.'
    //             }
    //         )
    //     }
    // }

    db.query(`SELECT slug FROM company WHERE slug = '${req.body.company_slug}' AND ID != '${companyID}' `, async (slugErr, slugResult) => {
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
            const updateQuery = 'UPDATE company SET company_name = ?, heading = ?, logo = ?, about_company = ?, comp_phone = ?, comp_email = ?, comp_registration_id = ?, status = ?, trending = ?, updated_date = ?, tollfree_number = ?, main_address = ?, main_address_pin_code = ?, address_map_url = ?, main_address_country = ?, main_address_state = ?, main_address_city = ?, verified = ?, paid_status = ?, slug = ?, membership_type_id = ?, complaint_status = ?, complaint_level = ?, parent_id = ?, review_display_type = ? WHERE ID = ?';
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

                db.query(`SELECT * FROM premium_company_data WHERE company_id = '${companyID}' `, (coverErr, coverRes) => {
                    if (coverErr) {
                        console.log(coverErr)
                    }
                    if (coverRes.length > 0) {
                        db.query(`UPDATE premium_company_data SET cover_img = '${req.files.cover_img[0].filename}' WHERE company_id = ${companyID}`, (coverUpdateErr, coverUpdateRes) => {
                            if (coverUpdateErr) {
                                console.log(coverUpdateErr)
                            }
                        })
                    } else {
                        db.query(`INSERT INTO premium_company_data( company_id, cover_img, gallery_img, promotions, products) VALUES ('${companyID}', '${req.files.cover_img[0].filename}', '[]', '[]','[]' )`, (coverInsertErr, coverInsertRes) => {
                            if (coverInsertErr) {
                                console.log(coverInsertErr)
                            }
                        })
                    }
                })

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

                // Update company categories in the company_cactgory_relation table
                const deleteQuery = 'DELETE FROM company_cactgory_relation WHERE company_id = ?';
                db.query(deleteQuery, [companyID], (err) => {
                    if (err) {
                        // Handle the error
                        return res.send({
                            status: 'err',
                            data: '',
                            message: 'An error occurred while deleting existing company categories: ' + err
                        });
                    }

                    if (req.body.category) {
                        // Create an array of arrays for bulk insert
                        const categoryArray = Array.isArray(req.body.category) ? req.body.category : [req.body.category];
                        const insertValues = categoryArray.map((categoryID) => [companyID, categoryID]);

                        const insertQuery = 'INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?';

                        db.query(insertQuery, [insertValues], (err) => {
                            if (err) {
                                // Handle the error
                                return res.send({
                                    status: 'err',
                                    data: '',
                                    message: 'An error occurred while updating company categories: ' + err
                                });
                            }

                            // Insert claim request if req.body.claimed_by exists
                            if (req.body.claimed_by) {
                                const checkClaimRequestQuery = 'SELECT * FROM company_claim_request WHERE company_id = ?';
                                db.query(checkClaimRequestQuery, [companyID], async (err, claimRequestResults) => {
                                    if (err) {
                                        // Handle the error
                                        return res.send({
                                            status: 'err',
                                            data: '',
                                            message: 'An error occurred while checking company claim request: ' + err
                                        });
                                    }

                                    if (claimRequestResults.length > 0) {

                                        console.log('checkClaimRequestQuery', claimRequestResults)
                                        const ReviewReplyByQuery = 'UPDATE review_reply SET reply_by = ? WHERE company_id = ? AND reply_by = ?';
                                        const ReviewReplyByData = [req.body.claimed_by, companyID, claimRequestResults[0].claimed_by]
                                        db.query(ReviewReplyByQuery, ReviewReplyByData, (ReviewReplyByErr, ReviewReplyByResult) => {
                                            const ReviewReplyToQuery = 'UPDATE review_reply SET reply_to = ? WHERE company_id = ? AND reply_to = ?';
                                            const ReviewReplyToData = [req.body.claimed_by, companyID, claimRequestResults[0].claimed_by]
                                            db.query(ReviewReplyToQuery, ReviewReplyToData, (ReviewReplyToErr, ReviewReplyToResult) => {
                                                // Claim request already exists, handle accordingly
                                                const updateClaimRequestQuery = 'UPDATE company_claim_request SET claimed_by = ?, claimed_date = ? WHERE company_id = ?';
                                                const updateClaimRequestValues = [req.body.claimed_by, formattedDate, companyID];

                                                db.query(updateClaimRequestQuery, updateClaimRequestValues, (err) => {
                                                    if (err) {
                                                        // Handle the error
                                                        return res.send({
                                                            status: 'err',
                                                            data: '',
                                                            message: 'An error occurred while updating company claim request: ' + err
                                                        });
                                                    }

                                                    // Return success response
                                                    return res.send({
                                                        status: 'ok',
                                                        data: companyID,
                                                        message: 'Company details updated successfully'
                                                    });
                                                });
                                            })
                                        })


                                    } else {
                                        const claimRequestQuery = 'INSERT INTO company_claim_request (company_id, claimed_by, status, claimed_date) VALUES (?, ?, ?, ?)';
                                        const claimRequestValues = [companyID, req.body.claimed_by, '1', formattedDate];

                                        db.query(claimRequestQuery, claimRequestValues, (err) => {
                                            if (err) {
                                                // Handle the error
                                                return res.send({
                                                    status: 'err',
                                                    data: '',
                                                    message: 'An error occurred while inserting company claim request: ' + err
                                                });
                                            }

                                            // Return success response
                                            return res.send({
                                                status: 'ok',
                                                data: companyID,
                                                message: 'Company details updated successfully'
                                            });
                                        });
                                    }
                                });
                            } else {
                                // Return success response
                                return res.send({
                                    status: 'ok',
                                    data: companyID,
                                    message: 'Company details updated successfully'
                                });
                            }
                        })
                    } else {
                        // Insert claim request if req.body.claimed_by exists
                        if (req.body.claimed_by) {
                            const checkClaimRequestQuery = 'SELECT * FROM company_claim_request WHERE company_id = ?';
                            db.query(checkClaimRequestQuery, [companyID], (err, claimRequestResults) => {
                                if (err) {
                                    // Handle the error
                                    return res.send({
                                        status: 'err',
                                        data: '',
                                        message: 'An error occurred while checking company claim request: ' + err
                                    });
                                }

                                if (claimRequestResults.length > 0) {

                                    console.log('checkClaimRequestQuery', claimRequestResults)
                                    const ReviewReplyByQuery = 'UPDATE review_reply SET reply_by = ? WHERE company_id = ? AND reply_by = ?';
                                    const ReviewReplyByData = [req.body.claimed_by, companyID, claimRequestResults[0].claimed_by]
                                    db.query(ReviewReplyByQuery, ReviewReplyByData, (ReviewReplyByErr, ReviewReplyByResult) => {
                                        const ReviewReplyToQuery = 'UPDATE review_reply SET reply_to = ? WHERE company_id = ? AND reply_to = ?';
                                        const ReviewReplyToData = [req.body.claimed_by, companyID, claimRequestResults[0].claimed_by]
                                        db.query(ReviewReplyToQuery, ReviewReplyToData, (ReviewReplyToErr, ReviewReplyToResult) => {
                                            // Claim request already exists, handle accordingly
                                            const updateClaimRequestQuery = 'UPDATE company_claim_request SET claimed_by = ?, claimed_date = ? WHERE company_id = ?';
                                            const updateClaimRequestValues = [req.body.claimed_by, formattedDate, companyID];

                                            db.query(updateClaimRequestQuery, updateClaimRequestValues, (err) => {
                                                if (err) {
                                                    // Handle the error
                                                    return res.send({
                                                        status: 'err',
                                                        data: '',
                                                        message: 'An error occurred while updating company claim request: ' + err
                                                    });
                                                }

                                                // Return success response
                                                return res.send({
                                                    status: 'ok',
                                                    data: companyID,
                                                    message: 'Company details updated successfully'
                                                });
                                            });
                                        })
                                    })

                                } else {
                                    const claimRequestQuery = 'INSERT INTO company_claim_request (company_id, claimed_by, status, claimed_date) VALUES (?, ?, ?, ?)';
                                    const claimRequestValues = [companyID, req.body.claimed_by, '1', formattedDate];

                                    db.query(claimRequestQuery, claimRequestValues, (err) => {
                                        if (err) {
                                            // Handle the error
                                            return res.send({
                                                status: 'err',
                                                data: '',
                                                message: 'An error occurred while inserting company claim request: ' + err
                                            });
                                        }

                                        // Return success response
                                        return res.send({
                                            status: 'ok',
                                            data: companyID,
                                            message: 'Company details updated successfully'
                                        });
                                    });
                                }
                            });
                        } else {
                            // Return success response
                            return res.send({
                                status: 'ok',
                                data: companyID,
                                message: 'Company details updated successfully'
                            });
                        }
                    }
                })
            })
        }
    })
}


//--- Create Company Bulk Upload ----//
exports.companyBulkUpload = async (req, res) => {
    //console.log(req.body);
    if (!req.file) {
        return res.send(
            {
                status: 'err',
                data: '',
                message: 'No file uploaded.'
            }
        )
    }
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);

    const csvFilePath = path.join(__dirname, '..', 'company-csv', req.file.filename);
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

    // Process the uploaded CSV file and insert data into the database
    try {
        const connection = await mysql.createConnection(dbConfig);

        const workbook = new ExcelJS.Workbook();
        await workbook.csv.readFile(csvFilePath);

        const worksheet = workbook.getWorksheet(1);
        const companies = await processCompanyCSVRows(worksheet, formattedDate, connection, currentUserData.user_id);
        //console.log('companies',companies);
        for (const company of companies) {
            //console.log('company:',company)
            try {

                const companySlug = await new Promise((resolve, reject) => {
                    comFunction2.generateUniqueSlug(company[1], (error, generatedSlug) => {
                        if (error) {
                            console.log('Error:', error.message);
                            reject(error);
                        } else {
                            // console.log('Generated Company Slug:', generatedSlug);
                            resolve(generatedSlug);
                        }
                    });
                });
                await company.push(companySlug);
                // Replace any undefined values with null
                const cleanedCompany = company.map(value => (value !== undefined ? value : null));
                //console.log(value);
                //return false;

                if (cleanedCompany[2] === null) {
                    cleanedCompany[2] = '';
                }
                if (cleanedCompany[3] === null) {
                    cleanedCompany[3] = '';
                }
                if (cleanedCompany[4] === null) {
                    cleanedCompany[4] = '';
                }
                if (cleanedCompany[5] === null) {
                    cleanedCompany[5] = '';
                }
                if (cleanedCompany[6] === null) {
                    cleanedCompany[6] = '';
                }
                if (cleanedCompany[7] === null) {
                    cleanedCompany[7] = '';
                }
                if (cleanedCompany[8] === null) {
                    cleanedCompany[8] = '';
                }
                if (cleanedCompany[9] === null) {
                    cleanedCompany[9] = '';
                }
                if (cleanedCompany[10] === null) {
                    cleanedCompany[10] = '';
                }
                if (cleanedCompany[11] === null) {
                    cleanedCompany[11] = '';
                }
                if (cleanedCompany[12] === null) {
                    cleanedCompany[12] = '';
                }
                if (cleanedCompany[13] === null) {
                    cleanedCompany[13] = '';
                }
                if (cleanedCompany[20] === null) {
                    cleanedCompany[20] = '';
                }

                cleanedCompany[21] = 0; // Default value



                await connection.execute(
                    `
                    INSERT INTO company 
                        (user_created_by, company_name, heading, about_company, comp_email, comp_phone, tollfree_number, main_address, main_address_pin_code, address_map_url, comp_registration_id, status, trending, created_date, updated_date, main_address_country, main_address_state, main_address_city, verified, slug,parent_id) 
                    VALUES 
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE
                        user_created_by = VALUES(user_created_by),
                        company_name = VALUES(company_name), 
                        heading = VALUES(heading), 
                        about_company = VALUES(about_company),
                        comp_email = VALUES(comp_email),
                        comp_phone = VALUES(comp_phone),
                        tollfree_number = VALUES(tollfree_number),
                        main_address = VALUES(main_address),
                        main_address_pin_code = VALUES(main_address_pin_code),
                        address_map_url = VALUES(address_map_url),
                        comp_registration_id = VALUES(comp_registration_id),
                        status = VALUES(status),
                        trending = VALUES(trending),
                        created_date = VALUES(created_date),
                        updated_date =  VALUES(updated_date),
                        main_address_country =  VALUES(main_address_country),
                        main_address_state =  VALUES(main_address_state),
                        main_address_city =  VALUES(main_address_city),
                        verified =  VALUES(verified),
                        slug =  VALUES(slug),
                        parent_id = VALUES(parent_id)
                    `,
                    cleanedCompany
                );
            } catch (error) {
                console.error('Error:', error);
                return res.send({
                    status: 'err',
                    data: companies,
                    message: error.message
                });
            }
        }
        await connection.end(); // Close the connectio
        return res.send(
            {
                status: 'ok',
                data: companies,
                message: 'File uploaded.'
            }
        )

    } catch (error) {
        console.error('Error:', error);
        return res.send({
            status: 'err',
            data: [],
            message: error.message
        });
    } finally {
        // Delete the uploaded CSV file
        //fs.unlinkSync(csvFilePath);
    }
}

// exports.companyBulkUpload = async (req, res) => {
//     //console.log(req.body);
//     if (!req.file) {
//         return res.send(
//             {
//                 status: 'err',
//                 data: '',
//                 message: 'No file uploaded.'
//             }
//         )
//     }
//     const encodedUserData = req.cookies.user;
//     const currentUserData = JSON.parse(encodedUserData);

//     const csvFilePath = path.join(__dirname, '..', 'company-csv', req.file.filename);
//     const currentDate = new Date();
//     const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

//     // Process the uploaded CSV file and insert data into the database
//     try {

//         if(req.body.parent_id == 0){
//             const companyquery = `SELECT * FROM company WHERE company_name = ? AND main_address_country =? `;
//             const companyvalue = await query(companyquery,[req.body.company_name,req.body.main_address_country]);

//             console.log("companyvalue",companyvalue);

//             if(companyvalue.length>0){
//                 return res.send(
//                     {
//                         status: 'err',
//                         data: '',
//                         message: 'Organization name already exist.'
//                     }
//                 )
//             }
//         }
//         const connection = await mysql.createConnection(dbConfig);

//         const workbook = new ExcelJS.Workbook();
//         await workbook.csv.readFile(csvFilePath);

//         const worksheet = workbook.getWorksheet(1);
//         const companies = await processCompanyCSVRows(worksheet, formattedDate, connection, currentUserData.user_id);
//         //console.log('companies',companies);
//         for (const company of companies) {
//             //console.log('company:',company)
//             try {

//                 const companySlug = await new Promise((resolve, reject) => {
//                     comFunction2.generateUniqueSlug(company[1], (error, generatedSlug) => {
//                         if (error) {
//                             console.log('Error:', error.message);
//                             reject(error);
//                         } else {
//                             // console.log('Generated Company Slug:', generatedSlug);
//                             resolve(generatedSlug);
//                         }
//                     });
//                 });
//                 await company.push(companySlug);
//                 // Replace any undefined values with null
//                 const cleanedCompany = company.map(value => (value !== undefined ? value : null));
//                 console.log("cleanedCompany",cleanedCompany);
//                 //return false;


//                 console.log("Updated cleanedCompany:", cleanedCompany); 


//                 // Replace undefined or empty string values with null
//                 const sanitizedCompany = cleanedCompany.map((value) => {
//                     if (value === undefined || value === '') {
//                     return null;
//                     }
//                     return value;
//                 });

//                 console.log("Sanitized company data:", sanitizedCompany);






//                 // if (cleanedCompany[2] === null) {
//                 //     cleanedCompany[2] = '';
//                 // }
//                 // if (cleanedCompany[3] === null) {
//                 //     cleanedCompany[3] = '';
//                 // }
//                 // if (cleanedCompany[4] === null) {
//                 //     cleanedCompany[4] = '';
//                 // }
//                 // if (cleanedCompany[5] === null) {
//                 //     cleanedCompany[5] = '';
//                 // }
//                 // if (cleanedCompany[6] === null) {
//                 //     cleanedCompany[6] = '';
//                 // }
//                 // if (cleanedCompany[7] === null) {
//                 //     cleanedCompany[7] = '';
//                 // }
//                 // if (cleanedCompany[8] === null) {
//                 //     cleanedCompany[8] = '';
//                 // }
//                 // if (cleanedCompany[9] === null) {
//                 //     cleanedCompany[9] = '';
//                 // }
//                 // if (cleanedCompany[10] === null) {
//                 //     cleanedCompany[10] = '';
//                 // }
//                 // if (cleanedCompany[11] === null) {
//                 //     cleanedCompany[11] = '';
//                 // }
//                 // if (cleanedCompany[12] === null) {
//                 //     cleanedCompany[12] = '';
//                 // }
//                 // if (cleanedCompany[13] === null) {
//                 //     cleanedCompany[13] = '';
//                 // }
//                 // if (cleanedCompany[14] === null) {
//                 //     cleanedCompany[14] = '';
//                 // }




//                 await connection.execute(
//                     `
//                     INSERT INTO company 
//                     (user_created_by, company_name, heading, about_company, comp_email, comp_phone, tollfree_number, 
//                      main_address, main_address_pin_code, address_map_url, comp_registration_id, status, trending, 
//                      created_date, updated_date, main_address_country, main_address_state, main_address_city, 
//                      verified, slug, operating_hours,membership_type_id,complaint_status,complaint_level,manger_email,help_desk_email,parent_id) 
//                   VALUES 
//                     (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?) 
//                   ON DUPLICATE KEY UPDATE
//                     user_created_by = VALUES(user_created_by),
//                     company_name = VALUES(company_name),
//                     heading = VALUES(heading),
//                     about_company = VALUES(about_company),
//                     comp_email = VALUES(comp_email),
//                     comp_phone = VALUES(comp_phone),
//                     tollfree_number = VALUES(tollfree_number),
//                     main_address = VALUES(main_address),
//                     main_address_pin_code = VALUES(main_address_pin_code),
//                     address_map_url = VALUES(address_map_url),
//                     comp_registration_id = VALUES(comp_registration_id),
//                     status = VALUES(status),
//                     trending = VALUES(trending),
//                     created_date = VALUES(created_date),
//                     updated_date = VALUES(updated_date),
//                     main_address_country = VALUES(main_address_country),
//                     main_address_state = VALUES(main_address_state),
//                     main_address_city = VALUES(main_address_city),
//                     verified = VALUES(verified),
//                     slug = VALUES(slug),
//                     operating_hours=VALUES(operating_hours),
//                     membership_type_id=VALUES(membership_type_id),
//                     complaint_status=VALUES(complaint_status),
//                     complaint_level=VALUES(complaint_level),
//                     manger_email=VALUES(manger_email),
//                     help_desk_email=VALUES(help_desk_email),
//                     parent_id = VALUES(parent_id)
//                     `,
//                     cleanedCompany // Ensure all nulls replaced with empty strings
//                   );

//             } catch (error) {
//                 console.error('Error:', error);
//                 return res.send({
//                     status: 'err',
//                     data: companies,
//                     message: error.message
//                 });
//             }
//         }
//         await connection.end(); // Close the connectio
//         return res.send(
//             {
//                 status: 'ok',
//                 data: companies,
//                 message: 'File uploaded.'
//             }
//         )

//     } catch (error) {
//         console.error('Error:', error);
//         return res.send({
//             status: 'err',
//             data: [],
//             message: error.message
//         });
//     } finally {
//         // Delete the uploaded CSV file
//         //fs.unlinkSync(csvFilePath);
//     }
// }

// Define a promise-based function for processing rows
function processCompanyCSVRows(worksheet, formattedDate, connection, user_id) {
    return new Promise(async (resolve, reject) => {
        const companies = [];

        await worksheet.eachRow(async (row, rowNumber) => {
            if (rowNumber !== 1) { // Skip the header row

                companies.push([user_id, row.values[1], row.values[2], row.values[3], row.values[4], row.values[5], row.values[6], row.values[7], row.values[8], row.values[9], row.values[10], '1', '0', formattedDate, formattedDate, row.values[11], row.values[12], row.values[13], '0']);

            }
        });

        // Resolve the promise after all rows have been processed
        resolve(companies);
    });
}
// processCompanyCSVRows(worksheet, formattedDate, connection, user_id)
//     .then(companies => {
//         console.log('Resolved companies', companies);
//     })
//     .catch(error => {
//         console.error('Error:', error.message);
//     });

//--- Delete Company ----//
// exports.deleteCompany = (req, res) => {
//     //console.log(req.body.companyid);
//     console.log("companyid",req.body.companyid);
//     console.log("ggggg");

//     // sql = `DELETE FROM company WHERE ID = ?`;
//     // const data = [req.body.companyid];
//     // db.query(sql, data, (err, result) => {
//     //     if (err) {
//     //         return res.send({
//     //             status: 'error',
//     //             message: 'Something went wrong'
//     //         });
//     //     } else {
//     //         return res.send({
//     //             status: 'ok',
//     //             message: 'Company successfully deleted'
//     //         });
//     //     }

//     // })

//     const { companyid } = req.body;

//     if (!companyid || !Array.isArray(companyid)) {
//         return res.status(400).json({ success: false, message: 'Invalid data' });
//     }

//     try {
//         const placeholders = companyid.map(() => '?').join(',');
//         const query = `DELETE FROM company WHERE ID IN (${placeholders})`;

//         db.query(query, companyid, (error, result) => {
//             if (error) {
//                 console.error('Error updating companies:', error);
//                 return res.status(500).json({ success: false, message: 'Server error' });
//             }

//             if (result.affectedRows > 0) {
//                 res.json({ success: true });
//             } else {
//                 res.json({ success: false, message: 'No companies were updated' });
//             }
//         });
//     } 
//     catch (error) {
//         console.error('Error updating companies:', error);
//         return res.status(500).json({ success: false, message: 'Server error' });
//     }



// }
// exports.deleteCompanies = (req, res) => {
//     //console.log(req.body.companyid);
//     console.log("companyid",req.body.companyid);
//     console.log("ggggg");

//     sql = `DELETE FROM company WHERE ID = ?`;
//     const data = [req.body.companyid];
//     db.query(sql, data, (err, result) => {
//         if (err) {
//             return res.send({
//                 status: 'error',
//                 message: 'Something went wrong'
//             });
//         } else {
//             return res.send({
//                 status: 'ok',
//                 message: 'Company successfully deleted'
//             });
//         }

//     })


// }


exports.deleteCompany = (req, res) => {
    console.log("companyid", req.body.companyid);

    const { companyid } = req.body;

    if (!companyid || !Array.isArray(companyid)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    try {
        const placeholders = companyid.map(() => '?').join(',');
        const query = `DELETE FROM company WHERE ID IN (${placeholders})`;
        const query1 = `DELETE FROM reviews WHERE company_id IN (${placeholders})`;
        const query2 = `DELETE FROM survey WHERE company_id IN (${placeholders})`;
        const query3 = `DELETE FROM poll_company WHERE company_id IN (${placeholders})`;
        const query4 = `DELETE FROM complaint WHERE company_id IN (${placeholders})`;

        db.query(query, companyid, (error, result) => {
            if (error) {
                console.error('Error deleting companies:', error);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        });

        db.query(query1, companyid, (error, result) => {
            if (error) {
                console.error('Error deleting reviews:', error);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        });

        db.query(query2, companyid, (error, result) => {
            if (error) {
                console.error('Error deleting surveys:', error);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        });

        db.query(query3, companyid, (error, result) => {
            if (error) {
                console.error('Error deleting poll companies:', error);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        });

        db.query(query4, companyid, (error, result) => {
            if (error) {
                console.error('Error deleting complaints:', error);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            // If all queries are successful, send the response
            return res.json({ success: true, message: 'Companies deleted successfully.' });
        });
    } catch (error) {
        console.error('Error deleting companies:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }

}



exports.deleteCompanies = async (req, res) => {
    const companyId = req.body.companyid;

    const queries = [
        { query: 'DELETE FROM company WHERE ID = ?', errorMsg: 'Error deleting companies:' },
        { query: 'DELETE FROM reviews WHERE company_id = ?', errorMsg: 'Error deleting reviews:' },
        { query: 'DELETE FROM survey WHERE company_id = ?', errorMsg: 'Error deleting surveys:' },
        { query: 'DELETE FROM poll_company WHERE company_id = ?', errorMsg: 'Error deleting poll companies:' },
        { query: 'DELETE FROM complaint WHERE company_id = ?', errorMsg: 'Error deleting complaints:' },
    ];

    try {
        for (const { query, errorMsg } of queries) {
            await new Promise((resolve, reject) => {
                db.query(query, companyId, (error, result) => {
                    if (error) {
                        console.error(errorMsg, error);
                        return reject(error);
                    }
                    resolve(result);
                });
            });
        }
        return res.json({ success: true, message: 'Company deleted successfully.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


exports.getcompanyDetails = async (req, res) => {
    try {
        const company_name = req.body.company_name;
        console.log("company_name", company_name);

        const getcompanyquery = `SELECT * FROM company WHERE company_name=?`;
        const companyvalue = await query(getcompanyquery, [company_name]);

        if (companyvalue.length > 0) {
            var company_state = companyvalue[0].main_address_state;
            var company_city = companyvalue[0].main_address_city;
            var company_id = companyvalue[0].ID;


            const state_query = `SELECT * FROM states WHERE ID = ?`;
            const states = await query(state_query, [company_state]);

            if (states.length > 0) {
                var state_name = states[0].name;
                console.log("state_name", state_name);
            }

            console.log("company_state", company_state);
            console.log("company_city", company_city);
            console.log("company_id", company_id);


            res.status(200).json({
                status: 'ok',
                companyDetails: {
                    state: state_name,
                    city: company_city,
                    company_id: company_id
                }
            });
        } else {
            // Send error response if company not found
            res.status(404).json({
                status: 'error',
                message: 'Company not found'
            });
        }
    } catch (error) {
        console.error('Error getcompanyDetails:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


exports.currencyConvert = async (req, res) => {
    try {
        const { inr_currency, jpy_currency } = req.body;
        console.log("rgjgbody", req.body);

        const currencyData = {
            inr_currency,
            jpy_currency
        };

        const query = 'INSERT INTO currency_conversion SET ?';
        const result = await queryAsync(query, currencyData);

        return res.status(200).json({ success: true, message: 'Currency added successfully.', result });

    } catch (error) {
        console.error('Error in currencyConvert:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


exports.editcurrencyConvert = async (req, res) => {
    try {
        const { inr_currency, jpy_currency } = req.body;
        console.log("Request body:", req.body);

        const query = 'UPDATE currency_conversion SET inr_currency = ?, jpy_currency = ?';
        const values = [inr_currency, jpy_currency];


        const result = await queryAsync(query, values);

        if (result.affectedRows > 0) {
            return res.status(200).json({ success: true, message: 'Currency updated successfully.', result });
        } else {
            return res.status(404).json({ success: false, message: 'Currency not found or update failed.' });
        }
    } catch (error) {
        console.error('Error in editcurrencyConvert:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};




//--- Delete Company ----//
exports.deletePayment = (req, res) => {
    //console.log(req.body.companyid);
    sql = `DELETE FROM payments WHERE id = ?`;
    const data = [req.body.paymentId];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: 'Something went wrong'
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Payment details successfully deleted'
            });
        }

    })

}

//--- Trash Company ----//
exports.trashCompany = async (req, res) => {
    console.log("companyid", req.body.companyid);
    console.log("aaaaa");
    // sql = `UPDATE company SET status = '3' WHERE ID = ?`;
    // const data = [req.body.companyid];
    // db.query(sql, data, (err, result) => {
    //     if (err) {
    //         console.log("error",err);
    //         return res.send({
    //             status: 'error',
    //             message: 'Something went wrong'
    //         });
    //     } else {
    //         return res.send({
    //             status: 'ok',
    //             message: 'Company successfully move to trash'
    //         });
    //     }
    // })
    const { companyid } = req.body;

    if (!companyid || !Array.isArray(companyid)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    try {
        const placeholders = companyid.map(() => '?').join(',');
        const query = `UPDATE company SET status = '3' WHERE ID IN (${placeholders})`;

        db.query(query, companyid, (error, result) => {
            if (error) {
                console.error('Error updating companies:', error);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            if (result.affectedRows > 0) {
                res.json({ success: true });
            } else {
                res.json({ success: false, message: 'No companies were updated' });
            }
        });
    }
    catch (error) {
        console.error('Error updating companies:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
exports.trashCompanies = async (req, res) => {
    console.log("companyid", req.body.companyid);
    console.log("aaaaa");
    // sql = `UPDATE company SET status = '3' WHERE ID = ?`;
    sql = `UPDATE company SET status = '3' WHERE ID = ?`;
    const data = [req.body.companyid];
    db.query(sql, data, (err, result) => {
        if (err) {
            console.log("error", err);
            return res.send({
                status: 'error',
                message: 'Something went wrong'
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Company successfully move to trash'
            });
        }
    })
}


// exports.trashCompanies = async (req, res) => {
//     console.log("companyid", req.body.companyid);
//     console.log("aaaaa");
//     // sql = `UPDATE company SET status = '3' WHERE ID = ?`;
//     sql = `UPDATE company SET status = '3' WHERE ID = ?`;
//     const data = [req.body.companyid];
//     db.query(sql, data, (err, result) => {
//         if (err) {
//             console.log("error", err);
//             return res.send({
//                 status: 'error',
//                 message: 'Something went wrong'
//             });
//         } else {
//             // return res.send({
//             //     status: 'ok',
//             //     message: 'Company successfully move to trash'
//             // });
//             console.log("pppppp");
//             const updateLogSql = `DELETE FROM company_claim_request WHERE company_id = ?`;
//             const updateLogData = [req.body.companyid];

//             db.query(updateLogSql, updateLogData, (err, result) => {
//                 if (err) {
//                     console.log("Error updating company_log:", err);
//                     return res.send({
//                         status: 'error',
//                         message: 'Company status updated, but failed to log the update'
//                     });
//                 } else {
//                     return res.send({
//                         status: 'ok',
//                         message: 'Company successfully moved to trash and logged'
//                     });
//                 }
//             });
//         }
//     })
// }

//--- Restore Company ----//
exports.restoreCompany = (req, res) => {
    //console.log(req.body.companyid);
    sql = `UPDATE company SET status = '2' WHERE ID = ?`;
    const data = [req.body.companyid];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: 'Something went wrong'
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Company successfully restored with pending status'
            });
        }
    })
}


// Assuming Express.js
exports.getparentcompany = (req, res) => {
    const country = req.query.country;

    db.query(
        'SELECT id, company_name FROM company WHERE main_address_country = ? AND parent_id = 0',
        [country],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            res.status(200).json({
                parentCategories: results,
            });
        }
    );
}


exports.createRatingTags = (req, res) => {
    console.log(req.body);
    const ratingTagsArray = JSON.parse(req.body.rating_tags);
    // Extract the "value" property from each object in the array
    const ratingValues = ratingTagsArray.map(tag => tag.value);
    // Join the values with the "|" separator
    const formattedRatingTags = ratingValues.join('|');

    console.log('rating_tags:', formattedRatingTags);

    //-- Checking review_rating_value already exist or Not
    db.query('SELECT * FROM review_rating_tags WHERE review_rating_value = ?', [req.body.review_rating_value], async (err, results) => {
        if (err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        }

        if (results.length > 0) {

            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'Tag already added for this rating value.'
                }
            )
        }

        insert_values = [req.body.review_rating_value, req.body.review_rating_name, req.file.filename, formattedRatingTags];
        var insert_values = [];
        if (req.file) {
            insert_values = [req.body.review_rating_value, req.body.review_rating_name, req.file.filename, formattedRatingTags];
        } else {
            insert_values = [req.body.review_rating_value, req.body.review_rating_name, '', formattedRatingTags];
        }

        const insertQuery = 'INSERT INTO review_rating_tags (review_rating_value, review_rating_name, rating_image, rating_tags) VALUES (?, ?, ?, ?)';
        db.query(insertQuery, insert_values, (err, results, fields) => {
            if (err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request' + err
                    }
                )
            } else {
                const rowID = results.insertId;
                return res.send(
                    {
                        status: 'ok',
                        data: rowID,
                        message: 'Tag successfully added'
                    }
                )
            }
        })
    })
}

exports.editRatingTags = (req, res) => {
    //console.log(req.body);
    const row_id = req.body.row_id;

    const ratingTagsArray = JSON.parse(req.body.rating_tags);
    // Extract the "value" property from each object in the array
    const ratingValues = ratingTagsArray.map(tag => tag.value);
    // Join the values with the "|" separator
    const formattedRatingTags = ratingValues.join('|');

    // Update company details in the company table
    const updateQuery = 'UPDATE review_rating_tags SET review_rating_name = ?, rating_image = ?, rating_tags = ? WHERE id = ?';

    var updateValues = [];
    if (req.file) {
        // Unlink (delete) the previous file
        const unlinkcompanylogo = "uploads/" + req.body.previous_rating_image;
        fs.unlink(unlinkcompanylogo, (err) => {
            if (err) {
                //console.error('Error deleting file:', err);
            } else {
                //console.log('Previous file deleted');
            }
        });
        updateValues = [req.body.review_rating_name, req.file.filename, formattedRatingTags, row_id];
    } else {
        updateValues = [req.body.review_rating_name, req.body.previous_rating_image, formattedRatingTags, row_id];
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

        // Return success response
        return res.send({
            status: 'ok',
            data: '',
            message: 'Tags updated successfully'
        });
    })
}

exports.editCustomerReview = async (req, res) => {
    //console.log('controller',req.body);
    //return false;
    // const ratingTagsArray = JSON.parse(req.body.rating_tags);
    // console.log(ratingTagsArray);
    //const editResponse1 = await comFunction.editCustomerReview( req.body );
    const [editResponse, ApproveMailSend, RejectdEmailSend] = await Promise.all([
        comFunction.editCustomerReview(req.body),
        comFunction2.reviewApprovedEmail(req.body),
        comFunction2.reviewRejectdEmail(req.body),
    ]);

    if (editResponse == true) {
        // Return success response
        return res.send({
            status: 'ok',
            data: '',
            message: 'Review updated successfully'
        });
    } else {
        return res.send({
            status: 'err',
            data: '',
            message: editResponse
        });
    }
}

exports.editCustomerReviewReply = async (req, res) => {
    console.log('editCustomerReviewReply', req.body);
    //return false;
    // const ratingTagsArray = JSON.parse(req.body.rating_tags);
    // console.log(ratingTagsArray);
    //const editResponse1 = await comFunction.editCustomerReview( req.body );
    const [CustomerReply] = await Promise.all([
        comFunction2.updateCustomerReply(req.body),
    ]);

    if (CustomerReply == true) {
        // Return success response
        return res.send({
            status: 'ok',
            data: '',
            message: 'Review reply updated successfully'
        });
    } else {
        return res.send({
            status: 'err',
            data: '',
            message: editResponse
        });
    }
}
// Update Contacts
// exports.updateContacts = async (req, res) => {
//     //const formdata = JSON.parse(req.body.formData);
//     console.log('Request Form DATA:', req.body.whatsapp_no);
//     const { contacts_id, social_id, whatsapp_no, phone_no, email, title, meta_title, meta_desc, meta_keyword, fb_link, twitter_link, linkedin_link, instagram_link, youtube_link } = req.body
//     const contact_sql = `UPDATE contacts SET whatsapp_no=?,phone_no=?,email=?,title=?,meta_title=?,meta_desc=?,meta_keyword=? WHERE id = ?`;
//     const contact_data = [whatsapp_no, phone_no, email, title, meta_title, meta_desc, meta_keyword, contacts_id];
//     db.query(contact_sql, contact_data, (err, result) => {
//         const socials_sql = `UPDATE socials SET facabook=?,linkedin=?,instagram=?,youtube=?,twitter=? WHERE id=?`;
//         const socials_data = [fb_link, linkedin_link, instagram_link, youtube_link, twitter_link, social_id];
//         db.query(socials_sql, socials_data, (socials_err, socials_result) => {
//             // Return success response
//             return res.send({
//                 status: 'ok',
//                 message: 'Contact details and social links updated successfully'
//             });
//         })
//     })
// }

exports.updateContacts = async (req, res) => {
    //const formdata = JSON.parse(req.body.formData);
    console.log('Request Form DATA:', req.body.whatsapp_no);
    const { contacts_id, social_id, whatsapp_no, phone_no, email, title, meta_title, meta_desc, meta_keyword, fb_link, twitter_link, linkedin_link, instagram_link, youtube_link } = req.body
    const contact_sql = `UPDATE contacts SET whatsapp_no=?,phone_no=?,email=?,title=?,meta_title=?,meta_desc=?,meta_keyword=? WHERE id = ?`;
    const contact_data = [whatsapp_no, phone_no, email, title, meta_title, meta_desc, meta_keyword, contacts_id];
    db.query(contact_sql, contact_data, (err, result) => {
        const socials_sql = `UPDATE socials SET facabook=?,linkedin=?,instagram=?,youtube=?,twitter=? WHERE id=?`;
        const socials_data = [fb_link, linkedin_link, instagram_link, youtube_link, twitter_link, social_id];
        db.query(socials_sql, socials_data, (socials_err, socials_result) => {
            if (socials_err) {
                return res.send({
                    status: 'err',
                    message: 'Error updating social links: ' + socials_err
                });
            }
            db.query(address_sql, address_data, (address_err, address_result) => {
                if (address_err) {
                    return res.send({
                        status: 'err',
                        message: 'Error updating address: ' + address_err
                    });
                }
                // Return success response
                return res.send({
                    status: 'ok',
                    message: 'Contact details, social links, and address updated successfully'
                });
            });
        })
    })
}

// Contacts Feedback
exports.contactFeedback = (req, res) => {
    const phone = req.body.phone_no;
    const message = req.body.message;
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    const fullname = currentUserData.first_name + " " + currentUserData.last_name;
    const email = currentUserData.email;
    console.log(currentUserData.first_name, currentUserData.last_name, currentUserData.email);
    var mailOptions = {
        from: process.env.MAIL_USER,
        to: process.env.MAIL_SUPPORT,
        //to: 'pranab@scwebtech.com',
        subject: 'Feedback Mail From Contact',
        //html: ejs.renderFile(path.join(process.env.BASE_URL, '/views/email-template/', 'feedback.ejs'), { phone: phone, message: message })
        html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
        <style>
        body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
            font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
        }
        </style>
        <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
         <tbody>
          <tr>
           <td align="center" valign="top">
             <div id="template_header_image"><p style="margin-top: 0;"></p></div>
             <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdf0; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
              <tbody>
                <tr>
                 <td align="center" valign="top">
                   <!-- Header -->
                   <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffc107; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
                     <tbody>
                       <tr>
                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                           <h1 style="color: #ffc107; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 50px; font-weight: 400; line-height: 150%; margin: 0; text-align: left; text-shadow: 0 1px 0 #7797b4; -webkit-font-smoothing: antialiased;">Feedback Email</h1>
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
                                    <td colspan="2"><strong>Contact Info</strong></td>
                                  </tr>
                                  <tr>
                                    <td style="width:35%;">&nbsp;</td>
                                    <td>&nbsp;</td>
                                  </tr>
                                  <tr>
                                    <td style="width:35%;">Name:</td>
                                    <td>${fullname}</td>
                                  </tr>
                                  <tr>
                                    <td style="width:35%;">Email Address:</td>
                                    <td>${email}</td>
                                  </tr>
                                  <tr>
                                    <td style="width:35%;">Phone Number:</td>
                                    <td>${phone}</td>
                                  </tr>
                                  <tr>
                                    <td style="width:35%;">Message:</td>
                                    <td>${message}</td>
                                  </tr>
                                </table>
                                
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
    mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
            console.log(err);
            return res.send({
                status: 'not ok',
                message: 'Something went wrong'
            });
        } else {
            console.log('Mail Send: ', info.response);
            return res.send({
                status: 'ok',
                message: 'Thank you for your feedback'
            });
        }
    })
}

// Create FAQ
exports.createFAQ = async (req, res) => {
    //console.log(req.body);
    const faqArray = req.body.FAQ;
    //console.log(faqArray[0]);  
    //console.log(faqArray[1]);

    const Faq_Page_insert_values = [
        req.body.title,
        req.body.content,
        req.body.meta_title,
        req.body.meta_desc,
        req.body.keyword,
    ];
    try {
        const faqPageId = await comFunction.insertIntoFaqPages(Faq_Page_insert_values);
        console.log('ID:', faqPageId);
        await comFunction.insertIntoFaqCategories(faqArray);
        return res.send(
            {
                status: 'ok',
                data: faqPageId,
                message: 'FAQ Content successfully added'
            }
        )
    } catch (error) {
        console.error('Error during insertion:', error);
        return res.status(500).send({
            status: 'error',
            message: 'An error occurred while inserting FAQ data',
        });
    }
}

// Update FAQ
// exports.updateFAQ = async (req, res) => {
//     //console.log(req.body);
//     const faqArray = req.body.FAQ;
//     //console.log(faqArray[0]); 

//     const Faq_Page_insert_values = [
//         req.body.title,
//         req.body.content,
//         req.body.meta_title,
//         req.body.meta_desc,
//         req.body.keyword,
//         req.body.app_content,
//         req.body.countries_name
//     ];
//     try {
//         db.query('DELETE  FROM faq_categories', (del_faq_cat_err, del_faq_cat_res) => {
//             db.query('DELETE  FROM faq_item', async (del_faq_item_err, del_faq_item_res) => {
//                 const faqPageId = await comFunction.insertIntoFaqPages(Faq_Page_insert_values);
//                 console.log('ID:', faqPageId);
//                 await comFunction.insertIntoFaqCategories(faqArray);
//                 return res.send(
//                     {
//                         status: 'ok',
//                         data: faqPageId,
//                         message: 'FAQ Content successfully Updated'
//                     }
//                 )
//             })
//         });



//     } catch (error) {
//         console.error('Error during insertion:', error);
//         return res.status(500).send({
//             status: 'error',
//             message: 'An error occurred while inserting FAQ data',
//         });
//     }
// }

exports.updateFAQ = async (req, res) => {
    const { title, content, meta_title, meta_desc, keyword, app_content, countries_name, FAQ } = req.body;

    const Faq_Page_insert_values = [title, content, meta_title, meta_desc, keyword, app_content, countries_name];

    console.log("req.body.faq", req.body);
    try {
        // Delete existing FAQ categories and items for the given country
        db.query('DELETE FROM faq_categories WHERE country = ?', [countries_name], (del_faq_cat_err, del_faq_cat_res) => {
            if (del_faq_cat_err) {
                console.error('Error deleting FAQ categories:', del_faq_cat_err);
                return res.status(500).send({
                    status: 'error',
                    message: 'An error occurred while deleting FAQ categories',
                });
            }

            db.query('DELETE FROM faq_item WHERE country = ?', [countries_name], async (del_faq_item_err, del_faq_item_res) => {
                if (del_faq_item_err) {
                    console.error('Error deleting FAQ items:', del_faq_item_err);
                    return res.status(500).send({
                        status: 'error',
                        message: 'An error occurred while deleting FAQ items',
                    });
                }

                try {
                    const faqPageId = await comFunction.insertIntoFaqPages(Faq_Page_insert_values, countries_name);
                    console.log('FAQ Page ID:', faqPageId);

                    await comFunction.insertIntoFaqCategories(FAQ, countries_name);

                    return res.send({
                        status: 'ok',
                        data: faqPageId,
                        message: 'FAQ Content successfully Updated',
                    });
                } catch (insertError) {
                    console.error('Error during insertion:', insertError);
                    return res.status(500).send({
                        status: 'error',
                        message: 'An error occurred while inserting FAQ data',
                    });
                }
            });
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).send({
            status: 'error',
            message: 'An unexpected error occurred while updating FAQ data',
        });
    }
};



//Update FAQ Images
exports.updateFAQImages = async (req, res) => {
    //console.log('files',req.files);
    const { banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, banner_img_7, banner_img_8, app_banner_img } = req.files;
    // const img_arr = [banner_img_1,banner_img_2,banner_img_3,banner_img_4,banner_img_5,banner_img_6,banner_img_7,banner_img_8];
    const field_name = ['banner_img_1', 'banner_img_2', 'banner_img_3', 'banner_img_4', 'banner_img_5', 'banner_img_6', 'banner_img_7', 'banner_img_8', 'app_banner_img'];
    await field_name.forEach((item, key) => {
        //console.log(item, key);
        if (req.files[item]) {
            const sql = `UPDATE faq_pages SET ${item} = '${req.files[item][0].filename}' WHERE id = '1' `;
            db.query(sql, (err, result) => {
                if (err) throw err;
                //console.log(result);
            })
        }
    })
    res.redirect('/edit-faq');

}
// Update Home
// exports.updateHome = async (req, res) => {
//     // console.log('home', req.body);
//     //     console.log('file', req.files);
//     //return false;
//     const form_data = req.body;

//     const { home_id, title, meta_title, meta_desc, meta_keyword, bannner_content, for_business,
//         for_customer, cus_right_content, cus_right_button_link, cus_right_button_text, youtube_link,
//         youtube_1, youtube_2, youtube_3, youtube_4, youtube_5, youtube_6, youtube_7, youtube_8, youtube_9, youtube_10, fb_widget, twitter_widget,
//         org_responsibility_content, org_responsibility_buttton_link, org_responsibility_buttton_text,
//         about_us_content, about_us_button_link, about_us_button_text, bannner_content_2, bannner_hashtag, impression_number, impression_number_visibility, reviews_count, reviews_count_visibility, total_users_count, total_users_count_visibility, reviewers_guidelines_title, reviewers_guidelines_popup, review_form_demo_location, cus_right_facts_popup, org_responsibility_facts_popup, app_banner_title_1, app_banner_title_2, app_features_for_customer, app_review_content, app_features_hashtag, app_cus_right_content, app_cus_right_point, app_org_responsibility_content, app_org_responsibility_points, app_about_us_content_1, app_about_us_content_2, app_about_us_button_text, bannner_message } = req.body;

//     const { banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, cus_right_img_1, cus_right_img_2, cus_right_img_3, cus_right_img_4, cus_right_img_5,
//         cus_right_img_6, cus_right_img_7, cus_right_img_8, org_responsibility_img_1, org_responsibility_img_2, org_responsibility_img_3,
//         org_responsibility_img_4, org_responsibility_img_5, org_responsibility_img_6, org_responsibility_img_7, org_responsibility_img_8,
//         about_us_img, review_img_1, review_img_2, review_img_3, review_img_4, map_img, app_cus_right_img, app_org_responsibility_img } = req.files;

//     let app_features = [];
//     if (typeof app_features_for_customer == 'string') {
//         app_features.push(app_features_for_customer);
//     } else {
//         app_features = [...app_features_for_customer];
//         //app_features = app_features.concat(app_features_for_customer);
//     }
//     const app_customer_feature = JSON.stringify(app_features);

//     let app_hashtag = [];
//     if (typeof app_features_hashtag == 'string') {
//         app_hashtag.push(app_features_hashtag);
//     } else {
//         app_hashtag = [...app_features_hashtag];
//     }
//     const app_feature_hashtag = JSON.stringify(app_hashtag);

//     let cus_right_point = [];
//     if (typeof app_cus_right_point == 'string') {
//         cus_right_point.push(app_cus_right_point);
//     } else {
//         cus_right_point = [...app_cus_right_point];
//     }
//     const app_cus_right_points = JSON.stringify(cus_right_point);

//     let org_responsibility_point = [];
//     if (typeof app_org_responsibility_points == 'string') {
//         org_responsibility_point.push(app_org_responsibility_points);
//     } else {
//         org_responsibility_point = [...app_org_responsibility_points];
//     }
//     const app_org_responsibility_point = JSON.stringify(org_responsibility_point);

//     const meta_value = [bannner_content, for_business,
//         for_customer, cus_right_content, cus_right_button_link, cus_right_button_text, youtube_link,
//         youtube_1, youtube_2, youtube_3, youtube_4, fb_widget, twitter_widget,
//         org_responsibility_content, org_responsibility_buttton_link, org_responsibility_buttton_text,
//         about_us_content, about_us_button_link, about_us_button_text, bannner_content_2, bannner_hashtag, impression_number, impression_number_visibility, reviews_count, reviews_count_visibility, total_users_count, total_users_count_visibility, reviewers_guidelines_title, reviewers_guidelines_popup, review_form_demo_location, cus_right_facts_popup, org_responsibility_facts_popup, youtube_5, youtube_6, youtube_7, youtube_8, youtube_9, youtube_10, app_banner_title_1, app_banner_title_2, app_review_content, app_customer_feature, app_feature_hashtag, app_cus_right_content, app_cus_right_points, app_org_responsibility_content, app_org_responsibility_point, app_about_us_content_1, app_about_us_content_2, app_about_us_button_text, bannner_message];

//     const meta_key = ['bannner_content', 'for_business',
//         'for_customer', 'cus_right_content', 'cus_right_button_link', 'cus_right_button_text', 'youtube_link', 'youtube_1', 'youtube_2', 'youtube_3', 'youtube_4', 'fb_widget', 'twitter_widget',
//         'org_responsibility_content', 'org_responsibility_buttton_link', 'org_responsibility_buttton_text',
//         'about_us_content', 'about_us_button_link', 'about_us_button_text', 'bannner_content_2', 'bannner_hashtag', 'impression_number', 'impression_number_visibility', 'reviews_count', 'reviews_count_visibility', 'total_users_count', 'total_users_count_visibility', 'reviewers_guidelines_title', 'reviewers_guidelines_popup', 'review_form_demo_location', 'cus_right_facts_popup', 'org_responsibility_facts_popup', 'youtube_5', 'youtube_6', 'youtube_7', 'youtube_8', 'youtube_9', 'youtube_10', 'app_banner_title_1', 'app_banner_title_2', 'app_review_content', 'app_customer_feature', 'app_feature_hashtag', 'app_cus_right_content', 'app_cus_right_points', 'app_org_responsibility_content', 'app_org_responsibility_point', 'app_about_us_content_1', 'app_about_us_content_2', 'app_about_us_button_text', 'bannner_message'];

//     await meta_value.forEach((element, index) => {
//         //console.log(element, index);
//         const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
//         const check_data = [home_id, meta_key[index]];
//         db.query(check_sql, check_data, (check_err, check_result) => {
//             if (check_err) {
//                 return res.send(
//                     {
//                         status: 'err',
//                         data: '',
//                         message: 'An error occurred while processing your request'
//                     }
//                 )
//             } else {
//                 if (check_result.length > 0) {
//                     const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
//                     const update_data = [element, home_id, meta_key[index]];
//                     db.query(update_sql, update_data, (update_err, update_result) => {
//                         if (update_err) throw update_err;
//                     })
//                 } else {
//                     const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
//                     const insert_data = [home_id, meta_key[index], element];
//                     db.query(insert_sql, insert_data, (insert_err, insert_result) => {
//                         if (insert_err) throw insert_err;
//                     })
//                 }
//             }
//         });
//     });

//     const file_meta_value = [banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, cus_right_img_1, cus_right_img_2, cus_right_img_3, cus_right_img_4, cus_right_img_5,
//         cus_right_img_6, cus_right_img_7, cus_right_img_8, org_responsibility_img_1, org_responsibility_img_2, org_responsibility_img_3,
//         org_responsibility_img_4, org_responsibility_img_5, org_responsibility_img_6, org_responsibility_img_7, org_responsibility_img_8,
//         about_us_img, review_img_1, review_img_2, review_img_3, review_img_4, map_img, app_cus_right_img, app_org_responsibility_img];

//     const file_meta_key = ['banner_img_1', 'banner_img_2', 'banner_img_3', 'banner_img_4', 'banner_img_5', 'banner_img_6', 'cus_right_img_1', 'cus_right_img_2', 'cus_right_img_3', 'cus_right_img_4', 'cus_right_img_5',
//         'cus_right_img_6', 'cus_right_img_7', 'cus_right_img_8', 'org_responsibility_img_1', 'org_responsibility_img_2', 'org_responsibility_img_3',
//         'org_responsibility_img_4', 'org_responsibility_img_5', 'org_responsibility_img_6', 'org_responsibility_img_7', 'org_responsibility_img_8',
//         'about_us_img', 'review_img_1', 'review_img_2', 'review_img_3', 'review_img_4', 'map_img', 'app_cus_right_img', 'app_org_responsibility_img'];

//     await file_meta_key.forEach((item, key) => {
//         //console.log(item, key);
//         if (req.files[item]) {
//             //console.log(file_meta_value[key][0].filename);
//             const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
//             const check_data = [home_id, item];
//             db.query(check_sql, check_data, (check_err, check_result) => {
//                 if (check_err) {
//                     return res.send(
//                         {
//                             status: 'err',
//                             data: '',
//                             message: 'An error occurred while processing your request'
//                         }
//                     )
//                 } else {
//                     if (check_result.length > 0) {
//                         const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
//                         const update_data = [file_meta_value[key][0].filename, home_id, item];
//                         db.query(update_sql, update_data, (update_err, update_result) => {
//                             if (update_err) throw update_err;
//                         })
//                     } else {
//                         const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
//                         const insert_data = [home_id, item, file_meta_value[key][0].filename];
//                         db.query(insert_sql, insert_data, (insert_err, insert_result) => {
//                             if (insert_err) throw insert_err;
//                         })
//                     }
//                 }
//             });
//         }

//     });

//     const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ? WHERE id  = ?`;
//     const title_data = [title, meta_title, meta_desc, meta_keyword, home_id];
//     //console.log(title_data);
//     db.query(title_sql, title_data, (title_err, title_result) => {
//         return res.send(
//             {
//                 status: 'ok',
//                 data: '',
//                 message: ' Updated successfully'
//             }
//         )
//     })
// }
exports.updateHome = async (req, res) => {
    console.log('home', req.body);
    //     console.log('file', req.files);
    //return false;
    const form_data = req.body;

    const { home_id, title, meta_title, meta_desc, meta_keyword, bannner_content, for_business,
        for_customer, cus_right_content, cus_right_button_link, cus_right_button_text, youtube_link,
        youtube_1, youtube_2, youtube_3, youtube_4, youtube_5, youtube_6, youtube_7, youtube_8, youtube_9, youtube_10, fb_widget, twitter_widget,
        org_responsibility_content, org_responsibility_buttton_link, org_responsibility_buttton_text,
        about_us_content, about_us_button_link, about_us_button_text, bannner_content_2, bannner_hashtag, impression_number, impression_number_visibility, reviews_count, reviews_count_visibility, total_users_count, total_users_count_visibility, reviewers_guidelines_title, reviewers_guidelines_popup, review_form_demo_location, cus_right_facts_popup, org_responsibility_facts_popup, app_banner_title_1, app_banner_title_2, app_features_for_customer, app_review_content, app_features_hashtag, app_cus_right_content, app_cus_right_point, app_org_responsibility_content, app_org_responsibility_points, app_about_us_content_1, app_about_us_content_2, app_about_us_button_text, bannner_message, country_name } = req.body;

    const { banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, cus_right_img_1, cus_right_img_2, cus_right_img_3, cus_right_img_4, cus_right_img_5,
        cus_right_img_6, cus_right_img_7, cus_right_img_8, org_responsibility_img_1, org_responsibility_img_2, org_responsibility_img_3,
        org_responsibility_img_4, org_responsibility_img_5, org_responsibility_img_6, org_responsibility_img_7, org_responsibility_img_8,
        about_us_img, review_img_1, review_img_2, review_img_3, review_img_4, map_img, app_cus_right_img, app_org_responsibility_img } = req.files;

    // let app_features = [];
    // if (typeof app_features_for_customer == 'string') {
    //     app_features.push(app_features_for_customer);
    // } else {
    //     app_features = [...app_features_for_customer];
    //     //app_features = app_features.concat(app_features_for_customer);
    // }
    // const app_customer_feature = JSON.stringify(app_features);

    let app_features = [];

    if (typeof app_features_for_customer == 'string') {
        app_features.push(app_features_for_customer);
    } else if (Array.isArray(app_features_for_customer)) {
        app_features = [...app_features_for_customer];
    } else if (app_features_for_customer !== null && typeof app_features_for_customer === 'object') {
        console.error('app_features_for_customer is an object but not an array:', app_features_for_customer);
    } else {
        console.error('app_features_for_customer is null or undefined:', app_features_for_customer);
    }
    const app_customer_feature = JSON.stringify(app_features);



    let app_hashtag = [];
    if (app_features_hashtag !== null && app_features_hashtag !== undefined) {
        if (typeof app_features_hashtag === 'string') {
            app_hashtag.push(app_features_hashtag);
        } else {
            app_hashtag = [...app_features_hashtag];
        }
    }
    const app_feature_hashtag = JSON.stringify(app_hashtag);

    let cus_right_point = [];
    if (app_cus_right_point !== null && app_cus_right_point !== undefined) {
        if (typeof app_cus_right_point === 'string') {
            cus_right_point.push(app_cus_right_point);
        } else {
            cus_right_point = [...app_cus_right_point];
        }
    }
    const app_cus_right_points = JSON.stringify(cus_right_point);

    let org_responsibility_point = [];
    if (app_org_responsibility_points !== null && app_org_responsibility_points !== undefined) {
        if (typeof app_org_responsibility_points === 'string') {
            org_responsibility_point.push(app_org_responsibility_points);
        } else {
            org_responsibility_point = [...app_org_responsibility_points];
        }
    }
    const app_org_responsibility_point = JSON.stringify(org_responsibility_point);

    const meta_value = [bannner_content, for_business,
        for_customer, cus_right_content, cus_right_button_link, cus_right_button_text, youtube_link,
        youtube_1, youtube_2, youtube_3, youtube_4, fb_widget, twitter_widget,
        org_responsibility_content, org_responsibility_buttton_link, org_responsibility_buttton_text,
        about_us_content, about_us_button_link, about_us_button_text, bannner_content_2, bannner_hashtag, impression_number, impression_number_visibility, reviews_count, reviews_count_visibility, total_users_count, total_users_count_visibility, reviewers_guidelines_title, reviewers_guidelines_popup, review_form_demo_location, cus_right_facts_popup, org_responsibility_facts_popup, youtube_5, youtube_6, youtube_7, youtube_8, youtube_9, youtube_10, app_banner_title_1, app_banner_title_2, app_review_content, app_customer_feature, app_feature_hashtag, app_cus_right_content, app_cus_right_points, app_org_responsibility_content, app_org_responsibility_point, app_about_us_content_1, app_about_us_content_2, app_about_us_button_text, bannner_message];

    const meta_key = ['bannner_content', 'for_business',
        'for_customer', 'cus_right_content', 'cus_right_button_link', 'cus_right_button_text', 'youtube_link', 'youtube_1', 'youtube_2', 'youtube_3', 'youtube_4', 'fb_widget', 'twitter_widget',
        'org_responsibility_content', 'org_responsibility_buttton_link', 'org_responsibility_buttton_text',
        'about_us_content', 'about_us_button_link', 'about_us_button_text', 'bannner_content_2', 'bannner_hashtag', 'impression_number', 'impression_number_visibility', 'reviews_count', 'reviews_count_visibility', 'total_users_count', 'total_users_count_visibility', 'reviewers_guidelines_title', 'reviewers_guidelines_popup', 'review_form_demo_location', 'cus_right_facts_popup', 'org_responsibility_facts_popup', 'youtube_5', 'youtube_6', 'youtube_7', 'youtube_8', 'youtube_9', 'youtube_10', 'app_banner_title_1', 'app_banner_title_2', 'app_review_content', 'app_customer_feature', 'app_feature_hashtag', 'app_cus_right_content', 'app_cus_right_points', 'app_org_responsibility_content', 'app_org_responsibility_point', 'app_about_us_content_1', 'app_about_us_content_2', 'app_about_us_button_text', 'bannner_message'];

    await meta_value.forEach((element, index) => {
        //console.log(element, index);
        const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
        const check_data = [home_id, meta_key[index]];
        db.query(check_sql, check_data, (check_err, check_result) => {
            if (check_err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request'
                    }
                )
            } else {
                if (check_result.length > 0) {
                    const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                    const update_data = [element, home_id, meta_key[index]];
                    db.query(update_sql, update_data, (update_err, update_result) => {
                        if (update_err) throw update_err;
                    })
                } else {
                    const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                    const insert_data = [home_id, meta_key[index], element];
                    db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                        if (insert_err) throw insert_err;
                    })
                }
            }
        });
    });

    const file_meta_value = [banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, cus_right_img_1, cus_right_img_2, cus_right_img_3, cus_right_img_4, cus_right_img_5,
        cus_right_img_6, cus_right_img_7, cus_right_img_8, org_responsibility_img_1, org_responsibility_img_2, org_responsibility_img_3,
        org_responsibility_img_4, org_responsibility_img_5, org_responsibility_img_6, org_responsibility_img_7, org_responsibility_img_8,
        about_us_img, review_img_1, review_img_2, review_img_3, review_img_4, map_img, app_cus_right_img, app_org_responsibility_img];

    const file_meta_key = ['banner_img_1', 'banner_img_2', 'banner_img_3', 'banner_img_4', 'banner_img_5', 'banner_img_6', 'cus_right_img_1', 'cus_right_img_2', 'cus_right_img_3', 'cus_right_img_4', 'cus_right_img_5',
        'cus_right_img_6', 'cus_right_img_7', 'cus_right_img_8', 'org_responsibility_img_1', 'org_responsibility_img_2', 'org_responsibility_img_3',
        'org_responsibility_img_4', 'org_responsibility_img_5', 'org_responsibility_img_6', 'org_responsibility_img_7', 'org_responsibility_img_8',
        'about_us_img', 'review_img_1', 'review_img_2', 'review_img_3', 'review_img_4', 'map_img', 'app_cus_right_img', 'app_org_responsibility_img'];

    await file_meta_key.forEach((item, key) => {
        //console.log(item, key);
        if (req.files[item]) {
            //console.log(file_meta_value[key][0].filename);
            const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
            const check_data = [home_id, item];
            db.query(check_sql, check_data, (check_err, check_result) => {
                if (check_err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request'
                        }
                    )
                } else {
                    if (check_result.length > 0) {
                        const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                        const update_data = [file_meta_value[key][0].filename, home_id, item];
                        db.query(update_sql, update_data, (update_err, update_result) => {
                            if (update_err) throw update_err;
                        })
                    } else {
                        const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                        const insert_data = [home_id, item, file_meta_value[key][0].filename];
                        db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                            if (insert_err) throw insert_err;
                        })
                    }
                }
            });
        }

    });

    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?, country = ? WHERE id  = ?`;
    const title_data = [title, meta_title, meta_desc, meta_keyword, country_name, home_id];
    //console.log(title_data);
    db.query(title_sql, title_data, (title_err, title_result) => {
        return res.send(
            {
                status: 'ok',
                data: '',
                message: ' Updated successfully'
            }
        )
    })
}

//--Submit Review----//

exports.submitReview = async (req, res) => {
    const encodedUserData = req.cookies.user;
    console.log('submitReviewy', req.body);
    //return false;
    try {
        if (encodedUserData) {
            const currentUserData = JSON.parse(encodedUserData);
            //console.log(currentUserData);
            const userId = currentUserData.user_id;
            const company = await comFunction.createcompany(req.body, userId);
            console.log('companyInfo', company)
            const review = await comFunction.createreview(req.body, userId, company);
            // Render the 'edit-user' EJS view and pass the data
            if (company && review) {
                console.log('submit review:', review)
                const template = `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                <style>
                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                }
                </style>
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
                               <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">New Review</h1>
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
                                            <strong>Hello,</strong>
                                            <p style="font-size:15px; line-height:20px">A new review submitted. <a class="btn btn-primary" href="${process.env.MAIN_URL}edit-review/${review}">Click here </a>to check this review.</p>
                                            </td>
                                          </tr>
                                        </table>
                                        
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
               </div>`;
                var mailOptions = {
                    from: process.env.MAIL_USER,
                    //to: 'pranab@scwebtech.com',
                    to: process.env.MAIL_USER,
                    subject: 'New review added',
                    html: template
                }

                mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                        return res.send({
                            status: 'not ok',
                            message: 'Something went wrong'
                        });
                    } else {
                        console.log('Mail Send: ', info.response);
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Review Mail send successfully'
                            }
                        )
                    }
                })
                return res.send(
                    {
                        status: 'ok',
                        data: '',
                        company,
                        message: 'Review successfully posted, please wait for admin approval'
                    }
                );
            } else {
                return res.send(
                    {
                        status: 'error',
                        data: { company, review },
                        message: 'Error occurred please try again'
                    }
                );
            }
        } else {
            //res.redirect('sign-in');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
}
//--Submit Review----//

exports.submitreview = async (req, res) => {
    const encodedUserData = req.cookies.user;
    console.log('submitReviewssss', req.body);
    //return false;

    const getcompanyquery = `SELECT ID FROM company WHERE company_name = ?`;
    const getcompanyvalue = await query(getcompanyquery, [req.body.company_name]);
    console.log("getcompanyvalue", getcompanyvalue);
    if (getcompanyvalue.length > 0) {
        var CompanyID = getcompanyvalue[0].ID;
        console.log("CompanyID", CompanyID);
    }

    try {
        if (encodedUserData) {
            const currentUserData = JSON.parse(encodedUserData);
            //console.log(currentUserData);
            const userId = currentUserData.user_id;
            const company = await comFunction.createcompany(req.body, userId);
            console.log('companyInfo', company)
            const review = await comFunction.createreview(req.body, userId, company);
            // Render the 'edit-user' EJS view and pass the data
            if (company && review) {
                console.log('submit review:', review)
                const template = `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
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
                               <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">New Review</h1>
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
                                            <strong>Hello,</strong>
                                            <p style="font-size:15px; line-height:20px">A new review submitted. <a class="btn btn-primary" href="${process.env.MAIN_URL}edit-review/${review}">Click here </a>to check this review.</p>
                                            </td>
                                          </tr>
                                        </table>
                                        
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
               </div>`;
                var mailOptions = {
                    from: process.env.MAIL_USER,
                    //to: 'pranab@scwebtech.com',
                    to: process.env.MAIL_USER,
                    subject: 'New review added',
                    html: template
                }

                mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                        return res.send({
                            status: 'not ok',
                            message: 'Something went wrong'
                        });
                    } else {
                        console.log('Mail Send: ', info.response);
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Review Mail send successfully'
                            }
                        )
                    }
                })
                return res.send(
                    {
                        status: 'ok',
                        data: '',
                        company,
                        message: 'Review successfully posted, please wait for admin approval'
                    }
                );
            } else {
                return res.send(
                    {
                        status: 'error',
                        data: { company, review },
                        message: 'Error occurred please try again', error
                    }
                );
            }
        } else {
            //res.redirect('sign-in');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
}


exports.editUserReview = async (req, res) => {
    const encodedUserData = req.cookies.user;
    console.log(req.body);
    try {
        if (encodedUserData) {
            const currentUserData = JSON.parse(encodedUserData);
            //console.log(currentUserData);
            const userId = currentUserData.user_id;
            const review = await comFunction2.updateReview(req.body);

            const template = `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
            <style>
            body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
            }
            </style>
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
                               <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">User review update</h1>
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
                                        <strong>Hello,</strong>
                                        <p style="font-size:15px; line-height:20px">A new review submitted. <a class="btn btn-primary" href="${process.env.MAIN_URL}edit-review/${review}">Click here </a>to check this review.</p>
                                        </td>
                                      </tr>
                                    </table>
                                    
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
           </div>`;
            var mailOptions = {
                from: process.env.MAIL_USER,
                //to: 'pranab@scwebtech.com',
                to: process.env.MAIL_USER,
                subject: 'User review update',
                html: template
            }

            await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log(err);
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong'
                    });
                } else {
                    console.log('Mail Send: ', info.response);

                }
            })

            return res.send(
                {
                    status: 'ok',
                    data: '',
                    message: 'Review updated successfully please wait for admin approval'
                }
            );

        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
}

//--- Delete Review ----//
exports.deleteReview = (req, res) => {
    //console.log(req.body.companyid);
    sql = `DELETE FROM reviews WHERE id = ?`;
    const data = [req.body.reviewid];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: 'Something went wrong' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Review successfully deleted'
            });
        }

    })

}

// Upadte About
exports.updateAbout = async (req, res) => {
    console.log('updateAbout', req.body);
    // console.log('file', req.files);
    const form_data = req.body;

    const { about_id, title, meta_title, meta_desc, meta_keyword, banner_content, mission_title,
        mission_content, platform_content, CEchoesTechnology_would_content, customers_content,
        service_providers_content, app_banner_content_1, app_banner_content_2, app_platform_content_1, app_platform_content_2, country_name } = req.body;

    const { banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, banner_img_7, banner_img_8,
        platform_img_1, platform_img_2, platform_img_3, platform_img_4, platform_img_5, platform_img_6, platform_img_7,
        platform_img_8, right_img_1, right_img_2, app_banner_img_1, app_banner_img_2 } = req.files;

    const meta_value = [banner_content, mission_title,
        mission_content, platform_content, CEchoesTechnology_would_content, customers_content,
        service_providers_content, app_banner_content_1, app_banner_content_2, app_platform_content_1, app_platform_content_2];

    const meta_key = ['banner_content', 'mission_title',
        'mission_content', 'platform_content', 'CEchoesTechnology_would_content', 'customers_content',
        'service_providers_content', 'app_banner_content_1', 'app_banner_content_2', 'app_platform_content_1', 'app_platform_content_2'];

    await meta_value.forEach((element, index) => {
        //console.log(element, index);
        const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
        const check_data = [about_id, meta_key[index]];
        db.query(check_sql, check_data, (check_err, check_result) => {
            if (check_err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request'
                    }
                )
            } else {
                if (check_result.length > 0) {
                    const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                    const update_data = [element, about_id, meta_key[index]];
                    db.query(update_sql, update_data, (update_err, update_result) => {
                        if (update_err) throw update_err;
                    })
                } else {
                    const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                    const insert_data = [about_id, meta_key[index], element];
                    db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                        if (insert_err) throw insert_err;
                    })
                }
            }
        });
    });

    const file_meta_value = [banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, banner_img_7, banner_img_8,
        platform_img_1, platform_img_2, platform_img_3, platform_img_4, platform_img_5, platform_img_6, platform_img_7,
        platform_img_8, right_img_1, right_img_2, app_banner_img_1, app_banner_img_2];

    const file_meta_key = ['banner_img_1', 'banner_img_2', 'banner_img_3', 'banner_img_4', 'banner_img_5', 'banner_img_6', 'banner_img_7', 'banner_img_8',
        'platform_img_1', 'platform_img_2', 'platform_img_3', 'platform_img_4', 'platform_img_5', 'platform_img_6', 'platform_img_7',
        'platform_img_8', 'right_img_1', 'right_img_2', 'app_banner_img_1', 'app_banner_img_2'];

    await file_meta_key.forEach((item, key) => {
        //console.log(item, key);
        if (req.files[item]) {
            //console.log(file_meta_value[key][0].filename);
            const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
            const check_data = [about_id, item];
            db.query(check_sql, check_data, (check_err, check_result) => {
                if (check_err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request'
                        }
                    )
                } else {
                    if (check_result.length > 0) {
                        const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                        const update_data = [file_meta_value[key][0].filename, about_id, item];
                        db.query(update_sql, update_data, (update_err, update_result) => {
                            if (update_err) throw update_err;
                        })
                    } else {
                        const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                        const insert_data = [about_id, item, file_meta_value[key][0].filename];
                        db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                            if (insert_err) throw insert_err;
                        })
                    }
                }
            });
        }

    });

    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?, country = ? WHERE id  = ?`;
    const title_data = [title, meta_title, meta_desc, meta_keyword, country_name, about_id];
    //console.log(title_data);
    db.query(title_sql, title_data, (title_err, title_result) => {
        return res.send(
            {
                status: 'ok',
                data: '',
                message: 'Updated successfully'
            }
        )
    })
}

// Create Featured Company
exports.creatFeaturedCompany = (req, res) => {
    const { featured_company_id, comp_short_desc, comp_url, status, order } = req.body;
    sql = `INSERT INTO featured_companies ( company_id, short_desc, link, status, ordering) VALUES (?,?,?,?,?)`;
    const data = [featured_company_id, comp_short_desc, comp_url, status, order];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong'
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Featured Company Created successfully'
            });
        }

    })
}

// Update Featured Company
exports.updateFeaturedCompany = (req, res) => {
    const { comp_id, comp_name, comp_short_desc, comp_url, status, order } = req.body;
    sql = `UPDATE featured_companies SET  short_desc = ?, link = ?, status = ?, ordering = ? WHERE id = ?`;
    const data = [comp_short_desc, comp_url, status, order, comp_id];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong'
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Featured Company Updated Successfully'
            });
        }

    })
}

// Delete Featured Company
exports.deleteFeaturedCompany = (req, res) => {
    // const { comp_id, comp_name, comp_short_desc, comp_url, status, order } = req.body;
    sql = `DELETE FROM featured_companies WHERE id = ?`;
    const data = [comp_short_desc, comp_url, status, order, comp_id];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong'
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Featured Company Updated Successfully'
            });
        }

    })
}

// Update Business
exports.updateBusiness = async (req, res) => {
    console.log('business', req.body);
    console.log('file', req.files);
    //return false;
    const { business_id, title, meta_title, meta_desc, meta_keyword, bannner_content, features_title,
        feature_content, feature_icon, advantage_title, advantage_content, dont_forget_title,
        dont_forget_content_1, dont_forget_content_2, did_you_know_title, did_you_know_content_1,
        did_you_know_content_2, upcoming_features_title, upcoming_features_content, bottom_content,
        app_bannner_content_title, app_bannner_content_1, app_bannner_content_2, app_advantage_point,
        app_dont_forget_content_1_title, app_dont_forget_content_1, app_dont_forget_content_2_title,
        app_dont_forget_content_2, basic_plan_content, standard_plan_content, advanced_plan_content,
        premium_plan_content, enterprice_plan_content, country_name } = req.body;

    const { banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, banner_img_7, banner_img_8, advantage_img_1, advantage_img_2, advantage_img_3, advantage_img_4, advantage_img_5, advantage_img_6, advantage_img_7, advantage_img_8, did_you_know_img, app_banner_img_1, app_banner_img_2 } = req.files;


    // let advantage_point = [];
    // if (typeof app_advantage_point == 'string') {
    //     advantage_point.push(app_advantage_point);
    // } else {
    //     advantage_point = [...app_advantage_point];
    // }
    // const app_advantage_points = JSON.stringify(advantage_point);


    let advantage_point = [];
    if (Array.isArray(app_advantage_point)) {
        advantage_point = [...app_advantage_point];
    } else if (typeof app_advantage_point === 'string') {
        advantage_point.push(app_advantage_point);
    } else if (app_advantage_point != null) {
        console.error('Unexpected type for app_advantage_point:', app_advantage_point);
    }
    const app_advantage_points = JSON.stringify(advantage_point);


    const meta_value = [bannner_content, features_title, advantage_title, advantage_content, dont_forget_title,
        dont_forget_content_1, dont_forget_content_2, did_you_know_title, did_you_know_content_1, did_you_know_content_2,
        upcoming_features_title, bottom_content, app_bannner_content_title, app_bannner_content_1, app_bannner_content_2,
        app_dont_forget_content_1_title, app_dont_forget_content_1, app_dont_forget_content_2_title, app_dont_forget_content_2,
        app_advantage_points, basic_plan_content, standard_plan_content, advanced_plan_content,
        premium_plan_content, enterprice_plan_content];

    const meta_key = ['bannner_content', 'features_title', 'advantage_title', 'advantage_content', 'dont_forget_title',
        'dont_forget_content_1', 'dont_forget_content_2', 'did_you_know_title', 'did_you_know_content_1', 'did_you_know_content_2',
        'upcoming_features_title', 'bottom_content', 'app_bannner_content_title', 'app_bannner_content_1', 'app_bannner_content_2',
        'app_dont_forget_content_1_title', 'app_dont_forget_content_1', 'app_dont_forget_content_2_title', 'app_dont_forget_content_2',
        'app_advantage_points', 'basic_plan_content', 'standard_plan_content', 'advanced_plan_content',
        'premium_plan_content', 'enterprice_plan_content'];

    await meta_value.forEach((element, index) => {
        //console.log(element, index);
        const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
        const check_data = [business_id, meta_key[index]];
        db.query(check_sql, check_data, (check_err, check_result) => {
            if (check_err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request'
                    }
                )
            } else {
                if (check_result.length > 0) {
                    const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                    const update_data = [element, business_id, meta_key[index]];
                    db.query(update_sql, update_data, (update_err, update_result) => {
                        if (update_err) throw update_err;
                    })
                } else {
                    const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                    const insert_data = [business_id, meta_key[index], element];
                    db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                        if (insert_err) throw insert_err;
                    })
                }
            }
        });
    });

    const file_meta_value = [banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, banner_img_7, banner_img_8, advantage_img_1, advantage_img_2, advantage_img_3, advantage_img_4, advantage_img_5,
        advantage_img_6, advantage_img_7, advantage_img_8, did_you_know_img, app_banner_img_1, app_banner_img_2];

    const file_meta_key = ['banner_img_1', 'banner_img_2', 'banner_img_3', 'banner_img_4', 'banner_img_5', 'banner_img_6', 'banner_img_7', 'banner_img_8', 'advantage_img_1', 'advantage_img_2', 'advantage_img_3', 'advantage_img_4', 'advantage_img_5', 'advantage_img_6', 'advantage_img_7', 'advantage_img_8', 'did_you_know_img', 'app_banner_img_1', 'app_banner_img_2'];

    await file_meta_key.forEach((item, key) => {
        //console.log(item, key);
        if (req.files[item]) {
            //console.log(file_meta_value[key][0].filename);
            const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
            const check_data = [business_id, item];
            db.query(check_sql, check_data, (check_err, check_result) => {
                if (check_err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request'
                        }
                    )
                } else {
                    if (check_result.length > 0) {
                        const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                        const update_data = [file_meta_value[key][0].filename, business_id, item];
                        db.query(update_sql, update_data, (update_err, update_result) => {
                            if (update_err) throw update_err;
                        })
                    } else {
                        const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                        const insert_data = [business_id, item, file_meta_value[key][0].filename];
                        db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                            if (insert_err) throw insert_err;
                        })
                    }
                }
            });
        }
    });
    await comFunction2.deleteBusinessFeature();
    await comFunction2.deleteBusinessUpcomingFeature();
    if (typeof feature_content === 'string') {
        const insert_query = `INSERT INTO business_features ( content, image, existing_or_upcoming) VALUES (?, ?,'existing')`;
        const insert_data = [feature_content, feature_icon];
        db.query(insert_query, insert_data, (insert_err, insert_res) => {
            if (insert_err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request'
                    }
                )
            }
        });
    } else {
        await feature_content.forEach((value, key) => {
            const insert_query = `INSERT INTO business_features ( content, image, existing_or_upcoming) VALUES (?, ?,'existing')`;
            const insert_data = [value, feature_icon[key]];
            db.query(insert_query, insert_data, (insert_err, insert_res) => {
                if (insert_err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request'
                        }
                    )
                }
            });
        });
    }
    if (typeof upcoming_features_content === 'string') {
        const insert_query = `INSERT INTO business_features ( content, existing_or_upcoming) VALUES (?,'upcoming')`;
        const insert_data = [upcoming_features_content];
        db.query(insert_query, insert_data, (insert_err, insert_res) => {
            if (insert_err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request'
                    }
                )
            }
        });
    } else {
        await upcoming_features_content.forEach((value, key) => {
            const insert_query = `INSERT INTO business_features ( content, existing_or_upcoming) VALUES (?,'upcoming')`;
            const insert_data = [value];
            db.query(insert_query, insert_data, (insert_err, insert_res) => {
                if (insert_err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request'
                        }
                    )
                }
            });
        })
    }
    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?, country = ? WHERE id  = ?`;
    const title_data = [title, meta_title, meta_desc, meta_keyword, country_name, business_id];
    //console.log(title_data);
    db.query(title_sql, title_data, (title_err, title_result) => {
        return res.send(
            {
                status: 'ok',
                data: '',
                message: 'Updated successfully'
            }
        )
    })
}

// Update Privacy Policy
exports.updatePrivacy = (req, res) => {
    //console.log('Privacy', req.body);

    const { common_id, title, meta_title, meta_desc, keyword, content, country_name } = req.body;
    console.log("updateprivacy", req.body);

    const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
    const check_data = [common_id, "content"];
    db.query(check_sql, check_data, (check_err, check_result) => {
        if (check_err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request'
                }
            )
        } else {
            if (check_result.length > 0) {
                const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                const update_data = [content, common_id, 'content'];
                db.query(update_sql, update_data, (update_err, update_result) => {
                    if (update_err) throw update_err;
                    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?, country = ? WHERE id  = ?`;
                    const title_data = [title, meta_title, meta_desc, keyword, country_name, common_id];
                    //console.log(title_data);
                    db.query(title_sql, title_data, (title_err, title_result) => {
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Privacy policy update successfully'
                            }
                        )
                    })
                })
            } else {
                const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                const insert_data = [common_id, 'content', content];
                db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                    if (insert_err) throw insert_err;
                    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?, country = ? WHERE id  = ?`;
                    const title_data = [title, meta_title, meta_desc, keyword, country_name, common_id];

                    console.log("title_data", title_data);
                    db.query(title_sql, title_data, (title_err, title_result) => {
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Privacy policy updated successfully'
                            }
                        )
                    })
                })
            }
        }
    });


}

// Update Disclaimer
exports.updateDisclaimer = (req, res) => {
    //console.log('Privacy', req.body);

    const { common_id, title, meta_title, meta_desc, keyword, content, country_name } = req.body;

    const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
    const check_data = [common_id, "content"];
    db.query(check_sql, check_data, (check_err, check_result) => {
        if (check_err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request'
                }
            )
        } else {
            if (check_result.length > 0) {
                const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                const update_data = [content, common_id, 'content'];
                db.query(update_sql, update_data, (update_err, update_result) => {
                    if (update_err) throw update_err;
                    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?,country = ? WHERE id  = ?`;
                    const title_data = [title, meta_title, meta_desc, keyword, country_name, common_id];
                    //console.log(title_data);
                    db.query(title_sql, title_data, (title_err, title_result) => {
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Disclaimer updated successfully'
                            }
                        )
                    })
                })
            } else {
                const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                const insert_data = [common_id, 'content', content];
                db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                    if (insert_err) throw insert_err;
                    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?,country = ? WHERE id  = ?`;
                    const title_data = [title, meta_title, meta_desc, keyword, country_name, common_id];
                    //console.log(title_data);
                    db.query(title_sql, title_data, (title_err, title_result) => {
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Disclaimer updated successfully'
                            }
                        )
                    })
                })
            }
        }
    });


}

// Update Terms Of Service
exports.updateTermsOfService = (req, res) => {
    console.log('updateTermsOfService', req.body);

    const { common_id, title, meta_title, meta_desc, keyword, content, country_name } = req.body;

    const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
    const check_data = [common_id, "content"];
    db.query(check_sql, check_data, (check_err, check_result) => {
        if (check_err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request'
                }
            )
        } else {
            if (check_result.length > 0) {
                const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                const update_data = [content, common_id, 'content'];
                db.query(update_sql, update_data, (update_err, update_result) => {
                    if (update_err) throw update_err;
                    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?, country = ? WHERE id  = ?`;
                    const title_data = [title, meta_title, meta_desc, keyword, country_name, common_id];
                    //console.log(title_data);
                    db.query(title_sql, title_data, (title_err, title_result) => {
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Terms Of Service updated successfully'
                            }
                        )
                    })
                })
            } else {
                const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                const insert_data = [common_id, 'content', content];
                db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                    if (insert_err) throw insert_err;
                    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?, country = ? WHERE id  = ?`;
                    const title_data = [title, meta_title, meta_desc, keyword, country_name, common_id];
                    //console.log(title_data);
                    db.query(title_sql, title_data, (title_err, title_result) => {
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Terms Of Service update successfully'
                            }
                        )
                    })
                })
            }
        }
    });


}
//ipdate cancellation and refund policy
exports.updateRefundPolicy = (req, res) => {
    //console.log('updateRefundPolicy', req.body);

    const { common_id, title, meta_title, meta_desc, keyword, content } = req.body;

    const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
    const check_data = [common_id, "content"];
    db.query(check_sql, check_data, (check_err, check_result) => {
        if (check_err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request'
                }
            )
        } else {
            if (check_result.length > 0) {
                const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                const update_data = [content, common_id, 'content'];
                db.query(update_sql, update_data, (update_err, update_result) => {
                    if (update_err) throw update_err;
                    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ? WHERE id  = ?`;
                    const title_data = [title, meta_title, meta_desc, keyword, common_id];
                    //console.log(title_data);
                    db.query(title_sql, title_data, (title_err, title_result) => {
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Cancellation and Refund Policy updated successfully.'
                            }
                        )
                    })
                })
            } else {
                const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                const insert_data = [common_id, 'content', content];
                db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                    if (insert_err) throw insert_err;
                    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ? WHERE id  = ?`;
                    const title_data = [title, meta_title, meta_desc, keyword, common_id];
                    //console.log(title_data);
                    db.query(title_sql, title_data, (title_err, title_result) => {
                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Cancellation and Refund Policy updated successfully.'
                            }
                        )
                    })
                })
            }
        }
    });


}

// Update complaint
exports.updateComplaint = async (req, res) => {
    //console.log('updateComplaint', req.body);
    //console.log('updateComplaint', req.files);
    const form_data = req.body;
    const { common_id, title, meta_title, meta_desc, meta_keyword, country_name } = req.body;
    const { banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, banner_img_7, banner_img_8 } = req.files;
    const file_meta_value = [banner_img_1, banner_img_2, banner_img_3, banner_img_4, banner_img_5, banner_img_6, banner_img_7, banner_img_8];
    const file_meta_key = ['banner_img_1', 'banner_img_2', 'banner_img_3', 'banner_img_4', 'banner_img_5', 'banner_img_6', 'banner_img_7', 'banner_img_8'];
    await file_meta_key.forEach((item, key) => {
        //console.log(item, key);
        if (req.files[item]) {
            //console.log(file_meta_value[key][0].filename);
            const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
            const check_data = [common_id, item];
            db.query(check_sql, check_data, (check_err, check_result) => {
                if (check_err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request'
                        }
                    )
                } else {
                    if (check_result.length > 0) {
                        const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                        const update_data = [file_meta_value[key][0].filename, common_id, item];
                        db.query(update_sql, update_data, (update_err, update_result) => {
                            if (update_err) throw update_err;
                        })
                    } else {
                        const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                        const insert_data = [common_id, item, file_meta_value[key][0].filename];
                        db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                            if (insert_err) throw insert_err;
                        })
                    }
                }
            });
        }
    });
    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ?, country = ? WHERE id  = ?`;
    const title_data = [title, meta_title, meta_desc, meta_keyword, country_name, common_id];
    //console.log(title_data);
    db.query(title_sql, title_data, (title_err, title_result) => {
        return res.send(
            {
                status: 'ok',
                data: '',
                message: 'Updated successfully'
            }
        )
    })
}
// Frontend Update Myprofile page
exports.updateMyProfile = (req, res) => {
    console.log('edit profile', req.body)
    console.log('profile pic', req.file)
    const userId = req.body.user_id;
    //const checkQuery = 'SELECT user_id FROM users WHERE phone = ? AND user_id <> ?';
    // Update the user's data
    const updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, phone = ?, alise_name = ?  WHERE user_id = ?';
    db.query(updateQuery, [req.body.first_name, req.body.last_name, req.body.phone, req.body.alise_name, userId], (updateError, updateResults) => {

        if (updateError) {
            //console.log(updateError);
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + updateError
                }
            )
        } else {
            // Update the user's meta data

            if (req.file) {
                // Unlink (delete) the previous file
                const unlinkprofilePicture = "uploads/" + req.body.previous_profile_pic;
                fs.unlink(unlinkprofilePicture, (err) => {
                    if (err) {
                        //console.error('Error deleting file:', err);
                    } else {
                        //console.log('Previous file deleted');
                    }
                });
                //const profilePicture = req.file;
                console.log(req.file.filename);


                const updateQueryMeta = 'UPDATE user_customer_meta SET address = ?, country = ?, state = ?, city = ?, zip = ?, date_of_birth = ?,  gender = ?, profile_pic = ?, alternate_phone = ?, marital_status = ?, about = ? WHERE user_id = ?';
                const updateQueryData = [req.body.address, req.body.country, req.body.state, req.body.city, req.body.zip, req.body.date_of_birth, req.body.gender, req.file.filename, req.body.alternate_phone, req.body.marital_status, req.body.about, userId]
                db.query(updateQueryMeta, updateQueryData, (updateError, updateResults) => {
                    if (updateError) {
                        return res.send(
                            {
                                status: 'err',
                                data: userId,
                                message: 'An error occurred while processing your request' + updateError
                            }
                        )
                    } else {
                        const query = `
                                SELECT user_meta.*, c.name as country_name, s.name as state_name, u.first_name
                                , u.last_name, u.email, u.phone, u.user_type_id, ccr.company_id as claimed_comp_id
                                FROM user_customer_meta user_meta
                                LEFT JOIN users u ON u.user_id = user_meta.user_id
                                LEFT JOIN countries c ON user_meta.country = c.id
                                LEFT JOIN states s ON user_meta.state = s.id
                                LEFT JOIN company_claim_request ccr ON user_meta.user_id = ccr.claimed_by
                                WHERE user_meta.user_id = ?
                                `;
                        db.query(query, [userId], async (err, results) => {
                            let userData = {};
                            if (results.length > 0) {
                                const user_meta = results[0];
                                //console.log(user_meta,'aaaaaaaa');
                                // Set a cookie
                                const dateString = user_meta.date_of_birth;
                                const date_of_birth_date = new Date(dateString);
                                const formattedDate = date_of_birth_date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

                                let userData = {
                                    user_id: user_meta.user_id,
                                    first_name: user_meta.first_name,
                                    last_name: user_meta.last_name,
                                    email: user_meta.email,
                                    phone: user_meta.phone,
                                    user_type_id: user_meta.user_type_id,
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
                                return res.send(
                                    {
                                        status: 'ok',
                                        data: userId,
                                        message: 'Successfully Updated'
                                    }
                                )
                            }
                        });


                    }
                });

            } else {
                const updateQueryMeta = 'UPDATE user_customer_meta SET address = ?, country = ?, state = ?, city = ?, zip = ?, date_of_birth = ?, gender = ?, alternate_phone = ?, marital_status = ?, about = ? WHERE user_id = ?';
                const updateQueryData = [req.body.address, req.body.country, req.body.state, req.body.city, req.body.zip, req.body.date_of_birth, req.body.gender, req.body.alternate_phone, req.body.marital_status, req.body.about, userId]
                db.query(updateQueryMeta, updateQueryData, (updateError, updateResults) => {
                    if (updateError) {
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: 'An error occurred while processing your request' + updateError
                            }
                        )
                    } else {
                        const query = `
                                SELECT user_meta.*, c.name as country_name, s.name as state_name, u.first_name
                                , u.last_name, u.email, u.phone, u.user_type_id, ccr.company_id as claimed_comp_id
                                FROM user_customer_meta user_meta
                                JOIN users u ON u.user_id = user_meta.user_id
                                JOIN countries c ON user_meta.country = c.id
                                JOIN states s ON user_meta.state = s.id
                                LEFT JOIN company_claim_request ccr ON user_meta.user_id = ccr.claimed_by
                                WHERE user_meta.user_id = ?
                                `;
                        db.query(query, [userId], async (err, results) => {
                            let userData = {};
                            if (results.length > 0) {
                                const user_meta = results[0];
                                //console.log(user_meta,'aaaaaaaa');
                                // Set a cookie
                                const dateString = user_meta.date_of_birth;
                                const date_of_birth_date = new Date(dateString);
                                const formattedDate = date_of_birth_date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

                                let userData = {
                                    user_id: user_meta.user_id,
                                    first_name: user_meta.first_name,
                                    last_name: user_meta.last_name,
                                    email: user_meta.email,
                                    phone: user_meta.phone,
                                    user_type_id: user_meta.user_type_id,
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

                                return res.send(
                                    {
                                        status: 'ok',
                                        data: userId,
                                        message: 'Successfully Updated'
                                    }
                                )
                            }
                        });

                    }
                });
            }

        }



    });
}

// Update Terms Of Service
exports.updateGlobalContent = async (req, res) => {
    console.log('global', req.body);
    const { common_id, title, meta_title, meta_desc, meta_keyword, footer_contact_info, footer_quick_links, footer_the_app_content,
        footer_apps_info, footer_socials_info, footer_bottom_right } = req.body;

    const meta_value = [footer_contact_info, footer_quick_links, footer_the_app_content,
        footer_apps_info, footer_socials_info, footer_bottom_right];

    const meta_key = ['footer_contact_info', 'footer_quick_links', 'footer_the_app_content',
        'footer_apps_info', 'footer_socials_info', 'footer_bottom_right'];

    await meta_value.forEach((element, index) => {
        //console.log(element, index);
        const check_sql = `SELECT * FROM page_meta WHERE page_id = ? AND page_meta_key = ?`;
        const check_data = [common_id, meta_key[index]];
        db.query(check_sql, check_data, (check_err, check_result) => {
            if (check_err) {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request'
                    }
                )
            } else {
                if (check_result.length > 0) {
                    const update_sql = `UPDATE page_meta SET page_meta_value = ? WHERE page_id = ? AND page_meta_key = ?`;
                    const update_data = [element, common_id, meta_key[index]];
                    db.query(update_sql, update_data, (update_err, update_result) => {
                        if (update_err) throw update_err;
                    })
                } else {
                    const insert_sql = `INSERT INTO page_meta (page_id , page_meta_key, page_meta_value) VALUES (?,?,?)`;
                    const insert_data = [common_id, meta_key[index], element];
                    db.query(insert_sql, insert_data, (insert_err, insert_result) => {
                        if (insert_err) throw insert_err;
                    })
                }
            }
        });
    });

    const title_sql = `UPDATE page_info SET title = ?, meta_title = ?, meta_desc = ?, meta_keyword = ? WHERE id  = ?`;
    const title_data = [title, meta_title, meta_desc, meta_keyword, common_id];
    //console.log(title_data);
    db.query(title_sql, title_data, (title_err, title_result) => {
        return res.send(
            {
                status: 'ok',
                data: '',
                message: 'Updated successfully'
            }
        )
    })
}

//--Front end- Update Basic Company profile --//
exports.updateBasicCompany = (req, res) => {
    //console.log('updateBasicCompany:',req.body);
    //console.log('updateBasicCompany File:',req.file);
    //return false;
    const companyID = req.body.company_id;
    const companySlug = req.body.company_slug;
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const { gallery_images } = req.files;
    let galleryImages = [];
    if (gallery_images) {
        galleryImages = gallery_images.map((title, index) => ({
            gallery_images: req.files.gallery_images[index].filename
        }));
    }

    // Update company details in the company table
    const updateQuery = 'UPDATE company SET  heading = ?, logo = ?, about_company = ?, comp_phone = ?, comp_email = ?, updated_date = ?, tollfree_number = ?, main_address = ?, operating_hours = ?  WHERE ID = ?';
    const updateValues = [
        req.body.heading,
        '',
        req.body.about_company,
        req.body.comp_phone,
        req.body.comp_email,
        formattedDate,
        req.body.tollfree_number,
        req.body.main_address,
        req.body.operating_hours,
        companyID
    ];

    if (req.file) {
        // Unlink (delete) the previous file
        const unlinkcompanylogo = "uploads/" + req.body.previous_logo;
        fs.unlink(unlinkcompanylogo, (err) => {
            if (err) {
                //console.error('Error deleting file:', err);
            } else {
                //console.log('Previous file deleted');
            }
        });

        updateValues[1] = req.file.filename;
    } else {
        updateValues[1] = req.body.previous_logo;
    }
    db.query(updateQuery, updateValues, (err, results) => {
        if (err) {
            // Handle the error
            return res.send({
                status: 'err',
                data: '',
                message: 'An error occurred while updating the company details: ' + err
            });
        } else {
            const check_sql = `SELECT * FROM premium_company_data WHERE company_id = ? `;
            const check_data = [companyID];
            db.query(check_sql, check_data, (check_err, check_result) => {
                if (check_err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request'
                        }
                    )
                } else {
                    if (check_result.length > 0) {
                        //console.log(check_result[0]);
                        //return false;
                        const gallery_img = JSON.parse(check_result[0].gallery_img);

                        if (galleryImages.length > 0) {
                            galleryImages.forEach(function (img, index, arr) {
                                gallery_img.push(img);
                            })
                        }

                        const galleryimg = JSON.stringify(gallery_img);

                        //return false;
                        const update_query = `UPDATE premium_company_data SET gallery_img = ? WHERE company_id = ?`;
                        const update_data = [galleryimg, companyID];
                        db.query(update_query, update_data, (update_err, update_result) => {
                            if (update_err) {
                                // Handle the error
                                return res.send({
                                    status: 'err',
                                    data: '',
                                    message: 'An error occurred while updating the company details: ' + update_err
                                });
                            } else {
                                return res.send(
                                    {
                                        status: 'ok',
                                        data: companySlug,
                                        message: 'Successfully Updated'
                                    }
                                )
                            }
                        })
                    } else {
                        const galleryimg = JSON.stringify(galleryImages);

                        const premium_query = `INSERT INTO premium_company_data ( company_id, gallery_img ) VALUES (?, ?)`;
                        const premium_data = [companyID, galleryimg];
                        db.query(premium_query, premium_data, (premium_err, premium_result) => {
                            if (premium_err) {
                                // Handle the error
                                return res.send({
                                    status: 'err',
                                    data: '',
                                    message: 'An error occurred while updating the company details: ' + premium_err
                                });
                            } else {
                                return res.send(
                                    {
                                        status: 'ok',
                                        data: companySlug,
                                        message: 'Successfully Updated'
                                    }
                                )
                            }
                        })
                    }
                }
            });
        }


    })
}

//--Front end- Update Basic Company profile --//
exports.updatePremiumCompany = async (req, res) => {
    console.log('PremiumCompany:', req.body);
    //console.log('PremiumCompany File:',req.files);

    const companyID = req.body.company_id;
    const companySlug = req.body.company_slug;
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;


    const { previous_cover_image, youtube_iframe, promotion_title, promotion_desc, promotion_discount, promotion_image, product_title, product_desc, product_image, facebook_url, twitter_url, instagram_url, linkedin_url, youtube_url, support_email, escalation_one, escalation_two, escalation_three } = req.body;

    const { cover_image, gallery_images } = req.files;
    let galleryImages = [];
    if (gallery_images) {
        galleryImages = gallery_images.map((title, index) => ({
            gallery_images: req.files.gallery_images[index].filename
        }));
    }

    //return false;
    if (typeof product_image == 'undefined' || typeof promotion_image == 'undefined') {
        let product_image = [];
        let promotion_image = [];
    }
    let ProductData = [];
    if (Array.isArray(product_title) && product_title.length > 0) {
        let count = 0;
        ProductData = product_title.map((title, index) => {
            let productImage = null;
            if (product_image[index] !== '') {
                productImage = req.files.product_image[count].filename;
                count++;
            } else {
                productImage = null;
            }

            return {
                product_title: title,
                product_desc: product_desc[index],
                product_image: productImage
            };
        });
    } else {
        let prodkImg = null;
        if (typeof product_image != 'undefined') {
            if (product_image[0] !== '') {
                prodkImg = req.files.product_image[0].filename;
            }
        }

        ProductData = [{
            "product_title": product_title,
            "product_desc": product_desc,
            "product_image": prodkImg
        }]
    }



    let PromotionalData = [];
    if (Array.isArray(promotion_title) && promotion_title.length > 0) {
        let i = 0;
        PromotionalData = promotion_title.map((title, index) => {
            let promotionImage = null;
            if (promotion_image[index] !== '') {
                promotionImage = req.files.promotion_image[i].filename;
                i++;
            }

            return {
                promotion_title: title,
                promotion_desc: promotion_desc[index],
                promotion_discount: promotion_discount[index],
                promotion_image: promotionImage
            };
        });
    } else {
        let promoImg = null;
        if (typeof promotion_image != 'undefined') {
            if (promotion_image[0] !== '') {
                promoImg = req.files.promotion_image[0].filename;
            }
        }

        PromotionalData = [{
            "promotion_title": promotion_title,
            "promotion_desc": promotion_desc,
            "promotion_discount": promotion_discount,
            "promotion_image": promoImg
        }]
    }
    //console.log('PromotionalData:',PromotionalData)

    let coverImg = null;
    if (cover_image) {
        coverImg = cover_image[0].filename;
    } else {
        coverImg = previous_cover_image;
    }


    // Update company details in the company table
    const updateQuery = 'UPDATE company SET  heading = ?, logo = ?, about_company = ?, comp_phone = ?, comp_email = ?, updated_date = ?, tollfree_number = ?, main_address = ?, operating_hours = ?  WHERE ID = ?';
    const updateValues = [
        req.body.heading,
        '',
        req.body.about_company,
        req.body.comp_phone,
        req.body.comp_email,
        formattedDate,
        req.body.tollfree_number,
        req.body.main_address,
        req.body.operating_hours,
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

        updateValues[1] = req.files.logo[0].filename;
    } else {
        updateValues[1] = req.body.previous_logo;
    }
    db.query(updateQuery, updateValues, (err, results) => {
        if (err) {
            // Handle the error
            return res.send({
                status: 'err',
                data: '',
                message: '3 An error occurred while updating the company details: ' + err
            });
        } else {
            const check_sql = `SELECT * FROM premium_company_data WHERE company_id = ? `;
            const check_data = [companyID];
            db.query(check_sql, check_data, (check_err, check_result) => {
                if (check_err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request'
                        }
                    )
                } else {
                    if (check_result.length > 0) {

                        //console.log(check_result[0]);
                        //return false;
                        const gallery_img = JSON.parse(check_result[0].gallery_img);

                        if (galleryImages.length > 0) {
                            galleryImages.forEach(function (img, index, arr) {
                                gallery_img.push(img);
                            })
                        }
                        //gallery_img.push(galleryImages);

                        //console.log('merge_img:',gallery_img);


                        const promotionSQL = JSON.parse(check_result[0].promotions);
                        //console.log('promotionSQL',promotionSQL);
                        //return false;
                        if (promotionSQL.length > 0) {
                            promotionSQL.forEach(function (promotionImg, index, arr) {
                                if (promotionImg.promotion_image != null) {
                                    //console.log('promotion_image',promotionImg.promotion_image);
                                    if (promotion_image && promotion_image[index] == '') {

                                        PromotionalData[index].promotion_image = promotionSQL[index].promotion_image;
                                    }
                                }
                            })
                        }
                        const productSQL = JSON.parse(check_result[0].products);
                        if (productSQL.length > 0) {
                            productSQL.forEach(function (productImg, index, arr) {
                                if (productImg.product_image != null) {
                                    if (product_image && product_image[index] == '') {
                                        ProductData[index].product_image = productSQL[index].product_image;
                                    }
                                }
                            })
                        }
                        // console.log('allPromotionalData',PromotionalData);
                        // console.log('allProductData',ProductData);
                        const galleryimg = JSON.stringify(gallery_img);
                        const Products = JSON.stringify(ProductData);
                        const Promotion = JSON.stringify(PromotionalData);


                        //return false;
                        const update_query = `UPDATE premium_company_data SET cover_img = ?, gallery_img = ?, youtube_iframe = ?,promotions = ?, products = ?, facebook_url = ?, twitter_url = ?, instagram_url = ?, linkedin_url = ?, youtube_url = ?, support_email = ?, escalation_one = ?, escalation_two = ?, escalation_three = ? WHERE company_id = ? `;
                        const update_data = [coverImg, galleryimg, youtube_iframe, Promotion, Products, facebook_url, twitter_url, instagram_url, linkedin_url, youtube_url, support_email, escalation_one, escalation_two, escalation_three, companyID];
                        db.query(update_query, update_data, (update_err, update_result) => {
                            if (update_err) {
                                // Handle the error
                                return res.send({
                                    status: 'err',
                                    data: '',
                                    message: '2 An error occurred while updating the company details: ' + update_err
                                });
                            } else {
                                return res.send(
                                    {
                                        status: 'ok',
                                        data: companySlug,
                                        message: 'Successfully Updated'
                                    }
                                )
                            }
                        })

                    } else {
                        const galleryimg = JSON.stringify(galleryImages);
                        const Products = JSON.stringify(ProductData);
                        const Promotion = JSON.stringify(PromotionalData);

                        const premium_query = `INSERT INTO premium_company_data ( company_id, cover_img, gallery_img, youtube_iframe, promotions, products, facebook_url, twitter_url, instagram_url, linkedin_url, youtube_url, support_email, escalation_one, escalation_two, escalation_three) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        const premium_data = [companyID, coverImg, galleryimg, youtube_iframe, Promotion, Products, facebook_url, twitter_url, instagram_url, linkedin_url, youtube_url, support_email, escalation_one, escalation_two, escalation_three];
                        db.query(premium_query, premium_data, (premium_err, premium_result) => {
                            if (premium_err) {
                                // Handle the error
                                return res.send({
                                    status: 'err',
                                    data: '',
                                    message: '1 An error occurred while updating the company details: ' + premium_err
                                });
                            } else {
                                return res.send(
                                    {
                                        status: 'ok',
                                        data: companySlug,
                                        message: 'Successfully Updated'
                                    }
                                )
                            }
                        })
                    }
                }
            });
        }
    })
}

// Delete premium gallery image
exports.deletePremiumImage = (req, res) => {
    //console.log('deletePremiumImage', req.body);
    ///return false;
    const { companyId, imgIndex } = req.body;


    const check_sql = `SELECT gallery_img FROM premium_company_data WHERE company_id = ? `;
    const check_data = [companyId];
    db.query(check_sql, check_data, (check_err, check_result) => {
        if (check_err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request'
                }
            )
        } else {
            if (check_result.length > 0) {
                const gallery_img = JSON.parse(check_result[0].gallery_img);
                //console.log(gallery_img);

                const indexToRemove = imgIndex;
                if (indexToRemove >= 0 && indexToRemove < gallery_img.length) {
                    gallery_img.splice(indexToRemove, 1);
                }

                const galleryImg = JSON.stringify(gallery_img);

                const update_sql = `UPDATE premium_company_data SET gallery_img = ? WHERE company_id = ? `;
                const update_data = [galleryImg, companyId];
                db.query(update_sql, update_data, (update_err, update_result) => {
                    if (update_err) throw update_err;
                    return res.send(
                        {
                            status: 'ok',
                            data: '',
                            message: 'Image Deleted successfully'
                        }
                    )
                })
            }
        }
    });


}

// Delete premium gallery image
exports.deletePremiumPromotion = (req, res) => {
    //console.log('deletePremiumImage', req.body);
    ///return false;
    const { companyId, dataIndex } = req.body;


    const check_sql = `SELECT promotions FROM premium_company_data WHERE company_id = ? `;
    const check_data = [companyId];
    db.query(check_sql, check_data, (check_err, check_result) => {
        if (check_err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request'
                }
            )
        } else {
            if (check_result.length > 0) {

                //console.log(check_result[0]);
                //return false;
                const promotions = JSON.parse(check_result[0].promotions);
                //console.log(gallery_img);

                const indexToRemove = dataIndex;
                if (indexToRemove >= 0 && indexToRemove < promotions.length) {
                    promotions.splice(indexToRemove, 1);
                }

                const promotionData = JSON.stringify(promotions);

                const update_sql = `UPDATE premium_company_data SET promotions = ? WHERE company_id = ? `;
                const update_data = [promotionData, companyId];
                db.query(update_sql, update_data, (update_err, update_result) => {
                    if (update_err) throw update_err;
                    return res.send(
                        {
                            status: 'ok',
                            data: '',
                            message: 'Promotion Deleted successfully'
                        }
                    )
                })
            }
        }
    });


}

// Delete premium gallery image
exports.deletePremiumProduct = (req, res) => {
    //console.log('deletePremiumImage', req.body);
    ///return false;
    const { companyId, dataIndex } = req.body;


    const check_sql = `SELECT products FROM premium_company_data WHERE company_id = ? `;
    const check_data = [companyId];
    db.query(check_sql, check_data, (check_err, check_result) => {
        if (check_err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request'
                }
            )
        } else {
            if (check_result.length > 0) {

                //console.log(check_result[0]);
                //return false;
                const products = JSON.parse(check_result[0].products);
                //console.log(gallery_img);

                const indexToRemove = dataIndex;
                if (indexToRemove >= 0 && indexToRemove < products.length) {
                    products.splice(indexToRemove, 1);
                }

                const productsData = JSON.stringify(products);

                const update_sql = `UPDATE premium_company_data SET products = ? WHERE company_id = ? `;
                const update_data = [productsData, companyId];
                db.query(update_sql, update_data, (update_err, update_result) => {
                    if (update_err) throw update_err;
                    return res.send(
                        {
                            status: 'ok',
                            data: '',
                            message: 'Product Deleted successfully'
                        }
                    )
                })
            }
        }
    });


}

//forgot pssword
exports.forgotPassword = (req, res) => {
    //console.log('forgot',req.body);
    const { email } = req.body;
    //let hasEmail =  bcrypt.hash(email, 8);
    const passphrase = process.env.ENCRYPT_DECRYPT_SECRET;





    //return false;
    const sql = `SELECT user_id, first_name, register_from  FROM users WHERE email = '${email}' `;
    db.query(sql, (error, result) => {
        if (error) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request'
                }
            )
        } else {
            if (result.length > 0) {
                if (result[0].register_from == "google") {
                    return res.send({
                        status: 'not ok',
                        message: 'We noticed that you have logged in using your Google account. For enhanced security, please use the password reset option provided by Google to update your password.'
                    });
                } else if (result[0].register_from == "facebook") {
                    return res.send({
                        status: 'not ok',
                        message: 'We noticed that you have logged in using your Facebook account. For enhanced security, please use the password reset option provided by Facebook to update your password.'
                    });
                } else {
                    const cipher = crypto.createCipher('aes-256-cbc', passphrase);
                    let encrypted = cipher.update(email, 'utf8', 'hex');
                    encrypted += cipher.final('hex');
                    //console.log('Encrypted:', encrypted);

                    const template = `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                    <style>
                    body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                        font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                    }
                    </style>
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
                                    <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Forgot Password</h1>
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
                                                <strong>Hello ${result[0].first_name},</strong>
                                                <p style="font-size:15px; line-height:20px">A request has been received to change the password for your <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a>  account. <a class="btn btn-primary" href="${process.env.MAIN_URL}reset-password/${encrypted}">Click here </a>to reset your password</p>
                                                </td>
                                            </tr>
                                            </table>
                                            
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
                </div>`;
                    var mailOptions = {
                        from: process.env.MAIL_USER,
                        //to: 'pranab@scwebtech.com',
                        to: email,
                        subject: 'Forgot password Email',
                        html: template
                    }

                    mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                        if (err) {
                            console.log(err);
                            return res.send({
                                status: 'not ok',
                                message: 'Something went wrong'
                            });
                        } else {
                            console.log('Mail Send: ', info.response);
                            return res.send(
                                {
                                    status: 'ok',
                                    data: '',
                                    message: 'Forgot password email sent. Please check the email for next steps.'
                                }
                            )
                        }
                    })
                }



            } else {
                return res.send(
                    {
                        status: 'not found',
                        data: '',
                        message: 'Your Email did not match with our record.'
                    }
                )
            }
        }
    })
}


//--Submit Review Reply----//
exports.submitReviewReply = async (req, res) => {
    const encodedUserData = req.cookies.user;
    //console.log(req.body);
    try {
        if (encodedUserData) {
            const currentUserData = JSON.parse(encodedUserData);
            console.log(currentUserData);
            const loginCompanyUserId = currentUserData.user_id;
            if (loginCompanyUserId == req.body.reply_by) {
                const currentDate = new Date();
                const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

                const replyData = [req.body.review_id, req.body.company_id, req.body.reply_by, req.body.reply_to, req.body.comment, '2', formattedDate, formattedDate]

                db.query('INSERT INTO review_reply (review_id, company_id, reply_by, reply_to, comment, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)', replyData, async (err, results) => {
                    if (err) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'An error occurred while processing your request' + err,
                        });
                    } else {
                        console.log(results.insertId);
                        const mailReplyData = await comFunction2.ReviewReplyTo(results.insertId)

                        console.log('MailSendTo', mailReplyData);
                        if (mailReplyData[0].customer_id == req.body.reply_to) {
                            await comFunction2.ReviewReplyToCustomer(mailReplyData)
                        } else {
                            await comFunction2.ReviewReplyToCompany(mailReplyData)
                        }


                        return res.send(
                            {
                                status: 'ok',
                                data: '',
                                message: 'Reply Successfully Sent'
                            }
                        );
                    }


                });
            } else {
                return res.send(
                    {
                        status: 'error',
                        data: '',
                        message: 'Error occurred : Illegal activities'
                    }
                );
            }
        } else {
            //res.redirect('sign-in');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred ' + err);
    }
}

// Reset Password
exports.resetPassword = async (req, res) => {
    //console.log('resetPassword', req.body);
    const { email, new_password } = req.body;
    let hasPassword = await bcrypt.hash(new_password, 8);
    //console.log(hasPassword);
    const check_query = `SELECT user_id, email FROM users WHERE email = '${email}' `;
    db.query(check_query, (check_err, check_result) => {
        if (check_err) {
            //console.log(check_err);
            return res.send({
                status: 'not ok',
                message: 'Something went wrong' + check_err
            });
        } else {
            if (check_result.length > 0) {
                const sql = `UPDATE users SET password = ?  WHERE email = ? `;
                const data = [hasPassword, email];
                db.query(sql, data, (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.send({
                            status: 'not ok',
                            message: 'Something went wrong' + err
                        });
                    } else {
                        //Wprdpress User reset password.
                        (async () => {
                            try {
                                const wpUserLoginData = {
                                    email: email,
                                    password: new_password,
                                };
                                const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/reset-password', wpUserLoginData);
                                //console.log(response);
                                const wp_user_data = response.data;
                                //console.log(wp_user_data);
                                if (wp_user_data.status == 'ok') {
                                    return res.send(
                                        {
                                            status: 'ok',
                                            data: wp_user_data.data,
                                            message: 'Password Update Successfully'
                                        }
                                    )
                                } else {
                                    return res.send(
                                        {
                                            status: 'err',
                                            data: '',
                                            message: wp_user_data.message
                                        }
                                    )
                                }
                            } catch (error) {
                                console.log('axaxa', error);
                                return res.send(
                                    {
                                        status: 'err',
                                        data: '',
                                        message: ''
                                    }
                                )
                            }
                        })();
                    }
                })
            } else {
                return res.send({
                    status: 'not ok',
                    message: 'Your URL is not valid please check or request for another URL'
                });
            }
        }
    })

}
// Change Password
exports.changePassword = async (req, res) => {
    //console.log('changePassword', req.body);
    const { userid, current_password, new_password } = req.body;
    let CurrentHasPassword = await bcrypt.hash(current_password, 8);
    let hasPassword = await bcrypt.hash(new_password, 8);
    const check_query = `SELECT password, email  FROM users WHERE user_id = '${userid}' `;
    db.query(check_query, (check_err, check_result) => {
        if (check_err) {
            //console.log(check_err);
            return res.send({
                status: 'not ok',
                message: 'Something went wrong' + check_err
            });
        } else {
            if (check_result.length > 0) {
                const userPassword = check_result[0].password
                console.log('userPassword', userPassword, 'CurrentHasPassword', CurrentHasPassword)
                bcrypt.compare(current_password, userPassword, (err, result) => {
                    if (err) {
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: 'Error: ' + err
                            }
                        )
                    }
                    if (result) {
                        const sql = `UPDATE users SET password = ?  WHERE user_id = '${userid}' `;
                        const data = [hasPassword, userid];
                        db.query(sql, data, (err, result) => {
                            if (err) {
                                console.log(err);
                                return res.send({
                                    status: 'not ok',
                                    message: 'Something went wrong' + err
                                });
                            } else {
                                //Wprdpress User reset password.
                                (async () => {
                                    try {
                                        const wpUserLoginData = {
                                            email: check_result[0].email,
                                            password: new_password,
                                        };
                                        const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/reset-password', wpUserLoginData);
                                        //console.log(response);
                                        const wp_user_data = response.data;
                                        //console.log(wp_user_data);
                                        if (wp_user_data.status == 'ok') {
                                            return res.send(
                                                {
                                                    status: 'ok',
                                                    data: wp_user_data.data,
                                                    message: 'Password Update Successfully'
                                                }
                                            )
                                        } else {
                                            return res.send(
                                                {
                                                    status: 'err',
                                                    data: '',
                                                    message: wp_user_data.message
                                                }
                                            )
                                        }
                                    } catch (error) {
                                        console.log('axaxa', error);
                                        return res.send(
                                            {
                                                status: 'err',
                                                data: '',
                                                message: ''
                                            }
                                        )
                                    }
                                })();
                            }
                        })
                    } else {
                        return res.send({
                            status: 'not ok',
                            message: 'Current Password is not correct!'
                        });
                    }
                })

            } else {
                return res.send({
                    status: 'not ok',
                    message: 'User is not valid'
                });
            }
        }
    })
}

// Review voting (like dislike)
exports.reviewVoting = async (req, res) => {
    //console.log('reviewVoting', req.body);
    const { votingValue, userId, reviewId } = req.body;
    const checkQuery = `SELECT id FROM review_voting WHERE 	review_id = '${reviewId}' AND customer_id = '${userId}' `;
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    db.query(checkQuery, (checkErr, checkResult) => {
        if (checkErr) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + checkErr
            });
        } else {
            if (checkResult.length > 0) {
                const updateQuery = `UPDATE review_voting SET voting = ?, updated_at = ? WHERE 	review_id = ? AND customer_id = ? `;
                const updateData = [votingValue, formattedDate, reviewId, userId];
                db.query(updateQuery, updateData, async (updateErr, updateRes) => {
                    if (updateErr) {
                        return res.send({
                            status: 'not ok',
                            message: 'Something went wrong ' + updateErr
                        });
                    } else {
                        const totalLike = await comFunction2.countLike(reviewId);
                        const totalDislike = await comFunction2.countDislike(reviewId);
                        console.log('update:', totalLike, totalDislike)
                        return res.send({
                            status: 'ok',
                            data: updateRes,
                            totalLike: totalLike,
                            totalDislike: totalDislike,
                            reviewId: reviewId,
                            votingValue: votingValue,
                            message: 'Voting successfully updated'
                        });
                    }
                })
            } else {
                const insertQuery = `INSERT INTO review_voting( review_id, customer_id, voting, created_at, updated_at) VALUES (?,?,?,?,?)`;
                const insertData = [reviewId, userId, votingValue, formattedDate, formattedDate];
                db.query(insertQuery, insertData, async (insertErr, insertRes) => {
                    if (insertErr) {
                        return res.send({
                            status: 'not ok',
                            message: 'Something went wrong ' + insertErr
                        });
                    } else {
                        const totalLike = await comFunction2.countLike(reviewId);
                        const totalDislike = await comFunction2.countDislike(reviewId);
                        console.log('insert:', totalLike, totalDislike)
                        return res.send({
                            status: 'ok',
                            data: insertRes,
                            totalLike: totalLike,
                            totalDislike: totalDislike,
                            reviewId: reviewId,
                            votingValue: votingValue,
                            message: 'Voting successfully inserted'
                        });
                    }
                })
            }
        }
    })
}
// Create poll
exports.createPoll = async (req, res) => {
    //console.log('createPoll',req.body );
    const { company_id, user_id, poll_question, poll_answer, expire_date } = req.body;
    //const answers = JSON.stringify(poll_answer);
    const currentDate = new Date();
    // const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Months are zero-based (0 = January, 11 = December), so add 1
    const day = currentDate.getDate();
    const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
    const sql = `INSERT INTO poll_company ( company_id, poll_creator_id, question, created_at, expired_at) VALUES (?,?,?,?,?)`;
    const data = [company_id, user_id, poll_question, formattedDate, expire_date];
    db.query(sql, data, async (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + err
            });
        } else {
            await poll_answer.forEach((answer) => {
                const ansQuery = `INSERT INTO poll_answer ( poll_id, answer) VALUES (?,?)`;
                const ansData = [result.insertId, answer];
                db.query(ansQuery, ansData, (ansErr, ansResult) => {
                    if (ansErr) {
                        return res.send({
                            status: 'not ok',
                            message: 'Something went wrong ' + ansErr
                        });
                    }
                })
            })

            return res.send({
                status: 'ok',
                message: 'Poll Created Successfully'
            });
        }
    })
}

// Update poll expire date
exports.updatePollExpireDate = async (req, res) => {
    //console.log('updatePollExpireDate',req.body );
    const { poll_id, change_expire_date } = req.body;
    const sql = `UPDATE poll_company SET expired_at = ? WHERE id = ?`;
    const data = [change_expire_date, poll_id]
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Expire Date Updated Successfully'
            });
        }
    })
}

// User polling
exports.userPolling = async (req, res) => {
    //console.log('userPolling',req.body );
    const { ansId, pollId, userId } = req.body
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const sql = `INSERT INTO poll_voting ( poll_id, answer_id, user_id, voting_date) VALUES (?, ?, ?, ?)`;
    const data = [pollId, ansId, userId, formattedDate];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Your Poll Submited Successfully'
            });
        }
    })
}


// Review Invitation
exports.reviewInvitation = async (req, res) => {
    //console.log('reviewInvitation',req.body );
    const { emails, email_body, user_id, company_id, company_name } = req.body;
    const [InvitationDetails, sendInvitationEmail] = await Promise.all([
        comFunction2.insertInvitationDetails(req.body),
        comFunction2.sendInvitationEmail(req.body)
    ]);

    return res.send({
        status: 'ok',
        message: 'Invitation emails send successfully'
    });
}

//--- review Bulk Invitation ----//
exports.reviewBulkInvitation = async (req, res) => {
    //console.log('reviewBulkInvitation',req.body);
    //console.log('reviewBulkInvitation',req.file);
    const { email_body, user_id, company_id, company_name } = req.body;

    if (!req.file) {
        return res.send(
            {
                status: 'err',
                data: '',
                message: 'No file uploaded.'
            }
        )
    }
    const csvFilePath = path.join(__dirname, '..', 'company-csv', req.file.filename);
    try {
        const connection = await mysql.createConnection(dbConfig);

        const workbook = new ExcelJS.Workbook();
        await workbook.csv.readFile(csvFilePath);

        const worksheet = workbook.getWorksheet(1);
        const emailsArr = await processReviewCSVRows(worksheet);
        const emails = emailsArr.flat();

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const get_company_review_invite_request_query = `
            SELECT *
            FROM review_invite_request
            WHERE company_id = ${company_id}
            AND YEAR(share_date) = ${currentYear}
            AND MONTH(share_date) = ${currentMonth}
            ORDER BY id DESC 
            `;

        const get_company_review_invite_request_result = await query(get_company_review_invite_request_query);
        let total_count = 0;
        if (get_company_review_invite_request_result.length > 0) {
            get_company_review_invite_request_result.forEach(count => {
                total_count = total_count + count.count;
            })
        }
        if (emails.length + total_count > req.body.email_limite) {
            return res.send(
                {
                    status: 'err',
                    message: 'You have reached your maximum limit of emails allowed on your current membership for this month.'
                }
            )
        } else {
            req.body.emails = emails;
            console.log('emails', emails);
            console.log('req.body', req.body);
            const [InvitationDetails, sendInvitationEmail] = await Promise.all([
                comFunction2.insertInvitationDetails(req.body),
                comFunction2.sendInvitationEmail(req.body)
            ]);

            return res.send(
                {
                    status: 'ok',
                    message: 'Invitation emails send successfully.'
                }
            )
        }


    } catch (error) {
        console.error('Error:', error);
        return res.send({
            status: 'err',
            message: error.message
        });
    } finally {
        // Delete the uploaded CSV file
        //fs.unlinkSync(csvFilePath);
    }
}

// Define a promise-based function for processing review invitation csv
function processReviewCSVRows(worksheet) {
    return new Promise(async (resolve, reject) => {
        const emails = [];

        await worksheet.eachRow(async (row, rowNumber) => {
            if (rowNumber !== 1) { // Skip the header row

                emails.push([row.values[1]]);

            }
        });

        // Resolve the promise after all rows have been processed
        resolve(emails);
    });
}



//Add  Review Flag
exports.addReviewFlag = async (req, res) => {
    //console.log('addReviewFlag',req.body );
    const [addFlagDetails, sendFlagEmail] = await Promise.all([
        comFunction2.addFlagDetails(req.body),
        comFunction2.sendFlagEmail(req.body)
    ]);

    return res.send({
        status: 'ok',
        message: 'Flag added successfully',
        slug: req.body.company_slug
    });
}

//Add  Review Flag site admin response
exports.updateReviewFlag = async (req, res) => {
    //console.log('updateReviewFlag',req.body ); 
    const [updateFlagDetails] = await Promise.all([
        comFunction2.updateFlagDetails(req.body),
        comFunction2.flagApprovedEmail(req.body),
        comFunction2.flagRejectdEmail(req.body),
    ]);
    return res.send({
        status: 'ok',
        message: 'Flag update successfully',
    });
    //return res.redirect('/flag-review');
}

//create new discussion
// exports.createDiscussion = async (req, res) => {
//     //console.log('createDiscussion',req.body ); 
//     //return false;
//     const {user_id, tags, topic, from_data, expire_date} = req.body;
//     const strTags = JSON.stringify(tags);
//     const sql = `INSERT INTO discussions ( user_id, topic, tags, created_at, expired_at, query_alert_status) VALUES (?, ?, ?, ?, ?, ?)` ;
//     const data = [user_id, topic, strTags, from_data, expire_date, '0'];
//     db.query(sql, data, (err, result) => {
//         if (err) {
//             return res.send({
//                 status: 'not ok',
//                 message: 'Something went wrong '+err
//             });
//         } else {
//             return res.send({
//                 status: 'ok',
//                 message: 'Your Discussion Topic Added Successfully'
//             });
//         }
//     })
// }

exports.createDiscussion = async (req, res) => {
    //console.log('createDiscussion',req.body ); 
    //return false;
    const { user_id, tags, topic, from_data, expire_date, location } = req.body;
    const strTags = JSON.stringify(tags);
    //console.log("strTagssss", strTags);

    const user_location = `SELECT * FROM user_customer_meta WHERE user_id =?`;
    const user_location_data = await query(user_location, [user_id]);

    if (user_location_data.length > 0) {
        //var user_locations = user_location_data[0].address;
        var user_locations = user_location_data[0].country;
        //console.log("user_locations",user_locations);

        var userData = `SELECT name FROM countries WHERE id=?`;
        var user_val = await query(userData, [user_locations]);
        //console.log("user_val",user_val[0].name);
    }

    const sql = `INSERT INTO discussions ( user_id, topic, tags, created_at, expired_at, query_alert_status,discussion_status, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const data = [user_id, topic, strTags, from_data, expire_date, '0', '0', location];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + err
            });
        } else {
            const discussion_id = result.insertId;
            console.log("discussion_id", discussion_id);

            const user_query = `SELECT email FROM users WHERE user_id = ?`;
            const user_data = [user_id];

            db.query(user_query, user_data, (userQueryErr, userQueryResult) => {
                if (userQueryErr) {
                    return res.send({
                        status: 'not ok',
                        message: 'Error retrieving user email: ' + userQueryErr
                    });
                } else {
                    const user_email = userQueryResult[0].email;
                    console.log("user_email", user_email);


                    var mailOptions = {
                        from: process.env.MAIL_USER,
                        to: process.env.MAIL_USER,
                        //to: "dev2.scwt@gmail.com",
                        subject: 'Discussion approval',
                        html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                        <style>
                        body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                            font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                        }
                        </style>
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
                                <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                    <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Discussion approval email</h1>
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
                                            <strong>Hello Dear,</strong>
                                            <p style="font-size: 15px; line-height: 20px">
                                            Please review the discussion details and initiate the necessary steps to verify the discussion at the earliest.Click
                                            <a href="${process.env.MAIN_URL}edit-discussion/${discussion_id}"> here</a> to verify the discussion.
                                          </p>                                          
                                          </td>
                                        </tr>
                                          <tr>
                                          </tr>
                                        </table>
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
                    mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                        if (err) {
                            console.log(err);
                            return false;
                        } else {
                            console.log('Mail Send: ', info.response);
                        }
                    })
                    return res.send({
                        status: 'ok',
                        message: 'Your Discussion Topic Added Successfully.'
                    });
                }
            });
        }
    })
}


exports.updateDiscussion = async (req, res) => {
    try {
        const { discussion_id, topic, tags, expire_date, location } = req.body;

        //console.log("tags",tags);

        // const tagsArray = tags.split(',').map(tag => ({ value: tag.trim() }));
        // const strTags = JSON.stringify(tagsArray);
        // console.log("tagsArray", tagsArray); 
        // console.log("strTagsss",strTags);


        // const sql = `UPDATE discussions SET topic = ?, tags = ?, expired_at = ? WHERE id = ?`;
        // const data = [topic, strTags, expire_date, discussion_id];

        const tagsArray = tags.split(',').map(tag => tag.trim());
        const strTags = JSON.stringify(tagsArray);

        console.log("tagsArray", tagsArray);
        console.log("strTagsss", strTags);

        const sql = `UPDATE discussions SET topic = ?, tags = ?, expired_at = ?, location = ? WHERE id = ?`;
        const data = [topic, strTags, expire_date, location, discussion_id];


        db.query(sql, data, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to update discussion.'
                });
            } else {
                console.log("result", result[0]);
                return res.status(200).json({
                    status: 'ok',
                    message: 'Discussion updated successfully.'
                });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request.'
        });
    }
}

// exports.updateDiscussion = async (req, res) => {
//     try {
//         const { discussion_id, topic, tags, expire_date } = req.body;
//         console.log("req.body",req.body);;

//         const allTags = tags ? JSON.parse(tags).map(item => item.value) : [];
//         console.log("allTags", allTags);

//         const Tags = JSON.stringify(allTags);
//         console.log("Tags",Tags);


//         const sqlUpdate = `UPDATE discussions SET topic = ?, tags = ?, expired_at = ? WHERE id = ?`;
//         const dataUpdate = [topic, Tags, expire_date, discussion_id];

//         db.query(sqlUpdate, dataUpdate, (err, updateResult) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).json({
//                     status: 'error',
//                     message: 'Failed to update discussion.'
//                 });
//             } else {
//                 // Fetch the updated discussion from the database
//                 const sqlFetch = `SELECT * FROM discussions WHERE id = ?`;
//                 db.query(sqlFetch, [discussion_id], (fetchErr, fetchResult) => {
//                     if (fetchErr) {
//                         console.error(fetchErr);
//                         return res.status(500).json({
//                             status: 'error',
//                             message: 'Failed to fetch updated discussion.'
//                         });
//                     } else {
//                         console.log("Updated discussion:", fetchResult[0]);
//                         return res.status(200).json({
//                             status: 'ok',
//                             message: 'Discussion updated successfully.',
//                             discussion: fetchResult[0] // Send the updated discussion in the response
//                         });
//                     }
//                 });
//             }
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             status: 'error',
//             message: 'An error occurred while processing your request.'
//         });
//     }

//  };


exports.getDiscussions = async (req, res) => {
    try {
        const id = req.params.id;
        const sql = `SELECT * discussions WHERE id = ?`;
        const data = [id];
        db.query(sql, data, (err, result) => {
            if (err) {
                return res.send({
                    status: 'error',
                    message: 'Failed to fet discussion: ' + err
                });
            } else {
                return res.send({
                    status: 'ok',
                    message: 'Discussion fetched successfully.'
                });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request.'
        });
    }
}

//Add comment on discussion
// exports.addComment = async (req, res) => {
//     console.log('addComment', req.body);
//     const { discussion_id, user_id, comment } = req.body;
//     const currentDate = new Date();
//     const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
//     //return false;
//     const Insertdata = {
//         discussion_id: discussion_id,
//         user_id: user_id,
//         comment: comment,
//         ip_address: requestIp.getClientIp(req),
//         created_at: formattedDate,
//         comment_status: "0"
//     };
//     const insertQuery = 'INSERT INTO discussions_user_response SET ?';
//     db.query(insertQuery, Insertdata, (insertErr, insertResult) => {
//         if (insertErr) {
//             return res.send({
//                 status: 'not ok',
//                 message: 'Something went wrong 3' + insertErr
//             });
//         } else {
//             var mailOptions = {
//                 from: process.env.MAIL_USER,
//                 //to: process.env.MAIL_USER,
//                 to: "dev2.scwt@gmail.com",
//                 subject: 'Discussion comment approval',
//                 html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
//         <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
//           <tbody>
//           <tr>
//             <td align="center" valign="top">
//               <div id="template_header_image"><p style="margin-top: 0;"></p></div>
//               <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
//               <tbody>
//                 <tr>
//                   <td align="center" valign="top">
//                     <!-- Header -->
//                     <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
//                       <tbody>
//                         <tr>
//                         <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
//                         <td id="header_wrapper" style="padding: 36px 48px; display: block;">
//                             <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Discussion approval email</h1>
//                         </td>

//                         </tr>
//                       </tbody>
//                     </table>
//               <!-- End Header -->
//               </td>
//                 </tr>
//                 <tr>
//                   <td align="center" valign="top">
//                     <!-- Body -->
//                     <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
//                       <tbody>
//                         <tr>
//                         <td id="body_content" style="background-color: #fdfdfd;" valign="top">
//                           <!-- Content -->
//                           <table border="0" cellpadding="20" cellspacing="0" width="100%">
//                             <tbody>
//                             <tr>
//                               <td style="padding: 48px;" valign="top">
//                                 <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">

//                                 <table border="0" cellpadding="4" cellspacing="0" width="90%">
//                                 <tr>
//                                   <td colspan="2">
//                                     <strong>Hello Dear,</strong>
//                                     <p style="font-size: 15px; line-height: 20px">
//                                     Please review the discussion comment and initiate the necessary steps to verify the comment at the earliest.Click
//                                     <a href="${process.env.MAIN_URL}edit-discussion/${discussion_id}"> here</a> to verify the discussion comment.
//                                   </p>                                          
//                                   </td>
//                                 </tr>
//                                   <tr>
//                                   </tr>
//                                 </table>
//                                 </div>
//                               </td>
//                             </tr>
//                             </tbody>
//                           </table>
//                         <!-- End Content -->
//                         </td>
//                         </tr>
//                       </tbody>
//                     </table>
//                   <!-- End Body -->
//                   </td>
//                 </tr>
//                 <tr>
//                   <td align="center" valign="top">
//                     <!-- Footer -->
//                     <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
//                     <tbody>
//                       <tr>
//                       <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
//                         <table border="0" cellpadding="10" cellspacing="0" width="100%">
//                           <tbody>
//                             <tr>
//                             <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
//                                   <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
//                             </td>
//                             </tr>
//                           </tbody>
//                         </table>
//                       </td>
//                       </tr>
//                     </tbody>
//                     </table>
//                   <!-- End Footer -->
//                   </td>
//                 </tr>
//               </tbody>
//               </table>
//             </td>
//           </tr>
//           </tbody>
//         </table>
//         </div>`
//             }
//             mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
//                 if (err) {
//                     console.log(err);
//                     return false;
//                 } else {
//                     console.log('Mail Send: ', info.response);
//                 }
//             })
//             return res.send({
//                 status: 'ok',
//                 message: 'Your Comment Added Successfully'
//             });
//         }
//     })

// }

exports.addComment = async (req, res) => {
    try {
        console.log('addComment', req.body);
        const { discussion_id, user_id, comment } = req.body;
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const encodedUserData = req.cookies.user;
        const currentUserData = JSON.parse(encodedUserData);

        const Insertdata = {
            discussion_id: discussion_id,
            user_id: user_id,
            comment: comment,
            ip_address: requestIp.getClientIp(req),
            created_at: formattedDate,
            comment_status: "0"
        };

        const insertQuery = 'INSERT INTO discussions_user_response SET ?';
        db.query(insertQuery, Insertdata, async (insertErr, insertResult) => {
            if (insertErr) {
                return res.status(500).send({
                    status: 'not ok',
                    message: 'Something went wrong 3' + insertErr
                });
            } else {
                const url = encodedUserData ? `${process.env.MAIN_URL}edit-discussion/${discussion_id}` : `${process.env.MAIN_URL}admin-login`;

                const html = `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                    <style>
                    body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                        font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                    }
                    </style>
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
                                    <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                    <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                        <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Discussion approval email</h1>
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
                                                <strong>Hello Dear,</strong>
                                                <p style="font-size: 15px; line-height: 20px">
                                                Please review the discussion comment and initiate the necessary steps to verify the comment at the earliest.Click
                                                <a href="${url}"> here</a> to verify the discussion comment.
                                              </p>                                          
                                              </td>
                                            </tr>
                                              <tr>
                                              </tr>
                                            </table>
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
                    </div>`;

                const mailOptions = {
                    from: process.env.MAIL_USER,
                    //to: "dev2.scwt@gmail.com",
                    to: process.env.MAIL_USER,
                    subject: 'Discussion comment approval',
                    html: html
                };

                try {
                    await mdlconfig.transporter.sendMail(mailOptions);
                    console.log('Mail Send');
                    return res.send({
                        status: 'ok',
                        message: 'Your Comment Added Successfully'
                    });
                } catch (err) {
                    console.error(err);
                    return res.status(500).send({
                        status: 'not ok',
                        message: 'Failed to send email'
                    });
                }
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'An error occurred.', error: error.message });
    }
}


//Create company category
exports.createCompanyCategory = async (req, res) => {
    console.log('createCompanyCategory', req.body);
    console.log('createCompanyCategoryFile', req.files);
    //return false;
    const { category_name, parent_category, company_id, product_title, product_desc } = req.body;
    const { product_image } = req.files;

    const checkQuery = `SELECT id FROM complaint_category WHERE category_name = '${category_name}' AND company_id = '${company_id}' `;
    db.query(checkQuery, (checkErr, checkResult) => {
        if (checkErr) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + checkErr
            });
        }
        if (checkResult.length > 0) {
            return res.send({
                status: 'not ok',
                message: 'Category name already exist.'
            });
        } else {
            const sql = `INSERT INTO complaint_category ( company_id, category_name, parent_id) VALUES (?, ?, ?)`;
            const data = [company_id, category_name, parent_category];
            db.query(sql, data, async (err, result) => {
                if (err) {
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong ' + err
                    });
                } else {
                    if (typeof product_title !== 'undefined') {
                        if (typeof product_title == 'string') {
                            console.log(result.insertId);
                            //return false;
                            const productQuery = `INSERT INTO company_products SET ? `;
                            const productData = {
                                company_id: company_id,
                                category_id: result.insertId,
                                parent_id: parent_category,
                                product_title: product_title,
                                product_desc: product_desc,
                                product_img: product_image[0].filename,
                            }
                            db.query(productQuery, productData, (productErr, productResult) => {
                                if (productErr) {
                                    return res.send({
                                        status: 'not ok',
                                        message: 'Something went wrong ' + productErr
                                    });
                                } else {
                                    return res.send({
                                        status: 'ok',
                                        message: 'Category added successfully with a product !'
                                    });
                                }
                            });
                        } else {
                            await product_title.forEach((product, index) => {
                                const productQuery = `INSERT INTO company_products SET ? `;
                                const productData = {
                                    company_id: company_id,
                                    category_id: result.insertId,
                                    parent_id: parent_category,
                                    product_title: product,
                                    product_desc: product_desc[index],
                                    product_img: product_image[index].filename,
                                }
                                db.query(productQuery, productData, (productErr, productResult) => {
                                    if (productErr) {
                                        return res.send({
                                            status: 'not ok',
                                            message: 'Something went wrong ' + productErr
                                        });
                                    }
                                });
                            })
                            return res.send({
                                status: 'ok',
                                message: 'Category added successfully with products. '
                            });
                        }
                    } else {
                        return res.send({
                            status: 'ok',
                            message: 'Category added successfully without any product. '
                        });
                    }
                }
            })
        }
    })
}

//Delete company category
exports.deleteCompanyCategory = async (req, res) => {
    //console.log('deleteCompanyCategory',req.body ); 
    const checkQuery = `SELECT id, parent_id FROM complaint_category WHERE parent_id = '0' AND id = ${req.body.cat_id}`;
    db.query(checkQuery, (checkErr, checkResult) => {

        if (checkErr) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong 1' + checkErr
            });
        } else {
            const delQuery = `DELETE FROM complaint_category WHERE id = '${req.body.cat_id}'`;
            db.query(delQuery, (err, result) => {
                if (checkResult.length > 0) {
                    const updateQuery = `UPDATE complaint_category SET  parent_id = '0' WHERE parent_id = '${req.body.cat_id}' `;
                    db.query(updateQuery, (updateErr, updateResult) => {
                        if (updateErr) {
                            return res.send({
                                status: 'not ok',
                                message: 'Something went wrong 2' + updateErr
                            });
                        } else {
                            return res.send({
                                status: 'ok',
                                message: 'Category Deleted successfully !'
                            });
                        }
                    })
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Category Deleted successfully !'
                    });
                }
            })
        }
    })
}

//Delete company product
exports.deleteCompanyProduct = async (req, res) => {
    console.log('deleteCompanyProduct', req.body);
    //return false;
    const delQuery = `DELETE FROM company_products WHERE id = '${req.body.product_id}'`;
    db.query(delQuery, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong 2 ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Product Deleted successfully !'
            });
        }
    })
}

//update Company Product
exports.updateCompanyProduct = async (req, res) => {
    console.log('updateCompanyProduct', req.body);
    console.log('file', req.file);
    const { company_Id, product_Id, product_title, product_desc, category_id, parent_id } = req.body;
    //const {product_img} = req.file;
    let data = {}
    //return false;
    if (req.file) {
        data = {
            category_id: category_id,
            parent_id: parent_id,
            product_title: product_title,
            product_desc: product_desc,
            product_img: req.file.filename
        }
    } else {
        data = {
            category_id: category_id,
            parent_id: parent_id,
            product_title: product_title,
            product_desc: product_desc
        }
    }
    console.log('data', data)
    const sql = `UPDATE company_products SET ? WHERE id = ${product_Id}`;
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Category Product Updated successfully !'
            });
        }
    })
}

//Add  company product
exports.addCompanyProduct = async (req, res) => {
    console.log('addCompanyProduct', req.body);
    console.log('addCompanyProduct', req.files);
    //return false;
    const { category_id, parent_id, company_id, product_title, product_desc } = req.body;
    const { product_image } = req.files;

    if (typeof product_title !== 'undefined') {
        if (typeof product_title == 'string') {
            //console.log(result.insertId);
            //return false;
            const productQuery = `INSERT INTO company_products SET ? `;
            const productData = {
                company_id: company_id,
                category_id: category_id,
                parent_id: parent_id,
                product_title: product_title,
                product_desc: product_desc,
                product_img: product_image[0].filename,
            }
            db.query(productQuery, productData, (productErr, productResult) => {
                if (productErr) {
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong ' + productErr
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Product added successfully !'
                    });
                }
            });
        } else {
            await product_title.forEach((product, index) => {
                const productQuery = `INSERT INTO company_products SET ? `;
                const productData = {
                    company_id: company_id,
                    category_id: category_id,
                    parent_id: parent_id,
                    product_title: product,
                    product_desc: product_desc[index],
                    product_img: product_image[index].filename,
                }
                db.query(productQuery, productData, (productErr, productResult) => {
                    if (productErr) {
                        return res.send({
                            status: 'not ok',
                            message: 'Something went wrong ' + productErr
                        });
                    }
                });
            })
            return res.send({
                status: 'ok',
                message: 'Products added successfully . '
            });
        }
    } else {
        return res.send({
            status: 'ok',
            message: 'Please add products. '
        });
    }
}

//Update complaint company category
exports.updateCompanyCategory = async (req, res) => {
    //console.log('updateCompanyCategory',req.body ); 
    const { category_name, parent_category, company_id, cat_id } = req.body;
    //return false;
    const checkQuery = `SELECT id FROM complaint_category WHERE category_name = '${category_name}' AND id != ${cat_id}`;
    db.query(checkQuery, (checkErr, checkResult) => {
        if (checkErr) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + checkErr
            });
        }
        if (checkResult.length > 0) {
            return res.send({
                status: 'not ok',
                message: 'Category name already exist.'
            });
        } else {
            const data = [category_name, parent_category, cat_id];
            const delQuery = `UPDATE complaint_category SET category_name = ?, parent_id = ? WHERE id = ? `;
            db.query(delQuery, data, (err, result) => {
                if (err) {
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong ' + err
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Category Updated successfully !'
                    });
                }
            })
        }
    })

}

//createCompanyLevel
// exports.createCompanyLevel = async (req, res) => {
//     console.log('createCompanyLevel',req.body ); 
//     const {company_id, label_count, eta_days, emails} = req.body;
//     let emailsArr = [];
//     if (typeof emails == 'string') {
//         emailsArr.push(emails);
//     } else {
//         emailsArr = [...emails];
//     }
//     //const filteredArray = emailsArr.filter(item => item !== "");
//     //console.log('emailsArr', emailsArr);
//     const strEmails = JSON.stringify(emailsArr.filter(item => item !== ""));
//     const currentDate = new Date();
//     const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
//     const checkQuery = `SELECT id FROM complaint_level_management WHERE company_id  = ? AND level = ? `;
//     const checkData = [company_id, label_count ];
//     db.query(checkQuery, checkData, (checkErr, checkResult)=>{
//         if (checkErr) {
//             return res.send({
//                 status: 'not ok',
//                 message: 'Something went wrong '+checkErr
//             });
//         }
//         if (checkResult.length > 0) {
//             const updateQuery = `UPDATE complaint_level_management SET ? WHERE company_id  = '${company_id}' AND level = '${label_count}' `;
//             const updateData = {
//                 level: label_count || null,
//                 emails: strEmails || [],
//                 eta_days: eta_days || null,
//                 created_at: formattedDate || null,
//             };

//             db.query(updateQuery, updateData, (updateErr, updateRes)=>{
//                 if (updateErr) {
//                     return res.send({
//                         status: 'not ok',
//                         message: 'Something went wrong '+updateErr
//                     });
//                 } else {
//                     return res.send({
//                         status: 'ok',
//                         message: 'Level data Updated successfully !'
//                     });
//                 }
//             } )

//         } else {
//             const insertQuery = `INSERT INTO complaint_level_management SET ?`;
//             const insertData = {
//                 company_id:company_id,
//                 level: label_count || null,
//                 emails: strEmails || [],
//                 eta_days: eta_days || null,
//                 created_at: formattedDate || null,
//             }
//             db.query(insertQuery, insertData, (insertErr, insertRes)=>{
//                 if (insertErr) {
//                     return res.send({
//                         status: 'not ok',
//                         message: 'Something went wrong '+insertErr
//                     });
//                 } else {
//                     return res.send({
//                         status: 'ok',
//                         message: 'Level data added successfully !'
//                     });
//                 }
//             } )
//         }
//     } )
// }


//createCompanyLevel
// exports.createCompanyLevel = async (req, res) => {
//     console.log('createCompanyLevel',req.body ); 
//     const {company_id, label_count, complaint_status} = req.body;
//     let emailsArr = [];
//     let emails;    
//     const currentDate = new Date();
//     const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
//     let completedCount = 0;
//     if (complaint_status == '1') {
//         for (let index = 1; index <= label_count; index++) {
//             let emailsKey = 'emails_' + index;
//             emails = req.body[emailsKey];

//             let eta_days_Key = 'eta_days_'+index;
//             let eta_days = req.body[eta_days_Key];

//             if (typeof emails == 'string') {
//                 emailsArr.push(emails);
//             } else {
//                 emailsArr = [...emails];
//             }
//             let strEmails = JSON.stringify(emailsArr.filter(item => item !== ""));
//             //console.log(emails, emailsArr, strEmails);

//             const checkQuery = `SELECT id FROM complaint_level_management WHERE company_id  = ? AND level = ? `;
//             const checkData = [company_id, index ];
//             db.query(checkQuery, checkData, (checkErr, checkResult)=>{
//                 if (checkErr) {
//                     return res.send({
//                         status: 'not ok',
//                         message: 'Something went wrong '+checkErr
//                     });
//                 }
//                 if (checkResult.length > 0) {
//                     const updateQuery = `UPDATE complaint_level_management SET ? WHERE company_id  = '${company_id}' AND level = '${index}' `;
//                     const updateData = {
//                         level: index || null,
//                         emails: strEmails || [],
//                         eta_days: eta_days || null,
//                         created_at: formattedDate || null,
//                     };

//                     db.query(updateQuery, updateData, (updateErr, updateRes)=>{
//                         if (updateErr) {
//                             return res.send({
//                                 status: 'not ok',
//                                 message: 'Something went wrong '+updateErr
//                             });
//                         } else {
//                             const updateQuery = `UPDATE company SET complaint_status='1' WHERE ID = '${company_id}' `;
//                             db.query(updateQuery, (updateErr,updateRes)=>{
//                                 if (updateErr) {
//                                     return res.send({
//                                         status: 'not ok',
//                                         message: 'Something went wrong '+updateErr
//                                     });
//                                 } else {
//                                     completedCount++;

//                                     // Check if all iterations are complete
//                                     if (completedCount === label_count) {
//                                         // Send the response here after completing the loop
//                                         return res.send({
//                                             status: 'ok',
//                                             message: 'All iterations completed successfully!'
//                                         });
//                                     }
//                                 }
//                             })
//                         }
//                     } )

//                 } else {
//                     const insertQuery = `INSERT INTO complaint_level_management SET ?`;
//                     const insertData = {
//                         company_id:company_id,
//                         level: index || null,
//                         emails: strEmails || [],
//                         eta_days: eta_days || null,
//                         created_at: formattedDate || null,
//                     }
//                     db.query(insertQuery, insertData, (insertErr, insertRes)=>{
//                         if (insertErr) {
//                             return res.send({
//                                 status: 'not ok',
//                                 message: 'Something went wrong '+insertErr
//                             });
//                         } else {
//                             const updateQuery = `UPDATE company SET complaint_status='1' WHERE ID = '${company_id}' `;
//                             db.query(updateQuery, (updateErr,updateRes)=>{
//                                 if (updateErr) {
//                                     return res.send({
//                                         status: 'not ok',
//                                         message: 'Something went wrong '+updateErr
//                                     });
//                                 } else {
//                                     completedCount++;

//                                     // Check if all iterations are complete
//                                     if (completedCount === label_count) {
//                                         // Send the response here after completing the loop
//                                         return res.send({
//                                             status: 'ok',
//                                             message: 'All iterations completed successfully!'
//                                         });
//                                     }
//                                 }
//                             })
//                         }
//                     } )
//                 }
//             } )

//         }
//     } else {
//         const delQuery = `DELETE FROM complaint_level_management WHERE company_id = '${company_id}' `;
//         db.query(delQuery, (delErr, delRes)=>{
//             if (delErr) {
//                 return res.send({
//                     status: 'not ok',
//                     message: 'Something went wrong '+delErr
//                 });
//             } else {
//                 const updateQuery = `UPDATE company SET complaint_status='0' WHERE ID = '${company_id}' `;
//                 db.query(updateQuery, (updateErr,updateRes)=>{
//                     if (updateErr) {
//                         return res.send({
//                             status: 'not ok',
//                             message: 'Something went wrong '+updateErr
//                         });
//                     } else {
//                         return res.send({
//                             status: 'ok',
//                             message: 'Complaint status updated successfully !'
//                         });
//                     }
//                 })

//             }
//         } )
//     }

//     //const filteredArray = emailsArr.filter(item => item !== "");

// }

exports.createCompanyLevel = async (req, res) => {
    //console.log('createCompanyLevel', req.body);
    const { company_id, label_count, complaint_status } = req.body;
    let emailsArr = [];
    let emails;
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    let completedCount = 0;

    if (complaint_status == '1') {
        for (let index = 1; index <= label_count; index++) {
            let emailsKey = 'emails_' + index;
            emails = req.body[emailsKey];

            let eta_days_Key = 'eta_days_' + index;
            let eta_days = req.body[eta_days_Key];

            if (typeof emails == 'string') {
                emailsArr.push(emails);
            } else {
                emailsArr = [...emails];
            }
            let strEmails = JSON.stringify(emailsArr.filter(item => item !== ""));

            const checkQuery = `SELECT id FROM complaint_level_management WHERE company_id  = ? AND level = ? `;
            const checkData = [company_id, index];

            await new Promise((resolve) => {
                db.query(checkQuery, checkData, async (checkErr, checkResult) => {
                    if (checkErr) {
                        res.send({
                            status: 'not ok',
                            message: 'Something went wrong ' + checkErr
                        });
                        return resolve();
                    }

                    if (checkResult.length > 0) {
                        const updateQuery = `UPDATE complaint_level_management SET ? WHERE company_id  = '${company_id}' AND level = '${index}' `;
                        const updateData = {
                            level: index || null,
                            emails: strEmails || [],
                            eta_days: eta_days || null,
                            created_at: formattedDate || null,
                        };

                        await new Promise((resolveUpdate) => {
                            db.query(updateQuery, updateData, (updateErr, updateRes) => {
                                if (updateErr) {
                                    res.send({
                                        status: 'not ok',
                                        message: 'Something went wrong ' + updateErr
                                    });
                                } else {
                                    const updateQuery = `UPDATE company SET complaint_status='1' WHERE ID = '${company_id}' `;
                                    db.query(updateQuery, (updateErr, updateRes) => {
                                        if (updateErr) {
                                            res.send({
                                                status: 'not ok',
                                                message: 'Something went wrong ' + updateErr
                                            });
                                        } else {
                                            completedCount++;
                                            resolveUpdate();
                                        }
                                    });
                                }
                            });
                        });

                    } else {
                        const insertQuery = `INSERT INTO complaint_level_management SET ?`;
                        const insertData = {
                            company_id: company_id,
                            level: index || null,
                            emails: strEmails || [],
                            eta_days: eta_days || null,
                            created_at: formattedDate || null,
                        };

                        await new Promise((resolveInsert) => {
                            db.query(insertQuery, insertData, (insertErr, insertRes) => {
                                if (insertErr) {
                                    res.send({
                                        status: 'not ok',
                                        message: 'Something went wrong ' + insertErr
                                    });
                                } else {
                                    const updateQuery = `UPDATE company SET complaint_status='1' WHERE ID = '${company_id}' `;
                                    db.query(updateQuery, (updateErr, updateRes) => {
                                        if (updateErr) {
                                            res.send({
                                                status: 'not ok',
                                                message: 'Something went wrong ' + updateErr
                                            });
                                        } else {
                                            completedCount++;
                                            resolveInsert();
                                        }
                                    });
                                }
                            });
                        });
                    }
                    resolve();
                });
            });
        }

        // Send the response after all iterations are complete
        res.send({
            status: 'ok',
            message: 'All iterations completed successfully!'
        });
    } else {
        const delQuery = `DELETE FROM complaint_level_management WHERE company_id = '${company_id}' `;
        db.query(delQuery, (delErr, delRes) => {
            if (delErr) {
                res.send({
                    status: 'not ok',
                    message: 'Something went wrong ' + delErr
                });
            } else {
                const updateQuery = `UPDATE company SET complaint_status='0' WHERE ID = '${company_id}' `;
                db.query(updateQuery, (updateErr, updateRes) => {
                    if (updateErr) {
                        res.send({
                            status: 'not ok',
                            message: 'Something went wrong ' + updateErr
                        });
                    } else {
                        res.send({
                            status: 'ok',
                            message: 'Complaint status updated successfully !'
                        });
                    }
                });
            }
        });
    }
}


//Delete company Complaint Level
exports.deleteCompanyComplaintLevel = async (req, res) => {
    //console.log('deleteCompanyComplaintLevel',req.body ); 
    //return false;
    const delQuery = `DELETE FROM complaint_level_management WHERE id = '${req.body.level_id}'`;
    db.query(delQuery, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong 2 ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Complaint Level  Deleted successfully !'
            });
        }
    })
}

//Complaint Register
exports.complaintRegister = async (req, res) => {
    console.log('complaintRegister', req.body);
    // const authenticatedUserId = parseInt(req.user.user_id);
    // const ApiuserId = parseInt(req.body.user_id);
    // if (isNaN(ApiuserId)) {
    //     return res.status(400).json({
    //       status: 'error',
    //       message: 'Invalid user_id provided in the request body.',
    //     });
    //   }
    // if (ApiuserId !== authenticatedUserId) {
    // return res.status(403).json({
    //     status: 'error',
    //     message: 'Access denied: You are not authorized to update this user.',
    // });
    // }

    const { company_id, user_id, category_id, sub_category_id, model_no, allTags, transaction_date, location, message } = req.body;
    //return false;
    //const uuid = uuidv4();  
    const randomNo = Math.floor(Math.random() * (100 - 0 + 1)) + 0;
    const currentDate = new Date();
    const ticket_no = randomNo + currentDate.getTime();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

    const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${req.body.main_address_country}"`;
    const country_name_value = await query(country_name_query);
    if (country_name_value.length > 0) {
        var country_name = country_name_value[0].name;
        console.log("country_name", country_name);
        var country_id = country_name_value[0].id;
        console.log("country_id", country_id);
    }

    const state_name_query = `SELECT * FROM states WHERE id = "${req.body.main_address_state}"`;
    const state_name_value = await query(state_name_query);
    if (state_name_value.length > 0) {
        var state_name = state_name_value[0].name;
        console.log("state_name", state_name);
    }

    var city_value = req.body['review-address'];
    console.log("city_value", city_value);

    var concatenatedAddress = city_value + ', ' + state_name + ', ' + country_name;
    console.log(concatenatedAddress);


    const data = {
        user_id: user_id,
        company_id: company_id,
        ticket_id: ticket_no,
        category_id: category_id,
        sub_cat_id: sub_category_id && sub_category_id !== undefined ? sub_category_id : 0,
        model_desc: model_no,
        purchase_date: transaction_date,
        purchase_place: concatenatedAddress,
        message: message,
        tags: JSON.stringify(allTags),
        level_id: '1',
        status: '2',
        created_at: formattedDate,
        level_update_at: formattedDate
    }


    // console.log(complaintEmailToCompany);
    const Query = `INSERT INTO complaint SET ?  `;
    db.query(Query, data, async (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            //console.log(company_id[0],user_id[0], uuid, result.insertId)
            const [complaintEmailToCompany, complaintSuccessEmailToUser] = await Promise.all([
                // comFunction2.complaintEmailToCompany(company_id[0], ticket_no, result.insertId),
                // comFunction2.complaintSuccessEmailToUser(user_id[0], ticket_no, result.insertId)
                comFunction2.complaintEmailToCompany(company_id, ticket_no, result.insertId),
                comFunction2.complaintSuccessEmailToUser(user_id, ticket_no, result.insertId)
            ]);
            return res.send({
                status: 'ok',
                message: 'Complaint Registered  successfully !'
            });
        }
    })
}

//Complaint Register against CEchoes
exports.cechoescomplaintRegister = async (req, res) => {
    console.log('cechoescomplaintRegister', req.body);
    const { company_id, user_id, category_id, sub_category_id, model_no, allTags, transaction_date, location, message } = req.body;
    //return false;
    //const uuid = uuidv4();  
    const randomNo = Math.floor(Math.random() * (100 - 0 + 1)) + 0;
    const currentDate = new Date();
    const ticket_no = randomNo + currentDate.getTime();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');


    const data = {
        user_id: user_id,
        company_id: company_id,
        ticket_id: ticket_no,
        category_id: category_id,
        sub_cat_id: sub_category_id && sub_category_id !== undefined ? sub_category_id : 0,
        model_desc: model_no,
        // purchase_date: transaction_date,
        // purchase_place: concatenatedAddress,
        message: message,
        tags: JSON.stringify(allTags),
        level_id: '1',
        status: '2',
        created_at: formattedDate,
        level_update_at: formattedDate
    }


    // console.log(complaintEmailToCompany);
    const Query = `INSERT INTO complaint SET ?  `;
    db.query(Query, data, async (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            console.log(company_id, user_id, result.insertId)
            const [complaintEmailToCompany, complaintSuccessEmailToUser] = await Promise.all([
                //comFunction2.complaintEmailToCompany(company_id, ticket_no, result.insertId),
                comFunction2.complaintSuccessEmailToUser(user_id, ticket_no, result.insertId)
            ]);
            return res.send({
                status: 'ok',
                message: ' CEchoes Complaint Registered successfully !'
            });
        }
    })
}

//addPlan
exports.addPlan = async (req, res) => {
    console.log('addPlan', req.body);
    const { company_id, user_id, category_id, sub_category_id, model_no, allTags, transaction_date, location, message } = req.body;
    //return false;
    //const uuid = uuidv4();  
    const randomNo = Math.floor(Math.random() * (100 - 0 + 1)) + 0;
    const currentDate = new Date();
    const ticket_no = randomNo + currentDate.getTime();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');


    const data = {
        user_id: user_id,
        company_id: company_id,
        ticket_id: ticket_no,
        category_id: category_id,
        sub_cat_id: sub_category_id && sub_category_id !== undefined ? sub_category_id : 0,
        model_desc: model_no,
        // purchase_date: transaction_date,
        // purchase_place: concatenatedAddress,
        message: message,
        tags: JSON.stringify(allTags),
        level_id: '1',
        status: '2',
        created_at: formattedDate,
        level_update_at: formattedDate
    }


    // console.log(complaintEmailToCompany);
    const Query = `INSERT INTO complaint SET ?  `;
    db.query(Query, data, async (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            console.log(company_id, user_id, result.insertId)
            const [complaintEmailToCompany, complaintSuccessEmailToUser] = await Promise.all([
                //comFunction2.complaintEmailToCompany(company_id, ticket_no, result.insertId),
                comFunction2.complaintSuccessEmailToUser(user_id, ticket_no, result.insertId)
            ]);
            return res.send({
                status: 'ok',
                message: ' CEchoes Complaint Registered successfully !'
            });
        }
    })
}


exports.addMembershipPlan = async (req, res) => {

    const { plan_name, description, monthly_price, yearly_price, currency } = req.body;

    const planNames = ["basic", "standard", "advanced", "premium", "enterprise"];

    if (!planNames.includes(plan_name)) {
        return res.status(400).json({ message: 'Invalid plan name.' });
    }

    try {
        const checkQuery = `SELECT * FROM plan_management WHERE name = ?`;
        const existingPlan = await db.query(checkQuery, [plan_name]);

        if (existingPlan.length > 0) {
            const updateQuery = `
            UPDATE plan_management 
            SET description = ?, monthly_price = ?, yearly_price = ?, currency = ? 
            WHERE name = ?
        `;
            await db.query(updateQuery, [description, monthly_price, yearly_price, currency, plan_name]);
            return res.status(200).json({ message: `${plan_name} Plan Management updated successfully.` });
        } else {
            const insertQuery = `
            INSERT INTO plan_management (name, description, monthly_price, yearly_price, currency)
            VALUES (?, ?, ?, ?, ?)
        `;
            await db.query(insertQuery, [plan_name, description, monthly_price, yearly_price, currency]);
            return res.status(200).json({ message: 'Membership plan added successfully.' });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'An error occurred.', error: error.message });
    }

}

exports.updateBasic = async (req, res) => {
    try {
        const { descriptions, monthly_prices, yearly_prices, user_price } = req.body;
        console.log("updateBasic", req.body);

        const updatebasicquery = `UPDATE plan_management SET description = '${descriptions}', monthly_price = '${monthly_prices}', yearly_price = '${yearly_prices}',per_user_price= '${user_price}' WHERE name="basic"`;

        await query(updatebasicquery);

        return res.status(200).json({ message: 'Basic plan updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while updating the basic plan' });
    }
};

exports.updateAdvanced = async (req, res) => {
    try {
        const { descriptions, monthly_prices, yearly_prices, user_price } = req.body;
        console.log("updateAdvanced", req.body);

        const updatebasicquery = `UPDATE plan_management SET description = '${descriptions}', monthly_price = '${monthly_prices}', yearly_price = '${yearly_prices}',per_user_price= '${user_price}' WHERE name="advanced"`;

        await query(updatebasicquery);

        return res.status(200).json({ message: 'Advanced plan updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while updating the advanced plan' });
    }
};

exports.updateStandard = async (req, res) => {
    try {
        const { descriptions, standard_monthly_prices, standard_yearly_prices, monthly_price_id, yearly_price_id, user_price } = req.body;
        console.log("updateStandard", req.body);

        const updatebasicquery = `UPDATE plan_management SET description = '${descriptions}', monthly_price = '${standard_monthly_prices}', yearly_price = '${standard_yearly_prices}',per_user_price= '${user_price}' WHERE name="standard"`;

        await query(updatebasicquery);

        return res.status(200).json({ message: 'Standard plan updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while updating the Standard plan' });
    }
};

exports.updatePremium = async (req, res) => {
    try {
        const { descriptions, monthly_prices, yearly_prices, monthly_price_id, yearly_price_id, user_price } = req.body;
        console.log("updatePremium", req.body);

        const updatebasicquery = `UPDATE plan_management SET description = '${descriptions}', monthly_price = '${monthly_prices}', yearly_price = '${yearly_prices}',per_user_price= '${user_price}' WHERE name="premium"`;

        await query(updatebasicquery);

        return res.status(200).json({ message: 'Premium plan updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while updating the Premium plan' });
    }
};

exports.updateEnterprise = async (req, res) => {
    try {
        const { enterprise_descriptions, enterprise_monthly_prices, enterprise_yearly_prices, yearly_price_id, monthly_price_id, user_price } = req.body;
        //console.log("updateEnterprise", req.body);

        const updatebasicquery = `UPDATE plan_management SET description = '${enterprise_descriptions}', monthly_price = '${enterprise_monthly_prices}', yearly_price = '${enterprise_yearly_prices}', per_user_price= '${user_price}' WHERE name="enterprise"`;

        await query(updatebasicquery);

        return res.status(200).json({ message: 'Enterprise plan updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while updating the enterprise plan' });
    }
};


//Insert Company Query and  to user
exports.companyQuery = async (req, res) => {
    //console.log('companyQuery',req.body ); 
    //return false;
    const { company_id, user_id, complaint_id, message, complaint_status, complaint_level, company_slug } = req.body;

    if (complaint_status == '1') {
        const [updateComplaintStatus, complaintCompanyResolvedEmail] = await Promise.all([
            comFunction2.updateComplaintStatus(complaint_id, '1'),
            comFunction2.complaintCompanyResolvedEmail(complaint_id)
        ]);
    } else {
        await comFunction2.complaintCompanyResponseEmail(complaint_id)
    }

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const data = {
        user_id: user_id,
        company_id: company_id,
        complaint_id: complaint_id,
        query: message,
        response: '',
        created_at: formattedDate,
        level_id: complaint_level,
        notification_status: '0',
        resolve_status: complaint_status
    }
    const Query = `INSERT INTO complaint_query_response SET ?  `;
    db.query(Query, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            if (complaint_status == '1') {
                return res.send({
                    status: 'ok',
                    slug: company_slug,
                    message: 'Complaint resolved successfully !'
                });
            } else {
                return res.send({
                    status: 'ok',
                    slug: company_slug,
                    message: 'Complaint query send successfully !'
                });
            }

        }
    })
}

//user Complaint Rating
exports.userComplaintRating = async (req, res) => {
    //console.log('userComplaintRating',req.body ); 
    //return false;
    const { user_id, complaint_id, rating } = req.body;

    const data = {
        user_id: user_id,
        complaint_id: complaint_id,
        rating: rating,
    }
    const checkQuery = `SELECT id FROM complaint_rating WHERE complaint_id = '${complaint_id}' AND user_id = '${user_id}' `;
    db.query(checkQuery, (checkErr, checkResult) => {
        if (checkErr) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + checkErr
            });
        }
        if (checkResult.length > 0) {
            const updateQuery = `UPDATE complaint_rating SET rating='${rating}' WHERE complaint_id = '${complaint_id}' AND user_id = '${user_id}' `;
            db.query(updateQuery, (updateErr, updateResult) => {
                if (updateErr) {
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong  ' + updateErr
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Complaint rating updated successfully !'
                    });
                }
            })
        } else {
            const Query = `INSERT INTO complaint_rating SET ?  `;
            db.query(Query, data, (err, result) => {
                if (err) {
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong  ' + err
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Complaint rating submitted successfully !'
                    });
                }
            })
        }
    })

}

//Insert user Complaint Response  to company
exports.userComplaintResponse = async (req, res) => {
    //console.log('userComplaintResponse',req.body ); 
    //return false;
    const { company_id, user_id, complaint_id, message, complaint_level, complaint_status } = req.body;

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');


    if (complaint_status == '0') {
        const [updateComplaintStatus, complaintCompanyResolvedEmail] = await Promise.all([
            comFunction2.updateComplaintStatus(complaint_id, '0'),
            comFunction2.complaintUserReopenEmail(complaint_id)
        ]);
    } else {
        await comFunction2.complaintUserResponseEmail(complaint_id);
    }

    const data = {
        user_id: user_id,
        company_id: company_id,
        complaint_id: complaint_id,
        query: '',
        response: message,
        created_at: formattedDate,
        level_id: complaint_level,
        notification_status: '0',
        resolve_status: complaint_status
    }
    const Query = `INSERT INTO complaint_query_response SET ?  `;
    db.query(Query, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Complaint response send successfully !'
            });
        }
    })
}

// Create Survey
exports.createSurvey = async (req, res) => {
    console.log('Survey Response', req.body);
    console.log('Survey Response', req.file);
    //return false;
    const { created_at, expire_at, title, invitation_type, email, email_body, company_id, questions } = req.body;
    // const jsonString = Object.keys(req.body)[0];
    // const surveyResponse = JSON.parse(jsonString);
    // console.log(surveyResponse[0].questions);

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Months are zero-based (0 = January, 11 = December), so add 1
    const day = currentDate.getDate();
    const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
    const uniqueNumber = Date.now().toString().replace(/\D/g, "");
    req.body.unique_id = uniqueNumber;

    if (invitation_type[0] == 'Email' || invitation_type[0] == 'Both') {
        if (req.file) {
            const csvFilePath = path.join(__dirname, '..', 'company-csv', req.file.filename);
            const connection = await mysql.createConnection(dbConfig);

            const workbook = new ExcelJS.Workbook();
            await workbook.csv.readFile(csvFilePath);

            const worksheet = workbook.getWorksheet(1);
            const emailsArr = await processReviewCSVRows(worksheet);
            const emails = emailsArr.flat();
            console.log(emails);
            if (emails.length > 0) {
                req.body.emails = emails;
                // console.log('emails',emails);
                // console.log('req.body',req.body);

                const [SurveyInvitationFile] = await Promise.all([
                    comFunction2.SurveyInvitationFile(req.body)
                ]);

            } else {

                return res.send(
                    {
                        status: 'err',
                        message: 'You have to submit at least one email id.'
                    }
                )

            }
        } else {

            if (email.length > 2) {
                // console.log('emails',emails);
                // console.log('req.body',req.body);

                const [SurveyInvitationByArray] = await Promise.all([
                    comFunction2.SurveyInvitationByArray(req.body)
                ]);

            } else {

                return res.send(
                    {
                        status: 'err',
                        message: 'You have to submit at least one email id.'
                    }
                )

            }
        }
    }

    const surveyInsertData = [
        uniqueNumber,
        company_id[0],
        formattedDate,
        expire_at[0],
        title[0],
        questions,
        invitation_type[0],
    ];
    const sql = "INSERT INTO survey (unique_id, company_id, created_at, expire_at, title, questions, invitation_type) VALUES (?, ?, ?, ?, ?, ?, ?)";

    db.query(sql, surveyInsertData, async (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Survey successfully created'
            });
        }
    })
}

// Create Survey
exports.updateSurveyData = async (req, res) => {
    //  console.log( 'updateSurveyData', req.body );
    //  console.log( 'updateSurveyData', req.file );
    //return false;
    const { unique_id, created_at, expire_at, title, invitation_type, email, email_body, company_id, questions } = req.body;
    // const jsonString = Object.keys(req.body)[0];
    // const surveyResponse = JSON.parse(jsonString);
    // console.log(surveyResponse[0].questions);

    // const currentDate = new Date();
    // const year = currentDate.getFullYear();
    // const month = currentDate.getMonth() + 1; // Months are zero-based (0 = January, 11 = December), so add 1
    // const day = currentDate.getDate();
    // const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
    // const uniqueNumber = Date.now().toString().replace(/\D/g, "");
    // req.body.unique_id = uniqueNumber;

    if (invitation_type[0] == 'Email' || invitation_type[0] == 'Both') {
        if (req.file) {
            const csvFilePath = path.join(__dirname, '..', 'company-csv', req.file.filename);
            const connection = await mysql.createConnection(dbConfig);

            const workbook = new ExcelJS.Workbook();
            await workbook.csv.readFile(csvFilePath);

            const worksheet = workbook.getWorksheet(1);
            const emailsArr = await processReviewCSVRows(worksheet);
            const emails = emailsArr.flat();
            console.log(emails);
            if (emails.length > 0) {
                req.body.emails = emails;
                // console.log('emails',emails);
                // console.log('req.body',req.body);

                const [SurveyInvitationFile] = await Promise.all([
                    comFunction2.SurveyInvitationFile(req.body)
                ]);

            } else {

                return res.send(
                    {
                        status: 'err',
                        message: 'You have to submit at least one email id.'
                    }
                )

            }
        } else {

            if (email.length > 1) {
                // console.log('emails',emails);
                // console.log('req.body',req.body);

                const [SurveyInvitationByArray] = await Promise.all([
                    comFunction2.SurveyInvitationByArray(req.body)
                ]);

            } else {

                return res.send(
                    {
                        status: 'err',
                        message: 'You have to submit at least one email id.'
                    }
                )

            }
        }
    }

    const surveyInsertData = [
        expire_at[0],
        title[0],
        questions,
        invitation_type[0],
        unique_id[0]
    ];
    const sql = "UPDATE survey SET expire_at = ?, title = ?, questions = ?, invitation_type = ? WHERE unique_id = ?";


    db.query(sql, surveyInsertData, async (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Survey successfully Updated'
            });
        }
    })
}

// Update Survey
exports.updateSurvey = async (req, res) => {
    //console.log( 'Survey Response', req.body );

    const survey_update_query = 'UPDATE survey SET expire_at = ? WHERE id = ?';
    const values = [req.body.expire_at, req.body.survey_id];
    db.query(survey_update_query, values, (err, survey_update_query_results) => {
        return res.send(
            {
                status: 'ok',
                data: '',
                message: 'Survey successful updated'
            }
        )
    })
}

// Create Survey Answer
exports.createSurveyAnswer = async (req, res) => {
    console.log('Survey Response', req.body);
    const jsonString = Object.keys(req.body)[0];
    const surveyAnswerResponse = JSON.parse(jsonString);
    console.log(surveyAnswerResponse);


    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Months are zero-based (0 = January, 11 = December), so add 1
    const day = currentDate.getDate();
    const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;

    const surveyAnswerInsertData = [
        surveyAnswerResponse[0].company_id,
        surveyAnswerResponse[0].survey_unique_id,
        surveyAnswerResponse[0].customer_id,
        JSON.stringify(surveyAnswerResponse[0].answers),
        formattedDate,
    ];
    const sql = "INSERT INTO survey_customer_answers (company_id, survey_unique_id, customer_id, answer, created_at) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, surveyAnswerInsertData, async (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Your survey answers successfully submitted'
            });
        }
    })
}

// Create Survey Answer
exports.createInvitedSurveyAnswer = async (req, res) => {
    console.log('createInvitedSurveyAnswer', req.body);
    //return false;
    const jsonString = Object.keys(req.body)[0];
    const surveyAnswerResponse = JSON.parse(jsonString);
    console.log(surveyAnswerResponse);


    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Months are zero-based (0 = January, 11 = December), so add 1
    const day = currentDate.getDate();
    const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;

    const surveyAnswerInsertData = [
        surveyAnswerResponse[0].company_id,
        surveyAnswerResponse[0].survey_unique_id,
        surveyAnswerResponse[0].customer_id,
        JSON.stringify(surveyAnswerResponse[0].answers),
        formattedDate,
        surveyAnswerResponse[0].first_name,
        surveyAnswerResponse[0].last_name,
        surveyAnswerResponse[0].answers.invitation_email
    ];
    console.log("surveyAnswerInsertData", surveyAnswerInsertData);


    const sql = "INSERT INTO survey_customer_answers (company_id, survey_unique_id, customer_id, answer, created_at, first_name, last_name, invitation_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    db.query(sql, surveyAnswerInsertData, async (err, result) => {
        if (err) {
            return res.send({
                status: 'error',
                message: err
            });
        } else {
            const updateQuery = `UPDATE suvey_invitation_details SET status = '1'  WHERE encrypted_email = '${surveyAnswerResponse[0].encrypted_email}' `;
            db.query(updateQuery, (updateErr, updateRes) => {
                if (updateErr) {
                    return res.send({
                        status: 'error',
                        message: updateErr
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Thank You for Participating in Our Survey!'
                    });
                }
            })
        }
    })

}

//--- survey Bulk Invitation ----//
exports.surveyBulkInvitation = async (req, res) => {
    //console.log('surveyBulkInvitation',req.body);
    //console.log('surveyBulkInvitation',req.file);
    //return false;
    const { email_body, user_id, company_id, company_name, company_slug, survey_id, unique_id } = req.body;

    if (!req.file) {
        return res.send(
            {
                status: 'err',
                data: '',
                message: 'No file uploaded.'
            }
        )
    }
    const csvFilePath = path.join(__dirname, '..', 'company-csv', req.file.filename);
    try {
        const connection = await mysql.createConnection(dbConfig);

        const workbook = new ExcelJS.Workbook();
        await workbook.csv.readFile(csvFilePath);

        const worksheet = workbook.getWorksheet(1);
        const emailsArr = await processReviewCSVRows(worksheet);
        const emails = emailsArr.flat();

        req.body.emails = emails;
        // console.log('emails',emails);
        // console.log('req.body',req.body);

        const [sendSurveyInvitationEmail] = await Promise.all([
            comFunction2.sendSurveyInvitationEmail(req.body)
        ]);

        return res.send({
            status: 'ok',
            message: 'Survey Invitation emails send successfully'
        });


    } catch (error) {
        console.error('Error:', error);
        return res.send({
            status: 'err',
            message: error.message
        });
    } finally {
        // Delete the uploaded CSV file
        //fs.unlinkSync(csvFilePath);
    }
}

// Survey Invitation
exports.surveyInvitation = async (req, res) => {
    console.log('surveyInvitation', req.body);
    //return false;
    const { emails, email_body, user_id, company_id, company_name, company_slug, survey_id, unique_id } = req.body;
    const [sendSurveyInvitationEmail] = await Promise.all([
        comFunction2.sendSurveyInvitationEmail(req.body)
    ]);

    return res.send({
        status: 'ok',
        message: 'Survey Invitation emails send successfully'
    });
}

//Delete Discussion 
exports.deleteDiscussion = async (req, res) => {
    //console.log('deleteDiscussion',req.body ); 
    //return false;
    const delQuery = `DELETE discussions, discussions_user_response
    FROM discussions
    LEFT JOIN discussions_user_response ON discussions.id = discussions_user_response.discussion_id
    WHERE discussions.id = '${req.body.discussionid}';`;
    db.query(delQuery, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong 2 ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Discussion Deleted successfully !'
            });
        }
    })
}

//Delete Comment
exports.deleteComment = async (req, res) => {
    //console.log('deleteDiscussion',req.body ); 
    //return false;
    const delQuery = `DELETE FROM discussions_user_response WHERE id = '${req.body.commentid}'`;
    db.query(delQuery, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Comment Deleted successfully !'
            });
        }
    })
}

//Delete Poll 
exports.deletePoll = async (req, res) => {
    //console.log('deleteDiscussion',req.body ); 
    //return false;
    const delQuery = `DELETE poll_company, poll_answer, poll_voting
    FROM poll_company
    LEFT JOIN poll_answer ON poll_company.id = poll_answer.poll_id
    LEFT JOIN poll_voting ON poll_company.id = poll_voting.poll_id
    WHERE poll_company.id = '${req.body.pollId}'`;

    db.query(delQuery, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Poll Deleted successfully !'
            });
        }
    })
}

//Delete Complaint 
exports.deleteComplaint = async (req, res) => {
    //console.log('deleteDiscussion',req.body ); 
    //return false;
    const delQuery = `DELETE complaint, complaint_query_response, complaint_rating
    FROM complaint
    LEFT JOIN complaint_query_response ON complaint.id = complaint_query_response.complaint_id
    LEFT JOIN complaint_rating ON complaint.id = complaint_rating.complaint_id
    WHERE complaint.id = '${req.body.complaintId}'`;

    db.query(delQuery, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Complaint Deleted successfully !'
            });
        }
    })
}

//Delete Survey 
exports.deleteSurvey = async (req, res) => {
    //console.log('deleteDiscussion',req.body ); 
    //return false;
    const delQuery = `DELETE survey, survey_customer_answers
    FROM survey
    LEFT JOIN survey_customer_answers ON survey.unique_id = survey_customer_answers.survey_unique_id
    WHERE survey.id = '${req.body.surveyId}'`;

    const surveyInvitationDetailsDeleteQuery = `
    DELETE FROM survey_invitation_details
    WHERE unique_id IN (
        SELECT unique_id
        FROM survey
        WHERE id = '${req.body.surveyId}'
    )
`;

    db.query(delQuery, (err, result) => {
        if (err) {
            console.log(err);
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            db.query(surveyInvitationDetailsDeleteQuery, (invitationErr, invitationRes) => {
                if (err) {
                    console.log(err);
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong  ' + err
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Survey Deleted successfully !'
                    });
                }
            })
        }
    })
}

// exports.deleteSurvey = async (req, res) => {
//     const delQuery = `
//         DELETE survey, survey_customer_answers, survey_invitation_details
//         FROM survey
//         LEFT JOIN survey_customer_answers ON survey.unique_id = survey_customer_answers.survey_unique_id
//         LEFT JOIN survey_invitation_details ON survey.unique_id = survey_invitation_details.unique_id
//         WHERE survey.id = '${req.body.surveyId}'
//     `;

//     db.query(delQuery, (err, result) => {
//         if (err) {
//             return res.send({
//                 status: 'not ok',
//                 message: 'Something went wrong ' + err
//             });
//         } else {
//             return res.send({
//                 status: 'ok',
//                 message: 'Survey Deleted successfully!'
//             });
//         }
//     });
// }


//discussion company create tags
exports.companyCreateTags = async (req, res) => {
    console.log('createDiscussion', req.body);
    //return false;
    const { user_id, tags, company_id } = req.body;
    const strTags = JSON.stringify(tags);
    checkQuery = `SELECT * FROM duscussions_company_tags WHERE company_id = '${company_id}' `;
    db.query(checkQuery, (checkErr, checkResult) => {
        if (checkErr) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + checkErr
            });
        }
        if (checkResult.length > 0) {
            let preTags = JSON.parse(checkResult[0].tags);
            const joinTags = preTags.concat(tags);
            let uniqueArray = joinTags.filter((it, i, ar) => ar.indexOf(it) === i);
            const updateTags = JSON.stringify(uniqueArray);
            //console.log(tags, preTags,joinTags, uniqueArray)
            const sql = `UPDATE duscussions_company_tags SET tags = ? WHERE company_id = ? `;
            const data = [updateTags, company_id];
            db.query(sql, data, (err, result) => {
                if (err) {
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong ' + err
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Your Discussion Tags Updated Successfully'
                    });
                }
            })
        } else {
            const sql = `INSERT INTO duscussions_company_tags ( company_id, tags) VALUES (?, ?)`;
            const data = [company_id, strTags];
            db.query(sql, data, (err, result) => {
                if (err) {
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong ' + err
                    });
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Your Discussion Tags Added Successfully'
                    });
                }
            })
        }
    })

}

//discussion company update tags
exports.updateCompanyTags = async (req, res) => {
    console.log('updateCompanyTags', req.body);
    //return false;
    const { tags, company_id } = req.body;
    const strTags = JSON.stringify(tags);
    const sql = `UPDATE duscussions_company_tags SET tags = ? WHERE company_id = ? `;
    const data = [strTags, company_id];
    db.query(sql, data, (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Your Discussion Tag Deleted Successfully'
            });
        }
    })

}

//Notification Content
exports.notificationContent = async (req, res) => {
    //console.log('notificationContent',req.body ); 
    //console.log('notificationContent',req.file ); 
    //return false;

}
//compare Chart Filter
exports.compareChartFilter = async (req, res) => {
    console.log('compareChartFilter', req.body);
    const { company_id, company_name, from, to } = req.body

    const getCompanyReviewsBetween = await comFunction.getCompanyReviewsBetween(company_id, from, to)
    //console.log(getCompanyReviewsBetween)
    return res.send({
        status: 'ok',
        data: getCompanyReviewsBetween,
        company_name: company_name,
        message: 'Company Reviews Data fetch successfully '
    });
    //return false;

}

//historical Chart Filter
exports.historicalChartFilter = async (req, res) => {
    //console.log('historicalChartFilter', req.body);
    const { company_id, company_name, from, to, filter } = req.body;

    try {
        let getCompanyHistoricalData = await comFunction2.getCompanyHistoricalReviewBetween(company_id, from, to, filter);

        console.log('getCompanyHistoricalData', getCompanyHistoricalData);

        if (getCompanyHistoricalData.length === 0) {
            getCompanyHistoricalData = [{
                date_group: 0,
                created_at: '2023-01-01T03:09:07.000Z',
                average_rating: 0
            }]
        }
        return res.send({
            status: 'ok',
            data: getCompanyHistoricalData,
            filter: filter,
            company_name: company_name,
            message: 'Company Reviews Data fetch successfully '
        });

    } catch (error) {
        console.error('Error in historicalChartFilter:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error'
        });
    }
};

//historical Chart Filter
exports.competitorCompanyChart = async (req, res) => {
    console.log('competitorCompanyChart', req.body);
    const { company_id, company_name, competitor } = req.body;
    let competitorChartData = [];

    try {
        const ownCompanyData = await comFunction.getCompanyReviewsBetween(company_id);
        competitorChartData.push(ownCompanyData);

        let otherDataPromises = [];

        if (competitor != '') {
            if (Array.isArray(competitor)) {
                competitor.forEach((id) => {
                    otherDataPromises.push(comFunction.getCompanyReviewsBetween(id));
                });
            } else {
                otherDataPromises.push(comFunction.getCompanyReviewsBetween(competitor));
            }
        }

        const otherDataArray = await Promise.all(otherDataPromises);

        competitorChartData.push(...otherDataArray);

        console.log('competitorChartData', competitorChartData);

        return res.send({
            status: 'ok',
            data: competitorChartData,
            company_name: company_name,
            message: 'Company competitor Chart  Data fetch successfully'
        });
    } catch (error) {
        console.error('Error in competitor Chart Data:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error'
        });
    }
};

//escalate to Next Level
exports.escalateNextLevel = async (req, res) => {
    console.log('escalateNextLevel', req.body);
    //return false;
    const { complaintId, customerId, levelId } = req.body;

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

    const sql = `SELECT c.*, clm.eta_days, clm.emails, u.first_name, u.email, comp.slug FROM 
    complaint c
    LEFT JOIN complaint_level_management clm ON clm.company_id = c.company_id AND clm.level = '${levelId + 1}'
    LEFT JOIN users u ON u.user_id = c.user_id 
    LEFT JOIN company comp ON comp.ID = c.company_id 
    WHERE c.id = '${complaintId}' `;
    const results = await query(sql);
    const emails = JSON.parse(results[0].emails);
    var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: results[0].email,
        cc: emails,
        subject: 'Escalate to next level email',
        html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
        <style>
        body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
            font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
        }
        </style>
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
                        <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                        <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                            <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Escalate to next level email</h1>
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
                                    <strong>Hello Dear,</strong>
                                    <p style="font-size:15px; line-height:20px">Please review the complaint details and initiate the necessary steps to resolve the issue at the earliest. Your prompt attention to this matter is highly appreciated. Pending complaint ticket id: <a  href="${process.env.MAIN_URL}company-compnaint-details/${results[0].slug}/${results[0].id}">${results[0].ticket_id}</a>. 
                                    </p>
                                  </td>
                                </tr>
                                  <tr>
                                  </tr>
                                </table>
                                
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
            return false;
        } else {
            console.log('Mail Send: ', info.response);

        }
    })

    try {

        const updateQuery = `UPDATE complaint SET level_id= '${levelId + 1}', level_update_at ='${formattedDate}'  WHERE id = '${complaintId}' `;
        db.query(updateQuery, (err, resut) => {
            if (err) {
                return res.send({
                    status: 'not ok',
                    message: 'Something went wrong ' + err
                });
            } else {
                return res.send({
                    status: 'ok',
                    message: 'Complaint level escalate to next level successfully.'
                });
            }
        })
    } catch (error) {
        console.error('Error in escalateNextLevel:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error'
        });
    }
};

//add payment details
exports.addPayment = (req, res) => {
    //console.log('addPayment',req.body);
    //return false;
    const { company_id, transaction_id, payment_mode, amount, transaction_date, membership_plan, remarks, subscription_mode, start_date, expire_date } = req.body;
    //return false;
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const data = {
        transaction_id: transaction_id || null,
        company_id: company_id,
        mode_of_payment: payment_mode,
        amount: amount,
        transaction_date: transaction_date,
        membership_plan_id: membership_plan,
        remarks: remarks,
        subscription_mode: subscription_mode,
        start_date: start_date,
        expire_date: expire_date,
        created_at: formattedDate,
        updated_at: formattedDate,
    }


    // console.log(complaintEmailToCompany);
    const Query = `INSERT INTO payments SET ?  `;
    db.query(Query, data, async (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Payment details registered  successfully !'
            });
        }
    })
}

//Edit payment details
exports.editPayment = (req, res) => {
    //console.log('editPayment',req.body);
    //return false;
    const { company_id, transaction_id, payment_mode, amount, transaction_date, membership_plan, remarks, subscription_mode, start_date, expire_date, payment_id } = req.body;
    //return false;
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const data = {
        transaction_id: transaction_id || null,
        company_id: company_id,
        mode_of_payment: payment_mode,
        amount: amount,
        transaction_date: transaction_date,
        membership_plan_id: membership_plan,
        remarks: remarks,
        subscription_mode: subscription_mode,
        start_date: start_date,
        expire_date: expire_date,
        updated_at: formattedDate,
    }


    // console.log(complaintEmailToCompany);
    const Query = `UPDATE payments  SET ? WHERE id = ${payment_id} `;
    db.query(Query, data, async (err, result) => {
        if (err) {
            return res.send({
                status: 'not ok',
                message: 'Something went wrong  ' + err
            });
        } else {
            return res.send({
                status: 'ok',
                message: 'Payment details updated  successfully !'
            });
        }
    })
}

//Edit Discussion
// exports.editDiscussion = (req, res) => {
//     console.log('editDiscussion', req.body);
//     // return false;
//     const { discussion_id, content, tags,discussion_status,...commentStatuses } = req.body;
//     var allTags;
//     if (tags == '') {
//         //console.log('aaaaaaaaa')
//         allTags = [];
//     } else {
//         // console.log('bbbbbb')
//         const jsonArray = JSON.parse(tags);
//         allTags = jsonArray.map(item => item.value);
//         // console.log(tags,jsonArray,allTags )
//     }

//     const data = {
//         topic: content,
//         tags: JSON.stringify(allTags),
//         discussion_status: discussion_status
//     }


//     // console.log(complaintEmailToCompany);
//     const Query = `UPDATE discussions  SET ? WHERE id = ${discussion_id} `;
//     db.query(Query, data, async (err, result) => {
//         if (err) {
//             return res.send({
//                 status: 'not ok',
//                 message: 'Something went wrong  ' + err
//             });
//         } else {
//             try {
//                 // Process dynamic comment statuses
//                 for (const [commentId, commentStatus] of Object.entries(commentStatuses)) {
//                     console.log(`Updating comment status. Comment ID: ${commentId} New Status: ${commentStatus}`);

//                     if (commentStatus !== undefined && [0, 1, 2].includes(parseInt(commentStatus))) {
//                         const comment_query = await query('UPDATE discussions_user_response SET comment_status = ? WHERE discussion_id = ?', [commentStatus, commentId]);
//                         console.log('Comment update successful:', comment_query);
//                     } else {
//                         console.error(`Invalid comment_status for Comment ID ${commentId}:`, commentStatus);
//                     }
//                 }
//             } catch (error) {
//                 console.error('Error updating comment status:', error);
//             }

//             const user_details = await query(`
//             SELECT users.email AS email
//             FROM discussions
//             LEFT JOIN users ON discussions.user_id = users.user_id
//             WHERE discussions.id = "${discussion_id}"
//         `);
//             const user_email = user_details[0].email
//             //console.log("user_email", user_email);


//             const discussion_status_result = req.body.discussion_status;
//             //console.log("discussion_status_result",discussion_status_result);
//             if(discussion_status_result == 1){
//                 var mailOptions = {
//                     from: process.env.MAIL_USER,
//                     to: user_email,
//                     //to: 'dev2.scwt@gmail.com',
//                     subject: 'Discussion Approval',
//                     html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
//             <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
//               <tbody>
//               <tr>
//                 <td align="center" valign="top">
//                   <div id="template_header_image"><p style="margin-top: 0;"></p></div>
//                   <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
//                   <tbody>
//                     <tr>
//                       <td align="center" valign="top">
//                         <!-- Header -->
//                         <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
//                           <tbody>
//                             <tr>
//                             <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
//                             <td id="header_wrapper" style="padding: 36px 48px; display: block;">
//                                 <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Discussion approval email</h1>
//                             </td>

//                             </tr>
//                           </tbody>
//                         </table>
//                   <!-- End Header -->
//                   </td>
//                     </tr>
//                     <tr>
//                       <td align="center" valign="top">
//                         <!-- Body -->
//                         <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
//                           <tbody>
//                             <tr>
//                             <td id="body_content" style="background-color: #fdfdfd;" valign="top">
//                               <!-- Content -->
//                               <table border="0" cellpadding="20" cellspacing="0" width="100%">
//                                 <tbody>
//                                 <tr>
//                                   <td style="padding: 48px;" valign="top">
//                                     <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">

//                                     <table border="0" cellpadding="4" cellspacing="0" width="90%">
//                                     <tr>
//                                       <td colspan="2">
//                                         <strong>Hello Dear,</strong>
//                                         <p style="font-size: 15px; line-height: 20px">
//                                         Your created discussion has been approved by the Admin.You can click
//                                         <a href="${process.env.MAIN_URL}discussion-details/${discussion_id}"> here</a> to see the discussion.
//                                       </p>                                          
//                                       </td>
//                                     </tr>
//                                       <tr>
//                                       </tr>
//                                     </table>
//                                     </div>
//                                   </td>
//                                 </tr>
//                                 </tbody>
//                               </table>
//                             <!-- End Content -->
//                             </td>
//                             </tr>
//                           </tbody>
//                         </table>
//                       <!-- End Body -->
//                       </td>
//                     </tr>
//                     <tr>
//                       <td align="center" valign="top">
//                         <!-- Footer -->
//                         <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
//                         <tbody>
//                           <tr>
//                           <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
//                             <table border="0" cellpadding="10" cellspacing="0" width="100%">
//                               <tbody>
//                                 <tr>
//                                 <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
//                                       <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
//                                 </td>
//                                 </tr>
//                               </tbody>
//                             </table>
//                           </td>
//                           </tr>
//                         </tbody>
//                         </table>
//                       <!-- End Footer -->
//                       </td>
//                     </tr>
//                   </tbody>
//                   </table>
//                 </td>
//               </tr>
//               </tbody>
//             </table>
//             </div>`
//                 }
//                 mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
//                     if (err) {
//                         console.log(err);
//                         return false;
//                     } else {
//                         console.log('Mail Send: ', info.response);
//                     }
//                 })
//             }
//             return res.send({
//                 status: 'ok',
//                 message: 'Discussion details updated successfully !'
//             });
//         }
//     })
// }

// exports.editDiscussion = (req, res) => {
//     console.log('editDiscussion', req.body);
//     // return false;
//     const { discussion_id, content, tags, discussion_status, comment_status, comment_id } = req.body;
//     var allTags;
//     if (tags == '') {
//         //console.log('aaaaaaaaa')
//         allTags = [];
//     } else {
//         // console.log('bbbbbb')
//         const jsonArray = JSON.parse(tags);
//         allTags = jsonArray.map(item => item.value);
//         // console.log(tags,jsonArray,allTags )
//     }

//     const data = {
//         topic: content,
//         tags: JSON.stringify(allTags),
//         discussion_status: discussion_status
//     }


//     // console.log(complaintEmailToCompany);
//     const Query = `UPDATE discussions  SET ? WHERE id = ${discussion_id} `;
//     db.query(Query, data, async (err, result) => {
//         if (err) {
//             return res.send({
//                 status: 'not ok',
//                 message: 'Something went wrong  ' + err
//             });
//         } else {
//             const datas = {
//                 comment_status: comment_status
//             }

//             const Query = `UPDATE discussions_user_response  SET ? WHERE id = ${discussion_id} AND id = ${comment_id} `;
//             db.query(Query, datas, async (err, results) => {
//                 if (err) {
//                     return res.send({
//                         status: 'not ok',
//                         message: 'Something went wrong  ' + err
//                     });
//                 }
//                 else {
//                     const user_details = await query(`
//                         SELECT users.email AS email
//                         FROM discussions
//                         LEFT JOIN users ON discussions.user_id = users.user_id
//                         WHERE discussions.id = "${discussion_id}"
//                     `);
//                     const user_email = user_details[0].email
//                     //console.log("user_email", user_email);


//                     const discussion_status_result = req.body.discussion_status;
//                     //console.log("discussion_status_result",discussion_status_result);
//                     if (discussion_status_result == 1) {
//                         var mailOptions = {
//                             from: process.env.MAIL_USER,
//                             //to: user_email,
//                             to: 'dev2.scwt@gmail.com',
//                             subject: 'Discussion Approval',
//                             html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
//             <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
//               <tbody>
//               <tr>
//                 <td align="center" valign="top">
//                   <div id="template_header_image"><p style="margin-top: 0;"></p></div>
//                   <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
//                   <tbody>
//                     <tr>
//                       <td align="center" valign="top">
//                         <!-- Header -->
//                         <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
//                           <tbody>
//                             <tr>
//                             <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
//                             <td id="header_wrapper" style="padding: 36px 48px; display: block;">
//                                 <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Discussion approval email</h1>
//                             </td>

//                             </tr>
//                           </tbody>
//                         </table>
//                   <!-- End Header -->
//                   </td>
//                     </tr>
//                     <tr>
//                       <td align="center" valign="top">
//                         <!-- Body -->
//                         <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
//                           <tbody>
//                             <tr>
//                             <td id="body_content" style="background-color: #fdfdfd;" valign="top">
//                               <!-- Content -->
//                               <table border="0" cellpadding="20" cellspacing="0" width="100%">
//                                 <tbody>
//                                 <tr>
//                                   <td style="padding: 48px;" valign="top">
//                                     <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">

//                                     <table border="0" cellpadding="4" cellspacing="0" width="90%">
//                                     <tr>
//                                       <td colspan="2">
//                                         <strong>Hello Dear,</strong>
//                                         <p style="font-size: 15px; line-height: 20px">
//                                         Your created discussion has been approved by the Admin.You can click
//                                         <a href="${process.env.MAIN_URL}discussion-details/${discussion_id}"> here</a> to see the discussion.
//                                       </p>                                          
//                                       </td>
//                                     </tr>
//                                       <tr>
//                                       </tr>
//                                     </table>
//                                     </div>
//                                   </td>
//                                 </tr>
//                                 </tbody>
//                               </table>
//                             <!-- End Content -->
//                             </td>
//                             </tr>
//                           </tbody>
//                         </table>
//                       <!-- End Body -->
//                       </td>
//                     </tr>
//                     <tr>
//                       <td align="center" valign="top">
//                         <!-- Footer -->
//                         <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
//                         <tbody>
//                           <tr>
//                           <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
//                             <table border="0" cellpadding="10" cellspacing="0" width="100%">
//                               <tbody>
//                                 <tr>
//                                 <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
//                                       <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
//                                 </td>
//                                 </tr>
//                               </tbody>
//                             </table>
//                           </td>
//                           </tr>
//                         </tbody>
//                         </table>
//                       <!-- End Footer -->
//                       </td>
//                     </tr>
//                   </tbody>
//                   </table>
//                 </td>
//               </tr>
//               </tbody>
//             </table>
//             </div>`
//                         }
//                         mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
//                             if (err) {
//                                 console.log(err);
//                                 return false;
//                             } else {
//                                 console.log('Mail Send: ', info.response);
//                             }
//                         })
//                     }

//                     return res.send({
//                         status: 'ok',
//                         message: 'Discussion details updated successfully !'
//                     });
//                 }
//             })
//         }
//     })
// }

// Express route to handle a new like
// exports.likeComment = (req, res) => {
//     const encodedUserData = req.cookies.user;
//     const currentUserData = JSON.parse(encodedUserData);
//     console.log("currentUserData", currentUserData);
//     console.log("encodedUserData", encodedUserData);

//     const currentDate = new Date();

//     const year = currentDate.getFullYear();
//     const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//     const day = String(currentDate.getDate()).padStart(2, '0');
//     const hours = String(currentDate.getHours()).padStart(2, '0');
//     const minutes = String(currentDate.getMinutes()).padStart(2, '0');
//     const seconds = String(currentDate.getSeconds()).padStart(2, '0');

//     const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

//     const { discussionId, commentId, userId } = req.body;
//     const insertQuery = 'INSERT INTO discussion_comment_liked_data(discussion_id, comment_id, user_id, voting, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)';
//     db.query(insertQuery, [discussionId, commentId, userId,"1",formattedDate,formattedDate], (insertError, insertResults) => {
//         if (insertError) {
//             console.error('Error inserting like:', insertError);
//             return res.status(500).json({ error: 'Error in comment like.' });
//         }
//         return res.status(200).json({ message: 'Like added successfully.' });
//     });
// };

exports.editDiscussion = (req, res) => {
    const {
        discussion_id,
        content,
        tags,
        discussion_status,
        coment,
        ...commentStatuses
    } = req.body;

    console.log("edit-discussion", req.body);
    console.log("commentStatuses", commentStatuses);

    if (Object.keys(commentStatuses).length > 0) {
        //console.log("aaaaabbba");
        const allTags = tags ? JSON.parse(tags).map(item => item.value) : [];


        const discussionQuery = 'UPDATE discussions SET ? WHERE id = ?';
        const discussionData = {
            topic: content,
            tags: JSON.stringify(allTags),
            discussion_status
        };
        console.log("discussionData", discussionData);

        db.query(discussionQuery, [discussionData, discussion_id], (err, results) => {
            if (err) {
                console.error('Error updating discussions table:', err);
                return;
            }
            console.log('Discussions table updated successfully');
        });


        const promises = Object.keys(commentStatuses).map(commentId => {
            const commentData = {
                comment_status: commentStatuses[commentId]
            };

            const extractedCommentId = commentId.replace('comment_status_', '');

            console.log(`Comment ${extractedCommentId} status: ${commentStatuses[commentId]}`);

            ///

            if (commentStatuses[commentId] == 1) {
                const getCommentQuery = 'SELECT user_id FROM discussions_user_response WHERE id = ?';
                db.query(getCommentQuery, [extractedCommentId], (commentError, commentResults) => {
                    if (commentError) {
                        console.error('Error fetching comment details:', commentError);
                        return;
                    }

                    const user_id = commentResults[0].user_id;
                    console.log("user_id", user_id);

                    const user_query = 'SELECT email,first_name,last_name FROM users WHERE user_id = ?';
                    db.query(user_query, [user_id], (error, results) => {
                        if (error) {
                            console.error('Error fetching user details:', error);
                            return;
                        }

                        if (results.length > 0) {
                            var userEmail = results[0].email;
                            // console.log("User email:", userEmail);
                            // console.log("User first_name:", results[0].first_name);
                            // console.log("User last_name:", results[0].last_name);
                            const full_name = `${results[0].first_name} ${results[0].last_name}`;
                            console.log("full_name", full_name);

                            const mailOptions = {
                                from: process.env.MAIL_USER,
                                to: userEmail,
                                //to: "dev2.scwt@gmail.com",
                                subject: 'Comment approval mail',
                                html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                                <style>
                                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                                }
                                </style>
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
                                               <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;"> Comment on ${content} has been approved.</h1>
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
                                                            <strong>Hello ${full_name},</strong>
                                                            <p style="font-size:15px; line-height:20px">Your comment for the discussion has been approved. Now you can see your comment on the <a href="${process.env.MAIN_URL}discussion-details/${discussion_id}">here</a>.</p>
                                                            </td>
                                                          </tr>
                                                        </table>
                                                        
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
                            };
                            mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                                if (err) {
                                    console.log(err);
                                    return res.send({
                                        status: 'not ok',
                                        message: 'Something went wrong'
                                    });
                                } else {
                                    console.log('Mail Send: ', info.response);
                                    return res.send({
                                        status: 'ok',
                                        message: 'discussion Approve'
                                    });
                                }
                            })
                        } else {
                            console.log("User not found or has no email");
                        }
                    });

                })

                const authorQuery = 'SELECT user_id FROM discussions WHERE id = ?';
                db.query(authorQuery, [discussion_id], (commentError, commentResults) => {
                    if (commentError) {
                        console.error('Error fetching author details:', commentError);
                        return;
                    }

                    const user_id = commentResults[0].user_id;
                    //console.log("user_id",user_id);

                    const user_query = 'SELECT email,first_name,last_name FROM users WHERE user_id = ?';
                    db.query(user_query, [user_id], (error, results) => {
                        if (error) {
                            console.error('Error fetching user details:', error);
                            return;
                        }

                        if (results.length > 0) {
                            var userEmail = results[0].email;
                            // console.log("author email:", userEmail);
                            // console.log("author first_name:", results[0].first_name);
                            // console.log("author last_name:", results[0].last_name);
                            const full_name = `${results[0].first_name} ${results[0].last_name}`;
                            //console.log("full_name",full_name);


                            const authormailOptions = {
                                from: process.env.MAIL_USER,
                                to: userEmail,
                                //to: "dev2.scwt@gmail.com",
                                subject: 'Comment Approval',
                                html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                                <style>
                                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                                }
                                </style>
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
                                               <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Comment on ${content} has been approved.</h1>
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
                                                            <strong>Hello ${full_name},</strong>
                                                            <p style="font-size:15px; line-height:20px">Comment for the ${content} discussion has been approved. Now you can see the discusion comment on the <a href="${process.env.MAIN_URL}discussion-details/${discussion_id}">here</a>.</p>
                                                            </td>
                                                          </tr>
                                                        </table>
                                                        
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
                            };
                            mdlconfig.transporter.sendMail(authormailOptions, function (err, info) {
                                if (err) {
                                    console.log(err);
                                    return res.send({
                                        status: 'not ok',
                                        message: 'Something went wrong'
                                    });
                                } else {
                                    console.log('Mail Send: ', info.response);
                                    return res.send({
                                        status: 'ok',
                                        message: 'Review Approve'
                                    });
                                }
                            })
                        } else {
                            console.log("User not found or has no email");
                        }
                    });

                })
            }



            const commentQuery = `UPDATE discussions_user_response SET ? WHERE id = ${extractedCommentId} `;
            return new Promise((resolve, reject) => {
                db.query(commentQuery, commentData, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });

        });

        Promise.all(promises)
            .then(() => {
                return res.send({
                    status: 'ok',
                    message: 'Discussion details updated successfully.'
                });
            })
            .catch(err => {
                return res.send({
                    status: 'not ok',
                    message: 'Error updating comments ' + err
                });
            });
    }
    else {
        console.log('commentStatuses is empty');
        const allTags = tags ? JSON.parse(tags).map(item => item.value) : [];

        const discussionData = {
            topic: content,
            tags: JSON.stringify(allTags),
            discussion_status
        };
        console.log("discussionData", discussionData);

        const discussionQuery = `UPDATE discussions SET ? WHERE id = ${discussion_id} `;
        db.query(discussionQuery, discussionData, async (err, result) => {
            if (err) {
                return res.send({
                    status: 'not ok',
                    message: 'Something went wrong ' + err
                });
            } else {
                const discussion_status = discussionData.discussion_status
                console.log("discussion_status", discussion_status);
                if (discussion_status == 1) {
                    const disuser_query = `SELECT discussions.user_id,users.first_name,users.last_name,users.email FROM discussions LEFT JOIN users ON discussions.user_id = users.user_id WHERE discussions.id = ${discussion_id}`;
                    const disuser_value = await query(disuser_query);
                    console.log("disuser_value", disuser_value);

                    const full_name = `${disuser_value[0].first_name} ${disuser_value[0].last_name}`;
                    //console.log("full_name",full_name);
                    var email = disuser_value[0].email;
                    //console.log("email",email);



                    const mailOptions = {
                        from: process.env.MAIL_USER,
                        to: email,
                        //to: "dev2.scwt@gmail.com",
                        subject: 'Discussion approval mail',
                        html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                        <style>
                                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                                }
                        </style>
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
                                <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                    <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                    <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;"> Your discussion ${content} has been approved.</h1>
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
                                                <strong>Hello ${full_name},</strong>
                                                <p style="font-size:15px; line-height:20px">Your discussion has been approved. Now you can see your discussion on the <a href="${process.env.MAIN_URL}discussion-details/${discussion_id}">here</a> after login.</p>
                                                </td>
                                            </tr>
                                            </table>
                                            
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
                    };
                    mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                        if (err) {
                            console.log(err);
                            return res.send({
                                status: 'not ok',
                                message: 'Something went wrong'
                            });
                        } else {
                            console.log('Mail Send: ', info.response);
                            return res.send({
                                status: 'ok',
                                message: 'Discussion details updated successfully.'
                            });
                        }
                    })
                } else {
                    return res.send({
                        status: 'ok',
                        message: 'Discussion details updated successfully!'
                    });
                }

                function sendEmail(to, subject, text) {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'your_email@gmail.com',
                            pass: 'your_password',
                        },
                    });

                    const mailOptions = {
                        from: 'your_email@gmail.com',
                        to: to,
                        subject: subject,
                        text: text,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error sending email:', error);
                        } else {
                            console.log('Email sent:', info.response);
                        }
                    });
                }
            };
        })

    }


}

exports.likeComment = (req, res) => {
    const encodedUserData = req.cookies.user;
    const currentUserData = JSON.parse(encodedUserData);
    // console.log("currentUserData", currentUserData);
    // console.log("encodedUserData", encodedUserData);

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace("T", " ");

    const { discussionId, commentId, userId, votingValue } = req.body;

    const selectQuery = 'SELECT * FROM discussion_comment_liked_data WHERE comment_id = ? AND user_id = ? AND discussion_id = ?';
    db.query(selectQuery, [commentId, userId, discussionId], (selectError, selectResults) => {
        if (selectError) {
            console.error('Error checking existing vote:', selectError);
            return res.status(500).json({ error: 'Error checking existing vote.' });
        }

        console.log("selectResults", selectResults);
        console.log("selectResults.length", selectResults.length);

        if (selectResults.length > 0) {
            console.log("selectResults[0].id", selectResults[0].id);
            const updateQuery = 'UPDATE discussion_comment_liked_data SET voting = ?, updated_at = ? WHERE id = ?';
            db.query(updateQuery, [votingValue, formattedDate, selectResults[0].id], (updateError, updateResults) => {
                if (updateError) {
                    console.error('Error updating vote:', updateError);
                    return res.status(500).json({ error: 'Error updating vote.' });
                }
                sendUpdatedCounts();
            });
        } else {
            const insertQuery = 'INSERT INTO discussion_comment_liked_data(discussion_id, comment_id, user_id, voting, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)';
            db.query(insertQuery, [discussionId, commentId, userId, votingValue, formattedDate, formattedDate], (insertError, insertResults) => {
                if (insertError) {
                    console.error('Error inserting vote:', insertError);
                    return res.status(500).json({ error: 'Error in comment vote.' });
                }
                sendUpdatedCounts();
            });
        }
    });

    function sendUpdatedCounts() {
        const getLikeCountQuery = 'SELECT comment_id, COUNT(*) AS like_count FROM discussion_comment_liked_data WHERE discussion_id = ? AND voting = ? GROUP BY comment_id';
        const getDislikeCountQuery = 'SELECT comment_id, COUNT(*) AS dislike_count FROM discussion_comment_liked_data WHERE discussion_id = ? AND voting = ? GROUP BY comment_id';

        db.query(getLikeCountQuery, [discussionId, '1'], (likeCountError, likeCountResults) => {
            if (likeCountError) {
                console.error('Error fetching like counts:', likeCountError);
                return res.status(500).json({ error: 'Error fetching like counts.' });
            }

            db.query(getDislikeCountQuery, [discussionId, '0'], (dislikeCountError, dislikeCountResults) => {
                if (dislikeCountError) {
                    console.error('Error fetching dislike counts:', dislikeCountError);
                    return res.status(500).json({ error: 'Error fetching dislike counts.' });
                }

                res.status(200).json({
                    message: 'Vote action successful.',
                    likeCounts: likeCountResults,
                    dislikeCounts: dislikeCountResults,
                });
            });
        });
    }
};


exports.getcompaniesbyCountry = async (req, res) => {
    try {
        const country = req.params.country;
        const state = req.params.state;
        const city = req.params.city;


        if (!country) {
            return res.status(400).json({ error: 'Country parameter is required' });
        }

        let sqlQuery = 'SELECT * FROM company WHERE 1=1';
        if (country) {
            sqlQuery += ` AND main_address_country = '${country}'`;
        }
        if (state) {
            sqlQuery += ` AND main_address_state = '${state}'`;
        }
        if (city) {
            sqlQuery += ` AND main_address_city = '${city}'`;
        }


        db.query(sqlQuery, queryParams, (err, results) => {
            if (err) {
                console.error('Error executing SQL query:', err);
                res.status(500).json({ error: 'An error occurred while fetching companies' });
            } else {
                res.json(results);
            }
        });

        // const get_company_query = `
        //     SELECT *
        //     FROM company
        //     WHERE main_address_country = ${country_shortname};
        // `;

        // const get_company_result = await query(get_company_query);
        // if (get_company_result.length > 0) {
        //     var getcompanies = get_company_result;
        // }
        // else{
        //     var getcompanies = get_company_result; 
        // }
        // return res.send({
        //     status: 'ok',
        //     message: 'company fetched successfully!',
        //     getcompanies: getcompanies
        // });
    } catch (error) {
        return res.send({
            status: 'not ok',
            message: 'Something went wrong'
        });
    }
}


// userCompanyRegistration
// exports.userCompanyRegistration = async (req, res) => {
//     try {

//         console.log("userCompanyRegistration",req.body);

//         const { first_name, last_name, email, register_password, register_confirm_password, signup_otp, company_name,comp_email,comp_registration_id,main_address,main_address_pin_code,main_address_country,main_address_state,main_address_city, membership_type_id,payment_status } = req.body;

//         if (register_password !== register_confirm_password) {
//             return res.status(400).json({ status: 'err', message: 'Passwords does not match.' });
//         }

//         const emailExists = await new Promise((resolve, reject) => {
//             db.query('SELECT email, register_from FROM users WHERE email = ?', [email], (err, results) => {
//                 if (err) reject(err);

//                 if (results.length > 0) {
//                     var register_from = results[0].register_from;
//                     if (register_from == 'web') {
//                         var message = 'Email ID already exists, Please login with your email-ID and password';
//                     } else {
//                         if (register_from == 'gmail') {
//                             register_from = 'google';
//                         }
//                         var message = 'Email ID already exists, login with ' + register_from;
//                     }
//                     return res.send(
//                         {
//                             status: 'err',
//                             data: '',
//                             message: message
//                         }
//                     )
//                 }

//                 resolve(results.length > 0);
//             });
//         });

//         const verifyOTP = await new Promise((resolve, reject) => {
//             db.query('SELECT * FROM signup_otp_veryfy WHERE email = ? AND otp = ? ', [email, signup_otp], (OTPerr, OTPresults) => {
//                 if (OTPerr) reject(OTPerr);

//                 if (OTPresults.length > 0) {

//                     const currentTime = new Date();
//                     if (currentTime < new Date(OTPresults[0].expire_at)) {
//                         // OTP is valid
//                         console.log('OTP is valid');
//                         //resolve(true);
//                     } else {
//                         // OTP has expired
//                         console.log('OTP has expired');
//                         return res.send({
//                             status: 'err',
//                             data: '',
//                             message: 'OTP has expired'
//                         });
//                     }

//                 } else {
//                     return res.send(
//                         {
//                             status: 'err',
//                             data: '',
//                             message: 'OTP is not valid'
//                         }
//                     )
//                 }

//                 resolve(OTPresults.length > 0);
//             });
//         });

//         const hashedPassword = await bcrypt.hash(register_password, 8);
//         const currentDate = new Date();

//         const year = currentDate.getFullYear();
//         const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//         const day = String(currentDate.getDate()).padStart(2, '0');
//         const hours = String(currentDate.getHours()).padStart(2, '0');
//         const minutes = String(currentDate.getMinutes()).padStart(2, '0');
//         const seconds = String(currentDate.getSeconds()).padStart(2, '0');

//         const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

//         const userInsertQuery = 'INSERT INTO users (first_name, last_name, email, password, register_from, user_registered, user_status, user_type_id, alise_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
//         db.query(userInsertQuery, [first_name, last_name, email, hashedPassword, 'web', formattedDate, 1, 2, first_name + last_name], async (err, userResults) => {
//             if (err) {
//                 console.error('Error inserting user into "users" table:', err);
//                 return res.send(
//                     {
//                         status: 'err',
//                         data: '',
//                         message: 'An error occurred while processing your request' + err
//                     }
//                 )
//             }

//             const user_new_id = userResults.insertId;
//             console.log("user_new_id",user_new_id);


//             var mailOptions = {
//                 from: process.env.MAIL_USER,
//                 //to: 'pranab@scwebtech.com',
//                 to: email,
//                 subject: 'Welcome Email',
//                 html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
//                 <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
//                  <tbody>
//                   <tr>
//                    <td align="center" valign="top">
//                      <div id="template_header_image"><p style="margin-top: 0;"></p></div>
//                      <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
//                       <tbody>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Header -->
//                            <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
//                              <tbody>
//                                <tr>
//                                <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
//                                 <td id="header_wrapper" style="padding: 36px 48px; display: block;">
//                                    <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome Email</h1>
//                                 </td>

//                                </tr>
//                              </tbody>
//                            </table>
//                      <!-- End Header -->
//                      </td>
//                         </tr>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Body -->
//                            <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
//                              <tbody>
//                                <tr>
//                                 <td id="body_content" style="background-color: #fdfdfd;" valign="top">
//                                   <!-- Content -->
//                                   <table border="0" cellpadding="20" cellspacing="0" width="100%">
//                                    <tbody>
//                                     <tr>
//                                      <td style="padding: 48px;" valign="top">
//                                        <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">

//                                         <table border="0" cellpadding="4" cellspacing="0" width="90%">
//                                           <tr>
//                                             <td colspan="2">
//                                                 <strong>Hello ${first_name},</strong>
//                                                 <p style="font-size:15px; line-height:20px">Warm greetings from the CEchoes Technology team!
//                                                 You have joined a community dedicated to empowering all Grahaks (Customers) and ensuring their voices are heard <b>LOUD</b> and <b>C L E A R</b>.</p>
//                                                 <p style="font-size:15px; line-height:20px"> Keep sharing your Customer experiences (positive or negative), read about others' experience and get to know Customer centric information.</p>
//                                                 <p style="font-size:15px; line-height:20px">Share this platform with all your friends and family.
//                                                 Together, we can make Organisations listen and improve because <b>#CustomersHavePower</b>.</p><p style="font-size:15px; line-height:20px">Let's usher in this Customer Revolution coz <b>#CustomerRightsMatter</b>.</p><p style="font-size:15px; line-height:20px">Welcome Onboard!</p><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
//                                             </td>
//                                           </tr>
//                                         </table>
//                                         <p style="font-size:15px; line-height:20px">Download the app from Google Playstore or visit  <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology.com </a>.</p>
//                                        </div>
//                                      </td>
//                                     </tr>
//                                    </tbody>
//                                   </table>
//                                 <!-- End Content -->
//                                 </td>
//                                </tr>
//                              </tbody>
//                            </table>
//                          <!-- End Body -->
//                          </td>
//                         </tr>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Footer -->
//                            <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
//                             <tbody>
//                              <tr>
//                               <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
//                                <table border="0" cellpadding="10" cellspacing="0" width="100%">
//                                  <tbody>
//                                    <tr>
//                                     <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
//                                          <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
//                                     </td>
//                                    </tr>
//                                  </tbody>
//                                </table>
//                               </td>
//                              </tr>
//                             </tbody>
//                            </table>
//                          <!-- End Footer -->
//                          </td>
//                         </tr>
//                       </tbody>
//                      </table>
//                    </td>
//                   </tr>
//                  </tbody>
//                 </table>
//                </div>`
//             }
//             await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
//                 if (err) {
//                     console.log(err);
//                     return res.send({
//                         status: 'not ok',
//                         message: 'Something went wrong'
//                     });
//                 } else {
//                     console.log('Mail Send: ', info.response);
//                     return res.send({
//                         status: 'ok',
//                         message: ''
//                     });

//                 }
//             })
//             // Insert the user into the "user_customer_meta" table
//             const userMetaInsertQuery = 'INSERT INTO user_customer_meta (user_id, review_count) VALUES (?, ?)';
//             db.query(userMetaInsertQuery, [userResults.insertId, 0], (err, metaResults) => {
//                 if (err) {
//                     return res.send(
//                         {
//                             status: 'err',
//                             data: '',
//                             message: 'An error occurred while processing your request' + err
//                         }
//                     )
//                 }


//             // const companyquery = `INSERT INTO `

//             comFunction2.generateUniqueSlug(req.body.company_name, (error, companySlug) => {
//                 // comFunction2.generateUniqueSlug(req.body.company_name, main_address_country, (err, companySlug) => {
//                 if (error) {
//                     console.log('Err: ', error.message);
//                 } else {
//                     console.log('companySlug', companySlug);
//                     var insert_values = [];
//                         insert_values = [user_new_id, company_name, comp_email, comp_registration_id, '2', formattedDate, formattedDate, main_address, main_address_pin_code, main_address_country, main_address_state, main_address_city, '0', companySlug,membership_type_id,payment_status];


//                     const insertQuery = 'INSERT INTO company (user_created_by, company_name, comp_email, comp_registration_id, status, created_date, updated_date, main_address, main_address_pin_code, main_address_country, main_address_state, main_address_city, verified, slug, membership_type_id,paid_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)';
//                     db.query(insertQuery, insert_values, (err, results, fields) => {
//                         if (err) {
//                             return res.send(
//                                 {
//                                     status: 'err',
//                                     data: '',
//                                     message: 'An error occurred while processing your request' + err
//                                 }
//                             )
//                         } else {
//                             console.log("company results", results);

//                             var companyId = results.insertId;
//                             // const categoryArray = Array.isArray(req.body.category) ? req.body.category : [req.body.category];

//                             // // Filter out undefined values from categoryArray
//                             // const validCategoryArray = categoryArray.filter(categoryID => categoryID !== undefined);

//                             // console.log('categoryArray:', categoryArray);
//                             // if (validCategoryArray.length > 0) {
//                             //     const companyCategoryData = validCategoryArray.map((categoryID) => [companyId, categoryID]);
//                             //     db.query('INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?', [companyCategoryData], function (error, results) {
//                             //         if (error) {
//                             //             console.log(error);
//                             //             res.status(400).json({
//                             //                 status: 'err',
//                             //                 message: 'Error while creating company category'
//                             //             });
//                             //         }
//                             //         else {
//                             //             return res.send(
//                             //                 {
//                             //                     status: 'ok',
//                             //                     data: companyId,
//                             //                     message: 'New company created'
//                             //                 }
//                             //             )
//                             //         }
//                             //     });
//                             // } else {
//                                 return res.send(
//                                     {
//                                         status: 'ok',
//                                         data: companyId,
//                                         message: 'New company created.'
//                                     }
//                                 )
//                             // }
//                         }
//                     })

//                 }
//             });

//             const claimRequestQuery = 'INSERT INTO company_claim_request (company_id, claimed_by, status, claimed_date) VALUES (?, ?, ?, ?)';
//             const claimRequestValues = [companyId, user_new_id, '1', formattedDate];

//             db.query(claimRequestQuery, claimRequestValues, (err) => {
//                 if (err) {
//                     // Handle the error
//                     return res.send({
//                         status: 'err',
//                         data: '',
//                         message: 'An error occurred while inserting company claim request: ' + err
//                     });
//                 }
//             });
//             //


//                 const userRegistrationData = {
//                     username: email,
//                     email: email,
//                     password: register_password,
//                     first_name: first_name,
//                     last_name: last_name,
//                 };
//                 axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData)
//                     .then((response) => {
//                         //console.log('User registration successful. User ID:', response.data.user_id);

//                         //-------User Auto Login --------------//
//                         const userAgent = req.headers['user-agent'];
//                         const agent = useragent.parse(userAgent);

//                         // Set a cookie
//                         const userData = {
//                             user_id: userResults.insertId,
//                             first_name: first_name,
//                             last_name: last_name,
//                             email: email,
//                             user_type_id: 2
//                         };
//                         const encodedUserData = JSON.stringify(userData);
//                         res.cookie('user', encodedUserData);

//                         (async () => {
//                             //---- Login to Wordpress Blog-----//
//                             //let wp_user_data;
//                             try {
//                                 const userLoginData = {
//                                     email: email,
//                                     password: register_password,
//                                 };
//                                 const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
//                                 const wp_user_data = response.data.data;



//                                 //-- check last Login Info-----//
//                                 const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
//                                 db.query(device_query, [userResults.insertId], async (err, device_query_results) => {
//                                     const currentDate = new Date();
//                                     const year = currentDate.getFullYear();
//                                     const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//                                     const day = String(currentDate.getDate()).padStart(2, '0');
//                                     const hours = String(currentDate.getHours()).padStart(2, '0');
//                                     const minutes = String(currentDate.getMinutes()).padStart(2, '0');
//                                     const seconds = String(currentDate.getSeconds()).padStart(2, '0');
//                                     const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

//                                     if (device_query_results.length > 0) {
//                                         // User exist update info
//                                         const device_update_query = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
//                                         const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, userResults.insertId];
//                                         db.query(device_update_query, values, (err, device_update_query_results) => {

//                                             const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
//                                             db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
//                                                 if (OTPdelErr) {
//                                                     console.log(OTPdelErr);
//                                                     return res.send({
//                                                         status: 'not ok',
//                                                         message: 'Something went wrong'
//                                                     });
//                                                 } else {
//                                                     console.log('otp deleted');
//                                                     return res.send(
//                                                         {
//                                                             status: 'ok',
//                                                             data: userData,
//                                                             wp_user: wp_user_data,
//                                                             currentUrlPath: req.body.currentUrlPath,
//                                                             message: 'Registration successful you are automatically login to your dashboard'
//                                                         }
//                                                     )
//                                                 }

//                                             })


//                                         })
//                                     } else {
//                                         // User doesnot exist Insert New Row.

//                                         const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
//                                         const values = [userResults.insertId, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];

//                                         db.query(device_insert_query, values, (err, device_insert_query_results) => {
//                                             const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
//                                             db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
//                                                 if (OTPdelErr) {
//                                                     console.log(OTPdelErr);
//                                                     return res.send({
//                                                         status: 'not ok',
//                                                         message: 'Something went wrong'
//                                                     });
//                                                 } else {
//                                                     console.log('otp deleted')
//                                                     return res.send(
//                                                         {
//                                                             status: 'ok',
//                                                             data: userData,
//                                                             wp_user: wp_user_data,
//                                                             currentUrlPath: req.body.currentUrlPath,
//                                                             message: 'Registration successful you are automatically login to your dashboard'
//                                                         }
//                                                     )
//                                                 }

//                                             })

//                                         })

//                                     }
//                                 })
//                             } catch (error) {
//                                 console.error('User login failed. Error:', error);
//                                 if (error.response && error.response.data) {
//                                     console.log('Error response data:', error.response.data);
//                                 }
//                             }
//                         })();
//                     })
//                     .catch((error) => {
//                         console.error('User registration failed:',error );
//                         return res.send(
//                             {
//                                 status: 'err',
//                                 data: '',
//                                 message: error.response.data
//                             }
//                         )
//                     });
//             })
//         })
//     }
//     catch (error) {
//         console.error('Error during user registration:', error);
//         return res.status(500).json({ status: 'err', message: 'An error occurred while processing your request.' });
//     }
// }

// exports.userCompanyRegistration = async (req, res) => {
//     try {
//         console.log("userCompanyRegistration", req.body);

//         const { first_name, last_name, email, register_password, register_confirm_password, signup_otp, company_name, comp_email, comp_registration_id, main_address, main_address_pin_code, main_address_country, main_address_state, main_address_city, membership_type_id, payment_status } = req.body;

//         if (register_password !== register_confirm_password) {
//             return res.status(400).json({ status: 'err', message: 'Passwords do not match.' });
//         }

//         const emailExists = await new Promise((resolve, reject) => {
//             db.query('SELECT email, register_from FROM users WHERE email = ?', [email], (err, results) => {
//                 if (err) return reject(err);
//                 if (results.length > 0) {
//                     const register_from = results[0].register_from === 'web' ? 'web' : results[0].register_from === 'gmail' ? 'google' : results[0].register_from;
//                     const message = `Email ID already exists, login with ${register_from}`;
//                     return resolve({ exists: true, message });
//                 }
//                 resolve({ exists: false });
//             });
//         });

//         if (emailExists.exists) {
//             return res.status(400).json({ status: 'err', message: emailExists.message });
//         }

//         const otpValid = await new Promise((resolve, reject) => {
//             db.query('SELECT * FROM signup_otp_veryfy WHERE email = ? AND otp = ?', [email, signup_otp], (err, results) => {
//                 if (err) return reject(err);
//                 if (results.length === 0) {
//                     return resolve({ valid: false, message: 'OTP is not valid' });
//                 }
//                 const currentTime = new Date();
//                 if (currentTime > new Date(results[0].expire_at)) {
//                     return resolve({ valid: false, message: 'OTP has expired' });
//                 }
//                 resolve({ valid: true });
//             });
//         });

//         if (!otpValid.valid) {
//             return res.status(400).json({ status: 'err', message: otpValid.message });
//         }

//         const hashedPassword = await bcrypt.hash(register_password, 8);
//         const currentDate = new Date();
//         const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

//         const userInsertQuery = 'INSERT INTO users (first_name, last_name, email, password, register_from, user_registered, user_status, user_type_id, alise_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
//         const userResults = await new Promise((resolve, reject) => {
//             db.query(userInsertQuery, [first_name, last_name, email, hashedPassword, 'web', formattedDate, 1, 2, first_name + last_name], (err, results) => {
//                 if (err) return reject(err);
//                 resolve(results);
//             });
//         });

//         const user_new_id = userResults.insertId;

//         const mailOptions = {
//             from: process.env.MAIL_USER,
//             to: email,
//             subject: 'Welcome Email',
//             html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
//             <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
//              <tbody>
//               <tr>
//                <td align="center" valign="top">
//                  <div id="template_header_image"><p style="margin-top: 0;"></p></div>
//                  <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
//                   <tbody>
//                     <tr>
//                      <td align="center" valign="top">
//                        <!-- Header -->
//                        <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
//                          <tbody>
//                            <tr>
//                            <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
//                             <td id="header_wrapper" style="padding: 36px 48px; display: block;">
//                                <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome Email</h1>
//                             </td>

//                            </tr>
//                          </tbody>
//                        </table>
//                  <!-- End Header -->
//                  </td>
//                     </tr>
//                     <tr>
//                      <td align="center" valign="top">
//                        <!-- Body -->
//                        <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
//                          <tbody>
//                            <tr>
//                             <td id="body_content" style="background-color: #fdfdfd;" valign="top">
//                               <!-- Content -->
//                               <table border="0" cellpadding="20" cellspacing="0" width="100%">
//                                <tbody>
//                                 <tr>
//                                  <td style="padding: 48px;" valign="top">
//                                    <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">

//                                     <table border="0" cellpadding="4" cellspacing="0" width="90%">
//                                       <tr>
//                                         <td colspan="2">
//                                             <strong>Hello ${first_name},</strong>
//                                             <p style="font-size:15px; line-height:20px">Warm greetings from the CEchoes Technology team!
//                                             You have joined a community dedicated to empowering all Grahaks (Customers) and ensuring their voices are heard <b>LOUD</b> and <b>C L E A R</b>.</p>
//                                             <p style="font-size:15px; line-height:20px"> Keep sharing your Customer experiences (positive or negative), read about others' experience and get to know Customer centric information.</p>
//                                             <p style="font-size:15px; line-height:20px">Share this platform with all your friends and family.
//                                             Together, we can make Organisations listen and improve because <b>#CustomersHavePower</b>.</p><p style="font-size:15px; line-height:20px">Let's usher in this Customer Revolution coz <b>#CustomerRightsMatter</b>.</p><p style="font-size:15px; line-height:20px">Welcome Onboard!</p><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
//                                         </td>
//                                       </tr>
//                                     </table>
//                                     <p style="font-size:15px; line-height:20px">Download the app from Google Playstore or visit  <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology.com </a>.</p>
//                                    </div>
//                                  </td>
//                                 </tr>
//                                </tbody>
//                               </table>
//                             <!-- End Content -->
//                             </td>
//                            </tr>
//                          </tbody>
//                        </table>
//                      <!-- End Body -->
//                      </td>
//                     </tr>
//                     <tr>
//                      <td align="center" valign="top">
//                        <!-- Footer -->
//                        <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
//                         <tbody>
//                          <tr>
//                           <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
//                            <table border="0" cellpadding="10" cellspacing="0" width="100%">
//                              <tbody>
//                                <tr>
//                                 <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
//                                      <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
//                                 </td>
//                                </tr>
//                              </tbody>
//                            </table>
//                           </td>
//                          </tr>
//                         </tbody>
//                        </table>
//                      <!-- End Footer -->
//                      </td>
//                     </tr>
//                   </tbody>
//                  </table>
//                </td>
//               </tr>
//              </tbody>
//             </table>
//            </div>`
//         };
//         await new Promise((resolve, reject) => {
//             mdlconfig.transporter.sendMail(mailOptions, (err, info) => {
//                 if (err) return reject(err);
//                 console.log('Mail Send:', info.response);
//                 resolve(info.response);
//             });
//         });

//         const userMetaInsertQuery = 'INSERT INTO user_customer_meta (user_id, review_count) VALUES (?, ?)';
//         await new Promise((resolve, reject) => {
//             db.query(userMetaInsertQuery, [user_new_id, 0], (err, results) => {
//                 if (err) return reject(err);
//                 resolve(results);
//             });
//         });

//         const companySlug = await new Promise((resolve, reject) => {
//             comFunction2.generateUniqueSlug(company_name, (err, slug) => {
//                 if (err) return reject(err);
//                 resolve(slug);
//             });
//         });

//         const insert_values = [user_new_id, company_name, comp_email, comp_registration_id, '2', formattedDate, formattedDate, main_address, main_address_pin_code, main_address_country, main_address_state, main_address_city, '0', companySlug, membership_type_id, payment_status];
//         const companyResults = await new Promise((resolve, reject) => {
//             const insertQuery = 'INSERT INTO company (user_created_by, company_name, comp_email, comp_registration_id, status, created_date, updated_date, main_address, main_address_pin_code, main_address_country, main_address_state, main_address_city, verified, slug, membership_type_id, paid_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//             db.query(insertQuery, insert_values, (err, results) => {
//                 if (err) return reject(err);

//                 const companyId = results.insertId;
//                 const claimRequestQuery = 'INSERT INTO company_claim_request (company_id, claimed_by, status, claimed_date) VALUES (?, ?, ?, ?)';
//                 const claimRequestValues = [companyId, user_new_id, '1', formattedDate];

//                 db.query(claimRequestQuery, claimRequestValues, (claimErr) => {
//                     if (claimErr) {
//                         return reject(claimErr);
//                     }
//                     resolve({ results, companyId });
//                 });
//             });
//         });

//         const userRegistrationData = {
//             username: email,
//             email: email,
//             password: register_password,
//             first_name: first_name,
//             last_name: last_name,
//         };
//         axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData)
//             .then((response) => {
//                 //console.log('User registration successful. User ID:', response.data.user_id);

//                 //-------User Auto Login --------------//
//                 const userAgent = req.headers['user-agent'];
//                 const agent = useragent.parse(userAgent);

//                 // Set a cookie
//                 const userData = {
//                     user_id: userResults.insertId,
//                     first_name: first_name,
//                     last_name: last_name,
//                     email: email,
//                     user_type_id: 2
//                 };
//                 const encodedUserData = JSON.stringify(userData);
//                 res.cookie('user', encodedUserData);

//                 (async () => {
//                     //---- Login to Wordpress Blog-----//
//                     //let wp_user_data;
//                     try {
//                         const userLoginData = {
//                             email: email,
//                             password: register_password,
//                         };
//                         const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
//                         const wp_user_data = response.data.data;
//                         console.log("wp_user_data",wp_user_data);



//                         //-- check last Login Info-----//
//                         const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
//                         db.query(device_query, [userResults.insertId], async (err, device_query_results) => {
//                             const currentDate = new Date();
//                             const year = currentDate.getFullYear();
//                             const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//                             const day = String(currentDate.getDate()).padStart(2, '0');
//                             const hours = String(currentDate.getHours()).padStart(2, '0');
//                             const minutes = String(currentDate.getMinutes()).padStart(2, '0');
//                             const seconds = String(currentDate.getSeconds()).padStart(2, '0');
//                             const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

//                             if (device_query_results.length > 0) {
//                                 // User exist update info
//                                 const device_update_query = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
//                                 const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, userResults.insertId];
//                                 db.query(device_update_query, values, (err, device_update_query_results) => {

//                                     const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
//                                     db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
//                                         if (OTPdelErr) {
//                                             console.log(OTPdelErr);
//                                             return res.send({
//                                                 status: 'not ok',
//                                                 message: 'Something went wrong'
//                                             });
//                                         } else {
//                                             console.log('otp deleted');
//                                             // return res.send(
//                                             //     {
//                                             //         status: 'ok',
//                                             //         data: userData,
//                                             //         wp_user: wp_user_data,
//                                             //         currentUrlPath: req.body.currentUrlPath,
//                                             //         message: 'Registration successful you are automatically login to your dashboard'
//                                             //     }
//                                             // )
//                                         }

//                                     })


//                                 })
//                             } else {
//                                 // User doesnot exist Insert New Row.

//                                 const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
//                                 const values = [userResults.insertId, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];

//                                 db.query(device_insert_query, values, (err, device_insert_query_results) => {
//                                     const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
//                                     db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
//                                         if (OTPdelErr) {
//                                             console.log(OTPdelErr);
//                                             return res.send({
//                                                 status: 'not ok',
//                                                 message: 'Something went wrong'
//                                             });
//                                         } else {
//                                             console.log('otp deleted')
//                                             // return res.send(
//                                             //     {
//                                             //         status: 'ok',
//                                             //         data: userData,
//                                             //         wp_user: wp_user_data,
//                                             //         currentUrlPath: req.body.currentUrlPath,
//                                             //         message: 'Registration successful you are automatically login to your dashboard'
//                                             //     }
//                                             // )
//                                         }

//                                     })

//                                 })

//                             }
//                         })
//                     } catch (error) {
//                         console.error('User login failed. Error:', error);
//                         if (error.response && error.response.data) {
//                             console.log('Error response data:', error.response.data);
//                         }
//                     }
//                 })();
//             })
//             .catch((error) => {
//                 console.error('User registration failed:', );
//                 return res.send(
//                     {
//                         status: 'err',
//                         data: '',
//                         message: error.response.data.data
//                     }
//                 )
//             });

//         return res.status(200).json({
//             status: 'ok',
//             // data: userData,
//             // wp_user: wp_user_data,
//             // currentUrlPath: req.body.currentUrlPath,
//             message: 'Registration successful you are automatically logged in to your dashboard'
//         });
//     } catch (error) {
//         console.error('Error during user registration:', error);
//         return res.status(500).json({ status: 'err', message: 'An error occurred while processing your request.' });
//     }
// };

exports.userCompanyRegistration = async (req, res) => {
    console.log(req.body);

    //const { first_name, last_name, email, register_password, register_confirm_password, signup_otp } = req.body;
    const { first_name, last_name, email, register_password, register_confirm_password, signup_otp, company_name, comp_email, comp_registration_id, main_address, main_address_pin_code, main_address_country, main_address_state, main_address_city, membership_type_id, payment_status } = req.body;

    // Validation: Check if passwords match
    if (register_password !== register_confirm_password) {
        return res.status(400).json({ status: 'err', message: 'Passwords does not match.' });
    }

    try {
        // Check if the email already exists in the "users" table
        const emailExists = await new Promise((resolve, reject) => {
            db.query('SELECT email, register_from FROM users WHERE email = ?', [email], (err, results) => {
                if (err) reject(err);

                if (results.length > 0) {
                    var register_from = results[0].register_from;
                    if (register_from == 'web') {
                        var message = 'Email ID already exists, Please login with your email-ID and password';
                    } else {
                        if (register_from == 'gmail') {
                            register_from = 'google';
                        }
                        var message = 'Email ID already exists, login with ' + register_from;
                    }
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: message
                        }
                    )
                }

                resolve(results.length > 0);
            });
        });

        // Check if the otp exists in the "signup_otp_veryfy" table
        const verifyOTP = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM signup_otp_veryfy WHERE email = ? AND otp = ? ', [email, signup_otp], (OTPerr, OTPresults) => {
                if (OTPerr) reject(OTPerr);

                if (OTPresults.length > 0) {

                    const currentTime = new Date();
                    if (currentTime < new Date(OTPresults[0].expire_at)) {
                        // OTP is valid
                        console.log('OTP is valid');
                        //resolve(true);
                    } else {
                        // OTP has expired
                        console.log('OTP has expired');
                        return res.send({
                            status: 'err',
                            data: '',
                            message: 'OTP has expired'
                        });
                    }

                } else {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'OTP is not valid'
                        }
                    )
                }

                resolve(OTPresults.length > 0);
            });
        });

        // Hash the password asynchronously
        const hashedPassword = await bcrypt.hash(register_password, 8);
        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const userInsertQuery = 'INSERT INTO users (first_name, last_name, email, password, register_from, user_registered, user_status, user_type_id, alise_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(userInsertQuery, [first_name, last_name, email, hashedPassword, 'web', formattedDate, 1, 2, first_name + last_name], async (err, userResults) => {
            if (err) {
                console.error('Error inserting user into "users" table:', err);
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'An error occurred while processing your request' + err
                    }
                )
            }
            var user_new_id = userResults.insertId;
            console.log("user_new_id", user_new_id);

            const companySlug = await new Promise((resolve, reject) => {
                comFunction2.generateUniqueSlug(company_name, (err, slug) => {
                    if (err) return reject(err);
                    resolve(slug);
                });
            });

            const insert_values = [user_new_id, company_name, comp_email, comp_registration_id, '2', formattedDate, formattedDate, main_address, main_address_pin_code, main_address_country, main_address_state, main_address_city, '0', companySlug, membership_type_id, payment_status];
            const companyResults = await new Promise((resolve, reject) => {
                const insertQuery = 'INSERT INTO company (user_created_by, company_name, comp_email, comp_registration_id, status, created_date, updated_date, main_address, main_address_pin_code, main_address_country, main_address_state, main_address_city, verified, slug, membership_type_id, paid_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                db.query(insertQuery, insert_values, (err, results) => {
                    if (err) return reject(err);

                    const companyId = results.insertId;
                    const claimRequestQuery = 'INSERT INTO company_claim_request (company_id, claimed_by, status, claimed_date) VALUES (?, ?, ?, ?)';
                    const claimRequestValues = [companyId, user_new_id, '1', formattedDate];

                    db.query(claimRequestQuery, claimRequestValues, (claimErr) => {
                        if (claimErr) {
                            return reject(claimErr);
                        }
                        resolve({ results, companyId });
                    });
                });
            });



            var mailOptions = {
                from: process.env.MAIL_USER,
                //to: 'pranab@scwebtech.com',
                to: email,
                subject: 'Welcome e-mail',
                html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                <style>
                                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                                }
                                </style>
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
                               <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                                <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome</h1>
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
                                                <strong>Hello ${first_name},</strong>
                                                <p style="font-size:15px; line-height:20px">Warm greetings from the CEchoes Technology team! You have joined a community dedicated to empowering all Customers and ensuring their voices are heard <b>LOUD </b> and <b>CLEAR</b>.</p>
                                                <p style="font-size:15px; line-height:20px"> Keep sharing your Customer experiences (positive or negative), read about others' experience, post your queries on Products/Services, participate in Surveys, Lodge Complaints and get to know Customer-centric information.</p>
                                                <p style="font-size:15px; line-height:20px">Share this platform with all your friends and family. Together, we can make Organisations Listen and improve because  <b>#CustomersHave Power</b>.</p><p style="font-size:15px; line-height:20px">Let's usher in this Customer Revolution coz <b> #CustomerRights Matter</b>.</p><p style="font-size:15px; line-height:20px">Welcome Onboard!</p><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
                                            </td>
                                          </tr>
                                        </table>
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
                    return res.send({
                        status: 'not ok',
                        message: 'Something went wrong'
                    });
                } else {
                    console.log('Mail Send: ', info.response);
                    return res.send({
                        status: 'ok',
                        message: ''
                    });

                }
            })
            // Insert the user into the "user_customer_meta" table
            const userMetaInsertQuery = 'INSERT INTO user_customer_meta (user_id, review_count) VALUES (?, ?)';
            db.query(userMetaInsertQuery, [userResults.insertId, 0], (err, metaResults) => {
                if (err) {
                    return res.send(
                        {
                            status: 'err',
                            data: '',
                            message: 'An error occurred while processing your request' + err
                        }
                    )
                }

                const userRegistrationData = {
                    username: email,
                    email: email,
                    password: register_password,
                    first_name: first_name,
                    last_name: last_name,
                };
                axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData)
                    .then((response) => {
                        //console.log('User registration successful. User ID:', response.data.user_id);

                        //-------User Auto Login --------------//
                        const userAgent = req.headers['user-agent'];
                        const agent = useragent.parse(userAgent);

                        // Set a cookie
                        const userData = {
                            user_id: userResults.insertId,
                            first_name: first_name,
                            last_name: last_name,
                            email: email,
                            user_type_id: 2
                        };
                        const encodedUserData = JSON.stringify(userData);
                        res.cookie('user', encodedUserData);

                        (async () => {
                            //---- Login to Wordpress Blog-----//
                            //let wp_user_data;
                            try {
                                const userLoginData = {
                                    email: email,
                                    password: register_password,
                                };
                                const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
                                const wp_user_data = response.data.data;



                                //-- check last Login Info-----//
                                const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
                                db.query(device_query, [userResults.insertId], async (err, device_query_results) => {
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
                                        const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, userResults.insertId];
                                        db.query(device_update_query, values, (err, device_update_query_results) => {

                                            const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
                                            db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
                                                if (OTPdelErr) {
                                                    console.log(OTPdelErr);
                                                    return res.send({
                                                        status: 'not ok',
                                                        message: 'Something went wrong'
                                                    });
                                                } else {
                                                    console.log('otp deleted');
                                                    return res.send(
                                                        {
                                                            status: 'ok',
                                                            data: userData,
                                                            wp_user: wp_user_data,
                                                            currentUrlPath: req.body.currentUrlPath,
                                                            message: 'Registration successful you are automatically login to your dashboard'
                                                        }
                                                    )
                                                }

                                            })


                                        })
                                    } else {
                                        // User doesnot exist Insert New Row.

                                        const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                        const values = [userResults.insertId, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];

                                        db.query(device_insert_query, values, (err, device_insert_query_results) => {
                                            const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
                                            db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
                                                if (OTPdelErr) {
                                                    console.log(OTPdelErr);
                                                    return res.send({
                                                        status: 'not ok',
                                                        message: 'Something went wrong'
                                                    });
                                                } else {
                                                    console.log('otp deleted')
                                                    return res.send(
                                                        {
                                                            status: 'ok',
                                                            data: userData,
                                                            wp_user: wp_user_data,
                                                            currentUrlPath: req.body.currentUrlPath,
                                                            message: 'Registration successful you are automatically login to your dashboard'
                                                        }
                                                    )
                                                }

                                            })

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
                    .catch((error) => {
                        console.error('User registration failed:',);
                        return res.send(
                            {
                                status: 'err',
                                data: '',
                                message: error.response.data
                            }
                        )
                    });
            })
        })
    }
    catch (error) {
        console.error('Error during user registration:', error);
        return res.status(500).json({ status: 'err', message: 'An error occurred while processing your request.' });
    }
}

exports.createproduct = async (req, res) => {
    try {
        const { plan_name, description, monthly_price, yearly_price, currency } = req.body;

        const planNames = ["Basic", "Standard", "Advanced", "Premium", "Enterprise"];

        if (!planNames.includes(plan_name)) {
            return res.status(400).json({ message: 'Invalid plan name.' });
        }
        const checkQuery = `SELECT * FROM plan_management WHERE name = ?`;
        const existingPlan = await db.query(checkQuery, [plan_name]);

        if (existingPlan.length > 0) {
            const updateQuery = `
                UPDATE plan_management 
                SET description = ?, monthly_price = ?, yearly_price = ?, currency = ? 
                WHERE name = ?
            `;
            await db.query(updateQuery, [description, monthly_price, yearly_price, currency, plan_name]);
            return res.status(200).json({ message: `${plan_name} Plan Management updated successfully.` });
        } else {
            const insertQuery = `
                INSERT INTO plan_management (name, description, monthly_price, yearly_price, currency)
                VALUES (?, ?, ?, ?, ?)
            `;
            await db.query(insertQuery, [plan_name, description, monthly_price, yearly_price, currency]);

        }

        const product = await stripe.products.create({
            name: plan_name,
            description: description
        });
        return res.json({ message: 'Membership plan added successfully.', product });
    } catch (error) {
        console.log("error", error);
        return res.json({ error: error.message });
    }
}

exports.addingUsers = async (req, res) => {
    try {
        const { company_user_id, plan_id, no_of_users, total_price } = req.body;
        console.log("req.body.addon_user", req.body);

        var add_on_user_data = {
            company_user_id: company_user_id,
            plan_id: plan_id,
            no_of_users: no_of_users,
            total_price: total_price

        }
        const addingUsersquery = `INSERT INTO add_on_users SET?`;
        const addingUsersvalue = await queryAsync(addingUsersquery[add_on_user_data])

    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}


exports.confirmUser = async (req, res) => {
    try {
        const id = req.body.id;
        const activationId = 1;
        const isUserQuery = `SELECT * FROM users WHERE user_id = ?`;
        const result = await query(isUserQuery, [id]);

        const userDetails = {
            fullName: result[0].first_name + ' ' + result[0].last_name,
            email: result[0].email,
            phone: result[0].phone
        }
        const adminMail = process.env.MAIL_USER

        if (result && result.length > 0) {
            const updateQuery = `UPDATE users SET user_status = ? WHERE user_id = ?`;
            const updateResult = await query(updateQuery, [activationId, id]);

            // Check if the update was successful
            if (updateResult && updateResult.affectedRows > 0) {

                const userActivationHtml = comFunction2.userActivation(userDetails.fullName, userDetails.email);

                const userActivationHtmlForAdmin = comFunction2.userActivationmailtoAdmin(userDetails.fullName, userDetails.email, userDetails.phone);

                //   const emailSentToUser = await sendEmail(userDetails.email, 'Welcome to CEchoes! 🎉', userActivationHtml); // User
                //   const emailSentToAdmin = await sendEmail(adminMail, 'Registration at CEchoes', userActivationHtmlForAdmin); // Admin

                if (userActivationHtml && userActivationHtmlForAdmin) {
                    return res.status(200).json({
                        status: "ok",
                        message: 'Account activation has been successful, and activation emails have been forwarded to the user and the admin.',
                    });
                } else {
                    return res.status(500).json({
                        status: "error",
                        message: "Failed to send activation email",
                    });
                }

            } else {

                return res.status(400).json({ message: 'Activation failed' });
            }
        } else {
            // User not found
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

//actual

// const getPlanFromDatabase = async (planId) => {
//     console.log("planId", planId);
//     const sql = 'SELECT name, description, monthly_price, yearly_price, currency FROM plan_management WHERE id = ?';
//     const result = await queryAsync(sql, [planId]);
//     console.log("result", result);
//     return result[0];
// };

// // const createStripeProductAndPrice = async (plan, billingCycle) => {
// //     try {
// //         const product = await stripe.products.create({
// //             name: plan.name,
// //             description: plan.description,
// //         });

// //         const unitAmount = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

// //         const price = await stripe.prices.create({
// //             unit_amount: unitAmount * 100,
// //             currency: plan.currency,
// //             recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
// //             product: product.id,
// //         });

// //         return price.id;
// //     } catch (error) {
// //         console.error('Error creating Stripe product and price:', error);
// //         throw error;
// //     }
// // };


// const createStripeProductAndPrice = async (plan) => {
//     try {
//         const product = await stripe.products.create({
//             name: plan.name,
//             description: plan.description,
//         });

//         const monthlyPrice = await stripe.prices.create({
//             unit_amount: plan.monthly_price * 100,
//             currency: plan.currency,
//             recurring: { interval: 'month' },
//             product: product.id,
//         });

//         const yearlyPrice = await stripe.prices.create({
//             unit_amount: plan.yearly_price * 100,
//             currency: plan.currency,
//             recurring: { interval: 'year' },
//             product: product.id,
//         });

//         return { monthlyPriceId: monthlyPrice.id, yearlyPriceId: yearlyPrice.id };
//     } catch (error) {
//         console.error('Error creating Stripe product and prices:', error);
//         throw error;
//     }
// };

// exports.createSubscription = async (req, res) => {
//     try {
//         const { userId, planId, billingCycle } = req.body;

//         // Fetch user's email from your application's database
//         const userQuery = 'SELECT email FROM users WHERE user_id = ?';
//         const userResult = await queryAsync(userQuery, [userId]);
//         const userEmail = userResult[0].email;

//         const plan = await getPlanFromDatabase(planId);
//         const priceId = await createStripeProductAndPrice(plan, billingCycle);

//         const subscription = await stripe.subscriptions.create({
//             customer: customer.id,
//             items: [{ price: priceId }],
//             expand: ['latest_invoice.payment_intent'],
//         });
//         res.send(subscription);
//     } catch (error) {
//         res.status(500).send({ error: error.message });
//     }
// };



const getPlanFromDatabase = async (planId) => {
    console.log("planferrg", planId);
    const sql = 'SELECT name, description, monthly_price, yearly_price, currency,per_user_price FROM plan_management WHERE id = ?';
    const result = await queryAsync(sql, [planId]);
    console.log(`Database query result for planId ${planId}:`, result);

    if (result.length === 0) {
        throw new Error(`Plan with ID ${planId} not found`);
    }

    return result[0];
};

const createStripeProductAndPrice = async (plan, billingCycle, memberCount) => {
    try {
        memberCount = parseInt(memberCount);
        if (isNaN(memberCount) || memberCount < 0) {
            throw new Error('Invalid memberCount');
        }
        //console.log('Creating Stripe product with plan:', plan);
        const product = await stripe.products.create({
            name: plan.name,
            description: plan.description,
        });

        const basePrice = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
        if (isNaN(basePrice) || basePrice <= 0) {
            throw new Error('Invalid base price');
        }

        let AddonPrice = 0;
        if (memberCount > 0) {
            const user_addon_price = plan.per_user_price;
            //console.log("user_addon_price", user_addon_price);

            AddonPrice = user_addon_price * memberCount;
            //console.log("AddonPrice", AddonPrice);
        }

        const totalPrice = parseFloat(basePrice) + parseFloat(AddonPrice);
        //console.log("totalPrice", totalPrice);
        if (isNaN(totalPrice) || totalPrice <= 0) {
            throw new Error('Invalid total price');
        }

        console.log(`Base Price: ${basePrice}, Member Count: ${memberCount}, Total Price: ${totalPrice}`);
        const totalPriceInCents = totalPrice * 100;



        const priceParams = {
            unit_amount: totalPriceInCents,
            currency: 'usd',
            product: product.id,
            recurring: {
                interval: billingCycle === 'yearly' ? 'month' : 'month',
                interval_count: billingCycle === 'yearly' ? 1 : 1,
            },
        };

        if (billingCycle === 'yearly') {
            priceParams.recurring.interval_count = 13;
        }
        const price = await stripe.prices.create(priceParams);
        // const price = await stripe.prices.create(priceParams);

        // const price = await stripe.prices.create({
        //     unit_amount: totalPriceInCents,
        //     currency: 'usd',
        //     //recurring: { interval: 'day' },
        //     recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
        //     product: product.id,
        // });

        return price.id;
    } catch (error) {
        console.error('Error creating Stripe product:', error);
        throw error;
    }
};

//before subscription
// exports.createSubscription = async (req, res) => {
//     try {
//         const { name, email, address, city, state, zip, cardNum, expMonth, expYear, cvv, planId, billingCycle, memberCount } = req.body;
//         //console.log("createSubscriptionreq.body",req.body);

//         const userQuery = 'SELECT user_id, email FROM users WHERE email = ?';
//         const userResult = await queryAsync(userQuery, [email]);

//         if (userResult.length === 0) {
//             return res.status(404).send({ error: 'User not found' });
//         }
//         const userId = userResult[0].user_id;


//         const plan = await getPlanFromDatabase(planId);
//         if (!plan) {
//             return res.status(404).send({ error: 'Plan not found' });
//         }

//         const priceId = await createStripeProductAndPrice(plan, billingCycle, memberCount);
//         if (!priceId) {
//             return res.status(500).send({ error: 'Failed to create price for the plan' });
//         }

//         const customer = await stripe.customers.create({
//             email: email,
//             name: name,
//             address: {
//                 line1: address,
//                 city: city,
//                 state: state,
//                 postal_code: zip,
//             }
//         });

//         const paymentMethod = await stripe.paymentMethods.create({
//             type: 'card',
//             card: {
//                 number: cardNum,
//                 exp_month: expMonth,
//                 exp_year: expYear,
//                 cvc: cvv
//             },
//             billing_details: {
//                 name: name,
//                 address: {
//                     line1: address,
//                     city: city,
//                     state: state,
//                     postal_code: zip,
//                 }
//             }
//         });
//         await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });

//         await stripe.customers.update(customer.id, {
//             invoice_settings: {
//                 default_payment_method: paymentMethod.id,
//             }
//         });


//         // const subscription = await stripe.subscriptions.create({
//         //     customer: customer.id,
//         //     items: [{ price: priceId }],
//         //     expand: ['latest_invoice.payment_intent'],
//         // });
//         const startDate = new Date();  // Set the start date dynamically
//         const trialEndTimestamp = Math.floor(startDate.getTime() / 1000) + (365 * 24 * 60 * 60) + (30 * 24 * 60 * 60);



//         let subscriptionParams = {
//             customer: customer.id,
//             items: [{ price: priceId }],
//             expand: ['latest_invoice.payment_intent'],
//             //trial_end: trialEndTimestamp,
//         };

//         const subscription = await stripe.subscriptions.create(subscriptionParams);

//         console.log("createsubscription",subscription);

//         const invoice = await stripe.invoices.retrieve(subscription.latest_invoice.id);


//         const paymentIntent = invoice.payment_intent;
//         if (!paymentIntent) {
//             return res.status(500).send({ error: 'Payment intent not found in invoice' });
//         }

//         const paymentIntentStatus = await stripe.paymentIntents.retrieve(paymentIntent);

//        // console.log("paymentIntentStatus",paymentIntentStatus);

//         if (!paymentIntentStatus || !paymentIntentStatus.status) {
//             return res.status(500).send({ error: 'Failed to retrieve payment intent status' });
//         }

//         let paymentStatus = paymentIntentStatus.status;
//         if (paymentStatus === 'succeeded') {

//             const updatedSubscription = await stripe.subscriptions.retrieve(subscription.id);

//             //console.log("subscriptiondetails",updatedSubscription);
//             const invoiceUrl = invoice.invoice_pdf;

//             //const planInterval = updatedSubscription.plan.interval;

//             var planInterva =updatedSubscription.plan.interval_count;
//             if(planInterva == "13"){
//                 var planInterval= 'year'
//             }else{
//                 var planInterval= 'month'
//             }

//             console.log("Plan Interval:", planInterval);

//             const order_history_data={
//                 user_id: userId,
//                 stripe_subscription_id: subscription.id,
//                 plan_id: planId,
//                 payment_status: paymentIntentStatus.status,
//                 subscription_details: JSON.stringify(subscription),
//                 payment_details: JSON.stringify(paymentIntentStatus),
//                 subscription_duration: planInterval,
//                 subscription_start_date: new Date(subscription.current_period_start * 1000),
//                 subscription_end_date: new Date(subscription.current_period_end * 1000),
//                 added_user_number: memberCount
//             }

//             const order_history_query= `INSERT INTO order_history SET ?`;
//             const order_history_value = await queryAsync(order_history_query,[order_history_data])

//             const getcompany_query = `SELECT * FROM company LEFT JOIN company_claim_request ON company.ID = company_claim_request.company_id WHERE company_claim_request.claimed_by= "${userId}"`;
//             const getcompany_value  = await queryAsync(getcompany_query);
//             var companyID = getcompany_value[0].ID;
//             console.log("companyID",companyID);

//             const updatecompany_query = `UPDATE company SET membership_type_id = ? WHERE ID = "${companyID}"`;
//             const updatecompany_value = await queryAsync(updatecompany_query,[planId]);

//             console.log("updatecompany_value",updatecompany_value);

//             const mailOptions = {
//                 from: process.env.MAIL_USER,
//                 // to: email,
//                 to: 'dev2.scwt@gmail.com',
//                 subject: 'Your Subscription Invoice',
//                 html: `<p>Hello ${name},</p>
//                        <p>Thank you for your subscription. You can view your invoice at the <a href="${invoiceUrl}">following link</a>.</p>
//                        <p>Kind Regards,</p>
//                        <p>CEchoes Technology Team</p>`
//             };

//             await mdlconfig.transporter.sendMail(mailOptions);

//             return res.send({
//                 status: 'ok',
//                 message: 'Your payment has been successfully processed.',
//                 subscriptionId: updatedSubscription.id,
//                 invoiceUrl: invoiceUrl
//             });
//         } else if (paymentStatus === 'requires_action') {
//             return res.status(400).send({
//                 status: 'requires_action',
//                 client_secret: paymentIntent.client_secret,
//                 message: 'Payment requires additional actions.'
//             });
//         } else {
//             return res.status(400).send({
//                 status: 'failed',
//                 message: 'Payment failed or requires a new payment method.'
//             });
//         }

//     } catch (error) {
//         console.error('Error creating subscription:', error);
//         return res.status(500).send({ error: error.message });
//     }
// };


// exports.createSubscription = async (req, res) => {
//     try {
//         const { name, email, address, city, state, zip, cardNum, expMonth, expYear, cvv, planId, billingCycle, memberCount, planData, priceData, subscriptionData } = req.body;

//         let razorpayCustomer;

//         try {
//             // Check if customer already exists in Razorpay
//             razorpayCustomer = await razorpay.customers.fetch({
//                 email: email,
//             });
//             console.log("Customer already exists in Razorpay:", razorpayCustomer);
//         } catch (error) {
//             if (error.statusCode === 404) {
//                 // Customer not found, create them
//                 const customerParams = {
//                     name: name,
//                     email: email,
//                     //contact: '+91xxxxxxxxxx', // Update with customer's contact number as needed
//                     notes: {
//                         address: address,
//                         city: city,
//                         state: state,
//                         zip: zip
//                     }
//                 };

//                 razorpayCustomer = await razorpay.customers.create(customerParams);
//                 console.log("Created customer in Razorpay:", razorpayCustomer);
//             } else {
//                 throw error; // Rethrow error for other unexpected errors
//             }
//         }

//         // Proceed with subscription creation using razorpayCustomer.id

//         // Retrieve plan details from your database
//         const plan = await getPlanFromDatabase(planId);
//         if (!plan) {
//             return res.status(404).send({ error: 'Plan not found' });
//         }

//         // Create Razorpay plan
//         const priceId = await createRazorpayPlan(plan, billingCycle, memberCount);
//         if (!priceId) {
//             return res.status(500).send({ error: 'Failed to create price for the plan' });
//         }
//         console.log("Created Razorpay plan:", priceId);

//         // Create subscription with customer ID
//         const subscriptionParams = {
//             plan_id: priceId.id,
//             customer_id: razorpayCustomer.id, // Associate the customer with the subscription
//             customer_notify: 1,
//             // You can optionally specify start_at if needed
//             // start_at: new Date().getTime() + (24 * 60 * 60 * 1000), // Example: Start subscription 1 day from now
//             // Remove total_count and end_at for indefinite subscription
//             // total_count: 12, // Remove for indefinite
//             // end_at: new Date('2025-12-31').getTime(), // Remove for indefinite
//             // Add any additional parameters as needed
//         };

//         const subscription = await razorpay.subscriptions.create(subscriptionParams);
//         console.log("Created subscription:", subscription);

//         // Optionally, initiate payment for the subscription (if required)
//         const payment = await initiateRazorpayPayment({
//             // amount: priceData.amount, // Uncomment if you need to specify the payment amount
//             subscriptionId: subscription.id,
//         });
//         console.log("Initiated payment:", payment);

//         // Send success response
//         res.status(200).send({ message: 'Subscription created successfully', subscription });
//     } catch (error) {
//         console.error('Error creating subscription flow:', error);
//         res.status(500).send({ error: error.message });
//     }
// };




// exports.createSubscription = async (req, res) => {
//     try {
//        const { name, email, address, city, state, zip, cardNum, expMonth, expYear, cvv, planId, billingCycle, memberCount, planData, priceData, subscriptionData } = req.body;
//         console.log("memberCount",memberCount);
//         console.log("subscription_ req.body",req.body);

//         const plan = await getPlanFromDatabase(planId);
//         if (!plan) {
//             return res.status(404).send({ error: 'Plan not found' });
//         }

//         const priceId = await createRazorpayPlan(plan, billingCycle, memberCount);
//         if (!priceId) {
//             return res.status(500).send({ error: 'Failed to create price for the plan' });
//         }
//         console.log("Created Razorpay plan:", priceId);

//         let customerId = await findOrCreateCustomer(email, name);

//         const subscriptionParams = {
//             plan_id: priceId.id,
//             total_count: 1200, 
//             customer_id: customerId,
//             //customer_notify: 1,
//         };
//         const subscription = await razorpay.subscriptions.create(subscriptionParams);
//         console.log("Created subscription:", subscription);

//         const orderOptions = {
//             amount: plan.currency == 'USD' ? plan.monthly_price * 100 : plan.monthly_price * 100,
//             currency: plan.currency == 'USD' ? 'USD' : 'INR',
//             receipt: `order_${subscription.id}_${Date.now()}`,
//             payment_capture: 1,
//             //plan_id: priceId.id, 
//         };
//         const order = await razorpay.orders.create(orderOptions);
//         console.log("Created order for subscription payment:", order);

//         res.status(200).send({
//             message: 'Subscription created successfully',
//             subscription: subscription,
//             //order: order,
//         });
//     } catch (error) {
//         console.error('Error creating subscription flow:', error);
//         res.status(500).send({ error: error.message });
//     }
// };



// const getPlanFromDatabase = async (planId) => {
//     console.log("planferrg", planId);
//     const sql = 'SELECT name, description, monthly_price, yearly_price, currency,per_user_price FROM plan_management WHERE id = ?';
//     const result = await queryAsync(sql, [planId]);
//     console.log(`Database query result for planId ${planId}:`, result);

//     if (result.length === 0) {
//         throw new Error(`Plan with ID ${planId} not found`);
//     }

//     return result[0];
// };


exports.updateOrderHistory = async (req, res) => {
    try {
        const { name, email, phone, address, city, state, zip, planId, billingCycle, memberCount, subscriptionId } = req.body;
        console.log("updateOrderHistory:", req.body);


        const getidquery = `SELECT * FROM users WHERE email = "${email}"`;
        const getidvalue = await queryAsync(getidquery);
        var userId = getidvalue[0].user_id;
        console.log("userId", userId);

        let customerId = await findOrCreateCustomer(email, name, phone, address, city, state, zip);
        console.log("customerId", customerId);

        let country_name = req.cookies.countryName
        || 'India';
        let country_code = req.cookies.countryCode
        || 'IN';
        console.log("country_codesdf", country_code);
        console.log("country_namesdf", country_name);

        const getcompanyquery = `SELECT company.* FROM company LEFT JOIN company_claim_request ON company.ID = company_claim_request.company_id WHERE company_claim_request.claimed_by=?`;
        const getcompanyvalue = await queryAsync(getcompanyquery, [userId]);
        console.log("getcompanyvaluea", getcompanyvalue);
        var companyID = getcompanyvalue[0].ID;
        console.log("companyID", companyID);

        const updatecompany_query = `UPDATE company SET membership_type_id = ? WHERE ID = "${companyID}"`;
        const updatecompany_value = await queryAsync(updatecompany_query, [planId]);
        console.log("updatecompany_value", updatecompany_value);

        const subscriptionDetails = await razorpay.subscriptions.fetch(subscriptionId);
        console.log('Subscription details:', subscriptionDetails);

        // const invoices = await razorpay.invoices.all({
        //     'subscription_id': subscriptionId
        // });
        // console.log('Invoices for subscriptions:', invoices);

        // const invoiceId = invoices.items.length > 0 ? invoices.items[0].id : null;
        // console.log('Invoice IDs:', invoiceId);

        // const getpayments= fetchPaymentsByInvoiceId(invoiceId);
        // console.log("getpayments",getpayments);

        console.log("Subscription current start timestamp:", subscriptionDetails.current_start);
        console.log("Subscription charge at timestamp:", subscriptionDetails.charge_at);

        const subscriptionStartDate = new Date(subscriptionDetails.current_start * 1000);
        const subscriptionEndDate = new Date(subscriptionDetails.charge_at * 1000);

        console.log("Subscription start date:", subscriptionStartDate);
        console.log("Subscription end date:", subscriptionEndDate);


        const order_history_data = {
            // user_id: userID,
            payment_status: 'success',
            subscription_details: JSON.stringify(subscriptionDetails),
            subscription_start_date: new Date(subscriptionDetails.current_start * 1000),
            subscription_end_date: new Date(subscriptionDetails.charge_at * 1000),
        };

        const update_order_history_query = `
            UPDATE order_history
            SET payment_status = ?, subscription_details = ?, subscription_start_date = ?, subscription_end_date = ?
            WHERE stripe_subscription_id = ?
          `;

        const update_values = [
            //order_history_data.user_id,
            order_history_data.payment_status,
            order_history_data.subscription_details,
            order_history_data.subscription_start_date,
            order_history_data.subscription_end_date,
            subscriptionId
        ];
        try {
            const update_result = await queryAsync(update_order_history_query, update_values);
            console.log(`Order history updated for subscription ID ${subscriptionId}`);
        } catch (error) {
            console.error('Failed to update order history:', error);
        }
    } catch (error) {
        console.error('Error creating subscription flow:', error);
        res.status(500).send({ error: error.message });
    }
};

exports.createSubscription = async (req, res) => {
    try {
        const { name, email, phone, address, city, state, zip, planId, billingCycle, memberCount, } = req.body;
        console.log("Subscription request body:", req.body);


        const getidquery = `SELECT * FROM users WHERE email = "${email}"`;
        const getidvalue = await queryAsync(getidquery);
        var userId = getidvalue[0].user_id;
        console.log("userId", userId);

        let customerId = await findOrCreateCustomer(email, name, phone, address, city, state, zip);
        console.log("customerId", customerId);

        let country_name = req.cookies.countryName
        //|| 'India';
        let country_code = req.cookies.countryCode
        //|| 'IN';
        console.log("country_codesdf", country_code);
        console.log("country_namesdf", country_name);

        // const customerId = customer.id.startsWith('cust_') ? customer.id : `cust_${customer.id}`;
        // console.log('Formatted Customer ID:', customerId);

        // const customerId = "cust_" + customer.id;
        // console.log("Formatted Customer ID:", customerId);

        const plan = await getPlanFromDatabase(planId);
        if (!plan) {
            return res.status(404).send({ error: 'Plan not found' });
        }

        const priceId = await createRazorpayPlanprevioususer(plan, billingCycle, memberCount, country_code);
        if (!priceId) {
            return res.status(500).send({ error: 'Failed to create price for the plan' });
        }
        console.log("Created Razorpay plan:", priceId);

        var amountss = priceId.item.amount;
        console.log("amountss", amountss);

        const subscriptionParams = {
            plan_id: priceId.id,
            customer_id: customerId,
            //total_count: 1200,
            total_count: 92,
            // shipping_address: {
            //     name: name,
            //     phone: phone,
            //     address: address,
            //     city: city,
            //     state: state,
            //     zip: zip
            // }
        };

        console.log("subscriptionParams", subscriptionParams);
        const subscription = await razorpay.subscriptions.create(subscriptionParams);
        console.log("Created subscription:", subscription);

        // const itemss_id = priceId.item.id;
        // console.log("itemss_id",itemss_id);

        // const invoiceParams = {
        //     type: 'invoice',
        //     date: Math.floor(Date.now() / 1000),
        //     customer_id: customerId,
        //     subscription_id: subscription.id, 
        //     line_items: [
        //         {
        //             item_id: itemss_id, 
        //             amount: amountss,
        //             currency: 'INR', 
        //             description: 'Subscription Invoice', 
        //             quantity: 1 
        //         }
        //     ]
        // };
        // const invoice = await razorpay.invoices.create(invoiceParams);
        // console.log('Invoice created successfully:', invoice);

        const invoices = await razorpay.invoices.all({
            'subscription_id': subscription.id
        });
        console.log('Invoices for subscription:', invoices);

        req.subscriptionId = subscription.id;

        console.log("Subscription current start timestamp:", subscription.current_start);
        console.log("Subscription charge at timestamp:", subscription.charge_at);

        const subscriptionStartDate = new Date(subscription.current_start * 1000);
        const subscriptionEndDate = new Date(subscription.charge_at * 1000);

        console.log("Subscription start date:", subscriptionStartDate);
        console.log("Subscription end date:", subscriptionEndDate);

        const order_history_data = {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            plan_id: planId,
            payment_status: 'pending',
            subscription_details: JSON.stringify(subscription),
            subscription_duration: billingCycle,
            subscription_start_date: new Date(subscription.current_start * 1000),
            subscription_end_date: new Date(subscription.charge_at * 1000),
            added_user_number: memberCount
        };
        const order_history_query = `INSERT INTO order_history SET ?`;
        await queryAsync(order_history_query, [order_history_data]);

        res.status(200).send({
            message: 'Subscription created successfully',
            subscription: subscription,
            amount
                : amountss
        });
    } catch (error) {
        console.error('Error creating subscription flow:', error);
        res.status(500).send({ error: error.message });
    }
};

const getInvoicesForSubscription = async (subscriptionId) => {
    try {
        // Retrieve all invoices associated with the subscription
        const invoices = await razorpay.invoices.all({
            'subscription_id': subscriptionId
        });

        // Print or process the invoices
        console.log('Invoices:', invoices);

        return invoices;
    } catch (error) {
        console.error('Error fetching invoices:', error);
        throw error;
    }
};



exports.createexternalSubscription = async (req, res) => {
    try {
        const { name, email, phone, address, city, state, zip, planId, billingCycle, memberCount } = req.body;
        console.log("Subscription request body:", req.body);

        const getcountryquery = `SELECT * FROM countries WHERE id = "${req.body.user_country}"`;
        const getcountryvalue = await queryAsync(getcountryquery);
        const getstatequery = `SELECT * FROM states WHERE country_id = "${req.body.user_country}"`;
        const getstatevalue = await queryAsync(getstatequery);
        var countryNAme = getcountryvalue[0].name;
        console.log("countryNAme",countryNAme);
        var stateNAme = getstatevalue[0].name;
        console.log("countryNAme",countryNAme);


        let customerId = await CreateCustomer(email, name, phone, countryNAme, city, stateNAme, zip);
        console.log("customerId", customerId);

        // Fetch country details from cookies
        let country_name = req.cookies.countryName;
        let country_code = req.cookies.countryCode;
        console.log("Country Code:", country_code);
        console.log("Country Name:", country_name);

        // Fetch plan details from database
        const plan = await getPlanFromDatabase(planId);
        console.log("planss", plan);
        if (!plan) {
            return res.status(404).send({ error: 'Plan not found' });
        }

        // Create Razorpay plan
        const priceId = await createRazorpayPlan(plan, billingCycle, memberCount, country_code);
        if (!priceId) {
            return res.status(500).send({ error: 'Failed to create price for the plan' });
        }
        console.log("Created Razorpay plan:", priceId);

        // Create subscription with Razorpay
        const subscriptionParams = {
            plan_id: priceId.id,
            customer_id: customerId,
            total_count: 92,
        };
        const subscription = await razorpay.subscriptions.create(subscriptionParams);
        console.log("Created subscription:", subscription);

        // Store subscription ID in a variable accessible outside this function
        req.subscriptionId = subscription.id;

        console.log("Subscription current start timestamp:", subscription.current_start);
        console.log("Subscription charge at timestamp:", subscription.charge_at);

        const subscriptionStartDate = new Date(subscription.current_start * 1000);
        const subscriptionEndDate = new Date(subscription.charge_at * 1000);

        console.log("Subscription start date:", subscriptionStartDate);
        console.log("Subscription end date:", subscriptionEndDate);

        const order_history_data = {
            stripe_subscription_id: subscription.id,
            plan_id: planId,
            payment_status: 'pending',
            subscription_details: JSON.stringify(subscription),
            subscription_duration: billingCycle,
            subscription_start_date: new Date(subscription.current_start * 1000),
            subscription_end_date: new Date(subscription.charge_at * 1000),
            added_user_number: memberCount
        };
        const order_history_query = `INSERT INTO order_history SET ?`;
        await queryAsync(order_history_query, [order_history_data]);

        // Send response
        res.status(200).send({
            message: 'Subscription created successfully',
            subscription: subscription,
        });
    } catch (error) {
        console.error('Error creating subscription flow:', error);
        res.status(500).send({ error: error.message });
    }
};


exports.externalRegistration = async (req, res) => {
    const { first_name, last_name, email, register_password, phone, address, city, state, zip, planId, billingCycle, memberCount, subscriptionId, user_state, user_country, register_confirm_password } = req.body;
    console.log("externalRegistration", req.body);

    try {
        if (register_password !== register_confirm_password) {
            return res.status(400).json({ status: 'err', message: 'Passwords does not match.' });
        }
        const emailExists = await new Promise((resolve, reject) => {
            db.query('SELECT email, register_from FROM users WHERE email = ?', [email], (err, results) => {
                if (err) return reject(err);
                if (results.length > 0) {
                    var register_from = results[0].register_from;
                    var message = '';
                    // Handle existing email scenarios
                    if (register_from == 'web') {
                        message = 'Email ID already exists, Please login with your email-ID and password';
                    } else if (register_from == 'facebook') {
                        message = 'Email ID already exists, login with ' + register_from;
                    } else if (register_from == 'gmail') {
                        register_from = 'google';
                        message = 'Email ID already exists, login with ' + register_from;
                    } else {
                        message = 'Email ID already exists, login with ' + register_from;
                    }
                    return res.status(500).json({ status: 'err', data: '', message: message });
                } else {
                    resolve(false);
                }
            });
        });

        if (emailExists) {
            console.log("Email already exists.");
            return;
        }

        console.log("Email does not exist, proceeding to create user.");

        const hashedPassword = await bcrypt.hash(register_password, 8);
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        // Insert user into users table
        const userInsertQuery = 'INSERT INTO users (first_name, last_name, email,phone, password, register_from, user_registered, user_status, user_type_id, alise_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(userInsertQuery, [first_name, last_name, email, phone, hashedPassword, 'web', formattedDate, 3, 2, first_name + last_name], async (err, userResults) => {
            if (err) {
                console.error('Error inserting user into "users" table:', err);
                return res.status(500).json({ status: 'err', data: '', message: 'An error occurred while processing your request' });
            }

            var userID = userResults.insertId;
            console.log("userID", userID);

            // Send welcome email
            var mailOptions = {
                from: process.env.MAIL_USER,
                to: email,
                subject: 'Welcome e-mail',
                html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                <style>
                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                }
                </style>
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
                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome</h1>
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
                                                <strong>Hello ${first_name},</strong>
                                                <p style="font-size:15px; line-height:20px">Your account and company has created successfully.</p>
                                                <p style="font-size:15px; line-height:20px">Please wait for Admin approval.</p>
                                                <p style="font-size:15px; line-height:20px"><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
                                            </td>
                                          </tr>
                                        </table>
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
            };
            await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ status: 'err', message: 'Something went wrong while sending email' });
                } else {
                    console.log('Mail sent: ', info.response);
                }
            });

            var mailOptions1 = {
                from: process.env.MAIL_USER,
                to: process.env.MAIL_USER,
                subject: 'New Registration at CEchoes',
                html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
                <style>
                body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
                    font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
                }
                </style>
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
                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome</h1>
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
                                                <strong>Hello ${first_name},</strong>
                                                <p style="font-size:15px; line-height:20px">User1 has been register at CEchoes.com</p>
                                                <p style="font-size:15px; line-height:20px">Please verify the <a href="http://localhost:2000">user</a>.</p>
                                                <p style="font-size:15px; line-height:20px"><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
                                            </td>
                                          </tr>
                                        </table>
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
            };
            await mdlconfig.transporter.sendMail(mailOptions1, function (err, info) {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ status: 'err', message: 'Something went wrong while sending email' });
                } else {
                    console.log('Mail sent to admin: ', info.response);
                }
            });

            // Create company logic
            // Check if company exists
            if (req.body.parent_id == 0) {
                const companyQuery = `SELECT * FROM company WHERE company_name = ? AND main_address_country = ? `;
                const companyValue = await query(companyQuery, [req.body.company_name, req.body.main_address_country]);
                if (companyValue.length > 0) {
                    return res.status(500).json({ status: 'err', data: '', message: 'Organization name already exists.' });
                }
            }
            if (!req.body.parent_id || req.body.parent_id === "Select Parent") {
                req.body.parent_id = 0;
            }

            comFunction2.generateUniqueSlug(req.body.company_name, async (error, companySlug) => {
                if (error) {
                    console.log('Err: ', error.message);
                    return res.status(500).json({ status: 'err', data: '', message: 'Error generating company slug' });
                } else {
                    console.log('companySlug', companySlug);
                    var insertValues = [];
                    if (req.file) {
                        insertValues = [userResults.insertId, req.body.company_name, req.body.heading, req.file.filename, req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, '2', req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug, req.body.parent_id];
                    } else {
                        insertValues = [userResults.insertId, req.body.company_name, req.body.heading, '', req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, '2', req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.main_address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug, req.body.parent_id];
                    }

                    const insertQuery = 'INSERT INTO company (user_created_by, company_name, heading, logo, about_company, comp_phone, comp_email, comp_registration_id, status, trending, created_date, updated_date, tollfree_number, main_address, main_address_pin_code, address_map_url, main_address_country, main_address_state, main_address_city, verified, paid_status, slug, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    db.query(insertQuery, insertValues, async (err, results, fields) => {
                        if (err) {
                            return res.status(500).json({ status: 'err', data: '', message: 'An error occurred while processing your request' });
                        } else {
                            console.log("company results", results);
                            var companyId = results.insertId;

                            const updatecompany_query = `UPDATE company SET membership_type_id = ? WHERE ID = "${companyId}"`;
                            const updatecompany_value = await queryAsync(updatecompany_query, [planId]);
                            console.log("updatecompany_value", updatecompany_value);

                            const updatecompanyclaim_query = `INSERT INTO company_claim_request SET company_id = ?, claimed_by = ?, status = ?, claimed_date = ?`;
                            const updatecompanyclaim_values = [companyId, userID, '1', formattedDate];
                            const updatecompanyclaim_result = await queryAsync(updatecompanyclaim_query, updatecompanyclaim_values);
                            console.log("Company claim request inserted successfully:", updatecompanyclaim_result);

                            const subscriptionDetails = await razorpay.subscriptions.fetch(subscriptionId);
                            console.log('Subscription details:', subscriptionDetails);

                            const invoices = await razorpay.invoices.all({
                                'subscription_id': subscriptionId
                            });
                            console.log('Invoices for subscriptions:', invoices);

                            const invoiceId = invoices.items.length > 0 ? invoices.items[0].id : null;
                            console.log('Invoice IDs:', invoiceId);

                            // const getpayments= fetchPaymentsByInvoiceId(invoiceId);
                            // console.log("getpayments",getpayments);

                            console.log("Subscription current start timestamp:", subscriptionDetails.current_start);
                            console.log("Subscription charge at timestamp:", subscriptionDetails.charge_at);

                            const subscriptionStartDate = new Date(subscriptionDetails.current_start * 1000);
                            const subscriptionEndDate = new Date(subscriptionDetails.charge_at * 1000);

                            console.log("Subscription start date:", subscriptionStartDate);
                            console.log("Subscription end date:", subscriptionEndDate);


                            const order_history_data = {
                                user_id: userID,
                                payment_status: 'success',
                                subscription_details: JSON.stringify(subscriptionDetails),
                                subscription_start_date: new Date(subscriptionDetails.current_start * 1000),
                                subscription_end_date: new Date(subscriptionDetails.charge_at * 1000),
                            };

                            const update_order_history_query = `
                                UPDATE order_history
                                SET user_id = ?, payment_status = ?, subscription_details = ?, subscription_start_date = ?, subscription_end_date = ?
                                WHERE stripe_subscription_id = ?
                              `;

                            const update_values = [
                                order_history_data.user_id,
                                order_history_data.payment_status,
                                order_history_data.subscription_details,
                                order_history_data.subscription_start_date,
                                order_history_data.subscription_end_date,
                                subscriptionId
                            ];

                            // Execute the query
                            try {
                                const update_result = await queryAsync(update_order_history_query, update_values);
                                console.log(`Order history updated for subscription ID ${subscriptionId}`);
                            } catch (error) {
                                console.error('Failed to update order history:', error);
                            }


                            // Insert user meta
                            const userMetaInsertQuery = 'INSERT INTO user_customer_meta (user_id, review_count, country, state) VALUES (?, ?, ?, ?)';
                            await queryAsync(userMetaInsertQuery, [userResults.insertId, 0, user_country, user_state]);

                            // Register user in blog API
                            const userRegistrationData = {
                                username: email,
                                email: email,
                                password: register_password,
                                first_name: first_name,
                                last_name: last_name,
                            };
                            await axios.post(`${process.env.BLOG_API_ENDPOINT}/register`, userRegistrationData);

                            // Log user in blog API
                            const userData = {
                                user_id: userResults.insertId,
                                first_name: first_name,
                                last_name: last_name,
                                email: email,
                                user_type_id: 2
                            };
                            const encodedUserData = JSON.stringify(userData);
                            res.cookie('user', encodedUserData);

                            const userLoginData = {
                                email: email,
                                password: register_password,
                            };
                            const loginResponse = await axios.post(`${process.env.BLOG_API_ENDPOINT}/login`, userLoginData);
                            const wpUserData = loginResponse.data.data;

                            // Fetch device info
                            const userAgent = req.headers['user-agent'];
                            const agent = useragent.parse(userAgent);
                            const deviceQuery = 'SELECT * FROM user_device_info WHERE user_id = ?';
                            const deviceQueryResults = await new Promise((resolve, reject) => {
                                db.query(deviceQuery, [userResults.insertId], (err, results) => {
                                    if (err) return reject(err);
                                    resolve(results);
                                });
                            });

                            // Insert or update device info
                            const ipAddress = requestIp.getClientIp(req);
                            const deviceInfo = `${agent.toAgent()} ${agent.os.toString()}`;
                            if (deviceQueryResults.length > 0) {
                                const deviceUpdateQuery = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
                                const values = [deviceInfo, ipAddress, formattedDate, userResults.insertId];
                                await new Promise((resolve, reject) => {
                                    db.query(deviceUpdateQuery, values, (err, results) => {
                                        if (err) return reject(err);
                                        resolve(results);
                                    });
                                });
                            } else {
                                const deviceInsertQuery = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                const values = [userResults.insertId, deviceInfo, '', '', '', '', ipAddress, formattedDate, formattedDate];
                                await new Promise((resolve, reject) => {
                                    db.query(deviceInsertQuery, values, (err, results) => {
                                        if (err) return reject(err);
                                        resolve(results);
                                    });
                                });
                            }

                            // Respond with success message
                            return res.status(200).json({ status: 'ok', data: userResults.insertId, message: 'New user created' });
                        }
                    });
                }
            });
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ status: 'err', data: '', message: 'An error occurred while processing your request' });
    }
};


// exports.externalRegistration = async (req, res) => {
//     const { first_name, last_name, email, register_password, phone, address, city, state, zip, planId, billingCycle, memberCount, subscriptionId,user_state, user_country, register_confirm_password  } = req.body;
//     console.log("externalRegistration", req.body);

//     try {
//         if (register_password !== register_confirm_password) {
//             return res.status(400).json({ status: 'err', message: 'Passwords does not match.' });
//         }
//         const emailExists = await new Promise((resolve, reject) => {
//             db.query('SELECT email, register_from FROM users WHERE email = ?', [email], (err, results) => {
//                 if (err) return reject(err);
//                 if (results.length > 0) {
//                     var register_from = results[0].register_from;
//                     var message = '';
//                     // Handle existing email scenarios
//                     if (register_from == 'web') {
//                         message = 'Email ID already exists, Please login with your email-ID and password';
//                     } else if (register_from == 'facebook') {
//                         message = 'Email ID already exists, login with ' + register_from;
//                     } else if (register_from == 'gmail') {
//                         register_from = 'google';
//                         message = 'Email ID already exists, login with ' + register_from;
//                     } else {
//                         message = 'Email ID already exists, login with ' + register_from;
//                     }
//                     return res.status(500).json({ status: 'err', data: '', message: message });
//                 } else {
//                     resolve(false);
//                 }
//             });
//         });

//         if (emailExists) {
//             console.log("Email already exists.");
//             return;
//         }

//         console.log("Email does not exist, proceeding to create user.");

//         const hashedPassword = await bcrypt.hash(register_password, 8);
//         const currentDate = new Date();
//         const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

//         // Insert user into users table
//         const userInsertQuery = 'INSERT INTO users (first_name, last_name, email, password, register_from, user_registered, user_status, user_type_id, alise_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
//         db.query(userInsertQuery, [first_name, last_name, email, hashedPassword, 'web', formattedDate, 3, 2, first_name + last_name], async (err, userResults) => {
//             if (err) {
//                 console.error('Error inserting user into "users" table:', err);
//                 return res.status(500).json({ status: 'err', data: '', message: 'An error occurred while processing your request' });
//             }

//             var userID = userResults.insertId;
//             console.log("userID",userID);

//             // Send welcome email
//             var mailOptions = {
//                 from: process.env.MAIL_USER,
//                 to: email,
//                 subject: 'Welcome e-mail',
//                 html:`<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
//                 <style>
//                 body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
//                     font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
//                 }
//                 </style>
//                 <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
//                  <tbody>
//                   <tr>
//                    <td align="center" valign="top">
//                      <div id="template_header_image"><p style="margin-top: 0;"></p></div>
//                      <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
//                       <tbody>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Header -->
//                            <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
//                              <tbody>
//                                <tr>
//                                <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
//                                 <td id="header_wrapper" style="padding: 36px 48px; display: block;">
//                                    <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome</h1>
//                                 </td>

//                                </tr>
//                              </tbody>
//                            </table>
//                      <!-- End Header -->
//                      </td>
//                         </tr>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Body -->
//                            <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
//                              <tbody>
//                                <tr>
//                                 <td id="body_content" style="background-color: #fdfdfd;" valign="top">
//                                   <!-- Content -->
//                                   <table border="0" cellpadding="20" cellspacing="0" width="100%">
//                                    <tbody>
//                                     <tr>
//                                      <td style="padding: 48px;" valign="top">
//                                        <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">

//                                         <table border="0" cellpadding="4" cellspacing="0" width="90%">
//                                           <tr>
//                                             <td colspan="2">
//                                                 <strong>Hello ${first_name},</strong>
//                                                 <p style="font-size:15px; line-height:20px">Your account and company has created successfully.</p>
//                                                 <p style="font-size:15px; line-height:20px">Please wait for Admin approval</p>
//                                                 <p style="font-size:15px; line-height:20px"><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
//                                             </td>
//                                           </tr>
//                                         </table>
//                                        </div>
//                                      </td>
//                                     </tr>
//                                    </tbody>
//                                   </table>
//                                 <!-- End Content -->
//                                 </td>
//                                </tr>
//                              </tbody>
//                            </table>
//                          <!-- End Body -->
//                          </td>
//                         </tr>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Footer -->
//                            <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
//                             <tbody>
//                              <tr>
//                               <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
//                                <table border="0" cellpadding="10" cellspacing="0" width="100%">
//                                  <tbody>
//                                    <tr>
//                                     <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
//                                          <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
//                                     </td>
//                                    </tr>
//                                  </tbody>
//                                </table>
//                               </td>
//                              </tr>
//                             </tbody>
//                            </table>
//                          <!-- End Footer -->
//                          </td>
//                         </tr>
//                       </tbody>
//                      </table>
//                    </td>
//                   </tr>
//                  </tbody>
//                 </table>
//                </div>`
//             };
//             await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
//                 if (err) {
//                     console.log(err);
//                     return res.status(500).json({ status: 'err', message: 'Something went wrong while sending email' });
//                 } else {
//                     console.log('Mail sent: ', info.response);
//                 }
//             });

//             var mailOptions1 = {
//                 from: process.env.MAIL_USER,
//                 to: process.env.MAIL_USER,
//                 subject: 'New Registration at CEchoes',
//                 html:`<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
//                 <style>
//                 body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
//                     font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
//                 }
//                 </style>
//                 <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
//                  <tbody>
//                   <tr>
//                    <td align="center" valign="top">
//                      <div id="template_header_image"><p style="margin-top: 0;"></p></div>
//                      <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
//                       <tbody>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Header -->
//                            <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
//                              <tbody>
//                                <tr>
//                                <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/email-template-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
//                                 <td id="header_wrapper" style="padding: 36px 48px; display: block;">
//                                    <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Welcome</h1>
//                                 </td>

//                                </tr>
//                              </tbody>
//                            </table>
//                      <!-- End Header -->
//                      </td>
//                         </tr>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Body -->
//                            <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
//                              <tbody>
//                                <tr>
//                                 <td id="body_content" style="background-color: #fdfdfd;" valign="top">
//                                   <!-- Content -->
//                                   <table border="0" cellpadding="20" cellspacing="0" width="100%">
//                                    <tbody>
//                                     <tr>
//                                      <td style="padding: 48px;" valign="top">
//                                        <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">

//                                         <table border="0" cellpadding="4" cellspacing="0" width="90%">
//                                           <tr>
//                                             <td colspan="2">
//                                                 <strong>Hello ${first_name},</strong>
//                                                 <p style="font-size:15px; line-height:20px">User1 has been register at CEchoes.com</p>
//                                                 <p style="font-size:15px; line-height:20px">Please verify the <a href="http://localhost:2000">user</a>.</p>
//                                                 <p style="font-size:15px; line-height:20px"><br><p style="font-size:15px; line-height:20px">Kind Regards,</p><p style="font-size:15px; line-height:20px">CEchoes Technology Team</p><br>
//                                             </td>
//                                           </tr>
//                                         </table>
//                                        </div>
//                                      </td>
//                                     </tr>
//                                    </tbody>
//                                   </table>
//                                 <!-- End Content -->
//                                 </td>
//                                </tr>
//                              </tbody>
//                            </table>
//                          <!-- End Body -->
//                          </td>
//                         </tr>
//                         <tr>
//                          <td align="center" valign="top">
//                            <!-- Footer -->
//                            <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
//                             <tbody>
//                              <tr>
//                               <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
//                                <table border="0" cellpadding="10" cellspacing="0" width="100%">
//                                  <tbody>
//                                    <tr>
//                                     <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
//                                          <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
//                                     </td>
//                                    </tr>
//                                  </tbody>
//                                </table>
//                               </td>
//                              </tr>
//                             </tbody>
//                            </table>
//                          <!-- End Footer -->
//                          </td>
//                         </tr>
//                       </tbody>
//                      </table>
//                    </td>
//                   </tr>
//                  </tbody>
//                 </table>
//                </div>`
//             };
//             await mdlconfig.transporter.sendMail(mailOptions1, function (err, info) {
//                 if (err) {
//                     console.log(err);
//                     return res.status(500).json({ status: 'err', message: 'Something went wrong while sending email' });
//                 } else {
//                     console.log('Mail sent to admin: ', info.response);
//                 }
//             });

//             // Create company logic
//             // Check if company exists
//             if (req.body.parent_id == 0) {
//                 const companyQuery = `SELECT * FROM company WHERE company_name = ? AND main_address_country = ? `;
//                 const companyValue = await query(companyQuery, [req.body.company_name, req.body.main_address_country]);
//                 if (companyValue.length > 0) {
//                     return res.status(500).json({ status: 'err', data: '', message: 'Organization name already exists.' });
//                 }
//             }
//             if (!req.body.parent_id || req.body.parent_id === "Select Parent") {
//                 req.body.parent_id = 0;
//             }

//             comFunction2.generateUniqueSlug(req.body.company_name, async (error, companySlug) => {
//                 if (error) {
//                     console.log('Err: ', error.message);
//                     return res.status(500).json({ status: 'err', data: '', message: 'Error generating company slug' });
//                 } else {
//                     console.log('companySlug', companySlug);
//                     var insertValues = [];
//                     if (req.file) {
//                         insertValues = [userResults.insertId, req.body.company_name, req.body.heading, req.file.filename, req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, '2', req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug, req.body.parent_id];
//                     } else {
//                         insertValues = [userResults.insertId, req.body.company_name, req.body.heading, '', req.body.about_company, req.body.comp_phone, req.body.comp_email, req.body.comp_registration_id, '2', req.body.trending, formattedDate, formattedDate, req.body.tollfree_number, req.body.main_address, req.body.main_address_pin_code, req.body.address_map_url, req.body.main_address_country, req.body.main_address_state, req.body.main_address_city, '0', 'free', companySlug, req.body.parent_id];
//                     }

//                     const insertQuery = 'INSERT INTO company (user_created_by, company_name, heading, logo, about_company, comp_phone, comp_email, comp_registration_id, status, trending, created_date, updated_date, tollfree_number, main_address, main_address_pin_code, address_map_url, main_address_country, main_address_state, main_address_city, verified, paid_status, slug, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//                     db.query(insertQuery, insertValues, async (err, results, fields) => {
//                         if (err) {
//                             return res.status(500).json({ status: 'err', data: '', message: 'An error occurred while processing your request' });
//                         } else {
//                             console.log("company results", results);
//                             var companyId = results.insertId;

//                             const updatecompany_query = `UPDATE company SET membership_type_id = ? WHERE ID = "${companyId}"`;
//                             const updatecompany_value = await queryAsync(updatecompany_query, [planId]);
//                             console.log("updatecompany_value", updatecompany_value);

//                             const subscriptionDetails = await razorpay.subscriptions.fetch(subscriptionId);
//                             console.log('Subscription details:', subscriptionDetails);

//                             const invoices = await razorpay.invoices.all({
//                                 'subscription_id': subscriptionId
//                             });
//                             console.log('Invoices for subscriptions:', invoices);

//                             const invoiceId = invoices.items.length > 0 ? invoices.items[0].id : null;
//                             console.log('Invoice IDs:', invoiceId);

//                             // const getpayments= fetchPaymentsByInvoiceId(invoiceId);
//                             // console.log("getpayments",getpayments);

//                             console.log("Subscription current start timestamp:", subscriptionDetails.current_start);
//                             console.log("Subscription charge at timestamp:", subscriptionDetails.charge_at);

//                             const subscriptionStartDate = new Date(subscriptionDetails.current_start * 1000);
//                             const subscriptionEndDate = new Date(subscriptionDetails.charge_at * 1000);

//                             console.log("Subscription start date:", subscriptionStartDate);
//                             console.log("Subscription end date:", subscriptionEndDate);


//                             const order_history_data = {
//                                 user_id: userID,
//                                 payment_status: 'success',
//                                 subscription_details: JSON.stringify(subscriptionDetails),
//                                 subscription_start_date: new Date(subscriptionDetails.current_start * 1000),
//                                 subscription_end_date: new Date(subscriptionDetails.charge_at * 1000),
//                               };

//                               const update_order_history_query = `
//                                 UPDATE order_history
//                                 SET user_id = ?, payment_status = ?, subscription_details = ?, subscription_start_date = ?, subscription_end_date = ?
//                                 WHERE stripe_subscription_id = ?
//                               `;

//                               const update_values = [
//                                 order_history_data.user_id,
//                                 order_history_data.payment_status,
//                                 order_history_data.subscription_details,
//                                 order_history_data.subscription_start_date,
//                                 order_history_data.subscription_end_date,
//                                 subscriptionId
//                               ];

//                               // Execute the query
//                               try {
//                                 const update_result = await queryAsync(update_order_history_query, update_values);
//                                 console.log(`Order history updated for subscription ID ${subscriptionId}`);
//                               } catch (error) {
//                                 console.error('Failed to update order history:', error);
//                               }


//                             // Insert user meta
//                             const userMetaInsertQuery = 'INSERT INTO user_customer_meta (user_id, review_count, country, state) VALUES (?, ?, ?, ?)';
//                             await queryAsync(userMetaInsertQuery, [userResults.insertId, 0,user_country, user_state]);

//                             // Register user in blog API
//                             const userRegistrationData = {
//                                 username: email,
//                                 email: email,
//                                 password: register_password,
//                                 first_name: first_name,
//                                 last_name: last_name,
//                             };
//                             await axios.post(`${process.env.BLOG_API_ENDPOINT}/register`, userRegistrationData);

//                             // Log user in blog API
//                             const userData = {
//                                 user_id: userResults.insertId,
//                                 first_name: first_name,
//                                 last_name: last_name,
//                                 email: email,
//                                 user_type_id: 2
//                             };
//                             const encodedUserData = JSON.stringify(userData);
//                             res.cookie('user', encodedUserData);

//                             const userLoginData = {
//                                 email: email,
//                                 password: register_password,
//                             };
//                             const loginResponse = await axios.post(`${process.env.BLOG_API_ENDPOINT}/login`, userLoginData);
//                             const wpUserData = loginResponse.data.data;

//                             // Fetch device info
//                             const userAgent = req.headers['user-agent'];
//                             const agent = useragent.parse(userAgent);
//                             const deviceQuery = 'SELECT * FROM user_device_info WHERE user_id = ?';
//                             const deviceQueryResults = await new Promise((resolve, reject) => {
//                                 db.query(deviceQuery, [userResults.insertId], (err, results) => {
//                                     if (err) return reject(err);
//                                     resolve(results);
//                                 });
//                             });

//                             // Insert or update device info
//                             const ipAddress = requestIp.getClientIp(req);
//                             const deviceInfo = `${agent.toAgent()} ${agent.os.toString()}`;
//                             if (deviceQueryResults.length > 0) {
//                                 const deviceUpdateQuery = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
//                                 const values = [deviceInfo, ipAddress, formattedDate, userResults.insertId];
//                                 await new Promise((resolve, reject) => {
//                                     db.query(deviceUpdateQuery, values, (err, results) => {
//                                         if (err) return reject(err);
//                                         resolve(results);
//                                     });
//                                 });
//                             } else {
//                                 const deviceInsertQuery = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
//                                 const values = [userResults.insertId, deviceInfo, '', '', '', '', ipAddress, formattedDate, formattedDate];
//                                 await new Promise((resolve, reject) => {
//                                     db.query(deviceInsertQuery, values, (err, results) => {
//                                         if (err) return reject(err);
//                                         resolve(results);
//                                     });
//                                 });
//                             }

//                             // Respond with success message
//                             return res.status(200).json({ status: 'ok', data: userResults.insertId, message: 'New user created' });
//                         }
//                     });
//                 }
//             });
//         });
//     } catch (error) {
//         console.error('Error:', error);
//         return res.status(500).json({ status: 'err', data: '', message: 'An error occurred while processing your request' });
//     }
// };

// const userRegistrationData = {
//     username: email,
//     email: email,
//     password: register_password,
//     first_name: first_name,
//     last_name: last_name,
// };
// axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData)
//     .then((response) => {
//         //console.log('User registration successful. User ID:', response.data.user_id);

//         //-------User Auto Login --------------//
//         const userAgent = req.headers['user-agent'];
//         const agent = useragent.parse(userAgent);

//         // Set a cookie
//         const userData = {
//             user_id: userResults.insertId,
//             first_name: first_name,
//             last_name: last_name,
//             email: email,
//             user_type_id: 2
//         };
//         const encodedUserData = JSON.stringify(userData);
//         res.cookie('user', encodedUserData);

//         (async () => {
//             //---- Login to Wordpress Blog-----//
//             //let wp_user_data;
//             try {
//                 const userLoginData = {
//                     email: email,
//                     password: register_password,
//                 };
//                 const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
//                 const wp_user_data = response.data.data;



//                 //-- check last Login Info-----//
//                 const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
//                 db.query(device_query, [userResults.insertId], async (err, device_query_results) => {
//                     const currentDate = new Date();
//                     const year = currentDate.getFullYear();
//                     const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//                     const day = String(currentDate.getDate()).padStart(2, '0');
//                     const hours = String(currentDate.getHours()).padStart(2, '0');
//                     const minutes = String(currentDate.getMinutes()).padStart(2, '0');
//                     const seconds = String(currentDate.getSeconds()).padStart(2, '0');
//                     const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

//                     if (device_query_results.length > 0) {
//                         // User exist update info
//                         const device_update_query = 'UPDATE user_device_info SET device_id = ?, IP_address = ?, last_logged_in = ? WHERE user_id = ?';
//                         const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, userResults.insertId];
//                         db.query(device_update_query, values, (err, device_update_query_results) => {
//                         })
//                     } else {
//                         // User doesnot exist Insert New Row.

//                         const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
//                         const values = [userResults.insertId, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];

//                         db.query(device_insert_query, values, (err, device_insert_query_results) => {
//                             const OTPdelQuery = `DELETE FROM signup_otp_veryfy WHERE email = '${email}' `;
//                             db.query(OTPdelQuery, (OTPdelErr, TOPdelRes) => {
//                                 if (OTPdelErr) {
//                                     console.log(OTPdelErr);
//                                     return res.send({
//                                         status: 'not ok',
//                                         message: 'Something went wrong'
//                                     });
//                                 } else {
//                                     console.log('otp deleted')
//                                     return res.send(
//                                         {
//                                             status: 'ok',
//                                             data: userData,
//                                             wp_user: wp_user_data,
//                                             currentUrlPath: req.body.currentUrlPath,
//                                             message: 'Registration successful you are automatically login to your dashboard'
//                                         }
//                                     )
//                                 }

//                             })

//                         })

//                     }
//                 })
//             } catch (error) {
//                 console.error('User login failed. Error:', error);
//                 if (error.response && error.response.data) {
//                     console.log('Error response data:', error.response.data);
//                 }
//             }
//         })();
//     })
//     .catch((error) => {
//         //console.error('User registration failed:', );
//         return res.send(
//             {
//                 status: 'err',
//                 data: '',
//                 message: error.response.data
//             }
//         )
//     });

const fetchPaymentsByInvoiceId = async (invoiceId) => {
    try {
        // Fetch all payments from Razorpay
        const response = await razorpay.payments.all();

        // Extract payments from the response
        const payments = response.items;

        console.log("payments", payments);

        // Filter payments by invoiceId
        const matchingPayments = payments.filter(payment => payment.invoice_id === invoiceId);

        console.log('Payments for invoice:', matchingPayments);
        if (matchingPayments.length > 0) {
            return matchingPayments;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching payments for invoice:', error);
        throw error; // Throw error for higher-level error handling
    }
};

//fetchPaymentsByInvoiceId('inv_OXHIwBbIbje4gl');

// async function findOrCreateCustomer(email, name, phone, address, city, state, zip) {
//     try {
//         console.log("email:", email);
//         const customers = await razorpay.customers.all();
//         console.log("customerslist:", customers);
//         console.log("address", address);
//         console.log("name", name);
//         console.log("city", city);
//         console.log("state", state);
//         console.log("zip", zip);

//         if (customers.items.length > 0) {
//             const foundCustomer = customers.items.find(customer => customer.email === email);
//             if (foundCustomer) {
//                 console.log('Found customer:', foundCustomer);

//                 //const foundCustomerId = "cust_" + foundCustomer.id;
//                 const foundCustomerId = foundCustomer.id;
//                 console.log("Concatenated Customer ID:", foundCustomerId);

//                 let updatedCustomer = await razorpay.customers.edit(foundCustomerId, {
//                     name: name,
//                     email: email,
//                     contact: phone,
//                     // shipping_address: {
//                     //     line1: address,
//                     //     city: city,
//                     //     state: state,
//                     //     //zip: zip,
//                     //     country: 'IN'
//                     // }
//                 });

//                 console.log('Updated customer:', updatedCustomer);

//                 return foundCustomerId;
//             } else {
//                 console.log(`Customer with email ${email} not found.`);
//                 const customer = await razorpay.customers.create({
//                     name: name,
//                     email: email,
//                     //contact: phone,
//                     // shipping_address: {
//                     //     line1: address,
//                     //     city: city,
//                     //     state: state,
//                     //     //zip: zip,
//                     //     country: 'IN'
//                     // }
//                 });
//                 console.log('Created new customer:', customer.id);
//                 return customer.id;
//             }
//         } else {
//             const customer = await razorpay.customers.create({
//                 name: name,
//                 email: email,
//                 contact: phone,
//                 // shipping_address: {
//                 //     line1: address,
//                 //     city: city,
//                 //     state: state,
//                 //     //zip: zip,
//                 //     country: 'IN'
//                 // }
//             });
//             console.log('Created new customer:', customer.id);
//             return customer.id;
//         }
//     } catch (error) {
//         console.error('Error finding or creating customer:', error);
//         throw error;
//     }
// }



const findOrCreateCustomer = async (email, name, phone, address, city, state, zip) => {
    try {
        console.log("email:", email);

        // Step 1: Search for existing customers by email
        const response = await axios.get('https://api.razorpay.com/v1/customers', {
            auth: {
              username: process.env.RAZORPAY_KEY_ID,
              password: process.env.RAZORPAY_KEY_SECRET
            }
        });
      
        // Get the list of customers
        const customers = response.data.items;
        console.log("customers list:", customers);
        console.log("address:", address);
        console.log("name:", name);
        console.log("city:", city);
        console.log("state:", state);
        console.log("zip:", zip);

        const foundCustomer = customers.find(customer => customer.email === email);

        if (foundCustomer) {
            console.log('Found customer:', foundCustomer);
            return foundCustomer.id;
        } else {
            // Step 2: Create a new customer if not found
            console.log(`Customer with email ${email} not found. Creating new customer.`);
            const customer = await axios.post('https://api.razorpay.com/v1/customers', {
                name: name,
                email: email,
                contact: phone,
                shipping_address: {
                    line1: address,
                    city: city,
                    state: state,
                    zip: zip,
                    // country: 'IN'
                }
            }, {
                auth: {
                  username: process.env.RAZORPAY_KEY_ID,
                  password: process.env.RAZORPAY_KEY_SECRET
                }
            });
            console.log('Created new customer:', customer.data.id);
            return customer.data.id;
        }
    } catch (error) {
        // Handle errors
        console.error('Error finding or creating customer:', error);
        throw error;
    }
};




const CreateCustomer = async (email, name, phone, address, city, state, zip) => {
    try {
        console.log("email:", email);
        const customers = await razorpay.customers.all();
        console.log("customerslist:", customers);
        console.log("address", address);
        console.log("name", name);
        console.log("city", city);
        console.log("state", state);
        console.log("zip", zip);

        if (customers.items.length > 0) {
            const foundCustomer = customers.items.find(customer => customer.email === email);
            if (foundCustomer) {
                console.log('Found customerss:', foundCustomer);
                // Return the ID of the found customer
                return foundCustomer.id;
            } else {
                console.log(`Customer with email ${email} not found.`);
                const customer = await razorpay.customers.create({
                    name: name,
                    email: email,
                });
                console.log('Created new customer:', customer.id);
                return customer.id;
            }
        } else {
            const customer = await razorpay.customers.create({
                name: name,
                email: email,
                contact: phone,
            });
            console.log('Created new customer:', customer.id);
            return customer.id;
        }
    } catch (error) {
        console.error('Error finding or creating customer:', error);
        throw error;
    }
}


// const createRazorpayPlan = async (plan, billingCycle, memberCount, country_code) => {
//     try {
//         memberCount = parseInt(memberCount);
//         console.log("memberCount", memberCount);
//         if (isNaN(memberCount) || memberCount < 0) {
//             throw new Error('Invalid memberCount');
//         }

//         console.log("countrycodenumm",country_code);

//         console.log("plan", plan);
//         console.log("memberCount", memberCount);
//         console.log("billingCycle", billingCycle);

//         const basePrice = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
//         if (isNaN(basePrice) || basePrice <= 0) {
//             throw new Error('Invalid base price');
//         }

//         let addonPrice = 0;
//         if (memberCount > 0) {
//             const userAddonPrice = plan.per_user_price;
//             addonPrice = userAddonPrice * memberCount;
//         }

//         const totalPrice = parseFloat(basePrice) + parseFloat(addonPrice);
//         if (isNaN(totalPrice) || totalPrice <= 0) {
//             throw new Error('Invalid total price');
//         }
//         console.log("totalPrice",totalPrice);

//         // const totalPriceInPaise = totalPrice * 100; 
//         //const totalPriceInPaise = totalPrice * 100;
//         let totalPriceInPaise;
//         if (country_code === "IN") {
//             totalPriceInPaise = totalPrice * 100;
//         } else if (country_code === "JP") {
//             totalPriceInPaise = totalPrice * 100 * 1.23; // Convert to paise then apply conversion rate
//         } else {
//             totalPriceInPaise = totalPrice * 100; // Default conversion to paise
//         }

//         console.log("totalPriceInPaise",totalPriceInPaise);

//         // const interval = billingCycle === 'yearly' ? 13 : 1;

//         let period, interval;
//         if (billingCycle === 'yearly') {
//             period = 'monthly';
//             interval = 13; // 13 months
//         } else if (billingCycle === 'monthly') {
//             period = 'monthly';
//             interval = 1; // 1 month
//         } else if (billingCycle === 'daily') {
//             period = 'daily';
//             interval = 7; // 7 days
//         } else {
//             throw new Error('Invalid billing cycle');
//         }

//         const razorpayPlan = await razorpay.plans.create({
//             // period: 'monthly',
//             // interval: interval,
//             period: period,
//             interval: interval,
//             item: {
//                 name: plan.name,
//                 description: plan.description,
//                 amount: totalPriceInPaise,
//                 //amount: totalPrice,
//                 currency: 'INR'
//             }
//         });
//         console.log("razorpayPlan", razorpayPlan);
//         //return razorpayPlan.id;
//         return razorpayPlan;
//     } catch (error) {
//         console.error('Error creating Razorpay plan:', error);
//         throw error;
//     }
// };

const createRazorpayPlan = async (plan, billingCycle, memberCount, country_code) => {
    try {
        memberCount = parseInt(memberCount);
        console.log("memberCount", memberCount);
        if (isNaN(memberCount) || memberCount < 0) {
            throw new Error('Invalid memberCount');
        }

        console.log("country_code", country_code);
        console.log("plan", plan);
        console.log("billingCycle", billingCycle);

        const basePrice = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
        if (isNaN(basePrice) || basePrice <= 0) {
            throw new Error('Invalid base price');
        }

        let addonPrice = 0;
        if (memberCount > 0) {
            const userAddonPrice = plan.per_user_price;
            addonPrice = userAddonPrice * memberCount;
        }

        const getcurencyquery = `SELECT * FROM currency_conversion`;
        const getcurrencyval = await queryAsync(getcurencyquery);
        console.log("getcurrencyval", getcurrencyval);

        var indian_currency = getcurrencyval[0].inr_currency;
        console.log("indian_currency", indian_currency);
        var jp_currency = getcurrencyval[0].jpy_currency;
        console.log("jp_currency", jp_currency);

        if (getcurrencyval.length > 0) {
            if (country_code == "IN") {
                var toalbasePrice = basePrice * indian_currency;
                var totaladdonPrice = addonPrice * indian_currency
                var totalPrice = parseFloat(toalbasePrice) + parseFloat(totaladdonPrice);
                if (isNaN(totalPrice) || totalPrice <= 0) {
                    throw new Error('Invalid total price');
                }
                console.log("totalPrice", totalPrice);
            } else if (country_code == "JP") {
                var toalbasePrice = basePrice * jp_currency;
                var totaladdonPrice = addonPrice * jp_currency;
                const totalPrice = parseFloat(basePrice) + parseFloat(addonPrice);
                if (isNaN(totalPrice) || totalPrice <= 0) {
                    throw new Error('Invalid total price');
                }
                console.log("totalPrice", totalPrice);
            }else{
                var totalPrice = parseFloat(basePrice) + parseFloat(addonPrice);
                if (isNaN(totalPrice) || totalPrice <= 0) {
                    throw new Error('Invalid total price');
                }
                console.log("totalPrice", totalPrice);
            }
        }


        let totalPriceInPaise;
        if (country_code == "IN") {
            totalPriceInPaise = totalPrice * 100;
        } else if (country_code === "JP") {
            const conversionRate = 1.23;
            console.log("jpppp");
            //totalPriceInPaise = totalPrice * 100 * conversionRate;
            totalPriceInPaise = totalPrice * 100 ;
            console.log("totalPriceInPaisedf",totalPriceInPaise);
        } else {
            totalPriceInPaise = totalPrice * 100;
        }
        console.log("totalPriceInPaise", totalPriceInPaise);

        let period, interval;
        if (billingCycle === 'yearly') {
            period = 'monthly';
            interval = 13; // 13 months
        } else if (billingCycle === 'monthly') {
            period = 'monthly';
            interval = 1; // 1 month
        } else if (billingCycle === 'daily') {
            period = 'daily';
            interval = 7; // 7 days
        } else {
            throw new Error('Invalid billing cycle');
        }
        console.log("period", period);
        console.log("interval", interval);
        console.log("plan.name", plan.name);
        console.log("plan.description", plan.description);

        const razorpayPlan = await razorpay.plans.create({
            period: period,
            interval: interval,
            item: {
                name: plan.name,
                description: plan.description,
                amount: totalPriceInPaise,
                //amount: totalPrice,
                currency: 'INR'
            }
        });
        console.log("razorpayPlan", razorpayPlan);
        return razorpayPlan;
    } catch (error) {
        console.error('Error creating Razorpay plan:', error);
        throw error;
    }
};

const createRazorpayPlanprevioususer = async (plan, billingCycle, memberCount, country_code) => {
    try {
        memberCount = parseInt(memberCount);
        console.log("memberCount", memberCount);
        if (isNaN(memberCount) || memberCount < 0) {
            throw new Error('Invalid memberCount');
        }

        console.log("country_code", country_code);
        console.log("plan", plan);
        console.log("billingCycle", billingCycle);

        const basePrice = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
        if (isNaN(basePrice) || basePrice <= 0) {
            throw new Error('Invalid base price');
        }

        let addonPrice = 0;
        if (memberCount > 0) {
            const userAddonPrice = plan.per_user_price;
            addonPrice = userAddonPrice * memberCount;
        }

        const getcurencyquery = `SELECT * FROM currency_conversion`;
        const getcurrencyval = await queryAsync(getcurencyquery);
        console.log("getcurrencyval", getcurrencyval);

        var indian_currency = getcurrencyval[0].inr_currency;
        console.log("indian_currency", indian_currency);
        var jp_currency = getcurrencyval[0].jpy_currency;
        console.log("jp_currency", jp_currency);

        if (getcurrencyval.length > 0) {
            if (country_code == "IN") {
                var toalbasePrice = basePrice * indian_currency;
                var totaladdonPrice = addonPrice * indian_currency
                var totalPrice = parseFloat(toalbasePrice) + parseFloat(totaladdonPrice);
                if (isNaN(totalPrice) || totalPrice <= 0) {
                    throw new Error('Invalid total price');
                }
                console.log("totalPrice", totalPrice);
            } else if (country_code == "JP") {
                var toalbasePrice = basePrice * jp_currency;
                var totaladdonPrice = addonPrice * jp_currency;
                const totalPrice = parseFloat(toalbasePrice) + parseFloat(totaladdonPrice);
                if (isNaN(totalPrice) || totalPrice <= 0) {
                    throw new Error('Invalid total price');
                }
                console.log("totalPrice", totalPrice);
            }else{


                var totalPrice = parseFloat(basePrice) + parseFloat(addonPrice);
                if (isNaN(totalPrice) || totalPrice <= 0) {
                    throw new Error('Invalid total price');
                }
                console.log("totalPrice", totalPrice);
            }
        }


        let totalPriceInPaise;
        // if (country_code == "IN") {
        //     totalPriceInPaise = totalPrice * 100;
        // } 
        // else if (country_code == "JP") {
        //     const conversionRate = 1.23;
        //     console.log("jpppp");
        //     //totalPriceInPaise = totalPrice * 100 * conversionRate;
        //     totalPriceInPaise = totalPrice * 100 ;
        //     console.log("totalPriceInPaisedf",totalPriceInPaise);
        // }
        //  else {
        //     totalPriceInPaise = totalPrice * 100;
        // }
        totalPriceInPaise = totalPrice * 100;
        console.log("totalPriceInPaise", totalPriceInPaise);

        let period, interval;
        if (billingCycle === 'yearly') {
            period = 'monthly';
            interval = 13; // 13 months
        } else if (billingCycle === 'monthly') {
            period = 'monthly';
            interval = 1; // 1 month
        } else if (billingCycle === 'daily') {
            period = 'daily';
            interval = 7; // 7 days
        } else {
            throw new Error('Invalid billing cycle');
        }
        console.log("period", period);
        console.log("interval", interval);
        console.log("plan.name", plan.name);
        console.log("plan.description", plan.description);

        const razorpayPlan = await razorpay.plans.create({
            period: period,
            interval: interval,
            item: {
                name: plan.name,
                description: plan.description,
                amount: totalPriceInPaise,
                //amount: totalPrice,
                currency: 'INR'
            }
        });
        console.log("razorpayPlan", razorpayPlan);
        return razorpayPlan;
    } catch (error) {
        console.error('Error creating Razorpay plan:', error);
        throw error;
    }
};

// const fetchActiveSubscriptionsFromStripe = async () => {
//     const subscriptions = [];
//     let hasMore = true;
//     let startingAfter = null;

//     while (hasMore) {
//         const response = await stripe.subscriptions.list({
//             status: 'active',
//             limit: 100,
//             ...(startingAfter && { starting_after: startingAfter })
//         });

//         subscriptions.push(...response.data);
//         hasMore = response.has_more;
//         if (hasMore) {
//             startingAfter = response.data[response.data.length - 1].id;
//         }
//     }

//     return subscriptions;
// };

// const fetchSubscriptionsFromDatabase = async () => {
//     const query1 = `SELECT 
//     stripe_subscription_id, 
//     subscription_start_date, 
//     subscription_end_date, 
//     UNIX_TIMESTAMP(subscription_start_date) AS subscription_start_timestamp, 
//     UNIX_TIMESTAMP(subscription_end_date) AS subscription_end_timestamp 
// FROM 
//     order_history;
// `;
//     const results = await queryAsync(query1);
//     return results;
// };

// const insertOrUpdateOrderHistory = async (subscription, customerId) => {
//     try {

//         console.log("subscriptionId", subscription.id);
//         //console.log("customerId",customerId);

//         const subscriptions = await stripe.subscriptions.retrieve(subscription.id);

//         const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);

//         let payment_status = invoice.status === 'paid' ? 'succeeded' : 'failed';

//         const getSubQuery = `SELECT * FROM order_history WHERE stripe_subscription_id = "${subscriptions.id}"`;
//         const subqueryval = await queryAsync(getSubQuery);

//         let customerid;
//         let planid = subscription.plan.id;

//         if (subqueryval.length > 0) {
//             customerid = subqueryval[0].user_id;
//             planid = subqueryval[0].plan_id;

//             console.log("customerid", customerid);
//             console.log("planid", planid);
//         }

//         const orderHistoryData = {
//             user_id: customerid,
//             stripe_subscription_id: subscriptions.id,
//             plan_id: planid,
//             payment_status: payment_status,
//             subscription_details: JSON.stringify(subscription),
//             payment_details: JSON.stringify(invoice),
//             subscription_start_date: new Date(subscription.current_period_start * 1000),
//             subscription_end_date: new Date(subscription.current_period_end * 1000),
//             subscription_duration: subscription.plan.interval
//         };

//         const orderHistoryQuery = `INSERT INTO order_history SET ? ON DUPLICATE KEY UPDATE ?`;
//         await queryAsync(orderHistoryQuery, [orderHistoryData, orderHistoryData]);

//     } catch (error) {
//         console.error('Error inserting or updating order history:', error);
//     }
// };


// const updateOrderHistory = async () => {
//     try {
//         const stripeSubscriptions = await fetchActiveSubscriptionsFromStripe();
//         const dbSubscriptions = await fetchSubscriptionsFromDatabase();

//         const dbSubscriptionsMap = new Map();
//         dbSubscriptions.forEach(sub => {
//             const startDate = new Date(sub.subscription_start_date);
//             const endDate = new Date(sub.subscription_end_date);
//             dbSubscriptionsMap.set(sub.stripe_subscription_id, {
//                 subscription_start_date: startDate,
//                 subscription_end_date: endDate
//             });
//         });

//         for (let subscription of stripeSubscriptions) {
//             const subscriptionId = subscription.id;
//             const customerId = subscription.customer;
//             const currentStartDate = new Date(subscription.current_period_start * 1000);
//             const currentEndDate = new Date(subscription.current_period_end * 1000);

//             if (dbSubscriptionsMap.has(subscriptionId)) {
//                 const dbSubscriptionDates = dbSubscriptionsMap.get(subscriptionId);
//                 const dbStartDate = dbSubscriptionDates.subscription_start_date;
//                 const dbEndDate = dbSubscriptionDates.subscription_end_date;

//                 // console.log("dbStartDate",dbStartDate);
//                 // console.log("dbEndDate",dbEndDate);
//                 // console.log("currentStartDate",currentStartDate);
//                 // console.log("currentEndDate",currentEndDate);

//                 if (!dbStartDate || !dbEndDate || dbStartDate.getTime() !== currentStartDate.getTime() || dbEndDate.getTime() !== currentEndDate.getTime()) {
//                     // Update the order history with the new dates
//                     await insertOrUpdateOrderHistory(subscription, customerId);
//                 }
//             } else {
//                 // New subscription, insert it into the order history
//                 await insertOrUpdateOrderHistory(subscription, customerId);
//             }
//         }

//         console.log('Order history update completed.');
//     } catch (error) {
//         console.error('Error updating order history:', error);
//     }
// };



async function fetchActiveSubscriptions() {
    try {
        const auth = {
            // username: "rzp_test_ivrp5LlA1gQXAT",
            // password: "iLxMcGESxvq5ZHGk8DJUqrpj"
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET
        };
        const response = await axios.get('https://api.razorpay.com/v1/subscriptions?status=active', { auth });
        console.log('Active Subscriptions:', response.data.items);
        return response.data.items;
    } catch (error) {
        console.error('Error fetching active subscriptions:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function fetchSubscriptionsFromDB() {
    try {
        const query = 'SELECT stripe_subscription_id, subscription_start_date, subscription_end_date FROM order_history';
        const subscriptionsData = await queryAsync(query);
        console.log("subscriptionsData", subscriptionsData);
        return subscriptionsData;
    } catch (error) {
        console.error('Error fetching subscriptions from database:', error);
        throw error;
    }
}
async function insertIntoOrderHistory(subscription) {
    try {
        const insertQuery = `INSERT INTO order_history (stripe_subscription_id, subscription_start_date, subscription_end_date) VALUES (?, ?, ?)`;
        const values = [
            subscription.id,
            new Date(subscription.start_at * 1000),
            new Date(subscription.charge_at * 1000)
        ];

        if (subscription.start_at !== subscription.charge_at) {
            await queryAsync(insertQuery, values);
            console.log(`Subscription ${subscription.id} inserted into order history.`);
        } else {
            console.log(`Subscription ${subscription.id} has identical start_at and charge_at. Not inserting.`);
        }
    } catch (error) {
        console.error(`Error inserting subscription ${subscription.id} into order history:`, error);
        throw error;
    }
}


async function syncSubscriptions() {
    try {
        const activeSubscriptions = await fetchActiveSubscriptions();
        const dbSubscriptions = await fetchSubscriptionsFromDB();

        for (const subscription of activeSubscriptions) {
            const existingSubscription = dbSubscriptions.find(dbSub => dbSub.stripe_subscription_id == subscription.id);

            if (existingSubscription) {
                const existingStart = new Date(existingSubscription.subscription_start_date).getTime();
                const existingEnd = new Date(existingSubscription.subscription_end_date).getTime();
                const razorpayStart = new Date(subscription.start_at * 1000).getTime();
                const razorpayEnd = new Date(subscription.charge_at * 1000).getTime();

                const startAtChanged = existingStart != razorpayStart;
                const chargeAtChanged = existingEnd != razorpayEnd;

                if (startAtChanged || chargeAtChanged) {
                    await insertIntoOrderHistory(subscription);
                    console.log(`Subscription ${subscription.id} updated in order history.`);
                } else {
                    console.log(`Subscription ${subscription.id} exists in database with the same start_at and charge_at. Skipping.`);
                }
            } else {
                console.log("No existingSubscription found in database.");
                //await insertIntoOrderHistory(subscription);
                //console.log(`Subscription ${subscription.id} inserted into order history.`);
            }
        }

        console.log('Subscription sync completed.');
    } catch (error) {
        console.error('Error syncing subscriptions:', error);
    }
}

// syncSubscriptions().then(() => {
//     console.log('Subscription sync completed.');
// }).catch((error) => {
//     console.error('Subscription sync failed:', error);
// });


exports.createSubscriptionCheckoutSession = async (req, res) => {
    try {
        const { subscriptionId } = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            subscription_data: {
                items: [{ plan: subscriptionId }],
            },
            success_url: 'https://your-domain.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://your-domain.com/cancel',
        });

        res.send({ id: session.id });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

exports.createSession = async (req, res) => {
    // anoth 
    // app.post('/create-checkout-session', async (req, res) => {
    const { planId } = req.body;

    const domainURL = 'http://localhost:3000';

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: planId,
                    quantity: 1,
                },
            ],
            success_url: `${domainURL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domainURL}/cancel`,
        });

        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


exports.getLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        var apiKey = process.env.GEO_LOCATION_API_KEY;
        console.log("apiKey", apiKey);

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        async function getCountryDetails(latitude, longitude) {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                const results = data.results;
                if (results.length > 0) {
                    const addressComponents = results[0].address_components;
                    for (let i = 0; i < addressComponents.length; i++) {
                        if (addressComponents[i].types.includes("country")) {
                            const countryName = addressComponents[i].long_name;
                            const countryCode = addressComponents[i].short_name;
                            return { countryName, countryCode };
                        }
                    }
                }
                return { countryName: 'India', countryCode: 'IN' };
            } catch (error) {
                console.error('Error fetching country details:', error);
                return { countryName: 'India', countryCode: 'IN' };
            }
        }

        const countryDetails = await getCountryDetails(latitude, longitude);
        res.status(200).json(countryDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// const syncPlansWithStripe = async () => {
//     const plans = await getPlanFromDatabase();
//     for (const plan of plans) {
//         await createStripeProductAndPrice(plan);
//     }
// };

// syncPlansWithStripe();




// Express route to retrieve likes for a comment
// router.get('/get-likes', (req, res) => {
//     const comment_id = req.query.comment_id;

//     // Retrieve likes for the given comment_id
//     const selectQuery = 'SELECT user_id FROM your_likes_table WHERE comment_id = ?';
//     db.query(selectQuery, [comment_id], (selectError, selectResults) => {
//         if (selectError) {
//             console.error('Error retrieving likes:', selectError);
//             return res.status(500).json({ error: 'Internal Server Error' });
//         }

//         // Successfully retrieved likes
//         const likes = selectResults.map(result => result.user_id);
//         return res.status(200).json({ likes });
//     });
// });


// Schedule mail for pending complaint
cron.schedule('0 10 * * *', async () => {
    //console.log('running a task every minute');
    const sql = `SELECT complaint.* ,u.email , clm.emails, clm.eta_days, cc.category_name, subcat.category_name AS sub_category_name
    FROM complaint 
    LEFT JOIN  complaint_level_management clm ON complaint.level_id = clm.level AND  complaint.company_id = clm.company_id
    LEFT JOIN complaint_category cc ON complaint.category_id = cc.id 
    LEFT JOIN complaint_category subcat ON complaint.sub_cat_id = subcat.id 
    LEFT JOIN company_claim_request ccr ON ccr.company_id = complaint.company_id 
    LEFT JOIN users u ON u.user_id = ccr.claimed_by
    WHERE complaint.status != '1' `
    const results = await query(sql);
    //console.log(results);
    if (results.length > 0) {
        results.forEach(async (result) => {
            let emailArr = [];
            if (result.emails) {
                emailArr = JSON.parse(result.emails);
            }

            await comFunction2.complaintScheduleEmail(emailArr, result);

            // emailArr.forEach(async (email)=>{
            //     await comFunction2.complaintScheduleEmail(email,result);
            // })
        })
    }
});

//Discussion customer query alert
cron.schedule('0 5 * * *', async () => {
    await comFunction2.duscussionQueryAlert();
    await comFunction2.complaintLevelUpdate();
})

cron.schedule('0 0 * * *', async () => {
    try {
        await syncSubscriptions();
        console.log('Subscription sync job completed successfully.');
    } catch (error) {
        console.error('Error syncing subscriptions:', error);
    }
});
