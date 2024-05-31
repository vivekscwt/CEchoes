const util = require('util');
const express = require('express');
const db = require('../config');
const mysql = require('mysql2/promise');
const mdlconfig = require('../config-module');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const useragent = require('useragent');
const requestIp = require('request-ip');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const query = util.promisify(db.query).bind(db);
const cookieParser = require('cookie-parser');
const secretKey = 'grahak-secret-key';
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const invalidTokens = new Set();
const otpValidityMinutes = 5;
const cron = require('node-cron');
const randomstring = require('randomstring');
const slugify = require('slugify');

const app = express();

const comFunction = require('../common_function_api');
const comFunction2 = require('../common_function2');;
const axios = require('axios');
//const cookieParser = require('cookie-parser');
app.use(cookieParser());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // const originalname = file.originalname;
    // const sanitizedFilename = originalname.replace(/[^a-zA-Z0-9\-\_\.]/g, ''); // Remove symbols and spaces
    // const filename = Date.now() + '-' + sanitizedFilename;
    // cb(null, filename);
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // cb(null, file.fieldname + '-' + uniqueSuffix);
    cb(null, file.originalname);
  }
});

// Create multer instance
const upload = multer({ storage: storage });

//registration
exports.register = (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone,
    password,
    register_from,
    external_registration_id,
    confirm_password,
    toc,
  } = req.body;
  console.log(req.body)
  db.query('SELECT email FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      return res.send({
        status: 'err',
        data: '',
        message: 'An error occurred while processing your request' + err,
      });
    }
    if (results.length > 0) {
      return res.send({
        status: 'err',
        data: {
          first_name: first_name,
          last_name: last_name,
          email: email,
        },
        message: 'Email ID already exists',
      });
    }

    let hasPassword = await bcrypt.hash(password, 8);
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

    const userInsertData = {
      first_name: first_name,
      last_name: last_name,
      email: email,
      phone: phone,
      password: hasPassword,
      user_registered: formattedDate,
      user_status: 1,
      user_type_id: 2,
    };

    if (register_from) {
      userInsertData.register_from = register_from;
    }
    if (external_registration_id) {
      userInsertData.external_registration_id = external_registration_id;
    }

    db.query('INSERT INTO users SET ?', userInsertData, async (err, results) => {
      if (err) {
        return res.send({
          status: 'err',
          data: '',
          message: 'An error occurred while processing your request' + err,
        });
      }

      const user_id = results.insertId;
      console.log(user_id)
      const profilePicFile = req.file;
      console.log(profilePicFile)
      if (profilePicFile) {
        db.query('UPDATE user_customer_meta SET profile_pic = ? WHERE user_id = ?', [profilePicFile.filename, user_id], (err, updateResults) => {
          if (err) {
            console.error('Error updating profile picture:', err);
          }
        });
      }

      const userCustomerMetaInsertData = {
        user_id: user_id,
        address: req.body.address || null,
        country: req.body.country || null,
        state: req.body.state || null,
        city: req.body.city || null,
        zip: req.body.zip || null,
        review_count: 0,
        date_of_birth: req.body.date_of_birth || null,
        occupation: req.body.occupation || null,
        gender: req.body.gender || null,
        alternate_phone: req.body.alternate_phone || null,
        marital_status: req.body.marital_status || null,
        about: req.body.about || null,
        profile_pic: profilePicFile ? profilePicFile.filename : '',
      };

      console.log(userCustomerMetaInsertData)
      db.query('INSERT INTO user_customer_meta SET ?', userCustomerMetaInsertData, (err, results) => {
        if (err) {
          console.error('Error inserting into user_customer_meta:', err);
          return res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request',
            err,
          });
        }

        const wpUserRegistrationData = {
          username: req.body.email,
          email: req.body.email,
          password: req.body.password,
          first_name: req.body.first_name,
          last_name: req.body.last_name,
        };
        axios.post(process.env.BLOG_API_ENDPOINT + '/register', wpUserRegistrationData)
          .then((response) => {
            (async () => {
              //---- Login to Wordpress Blog-----//
              //let wp_user_data;
              try {
                if (response.data.user_id) {
                  return res.json({
                    status: 'success',
                    data: {
                      user_id: user_id,
                      first_name: first_name,
                      last_name: last_name,
                      email: email,
                      phone: phone,
                      user_registered: formattedDate,
                      user_type_id: 2,
                      wp_blog_user_id: response.data.user_id
                    },
                    message: 'User registered',
                  });
                } else {
                  return res.send(
                    {
                      status: 'err',
                      data: '',
                      message: 'Successfully registerd in node but not in wordpress site'
                    }
                  )
                }
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
                message: 'Wordpress register issue: ' + error.response.data
              }
            )
          });
      });
    });
  });
};


exports.login = (req, res) => {
  console.log(req.body);
  const userAgent = req.headers['user-agent'];
  const agent = useragent.parse(userAgent);
  const payload = {};
  // res.json(deviceInfo);

  const { email, password, device_id, device_token, imei_no, model_name, make_name } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while processing your request ' + err,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }
    const user = results[0];
    payload.user_id = user.user_id;
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if ( user.register_from=='google' || user.register_from=='facebook' ) {
      return res.status(401).json({
        status: 'error',
        message: 'We noticed that you have sign up using your '+user.register_from+' account. Please log in through your '+user.register_from+' account.',
      });
    }

    if (!isPasswordMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
    }

    if (user.user_status != 1) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is inactive, please contact with administrator.',
      });
    }

    if (user.user_type_id != 2) {
      return res.status(401).json({
        status: 'error',
        message: 'Do you want to login as administrator, then please from proper route.',
      });
    }

    const token = jwt.sign(payload, secretKey, {
      expiresIn: '24h',
    });



    const clientIp = requestIp.getClientIp(req);
    const userAgent = useragent.parse(req.headers['user-agent']);

    db.query('SELECT * FROM user_customer_meta WHERE user_id = ?', [user.user_id], (metaErr, metaResults) => {
      if (metaErr) {
        console.error("An error occurred:", metaErr);
        return res.status(500).json({
          status: 'error',
          message: 'An error occurred while processing your request ' + metaErr,
          error: metaErr
        })
      }

      const meta = metaResults[0];

      //--Fetch WP user Data-------//
      db.query('SELECT * FROM bg_users WHERE user_login = ?', [email], (wpuserErr, wpuserResults) => {
        if (wpuserErr) {
          console.error("An error occurred:", metaErr);
          return res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request',
            error: metaErr
          })
        }

        delete user.password;
        //-- check last Login Info-----//
        const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
        db.query(device_query, [user.user_id], async (err, device_query_results) => {
          const currentDate = new Date();
          const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

          if (device_query_results.length > 0) {
            // User exist update info
            const userDeviceMetaUpdateData = {
              device_id: req.body.device_id || null,
              device_token: req.body.device_token || null,
              imei_no: req.body.imei_no || null,
              model_name: req.body.model_name || null,
              make_name: req.body.make_name || null,
              last_logged_in: formattedDate,
            };
            const device_update_query = `UPDATE user_device_info SET ? WHERE user_id = ?`;
            db.query(device_update_query, [userDeviceMetaUpdateData, user.user_id], (err, device_update_query_results) => {
              if (err) {
                return res.json({
                  status: 'error',
                  data: {
                    user,
                    meta,
                    wp_user: wpuserResults[0].ID,
                    token: token,
                  },
                  message: err,
                  client_ip: clientIp,
                  user_agent: userAgent.toString(),
                });
              } else {
                return res.json({
                  status: 'success',
                  data: {
                    user,
                    meta,
                    wp_user: wpuserResults[0].ID,
                    token: token,
                  },
                  message: 'Login successful',
                  client_ip: clientIp,
                  user_agent: userAgent.toString(),
                });
              }
            })

          } else {
            // User doesnot exist Insert New Row.

            const userDeviceMetaInsertData = {
              user_id: user.user_id,
              device_id: req.body.device_id || null,
              device_token: req.body.device_token || null,
              imei_no: req.body.imei_no || null,
              model_name: req.body.model_name || null,
              make_name: req.body.make_name || null,
              last_logged_in: formattedDate,
              created_date: formattedDate
            };

            db.query('INSERT INTO user_device_info SET ?', userDeviceMetaInsertData, async (err, results) => {
              if (err) {
                return res.json({
                  status: 'error',
                  data: {
                    user,
                    meta,
                    wp_user: wpuserResults[0].ID,
                    token: token,
                  },
                  message: err,
                  client_ip: clientIp,
                  user_agent: userAgent.toString(),
                });
              } else {
                return res.json({
                  status: 'success',
                  data: {
                    user,
                    meta,
                    wp_user: wpuserResults[0].ID,
                    token: token,
                  },
                  message: 'Login successful',
                  client_ip: clientIp,
                  user_agent: userAgent.toString(),
                });
              }
            })

          }
        })

      });
    });
  })
}

exports.socialLogin = async (req, res) => {
  //console.log(req.body);
  const userAgent = req.headers['user-agent'];
  const agent = useragent.parse(userAgent);
  const payload = {};

  const userFirstName = req.body.first_name;
  const userLastName = req.body.last_name;
  const userEmail = req.body.email;
  const userPicture = req.body.profile_pic;
  const external_registration_id = req.body.external_registration_id;
  const register_from = req.body.register_from;

  try {
    const user_exist_query = 'SELECT * FROM users WHERE email = ?';
    const user_exist_values = [userEmail];
    const user_exist_results = await query(user_exist_query, user_exist_values);
    //console.log('register_from', user_exist_results[0].register_from);
    if (user_exist_results.length > 0) {

      if (user_exist_results[0].user_status != 1) {
        return res.status(403).json({
          status: 'error',
          message: 'your account is inactive, please contact with administrator.',
        });
      }

      //--If user login from FB and Google
      if (user_exist_results[0].register_from == 'facebook' || user_exist_results[0].register_from == 'google') {
        //User Exist get User Details
        const user = user_exist_results[0];
        payload.user_id = user.user_id;

        const token = jwt.sign(payload, secretKey, {
          expiresIn: '24h',
        });

        const clientIp = requestIp.getClientIp(req);
        const userAgent = useragent.parse(req.headers['user-agent']);
        db.query('SELECT * FROM user_customer_meta WHERE user_id = ?', [user.user_id], (metaErr, metaResults) => {
          if (metaErr) {
            console.error("An error occurred:", metaErr);
            return res.status(500).json({
              status: 'error',
              message: 'An error occurred while processing your request ' + metaErr,
              error: metaErr
            })
          }

          const meta = metaResults[0];

          //--Fetch WP user Data-------//
          const { email, device_id, device_token, imei_no, model_name, make_name } = req.body;
          db.query('SELECT * FROM bg_users WHERE user_login = ?', [email], (wpuserErr, wpuserResults) => {
            if (wpuserErr) {
              console.error("An error occurred:", metaErr);
              return res.status(500).json({
                status: 'error',
                message: 'An error occurred while processing your request',
                error: metaErr
              })
            }

            delete user.password;
            //-- check last Login Info-----//
            const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
            db.query(device_query, [user.user_id], async (err, device_query_results) => {
              const currentDate = new Date();
              const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

              if (device_query_results.length > 0) {
                // User exist update info
                const userDeviceMetaUpdateData = {
                  device_id: req.body.device_id || null,
                  device_token: req.body.device_token || null,
                  imei_no: req.body.imei_no || null,
                  model_name: req.body.model_name || null,
                  make_name: req.body.make_name || null,
                  last_logged_in: formattedDate,
                };
                const device_update_query = `UPDATE user_device_info SET ? WHERE user_id = ?`;
                db.query(device_update_query, [userDeviceMetaUpdateData, user.user_id], (err, device_update_query_results) => {
                  if (err) {
                    return res.json({
                      status: 'error',
                      data: {
                        user,
                        meta,
                        wp_user: wpuserResults[0].ID,
                        token: token,
                      },
                      message: err,
                      client_ip: clientIp,
                      user_agent: userAgent.toString(),
                    });
                  } else {
                    return res.json({
                      status: 'success',
                      data: {
                        user,
                        meta,
                        wp_user: wpuserResults[0].ID,
                        token: token,
                      },
                      message: 'Login successful',
                      client_ip: clientIp,
                      user_agent: userAgent.toString(),
                    });
                  }
                })

              } else {
                // User doesnot exist Insert New Row.

                const userDeviceMetaInsertData = {
                  user_id: user.user_id,
                  device_id: req.body.device_id || null,
                  device_token: req.body.device_token || null,
                  imei_no: req.body.imei_no || null,
                  model_name: req.body.model_name || null,
                  make_name: req.body.make_name || null,
                  last_logged_in: formattedDate,
                  created_date: formattedDate
                };

                db.query('INSERT INTO user_device_info SET ?', userDeviceMetaInsertData, async (err, results) => {
                  if (err) {
                    return res.json({
                      status: 'error',
                      data: {
                        user,
                        meta,
                        wp_user: wpuserResults[0].ID,
                        token: token,
                      },
                      message: err,
                      client_ip: clientIp,
                      user_agent: userAgent.toString(),
                    });
                  } else {
                    return res.json({
                      status: 'success',
                      data: {
                        user,
                        meta,
                        wp_user: wpuserResults[0].ID,
                        token: token,
                      },
                      message: 'Login successful',
                      client_ip: clientIp,
                      user_agent: userAgent.toString(),
                    });
                  }
                })

              }
            })

          });
        });
      } else {
        //User Exist but already Registered from Web
        return res.status(500).json({
          status: 'error',
          message: 'You are already registered with this email, please login with your email and password',
          error: ''
        })
      }


    } else {
      //User doesnot exist Create New User
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
      let hasPassword = await bcrypt.hash(userEmail, 8);

      const user_insert_query = 'INSERT INTO users (first_name, last_name, email, password, register_from, external_registration_id, user_registered, user_status, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const user_insert_values = [userFirstName, userLastName, userEmail, hasPassword, register_from, external_registration_id, formattedDate, 1, 2];
      try {
        const user_insert_results = await query(user_insert_query, user_insert_values);
        if (user_insert_results.insertId) {
          const newuserID = user_insert_results.insertId;
          const user_meta_insert_query = 'INSERT INTO user_customer_meta (user_id, review_count, profile_pic) VALUES (?, ?, ?)';
          const user_meta_insert_values = [newuserID, 0, userPicture];
          try {
            const user_meta_insert_results = await query(user_meta_insert_query, user_meta_insert_values);
            //**Send Welcome Email to User**/
            var mailOptions = {
              from: process.env.MAIL_USER,
              //to: 'pranab@scwebtech.com',
              to: userEmail,
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
            //console.log(process.env.BLOG_API_ENDPOINT);
            const wpUserRegistrationData = {
              username: userEmail,
              email: userEmail,
              password: userEmail,
              first_name: userFirstName,
              last_name: userLastName,
            };
            axios.post(process.env.BLOG_API_ENDPOINT + '/register', wpUserRegistrationData)
              .then((response) => {
                (async () => {
                  //---- Login to Wordpress Blog-----//
                  //let wp_user_data;
                  try {
                    if (response.data.user_id) {
                      //After Register -- User Login Code

                      try {
                        const user_exist_query = 'SELECT * FROM users WHERE email = ?';
                        const user_exist_values = [userEmail];
                        const user_exist_results = await query(user_exist_query, user_exist_values);
                        if (user_exist_results.length > 0) {

                          //--If user login from FB and Google
                          if (req.body.register_from == 'facebook' || req.body.register_from == 'google') {
                            //User Exist get User Details
                            const user = user_exist_results[0];
                            payload.user_id = user.user_id;

                            const token = jwt.sign(payload, secretKey, {
                              expiresIn: '24h',
                            });

                            const clientIp = requestIp.getClientIp(req);
                            const userAgent = useragent.parse(req.headers['user-agent']);
                            db.query('SELECT * FROM user_customer_meta WHERE user_id = ?', [user.user_id], (metaErr, metaResults) => {
                              if (metaErr) {
                                console.error("An error occurred:", metaErr);
                                return res.status(500).json({
                                  status: 'error',
                                  message: 'An error occurred while processing your request ' + metaErr,
                                  error: metaErr
                                })
                              }

                              const meta = metaResults[0];

                              //--Fetch WP user Data-------//
                              const { email, device_id, device_token, imei_no, model_name, make_name } = req.body;
                              db.query('SELECT * FROM bg_users WHERE user_login = ?', [email], (wpuserErr, wpuserResults) => {
                                if (wpuserErr) {
                                  console.error("An error occurred:", metaErr);
                                  return res.status(500).json({
                                    status: 'error',
                                    message: 'An error occurred while processing your request',
                                    error: metaErr
                                  })
                                }

                                delete user.password;
                                //-- check last Login Info-----//
                                const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
                                db.query(device_query, [user.user_id], async (err, device_query_results) => {
                                  const currentDate = new Date();
                                  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

                                  if (device_query_results.length > 0) {
                                    // User exist update info
                                    const userDeviceMetaUpdateData = {
                                      device_id: req.body.device_id || null,
                                      device_token: req.body.device_token || null,
                                      imei_no: req.body.imei_no || null,
                                      model_name: req.body.model_name || null,
                                      make_name: req.body.make_name || null,
                                      last_logged_in: formattedDate,
                                    };
                                    const device_update_query = `UPDATE user_device_info SET ? WHERE user_id = ?`;
                                    db.query(device_update_query, [userDeviceMetaUpdateData, user.user_id], (err, device_update_query_results) => {
                                      if (err) {
                                        return res.json({
                                          status: 'error',
                                          data: {
                                            user,
                                            meta,
                                            wp_user: wpuserResults[0].ID,
                                            token: token,
                                          },
                                          message: err,
                                          client_ip: clientIp,
                                          user_agent: userAgent.toString(),
                                        });
                                      } else {
                                        return res.json({
                                          status: 'success',
                                          data: {
                                            user,
                                            meta,
                                            wp_user: wpuserResults[0].ID,
                                            token: token,
                                          },
                                          message: 'Login successful',
                                          client_ip: clientIp,
                                          user_agent: userAgent.toString(),
                                        });
                                      }
                                    })

                                  } else {
                                    // User doesnot exist Insert New Row.

                                    const userDeviceMetaInsertData = {
                                      user_id: user.user_id,
                                      device_id: req.body.device_id || null,
                                      device_token: req.body.device_token || null,
                                      imei_no: req.body.imei_no || null,
                                      model_name: req.body.model_name || null,
                                      make_name: req.body.make_name || null,
                                      last_logged_in: formattedDate,
                                      created_date: formattedDate
                                    };

                                    db.query('INSERT INTO user_device_info SET ?', userDeviceMetaInsertData, async (err, results) => {
                                      if (err) {
                                        return res.json({
                                          status: 'error',
                                          data: {
                                            user,
                                            meta,
                                            wp_user: wpuserResults[0].ID,
                                            token: token,
                                          },
                                          message: err,
                                          client_ip: clientIp,
                                          user_agent: userAgent.toString(),
                                        });
                                      } else {
                                        return res.json({
                                          status: 'success',
                                          data: {
                                            user,
                                            meta,
                                            wp_user: wpuserResults[0].ID,
                                            token: token,
                                          },
                                          message: 'Login successful',
                                          client_ip: clientIp,
                                          user_agent: userAgent.toString(),
                                        });
                                      }
                                    })

                                  }
                                })

                              });
                            });
                          } else {
                            //User Exist but already Registered from Web
                            return res.status(500).json({
                              status: 'error',
                              message: 'You are already registered with this email, please login with your email and password',
                              error: ''
                            })
                          }


                        }
                      } catch (error) {
                        console.error('Error during user_exist_query:', error);
                      }



                    } else {
                      return res.send(
                        {
                          status: 'err',
                          data: '',
                          message: 'Successfully registerd in node but not in wordpress site'
                        }
                      )
                    }
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
                    message: 'Wordpress register issue: ' + error.response.data
                  }
                )
              });


            //return {first_name:userFullNameArray[0], last_name:userFullNameArray[1], user_id: newuserID, status: 0};
          } catch (error) {
            res.json(error);
            //console.error('Error during user_meta_insert_query:', error);
          }
        }
      } catch (error) {
        res.json(error);
        //console.error('Error during user_insert_query:', error);
      }

    }
  } catch (error) {
    console.error('Error during user_exist_query:', error);
  }

}


exports.edituser = (req, res) => {
  console.log(req.body);
  const authenticatedUserId = parseInt(req.user.user_id);
  console.log('authenticatedUserId: ', authenticatedUserId);
  const user_type_id = 2;
  const userId = parseInt(req.body.user_id);
  console.log('req.body.user_id: ', parseInt(req.body.user_id));
  // Update the user's data

  const updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, phone = ?, user_type_id = ? WHERE user_id = ?';
  console.log("user_id from request:", req.body.user_id);
  if (userId !== authenticatedUserId) {
    return res.status(403).json({

      status: 'error',
      message: 'Access denied: You are not authorized to update this user.',
    });
  }
  db.query(updateQuery, [req.body.first_name, req.body.last_name, req.body.phone, '2', userId], (updateError, updateResults) => {

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
      const selectQuery = 'SELECT * FROM users WHERE user_id = ?';
      db.query(selectQuery, [userId], (selectError, selectResults) => {
        if (selectError) {
          // Handle the error
          return res.send(
            {
              status: 'err',
              data: '',
              message: 'An error occurred while processing your request' + selectError
            }
          )
        }

        const metaQuery = 'SELECT * FROM user_customer_meta WHERE user_id = ?';
        db.query(metaQuery, [userId], (metaError, metaResults) => {
          if (selectError) {
            // Handle the error
            return res.send(
              {
                status: 'err',
                data: '',
                message: 'An error occurred while processing your request' + metaError
              }
            )
          }
          else {
            // Fetch the updated user data
            const updatedUserData = selectResults[0];
            const metUserData = metaResults[0];
            if (req.file) {
              updatedUserData.profile_pic = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            }
            // Update the user's meta data
            if (req.file) {
              // delete the previous file
              const unlinkprofilePicture = "uploads/" + req.body.previous_profile_pic;
              console.log('unlinkprofilePicture:', unlinkprofilePicture);
              if (unlinkprofilePicture !== 'undefined') {
                fs.unlink(unlinkprofilePicture, (err) => {
                  if (err) {
                    console.error('Error deleting file:', err);
                  } else {
                    console.log('Previous file deleted');
                  }
                });
              }
              const profilePicture = req.file;
              console.log(profilePicture);

              const updateQueryMeta = 'UPDATE user_customer_meta SET address = ?, country = ?, state = ?, city = ?, zip = ?, date_of_birth = ?, occupation = ?, gender = ?, profile_pic = ?, alternate_phone = ?,marital_status=?, about = ? WHERE user_id = ?';
              db.query(updateQueryMeta, [req.body.address, req.body.country, req.body.state, req.body.city, req.body.zip, req.body.date_of_birth, req.body.occupation, req.body.gender, req.file.filename, req.body.alternate_phone, req.body.marital_status, req.body.about, userId], (updateError, updateResults) => {
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
                      data: [updatedUserData, metUserData],
                      message: 'Update Successfull'
                    }
                  )
                }
              });

            } else {
              const updateQueryMeta = 'UPDATE user_customer_meta SET address = ?, country = ?, state = ?, city = ?, zip = ?, date_of_birth = ?, occupation = ?, gender = ?,alternate_phone = ?,marital_status=?, about = ? WHERE user_id = ?';
              db.query(updateQueryMeta, [req.body.address, req.body.country, req.body.state, req.body.city, req.body.zip, req.body.date_of_birth, req.body.occupation, req.body.gender, req.body.alternate_phone, req.body.marital_status, req.body.about, userId], (updateError, updateResults) => {
                if (updateError) {
                  return res.send(
                    {
                      status: 'err',
                      data: '',
                      message: 'An error occurred while processing your request' + updateError
                    }
                  )
                } else {
                  return res.send(
                    {
                      status: 'ok',
                      data: [updatedUserData, metUserData],
                      message: 'Update Successfull'
                    }
                  )
                }
              });
            }

          }

        });
      })
    }
  })
}




exports.createcategories = (req, res) => {
  console.log('category', req.body);
  const { cat_name, cat_parent_id, country } = req.body;

  // Check if category_name is provided and not empty
  if (!cat_name || cat_name.trim() === '') {
    return res.status(400).json({
      status: 'error',
      message: 'Category name is required',
    });
  }

  const cat_img = req.file ? req.file.filename : null;

  const sql = 'INSERT INTO category (category_name, parent_id, category_img) VALUES (?, ?, ?)';
  db.query(sql, [cat_name, cat_parent_id || null, cat_img], async (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while creating a new category',
      });
    }

    for (const countryId of country) {
      const catCountrySql = 'INSERT INTO category_country_relation (cat_id, country_id) VALUES (?, ?)';
      db.query(catCountrySql, [result.insertId, countryId], (countryErr) => {
        if (countryErr) {
          console.log(countryErr);
          return res.status(500).json({
            status: 'error',
            message: 'An error occurred while creating a category-country relation',
          });
        }
      });
    } return res.send(
      {
        status: 'ok',
        data: result,
        message: 'New Category created'
      })
  })
}


exports.createcompany = (req, res) => {
  console.log('company', req.body);

  const { comp_email, company_name, comp_phone, comp_registration_id, about_company } = req.body;
  db.query('SELECT comp_email FROM company WHERE comp_email=? OR comp_phone=?', [comp_email, comp_phone], async (err, results) => {
    if (err) {
      return res.send({
        status: 'err',
        data: '',
        message: 'An error occurred while processing',
        err,
      });
    }
    if (results.length > 0) {
      return res.send({
        status: 'err',
        data: '',
        message: 'Email or phone number already exist for another company',
      });
    }
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const logo = req.file ? req.file.path : '';

    const status = "1";
    const value = [1, company_name, logo, comp_phone, comp_email, comp_registration_id, formattedDate, formattedDate, status, about_company]; // Include the status value

    const Query = 'INSERT INTO company(user_created_by, company_name, logo, comp_phone, comp_email, comp_registration_id, created_date,updated_date, status,about_company) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?,?)';
    console.log(Query, value);

    db.query(Query, value, (err, results) => {
      if (err) {
        return res.send({
          status: 'err',
          data: '',
          message: 'An error occurred while processing your request',
          err,
        });
      } else {
        const companyId = results.insertId;
        let companyCategoryData = [];
        if (Array.isArray(req.body.category)) {
          companyCategoryData = req.body.category.map((categoryID) => [companyId, categoryID]);
        } else {
          try {
            companyCategoryData = JSON.parse(req.body.category).map((categoryID) => [companyId, categoryID]);
          } catch (error) {
            console.log(error);
            return res.status(400).json({
              status: 'err',
              message: 'Error while parsing category data',
              error,
            });
          }
        }
        const categoryQuery = 'INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?';
        db.query(categoryQuery, [companyCategoryData], function (error, results) {
          if (error) {
            console.log(error);
            res.status(400).json({
              status: 'err',
              message: 'Error while creating company category',
              error,
            });
          } else {
            return res.send({
              status: 'ok',
              data: companyId,
              message: 'New company created'
            });
          }
        });
      }
    });
  });
};


exports.editcompany = (req, res) => {
  console.log('company', req.body);


  const companyId = req.body.company_id;
  console.log(companyId)
  const { comp_email, company_name, comp_phone, comp_registration_id } = req.body;

  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const logo = req.file ? req.file.path : '';

  const statusValue = "1";

  const checkQuery = 'SELECT * FROM company WHERE (comp_email=? OR comp_phone=?) AND ID =?';
  const checkValues = [comp_email, comp_phone, companyId];

  db.query(checkQuery, checkValues, (err, results) => {
    if (err) {
      return res.send({
        status: 'err',
        data: '',
        message: "An error occurred while processing"
      });
    }
    if (results.length > 0) {
      return res.send({
        status: 'err',
        data: '',
        message: "Email ID or phone number already exist for another company"
      });
    }

    db.query('SELECT logo FROM company WHERE ID = ?', [companyId], (err, logoResult) => {
      if (err) {
        console.error(err);
      } else {
        // if (logoResult.length > 0 && logoResult[0].logo) {
        //   const previousLogoPath = logoResult[0].logo;
        if (logoResult && logoResult.length > 0) {
          const previousLogoPath = logoResult[0].logo;

          // Delete the previous logo file from the server
          fs.unlink(previousLogoPath, (err) => {
            if (err) {
              console.error('Error deleting previous logo:', err);
            } else {
              console.log('Previous logo deleted:', previousLogoPath);
            }

            // Now, update the company details including the logo
            const updateQuery = 'UPDATE company SET company_name = ?, logo = ?, comp_phone = ?, comp_email = ?, comp_registration_id = ?, updated_date = ?, status = ? WHERE ID = ?';
            const updateValues = [company_name, logo, comp_phone, comp_email, comp_registration_id, formattedDate, statusValue, companyId];

            db.query(updateQuery, updateValues, (err, results) => {
              if (err) {
                return res.send({
                  status: 'err',
                  data: '',
                  message: "An error occurred while updating company details"
                });
              }

              const deleteQuery = 'DELETE FROM company_cactgory_relation WHERE company_id=?';
              db.query(deleteQuery, [companyId], (err) => {
                if (err) {
                  return res.send({
                    status: 'err',
                    data: '',
                    message: 'An error occurred while deleting existing company categories: ' + err
                  });
                }

                const categories = req.body.category;
                let companyCategoryData = [];

                if (Array.isArray(categories)) {
                  companyCategoryData = categories.map((categoryID) => [companyId, categoryID]);
                } else {
                  try {
                    companyCategoryData = JSON.parse(categories).map((categoryID) => [companyId, categoryID]);
                  } catch (error) {
                    console.log(error);
                    return res.status(400).json({
                      status: 'err',
                      message: 'Error while parsing category data',
                      error,
                    });
                  }
                }

                const insertQuery = 'INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?';
                db.query(insertQuery, [companyCategoryData], (err) => {
                  if (err) {
                    return res.send({
                      status: 'err',
                      data: '',
                      message: 'An error occurred while updating company categories: ' + err
                    });
                  }

                  // Return success response
                  return res.send({
                    status: 'ok',
                    data: companyId,
                    message: 'Company details updated successfully'
                  });
                });
              });
            });
          });
        } else {
          // No previous logo to delete, proceed with updating company details
          const updateQuery = 'UPDATE company SET company_name = ?, logo = ?, comp_phone = ?, comp_email = ?, comp_registration_id = ?, updated_date = ?, status = ? WHERE ID = ?';
          const updateValues = [company_name, logo, comp_phone, comp_email, comp_registration_id, formattedDate, statusValue, companyId];

          db.query(updateQuery, updateValues, (err, results) => {
            if (err) {
              return res.send({
                status: 'err',
                data: '',
                message: "An error occurred while updating company details"
              });
            }

            const deleteQuery = 'DELETE FROM company_cactgory_relation WHERE company_id=?';
            db.query(deleteQuery, [companyId], (err) => {
              if (err) {
                return res.send({
                  status: 'err',
                  data: '',
                  message: 'An error occurred while deleting existing company categories: ' + err
                });
              }

              const categories = req.body.category;
              let companyCategoryData = [];

              if (Array.isArray(categories)) {
                companyCategoryData = categories.map((categoryID) => [companyId, categoryID]);
              } else {
                try {
                  companyCategoryData = JSON.parse(categories).map((categoryID) => [companyId, categoryID]);
                } catch (error) {
                  console.log(error);
                  return res.status(400).json({
                    status: 'err',
                    message: 'Error while parsing category data',
                    error,
                  });
                }
              }

              const insertQuery = 'INSERT INTO company_cactgory_relation (company_id, category_id) VALUES ?';
              db.query(insertQuery, [companyCategoryData], (err) => {
                if (err) {
                  return res.send({
                    status: 'err',
                    data: '',
                    message: 'An error occurred while updating company categories: ' + err
                  });
                }

                // Return success response
                return res.send({
                  status: 'ok',
                  data: companyId,
                  message: 'Company details updated successfully'
                });
              });
            });
          });
        }
      }
    });
  });
};



exports.createcompanylocation = (req, res) => {
  console.log(req.body);
  const {
    company_id,
    address,
    country,
    state,
    city,
    zip,

  } = req.body;

  console.log('Received company_id:', company_id);

  // Check if the company_id exists in the company table before inserting into company_location
  const checkCompanyQuery = 'SELECT ID FROM company WHERE ID = ?';
  db.query(checkCompanyQuery, [company_id], (checkError, checkResults) => {
    if (checkError) {
      return res.status(500).json({
        status: 'error',
        message: 'Error while checking company existence',
        error: checkError
      });
    }

    console.log('Check company results:', checkResults);

    if (checkResults.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Company does not exist', checkError
      });
    }

    // Insert into company_location table
    const addressQuery = 'INSERT INTO company_location(company_id, address, country, state, city, zip) VALUES (?, ?, ?, ?, ?, ?)';
    const addressValues = [company_id, address, country, state, city, zip]; // Include the 'status' value here

    db.query(addressQuery, addressValues, (insertError, results) => {
      if (insertError) {
        return res.status(500).json({
          status: 'error',
          message: 'Error while creating company address',
          error: insertError
        });
      }

      return res.status(200).json({
        status: 'success',
        data: results.insertId,
        message: 'Company address created successfully'
      });
    });

  });
};


//submit review 

// async function generateUniqueSlug(companyName) {
//   let slug = slugify(companyName, { lower: true });
//   let isUnique = false;

//   // Loop until a unique slug is found
//   while (!isUnique) {
//     const checkQuery = 'SELECT id FROM company WHERE slug = ?';
//     const [checkResults] = await db.promise().query(checkQuery, [slug]);

//     if (checkResults.length === 0) {
//       isUnique = true;
//     } else {
//       // Append a random string to make the slug unique
//       const randomString = Math.random().toString(36).substring(2, 8);
//       slug = `${slug}-${randomString}`;
//     }
//   }

//   return slug;
// }

async function generateUniqueSlug(companyName) {
  const baseSlug = slugify(companyName, {
    replacement: '-',  // replace spaces with hyphens
    lower: true,      // convert to lowercase
    strict: true,     // strip special characters
    remove: /[*+~.()'"!:@]/g,
  });

  let slug = baseSlug;
  let slugExists = false;
  let count = 1;

  // Check if the generated slug already exists in the database
  const checkQuery = 'SELECT slug FROM company WHERE slug = ?';
  const [checkResults] = await db.promise().query(checkQuery, [slug]);

  if (checkResults.length === 0) {
    slugExists = true;
  } else {
    // Slug already exists, generate a unique one
    while (slugExists) {
      slug = `${baseSlug}-${count}`;
      const [newCheckResults] = await db.promise().query(checkQuery, [slug]);
      if (newCheckResults.length === 0) {
        slugExists = false;
      } else {
        count++;
      }
    }
  }

  return slug;
}


exports.submitReview = async (req, res) => {

  try {
    const authenticatedUserId = parseInt(req.user.user_id);
    console.log('authenticatedUserId: ', authenticatedUserId);
    const ApiuserId = parseInt(req.body.user_id);
    console.log('req.body.user_id: ', parseInt(req.body.user_id));
    const {
      user_id,
      company_name,
      address,
      rating,
      review_title,
      review_content,
      user_privacy,
      user_contact,
      tags
    } = req.body;
    console.log("Rating from request:", rating);
    console.log("Review Content from request:", review_content);
    console.log("user_id from request:", req.body.user_id);
    if (ApiuserId !== authenticatedUserId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to update this user.',
      });
    }
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

    // Check if the company already exists
    const companyCheckQuery = 'SELECT id FROM company WHERE company_name = ?';
    const [companyCheckResults] = await db.promise().query(companyCheckQuery, [company_name]);

    let companyID;
    let company_location_id;
    let companyslug;
    // Check if the address already exists
    const addressCheckQuery = 'SELECT ID FROM company_location WHERE address = ?';
    const [addressCheckResults] = await db.promise().query(addressCheckQuery, [address]);

    if (companyCheckResults.length === 0) {
      const slug = await generateUniqueSlug(company_name);
      console.log("aaa", slug)
      // Company does not exist, create it
      const createCompanyQuery = 'INSERT INTO company (slug,user_created_by, company_name,main_address, status, created_date, updated_date) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const createCompanyValues = [slug, user_id, company_name, address, '2', formattedDate, formattedDate];

      const [createCompanyResults] = await db.promise().query(createCompanyQuery, createCompanyValues);
      companyID = createCompanyResults.insertId;
      companyslug = slug.insertId;

      // Create company address
      const createAddressQuery = 'INSERT INTO company_location (company_id, address) VALUES (?, ?)';
      const createAddressValues = [companyID, address];
      const [createAddressResults] = await db.promise().query(createAddressQuery, createAddressValues);

      console.log("createAddressResults:", createAddressResults);

      company_location_id = createAddressResults.insertId;

    } else {
      companyID = companyCheckResults[0].id;
      const slug = await generateUniqueSlug(company_name);
      const updateCompanySlugQuery = 'UPDATE company SET slug = ? WHERE id = ?';
      await db.promise().query(updateCompanySlugQuery, [slug, companyID]);

      companyslug = slug;

      // Check if the address already exists
      const addressCheckQuery = 'SELECT ID FROM company_location WHERE address = ?';
      const [addressCheckResults] = await db.promise().query(addressCheckQuery, [address]);

      if (addressCheckResults.length === 0) {
        // Address does not exist, create it
        const createAddressQuery = 'INSERT INTO company_location (company_id, address) VALUES (?, ?)';
        const createAddressValues = [companyID, address];
        const [createAddressResults] = await db.promise().query(createAddressQuery, createAddressValues);

        console.log("createAddressResults:", createAddressResults);

        company_location_id = createAddressResults.insertId;
      } else {
        // Address already exists, use the existing ID
        company_location_id = addressCheckResults[0].ID;
      }
    }

    console.log("companyID:", companyID);
    console.log("company_location_id:", company_location_id);

    // Create the review
    console.log("Rating from request:", rating);
    console.log("Review Content from request:", review_content);

    // Create the review
    const create_review_query = `
      INSERT INTO reviews (
        company_id,
        customer_id,
        company_location,
        company_location_id,
        review_title,
        rating,
        review_content,
        user_privacy,
        review_status,
        labels,
        created_at,
        updated_at,
        user_contact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const create_review_values = [
      companyID,
      user_id,
      address,
      company_location_id,
      review_title,
      rating,
      review_content,
      user_privacy,
      '2',
      '1',
      formattedDate,
      formattedDate,
      user_contact
    ];

    console.log("Inserting Review Data:", create_review_values);

    try {
      const [create_review_results] = await db.promise().query(create_review_query, create_review_values);

      if (create_review_results.insertId) {
        for (const tagItem of tags) {
          const review_tag_relation_query = 'INSERT INTO review_tag_relation (review_id, tag_name) VALUES (?, ?)';
          const review_tag_relation_values = [create_review_results.insertId, tagItem];
          await db.promise().query(review_tag_relation_query, review_tag_relation_values);
        }

        const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
        await db.promise().query(update_review_count_query, [user_id]);

        return res.send({
          status: 'ok',
          data: {
            reviewId: create_review_results.insertId
          },
          message: 'Review posted successfully'
        });
      } else {
        return res.send({
          status: 'error',
          data: '',
          message: 'Error occurred, please try again'
        });
      }
    } catch (error) {
      console.error('Error during create_review_results:', error);
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while posting the review', error
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('An error occurred');
  }
};


// --searchCompany --//
exports.searchCompany = async (req, res) => {
  //console.log(req.body);
  const keyword = req.params.keyword; //Approved Company
  const get_company_query = `
  SELECT c.ID, c.company_name, c.logo, c.about_company, c.main_address, c.main_address_pin_code, r.review_status AS review_status
  FROM company c
  LEFT JOIN reviews r ON c.ID = r.company_id
  WHERE c.company_name LIKE '%${keyword}%' AND status="1"
  GROUP BY c.ID, c.company_name, c.logo, c.about_company, c.main_address, c.main_address_pin_code
  ORDER BY c.created_date DESC  
`;

  try {
    const get_company_results = await query(get_company_query);
    if (get_company_results.length > 0) {
      res.status(200).json({
        status: 'success',
        data: get_company_results,
        message: get_company_results.length + ' company data recived'
      });
      return { status: 'success', data: get_company_results, message: get_company_results.length + ' company data recived' };
    } else {
      res.status(200).json({ status: 'success', data: '', message: 'No company data found' });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while posting the request: ' + error
    });
  }
}




//reset password
// exports.resetPassword = async (req, res) => {
//   const { otp, new_password,confirm_passsword } = req.body;
//   const hashedPassword = await bcrypt.hash(new_password, 8);

//   // Check if the provided OTP exists in the user_code_verify table
//   const query = `SELECT user_id, email FROM user_code_verify WHERE otp = '${otp}'`;

//   db.query(query, (err, result) => {
//     if (err) {
//       return res.send({
//         status: 'not ok',
//         message: 'Something went wrong: ' + err,
//       });
//     } else {
//       if (result.length > 0) {
//         const userId = result[0].user_id;
//         const email = result[0].email;

//         // Update the password in the users table
//         const updateSql = 'UPDATE users SET password = ? WHERE email = ?';
//         const data = [hashedPassword, email];

//         db.query(updateSql, data, (updateErr) => {
//           if (updateErr) {
//             console.log(updateErr);
//             return res.send({
//               status: 'not ok',
//               message: 'Something went wrong: ' + updateErr,
//             });
//           } else {
//             return res.send({
//               status: 'ok',
//               data: data,
//               message: 'Password reset successfully.',
//             });
//           }
//         });
//       } else {
//         return res.send({
//           status: 'not ok',
//           message: 'Invalid OTP. Please check or request another OTP.',
//         });
//       }
//     }
//   });
// };


//change password
// exports.changePassword = async (req, res) => {
//   console.log('change password', req.body);
//   const { userid, current_password, new_password } = req.body;
//   try {
//     const query = `SELECT password FROM users WHERE user_id = '${userid}'`;
//     db.query(query, async (err, result) => {
//       if (err) {
//         return res.send({
//           status: 'error',
//           message: 'Something went wrong' + err,
//         });
//       } else {
//         if (result.length > 0) {
//           const userPassword = result[0].password;
//           const isPasswordMatch = await bcrypt.compare(current_password, userPassword);

//           if (isPasswordMatch) {
//             const hashedNewPassword = await bcrypt.hash(new_password, 8);

//             const updateQuery = 'UPDATE users SET password = ? WHERE user_id = ?';
//             const data = [hashedNewPassword, userid];

//             db.query(updateQuery, data, (err, result) => {
//               if (err) {
//                 return res.send({
//                   status: 'error',
//                   message: 'Something went wrong' + err,
//                 });
//               } else {
//                 return res.send({
//                   status: 'success',
//                   data:data,
//                   message: 'Password updated successfully',
//                   token:newToken
//                 });
//               }
//             });
//           } else {
//             return res.send({
//               status: 'error',
//               message: 'Current password does not match',
//             });
//           }
//         } else {
//           return res.send({
//             status: 'error',


//             message: 'User not found',
//           });
//         }
//       }
//     });
//   } catch (error) {
//     return res.send({
//       status: 'error',
//       message: 'Something went wrong' + error,
//     });
//   }
// };

exports.changePassword = async (req, res) => {
  console.log('change password', req.body);
  //const authorizationHeader = req.headers.authorization;

  // if (!authorizationHeader) {
  //   return res.status(401).json({
  //     status: 'error',
  //     message: 'Authorization header missing.',
  //   });
  // // }
  //   const oldToken = authorizationHeader.split(' ')[1];

  //   function addToInvalidTokenList(token) {
  //     invalidTokens.add(token);
  //   }

  const { email, current_password, new_password } = req.body;
  try {
    const query = `SELECT password,register_from FROM users WHERE email = '${email}'`;
    db.query(query, async (err, result) => {
      if (err) {
        return res.send({
          status: 'error',
          message: 'Something went wrong' + err,
        });
      } else {

        //addToInvalidTokenList(oldToken);
        if (result.length > 0) {
          const registerFrom = result[0].register_from;
          if (registerFrom === 'web' || registerFrom === 'app') {
            const userPassword = result[0].password;
            const isPasswordMatch = await bcrypt.compare(current_password, userPassword);

            if (isPasswordMatch) {
              const hashedNewPassword = await bcrypt.hash(new_password, 8);

              const updateQuery = 'UPDATE users SET password = ? WHERE email = ?';
              const data = [hashedNewPassword, email];

              db.query(updateQuery, data, (err, result) => {
                if (err) {
                  return res.send({
                    status: 'error',
                    message: 'Something went wrong' + err,
                  });
                } else {
                  return res.send({
                    status: 'success',
                    //data: data,
                    message: 'Password updated successfully',
                  });
                }
              });
            } else {
              return res.send({
                status: 'error',
                message: 'Current password does not match',
              });
            }
          } else {
            return res.json({
              status: 'error',
              message: 'OTP cannot be sent. You are logged in through a social account.'
            });
          }
        } else {
          return res.send({
            status: 'error',
            message: 'User not found',
          });
        }
      }
    });
  } catch (error) {
    return res.send({
      status: 'error',
      message: 'Something went wrong' + error,
    });
  }
};

exports.contactUsEmail = (req, res) => {
  const phone = req.body.phone;
  const message = req.body.message;
  const fullname = req.body.name;
  const email = req.body.email;
  var mailOptions = {
    from: process.env.MAIL_USER,
    to: process.env.MAIL_SUPPORT,
    //to: 'pranab@scwebtech.com',
    subject: 'Feedback Mail From Contact',
    //html: ejs.renderFile(path.join(process.env.BASE_URL, '/views/email-template/', 'feedback.ejs'), { phone: phone, message: message })
    html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
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
                          <td colspan="2" id="credit" style="padding: 0 48px 48px 48px; -webkit-border-radius: 6px; border: 0; color: #99b1c7; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center;" valign="middle">
                               <p> (http://CEchoesTechnology.in/)</p>
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
        status: 'error',
        message: 'Something went wrong'
      });
    } else {
      console.log('Mail Send: ', info.response);
      return res.send({
        status: 'success',
        message: 'Thank you for your feedback'
      });
    }
  })
}

//new forget password
// Function to generate OTP
function generateOTP(length) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    otp += digits[randomIndex];
  }
  const expirationTimestamp = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  return { otp, expirationTimestamp };
}


// Function to generate OTP
// function generateOTP(length) {
//   const digits = '0123456789';
//   let otp = '';
//   for (let i = 0; i < length; i++) {
//     const randomIndex = Math.floor(Math.random() * digits.length);
//     otp += digits[randomIndex];
//   }
//   return otp;
// }

//actual

exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  const passphrase = process.env.ENCRYPT_DECRYPT_SECRET;
  //console.log('Passphrase:', passphrase);
  const otp = generateOTP(6);
  const expirationTimestamp = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  const currentTime = new Date();
  //console.log(otp);

  const sql = `SELECT user_id, first_name,register_from FROM users WHERE email = '${email}' `;

  db.query(sql, (error, result) => {
    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while processing your request.',
      });
    } else {
      if (result.length > 0) {
        const registerFrom = result[0].register_from;
        //console.log("registerFrom",registerFrom);

        if (registerFrom === 'web' || registerFrom === 'app') {

          if (typeof passphrase !== 'string') {
            console.error('Passphrase is not a string:', passphrase);
            // Handle the error or set a default passphrase value if needed.
          }
          else {
            const userId = result[0].user_id;
            //console.log("userId", userId)


            // Insert the OTP and expiration timestamp into the user_code_verify table
            const insertOtpQuery = `
            INSERT INTO user_code_verify (user_id, phone, otp, email, created_at, otp_expiration)
            VALUES (?, ?, ?, ?, ?, ?)
          `;

            db.query(
              insertOtpQuery,
              [userId, null, otp.otp, email, currentTime, new Date(otp.expirationTimestamp)],
              (insertError) => {
                if (insertError) {
                  console.error(insertError);
                  return res.status(500).json({
                    status: 'error',
                    message: 'Failed to store OTP in the database.',
                  });
                }

                const transporter = nodemailer.createTransport({
                  host: process.env.MAIL_HOST,
                  port: process.env.MAIL_PORT,
                  secure: false,
                  requireTLS: true,
                  auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASSWORD,
                  },
                });

                var mailOptions = {
                  from: process.env.MAIL_USER,
                  to: email,
                  subject: 'Forgot password Email',
                  text: `Your OTP for forgot password is: ${otp.otp}. Please use it within 5 minutes.`,
                };

                transporter.sendMail(mailOptions, function (err, info) {
                  if (err) {
                    console.log(err);
                    return res.json({
                      status: 'not ok',
                      message: 'Something went wrong',
                      err,
                    });
                  } else {
                    console.log('Mail Send: ', info.response);
                    return res.json({
                      status: 'ok',
                      data: '',
                      message:
                        'Password reset OTP sent to your email. Please check your email.',
                    });
                  }
                });
              }
            );
          }
        } else {
          return res.json({
            status: 'error',
            message: 'OTP cannot be sent. You are logged in through a social account.'
          });
        }
      } else {
        return res.json({
          status: 'not found',
          data: '',
          message: 'Your Email did not match with our record',
        });
      }
    }
  });
};


//actual
exports.resetPassword = async (req, res) => {
  const { otp, newPassword, confirm_password } = req.body;

  if (!newPassword || newPassword !== confirm_password) {
    return res.status(400).json({
      status: 'error',
      message: 'New password and confirmation do not match or are missing.',
    });
  }


  // Retrieve stored OTP and its expiration timestamp
  const selectOtpQuery = `
    SELECT user_id, otp, otp_expiration, email
    FROM user_code_verify
    WHERE otp = ?
  `;

  db.query(selectOtpQuery, [otp], (error, result) => {
    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while processing your request.',
      });
    }

    if (result.length > 0) {
      const { user_id, otp: storedOTP, otp_expiration, email } = result[0];
      //console.log('OTP Expiration Time:', otp_expiration);


      const currentTimestamp = Date.now();
      //console.log("currentTimestamp", currentTimestamp);

      const expirationTimestamp = new Date(otp_expiration).getTime();
      //console.log("expirationTimestamp", expirationTimestamp)

      if (currentTimestamp > expirationTimestamp) {
        console.log('OTP Expired');
        const deleteOtpQuery = `
        DELETE FROM user_code_verify
        WHERE otp = ?
      `;
        db.query(deleteOtpQuery, [otp], (deleteError) => {
          if (deleteError) {
            console.error(deleteError);
          }
        });
        return res.status(400).json({ message: 'OTP has expired' });
      }

      if (otp === storedOTP) {
        const hashedPassword = bcrypt.hashSync(newPassword, 8);

        const updatePasswordQuery = `
          UPDATE users
          SET password = ?
          WHERE email = ?
        `;

        const data = [hashedPassword, email];
        db.query(updatePasswordQuery, data, (updateError) => {
          if (updateError) {
            console.error(updateError);
            return res.status(500).json({
              status: 'error',
              message: 'Failed to reset the password.',
            });
          }
          return res.json({
            status: 'ok',
            message: 'Password reset successfully'
          });
        })
      } else {
        console.log('Invalid OTP');
        return res.status(400).json({ message: 'Invalid OTP' });
      }
    } else {
      //console.log('OTP Not Found or Expired');
      return res.status(400).json({ message: 'Invalid OTP' });
    }
  });
}


//renew token
// const renewToken = (userId) => {
//   const payload = {};
//   const newSecretJwt = randomstring.generate();

//   // Log the new secret key
//   console.log('New Secret JWT:', newSecretJwt);

//   fs.readFile('config.js', 'utf-8', function (err, data) {
//     if (err) throw err;

//     const newValue = data.replace(new RegExp(secretKey, 'g'), newSecretJwt);

//     fs.writeFile('config.js', newValue, 'utf-8', function (err, data) {
//       if (err) throw err;
//       console.log('Secret key updated in config.js');
//     });
//   });
//   console.log('JWT Payload:', payload);

//   const token = jwt.sign(payload, newSecretJwt, {
//     expiresIn: '10h',
//   });

//   return token;
// };








//new renew token
// const renewToken = (userId) => {
//   // Create a payload with user-specific data
//   const payload = {
//     user_id: userId,
//     // Add other relevant claims here
//   };

//   // Generate a new secret JWT
//   const newSecretJwt = randomstring.generate();

//   // Log the new secret key (use secure logging mechanisms)
//   console.log('New Secret JWT:', newSecretJwt);

//   // Update the secret key in the configuration file
//   fs.readFile('config.js', 'utf-8', (err, data) => {
//     if (err) {
//       console.error('Error reading config.js:', err);
//       return;
//     }

//     const newValue = data.replace(new RegExp(secretKey, 'g'), newSecretJwt);

//     fs.writeFile('config.js', newValue, 'utf-8', (err) => {
//       if (err) {
//         console.error('Error writing to config.js:', err);
//         return;
//       }
//       console.log('Secret key updated in config.js');
//     });
//   });

//   // Sign a new token with the updated secret key
//   const token = jwt.sign(payload, newSecretJwt, {
//     expiresIn: '10h',
//   });

//   return token;
// };




// //new refresh token


const generateRefreshToken = (userId) => {
  try {
    // Define the payload for the token
    const payload = {
      user_id: userId, // You can include any user-specific data here
      // Add other claims as needed
    };

    // Sign the token using the secret key and set the expiration
    const refreshToken = jwt.sign(payload, secretKey, {
      expiresIn: '24h',
    });

    return refreshToken;
  } catch (error) {
    // Handle token generation error (e.g., log, throw, or return null)
    console.error('Error generating refresh token:', error);
    return null;
  }
};

// Refresh Token route
exports.refreshToken = async (req, res) => {
  const userId = req.body.user_id;

  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'User ID missing in the request body',
    });
  }

  // Generate a new refresh token for the specified user
  const refreshToken = generateRefreshToken(userId);

  if (!refreshToken) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate refresh token',
    });
  }
  res.setHeader('x-refresh-token', refreshToken);
  res.json({
    status: 'success',
    refresh_token: refreshToken,
  });
};


// submitting review replies
//new 
exports.submitReviewReply = async (req, res) => {
  try {
    const authenticatedUserId = parseInt(req.user.user_id);
    console.log('authenticatedUserId: ', authenticatedUserId);
    const ApiuserId = parseInt(req.body.reply_by);
    if (isNaN(ApiuserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user_id provided in request body.',
      });
    }
    console.log('req.body.user_id: ', parseInt(req.body.reply_by));
    const {
      review_id,
      company_id,
      reply_to,
      reply_by,
      comment
    } = req.body;
    console.log(req.body);
    console.log("user_id from request:", req.body.reply_by);
    if (ApiuserId !== authenticatedUserId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to update this user.',
      });
    }
    const currentTimestamp = Date.now();
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // console.log(formattedDateTime);
    // const currentDate = new Date();
    //const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    console.log("aaa", formattedDate);
    const replyData = {
      review_id: review_id,
      company_id: company_id,
      reply_by: reply_by,
      reply_to: reply_to,
      comment: comment,
      created_at: formattedDate,
      updated_at: formattedDate,
    };
    db.query(
      'INSERT INTO review_reply  SET ?', replyData, async (err, results) => {
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
          // Return a success response
          return res.status(200).json({
            status: 'ok',
            data: replyData,
            message: 'Reply Successfully Sent',
          });
        }
      })
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred ' + error,
    });
  }
};


exports.PremiumCompanyprofileManagement = async (req, res) => {
  const companyID = req.body.company_id;
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const {
    previous_cover_image,
    youtube_iframe,
    promotion_title,
    promotion_desc,
    promotion_discount,
    promotion_image,
    product_title,
    product_desc,
    product_image,
    facebook_url,
    twitter_url,
    instagram_url,
    linkedin_url,
    youtube_url,
    support_email,
    escalation_one,
    escalation_two,
    escalation_three,
  } = req.body;

  const { cover_image, gallery_images } = req.files;

  let galleryImages = [];

  if (gallery_images) {
    galleryImages = gallery_images.map((file) => ({
      gallery_images: file.filename,
    }));
  }
  console.log("Uploaded promotion images:", req.files.promotion_image);

  let productImages = [];

  if (
    typeof product_image === 'undefined' ||
    typeof promotion_image === 'undefined'
  ) {
    productImages = Array.isArray(req.files.product_image)
      ? req.files.product_image.map((file) => file.filename)
      : [];
  }

  // Use a single product image if there's only one uploaded
  if (productImages.length === 0 && typeof product_image !== 'undefined') {
    productImages = [product_image];
  }

  let ProductData = [];

  if (Array.isArray(product_title) && product_title.length > 0) {
    let count = 0;
    ProductData = product_title.map((title, index) => {
      let productImage = null;

      // Check if product_image is an array and has an element at the current index
      if (Array.isArray(productImages) && productImages.length > count) {
        productImage = productImages[count];
        count++; // Increment the counter
      } else {
        productImage = null; // Handle the case where productImages is not defined or has no more elements
      }


      return {
        product_title: title,
        product_desc: product_desc[index],
        product_image: productImage,
      };
    });
  } else {
    // Handle the case where only one product is uploaded
    let prodkImg = null;
    if (Array.isArray(product_image) && product_image.length > 0) {
      prodkImg = product_image[0];

      ProductData = [
        {
          product_title: product_title,
          product_desc: product_desc,
          product_image: prodkImg,
        },
      ];
    }
  }
  console.log("productData", ProductData)

  let PromotionalData = [];

  if (Array.isArray(promotion_title) && promotion_title.length > 0) {
    let i = 0;
    PromotionalData = promotion_title.map((title, index) => {
      let promotionImage = null;

      // Check if promotion_image is an array and has an element at the current index
      if (
        Array.isArray(req.files.promotion_image) &&
        req.files.promotion_image.length > index &&
        req.files.promotion_image[index].filename !== ''
      ) {
        promotionImage = req.files.promotion_image[index].filename;
      } else {
        promotionImage = null; // Handle the case where promotion_image is not defined
      }

      return {
        promotion_title: title,
        promotion_desc: promotion_desc[index],
        promotion_discount: promotion_discount[index],
        promotion_image: promotionImage,
      };
    });
  } else {
    // Handle the case where only one promotion is uploaded
    let promoImg = null;
    if (
      typeof promotion_image !== 'undefined' &&
      Array.isArray(promotion_image) &&
      promotion_image.length > 0 &&
      promotion_image[0] !== ''
    ) {
      promoImg = req.files.promotion_image[0].filename;
    }

    PromotionalData = [
      {
        promotion_title: promotion_title,
        promotion_desc: promotion_desc,
        promotion_discount: promotion_discount,
        promotion_image: promoImg,
        // promotion_title: [promotion_title],
        // promotion_desc: [promotion_desc],     
        // promotion_discount: [promotion_discount], 
        // promotion_image: [promoImg],
      },
    ];
  }
  console.log("promotionData", PromotionalData)
  let coverImg = null;

  if (cover_image && cover_image.length > 0) {
    coverImg = cover_image[0].filename;
  } else {
    coverImg = previous_cover_image;
  }

  // Update company details in the company table
  const updateQuery = `
  UPDATE company 
  SET heading = ?, 
      logo = ?, 
      about_company = ?, 
      comp_phone = ?, 
      comp_email = ?, 
      updated_date = ?, 
      tollfree_number = ?, 
      main_address = ?, 
      operating_hours = ?
  WHERE ID = ?`;

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
    companyID,
  ];

  if (req.files.logo && req.files.logo.length > 0) {
    // Unlink (delete) the previous file
    const unlinkcompanylogo = "uploads/" + req.body.previous_logo;
    fs.unlink(unlinkcompanylogo, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      } else {
        console.log('Previous file deleted');
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
        message: 'An error occurred while updating the company details: ' + err,
      });
    } else {
      const check_sql = `SELECT * FROM premium_company_data WHERE company_id = ? `;
      const check_data = [companyID];
      db.query(check_sql, check_data, (check_err, check_result) => {
        if (check_err) {
          return res.send({
            status: 'err',
            data: '',
            message: 'An error occurred while processing your request',
          });
        } else {
          if (check_result.length > 0) {
            let gallery_img = [];

            if (check_result[0].gallery_img) {
              gallery_img = JSON.parse(check_result[0].gallery_img);

              if (!Array.isArray(gallery_img)) {
                gallery_img = [];
              }
            }
            if (galleryImages.length > 0) {
              galleryImages.forEach(function (img, index, arr) {
                gallery_img.push(img);
              });
            }

            const promotionSQL = JSON.parse(check_result[0].promotions);

            if (promotionSQL.length > 0) {
              promotionSQL.forEach(function (promotionImg, index, arr) {
                if (promotionImg.promotion_image != null) {
                  if (Array.isArray(promotion_image) && promotion_image.length > index && promotion_image[index] == '') {
                    PromotionalData[index].promotion_image =
                      promotionSQL[index].promotion_image;
                  }
                }
              });
            }
            const productSQL = JSON.parse(check_result[0].products);

            if (productSQL.length > 0) {
              productSQL.forEach(function (productImg, index, arr) {
                if (productImg.product_image != null) {
                  if (Array.isArray(product_image) &&
                    product_image.length > index &&
                    product_image[index] == '') {
                    ProductData[index].product_image =
                      productSQL[index].product_image;
                  }
                }
              });
            }
            const galleryimg = JSON.stringify(gallery_img);
            const Products = JSON.stringify(ProductData);
            const Promotion = JSON.stringify(PromotionalData);

            const update_query = `UPDATE premium_company_data SET cover_img = ?, gallery_img = ?, youtube_iframe = ?,promotions = ?, products = ?, facebook_url = ?, twitter_url = ?, instagram_url = ?, linkedin_url = ?, youtube_url = ?, support_email = ?, escalation_one = ?, escalation_two = ?, escalation_three = ? WHERE company_id = ? `;
            const update_data = [
              coverImg,
              galleryimg,
              youtube_iframe,
              Promotion,
              Products,
              facebook_url,
              twitter_url,
              instagram_url,
              linkedin_url,
              youtube_url,
              support_email,
              escalation_one,
              escalation_two,
              escalation_three,
              companyID,
            ];
            db.query(update_query, update_data, (update_err, update_result) => {
              if (update_err) {
                // Handle the error
                return res.send({
                  status: 'err',
                  data: '',
                  message:
                    'An error occurred while updating the company details: ' +
                    update_err,
                });
              } else {
                return res.send({
                  status: 'ok',
                  data: {
                    companyid: companyID,
                    data: update_data
                  },
                  message: 'Successfully Updated',
                });
              }
            });
          } else {
            const galleryimg = JSON.stringify(galleryImages);
            const Products = JSON.stringify(ProductData);
            const Promotion = JSON.stringify(PromotionalData);

            const premium_query = `INSERT INTO premium_company_data ( company_id, cover_img, gallery_img, youtube_iframe, promotions, products, facebook_url, twitter_url, instagram_url, linkedin_url, youtube_url, support_email, escalation_one, escalation_two, escalation_three) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const premium_data = [
              companyID,
              coverImg,
              galleryimg,
              youtube_iframe,
              Promotion,
              Products,
              facebook_url,
              twitter_url,
              instagram_url,
              linkedin_url,
              youtube_url,
              support_email,
              escalation_one,
              escalation_two,
              escalation_three,
            ];
            db.query(premium_query, premium_data, (premium_err, premium_result) => {
              if (premium_err) {
                // Handle the error
                return res.send({
                  status: 'err',
                  data: '',
                  message:
                    'An error occurred while updating the company details: ' +
                    premium_err,
                });
              } else {
                return res.send({
                  status: 'ok',
                  data: {
                    companyid: companyID,
                    data: premium_data,
                  },
                  message: 'Successfully Updated',
                });
              }
            });
          }
        }
      });
    }
  });
}

exports.BasicCompanyprofileManagement = (req, res) => {
  console.log('updateBasicCompany:', req.body);
  console.log('updateBasicCompany File:', req.file);
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
        console.error('Error deleting file:', err);
      } else {
        console.log('Previous file deleted');
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
      return res.send(
        {
          status: 'ok',
          data: companyID,
          message: 'Successfully Updated'
        }
      )
    }


  })
}

exports.reviewVoting = async (req, res) => {
  try {
    const authenticatedUserId = parseInt(req.user.user_id);
    console.log('authenticatedUserId: ', authenticatedUserId);
    const ApiuserId = parseInt(req.body.customer_id);
    if (isNaN(ApiuserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user_id provided in request body.',
      });
    }
    console.log('req.body.user_id: ', parseInt(req.body.customer_id));
    const { review_id, customer_id, voting } = req.body;
    console.log(req.body);
    console.log('user_id from request:', req.body.customer_id);
    if (ApiuserId !== authenticatedUserId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to update this user.',
      });
    }

    db.query(
      'SELECT voting FROM review_voting WHERE review_id = ? AND customer_id = ?',
      [review_id, customer_id],
      async (err, results) => {
        if (err) {
          return res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request' + err,
          });
        } else {
          const votedValues = results.map((result) => result.voting);

          if (votedValues.includes(voting)) {
            return res.status(400).json({
              status: 'error',
              message: 'You have already voted with this value for this review.',
            });
          } else {
            // User can vote with the specified value (0 or 1)
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
            const votingData = {
              review_id: review_id,
              customer_id: customer_id,
              voting: voting,
              created_at: formattedDate,
              updated_at: formattedDate,
            };
            db.query(
              'INSERT INTO review_voting SET ?',
              votingData,
              async (err, results) => {
                if (err) {
                  return res.status(500).json({
                    status: 'error',
                    message: 'An error occurred while processing your request' + err,
                  });
                } else {
                  console.log(results.insertId);
                  res.status(200).json({
                    status: 'success',
                    message: 'Vote recorded successfully.',
                  });
                }
              }
            );
          }
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred ' + error,
    });
  }
};
//create poll
exports.createPoll = async (req, res) => {
  try {
    // console.log('req.user:', req.user);
    // console.log('req.body:', req.body);

    const authenticatedUserId = parseInt(req.user.user_id);
    console.log('authenticatedUserId: ', authenticatedUserId);
    const ApiuserId = parseInt(req.body.user_id);
    if (isNaN(ApiuserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user_id provided in request body.',
      });
    }
    console.log('req.body.user_id: ', parseInt(req.body.user_id));
    console.log('createPoll', req.body);
    const { company_id, user_id, poll_question, poll_answer, expire_date } = req.body;
    console.log('user_id from request:', req.body.user_id);
    if (ApiuserId !== authenticatedUserId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to update this user.',
      });
    }
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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred ' + error,
    });
  }
};

//submit Survey
exports.submitSurvey = async (req, res) => {
  try {
    // console.log('req.user:', req.user);
    // console.log('req.body:', req.body);
    db.query(
      'SELECT * FROM survey_customer_answers WHERE survey_unique_id = ? AND customer_id = ?',
      [req.body.survey_unique_id, req.body.user_id],
      async (err, results) => {
        if (err) {
          return res.status(500).json({
            status: 'error',
            message: 'An error occurred while processing your request' + err,
          });
        } else {
          if (results.length > 0) {
            return res.status(500).json({
              status: 'error',
              message: 'You have already submitted this survey form',
            });
          } else {
            const authenticatedUserId = parseInt(req.user.user_id);
            console.log('authenticatedUserId: ', authenticatedUserId);
            const ApiuserId = parseInt(req.body.user_id);
            if (isNaN(ApiuserId)) {
              return res.status(400).json({
                status: 'error',
                message: 'Invalid user_id provided in request body.',
              });
            }
            console.log('req.body.user_id: ', parseInt(req.body.user_id));
            console.log('Survey', req.body);

            if (ApiuserId !== authenticatedUserId) {
              return res.status(403).json({
                status: 'error',
                message: 'Access denied: You are not authorized to update this user.',
              });
            }

            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // Months are zero-based (0 = January, 11 = December), so add 1
            const day = currentDate.getDate();
            const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;

            const surveyAnswerInsertData = [
              req.body.company_id,
              req.body.survey_unique_id,
              req.body.user_id,
              JSON.stringify(req.body.answers),
              formattedDate
            ];
            const sql = "INSERT INTO survey_customer_answers (company_id, survey_unique_id, customer_id, answer, created_at) VALUES (?, ?, ?, ?, ?)";

            db.query(sql, surveyAnswerInsertData, async (err, result) => {
              if (err) {
                return res.send({
                  status: 'error',
                  message: 'Something went wrong ' + err
                });
              } else {
                return res.send({
                  status: 'ok',
                  message: 'Your survey answer successfully submited'
                });
              }
            })
          }
        }
      }
    );

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred ' + error,
    });
  }
};

// Update poll expire date
exports.updatePollExpireDate = async (req, res) => {
  try {
    // const authenticatedUserId = parseInt(req.user.user_id);
    // console.log('authenticatedUserId: ', authenticatedUserId);
    // const ApiuserId = parseInt(req.body.user_id);
    // if (isNaN(ApiuserId)) {
    //   return res.status(400).json({
    //     status: 'error',
    //     message: 'Invalid user_id provided in request body.',
    //   });
    // }
    // console.log('req.body.user_id: ', parseInt(req.body.user_id));
    console.log('updatePollExpireDate', req.body);
    const { poll_id, change_expire_date, user_id } = req.body;
    // console.log('user_id from request:', req.body.user_id);
    // if (ApiuserId !== authenticatedUserId) {
    //   return res.status(403).json({
    //     status: 'error',
    //     message: 'Access denied: You are not authorized to update this user.',
    //   });
    // }
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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred ' + error,
    });
  }
}
// User polling
exports.userPolling = async (req, res) => {
  try {
    const authenticatedUserId = parseInt(req.user.user_id);
    console.log('authenticatedUserId: ', authenticatedUserId);
    const ApiuserId = parseInt(req.body.user_id);
    if (isNaN(ApiuserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user_id provided in request body.',
      });
    }
    console.log('req.body.user_id: ', parseInt(req.body.user_id));
    console.log('userPolling', req.body);
    const { ans_id, poll_id, user_id } = req.body
    console.log('user_id from request:', req.body.user_id);
    if (ApiuserId !== authenticatedUserId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to update this user.',
      });
    }
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const sql = `INSERT INTO poll_voting ( poll_id, answer_id, user_id, voting_date) VALUES (?, ?, ?, ?)`;
    const data = [poll_id, ans_id, user_id, formattedDate];
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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred ' + error,
    });
  }
}

//edit user review
exports.editUserReview = async (req, res) => {
  try {
    const authenticatedUserId = parseInt(req.user.user_id);
    const ApiuserId = parseInt(req.body.user_id);

    if (isNaN(ApiuserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user_id provided in request body.',
      });
    }

    if (ApiuserId !== authenticatedUserId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to update this user.',
      });
    }

    const { review_id, user_id, review_title, rating, review_content, user_privacy, tags } = req.body;
    console.log('Request Body:', req.body);
    console.log('Request Body:', req.body);

    // Check if the review exists and retrieve its creation date
    const reviewQuery = 'SELECT created_at FROM reviews WHERE id = ? AND customer_id=?';
    const reviewData = await query(reviewQuery, [review_id, user_id]);

    if (reviewData.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found.',
      });
    }

    const createdAt = new Date(reviewData[0].created_at);
    const currentDate = new Date();

    // Calculate the time difference in milliseconds
    const timeDifference = currentDate - createdAt;

    // Calculate the number of days
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

    // Check if the review is within the 30-day window
    if (daysDifference > 30) {
      return res.status(403).json({
        status: 'error',
        message: 'Review cannot be edited after 30 days.',
      });
    }

    // If the review is within the 30-day window, proceed with the update
    const reviewDataToUpdate = {
      review_id,
      review_title,
      rating,
      review_content,
      user_privacy,
      tags,
    };

    await comFunction.updateReview(reviewDataToUpdate);

    // Send a success response
    res.status(200).json({
      status: 'ok',
      message: 'Review edited successfully',
    });
  } catch (error) {
    console.error('Error editing review:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while editing the review',
    });
  }
};



exports.reviewInvitation = async (req, res) => {
  console.log("reviewInvitation", req.body);
  try {
    const authenticatedUserId = parseInt(req.user.user_id);
    console.log('authenticatedUserId: ', authenticatedUserId);
    const ApiuserId = parseInt(req.body.user_id);
    if (isNaN(ApiuserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user_id provided in request body.',
      });
    }
    console.log('req.body.user_id: ', parseInt(req.body.user_id));
    console.log('userPolling', req.body);
    const { emails, email_body, user_id, company_id, company_name } = req.body;
    console.log('user_id from request:', req.body.user_id);
    if (ApiuserId !== authenticatedUserId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not authorized to update this user.',
      });
    }
    const [InvitationDetails, sendInvitationEmail] = await Promise.all([
      comFunction.insertInvitationDetails(req.body),
      comFunction.sendInvitationEmail(req.body)
    ]);

    return res.send({
      status: 'ok',
      data: {
        InvitationDetails,
        sendInvitationEmail
      },
      message: 'Invitation emails send successfully'
    });
  } catch (error) {
    console.error('Error editing review:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while sending the invitation for reviews',
    });
  }
}


exports.userPoll = async (req, res) => {
  const authenticatedUserId = parseInt(req.user.user_id);
  const ApiuserId = parseInt(req.body.user_id);

  if (isNaN(ApiuserId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user_id provided in the request body.',
    });
  }
  if (ApiuserId !== authenticatedUserId) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: You are not authorized to update this user.',
    });
  }

  const { poll_id, user_id } = req.body;

  const queryTotalVotes = `
    SELECT COUNT(*) AS totalVotes
    FROM poll_voting
    WHERE poll_id = ?;
  `;

  // Check if the user has voted
  db.query(queryTotalVotes, [poll_id], (err, totalVotesResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while fetching total votes for the poll.',
      });
    }

    const totalVotes = totalVotesResult[0].totalVotes;

    const queryWhenUserHasVoted = `
      SELECT
        pc.id AS poll_id,
        pc.question AS poll_question,
        pc.poll_creator_id,
        pc.created_at AS poll_creation,
        pc.expired_at AS poll_expiration,
        CASE
          WHEN pv.user_id IS NOT NULL THEN pa.id
          ELSE NULL
        END AS answer_id,
        CASE
          WHEN pv.user_id IS NOT NULL THEN pa.answer
          ELSE NULL
        END AS answer_text,
        (
          SELECT COUNT(*)
          FROM poll_voting AS pv2
          WHERE pv2.poll_id = pc.id AND pv2.answer_id = pa.id
        ) AS vote_count
      FROM
        poll_company AS pc
      LEFT JOIN
        poll_voting AS pv ON pc.id = pv.poll_id AND pv.user_id = ?
      LEFT JOIN
        poll_answer AS pa ON pv.answer_id = pa.id AND pc.id = pa.poll_id
      WHERE
        pc.id = ? AND pv.user_id = ?;
    `;

    // Check if the user has voted
    db.query(queryWhenUserHasVoted, [ApiuserId, poll_id, ApiuserId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          status: 'error',
          message: 'An error occurred while fetching poll data.',
        });
      }

      if (results.length > 0) {
        const userSelectedAnswerId = results[0].answer_id;


        // If the user has voted, query for vote counts for all answers
        const queryVoteCountsForAllAnswers = `
  SELECT
  pa.id AS answer_id,
  pa.answer AS answer_text,
  COUNT(pv.answer_id) AS submittedVotes
FROM poll_answer AS pa
LEFT JOIN poll_voting AS pv ON pa.id = pv.answer_id
WHERE pa.poll_id = ?
GROUP BY pa.id, pa.answer;
  `;

        db.query(queryVoteCountsForAllAnswers, [poll_id, poll_id], (err, voteCounts) => {
          if (err) {
            console.error(err);
            return res.status(500).json({
              status: 'error',
              message: 'An error occurred while fetching vote counts for other answers.',
            });
          }

          const pollData = {
            poll_id: results[0].poll_id,
            poll_question: results[0].poll_question,
            poll_creator_id: results[0].poll_creator_id,
            totalVotes: totalVotes,
            // data: results.map((result) => ({
            //   id: result.answer_id,
            //   answer: result.answer_text,
            //   submittedVotes: result.vote_count,
            //   userSelected: result.answer_id !== null,
            // })),
            data: [],
            Answers: voteCounts.map((voteCount) => ({
              id: voteCount.answer_id,
              answer: voteCount.answer_text,
              submittedVotes: voteCount.submittedVotes,
            })),
            poll_created_at: results[0].poll_creation,
            poll_expired_at: results[0].poll_expiration,
          };
          if (userSelectedAnswerId !== null) {
            pollData.data.push({
              id: results[0].answer_id,
              answer: results[0].answer_text,
              //submittedVotes: results[0].vote_count,
              userSelected: true,
            });
          }
          return res.status(200).json({
            status: 'success',
            data: pollData,
            message: 'Poll data retrieved successfully.',
          });
        });
      } else {
        // If the user hasn't voted, query for poll data without vote details
        const queryWhenUserHasNotVoted = `
          SELECT
            pc.id AS poll_id,
            pc.question AS poll_question,
            pc.poll_creator_id,
            pc.created_at AS poll_creation,
            pc.expired_at AS poll_expiration,
            pa.id AS answer_id,
            pa.answer AS answer_text
          FROM
            poll_company AS pc
          LEFT JOIN
            poll_answer AS pa ON pc.id = pa.poll_id
          WHERE
            pc.id = ?;
        `;

        db.query(queryWhenUserHasNotVoted, [poll_id], (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).json({
              status: 'error',
              message: 'An error occurred while fetching poll data.',
            });
          }

          if (results.length > 0) {
            const pollData = {
              poll_id: results[0].poll_id,
              poll_question: results[0].poll_question,
              poll_creator_id: results[0].poll_creator_id,
              totalVotes: totalVotes,
              data: results.map((result) => ({
                id: result.answer_id,
                answer: result.answer_text,
                //submittedVotes: 0, // Initialize submittedVotes as 0 for answers when user hasn't voted
                userSelected: false,
              })),
              poll_created_at: results[0].poll_creation,
              poll_expired_at: results[0].poll_expiration,
            };

            return res.status(200).json({
              status: 'success',
              data: pollData,
              message: 'Poll data retrieved successfully.',
            });
          } else {
            return res.status(404).json({
              status: 'error',
              data: null,
              message: 'Poll data not found for the given user and poll ID.',
            });
          }
        });
      }
    });
  });
};



exports.createDiscussion = async (req, res) => {
  //console.log('createDiscussion', req.body);
  const { user_id, tags, topic, from_data, expiration_date } = req.body;

  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

  if (!topic.trim()) {
    return res.send({
      status: 'not ok',
      message: 'Topic is empty or only contains whitespace',
    });
  }
  // const topicData= topic?.trim() 
  // !topicData

  const sql = `INSERT INTO discussions (user_id, topic, tags, created_at, expired_at) VALUES (?, ?, ?, ?, ?)`;
  const data = [user_id, topic, JSON.stringify(tagsArray), formattedDate, expiration_date];

  db.query(sql, data, (err, result) => {
    console.log("tags", data);
    if (err) {
      return res.send({
        status: 'not ok',
        message: 'Something went wrong ' + err,
      });
    } else {
      return res.send({
        status: 'ok',
        data: data,
        message: 'Your Discussion Topic Added Successfully',
      });
    }

  });
}




//Add comment on discussion
exports.addDiscussionComment = async (req, res) => {
  //console.log('addDiscussionComment',req.body ); 
  const { discussion_id, comment } = req.body;

  const authenticatedUserId = parseInt(req.user.user_id);
  //console.log('authenticatedUserId: ', authenticatedUserId);

  const user_id = parseInt(req.body.user_id);
  //console.log('req.body.user_id: ', parseInt(req.body.user_id));

  if (user_id !== authenticatedUserId) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: You are not authorized to create a discussion topic for another user.',
    });
  }

  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  //const clientIp = req.clientIp;

  const Insertdata = {
    discussion_id: discussion_id,
    comment: comment,
    user_id: user_id,
    ip_address: requestIp.getClientIp(req),
    //ip_address : clientIp,
    created_at: formattedDate,
  };
  const insertQuery = 'INSERT INTO discussions_user_response SET ?';
  db.query(insertQuery, Insertdata, (insertErr, insertResult) => {
    if (insertErr) {
      return res.send({
        status: 'not ok',
        message: 'Something went wrong 3' + insertErr
      });
    } else {
      return res.send({
        status: 'ok',
        Insertdata: Insertdata,
        message: 'Your Comment Added Successfully'
      });
    }
  })

}

// --search Premium Company --//
exports.searchPremiumCompany = async (req, res) => {
  //console.log(req.body);
  const keyword = req.params.keyword; //Approved Company
  const get_company_query = `
  SELECT c.ID, c.company_name
  FROM company c
  WHERE c.company_name LIKE '%${keyword}%' AND status="1" AND c.membership_type_id >=3 AND c.complaint_status = '1'
  GROUP BY c.ID, c.company_name
  ORDER BY c.created_date DESC  
`;

  try {
    const get_company_results = await query(get_company_query);
    if (get_company_results.length > 0) {
      res.status(200).json({
        status: 'success',
        data: get_company_results,
        message: get_company_results.length + ' company data recived'
      });
      return { status: 'success', data: get_company_results, message: get_company_results.length + ' company data recived' };
    } else {
      res.status(200).json({ status: 'success', data: '', message: 'No company data found' });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while posting the request: ' + error
    });
  }
}

// --Complaint Companies Category Subcategory --//
exports.complaintCategorySubcategory = async (req, res) => {
  //console.log(req.body);
  const companyId = req.params.companyId; //Approved Company
  const get_company_query = `
  SELECT 
    parent.id AS parent_id,
    parent.category_name AS parent_name,
    child.id AS sub_category_id,
    child.category_name AS sub_category_name
    FROM 
        complaint_category parent
    LEFT JOIN 
        complaint_category child ON parent.id = child.parent_id
    WHERE 
        parent.parent_id = 0
        AND parent.company_id = ${companyId}; 
 
`;

  try {
    const get_company_results = await query(get_company_query);
    if (get_company_results.length > 0) {

      //const companyId = 1; // replace with the actual company id
      const companies = [];

      // Assuming 'rows' contains the result of the SQL query
      // You can replace this with the result object from your database library

      // Group data by parent category
      const groupedData = {};
      get_company_results.forEach(row => {
        if (!groupedData[row.parent_id]) {
          groupedData[row.parent_id] = {
            id: row.parent_id,
            name: row.parent_name,
            subCategories: [],
          };
        }

        if (row.sub_category_id) {
          groupedData[row.parent_id].subCategories.push({
            id: row.sub_category_id,
            name: row.sub_category_name,
          });
        }
      });

      // Organize data into the desired structure
      for (const key in groupedData) {
        if (groupedData.hasOwnProperty(key)) {
          companies.push(groupedData[key]);
        }
      }

      //console.log(companies);


      res.status(200).json({
        status: 'success',
        data: companies,
        message: get_company_results.length + ' company data recived'
      });
      return { status: 'success', data: get_company_results, message: get_company_results.length + ' company data recived' };
    } else {
      res.status(200).json({ status: 'success', data: '', message: 'No company data found' });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while posting the request: ' + error
    });
  }
}

// --Complaint listing by customer id --//
exports.complainListing = async (req, res) => {

  const userId = req.params.userId;
  const authenticatedUserId = parseInt(req.user.user_id);
  const ApiuserId = parseInt(req.params.userId);

  if (isNaN(ApiuserId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user_id provided in the request body.',
    });
  }
  if (ApiuserId !== authenticatedUserId) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: You are not authorized to update this user.',
    });
  }
  //console.log(req.body);
  const [getAllComplaintsByUserId] = await Promise.all([
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

  try {
    if (formattedCoplaintData.length > 0) {
      res.status(200).json({
        status: 'success',
        data: formattedCoplaintData,
        message: formattedCoplaintData.length + ' complaint data recived'
      });
      return { status: 'success', data: formattedCoplaintData, message: formattedCoplaintData.length + ' complaint data recived' };
    } else {
      res.status(200).json({ status: 'success', data: '', message: 'No complaint data found' });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while posting the request: ' + error
    });
  }
}

// --Complaint details by complaint id --//
exports.complainDetails = async (req, res) => {
  //console.log(req.body);
  const authenticatedUserId = parseInt(req.user.user_id);
  const ApiuserId = parseInt(req.params.userId);

  if (isNaN(ApiuserId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user_id provided in the request body.',
    });
  }
  if (ApiuserId !== authenticatedUserId) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: You are not authorized to update this user.',
    });
  }
  const complaintId = req.params.complaintId;
  const [getComplaintsByComplaintId, updateUserNotificationStatus] = await Promise.all([
    comFunction2.getAllComplaintsByComplaintId(complaintId),
    comFunction2.updateUserNotificationStatus(complaintId),
  ]);

  try {
    if (getComplaintsByComplaintId.length > 0) {
      res.status(200).json({
        status: 'success',
        data: getComplaintsByComplaintId[0],
        message: getComplaintsByComplaintId.length + ' complaint data recived'
      });
      return { status: 'success', data: getComplaintsByComplaintId, message: getComplaintsByComplaintId.length + ' complaint data recived' };
    } else {
      res.status(200).json({ status: 'success', data: '', message: 'No complaint data found' });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while posting the request: ' + error
    });
  }
}

//Insert user Complaint Response  to company
exports.userComplaintResponse = async (req, res) => {
  //console.log('userComplaintResponse',req.body ); 
  //return false;
  const authenticatedUserId = parseInt(req.user.user_id);
  const ApiuserId = parseInt(req.body.user_id);

  if (isNaN(ApiuserId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user_id provided in the request body.',
    });
  }
  if (ApiuserId !== authenticatedUserId) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: You are not authorized to update this user.',
    });
  }
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

//user Complaint Rating
exports.userComplaintRating = async (req, res) => {
  //console.log('userComplaintRating',req.body ); 
  //return false;
  const authenticatedUserId = parseInt(req.user.user_id);
  const ApiuserId = parseInt(req.body.user_id);

  if (isNaN(ApiuserId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user_id provided in the request body.',
    });
  }
  if (ApiuserId !== authenticatedUserId) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: You are not authorized to update this user.',
    });
  }
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

//Complaint Register
exports.complaintRegister = (req, res) => {
  //console.log('complaintRegister',req.body ); 
  const authenticatedUserId = parseInt(req.user.user_id);
  const ApiuserId = parseInt(req.body.user_id);
  if (isNaN(ApiuserId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user_id provided in the request body.',
    });
  }
  if (ApiuserId !== authenticatedUserId) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: You are not authorized to update this user.',
    });
  }

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
    purchase_date: transaction_date,
    purchase_place: location,
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
      const [complaintEmailToCompany, complaintSuccessEmailToUser] = await Promise.all([
        comFunction2.complaintEmailToCompany(company_id[0], ticket_no, result.insertId),
        comFunction2.complaintSuccessEmailToUser(user_id[0], ticket_no, result.insertId)
      ]);
      return res.send({
        status: 'ok',
        message: 'Complaint Registered  successfully !'
      });
    }
  })
}
