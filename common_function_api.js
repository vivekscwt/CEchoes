const util = require('util');
const db = require('./config');
const mysql = require('mysql2/promise');
const mdlconfig = require('./config-module');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const useragent = require('useragent');
const requestIp = require('request-ip');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { cache } = require('ejs');
const { stringify } = require('querystring');

dotenv.config({ path: './.env' });
const query = util.promisify(db.query).bind(db);
// Fetch user details from the users table
function getUser(userId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE user_id = ?', [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

// Function to fetch user metadata from the user_customer_meta table
function getUserMeta(userId) {
  return new Promise((resolve, reject) => {
    const user_meta_query = `
            SELECT user_meta.*, c.name as country_name, s.name as state_name
            FROM user_customer_meta user_meta
            LEFT JOIN countries c ON user_meta.country = c.id
            LEFT JOIN states s ON user_meta.state = s.id
            WHERE user_id = ?
        `;
    db.query(user_meta_query, [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

async function getUsersByRole(roleID) {
  const get_users_query = `
    SELECT *
    FROM users
    WHERE user_type_id = ? AND user_status = "1"`;
  const get_users_value = [roleID];
  try {
    const get_users_result = await query(get_users_query, get_users_value);
    return get_users_result;
  } catch (error) {
    return 'Error during user get_company_rewiew_query:' + error;
  }
}

// Fetch all countries
function getCountries() {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM countries', (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
//fetch all states by its country_id
function getStates(countryID) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM  states WHERE country_id=?', [countryID], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  })
}



// Fetch user role from user_account_type table data
function getUserRoles() {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM user_account_type', (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Fetch user all states by country
function getStatesByUserID(userId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT country FROM user_customer_meta WHERE user_id = ?', [userId], async (err, result) => {
      if (err) {
        reject(err);
      } else {
        //console.log('Result:', result); // Log the result array
        if (result && result.length > 0) {
          console.log(result[0].country);
          let countryID = '';
          if (result[0].country == null) {
            countryID = 101;
          } else {
            countryID = result[0].country;
          }
          const userCountryId = countryID.toString();
          db.query('SELECT * FROM states WHERE country_id = ?', [userCountryId], async (err, results) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        } else {
          reject(new Error('User country not found'));
        }
      }
    });
  });
}

// Fetch all Company
function getAllCompany() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories
      FROM company c
      LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
      LEFT JOIN category cat ON cr.category_id = cat.ID
      GROUP BY c.ID`,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
  });
}

function getCompany(companyId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT company.*, ccr.claimed_by, mp.plan_name as membership_plan_name FROM company LEFT JOIN company_claim_request ccr ON company.ID = ccr.company_id LEFT JOIN membership_plans mp ON company.membership_type_id = mp.id WHERE company.ID = ?', [companyId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

async function getCompanyCategory() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE
    });

    const [categories] = await connection.query('SELECT * FROM category');
    //console.log(categories);
    connection.end();
    const nestedCategories = buildCategoryTree(categories);   // This is the Json Format Of All Categories
    const nestedCategoriesHTML = renderCategoryTreeHTML(nestedCategories);

    return nestedCategoriesHTML;
  } catch (error) {
    throw new Error('Error fetching company categories');
  }
}

function buildCategoryTree(categories, parentId = 0) {
  const categoryTree = [];

  categories.forEach((category) => {
    if (category.parent_id === parentId) {
      const children = buildCategoryTree(categories, category.ID);
      const categoryNode = { id: category.ID, name: category.category_name, img: category.category_img, children };
      categoryTree.push(categoryNode);
    }
  });

  return categoryTree;
}

function renderCategoryTreeHTML(categories) {
  let html = '<ul>';
  categories.forEach(function (category) {
    html += '<li class="mt-5"><div class="mb-5"><div class="form-check"><input type="checkbox" name="category" class="form-check-input" value="' + category.id + '"><label class="form-check-label" for="flexCheckDefault">' + category.name + '</label>';
    if (category.children.length > 0) {
      html += renderCategoryTreeHTML(category.children);
    }
    html += '</div></div></li>';
  });
  html += '</ul>';
  return html;
}

async function getCompanyCategoryBuID(compID) {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE
    });

    const [categories] = await connection.query('SELECT * FROM category');

    const [com_categories] = await connection.query('SELECT category_id FROM company_cactgory_relation WHERE company_id = ?', [compID]);

    const com_category_array = com_categories.map((category) => category.category_id);

    //console.log(com_category_array);
    connection.end();
    const nestedCategories = buildCategoryTree(categories);   // This is the Json Format Of All Categories
    const nestedCategoriesHTMLwithChecked = renderCategoryTreeHTMLforCompany(nestedCategories, com_category_array);

    return nestedCategoriesHTMLwithChecked;
  } catch (error) {
    throw new Error('Error fetching company categories');
  }
}

function renderCategoryTreeHTMLforCompany(categories, com_category_array) {
  let html = '<ul>';
  categories.forEach(function (category) {
    if (com_category_array.includes(category.id)) {
      var inputchecked = 'checked';
    } else {
      var inputchecked = '';
    }
    html += '<li class="mt-5"><div class="mb-5"><div class="form-check"><input type="checkbox" name="category" class="form-check-input" value="' + category.id + '" ' + inputchecked + '><label class="form-check-label" for="flexCheckDefault">' + category.name + '</label>';
    if (category.children.length > 0) {
      html += renderCategoryTreeHTMLforCompany(category.children, com_category_array);
    }
    html += '</div></div></li>';
  });
  html += '</ul>';
  return html;
}

//-------After Google Login Save User data Or Check User exist or Not.
const saveUserGoogleLoginDataToDB = async (userData) => {
  //console.log(userData);
  //console.log(userData.name.familyName + ' ' + userData.name.givenName + ' ' + userData.emails[0].value + ' ' + userData.photos[0].value+ ' ' + userData.id);

  try {
    // Check if the email already exists in the "users" table
    const emailExists = await new Promise((resolve, reject) => {
      db.query('SELECT email FROM users WHERE email = ?', [userData.emails[0].value], (err, results) => {
        if (err) reject(err);
        resolve(results.length > 0);
      });
    });
    if (emailExists) {
      try {
        const gEmail = userData.emails[0].value;
        const userSearchQuery = 'SELECT * FROM users WHERE email = ?';
        const userResults = await query(userSearchQuery, [gEmail]);
        if (userResults.length > 0) {
          //console.log('Glogin user data', userResults);
          const userMatch = userResults[0];
          try {
            const matchUserID = userMatch.user_id;
            const userMetaSearchQuery = `SELECT user_meta.*, c.name as country_name, s.name as state_name
                                            FROM user_customer_meta user_meta
                                            JOIN countries c ON user_meta.country = c.id
                                            JOIN states s ON user_meta.state = s.id
                                            WHERE user_id = ?`;
            const userMetaResults = await query(userMetaSearchQuery, [matchUserID]);
            let usercookieData = {};
            if (userMetaResults.length > 0) {
              const matchUserMetaData = userMetaResults[0];
              const dateString = matchUserMetaData.date_of_birth;
              const date_of_birth_date = new Date(dateString);
              const formattedDate = date_of_birth_date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
              usercookieData = {
                user_id: matchUserID,
                first_name: userMatch.first_name,
                last_name: userMatch.last_name,
                email: userMatch.email,
                phone: userMatch.phone,
                user_type_id: userMatch.user_type_id,
                address: matchUserMetaData.address,
                country: matchUserMetaData.country,
                country_name: matchUserMetaData.country_name,
                state: matchUserMetaData.state,
                state_name: matchUserMetaData.state_name,
                city: matchUserMetaData.city,
                zip: matchUserMetaData.zip,
                review_count: matchUserMetaData.review_count,
                date_of_birth: formattedDate,
                occupation: matchUserMetaData.occupation,
                gender: matchUserMetaData.gender,
                profile_pic: matchUserMetaData.profile_pic,
                source: 'gmail'
              };
              console.log(usercookieData, 'Logedin User All Data 111');
            } else {
              usercookieData = {
                user_id: matchUserID,
                first_name: userMatch.first_name,
                last_name: userMatch.last_name,
                email: userMatch.email,
                phone: userMatch.phone,
                user_type_id: userMatch.user_type_id,
                profile_pic: userData.photos[0].value,
                source: 'gmail'
              };
              console.log(usercookieData, 'Logedin User All Data 222');
            }

            try {
              const wpUserSearchQuery = 'SELECT ID FROM bg_users WHERE user_login = ?';
              const wpUserResults = await query(wpUserSearchQuery, [gEmail]);
              if (wpUserResults.length > 0) {
                //console.log(wpUserResults, 'Wp User Query Result');
                usercookieData.wp_user_id = wpUserResults[0].ID;
              }
              console.log(usercookieData, 'Final Return data');
              return usercookieData;
            } catch (error) {
              console.error('Error executing SELECT wpUserSearchQuery:', error);
            }


          } catch (error) {
            console.error('Error executing SELECT userMetaSearchQuery:', error);
          }
        }
      } catch (error) {
        console.error('Error executing SELECT userSearchQuery:', error);
      }

    } else {
      try {
        // Hash the password asynchronously
        const hashedPassword = await bcrypt.hash(userData.emails[0].value, 8);
        const currentDate = new Date();

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const insertUser = (query, values) => {
          return new Promise((resolve, reject) => {
            db.query(query, values, (err, results) => {
              if (err) reject(err);
              resolve(results);
            });
          });
        };

        const userInsertQuery = 'INSERT INTO users (first_name, last_name, email, password, register_from, external_registration_id, user_registered, user_status, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const userResults = await insertUser(userInsertQuery, [userData.name.givenName, userData.name.familyName, userData.emails[0].value, hashedPassword, 'google', userData.id, formattedDate, 1, 2]);

        const registeredUserID = userResults.insertId;

        // Insert the user into the "user_customer_meta" table
        const userMetaInsertQuery = 'INSERT INTO user_customer_meta (user_id, address, country, state, city, zip, review_count, date_of_birth, occupation, gender, profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await insertUser(userMetaInsertQuery, [registeredUserID, '', '', '', '', '', 0, '', '', '', userData.photos[0].value]);

        try {
          let userRegistrationData = {
            user_id: registeredUserID,
            username: userData.emails[0].value,
            password: userData.emails[0].value,
            first_name: userData.name.givenName,
            last_name: userData.name.familyName,
            email: userData.emails[0].value,
            profile_pic: userData.photos[0].value,
            source: 'gmail'
          };
          const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData);
          userRegistrationData.wp_user_id = response.data.user_id;
          console.log(userRegistrationData);
          return userRegistrationData;
        } catch (error) {
          console.error('Error during user registration:', error);
          throw error; // Re-throw the error to be caught in the calling function if needed
        }
      } catch (error) {
        console.error('Error during user registration:', error);
        throw error; // Re-throw the error to be caught in the calling function if needed
      }
    }
  }
  catch (error) {
    console.error('Error during user registration:', error);
  }
};

//-------After Facebook Login Save User data Or Check User exist or Not.
async function saveUserFacebookLoginDataToDB(userData) {
  console.log(userData);
  console.log(userData.id + ' ' + userData.displayName + ' ' + userData.photos[0].value);
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  //Checking external_registration_id exist or not and register_from facebook or not
  try {
    const user_exist_query = 'SELECT * FROM users WHERE register_from = ? AND external_registration_id = ? AND email = ?';
    const user_exist_values = ["facebook", userData.id, userData.emails[0].value];
    const user_exist_results = await query(user_exist_query, user_exist_values);
    if (user_exist_results.length > 0) {
      //console.log(user_exist_results);
      // checking user status
      if (user_exist_results[0].user_exist_results == 1) {
        return { first_name: user_exist_results[0].first_name, last_name: user_exist_results[0].last_name, user_id: user_exist_results[0].user_id, status: 1 };
      } else {
        // return to frontend for registering with email ID
        return { first_name: user_exist_results[0].first_name, last_name: user_exist_results[0].last_name, user_id: user_exist_results[0].user_id, status: 0 };
      }
    } else {
      //user doesnot exist Insert initial data getting from facebook but user status 0
      const userFullName = userData.displayName;
      const userFullNameArray = userFullName.split(" ");
      const userFirstName = userData.name.givenName;
      const userLastName = userData.name.familyName;
      const userEmail = userData.emails[0].value;
      const user_insert_query = 'INSERT INTO users (first_name, last_name, email, register_from, external_registration_id, user_registered, user_status, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const user_insert_values = [userFirstName, userLastName, userEmail, 'facebook', userData.id, formattedDate, 0, 2];
      if (userEmail) {
        user_insert_values[6] = 1;
      } else {
        user_insert_values[6] = 0;
      }
      try {
        const user_insert_results = await query(user_insert_query, user_insert_values);
        if (user_insert_results.insertId) {
          const newuserID = user_insert_results.insertId;
          const user_meta_insert_query = 'INSERT INTO user_customer_meta (user_id, profile_pic) VALUES (?, ?)';
          const user_meta_insert_values = [newuserID, userData.photos[0].value];
          try {
            const user_meta_insert_results = await query(user_meta_insert_query, user_meta_insert_values);
            // return to frontend for registering with email ID
            return { first_name: userFullNameArray[0], last_name: userFullNameArray[1], user_id: newuserID, status: 0 };
          } catch (error) {
            console.error('Error during user_meta_insert_query:', error);
          }
        }
      } catch (error) {
        console.error('Error during user_insert_query:', error);
      }
    }
  } catch (error) {
    console.error('Error during user_exist_query:', error);
  }

};

// Fetch all Review Rating Tags
function getAllRatingTags() {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM review_rating_tags', (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function getReviewRatingData(review_rating_Id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM review_rating_tags WHERE id = ?', [review_rating_Id], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

async function getAllReviews() {
  const all_review_query = `
  SELECT r.*, c.company_name, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic, rr.comment AS reply_comment, rr.reply_by, rr.reply_to, rr.status, rr.reason, rr.created_at as rr_created_at, rr.updated_at as rr_updated_at
  FROM reviews r
  JOIN company c ON r.company_id = c.ID
  JOIN company_location cl ON r.company_location_id = cl.ID
  JOIN users u ON r.customer_id = u.user_id
  LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
  LEFT JOIN review_reply rr ON r.ID = rr.review_id
  WHERE r.review_status = "1"
  ORDER BY r.created_at DESC;
  `;
  try {
    const all_review_results = await query(all_review_query);
    return all_review_results;

  }
  catch (error) {
    console.error('Error during all_review_query:', error);
  }
}


async function getTrendingReviews() {
  const all_review_query = `
  SELECT r.*, c.company_name, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic,rr.comment AS reply_comment, rr.reply_by, rr.reply_to, rr.status, rr.reason, rr.created_at as rr_created_at, rr.updated_at as rr_updated_at
    FROM reviews r
    JOIN company c ON r.company_id = c.ID
    JOIN company_location cl ON r.company_location_id = cl.ID
    JOIN users u ON r.customer_id = u.user_id
    LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
    LEFT JOIN review_reply rr ON r.ID = rr.review_id
    WHERE c.trending = "1" AND r.review_status = "1"
    ORDER BY r.created_at DESC;
`;

  try {
    const all_review_results = await query(all_review_query);
    console.log(all_review_results);
    return all_review_results;
  }
  catch (error) {
    console.error('Error during all_review_query:', error);
  }
}

// async function getTrendingReviews(){
//   const get_latest_review_query = `
//     SELECT r.*, c.company_name, c.logo, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, 
//     u.last_name, u.user_id, u.user_status, ucm.profile_pic, COUNT(review_reply.id) as review_reply_count
//       FROM reviews r
//       LEFT JOIN company c ON r.company_id = c.ID 
//       LEFT JOIN company_location cl ON r.company_location_id = cl.ID 
//       LEFT JOIN users u ON r.customer_id = u.user_id 
//       LEFT JOIN user_customer_meta ucm ON ucm.user_id = u.user_id 
//       LEFT JOIN review_reply ON review_reply.review_id = r.id
//       WHERE r.review_status = "1" AND c.status = "1" AND c.trending = "1"
//       GROUP BY r.id
//       ORDER BY r.created_at DESC
//   `;
//   try{
//     const get_latest_review_results = await query(get_latest_review_query);
//     if(get_latest_review_results.length > 0 ){
//       //console.log(get_latest_review_results);
//       return get_latest_review_results;
//     }else{
//       return [];
//     }
//   }catch(error){
//     console.error('Error during user get_latest_review_query:', error);
//   }

// }

async function getLatestReview(limit = null) {
  const all_review_query = `
    SELECT r.*, c.company_name, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic, rr.comment AS reply_comment, rr.reply_by, rr.reply_to, rr.status, rr.reason, rr.created_at as rr_created_at, rr.updated_at as rr_updated_at
      FROM reviews r
      JOIN company c ON r.company_id = c.ID
      JOIN company_location cl ON r.company_location_id = cl.ID
      JOIN users u ON r.customer_id = u.user_id
      LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
      LEFT JOIN review_reply rr ON r.ID = rr.review_id
      WHERE r.review_status = "1"
      ORDER BY r.created_at DESC
      ${limit !== null ? `LIMIT ${limit}` : ''};
  `;
  try {
    const all_review_results = await query(all_review_query);
    return all_review_results;
  } catch (error) {
    console.error('Error during all_review_query:', error);
    throw error;
  }
}

async function getCustomerReviewData(review_Id) {
  const select_review_query = `
    SELECT r.*, c.company_name, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic
      FROM reviews r
      JOIN company c ON r.company_id = c.ID
      JOIN company_location cl ON r.company_location_id = cl.ID
      JOIN users u ON r.customer_id = u.user_id
      LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
      WHERE r.id = ?;
  `;
  const select_review_value = [review_Id];
  try {
    const select_review_results = await query(select_review_query, select_review_value);
    return select_review_results[0];
  }
  catch (error) {
    console.error('Error during select_review_query:', error);
  }
}

async function getCustomerReviewTagRelationData(review_Id) {
  const select_review_tag_query = `
    SELECT r.id as review_id, rtr.id, rtr.tag_name
      FROM reviews r
      JOIN review_tag_relation rtr ON r.id = rtr.review_id
      WHERE r.id = ?;
  `;
  const select_review_tag_value = [review_Id];
  try {
    const select_review_tag_results = await query(select_review_tag_query, select_review_tag_value);
    return select_review_tag_results;
  }
  catch (error) {
    console.error('Error during select_review_tag_query:', error);
  }
}

function getMetaValue(pageID, page_meta_key) {
  //console.log(pageID + ' ' + page_meta_key);
  db.query(`SELECT page_meta_value FROM page_meta  WHERE page_id  = ${pageID} AND  page_meta_key  =  '${page_meta_key}' `, async (err, result) => {
    if (err) {
      //reject(err);
      console.log(err)
    } else {
      //console.log('Result:', result); // Log the result array
      if (result && result.length > 0) {
        const meta_values = result[0];
        return result;
      }
    }
  });

}

// Function to insert data into 'faq_pages' table
async function insertIntoFaqPages(data) {
  try {
    const checkQuery = `SELECT * FROM faq_pages WHERE 1`;
    db.query(checkQuery, async (checkErr, checkResult) => {
      if (checkResult.length > 0) {
        const updateQuery = `UPDATE faq_pages SET title=?, content = ?, meta_title = ?, meta_desc = ?, keyword = ? WHERE id = ${checkResult[0].id}`;
        const results = await query(updateQuery, data);
        return checkResult[0].id;
      } else {
        const insertQuery = 'INSERT INTO faq_pages (title, content, meta_title, meta_desc, keyword) VALUES (?, ?, ?, ?, ?)';
        const results = await query(insertQuery, data);
        return results.insertId;
      }
    })


  } catch (error) {
    console.error('Error inserting data into faq_pages table:', error);
    throw error;
  }
}

// Function to insert data into 'faq_categories' table
async function insertIntoFaqCategories(categoryArray) {
  if (Array.isArray(categoryArray) && categoryArray.length > 0) {
    for (const categoryData of categoryArray) {

      try {
        const categoryTitle = Object.keys(categoryData)[0];
        const CatinsertQuery = `INSERT INTO faq_categories (category) VALUES (?)`;
        const Catinsertvalues = [categoryTitle];
        const results = await query(CatinsertQuery, Catinsertvalues);
        const categoryId = results.insertId;
        console.log('Data inserted into faq_categories table:', categoryId);

        // Insert data into 'faq_item' table for the current category
        if (categoryData[categoryTitle].length > 0) {
          await insertIntoFaqItems(categoryData[categoryTitle], categoryId);
        }
      } catch (error) {
        console.error('Error inserting data into faq_categories table:', error);
        throw error;
      }
    }
  }
}

// Function to insert data into 'faq_item' table
async function insertIntoFaqItems(faqItemsArray, categoryId) {
  if (Array.isArray(faqItemsArray) && faqItemsArray.length > 0) {
    for (const faqItemData of faqItemsArray) {
      try {
        const FAQItenInsertquery = `INSERT INTO faq_item (category_id, question, answer) VALUES (?, ?, ?)`;
        const FAQItenInsertvalues = [categoryId, faqItemData.Q, faqItemData.A];

        const results = await query(FAQItenInsertquery, FAQItenInsertvalues);
        console.log('Data inserted into faq_item table:', results.insertId);
      } catch (error) {
        console.error('Error inserting data into faq_item table:', error);
        throw error;
      }
    }
  }
}

//-- Create New Company ----------//
async function createCompany(comInfo, userId) {
  //console.log(comInfo, userId);
  let return_data = {};
  try {
    // Check if the company Name already exists in the "company" table
    const company_name_checking_query = "SELECT ID FROM company WHERE company_name = ?";
    const company_name_checking_results = await query(company_name_checking_query, [comInfo.company_name]);
    if (company_name_checking_results.length > 0) {
      //company exist
      try {
        const company_address_exist_query = 'SELECT * FROM company_location WHERE company_id = ? AND address = ?';
        const company_address_exist_values = [company_name_checking_results[0].ID, comInfo.address];
        const company_address_exist_results = await query(company_address_exist_query, company_address_exist_values);
        if (company_address_exist_results.length > 0) {
          //address exist return location ID
          return_data.companyID = company_name_checking_results[0].ID;
          return_data.companyLocationID = company_address_exist_results[0].ID;
          return return_data;
        } else {
          //create new address for company
          try {
            const create_company_address_query = 'INSERT INTO company_location (company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const create_company_address_values = [company_name_checking_results[0].ID, comInfo.address, '', '', '', '', '2'];
            const create_company_address_results = await query(create_company_address_query, create_company_address_values);
            if (create_company_address_results.insertId) {
              return_data.companyID = company_name_checking_results[0].ID;
              return_data.companyLocationID = create_company_address_results.insertId;
              return return_data;
            }
          } catch (error) {
            console.error('Error during create_company_address_query:', error);
            return error;
          }

        }
      } catch (error) {
        console.error('Error during company_address_exist_query:', error);
        return error;
      }
      //return company_name_checking_results[0].ID;
    } else {
      // Create New Company
      // Get the current date
      const currentDate = new Date();

      // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
      const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
      try {
        const create_company_query = 'INSERT INTO company (user_created_by, company_name, status, created_date, updated_date, main_address, verified) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const create_company_values = [userId, comInfo.company_name, '2', formattedDate, formattedDate, comInfo.address, '0'];
        const create_company_results = await query(create_company_query, create_company_values);
        // console.log('New Company:', create_company_results);
        // console.log('New Company ID:', create_company_results.insertId);
        if (create_company_results.insertId) {
          //create new address for company
          try {
            const create_company_address_query = 'INSERT INTO company_location (company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const create_company_address_values = [create_company_results.insertId, comInfo.address, '', '', '', '', '2'];
            const create_company_address_results = await query(create_company_address_query, create_company_address_values);
            if (create_company_address_results.insertId) {
              return_data.companyID = create_company_results.insertId;
              return_data.companyLocationID = create_company_address_results.insertId;
              return return_data;
            }
          } catch (error) {
            console.error('Error during create_company_address_query:', error);
            return error;
          }
        }
      } catch (error) {
        console.error('Error during user create_company_query:', error);
        return error;
      }
    }
  }
  catch (error) {
    console.error('Error during user company_name_checking_query:', error);
  }
};

async function createReview(reviewIfo, userId, comInfo) {
  // console.log('Review Info', reviewIfo);
  // console.log('Company Info', comInfo);
  // reviewIfo['tags[]'].forEach((tag) => {
  //   console.log(tag);
  // });
  if (typeof reviewIfo['tags[]'] === 'string') {
    // Convert it to an array containing a single element
    reviewIfo['tags[]'] = [reviewIfo['tags[]']];
  }
  const currentDate = new Date();
  // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  const create_review_query = 'INSERT INTO reviews (company_id, customer_id, company_location, company_location_id, review_title, rating, review_content, user_privacy, review_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const create_review_values = [comInfo.companyID, userId, reviewIfo.address, comInfo.companyLocationID, reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, formattedDate];

  try {
    const create_review_results = await query(create_review_query, create_review_values);
    if (create_review_results.insertId) {
      //insert review_tag_relation
      const review_tag_relation_query = 'INSERT INTO review_tag_relation (review_id, tag_name) VALUES (?, ?)';
      try {
        for (const tag of reviewIfo['tags[]']) {
          const review_tag_relation_values = [create_review_results.insertId, tag];
          const review_tag_relation_results = await query(review_tag_relation_query, review_tag_relation_values);
        }

        //-- user review count------//
        const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
        try {
          const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
          return create_review_results.insertId;
        } catch (error) {
          console.error('Error during user update_review_count_query:', error);
        }

      } catch (error) {
        console.error('Error during user review_tag_relation_results:', error);
      }
    }
  } catch (error) {
    console.error('Error during user create_review_results:', error);
  }
}

async function getlatestReviews(reviewCount) {
  const get_latest_review_query = `
    SELECT r.*, c.company_name, c.logo, cl.address, cl.country, cl.state, cl.city, cl.zip
      FROM reviews r
      JOIN company c ON r.company_id = c.ID AND c.status = "1"
      JOIN company_location cl ON r.company_location_id = cl.ID AND cl.status = "1"
      WHERE r.review_status = "1"
      ORDER BY r.created_at DESC
      LIMIT ${reviewCount};
  `;
  try {
    const get_latest_review_results = await query(get_latest_review_query);
    if (get_latest_review_results.length > 0) {
      console.log(get_latest_review_results);
      return get_latest_review_results;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error during user get_latest_review_query:', error);
  }

}

async function editCustomerReview(req) {
  //console.log(req)
  const ratingTagsArray = JSON.parse(req.rating_tags);
  const currentDate = new Date();
  // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  const update_review_query = 'UPDATE reviews SET review_title = ?, rating = ?, review_content = ?, user_privacy = ?, review_status = ?,rejecting_reason = ?, updated_at = ? WHERE id = ?';
  const update_review_values = [req.review_title, req.rating, req.review_content, req.user_privacy, req.review_status, req.review_rejecting_comment, formattedDate, req.review_id];
  try {
    const update_review_result = await query(update_review_query, update_review_values);

    // Remove all tags for the review
    const delete_tag_relation_query = 'DELETE FROM review_tag_relation WHERE review_id = ?';
    const delete_tag_relation_values = [req.review_id];
    try {
      const delete_tag_relation_result = await query(delete_tag_relation_query, delete_tag_relation_values);
      console.log('Review deleted:', delete_tag_relation_result);
    } catch (error) {
      return 'Error during review delete_tag_relation_query:' + error;
    }

    //insert review_tag_relation
    if (ratingTagsArray && ratingTagsArray.length > 0) {
      const insert_tag_relation_query = 'INSERT INTO review_tag_relation (review_id, tag_name) VALUES (?, ?)';
      for (const tag of ratingTagsArray) {
        const insert_tag_relation_values = [req.review_id, tag.value];
        try {
          const insert_tag_relation_result = await query(insert_tag_relation_query, insert_tag_relation_values);
          //console.log('New tag relation inserted:', insert_tag_relation_result);
        } catch (error) {
          return 'Error during insert_tag_relation_query:' + error;
        }
      }
    }
    return true;
  } catch (error) {
    return 'Error during user update_review_query:' + error;
  }
}

async function searchCompany(keyword) {
  const get_company_query = `
    SELECT ID, company_name, logo, about_company, main_address, main_address_pin_code FROM company
    WHERE company_name LIKE '%${keyword}%'
    OR about_company LIKE '%${keyword}%'
    OR heading LIKE '%${keyword}%'
    ORDER BY created_date DESC
  `;
  try {
    const get_company_results = await query(get_company_query);
    if (get_company_results.length > 0) {
      console.log(get_company_results);
      return { status: 'ok', data: get_company_results, message: get_company_results.length + ' company data recived' };
    } else {
      return { status: 'ok', data: '', message: 'No company data found' };
    }
  } catch (error) {
    return { status: 'err', data: '', message: 'No company data found' };
  }
}

async function getCompanyReviewNumbers(companyID) {
  const get_company_rewiew_count_query = `
    SELECT COUNT(*) AS total_review_count, ROUND(AVG(rating), 2) AS total_review_average
    FROM reviews
    WHERE company_id = ? AND review_status = ?`;
  const get_company_rewiew_count_value = [companyID, '1'];
  try {
    const get_company_rewiew_count_result = await query(get_company_rewiew_count_query, get_company_rewiew_count_value);
    const get_company_rewiew_rating_count_query = `
    SELECT rating,count(rating) AS cnt_rat
    FROM reviews
    WHERE company_id = ?
    group by rating ORDER by rating DESC`;
    try {
      const get_company_rewiew_rating_count_result = await query(get_company_rewiew_rating_count_query, get_company_rewiew_count_value);
      return { rewiew_count: get_company_rewiew_count_result[0], rewiew_rating_count: get_company_rewiew_rating_count_result };
    } catch (error) {
      return 'Error during user get_company_rewiew_rating_count_query:' + error;
    }

  } catch (error) {
    return 'Error during user get_company_rewiew_count_query:' + error;
  }
}

// function getCompany(companyId) {
//   return new Promise((resolve, reject) => {
//     db.query('SELECT * FROM company WHERE ID = ?', [companyId], (err, result) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(result[0]);
//       }
//     });
//   });
// }
// async function getCompanyReviews(companyID) {
//   const get_company_rewiew_query = `
//     SELECT r.*, ur.first_name, ur.last_name, ur.last_name, ucm.profile_pic
//     FROM reviews r
//     JOIN users ur ON r.customer_id = ur.user_id
//     JOIN user_customer_meta ucm ON ur.user_id = ucm.user_id
//     WHERE r.company_id = ? AND r.review_status = "1"
//     ORDER BY r.created_at DESC
//     LIMIT 20`;
//   const get_company_rewiew_value = [companyID];
//   try {
//     const get_company_rewiew_result = await query(get_company_rewiew_query, get_company_rewiew_value);
//     return get_company_rewiew_result;
//   } catch (error) {
//     return 'Error during user get_company_rewiew_query:' + error;
//   }
// }

async function getCompanyReviews(companyID) {
  const get_company_rewiew_query = `
  SELECT r.*, ur.first_name, ur.last_name, ur.email, ucm.profile_pic,
  c.company_name, c.logo,  
  rr.ID AS reply_id, rr.reply_by AS reply_by, rr.comment AS reply_comment, rr.created_at AS reply_created_at
FROM reviews r
JOIN users ur ON r.customer_id = ur.user_id
LEFT JOIN user_customer_meta ucm ON ur.user_id = ucm.user_id
LEFT JOIN review_reply rr ON r.id = rr.review_id
LEFT JOIN company c ON r.company_id = c.ID
WHERE r.company_id = ? AND r.review_status = "1"
ORDER BY r.created_at DESC, rr.created_at ASC
LIMIT 20
`;
  const get_company_rewiew_value = [companyID];
  try {
    const get_company_rewiew_result = await query(get_company_rewiew_query, get_company_rewiew_value);
    //return get_company_rewiew_result;
    const reviewsMap = new Map(); // Map to group reviews and their replies

    for (const row of get_company_reviews_result) {
      if (!reviewsMap.has(row.id)) {
        reviewsMap.set(row.id, {
          ...row,
          review_reply: [] // Initialize an empty array for review replies
        });
      }

      if (row.reply_id) {
        reviewsMap.get(row.id).review_reply.push({
          ID: row.reply_id,
          review_id: row.id,
          reply_by: row.reply_by,
          comment: row.reply_comment,
          created_at: row.reply_created_at
        });
      }
    }

    const finalResult = Array.from(reviewsMap.values());

    return finalResult;
  } catch (error) {
    return 'Error during user get_company_rewiew_query:' + error;
  }
}

//new
async function getCompanyRatings(companyID) {
  // SELECT 
  //   company_id,
  //   SUM(CASE WHEN rating = 0.5 THEN 1 ELSE 0 END) AS rating_05_count,
  //   SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS rating_1_count,
  //   SUM(CASE WHEN rating = 1.5 THEN 1 ELSE 0 END) AS rating_15_count,
  //   SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS rating_2_count,
  //   SUM(CASE WHEN rating = 2.5 THEN 1 ELSE 0 END) AS rating_25_count,
  //   SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS rating_3_count,
  //   SUM(CASE WHEN rating = 3.5 THEN 1 ELSE 0 END) AS rating_35_count,
  //   SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS rating_4_count,
  //   SUM(CASE WHEN rating = 4.5 THEN 1 ELSE 0 END) AS rating_45_count,
  //   SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS rating_5_count,
  //   COUNT(*) AS total_rating_count,
  //   ROUND(AVG(rating), 1) AS rating_average FROM reviews WHERE company_id = ? AND review_status = "1" GROUP BY company_id`;
  const getCompanyRatingsQuery =
    `SELECT 
  company_id,
  SUM(CASE WHEN t1.rating = 0.5 THEN 1 ELSE 0 END) AS rating_05_count,
  SUM(CASE WHEN t1.rating = 1 THEN 1 ELSE 0 END) AS rating_1_count,
  SUM(CASE WHEN t1.rating = 1.5 THEN 1 ELSE 0 END) AS rating_15_count,
  SUM(CASE WHEN t1.rating = 2 THEN 1 ELSE 0 END) AS rating_2_count,
  SUM(CASE WHEN t1.rating = 2.5 THEN 1 ELSE 0 END) AS rating_25_count,
  SUM(CASE WHEN t1.rating = 3 THEN 1 ELSE 0 END) AS rating_3_count,
  SUM(CASE WHEN t1.rating = 3.5 THEN 1 ELSE 0 END) AS rating_35_count,
  SUM(CASE WHEN t1.rating = 4 THEN 1 ELSE 0 END) AS rating_4_count,
  SUM(CASE WHEN t1.rating = 4.5 THEN 1 ELSE 0 END) AS rating_45_count,
  SUM(CASE WHEN t1.rating = 5 THEN 1 ELSE 0 END) AS rating_5_count,
  COUNT(*) AS total_rating_count,
  ROUND(AVG(t1.rating), 1) AS rating_average
FROM reviews AS t1
WHERE company_id = ? AND review_status = "1"
GROUP BY company_id;
`;
  const ratingsResultvalue = [companyID]
  try {
    const ratingsResult = await query(getCompanyRatingsQuery, ratingsResultvalue);
    return ratingsResult;
  } catch (error) {
    return 'Error during user get_company_rating_query:' + error;
  }
}

//getTotalreplies
// SELECT COUNT(*) AS total_replies, status AS replied
// FROM review_reply AS rr
// JOIN reviews AS r ON rr.review_id = r.id
// WHERE r.company_id = ? AND r.review_status = "1";
async function getTotalreplies(companyID) {
  const getTotalrepliesquery = `
    SELECT COUNT(*) AS total_replies, rr.status AS replied
    FROM review_reply AS rr
    JOIN reviews AS r ON rr.review_id = r.id
    WHERE r.company_id = ? AND r.review_status = "1";
  `;
  const getTotalrepliesvalue = [companyID];

  try {
    const get_company_replies_result = await query(getTotalrepliesquery, getTotalrepliesvalue);
    return get_company_replies_result[0];
  } catch (error) {
    return 'Error during user gettotalreplies: ' + error;
  }
}

//getTotalReviewsAndCounts
async function getTotalReviewsAndCounts(companyID) {
  const getTotalReviewsQuery = `
      SELECT COUNT(*) AS total_reviews
      FROM reviews
      WHERE company_id = ? AND review_status = "1";
    `;

  const getTotalPositiveReviewsQuery = `
      SELECT COUNT(*) AS total_positive_reviews
      FROM reviews
      WHERE company_id = ? AND review_status = "1" AND rating >= 4;
    `;

  const getTotalNegativeReviewsQuery = `
      SELECT COUNT(*) AS total_negative_reviews
      FROM reviews
      WHERE company_id = ? AND review_status = "1" AND rating <= 2.5;
    `;

  const getTotalReviewsValues = [companyID];

  try {
    // Get the total number of reviews
    const totalReviewsResult = await query(getTotalReviewsQuery, getTotalReviewsValues);
    const totalReviews = totalReviewsResult[0].total_reviews;

    // Get the total number of positive reviews (e.g., rating >= 4)
    const totalPositiveReviewsResult = await query(getTotalPositiveReviewsQuery, getTotalReviewsValues);
    const totalPositiveReviews = totalPositiveReviewsResult[0].total_positive_reviews;

    // Get the total number of negative reviews (e.g., rating <= 2.5)
    const totalNegativeReviewsResult = await query(getTotalNegativeReviewsQuery, getTotalReviewsValues);
    const totalNegativeReviews = totalNegativeReviewsResult[0].total_negative_reviews;

    // Calculate the review percentage
    const reviewPercentage = (totalPositiveReviews / totalReviews) * 100;
    const roundedReviewPercentage = Math.round(reviewPercentage);
    return {
      totalReviews,
      totalPositiveReviews,
      totalNegativeReviews,
      roundedReviewPercentage,
    };
  } catch (error) {
    return 'Error calculating review statistics: ' + error;
  }
}

async function getUserCompany(user_ID) {
  const get_user_company_query = `
      SELECT c.*
      FROM company_claim_request ccr
      LEFT JOIN users ur ON ccr.claimed_by = ur.user_id
      LEFT JOIN company c ON ccr.company_id = c.ID
      WHERE ccr.claimed_by = ?`;
  const get_user_company_value = [user_ID];
  try {
    const get_user_company_result = await query(get_user_company_query, get_user_company_value);
    return get_user_company_result;
  } catch (error) {
    return 'Error during user get_user_company_query:' + error;
  }
}

async function getUserReview(user_ID) {
  const reviewsQuery = `
      SELECT
        r.*, c.first_name, c.last_name, c.email, ucm.profile_pic, co.company_name, co.logo AS company_logo
      FROM reviews r
      JOIN users c ON r.customer_id = c.user_id
      LEFT JOIN user_customer_meta ucm ON r.customer_id = ucm.user_id
      JOIN company co ON r.company_id = co.ID
      WHERE c.user_id = ? AND r.review_status = "1"
      ORDER BY r.created_at ASC;
    `;
  const get_review_query_value = [user_ID];
  try {
    const get_review_query_result = await query(reviewsQuery, get_review_query_value);
    return get_review_query_result;
  } catch (error) {
    return 'Error during user reviewsQuery:' + error;
  }
}
// async function getUserReview(user_ID) {
//   const reviewsQuery = `
//   SELECT r.*, ur.first_name, ur.last_name, ur.email, ucm.profile_pic,
//   c.company_name, c.logo,  
//   rr.ID AS reply_id, rr.reply_by AS reply_by, rr.comment AS reply_comment, rr.created_at AS reply_created_at
// FROM reviews r
// JOIN users ur ON r.customer_id = ur.user_id
// LEFT JOIN user_customer_meta ucm ON ur.user_id = ucm.user_id
// LEFT JOIN review_reply rr ON r.id = rr.review_id
// LEFT JOIN company c ON r.company_id = c.ID
// WHERE r.customer_id = ? AND r.review_status = "1"
// ORDER BY r.created_at DESC, rr.created_at ASC
// LIMIT 20
//     `;
//   const get_review_query_value = [user_ID];
//   try {
//     const get_review_query_result = await query(reviewsQuery, get_review_query_value);
//     const reviewsMap = new Map(); // Map to group reviews and their replies

//     for (const row of get_company_reviews_result) {
//       if (!reviewsMap.has(row.id)) {
//         reviewsMap.set(row.id, {
//           ...row,
//           review_reply: [] // Initialize an empty array for review replies
//         });
//       }

//       if (row.reply_id) {
//         reviewsMap.get(row.id).review_reply.push({
//           ID: row.reply_id,
//           review_id: row.id,
//           reply_by: row.reply_by,
//           comment: row.reply_comment,
//           created_at: row.reply_created_at
//         });
//       }
//     }

//     const finalResult = Array.from(reviewsMap.values());

//     return finalResult;
//   } catch (error) {
//     return 'Error during user reviewsQuery:' + error;
//   }
// }


async function getuserReviewCompany(user_ID) {
  const user_review_company_query = `
    SELECT c.id AS company_id, MAX(r.created_at) AS latest_review_date, c.company_name, c.logo, COUNT(r.id) AS review_count
    FROM reviews r JOIN company c ON r.company_id = c.id
    WHERE r.customer_id = ? AND r.review_status = "1"
    GROUP BY c.id, c.company_name
    ORDER BY latest_review_date DESC`;
  const user_review_company_value = [user_ID];
  try {
    const user_review_company_result = await query(user_review_company_query, user_review_company_value);
    return user_review_company_result;
  } catch (error) {
    return 'Error during user user_review_company_query:' + error;
  }
}

async function ReviewReplyTo(Id) {
  try {
    const sql = `SELECT users.email, users.first_name, c.company_name, c.ID as company_id, r.customer_id
                 FROM users 
                 LEFT JOIN review_reply rr ON rr.reply_by = users.user_id 
                 LEFT JOIN reviews r ON r.id = rr.review_id 
                 LEFT JOIN company c ON r.company_id = c.ID 
                 WHERE rr.ID = ?`;

    // Use parameterized query with placeholders
    const get_user_email = await query(sql, [Id]);

    if (get_user_email.length > 0) {
      return get_user_email;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error in ReviewReplyTo:', error);
    throw error; // Rethrow the error to handle it at the higher level
  }
}


async function ReviewReplyToCustomer(mailReplyData, req) {
  if (mailReplyData && mailReplyData[0] && mailReplyData[0].customer_id == req.body.reply_to) {
    const customerEmail = mailReplyData[0].email;

    // Create a Nodemailer transporter using your email service provider's SMTP settings
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

    // Define email data
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: customerEmail,
      subject: 'Your Subject Here',
      text: 'Hello, reply from the company.'
    };

    try {
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent to customer:', customerEmail);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  } else {
    console.error('Invalid or missing mailReplyData for customer');
  }
}



// async function ReviewReplyToCompany(mailReplyData) {
//   if (Array.isArray(mailReplyData) && mailReplyData.length > 0 && mailReplyData[0].comp_email) {
//     const companyEmail = mailReplyData[0].comp_email;

//     // Create a Nodemailer transporter using your email service provider's SMTP settings
//     const transporter = nodemailer.createTransport({
//       host: process.env.MAIL_HOST,
//       port: process.env.MAIL_PORT,
//       secure: false,
//       requireTLS: true,
//       auth: {
//         user: process.env.MAIL_USER,
//         pass: process.env.MAIL_PASSWORD,
//       },
//     });

//     // Define email data
//     const mailOptions = {
//       from: process.env.MAIL_USER, 
//       to: companyEmail, 
//       subject: 'submit review reply', 
//       text: 'Hello, reply from the user.' 
//     };

//     try {
//       // Send the email
//       const info = await transporter.sendMail(mailOptions);
//       console.log('Email sent to company:', companyEmail);
//     } catch (error) {
//       console.error('Error sending email:', error);
//     }
//   } else {
//     console.error('Invalid or missing mailReplyData for company');
//   }
// }

async function ReviewReplyToCompany(mailReplyData) {
  if (Array.isArray(mailReplyData) && mailReplyData.length > 0 && mailReplyData[0].comp_email) {
    const companyEmail = mailReplyData[0].comp_email;

    // Create a Nodemailer transporter using your email service provider's SMTP settings
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

    // Define email data
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: companyEmail,  // Use the company email directly
      subject: 'submit review reply',
      text: 'Hello, reply from the user.'
    };

    try {
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent to company:', companyEmail);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  } else {
    console.error('Invalid or missing mailReplyData for company');
  }
}


async function getCompanyPollDetails(company_id) {
  const sql = `SELECT
                  pc.*,
                  pa.poll_answer,
                  pa.poll_answer_id,
                  pv.voting_answer_id,
                  voting_user_id
                FROM
                  poll_company pc
                JOIN (
                  SELECT
                      p.poll_id,
                      GROUP_CONCAT(DISTINCT p.answer) AS poll_answer,
                      GROUP_CONCAT(DISTINCT p.id) AS poll_answer_id
                  FROM
                      poll_answer p
                  GROUP BY
                      p.poll_id
                ) pa ON pc.id = pa.poll_id
                LEFT JOIN (
                  SELECT
                      pv.poll_id,
                      GROUP_CONCAT(pv.answer_id) AS voting_answer_id,
                      GROUP_CONCAT(pv.user_id) AS voting_user_id
                  FROM
                      poll_voting pv
                  GROUP BY
                      pv.poll_id
                ) pv ON pc.id = pv.poll_id
                WHERE
                  pc.company_id = '${company_id}' 
                ORDER BY
                  pc.id DESC;`;

  // const sql = `SELECT poll_company.*, GROUP_CONCAT(pa.answer) AS poll_answer, GROUP_CONCAT(pa.id) AS poll_answer_id, GROUP_CONCAT(pv.answer_id) AS voting_answer_id
  // FROM poll_company  
  // JOIN poll_answer pa ON pa.poll_id = poll_company.id
  // LEFT JOIN poll_voting pv ON pv.poll_id = poll_company.id
  // WHERE poll_company.company_id = '${company_id}' 
  // GROUP BY poll_company.id
  // ORDER BY poll_company.id DESC `;

  const result = await query(sql);
  if (result.length > 0) {
    return result;
  } else {
    return [];
  }

}

async function getCompanyIdBySlug(slug) {
  //console.log(req)
  try {
    const get_company_query = `SELECT ID FROM company WHERE slug = '${slug}' `;
    const get_company_Id = await query(get_company_query);

    console.log(get_company_Id[0]);
    return get_company_Id[0];
  } catch (error) {
    return 'Error during fetch companyId:' + error;
  }
}

async function getReviewReplies(user_ID, reviewIDs) {
  try {
    const rows = `
      SELECT *
      FROM review_reply
      WHERE reply_by = '${user_ID}' `;
    const getvalue = await query(rows);
    console.log(getvalue);
    return getvalue;
  } catch (error) {
    console.error('Error during fetch review replies:', error);
    throw error;
  }
}

async function getReviewRepliescompany(companyId, reviewIDs) {
  try {
    const rows = `
      SELECT *
      FROM review_reply
      WHERE company_id = '${companyId}' `;
    const getvalue = await query(rows);
    console.log(getvalue);
    return getvalue;
  } catch (error) {
    console.error('Error during fetch review replies:', error);
    throw error;
  }
}

// async function getReviewReplies(options) {
//   try {
//     let rows;
//     if (options.user_ID) {
//       rows = `
//         SELECT *
//         FROM review_reply
//         WHERE reply_by = '${options.user_ID}' `;
//     } else if (options.companyId) {
//       rows = `
//         SELECT *
//         FROM review_reply
//         WHERE company_id = '${options.companyId}' `;
//     } else {
//       throw new Error('Invalid options provided.');
//     }

//     const getvalue = await query(rows);
//     console.log(getvalue);
//     return getvalue;
//   } catch (error) {
//     console.error('Error during fetch review replies:', error);
//     throw error;
//   }
// }


// async function getpolldetails(companyId, reviewIDs) {
//   try {
//     const currentDate = new Date(); // Get the current date
//     const formattedDate = currentDate.toISOString().slice(0, 19).replace("T", " "); 

//     const rows = `
//         SELECT * FROM poll_company 
//         WHERE company_id = '${companyId}' 
//         AND '${formattedDate}' > created_at 
//         AND '${formattedDate}' < expired_at
//       `;
//     const results = await query(rows);
//     console.log(results);
//     return results;
//   } catch (error) {
//     console.log('Error during fetch ongoing polls:', error);
//     throw error;
//   }
// }

async function getpolldetails(company_id) {
  const sql = ` SELECT
                  pc.*,
                  pa.poll_answer,
                  pa.poll_answer_id,
                  pv.voting_answer_id,
                  voting_user_id
                FROM
                  poll_company pc
                JOIN (
                  SELECT
                      p.poll_id,
                      GROUP_CONCAT(DISTINCT p.answer) AS poll_answer,
                      GROUP_CONCAT(DISTINCT p.id) AS poll_answer_id
                  FROM
                      poll_answer p
                  GROUP BY
                      p.poll_id
                ) pa ON pc.id = pa.poll_id
                LEFT JOIN (
                  SELECT
                      pv.poll_id,
                      GROUP_CONCAT(pv.answer_id) AS voting_answer_id,
                      GROUP_CONCAT(pv.user_id) AS voting_user_id
                  FROM
                      poll_voting pv
                  GROUP BY
                      pv.poll_id
                ) pv ON pc.id = pv.poll_id
                WHERE
                  pc.company_id = '${company_id}' 
                  AND pc.expired_at >= CURDATE()  
                ORDER BY
                  pc.id DESC;`;


  // const sql = `SELECT poll_company.*, GROUP_CONCAT(pa.answer) AS poll_answer, GROUP_CONCAT(pa.id) AS poll_answer_id, GROUP_CONCAT(pv.answer_id) AS voting_answer_id
  // FROM poll_company  
  // JOIN poll_answer pa ON pa.poll_id = poll_company.id
  // LEFT JOIN poll_voting pv ON pv.poll_id = poll_company.id
  // WHERE poll_company.company_id = '${company_id}' 
  // GROUP BY poll_company.id
  // ORDER BY poll_company.id DESC `;
  //there is a poll in the database whose expiration date is today but that is not showing.want to get if the expiry date is today then even today it will show in company poll details and from tommorow it will not show in company poll details
  const result = await query(sql);
  if (result.length > 0) {
    return result;
  } else {
    return [];
  }

}

async function updateReview(reviewIfo) {
  // console.log('Review Info', reviewIfo);
  // console.log('Company Info', comInfo);
  // reviewIfo['tags[]'].forEach((tag) => {
  //   console.log(tag);
  // });
  if (typeof reviewIfo['tags[]'] === 'string') {
    // Convert it to an array containing a single element
    reviewIfo['tags[]'] = [reviewIfo['tags[]']];
  }
  const currentDate = new Date();
  // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  const updateQuery = 'UPDATE reviews SET review_title = ?, rating = ?, review_content = ?, user_privacy = ?, review_status = ?, updated_at = ? WHERE id = ?';
  const updateData = [reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, reviewIfo.review_id]

  try {
    const create_review_results = await query(updateQuery, updateData);
    if (Array.isArray(reviewIfo['tags[]']) && reviewIfo['tags[]'].length > 0) {
      //insert review_tag_relation

      await query(`DELETE FROM review_tag_relation WHERE review_id = '${reviewIfo.review_id}'`);

      const review_tag_relation_query = 'INSERT INTO review_tag_relation (review_id, tag_name) VALUES (?, ?)';
      try {
        for (const tag of reviewIfo['tags[]']) {
          const review_tag_relation_values = [reviewIfo.review_id, tag];
          const review_tag_relation_results = await query(review_tag_relation_query, review_tag_relation_values);
        }

      } catch (error) {
        console.error('Error during user review_tag_relation_results:', error);
      }
    }
  } catch (error) {
    console.error('Error during user update_review_results:', error);
  }
}


async function insertInvitationDetails(req) {
  console.log('insertInvitationDetails', req)
  const { emails, email_body, user_id, company_id } = req
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
  const sql = `INSERT INTO review_invite_request( company_id, user_id, share_date, count) VALUES (?, ?, ?, ?)`;
  const data = [company_id, user_id, formattedDate, emails.length];
  const result = await query(sql, data);
  if (result) {
    return true;
  } else {
    return false;
  }
}

async function sendInvitationEmail(req) {
  console.log('sendInvitationEmail', req)
  const { emails, email_body, user_id, company_id, company_name, company_slug } = req;
  if (emails.length > 0) {
    await emails.forEach((email) => {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: email,
        subject: 'Invitation Email',
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
                       <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                        <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Invitation Email</h1>
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
                                    <p style="font-size:15px; line-height:20px">${email_body}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2">
                                    <p style="font-size:15px; line-height:20px">Please <a href="${process.env.MAIN_URL}company/${company_id}?type=invitation">click here</a> to submit your opinion.</p>
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
      mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
          console.log(err);
          return false;
        } else {
          console.log('Mail Send: ', info.response);

        }
      })
    })
    return true;
  }

}

async function getSubCategories(categorySlug) {
  const sql = `SELECT category.category_name,category.category_slug, GROUP_CONCAT(c.category_name) AS subcategories, GROUP_CONCAT(c.category_slug ) AS subcategoriesSlug
                FROM category 
                LEFT JOIN category c ON category.ID = c.parent_id
                WHERE category.category_slug = '${categorySlug}'
                GROUP BY category.category_name `;

  const result = await query(sql);
  if (result.length > 0) {
    return result;
  } else {
    return [];
  }

}

async function getCompanyDetails(categorySlug) {
  const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img
                FROM category  
                JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
                LEFT JOIN company c ON c.ID = ccr.company_id
                LEFT JOIN reviews r ON r.company_id = c.ID
                LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
                WHERE category.category_slug = '${categorySlug}' AND c.status = '1'
                GROUP BY c.ID, c.company_name `;

  const result = await query(sql);
  if (result.length > 0) {
    return result;
  } else {
    return [];
  }

}

async function getCategoryDetails(category_slug) {
  const get_category_query = `
  SELECT * FROM category
  WHERE category_slug = ?;
  `;
  const get_category_slug = category_slug;
  try {
    const get_category_query_result = await query(get_category_query, get_category_slug);
    // if(get_category_query_result[0].parent_id){
    //   console.log(get_category_query_result);
    // }
    return get_category_query_result;
  } catch (error) {
    return 'Error during user get_category_query:' + error;
  }
}

async function getParentCategories(ID) {
  const get_category_query = `
  SELECT * FROM category
  WHERE ID = ?;
  `;
  const cat_ID = ID;
  try {
    const get_category_query_result = await query(get_category_query, cat_ID);
    // if(get_category_query_result[0].parent_id){
    //   console.log(get_category_query_result);
    // }
    return get_category_query_result;
  } catch (error) {
    return 'Error during user get_category_query:' + error;
  }
}
async function getCompanyIdByUserId(userId) {
  try {
    // Replace this with your actual database query to fetch the company ID
    const user = `
      SELECT * FROM reviews
      WHERE customer_id = ?;
      `;

    if (!user) {
      throw new Error('User not found'); // Handle this according to your application logic
    }

    // Assuming your User model has a companyId field
    const companyId = user.companyId;

    return companyId;
  } catch (error) {
    throw error;
  }
}


// async function usercompanyreply(customer_id, claimed_by) {
//   try {
//     const rows = `
//       SELECT rr.*, ccr.*
//       FROM review_reply AS rr
//       LEFT JOIN company_claim_request AS ccr ON (rr.reply_by = ccr.customer_id OR rr.reply_by = ccr.claimed_by)
//       WHERE rr.reply_by IS NOT NULL
//       AND (rr.reply_by = '${customer_id}' OR ccr.claimed_by ='${customer_id}');
//     `;

//     const getvalue = await query(rows);
//     console.log(getvalue);
//     return getvalue;
//   } catch (error) {
//     console.error('An error occurred:', error);
//     console.error('Error during fetch review replies:', error);
//     throw error;
//   }
// }


async function usercompanyreply(customer_id, claimed_by) {
  try {
    const sql = `
    SELECT rr.*, ccr.*
FROM review_reply AS rr
LEFT JOIN company_claim_request AS ccr ON (rr.company_id = ccr.company_id)
LEFT JOIN reviews AS r ON (rr.review_id = r.id)
WHERE rr.reply_by IS NOT NULL
AND (rr.reply_by = '${customer_id}' OR ccr.claimed_by ='${claimed_by}');
    `;
    const value = { customer_id, claimed_by }

    const result = await query(sql, value);
    if (result > 0) {
      return result;
    } else {
      return [];
    }

  } catch (error) {
    console.error('An error occurred:', error);
    console.error('Error during fetch review replies:', error);
    throw error;
  }
}


async function getClaimedByForCompany(companyId) {
  try {
    const sql = 'SELECT claimed_by FROM company_claim_request WHERE company_id = ?';
    const result = await query(sql, [companyId]);


    return result.claimed_by;
  } catch (error) {

    console.error('Error fetching claimed_by for company:', error);
    throw error;
  }
}


async function CompanyReviews(companyID) {
  const get_company_reviews_query = `
  SELECT r.*, ur.first_name, ur.last_name, ur.email, ucm.profile_pic,
  c.company_name, c.logo,  
  rr.ID AS reply_id, rr.reply_by AS reply_by, rr.comment AS reply_comment, rr.created_at AS reply_created_at
FROM reviews r
JOIN users ur ON r.customer_id = ur.user_id
LEFT JOIN user_customer_meta ucm ON ur.user_id = ucm.user_id
LEFT JOIN review_reply rr ON r.id = rr.review_id
LEFT JOIN company c ON r.company_id = c.ID
WHERE r.company_id = ? AND r.review_status = "1"
ORDER BY r.created_at DESC, rr.created_at ASC
LIMIT 20
`;
  const get_company_reviews_values = [companyID];
  try {
    const get_company_reviews_result = await query(get_company_reviews_query, get_company_reviews_values);

    const reviewsMap = new Map(); // Map to group reviews and their replies

    for (const row of get_company_reviews_result) {
      if (!reviewsMap.has(row.id)) {
        reviewsMap.set(row.id, {
          ...row,
          review_reply: [] // Initialize an empty array for review replies
        });
      }

      if (row.reply_id) {
        reviewsMap.get(row.id).review_reply.push({
          ID: row.reply_id,
          review_id: row.id,
          reply_by: row.reply_by,
          comment: row.reply_comment,
          created_at: row.reply_created_at
        });
      }
    }

    const finalResult = Array.from(reviewsMap.values());

    return finalResult;
  } catch (error) {
    console.error('An error occurred in CompanyReviews:', error);
    return [];
  }
}
function getAllReviewReply() {
  return new Promise((resolve, reject) => {
    const reviewed_companies_query = `
      SELECT *
      FROM review_reply
      WHERE review_id IS NOT NULL`;
    db.query(reviewed_companies_query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

async function getreviewreplis(review_id) {
  try {
    const sql = `SELECT review_reply.*, company.logo, company.company_name, user_customer_meta.profile_pic, user_customer_meta.user_id, users.first_name, users.last_name
    FROM review_reply
    INNER JOIN reviews ON review_reply.review_id = reviews.id
    INNER JOIN company ON reviews.company_id = company.ID
    LEFT JOIN user_customer_meta ON reviews.customer_id = user_customer_meta.user_id
    LEFT JOIN users ON reviews.customer_id = users.user_id 
    WHERE review_reply.review_id = ?;
    `;


    const result = await query(sql, [review_id]);

    return result;
  } catch (error) {
    console.error('Error fetching reviewreplies:', error);
    throw error;
  }
}

async function getPremiumCompanyData(companyId) {
  const sql = `SELECT * FROM premium_company_data where company_id = '${companyId}' `;
  const PremiumCompanyData = await query(sql);

  //console.log('PremiumCompanyData',PremiumCompanyData[0])
  if (PremiumCompanyData.length > 0) {
    return PremiumCompanyData[0];
  } else {
    return {};
  }
}

async function getAllCommentByDiscusId(discussions_id,limit,offset) {
  const sql = `
    SELECT discussions.*, u.first_name, u.last_name, um.profile_pic
    FROM discussions 
    LEFT JOIN users u ON discussions.user_id = u.user_id 
    LEFT JOIN user_customer_meta um ON discussions.user_id = um.user_id
    WHERE discussions.id = ${discussions_id}
  `;
  // const commentQuery = `
  //   SELECT discussions_user_response.*
  //   FROM discussions_user_response 
  //   WHERE discussions_user_response.discussion_id = ${discussions_id}
  //   ORDER BY created_at DESC;
  // `;
  const commentQuery = `SELECT discussions_user_response.*, u.first_name comment_first_name, u.last_name comment_last_name, ucm.profile_pic
  FROM discussions_user_response 
  LEFT JOIN users u ON discussions_user_response.user_id = u.user_id 
  LEFT JOIN user_customer_meta ucm ON discussions_user_response.user_id = ucm.user_id 
  WHERE discussions_user_response.discussion_id = ${discussions_id}
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?;`



  // const tagQuery = `
  //   SELECT discussions.tags
  //   FROM discussions
  //   WHERE discussions.id = ${discussions_id};
  // `;

  try {
    const results = await query(sql);
    const commentResult = await query(commentQuery, [parseInt(limit), parseInt(offset)]);
    // const tagResult = await query(tagQuery);

    const cmntData = JSON.stringify(commentResult);
    // const tagData = JSON.stringify(tagResult);


    results[0].commentData = cmntData;
    // results[0].tagData = tagData;
    return results;
  } catch (error) {
    console.error('Error during fetching getAllCommentByDiscusId:', error);
  }
}

// async function getAllPopularDiscussion(limit, offset) {
//   const sql = `
//   SELECT
//     discussions.*,
//     u.first_name,
//     u.last_name,
//     mu.profile_pic AS user_profile_pic,
//     COALESCE(comments.total_comments, 0) as total_comments,
//     COALESCE(views.total_views, 0) as total_views
//   FROM discussions
//   LEFT JOIN users u ON discussions.user_id = u.user_id
//   LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
//   LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_comments
//     FROM discussions_user_response
//     GROUP BY discussion_id
//   ) comments ON discussions.id = comments.discussion_id
//   LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_views
//     FROM discussions_user_view
//     GROUP BY discussion_id
//   ) views ON discussions.id = views.discussion_id
//   ORDER BY total_comments DESC
//   LIMIT ? OFFSET ?;
//   ;
//   `;
//   try{
//     const results = await query(sql, [limit, offset]);
//     if (results.length>0) {

//     return results;
//     } else {
//       return [];
//     }
//   }
//   catch(error){
//     console.error('Error during fetch  Latest Discussion:', error);
//   }
// }


//
async function getAllPopularDiscussion(limit, offset) {
  const sql = `
    SELECT
      discussions.*,
      u.first_name,
      u.last_name,
      mu.profile_pic AS user_profile_pic,
      COALESCE(comments.total_comments, 0) as total_comments,
      COALESCE(views.total_views, 0) as total_views
    FROM discussions
    LEFT JOIN users u ON discussions.user_id = u.user_id
    LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
    LEFT JOIN (
      SELECT discussion_id, COUNT(*) as total_comments
      FROM discussions_user_response
      GROUP BY discussion_id
    ) comments ON discussions.id = comments.discussion_id
    LEFT JOIN (
      SELECT discussion_id, COUNT(*) as total_views
      FROM discussions_user_view
      GROUP BY discussion_id
    ) views ON discussions.id = views.discussion_id
    ORDER BY total_comments DESC
    LIMIT ? OFFSET ?;
  `;
  try {
    const results = await query(sql, [parseInt(limit), parseInt(offset)]);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error during fetch Latest Discussion:', error);
  }
}



async function insertDiscussionResponse(discussion_id, ip_address, user_id) {
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
  const data = {
    discussion_id: discussion_id,
    ip_address: ip_address,
    user_id: user_id
  };
  const checkQuery = `SELECT * FROM discussions_user_view WHERE discussion_id = '${discussion_id}'  AND ip_address = '${ip_address}'`;
  const check_result = await query(checkQuery);
  if (check_result.length > 0) {
    console.log(check_result[0].id);
    return check_result[0].id
  } else {
    const sql = 'INSERT INTO discussions_user_view SET ?'
    const results = await query(sql, data);
    try {
      console.log(results.insertId);
      return results.insertId;
    }
    catch (error) {
      console.error('Error during insert discussions_user_view:', error);
    }
  }
}


//Function to get latest discussion from discussions table
// async function getAllLatestDiscussion(limit, offset) {
//   const sql = `
//     SELECT
//     discussions.*,
//     u.first_name,
//     u.last_name,
//     mu.profile_pic AS user_profile_pic,
//     COALESCE(comments.total_comments, 0) as total_comments,
//     COALESCE(views.total_views, 0) as total_views
//   FROM discussions
//   LEFT JOIN users u ON discussions.user_id = u.user_id
//   LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
//   LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_comments
//     FROM discussions_user_response
//     GROUP BY discussion_id
//   ) comments ON discussions.id = comments.discussion_id
//   LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_views
//     FROM discussions_user_view
//     GROUP BY discussion_id
//   ) views ON discussions.id = views.discussion_id
//   ORDER BY discussions.id DESC
//   LIMIT ? OFFSET ?;
//   `;
//   try{
//     const results = await query(sql, [limit, offset]);
//     if (results.length>0) {

//     return results;
//     } else {
//       return [];
//     }
//   }
//   catch(error){
//     console.error('Error during fetch All Latest Discussion:', error);
//   }
// }

async function getAllLatestDiscussion(limit, offset) {
  const sql = `
    SELECT
    discussions.*,
    u.first_name,
    u.last_name,
    mu.profile_pic AS user_profile_pic,
    COALESCE(comments.total_comments, 0) as total_comments,
    COALESCE(views.total_views, 0) as total_views
    FROM discussions
    LEFT JOIN users u ON discussions.user_id = u.user_id
    LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
    LEFT JOIN (
      SELECT discussion_id, COUNT(*) as total_comments
      FROM discussions_user_response
      GROUP BY discussion_id
    ) comments ON discussions.id = comments.discussion_id
    LEFT JOIN (
      SELECT discussion_id, COUNT(*) as total_views
      FROM discussions_user_view
      GROUP BY discussion_id
    ) views ON discussions.id = views.discussion_id
    ORDER BY discussions.id DESC
    LIMIT ? OFFSET ?;
  `;
  try {
    const results = await query(sql, [parseInt(limit), parseInt(offset)]);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}




//function to get all discussion from discussions table
// async function getAllDiscussions(limit, offset) {
//   const sql = `
//     SELECT
//       discussions.*,
//       u.first_name,
//       u.last_name,
//       mu.profile_pic AS user_profile_pic,
//       COALESCE(comments.total_comments, 0) as total_comments,
//       COALESCE(views.total_views, 0) as total_views
//     FROM discussions
//     LEFT JOIN users u ON discussions.user_id = u.user_id
//     LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
//     LEFT JOIN (
//       SELECT discussion_id, COUNT(*) as total_comments
//       FROM discussions_user_response
//       GROUP BY discussion_id
//     ) comments ON discussions.id = comments.discussion_id
//     LEFT JOIN (
//       SELECT discussion_id, COUNT(*) as total_views
//       FROM discussions_user_view
//       GROUP BY discussion_id
//     ) views ON discussions.id = views.discussion_id
//     ORDER BY discussions.id DESC
//     LIMIT ? OFFSET ?;
//   `;

//   try {
//     const results = await query(sql, [limit, offset]);
//     if (results.length > 0) {
//       return results;
//     } else {
//       return [];
//     }
//   } catch (error) {
//     console.error('Error during fetch All Latest Discussion:', error);
//   }
// }

async function getAllDiscussions(limit, offset) {
  const sql = `
    SELECT
      discussions.*,
      u.first_name,
      u.last_name,
      mu.profile_pic AS user_profile_pic,
      COALESCE(comments.total_comments, 0) as total_comments,
      COALESCE(views.total_views, 0) as total_views
    FROM discussions
    LEFT JOIN users u ON discussions.user_id = u.user_id
    LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
    LEFT JOIN (
      SELECT discussion_id, COUNT(*) as total_comments
      FROM discussions_user_response
      GROUP BY discussion_id
    ) comments ON discussions.id = comments.discussion_id
    LEFT JOIN (
      SELECT discussion_id, COUNT(*) as total_views
      FROM discussions_user_view
      GROUP BY discussion_id
    ) views ON discussions.id = views.discussion_id
    ORDER BY discussions.id DESC
    LIMIT ? OFFSET ?;
  `;

  try {
    const results = await query(sql, [parseInt(limit), parseInt(offset)]);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}





async function getAllRelatedDiscussion() {
  const sql = `
  SELECT
    discussions.*,
    u.first_name,
    u.last_name,
    COALESCE(comments.total_comments, 0) as total_comments,
    COALESCE(views.total_views, 0) as total_views
  FROM discussions
  LEFT JOIN users u ON discussions.user_id = u.user_id
  LEFT JOIN (
    SELECT discussion_id, COUNT(*) as total_comments
    FROM discussions_user_response
    GROUP BY discussion_id
  ) comments ON discussions.id = comments.discussion_id
  LEFT JOIN (
    SELECT discussion_id, COUNT(*) as total_views
    FROM discussions_user_view
    GROUP BY discussion_id
  ) views ON discussions.id = views.discussion_id
  ORDER BY discussions.id DESC`;
  try {
    const results = await query(sql);
    if (results.length > 0) {

      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}


// async function getRelatedDiscussionsByTags(discussion_id) {
//   const discussionTagsQuery = `
//     SELECT tags
//     FROM discussions
//     WHERE id = ${discussion_id}
//   `;

//   try {
//     const tagsResult = await query(discussionTagsQuery);

//     if (tagsResult.length === 0) {
//       console.log("Discussion not found.");
//       return [];
//     }

//     const tags = JSON.parse(tagsResult[0].tags);
//     console.log("relatedtag", tags);

//     if (tags.length === 0) {
//       console.log("Discussion has no tags.");
//       return [];
//     }

//     const relatedDiscussionsQuery = `
//       SELECT discussions.*
//       FROM discussions
//       WHERE id <> ${discussion_id} 
//         AND JSON_CONTAINS(tags, ?)
//       ORDER BY id DESC
//     `;

//     const relatedDiscussions = await query(relatedDiscussionsQuery, [JSON.stringify(tags)]);

//     return relatedDiscussions;
//   } catch (error) {
//     console.error('Error during fetching related discussions by tags:', error);
//     return [];
//   }
// }




//new
async function getRelatedDiscussionsByTags(discussion_id, limit = 15) {
  const discussionTagsQuery = `
    SELECT tags
    FROM discussions
    WHERE id = ${discussion_id}
  `;

  try {
    const tagsResult = await query(discussionTagsQuery);

    if (tagsResult.length === 0) {
      console.log("Discussion not found.");
      return [];
    }
    console.log("tags", tagsResult)
    const tags = JSON.parse(tagsResult[0].tags);
    //console.log("relatedtag", tags);

    if (tags.length === 0) {
      console.log("Discussion has no tags.");
      return [];
    }

    const tagQueries = tags.map((tag, index) => `JSON_CONTAINS(tags, '[\\"${tag}\\"]')`).join(' OR ');

    // const relatedDiscussionsQuery = `
    //   SELECT discussions.*,u.first_name,u.last_name
    //   FROM discussions
    //   LEFT JOIN users u ON discussions.user_id = u.user_id
    //   WHERE id <> ${discussion_id} 
    //     AND (${tagQueries})
    //   ORDER BY id DESC
    // `;

    //new

    // const relatedDiscussionsQuery = `
    // SELECT DISTINCT
    //   discussions.*,
    //   u.first_name, 
    //   u.last_name,
    //   COALESCE(cr.total_comments, 0) as total_comments,
    //   COALESCE(vr.total_views, 0) as total_views,
    //   cr.author_id
    // FROM discussions
    // LEFT JOIN users u ON discussions.user_id = u.user_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_comments, user_id AS author_id
    //   FROM discussions_user_response
    //   GROUP BY discussion_id, user_id 
    // ) cr ON discussions.id = cr.discussion_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_views
    //   FROM discussions_user_view
    //   GROUP BY discussion_id
    // ) vr ON discussions.id = vr.discussion_id
    // WHERE discussions.id <> ${discussion_id} 
    //   AND (${tagQueries})
    // ORDER BY discussions.id DESC
    // `;

    //actual
    // const relatedDiscussionsQuery = `
    // SELECT DISTINCT
    //   discussions.*,
    //   u.first_name, 
    //   u.last_name,
    //   COALESCE(cr.total_comments, 0) as total_comments,
    //   COALESCE(vr.total_views, 0) as total_views,
    //   cr.author_id  
    // FROM discussions
    // LEFT JOIN users u ON discussions.user_id = u.user_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_comments, user_id AS author_id
    //   FROM discussions_user_response
    //   GROUP BY discussion_id, user_id  
    // ) cr ON discussions.id = cr.discussion_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_views
    //   FROM discussions_user_view
    //   GROUP BY discussion_id
    // ) vr ON discussions.id = vr.discussion_id
    // WHERE discussions.id <> ${discussion_id} 
    //   AND (${tagQueries})
    // ORDER BY discussions.id DESC
    // `;

    // const relatedDiscussionsQuery = `
    // SELECT discussions.*,
    //   u.first_name AS discussion_user_first_name,
    //   u.last_name AS discussion_user_last_name,
    //   au.user_id AS author_id,
    //   du.created_at AS comment_date,
    //   au.first_name AS author_first_name,
    //   au.last_name AS author_last_name,
    //   mu.profile_pic AS author_profile_pic,
    //   COALESCE(cr.total_comments, 0) as total_comments,
    //   COALESCE(vr.total_views, 0) as total_views
    // FROM discussions
    // LEFT JOIN users u ON discussions.user_id = u.user_id
    // LEFT JOIN (
    //   SELECT discussion_id, MAX(created_at) AS max_comment_date
    //   FROM discussions_user_response
    //   GROUP BY discussion_id
    // ) latest_comments ON discussions.id = latest_comments.discussion_id
    // LEFT JOIN discussions_user_response du ON discussions.id = du.discussion_id AND du.created_at = latest_comments.max_comment_date
    // LEFT JOIN users au ON du.user_id = au.user_id
    // LEFT JOIN user_customer_meta mu ON au.user_id = mu.user_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_comments
    //   FROM discussions_user_response
    //   GROUP BY discussion_id
    // ) cr ON discussions.id = cr.discussion_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_views
    //   FROM discussions_user_view
    //   GROUP BY discussion_id
    // ) vr ON discussions.id = vr.discussion_id
    // WHERE discussions.id <> ${discussion_id} 
    //   AND (${tagQueries})
    // ORDER BY discussions.id DESC;
    // `;

    //


    // const relatedDiscussionsQuery = `
    // SELECT discussions.*,
    //   u.first_name AS discussion_user_first_name, 
    //   u.last_name AS discussion_user_last_name,
    //   du.user_id AS author_id,
    //   du.created_at AS comment_date,
    //   au.first_name AS author_first_name,
    //   au.last_name AS author_last_name,
    //   mu.profile_pic AS author_profile_pic,
    //   COALESCE(cr.total_comments, 0) as total_comments,
    //   COALESCE(vr.total_views, 0) as total_views
    // FROM discussions
    // LEFT JOIN users u ON discussions.user_id = u.user_id
    // LEFT JOIN discussions_user_response du ON discussions.id = du.discussion_id
    // LEFT JOIN users au ON du.user_id = au.user_id
    // LEFT JOIN user_customer_meta mu ON du.user_id = mu.user_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_comments
    //   FROM discussions_user_response
    //   GROUP BY discussion_id
    // ) cr ON discussions.id = cr.discussion_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_views
    //   FROM discussions_user_view
    //   GROUP BY discussion_id
    // ) vr ON discussions.id = vr.discussion_id
    // WHERE discussions.id <> ${discussion_id} 
    //   AND (${tagQueries})
    // ORDER BY discussions.id DESC
    // `;


    //ac
    // const relatedDiscussionsQuery = `
    // SELECT discussions.*,
    //        u.first_name AS discussion_user_first_name, 
    //        u.last_name AS discussion_user_last_name,
    //        COALESCE(cr.total_comments, 0) as total_comments,
    //        COALESCE(vr.total_views, 0) as total_views
    // FROM discussions
    // LEFT JOIN users u ON discussions.user_id = u.user_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_comments
    //   FROM discussions_user_response
    //   GROUP BY discussion_id
    // ) cr ON discussions.id = cr.discussion_id
    // LEFT JOIN (
    //   SELECT discussion_id, COUNT(*) as total_views
    //   FROM discussions_user_view
    //   GROUP BY discussion_id
    // ) vr ON discussions.id = vr.discussion_id
    // WHERE discussions.id <> ${discussion_id} 
    //   AND (${tagQueries})
    // GROUP BY discussions.id
    // ORDER BY discussions.id DESC;
    // `;

    //REAL
    // const relatedDiscussionsQuery = `SELECT discussions.*,
    // u.first_name AS discussion_user_first_name, 
    // u.last_name AS discussion_user_last_name,
    // mu.profile_pic AS user_profile_pic,
    // COALESCE(cr.total_comments, 0) as total_comments,
    // COALESCE(vr.total_views, 0) as total_views,
    // MAX(du.created_at) AS comment_date
    // FROM discussions
    // LEFT JOIN users u ON discussions.user_id = u.user_id
    // LEFT JOIN discussions_user_response du ON discussions.id = du.discussion_id
    // LEFT JOIN user_customer_meta mu ON u.user_id = mu.user_id 
    // LEFT JOIN (
    // SELECT discussion_id, COUNT(*) as total_comments
    // FROM discussions_user_response
    // GROUP BY discussion_id
    // ) cr ON discussions.id = cr.discussion_id
    // LEFT JOIN (
    // SELECT discussion_id, COUNT(*) as total_views
    // FROM discussions_user_view
    // GROUP BY discussion_id
    // ) vr ON discussions.id = vr.discussion_id
    // WHERE discussions.id <> ${discussion_id} 
    // AND (${tagQueries})
    // GROUP BY discussions.id
    // ORDER BY discussions.id DESC;
    // `;

    const relatedDiscussionsQuery = `SELECT discussions.*,
u.first_name AS first_name, 
u.last_name AS last_name,
mu.profile_pic AS user_profile_pic,
COALESCE(cr.total_comments, 0) AS total_comments,
COALESCE(vr.total_views, 0) AS total_views,
recent_comment.created_at AS comment_date
FROM discussions
LEFT JOIN users u ON discussions.user_id = u.user_id
LEFT JOIN user_customer_meta mu ON u.user_id = mu.user_id
LEFT JOIN (
SELECT discussion_id, MAX(created_at) AS created_at
FROM discussions_user_response
GROUP BY discussion_id
) AS recent_comment ON discussions.id = recent_comment.discussion_id
LEFT JOIN (
SELECT discussion_id, COUNT(*) AS total_comments
FROM discussions_user_response
GROUP BY discussion_id
) cr ON discussions.id = cr.discussion_id
LEFT JOIN (
SELECT discussion_id, COUNT(*) AS total_views
FROM discussions_user_view
GROUP BY discussion_id
) vr ON discussions.id = vr.discussion_id
WHERE discussions.id <> ${discussion_id} 
AND (${tagQueries})
GROUP BY discussions.id
ORDER BY discussions.id DESC
LIMIT ${limit};
`;


    const relatedDiscussions = await query(relatedDiscussionsQuery);
    if (relatedDiscussions.length === 0) {
      return 'No related discussions found'; 
  }
    return relatedDiscussions;
  } catch (error) {
    console.error('Error during fetching related discussions by tags:', error);
    return [];
  }
}

// async function getPopularTags() {
//   try {
//     const sql = `
//       SELECT tag, COUNT(*) as tag_count
//       FROM (
//         SELECT JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) as tag
//         FROM discussions
//       ) extracted_tags
//       WHERE tag IS NOT NULL AND tag != ''
//       GROUP BY tag
//       ORDER BY tag_count DESC;
//     `;
//     const rows = await query(sql);
//     //const pp = stringify.rows
//     console.log("rows",rows);
//     //console.log("pp",pp)

//     // const tags = rows.map(row => ({
//     //   tag: row.tag,
//     //   tag_count: row.tag_count,
//     // }));

//     // const result = {
//     //   getPopularTags: tags,
//     // };

//     return rows;
//   } catch (error) {
//     console.error('Error getting popular tags:', error);
//     throw error;
//   }
// }

// async function getPopularTags() {
//   try {
//     const sql = `
//       SELECT JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) as tags
//       FROM discussions
//       WHERE JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) IS NOT NULL;
//     `;

//     const rows = await query(sql);

//     // Process the result to extract individual tags
//     const tags = rows.reduce((accumulator, row) => {
//       const parsedTags = JSON.parse(row.tags);
//       accumulator.push(...parsedTags);
//       return accumulator;
//     }, []);

//     // Count the occurrences of each tag
//     const tagCounts = {};
//     tags.forEach(tag => {
//       if (tagCounts[tag]) {
//         tagCounts[tag]++;
//       } else {
//         tagCounts[tag] = 1;
//       }
//     });

//     const popularTags = Object.entries(tagCounts).map(([tag, tagCount]) => ({
//       tag,
//       tag_count: tagCount,
//     }));

//     //popularTags.sort((a, b) => b.tag_count - a.tag_count);

//     const result = popularTags.sort((a, b) => b.tag_count - a.tag_count)

//     console.log("result",result);
//     return result;
//   } catch (error) {
//     console.error('Error getting popular tags:', error);
//     throw error;
//   }
// }

async function getPopularTags(limit = 20) {
  try {
    const sql = `
      SELECT JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) as tags
      FROM discussions
      WHERE JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) IS NOT NULL
      LIMIT ${limit};
    `;

    const rows = await query(sql);

    // Process the result to extract individual tags
    const tags = rows.reduce((accumulator, row) => {
      const parsedTags = JSON.parse(row.tags);
      accumulator.push(...parsedTags);
      return accumulator;
    }, []);

    // Count the occurrences of each tag
    const tagCounts = {};
    tags.forEach(tag => {
      if (tagCounts[tag]) {
        tagCounts[tag]++;
      } else {
        tagCounts[tag] = 1;
      }
    });

    const popularTags = Object.entries(tagCounts).map(([tag, tagCount]) => ({
      tag,
      tag_count: tagCount,
    }));

    // Sort the popularTags by tag_count in descending order
    popularTags.sort((a, b) => b.tag_count - a.tag_count);

    return popularTags;
  } catch (error) {
    console.error('Error getting popular tags:', error);
    throw error;
  }
}

// async function getDiscussionListingByTag(limit, offset, tagname) {
//   const sql = `
//     SELECT
//       discussions.*,
//       u.first_name,
//       u.last_name,
//       mu.profile_pic AS user_profile_pic,
//       COALESCE(comments.total_comments, 0) as total_comments,
//       COALESCE(views.total_views, 0) as total_views
//     FROM discussions
//     LEFT JOIN users u ON discussions.user_id = u.user_id
//     LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
//     LEFT JOIN (
//       SELECT discussion_id, COUNT(*) as total_comments
//       FROM discussions_user_response
//       GROUP BY discussion_id
//     ) comments ON discussions.id = comments.discussion_id
//     LEFT JOIN (
//       SELECT discussion_id, COUNT(*) as total_views
//       FROM discussions_user_view
//       GROUP BY discussion_id
//     ) views ON discussions.id = views.discussion_id
//     WHERE tagname = ?
//     ORDER BY discussions.id DESC
//     LIMIT ? OFFSET ?;
//   `;

//   try {
//     const results = await query(sql, [tagname, parseInt(limit), parseInt(offset)]);
//     if (results.length > 0) {
//       return results;
//     } else {
//       return [];
//     }
//   } catch (error) {
//     console.error('Error during fetch All Latest Discussion:', error);
//   }
// }

// async function getDiscussionListingByTag(limit,offset,tag) {
//   try {

//     //   const sql = `
//     //   SELECT discussions.*
//     //   FROM discussions
//     //   WHERE JSON_CONTAINS(tags, JSON_QUOTE(?), '$')
//     //   ORDER BY discussions.id DESC;
//     // `;

//     const sql = `
//     SELECT discussions.*,
//     u.first_name,
//     u.last_name,
//     mu.profile_pic AS user_profile_pic,
//     COALESCE(comments.total_comments, 0) as total_comments,
//     COALESCE(views.total_views, 0) as total_views
// FROM discussions
// LEFT JOIN users u ON discussions.user_id = u.user_id
// LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
// LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_comments
//     FROM discussions_user_response
//     GROUP BY discussion_id
// ) comments ON discussions.id = comments.discussion_id
// LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_views
//     FROM discussions_user_view
//     GROUP BY discussion_id
// ) views ON discussions.id = views.discussion_id
// WHERE JSON_CONTAINS(tags, JSON_QUOTE(?), '$')
// ORDER BY discussions.id DESC
// LIMIT ? OFFSET ?;
// `;


//     // const results = await query(sql, [tag]);

//     const results = await query(sql, [parseInt(limit), parseInt(offset),tag]);
//     console.log("results", results);
//     return results;
//   } catch (error) {
//     console.error('Error getting discussions by tag:', error);
//     throw error;
//   }
// }


async function getDiscussionListingByTag(tag, limit, offset) {
  try {
    const sql = `
      SELECT
        discussions.*,
        u.first_name,
        u.last_name,
        mu.profile_pic AS user_profile_pic,
        COALESCE(comments.total_comments, 0) as total_comments,
        COALESCE(views.total_views, 0) as total_views
      FROM discussions
      LEFT JOIN users u ON discussions.user_id = u.user_id
      LEFT JOIN user_customer_meta mu ON discussions.user_id = mu.user_id
      LEFT JOIN (
        SELECT discussion_id, COUNT(*) as total_comments
        FROM discussions_user_response
        GROUP BY discussion_id
      ) comments ON discussions.id = comments.discussion_id
      LEFT JOIN (
        SELECT discussion_id, COUNT(*) as total_views
        FROM discussions_user_view
        GROUP BY discussion_id
      ) views ON discussions.id = views.discussion_id
      WHERE JSON_CONTAINS(tags, JSON_QUOTE(?), '$')
      ORDER BY discussions.id DESC
      LIMIT ? OFFSET ?;
    `;

    const results = await query(sql, [tag, parseInt(limit), parseInt(offset)]);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error getting discussions by tag:', error);
    throw error;
  }
}


async function searchDiscussion(keyword){
  const get_company_query = `
    SELECT id , topic FROM discussions
    WHERE topic LIKE '%${keyword}%' 
    ORDER BY id DESC
  `;
  try{
    const get_company_results = await query(get_company_query);
    if(get_company_results.length > 0 ){
      //console.log(get_company_results);
      return {status: 'ok', data: get_company_results, message: ' Discussion data recived'};
    }else{
      return {status: 'ok', data: '', message: 'No Discussion data found'};
    }
  }catch(error){
    return {status: 'err', data: '', message: 'No Discussion data found'};
  }  
}













//Function to get popular discussion from discussions table
// async function getAllPopularDiscussion() {
//   const sql = `
//   SELECT
//     discussions.*,
//     u.first_name,
//     u.last_name,
//     COALESCE(comments.total_comments, 0) as total_comments,
//     COALESCE(views.total_views, 0) as total_views
//   FROM discussions
//   LEFT JOIN users u ON discussions.user_id = u.user_id
//   LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_comments
//     FROM discussions_user_response
//     GROUP BY discussion_id
//   ) comments ON discussions.id = comments.discussion_id
//   LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_views
//     FROM discussions_user_view
//     GROUP BY discussion_id
//   ) views ON discussions.id = views.discussion_id
//   ORDER BY total_comments DESC;
//   ;
//   `;
//   try{
//     const results = await query(sql);
//     if (results.length>0) {

//     return results;
//     } else {
//       return [];
//     }
//   }
//   catch(error){
//     console.error('Error during fetch  Latest Discussion:', error);
//   }
// }


// async function insertDiscussionResponse(discussion_id, IP_address) {
//   const currentDate = new Date();
//   const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
//   const data = {
//     discussion_id : discussion_id,
//     ip_address: IP_address,
//   };
//   const checkQuery = `SELECT * FROM discussions_user_view WHERE discussion_id = '${discussion_id}'  AND ip_address = '${IP_address}'`;
//   const check_result = await query(checkQuery);
//   if(check_result.length > 0){
//     console.log(check_result[0].id);
//     return check_result[0].id
//   }else{
//     const sql = 'INSERT INTO discussions_user_view SET ?'
//     const results = await query(sql, data);
//     try{
//       console.log(results.insertId);
//       return results.insertId;
//     }
//     catch(error){
//       console.error('Error during insert discussions_user_view:', error);
//     }
//   }
// }


module.exports = {
  getUser,
  getUserMeta,
  getCountries,
  getStates,//new
  getUserRoles,
  getStatesByUserID,
  getAllCompany,
  getCompany,
  getCompanyCategory,
  renderCategoryTreeHTML,
  getCompanyCategoryBuID,
  saveUserGoogleLoginDataToDB,
  saveUserFacebookLoginDataToDB,
  getAllRatingTags,
  getReviewRatingData,
  getMetaValue,
  insertIntoFaqPages,
  insertIntoFaqCategories,
  insertIntoFaqItems,
  createCompany,
  createReview,
  getlatestReviews,
  getAllReviews,
  getTrendingReviews,
  getLatestReview,
  getCustomerReviewData,
  getCustomerReviewTagRelationData,
  editCustomerReview,
  searchCompany,
  getCompanyReviewNumbers,
  getCompanyReviews,
  getCompanyRatings,
  getTotalreplies,
  getTotalReviewsAndCounts,
  getUsersByRole,
  getUserCompany,
  getUserReview,
  getuserReviewCompany,
  ReviewReplyTo,
  ReviewReplyToCustomer,
  ReviewReplyToCompany,
  getCompanyPollDetails,
  getCompanyIdBySlug,
  getReviewReplies,
  getReviewRepliescompany,
  getpolldetails,//new
  updateReview,
  insertInvitationDetails,
  sendInvitationEmail,
  getSubCategories,
  getCompanyDetails,
  getCategoryDetails,
  getParentCategories,
  getCompanyIdByUserId,
  usercompanyreply,
  getClaimedByForCompany,
  CompanyReviews,
  getAllReviewReply,
  getreviewreplis,
  getPremiumCompanyData,
  getAllCommentByDiscusId,
  getAllPopularDiscussion,
  insertDiscussionResponse,
  getAllLatestDiscussion,
  getAllDiscussions,
  getAllRelatedDiscussion,
  getRelatedDiscussionsByTags,
  getPopularTags,
  getDiscussionListingByTag,
  searchDiscussion
};
