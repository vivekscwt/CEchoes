const express = require('express');
const db = require('../config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const comFunction2 = require('../common_function2');
const comFunction = require('../common_function');
const axios = require('axios');

// --countries --//
exports.countries = (req, res) => {
    //console.log(req.body);

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
                // return res.send(
                //     {
                //         status: 'ok',
                //         data: results,
                //         message: 'All state recived'
                //     }
                // )
                return res.status(200).json({
                    status: 'ok',
                    data: results,
                    message: 'All countries received',
                  });
            }
        }
    })
}

//-- States --//
exports.states = (req, res) => {
    //console.log(req.body);

    db.query('SELECT * FROM states WHERE country_id = ?', [req.body.country_id], async (err, results) => {
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
                return res.send(
                    {
                        status: 'ok',
                        data: results,
                        message: 'All state recived'
                    }
                )
            } else {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'State not avilable for this country id'
                    }
                )
            }
        }
    })
}

//--Company Category --//
exports.complainCategory = (req, res) => {
    console.log('complainCategory',req.body);
    //return false;
    db.query('SELECT * FROM complaint_category WHERE company_id = ? AND parent_id = 0 ', [req.body.company_id], async (err, results) => {
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
                return res.send(
                    {
                        status: 'ok',
                        data: results,
                        message: 'All category recived'
                    }
                )
            } else {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'Category is not avilable for this company id'
                    }
                )
            }
        }
    })
}

//-- complainSubCategory --//
exports.complainSubCategory = (req, res) => {
    //console.log('complainSubCategory',req.body);
    //return false;
    if (req.body.category_id == 0) {
        return res.send(
            {
                status: 'err',
                data: '',
                message: 'Sub Category is not avilable for this company id'
            }
        )
    }
    db.query('SELECT * FROM complaint_category WHERE  parent_id = ? ', [req.body.category_id], async (err, results) => {
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

                return res.send(
                    {
                        status: 'ok',
                        data: results,
                        message: 'All sub category recived'
                    }
                )
            } else {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'Sub Category is not avilable for this company id'
                    }
                )
            }
        }
    })
}

//-- company product --//
exports.companyProduct = (req, res) => {
    console.log('companyProduct',req.body);
    if (req.body.category_id == 0) {
        return res.send(
            {
                status: 'err',
                data: '',
                message: 'Productis not avilable on this category'
            }
        )
    }
    //return false;
    db.query(`SELECT * FROM company_products WHERE category_id = ? OR  parent_id = ? `, [req.body.category_id, req.body.category_id], async (err, results) => {
        if (err) {
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + err
                }
            )
        } else {
            console.log(results);
            if (results.length > 0) {
            
                return res.send(
                    {
                        status: 'ok',
                        data: results,
                        message: 'All product recived'
                    }
                )
            } else {
                return res.send(
                    {
                        status: 'err',
                        data: '',
                        message: 'Productis not avilable on this category'
                    }
                )
            }
        }
    })
}

// --searchCompany --//
exports.searchCompany = async (req, res) => {
    //console.log(req.body);
    const keyword = req.body.keyword; //Approved Company
    const CompanyResponse = await comFunction.searchCompany(keyword);
    if(CompanyResponse.status == 'ok'){
        res.status(200).json(CompanyResponse);
    }else{
        res.status(404).json(CompanyResponse);
    }

}

// --search Discussion --//
exports.searchDiscussion = async (req, res) => {
    console.log('req.body');
    const keyword = req.body.keyword; //Approved Company
    const CompanyResponse = await comFunction2.searchDiscussion(keyword);
    if(CompanyResponse.status == 'ok'){
        res.status(200).json(CompanyResponse);
    }else{
        res.status(404).json(CompanyResponse);
    }

}

//-- Profile Edit --//
exports.editProfile = (req, res) => {
    //console.log(req.body);
    const encodedUserData = req.cookies.user;
    const userData = JSON.parse(encodedUserData);
    const userId = userData.user_id;

    const checkQuery = 'SELECT user_id FROM users WHERE phone = ? AND user_id <> ?';
    db.query(checkQuery, [req.body.phone, userId], (checkError, checkResults) => {
        if (checkError) {
            //console.log(checkError)
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'An error occurred while processing your request' + checkError
                }
            )
        }

        if (checkResults.length > 0) {
            // Phone number already exists for another user
            return res.send(
                {
                    status: 'err',
                    data: '',
                    message: 'Phone number already exists for another user'
                }
            )
        } else {
            // Update the user's data
            const updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE user_id = ?';
            db.query(updateQuery, [req.body.first_name, req.body.last_name, req.body.phone, userId], (updateError, updateResults) => {

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
                        const unlinkprofilePicture = "uploads/"+userData.profile_pic;
                        fs.unlink(unlinkprofilePicture, (err) => {
                            if (err) {
                                //console.error('Error deleting file:', err);
                              } else {
                                //console.log('Previous file deleted');
                              }
                        });
                        //const profilePicture = req.file;
                        //console.log(profilePicture);

                        const updateQueryMeta = 'UPDATE user_customer_meta SET address = ?, country = ?, state = ?, city = ?, zip = ?, date_of_birth = ?, occupation = ?, gender = ?, profile_pic = ? WHERE user_id = ?';
                        db.query(updateQueryMeta, [req.body.address, req.body.country, req.body.state, req.body.city, req.body.zip, req.body.date_of_birth, '', req.body.gender, req.file.filename, userId], (updateError, updateResults) => {
                            if (updateError){
                                return res.send(
                                    {
                                        status: 'err',
                                        data: '',
                                        message: 'An error occurred while processing your request' + updateError
                                    }
                                )
                            }else{
                                const userupdatedData = {
                                    user_id: userId,
                                    first_name: req.body.first_name,
                                    last_name: req.body.last_name,
                                    email: userData.email,
                                    phone: req.body.phone,
                                    user_type_id: userData.user_type_id,
                                    address: req.body.address,
                                    country: req.body.country,
                                    country_name: req.body.country_name,
                                    state: req.body.state,
                                    state_name: req.body.state_name,
                                    city: req.body.city,
                                    zip: req.body.zip,
                                    review_count: userData.review_count,
                                    date_of_birth: req.body.date_of_birth,
                                    occupation: userData.occupation,
                                    gender: req.body.gender,
                                    profile_pic: req.file.filename
                                };
                                const encodedUserData = JSON.stringify(userupdatedData);
                                res.cookie('user', encodedUserData);
                                return res.send(
                                    {
                                        status: 'ok',
                                        data: userupdatedData,
                                        message: 'Update Successfull'
                                    }
                                )
                            }
                        });

                    } else {
                        const updateQueryMeta = 'UPDATE user_customer_meta SET address = ?, country = ?, state = ?, city = ?, zip = ?, date_of_birth = ?, occupation = ?, gender = ? WHERE user_id = ?';
                        db.query(updateQueryMeta, [req.body.address, req.body.country, req.body.state, req.body.city, req.body.zip, req.body.date_of_birth, '', req.body.gender, userId], (updateError, updateResults) => {
                            if (updateError){
                                return res.send(
                                    {
                                        status: 'err',
                                        data: '',
                                        message: 'An error occurred while processing your request' + updateError
                                    }
                                )
                            }else{
                                const userupdatedData = {
                                    user_id: userId,
                                    first_name: req.body.first_name,
                                    last_name: req.body.last_name,
                                    email: userData.email,
                                    phone: req.body.phone,
                                    user_type_id: userData.user_type_id,
                                    address: req.body.address,
                                    country: req.body.country,
                                    country_name: req.body.country_name,
                                    state: req.body.state,
                                    state_name: req.body.state_name,
                                    city: req.body.city,
                                    zip: req.body.zip,
                                    review_count: userData.review_count,
                                    date_of_birth: req.body.date_of_birth,
                                    occupation: userData.occupation,
                                    gender: req.body.gender,
                                    profile_pic: userData.profile_pic
                                };
                                const encodedUserData = JSON.stringify(userupdatedData);
                                res.cookie('user', encodedUserData);
                                return res.send(
                                    {
                                        status: 'ok',
                                        data: userupdatedData,
                                        message: 'Update Successfull'
                                    }
                                )
                            }
                        });
                    }

                }



            });
        }
    });
}