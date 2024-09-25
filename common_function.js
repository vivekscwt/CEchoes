const util = require('util');
const db = require('./config');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const useragent = require('useragent');
const requestIp = require('request-ip');
const axios = require('axios');
const { cache } = require('ejs');
const comFunction2 = require('./common_function2');
const mdlconfig = require('./config-module');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
// function getUserMeta(userId) {
//   return new Promise((resolve, reject) => {
//     const user_meta_query = `
//             SELECT user_meta.*, c.name as country_name, s.name as state_name, ccr.company_id as claimed_comp_id, company.paid_status as payment_status, company.slug, mp.plan_name
//             FROM user_customer_meta user_meta
//             LEFT JOIN countries c ON user_meta.country = c.id
//             LEFT JOIN states s ON user_meta.state = s.id
//             LEFT JOIN company_claim_request ccr ON user_meta.user_id = ccr.claimed_by
//             LEFT JOIN company ON company.ID = ccr.company_id
//             LEFT JOIN membership_plans mp ON company.membership_type_id = mp.id
//             WHERE user_meta.user_id = ?
//         `;
//     db.query(user_meta_query, [userId], (err, result) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(result[0]);
//       }
//     });
//   });
// }

function getUserMeta(userId) {
  return new Promise((resolve, reject) => {
    const user_meta_query = `
            SELECT user_meta.*, c.name as country_name, s.name as state_name, ccr.company_id as claimed_comp_id, company.paid_status as payment_status, company.slug, mp.name AS plan_name
            FROM user_customer_meta user_meta
            LEFT JOIN countries c ON user_meta.country = c.id
            LEFT JOIN states s ON user_meta.state = s.id
            LEFT JOIN company_claim_request ccr ON user_meta.user_id = ccr.claimed_by
            LEFT JOIN company ON company.ID = ccr.company_id
            LEFT JOIN plan_management mp ON company.membership_type_id = mp.id
            WHERE user_meta.user_id = ?
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
    SELECT ur.*, ccr.company_id, ccr.status
    FROM users ur
    LEFT JOIN company_claim_request ccr ON ur.user_id = ccr.claimed_by
    WHERE ur.user_type_id = ? AND ur.user_status = "1"`;
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
      console.log(result);
      if (err) {
        reject(err);
      } else if (result[0].country == null || result[0].country == undefined) {
        resolve([]);
      } else {
        //console.log('Result:', result); // Log the result array
        if (result && result.length > 0) {
          //console.log(result[0].country);
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

function getStatesByCountryID(countryId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM states WHERE country_id = ?', [countryId], async (err, result) => {
      console.log("result",result);
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  });
}

function getStatesByCountryshortname(countryId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM states WHERE country_id = ?', [countryId], async (err, result) => {
      console.log("result",result);
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
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
      WHERE c.status != '3'
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

// Fetch all trashed Company
function getAllTrashedCompany() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories
      FROM company c
      LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
      LEFT JOIN category cat ON cr.category_id = cat.ID
      WHERE c.status = '3'
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

// function getCompany(companyId) {
//   return new Promise((resolve, reject) => {
//     const sql = `SELECT company.*, ccr.claimed_by, mp.plan_name as membership_plan_name, pcd.cover_img
//               FROM company 
//               LEFT JOIN company_claim_request ccr ON company.ID = ccr.company_id
//               LEFT JOIN membership_plans mp ON company.membership_type_id = mp.id
//               LEFT JOIN premium_company_data pcd ON company.ID = pcd.company_id
//               WHERE company.ID = ?`
//     db.query(sql, [companyId], (err, result) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(result[0]);
//       }
//     });
//   });
// }

function getCompany(companyId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT company.*, ccr.claimed_by, mp.name as membership_plan_name, pcd.cover_img
              FROM company 
              LEFT JOIN company_claim_request ccr ON company.ID = ccr.company_id
              LEFT JOIN plan_management mp ON company.membership_type_id = mp.id
              LEFT JOIN premium_company_data pcd ON company.ID = pcd.company_id
              WHERE company.ID = ?`
    db.query(sql, [companyId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}
function getnewCompany(companyId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT temp_company.*
              FROM temp_company 
              WHERE temp_company.ID = ?`
    db.query(sql, [companyId], (err, result) => {
      console.log("resultsnewcomp",result);
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

function getComplaint(complaintId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT complaint.*,company.company_name
              FROM complaint 
              LEFT JOIN company ON complaint.company_id = company.ID
              WHERE complaint.id = ?`
    db.query(sql, [complaintId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

function getCategorybyCompany(companyId) {
  db.query('SELECT * FROM complaint_category WHERE company_id = ? AND parent_id = 0 ', [companyId], async (err, results) => {
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
            return results;
        } else {
            return [];
        }
    }
})
}

// async function getCompanyCategory() {
//   try {
//     const connection = await mysql.createConnection({
//       host: process.env.DATABASE_HOST,
//       user: process.env.DATABASE_USER,
//       password: process.env.DATABASE_PASSWORD,
//       database: process.env.DATABASE
//     });

//     const [categories] = await connection.query('SELECT * FROM category');
//     //console.log(categories);
//     connection.end();
//     const nestedCategories = buildCategoryTree(categories);   // This is the Json Format Of All Categories
//     const nestedCategoriesHTML = renderCategoryTreeHTML(nestedCategories);

//     return nestedCategoriesHTML;
//   } catch (error) {
//     throw new Error('Error fetching company categories');
//   }
// }

async function getCompanyCategory() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE
    });

    const [categories] = await connection.query(`
      SELECT category.*, GROUP_CONCAT(category_country_relation.country_id) AS country_ids
      FROM category
      LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id
      GROUP BY category.ID
    `);

    console.log("categories", categories);
    connection.end();

    const nestedCategories = buildCategoryTree(categories);   // This is the Json Format Of All Categories
    const nestedCategoriesHTML = renderCategoryTreeHTML(nestedCategories);

    return nestedCategoriesHTML;
  } catch (error) {
    console.error('Error fetching company categories:', error);
    throw new Error('Error fetching company categories');
  }
}




async function getParentCompany(country_shortname) {
  try {
    const parentcompanyquery = `SELECT * FROM company WHERE parent_id = '0' ORDER BY ID`;
    constparentvalue = await query(parentcompanyquery, [country_shortname]);
    if (constparentvalue.length > 0) {
      return constparentvalue
    }
    else {
      return []
    }
  } catch (error) {
    throw new Error('Error fetching company categories');
  }
}

async function getownparentcomp(compid) {
  try {
    const parentcompanyquery = `SELECT * FROM company WHERE ID=?`;
    constparentvalue = await query(parentcompanyquery, [compid]);
    if (constparentvalue.length > 0) {
      return constparentvalue
    }
    else {
      return []
    }
  } catch (error) {
    throw new Error('Error fetching company categories');
  }
}

async function getCountriesList() {
  try {
    const countryquery = `SELECT * FROM countries ORDER BY countries.id`;
    const countryvalue = await query(countryquery);
    console.log("countryvalue", countryvalue);

    if (countryvalue.length > 0) {
      //var countries = countryvalue.
      return countryvalue;
    } else {
      return [];
    }


  } catch (error) {
    throw new Error('Error fetching countries');
  }
}

function buildCategoryTree(categories, parentId = 0) {
  const categoryTree = [];

  categories.forEach((category) => {
    if (category.parent_id === parentId) {
      const children = buildCategoryTree(categories, category.ID);
      const categoryNode = { id: category.ID, name: category.category_name, img: category.category_img,country_id: category.country_id, children };
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

async function getplans(){
  try {
    const planquery = `SELECT * FROM plan_management`;
    const planvalue = await query(planquery);
    console.log("planvalue", planvalue);

    if (planvalue.length > 0) {
      //var countries = countryvalue.
      return planvalue;
    } else {
      return [];
    }


  } catch (error) {
    throw new Error('Error fetching countries');
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
async function saveUserGoogleLoginDataToDB(userData) {
  //console.log(userData);

  const userFullName = userData.displayName;
  const userFullNameArray = userFullName.split(" ");
  const userFirstName = userData.name.givenName;
  const userLastName = userData.name.familyName;
  const userEmail = userData.emails[0].value;
  const userPicture = userData.photos[0].value;
  const external_registration_id = userData.id;


  //Checking external_registration_id and Email exist or not
  try {
    // const user_exist_query = 'SELECT * FROM users WHERE register_from = ? AND external_registration_id = ? AND email = ?';
    // const user_exist_values = ["gmail", userData.id, userData.emails[0].value];
    const user_exist_query = 'SELECT * FROM users WHERE email = ?';
    const user_exist_values = [userData.emails[0].value];
    const user_exist_results = await query(user_exist_query, user_exist_values);
    if (user_exist_results.length > 0) {
      //console.log(user_exist_results);
      // checking user status
      return { user_id: user_exist_results[0].user_id, first_name: userFirstName, last_name: userLastName, email: userEmail, profile_pic: userPicture, status: 1, register_from: user_exist_results[0].register_from };

    } else {
      return { first_name: userFirstName, last_name: userLastName, email: userEmail, profile_pic: userPicture, external_registration_id: external_registration_id, status: 0 };
    }
  } catch (error) {
    console.error('Error during user_exist_query:', error);
  }

};

//-------After Facebook Login Save User data Or Check User exist or Not.
async function saveUserFacebookLoginDataToDB(userData) {
  //console.log(userData);
  //console.log(userData.id + ' ' + userData.displayName + ' ' + userData.photos[0].value);
  //const currentDate = new Date();
  //const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  const userFullName = userData.displayName;
  const userFullNameArray = userFullName.split(" ");
  const userFirstName = userData.name.givenName;
  const userLastName = userData.name.familyName;
  const userEmail = userData.emails[0].value;
  const userPicture = userData.photos[0].value;
  const external_registration_id = userData.id;


  //Checking external_registration_id and Email exist or not
  try {
    //const user_exist_query = 'SELECT * FROM users WHERE register_from = ? AND external_registration_id = ? AND email = ?';
    //const user_exist_values = ["facebook", userData.id, userData.emails[0].value];
    const user_exist_query = 'SELECT * FROM users WHERE email = ?';
    const user_exist_values = [userData.emails[0].value];
    const user_exist_results = await query(user_exist_query, user_exist_values);
    if (user_exist_results.length > 0) {
      //console.log(user_exist_results);
      // checking user status
      return { user_id: user_exist_results[0].user_id, first_name: userFirstName, last_name: userLastName, email: userEmail, profile_pic: userPicture, status: 1, register_from: user_exist_results[0].register_from };

    } else {
      return { first_name: userFirstName, last_name: userLastName, email: userEmail, profile_pic: userPicture, external_registration_id: external_registration_id, status: 0 };
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
  // const all_review_query = `
  //   SELECT r.*, c.company_name, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic, rr.status as reply_status
  //     FROM reviews r
  //     JOIN company c ON r.company_id = c.ID
  //     JOIN company_location cl ON r.company_location_id = cl.ID
  //     JOIN users u ON r.customer_id = u.user_id
  //     LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
  //     LEFT JOIN review_reply rr ON rr.review_id = r.id AND rr.reply_by = r.customer_id
  //     WHERE r.flag_status = '0' OR r.flag_status IS NULL
  //     ORDER BY r.created_at DESC;
  // `;
  const all_review_query = `
  SELECT r.*, c.company_name, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic, rr.status as reply_status
    FROM reviews r
    LEFT JOIN company c ON r.company_id = c.ID
    LEFT JOIN company_location cl ON r.company_location_id = cl.ID
    LEFT JOIN users u ON r.customer_id = u.user_id
    LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
    LEFT JOIN review_reply rr ON rr.review_id = r.id AND rr.reply_by = r.customer_id
    WHERE r.flag_status = '0' OR r.flag_status IS NULL
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

async function getTempReviews() {
  const all_review_query = `
    SELECT r.*, c.company_name, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic, rr.status as reply_status
      FROM reviews r
      JOIN company c ON r.company_id = c.ID
      JOIN company_location cl ON r.company_location_id = cl.ID
      JOIN users u ON r.customer_id = u.user_id
      LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
      LEFT JOIN review_reply rr ON rr.review_id = r.id AND rr.reply_by = r.customer_id
      WHERE r.flag_status = '0' OR r.flag_status IS NULL AND temp_review_status='1'
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

async function getAllReviewsByCompanyID(companyId) {
  const all_review_query = `
  SELECT r.*, c.company_name, c.slug, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic, count(rr.ID) as reply_count, cp.product_title 
  FROM reviews r
  JOIN company c ON r.company_id = c.ID
  JOIN company_location cl ON r.company_location_id = cl.ID
  JOIN users u ON r.customer_id = u.user_id
  LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
  LEFT JOIN review_reply rr ON r.id = rr.review_id
  LEFT JOIN company_products cp ON r.product_id = cp.id 
  WHERE r.company_id = ? AND r.review_status = '1' AND (r.flag_status != '0' OR r.flag_status IS NULL)
  GROUP BY r.id
  ORDER BY r.created_at DESC;
  `;
  try {
    const all_review_results = await query(all_review_query, companyId);
    if (all_review_results.length > 0) {
      return all_review_results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during all_review_query:', error);
  }
}

async function getCustomerReviewData(review_Id) {
  const select_review_query = `
    SELECT r.*, c.company_name, c.slug, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic,rr.ID as reply_id, rr.status as reply_status, rr.reason as reply_rejecting_reason, rr.comment as reply_content, rrCompany.comment as company_reply_content, cc.category_name, cp.product_title  
      FROM reviews r
      JOIN company c ON r.company_id = c.ID
      JOIN company_location cl ON r.company_location_id = cl.ID
      JOIN users u ON r.customer_id = u.user_id
      LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
      LEFT JOIN review_reply rr ON rr.review_id = r.id AND rr.reply_by = r.customer_id
      LEFT JOIN review_reply rrCompany ON rrCompany.review_id = r.id AND rrCompany.reply_by != r.customer_id
      LEFT JOIN complaint_category cc ON r.category_id = cc.id 
      LEFT JOIN company_products cp ON r.product_id = cp.id 
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
// async function insertIntoFaqPages(data) {
//   try {
//     const checkQuery = `SELECT * FROM faq_pages WHERE 1`;
//     db.query(checkQuery, async (checkErr, checkResult) => {
//       if (checkResult.length > 0) {
//         const updateQuery = `UPDATE faq_pages SET title=?, content = ?, meta_title = ?, meta_desc = ?, keyword = ?, app_banner_content = ? WHERE id = ${checkResult[0].id}`;
//         const results = await query(updateQuery, data);
//         return checkResult[0].id;
//       } else {
//         const insertQuery = 'INSERT INTO faq_pages (title, content, meta_title, meta_desc, keyword, app_banner_content) VALUES (?, ?, ?, ?, ?, ?)';
//         const results = await query(insertQuery, data);
//         return results.insertId;
//       }
//     })


//   } catch (error) {
//     console.error('Error inserting data into faq_pages table:', error);
//     throw error;
//   }
// }

async function insertIntoFaqPages(data, country) {
  return new Promise((resolve, reject) => {
    try {
      const checkQuery = `SELECT * FROM faq_pages WHERE country = ?`;
      db.query(checkQuery, [country], async (checkErr, checkResult) => {
        if (checkErr) {
          console.error('Error checking faq_pages:', checkErr);
          reject(checkErr);
        }

        if (checkResult.length > 0) {
          const updateQuery = `UPDATE faq_pages SET title=?, content=?, meta_title=?, meta_desc=?, keyword=?, app_banner_content=? WHERE id=? AND country=?`;
          const updateValues = [...data, checkResult[0].id, country];
          const results = await query(updateQuery, updateValues);
          console.log('Data updated in faq_pages table');
          resolve(checkResult[0].id);
        } else {
          const insertQuery = `INSERT INTO faq_pages (title, content, meta_title, meta_desc, keyword, app_banner_content, country) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          const insertValues = [...data, country];
          const results = await query(insertQuery, insertValues);
          console.log('Data inserted into faq_pages table');
          resolve(results.insertId);
        }
      });
    } catch (error) {
      console.error('Error inserting/updating data into faq_pages table:', error);
      reject(error);
    }
  });
}



// Function to insert data into 'faq_categories' table
// async function insertIntoFaqCategories(categoryArray) {
//   if (Array.isArray(categoryArray) && categoryArray.length > 0) {
//     for (const categoryData of categoryArray) {

//       try {
//         const categoryTitle = Object.keys(categoryData)[0];
//         const CatinsertQuery = `INSERT INTO faq_categories (category) VALUES (?)`;
//         const Catinsertvalues = [categoryTitle];
//         const results = await query(CatinsertQuery, Catinsertvalues);
//         const categoryId = results.insertId;
//         console.log('Data inserted into faq_categories table:', categoryId);

//         // Insert data into 'faq_item' table for the current category
//         if (categoryData[categoryTitle].length > 0) {
//           await insertIntoFaqItems(categoryData[categoryTitle], categoryId);
//         }
//       } catch (error) {
//         console.error('Error inserting data into faq_categories table:', error);
//         throw error;
//       }
//     }
//   }
// }
//ac
// async function insertIntoFaqCategories(categoryArray, country) {
//   if (Array.isArray(categoryArray) && categoryArray.length > 0) {
//     for (const categoryData of categoryArray) {
//       try {
//         const categoryTitle = Object.keys(categoryData)[0];
//         const CatinsertQuery = `INSERT INTO faq_categories (category, country) VALUES (?, ?)`;
//         const Catinsertvalues = [categoryTitle, country];
//         const results = await query(CatinsertQuery, Catinsertvalues);
//         const categoryId = results.insertId;
//         console.log('Data inserted into faq_categories table:', categoryId);

//         if (categoryData[categoryTitle].length > 0) {
//           await insertIntoFaqItems(categoryData[categoryTitle], categoryId, country);
//         }
//       } catch (error) {
//         console.error('Error inserting data into faq_categories table:', error);
//         throw error;
//       }
//     }
//   }
// }


async function insertIntoFaqCategories(categoryArray, country) {
  if (Array.isArray(categoryArray) && categoryArray.length > 0) {
    for (const categoryData of categoryArray) {
      try {
        const categoryTitle = Object.keys(categoryData)[0];
        const CatinsertQuery = `INSERT INTO faq_categories (category, country) VALUES (?, ?)`;
        const Catinsertvalues = [categoryTitle, country];
        const results = await query(CatinsertQuery, Catinsertvalues);
        const categoryId = results.insertId;
        console.log('Data inserted into faq_categories table:', categoryId);

        // Insert data into 'faq_item' table for the current category
        if (categoryData[categoryTitle].length > 0) {
          await insertIntoFaqItems(categoryData[categoryTitle], categoryId, country);
        }
      } catch (error) {
        console.error('Error inserting data into faq_categories table:', error);
        throw error;
      }
    }
  }
}



// Function to insert data into 'faq_item' table
async function insertIntoFaqItems(faqItemsArray, categoryId, country) {
  if (Array.isArray(faqItemsArray) && faqItemsArray.length > 0) {
    for (const faqItemData of faqItemsArray) {
      try {
        const FAQItenInsertquery = `INSERT INTO faq_item (category_id, country, question, answer) VALUES (?, ?, ?, ?)`;
        const FAQItenInsertvalues = [categoryId, country, faqItemData.Q, faqItemData.A];

        const results = await query(FAQItenInsertquery, FAQItenInsertvalues);
        console.log('Data inserted into faq_item table:', results.insertId);
      } catch (error) {
        console.error('Error inserting data into faq_item table:', error);
        throw error;
      }
    }
  }
}

// async function insertIntoFaqItems(itemsArray, categoryId, country) {
//   try {
//     for (const category of itemsArray) {
//       for (const item of category[Object.keys(category)[0]]) {
//         const { Q, A } = item;
//         const itemInsertQuery = `INSERT INTO faq_item (question, answer, category_id, country) VALUES (?, ?, ?, ?)`;
//         const itemInsertValues = [Q, A, categoryId, country];
//         await query(itemInsertQuery, itemInsertValues);
//         console.log('Data inserted into faq_item table:', Q, A, categoryId, country);
//       }
//     }
//   } catch (error) {
//     console.error('Error inserting data into faq_item table:', error);
//     throw error;
//   }
// }





//-- Create New Company ----------//
async function createCompany(comInfo, userId) {
  console.log("comInfo, userId", comInfo, userId);
  console.log("comInfo.company_name",comInfo.company_name);
  let return_data = {};
  try {
    // Check if the company Name already exists in the "company" table
    //const company_name_checking_query = "SELECT ID FROM company WHERE company_name = ?";
    const company_name_checking_query = "SELECT company_name FROM company WHERE ID = ?";
    const company_name_checking_results = await query(company_name_checking_query, [comInfo.company_name]);
    if (company_name_checking_results.length > 0) {
      //company exist
      console.log("company exits");
      var compid=company_name_checking_results[0].ID;
      console.log("compid",compid);
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
          //new
          const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${comInfo.main_address_country}"`;
          const country_name_value = await query(country_name_query);
          if (country_name_value.length > 0) {
            var country_name = country_name_value[0].name;
            console.log("country_name", country_name);
            var country_id = country_name_value[0].id;
            console.log("country_id", country_id);
          }

          const state_name_query = `SELECT * FROM states WHERE id = "${comInfo.main_address_state}"`;
          const state_name_value = await query(state_name_query);
          if (state_name_value.length > 0) {
            var state_name = state_name_value[0].name;
            console.log("state_name", state_name);
          }

          var city_value = comInfo['review-address'];
          console.log("city_value", city_value);

          var concatenatedAddress = city_value + ', ' + state_name + ', ' + country_name;
          console.log(concatenatedAddress);



          //create new address for company
          try {
            const create_company_address_query = 'INSERT INTO company_location (company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
            //const create_company_address_values = [company_name_checking_results[0].ID, comInfo.address, '', '', '', '', '2'];
            const create_company_address_values = [comInfo.company_name, concatenatedAddress, country_name, '', '', '', '2'];

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
        const companySlug = await new Promise((resolve, reject) => {
          comFunction2.generateUniqueSlug(comInfo.company_name, (error, generatedSlug) => {
            if (error) {
              console.log('Error:', error.message);
              reject(error);
            } else {
              //console.log('Generated Company Slug:', generatedSlug);
              resolve(generatedSlug);
            }
          });
        });

        //console.log('Outside of Callback - Company Slug:', companySlug);
        //return false;
        const companyInsertData = {
          user_created_by: userId,
          company_name: comInfo.company_name || null,
          status: '2',
          created_date: formattedDate,
          updated_date: formattedDate,
          main_address: comInfo.address || null,
          verified: '0',
          slug: companySlug,
        };
        const create_company_query = 'INSERT INTO company SET ?'
        const create_company_results = await query(create_company_query, companyInsertData);

        if (create_company_results.insertId) {
          //create new address for company

          //new
          const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${comInfo.main_address_country}"`;
          const country_name_value = await query(country_name_query);
          if (country_name_value.length > 0) {
            var country_name = country_name_value[0].name;
            console.log("country_name", country_name);
            var country_id = country_name_value[0].id;
            console.log("country_id", country_id);
          }

          const state_name_query = `SELECT * FROM states WHERE id = "${comInfo.main_address_state}"`;
          const state_name_value = await query(state_name_query);
          if (state_name_value.length > 0) {
            var state_name = state_name_value[0].name;
            console.log("state_name", state_name);
          }

          var city_value = comInfo['review-address'];
          console.log("city_value", city_value);

          // var concatenatedAddresses = city_value + ', ' + state_name + ', ' + country_name;
          // console.log("concatenatedAddresses",concatenatedAddresses);

          var concatenatedAddress = '';

          if (city_value) {
            concatenatedAddress += city_value;
          }

          if (state_name) {
            if (concatenatedAddress) {
              concatenatedAddress += ', ';
            }
            concatenatedAddress += state_name;
          }

          if (country_name) {
            if (concatenatedAddress) {
              concatenatedAddress += ', ';
            }
            concatenatedAddress += country_name;
          }

          console.log("concatenatedAddress", concatenatedAddress);


          try {
            const create_company_address_values = {
              company_id: create_company_results.insertId,
              //address: comInfo.address || null,
              address: concatenatedAddress || null,
              status: '2',
            };
            const create_company_address_query = 'INSERT INTO company_location SET ?'
            const create_company_address_results = await query(create_company_address_query, create_company_address_values);

            if (create_company_address_results.insertId) {
              return_data.companyID = create_company_results.insertId;
              return_data.companyLocationID = create_company_address_results.insertId;
              console.log('return_data', return_data)
              return return_data;
            } else {
              return_data.companyID = create_company_results.insertId;
              return_data.companyLocationID = '';
              console.log('return_data.companyLocationID:', return_data)
              return return_data;
            }
          } catch (error) {
            console.error('Error during create_company_address_query:', error);
            return error;
          }
        } else {
          return [];
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

//actual
async function createcompany(comInfo, userId) {
  console.log("comInfo, userId", comInfo, userId);
  console.log("createcompany");
  let return_data = {};
  try {
    // Check if the company Name already exists in the "company" table
    //const company_name_checking_query = "SELECT ID FROM company WHERE company_name = ?";
    const company_name_checking_query = "SELECT ID FROM company WHERE company_name = ?";
    const company_name_checking_results = await query(company_name_checking_query, [comInfo.company_name]);
    console.log("iiiiiiiiiiiii");

    if (company_name_checking_results.length > 0) {
      //company exist
      console.log("company exits");
      console.log("company_name_checking_results[0].ID",company_name_checking_results[0].ID);
      try {
        //const company_address_exist_query = 'SELECT * FROM company_location WHERE company_id = ? AND address = ?';
        const company_address_exist_query = 'SELECT * FROM company_location WHERE company_id = ?';
        const company_address_exist_values = [company_name_checking_results[0].ID, comInfo.address];
        const company_address_exist_results = await query(company_address_exist_query, company_address_exist_values);
        if (company_address_exist_results.length > 0) {
          console.log("company_address_exist_results.length > 0");
          //address exist return location ID
          return_data.companyID = company_name_checking_results[0].ID;
          return_data.companyLocationID = company_address_exist_results[0].ID;
          return return_data;
        } else {
          //new
          const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${comInfo.main_address_country}"`;
          const country_name_value = await query(country_name_query);
          if (country_name_value.length > 0) {
            var country_name = country_name_value[0].name;
            console.log("country_name", country_name);
            var country_id = country_name_value[0].id;
            console.log("country_id", country_id);
          }

          const state_name_query = `SELECT * FROM states WHERE id = "${comInfo.main_address_state}"`;
          const state_name_value = await query(state_name_query);
          if (state_name_value.length > 0) {
            var state_name = state_name_value[0].name;
            console.log("state_name", state_name);
          }

          var city_value = comInfo['review-address'];
          console.log("city_value", city_value);

          var concatenatedAddress = city_value + ', ' + state_name + ', ' + country_name;
          console.log(concatenatedAddress);



          //create new address for company
          try {
            const create_company_address_query = 'INSERT INTO company_location (company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const create_company_address_values = [company_name_checking_results[0].ID, comInfo.address, country_name, '', '', '', '2'];
            //const create_company_address_values = [comInfo.company_name, concatenatedAddress, '', '', '', '', '2'];

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
      console.log("ppppppp");
      const currentDate = new Date();

      // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
      const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
      try {
        const companySlug = await new Promise((resolve, reject) => {
          comFunction2.generateUniqueSlug(comInfo.company_name, (error, generatedSlug) => {
            if (error) {
              console.log('Error:', error.message);
              reject(error);
            } else {
              //console.log('Generated Company Slug:', generatedSlug);
              resolve(generatedSlug);
            }
          });
        });

        //console.log('Outside of Callback - Company Slug:', companySlug);
        //return false;
        const companyInsertData = {
          user_created_by: userId,
          company_name: comInfo.company_name || null,
          status: '2',
          created_date: formattedDate,
          updated_date: formattedDate,
          main_address: comInfo.address || null,
          verified: '0',
          slug: companySlug,
          main_address_country: comInfo.main_address_country,
          main_address_state: comInfo.main_address_state,
          parent_id: '0',
          paid_status: "free",
          temp_comp_status: "1"
        };
        const create_company_query = 'INSERT INTO company SET ?'
        const create_company_results = await query(create_company_query, companyInsertData);

        if (create_company_results.insertId) {
          //create new address for company

          //new
          const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${comInfo.main_address_country}"`;
          const country_name_value = await query(country_name_query);
          if (country_name_value.length > 0) {
            var country_name = country_name_value[0].name;
            console.log("country_name", country_name);
            var country_id = country_name_value[0].id;
            console.log("country_id", country_id);
          }

          const state_name_query = `SELECT * FROM states WHERE id = "${comInfo.main_address_state}"`;
          const state_name_value = await query(state_name_query);
          if (state_name_value.length > 0) {
            var state_name = state_name_value[0].name;
            console.log("state_name", state_name);
          }

          var city_value = comInfo['review-address'];
          console.log("city_value", city_value);

          // var concatenatedAddresses = city_value + ', ' + state_name + ', ' + country_name;
          // console.log("concatenatedAddresses",concatenatedAddresses);

          var concatenatedAddress = '';

          if (city_value) {
            concatenatedAddress += city_value;
          }

          if (state_name) {
            if (concatenatedAddress) {
              concatenatedAddress += ', ';
            }
            concatenatedAddress += state_name;
          }

          if (country_name) {
            if (concatenatedAddress) {
              concatenatedAddress += ', ';
            }
            concatenatedAddress += country_name;
          }

          console.log("concatenatedAddress", concatenatedAddress);

          const template =`<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
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
                                      <strong>Hello Admin,</strong>
                                      <p style="font-size:15px; line-height:20px">A new company has created. <a class="btn btn-primary" href="${process.env.MAIN_URL}new-companies">Click here </a>to check this company.</p>
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
              to: 'dev2.scwt@gmail.com',
              //to: process.env.MAIL_USER,
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


          try {
            const create_company_address_values = {
              company_id: create_company_results.insertId,
              //address: comInfo.address || null,
              address: concatenatedAddress || null,
              status: '2',
            };
            const create_company_address_query = 'INSERT INTO company_location SET ?'
            const create_company_address_results = await query(create_company_address_query, create_company_address_values);

            if (create_company_address_results.insertId) {
              return_data.companyID = create_company_results.insertId;
              return_data.companyLocationID = create_company_address_results.insertId;
              console.log('return_data', return_data)
              return return_data;
            } else {
              return_data.companyID = create_company_results.insertId;
              return_data.companyLocationID = '';
              console.log('return_data.companyLocationID:', return_data)
              return return_data;
            }
          } catch (error) {
            console.error('Error during create_company_address_query:', error);
            return error;
          }
        } else {
          return [];
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

// async function createcompany(comInfo, userId) {
//   console.log("comInfo, userId", comInfo, userId);
//   console.log("createcompany");
//   let return_data = {};
//   try {
//     // Check if the company Name already exists in the "company" table
//     //const company_name_checking_query = "SELECT ID FROM company WHERE company_name = ?";
//     const company_name_checking_query = "SELECT ID FROM company WHERE company_name = ?";
//     const company_name_checking_results = await query(company_name_checking_query, [comInfo.company_name]);
//     console.log("iiiiiiiiiiiii");

//     if (company_name_checking_results.length > 0) {
//       //company exist
//       console.log("company exits");
//       console.log("company_name_checking_results[0].ID",company_name_checking_results[0].ID);
//       try {
//         //const company_address_exist_query = 'SELECT * FROM company_location WHERE company_id = ? AND address = ?';
//         const company_address_exist_query = 'SELECT * FROM company_location WHERE company_id = ?';
//         const company_address_exist_values = [company_name_checking_results[0].ID, comInfo.address];
//         const company_address_exist_results = await query(company_address_exist_query, company_address_exist_values);
//         if (company_address_exist_results.length > 0) {
//           console.log("company_address_exist_results.length > 0");
//           //address exist return location ID
//           return_data.companyID = company_name_checking_results[0].ID;
//           return_data.companyLocationID = company_address_exist_results[0].ID;
//           return return_data;
//         } else {
//           //new
//           const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${comInfo.main_address_country}"`;
//           const country_name_value = await query(country_name_query);
//           if (country_name_value.length > 0) {
//             var country_name = country_name_value[0].name;
//             console.log("country_name", country_name);
//             var country_id = country_name_value[0].id;
//             console.log("country_id", country_id);
//           }

//           const state_name_query = `SELECT * FROM states WHERE id = "${comInfo.main_address_state}"`;
//           const state_name_value = await query(state_name_query);
//           if (state_name_value.length > 0) {
//             var state_name = state_name_value[0].name;
//             console.log("state_name", state_name);
//           }

//           var city_value = comInfo['review-address'];
//           console.log("city_value", city_value);

//           var concatenatedAddress = city_value + ', ' + state_name + ', ' + country_name;
//           console.log(concatenatedAddress);



//           //create new address for company
//           try {
//             const create_company_address_query = 'INSERT INTO company_location (temp_company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
//             const create_company_address_values = [company_name_checking_results[0].ID, comInfo.address, country_name, '', '', '', '2'];
//             //const create_company_address_values = [comInfo.company_name, concatenatedAddress, '', '', '', '', '2'];

//             const create_company_address_results = await query(create_company_address_query, create_company_address_values);
//             if (create_company_address_results.insertId) {
//               return_data.companyID = company_name_checking_results[0].ID;
//               return_data.companyLocationID = create_company_address_results.insertId;
//               return return_data;
//             }
//           } catch (error) {
//             console.error('Error during create_company_address_query:', error);
//             return error;
//           }

//         }
//       } catch (error) {
//         console.error('Error during company_address_exist_query:', error);
//         return error;
//       }
//       //return company_name_checking_results[0].ID;
//     } else {
//       // Create New Company
//       // Get the current date
//       console.log("ppppppp");
//       const currentDate = new Date();

//       // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
//       const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
//       try {
//         const companySlug = await new Promise((resolve, reject) => {
//           comFunction2.generateUniqueSlug(comInfo.company_name, (error, generatedSlug) => {
//             if (error) {
//               console.log('Error:', error.message);
//               reject(error);
//             } else {
//               //console.log('Generated Company Slug:', generatedSlug);
//               resolve(generatedSlug);
//             }
//           });
//         });

//         //console.log('Outside of Callback - Company Slug:', companySlug);
//         //return false;
//         const companyInsertData = {
//           user_created_by: userId,
//           company_name: comInfo.company_name || null,
//           status: '2',
//           created_date: formattedDate,
//           updated_date: formattedDate,
//           main_address: comInfo.address || null,
//           verified: '0',
//           slug: companySlug,
//           main_address_country: comInfo.main_address_country,
//           main_address_state: comInfo.main_address_state,
//           parent_id: '0',
//           paid_status: "free",
//           temp_comp_status: '0'
//         };
//         // const create_company_query = 'INSERT INTO company SET ?'
//          const create_company_query = 'INSERT INTO temp_company SET ?'
//         const create_company_results = await query(create_company_query, companyInsertData);

//         if (create_company_results.insertId) {
//           //create new address for company

//           //new
//           const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${comInfo.main_address_country}"`;
//           const country_name_value = await query(country_name_query);
//           if (country_name_value.length > 0) {
//             var country_name = country_name_value[0].name;
//             console.log("country_name", country_name);
//             var country_id = country_name_value[0].id;
//             console.log("country_id", country_id);
//           }

//           const state_name_query = `SELECT * FROM states WHERE id = "${comInfo.main_address_state}"`;
//           const state_name_value = await query(state_name_query);
//           if (state_name_value.length > 0) {
//             var state_name = state_name_value[0].name;
//             console.log("state_name", state_name);
//           }

//           var city_value = comInfo['review-address'];
//           console.log("city_value", city_value);

//           // var concatenatedAddresses = city_value + ', ' + state_name + ', ' + country_name;
//           // console.log("concatenatedAddresses",concatenatedAddresses);

//           var concatenatedAddress = '';

//           if (city_value) {
//             concatenatedAddress += city_value;
//           }

//           if (state_name) {
//             if (concatenatedAddress) {
//               concatenatedAddress += ', ';
//             }
//             concatenatedAddress += state_name;
//           }

//           if (country_name) {
//             if (concatenatedAddress) {
//               concatenatedAddress += ', ';
//             }
//             concatenatedAddress += country_name;
//           }

//           console.log("concatenatedAddress", concatenatedAddress);


//           try {
//             const create_company_address_values = {
//               company_id: create_company_results.insertId,
//               //address: comInfo.address || null,
//               address: concatenatedAddress || null,
//               status: '2',
//             };
//             const create_company_address_query = 'INSERT INTO company_location SET ?'
//             const create_company_address_results = await query(create_company_address_query, create_company_address_values);

//             if (create_company_address_results.insertId) {
//               return_data.companyID = create_company_results.insertId;
//               return_data.companyLocationID = create_company_address_results.insertId;
//               console.log('return_data', return_data)
//               return return_data;
//             } else {
//               return_data.companyID = create_company_results.insertId;
//               return_data.companyLocationID = '';
//               console.log('return_data.companyLocationID:', return_data)
//               return return_data;
//             }
//           } catch (error) {
//             console.error('Error during create_company_address_query:', error);
//             return error;
//           }
//         } else {
//           return [];
//         }

//       } catch (error) {
//         console.error('Error during user create_company_query:', error);
//         return error;
//       }
//     }
//   }
//   catch (error) {
//     console.error('Error during user company_name_checking_query:', error);
//   }
// };
// async function createReview(reviewIfo, userId, comInfo){
//   // console.log('Review Info', reviewIfo);
//   // console.log('Company Info', comInfo);
//   // reviewIfo['tags[]'].forEach((tag) => {
//   //   console.log(tag);
//   // });
//   if (typeof reviewIfo['tags[]'] === 'string') {
//     // Convert it to an array containing a single element
//     reviewIfo['tags[]'] = [reviewIfo['tags[]']];
//   }
//   const currentDate = new Date();
//   // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
//   const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

//   const create_review_query = 'INSERT INTO reviews (company_id, customer_id, company_location, company_location_id, review_title, rating, review_content, user_privacy, review_status, created_at, updated_at, labels, user_contact, category_id, product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//   const create_review_values = [comInfo.companyID, userId, reviewIfo.address, comInfo.companyLocationID, reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, formattedDate, reviewIfo.review_lable, reviewIfo.user_contact, reviewIfo.category_id, reviewIfo.product_id  ];

//   try {
//     const create_review_results = await query(create_review_query, create_review_values);
//     if(create_review_results.insertId){
//       if (Array.isArray(reviewIfo['tags[]']) && reviewIfo['tags[]'].length > 0) {
//         //insert review_tag_relation
//         const review_tag_relation_query = 'INSERT INTO review_tag_relation (review_id, tag_name) VALUES (?, ?)';
//         try{
//           for (const tag of reviewIfo['tags[]']) {
//             const review_tag_relation_values = [create_review_results.insertId, tag];
//             const review_tag_relation_results = await query(review_tag_relation_query, review_tag_relation_values);
//           }

//           //-- user review count------//
//           const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//           try {
//             const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//             return create_review_results.insertId;
//           }catch (error) {
//             console.error('Error during user update_review_count_query:', error);
//           }

//         }catch(error){
//           console.error('Error during user review_tag_relation_results:', error);
//         }
//       }else{
//         //-- user review count------//
//         const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//         try {
//           const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//           return create_review_results.insertId;
//         }catch (error) {
//           console.error('Error during user update_review_count_query:', error);
//         }
//       }
//     }
//   }catch (error) {
//     console.error('Error during user create_review_results:', error);
//   }
// }

async function createReview(reviewIfo, userId, comInfo) {
  console.log('Review Info', reviewIfo);
  console.log('Company Info', comInfo);
  // reviewIfo['tags[]'].forEach((tag) => {
  //   console.log(tag);
  // });

  console.log("typeof reviewIfo['tags[]']",typeof reviewIfo['tags[]']);

  if (typeof reviewIfo['tags[]'] === 'string') {
    // Convert it to an array containing a single element
    reviewIfo['tags[]'] = [reviewIfo['tags[]']];
  }
  const currentDate = new Date();
  // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');


  const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${reviewIfo.main_address_country}"`;
  const country_name_value = await query(country_name_query);
  if (country_name_value.length > 0) {
    var country_name = country_name_value[0].name;
    console.log("country_name", country_name);
    var country_id = country_name_value[0].id;
    console.log("country_id", country_id);
  }

  const state_name_query = `SELECT * FROM states WHERE id = "${reviewIfo.main_address_state}"`;
  const state_name_value = await query(state_name_query);
  if (state_name_value.length > 0) {
    var state_name = state_name_value[0].name;
    console.log("state_name", state_name);
  }

  var city_value = reviewIfo['review-address'];
  console.log("city_value", city_value);

  // var concatenatedAddress = city_value + ', ' + state_name + ', ' + country_name;
  // console.log(concatenatedAddress);

  var concatenatedAddress = '';

  if (city_value) {
    concatenatedAddress += city_value;
  }

  if (state_name) {
    if (concatenatedAddress) {
      concatenatedAddress += ', ';
    }
    concatenatedAddress += state_name;
  }

  if (country_name) {
    if (concatenatedAddress) {
      concatenatedAddress += ', ';
    }
    concatenatedAddress += country_name;
  }

  console.log("concatenatedAddress", concatenatedAddress);




  // const country_name_query = `SELECT name FROM countries WHERE shortname = "${reviewIfo.main_address_country}"`;
  // const country_name_value = await query(country_name_query);
  // if(country_name_value.length>0){
  //   var country_name = country_name_value[0].name;
  //   console.log("country_name",country_name);
  // }


  const create_review_query = 'INSERT INTO reviews (company_id, customer_id, company_location, company_location_id, review_title, rating, review_content, user_privacy, review_status, created_at, updated_at, labels, user_contact, category_id, product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const create_review_values = [reviewIfo.company_name, userId, concatenatedAddress, comInfo.companyLocationID, reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, formattedDate, reviewIfo.review_lable, reviewIfo.user_contact, reviewIfo.category_id, reviewIfo.product_id];

  try {
    const create_review_results = await query(create_review_query, create_review_values);
    if (create_review_results.insertId) {
      if (Array.isArray(reviewIfo['tags[]']) && reviewIfo['tags[]'].length > 0) {
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
      } else {
        //-- user review count------//
        const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
        try {
          const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
          return create_review_results.insertId;
        } catch (error) {
          console.error('Error during user update_review_count_query:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error during user create_review_results:', error);
  }
}
// async function createreview(reviewIfo, userId, comInfo) {
//   console.log('Review Info', reviewIfo);
//   console.log('Company Info', comInfo);
//   // reviewIfo['tags[]'].forEach((tag) => {
//   //   console.log(tag);
//   // });
//   if (typeof reviewIfo['tags[]'] === 'string') {
//     // Convert it to an array containing a single element
//     reviewIfo['tags[]'] = [reviewIfo['tags[]']];
//   }
//   const currentDate = new Date();
//   // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
//   const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');


//   const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${reviewIfo.main_address_country}"`;
//   const country_name_value = await query(country_name_query);
//   if (country_name_value.length > 0) {
//     var country_name = country_name_value[0].name;
//     console.log("country_name", country_name);
//     var country_id = country_name_value[0].id;
//     console.log("country_id", country_id);
//   }

//   const state_name_query = `SELECT * FROM states WHERE id = "${reviewIfo.main_address_state}"`;
//   const state_name_value = await query(state_name_query);
//   if (state_name_value.length > 0) {
//     var state_name = state_name_value[0].name;
//     console.log("state_name", state_name);
//   }

//   var city_value = reviewIfo['review-address'];
//   console.log("city_value", city_value);

//   // var concatenatedAddress = city_value + ', ' + state_name + ', ' + country_name;
//   // console.log(concatenatedAddress);

//   var concatenatedAddress = '';

//   if (city_value) {
//     concatenatedAddress += city_value;
//   }

//   if (state_name) {
//     if (concatenatedAddress) {
//       concatenatedAddress += ', ';
//     }
//     concatenatedAddress += state_name;
//   }

//   if (country_name) {
//     if (concatenatedAddress) {
//       concatenatedAddress += ', ';
//     }
//     concatenatedAddress += country_name;
//   }

//   console.log("concatenatedAddress", concatenatedAddress);

//   const getcompanyquery = `SELECT ID FROM company WHERE company_name = ?`;
//   const getcompanyvalue = await query(getcompanyquery,[reviewIfo.company_name]);
//   console.log("getcompanyvalue",getcompanyvalue);
//   if(getcompanyvalue.length>0){
//       var CompanyID = getcompanyvalue[0].ID;
//       console.log("CompanyID",CompanyID);
//   }

//   const getcompanylocquery = `SELECT ID FROM company_location WHERE company_id = ?`;
//   const getcompanylocvalue = await query(getcompanylocquery,[CompanyID]);
//   console.log("getcompanylocvalue",getcompanylocvalue);
//   if(getcompanylocvalue.length>0){
//       var CompanylocID = getcompanylocvalue[0].ID;
//       console.log("CompanylocID",CompanylocID);
//   }


//   // const country_name_query = `SELECT name FROM countries WHERE shortname = "${reviewIfo.main_address_country}"`;
//   // const country_name_value = await query(country_name_query);
//   // if(country_name_value.length>0){
//   //   var country_name = country_name_value[0].name;
//   //   console.log("country_name",country_name);
//   // }

  


//   const create_review_query = 'INSERT INTO reviews (company_id, customer_id, company_location, company_location_id, review_title, rating, review_content, user_privacy, review_status, created_at, updated_at, labels, user_contact, category_id, product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//   const create_review_values = [CompanyID, userId, concatenatedAddress, CompanylocID, reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, formattedDate, reviewIfo.review_lable, reviewIfo.user_contact, reviewIfo.category_id, reviewIfo.product_id];

//   try {
//     const create_review_results = await query(create_review_query, create_review_values);
//     if (create_review_results.insertId) {
//       if (Array.isArray(reviewIfo['tags[]']) && reviewIfo['tags[]'].length > 0) {
//         //insert review_tag_relation
//         const review_tag_relation_query = 'INSERT INTO review_tag_relation (review_id, tag_name) VALUES (?, ?)';
//         try {
//           for (const tag of reviewIfo['tags[]']) {
//             const review_tag_relation_values = [create_review_results.insertId, tag];
//             const review_tag_relation_results = await query(review_tag_relation_query, review_tag_relation_values);
//           }

//           //-- user review count------//
//           const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//           try {
//             const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//             return create_review_results.insertId;
//           } catch (error) {
//             console.error('Error during user update_review_count_query:', error);
//           }

//         } catch (error) {
//           console.error('Error during user review_tag_relation_results:', error);
//         }
//       } else {
//         //-- user review count------//
//         const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//         try {
//           const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//           return create_review_results.insertId;
//         } catch (error) {
//           console.error('Error during user update_review_count_query:', error);
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Error during user create_review_results:', error);
//   }
// }

//actualsds
async function createreview(reviewIfo, userId, comInfo) {
  console.log('Review Info', reviewIfo);
  console.log('Company Info', comInfo);
  // reviewIfo['tags[]'].forEach((tag) => {
  //   console.log(tag);
  // });

  console.log("typeof reviewIfo['tags[]']",typeof reviewIfo['tags[]']);

  const getcompanyidquery = `SELECT * FROM company WHERE company_name,main_address_country,main_address_state,main_address_city`


  if (typeof reviewIfo['tags[]'] === 'string') {
    // Convert it to an array containing a single element
    reviewIfo['tags[]'] = [reviewIfo['tags[]']];
  }
  const currentDate = new Date();
  // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');


  const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${reviewIfo.main_address_country}"`;
  const country_name_value = await query(country_name_query);
  if (country_name_value.length > 0) {
    var country_name = country_name_value[0].name;
    console.log("country_name", country_name);
    var country_id = country_name_value[0].id;
    console.log("country_id", country_id);
  }

  const state_name_query = `SELECT * FROM states WHERE id = "${reviewIfo.main_address_state}"`;
  const state_name_value = await query(state_name_query);
  if (state_name_value.length > 0) {
    var state_name = state_name_value[0].name;
    console.log("state_name", state_name);
  }

  var city_value = reviewIfo['review-address'];
  console.log("city_value", city_value);

  // var concatenatedAddress = city_value + ', ' + state_name + ', ' + country_name;
  // console.log(concatenatedAddress);

  var concatenatedAddress = '';

  if (city_value) {
    concatenatedAddress += city_value;
  }

  if (state_name) {
    if (concatenatedAddress) {
      concatenatedAddress += ', ';
    }
    concatenatedAddress += state_name;
  }

  if (country_name) {
    if (concatenatedAddress) {
      concatenatedAddress += ', ';
    }
    concatenatedAddress += country_name;
  }

  console.log("concatenatedAddress", concatenatedAddress);


  

  // const getcompanyquery = `SELECT ID FROM company WHERE company_name = ?`;
  // const getcompanyvalue = await query(getcompanyquery,[reviewIfo.company_name]);
  // console.log("getcompanyvalue",getcompanyvalue);
  // if(getcompanyvalue.length>0){
  //     var CompanyID = getcompanyvalue[0].ID;
  //     console.log("CompanyID",CompanyID);
  // }
  let CompanyID;

  let queryParameters = [reviewIfo.company_name];
  let sqlQuery = `SELECT ID AS company_id,temp_comp_status FROM company WHERE company_name = ?`;
  
  if (reviewIfo.main_address_country) {
      queryParameters.push(reviewIfo.main_address_country);
      sqlQuery += ` AND main_address_country = ?`;
  }
  
  // if (reviewIfo.main_address_state) {
  //     queryParameters.push(reviewIfo.main_address_state);
  //     sqlQuery += ` AND main_address_state = ?`;
  // }
  
      const [rows] = await query(sqlQuery, queryParameters);
    console.log("rowssdefsd",rows);
    if (rows && rows.company_id !== undefined) {
      CompanyID = rows.company_id;
      console.log("Company ID:", CompanyID);
      var temp_comp_status= rows.temp_comp_status;
      console.log("temp_comp_status",temp_comp_status);
  } else {
      console.log("Company not found");
      return null;
  }

  if(temp_comp_status == 1){
    var temp_review_status = '1';
  }else{
    var temp_review_status = '0';
  }


  const getcompanylocquery = `SELECT ID FROM company_location WHERE company_id = ?`;
  const getcompanylocvalue = await query(getcompanylocquery,[CompanyID]);
  console.log("getcompanylocvalue",getcompanylocvalue);
  if(getcompanylocvalue.length>0){
      var CompanylocID = getcompanylocvalue[0].ID;
      console.log("CompanylocID",CompanylocID);
  }else{
    const addcompanylocquery = 'INSERT INTO company_location (company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const addcompanylocvalues = [CompanyID, concatenatedAddress, country_name, state_name, city_value, '', '2'];
    const addcompanylocvalue = await query(addcompanylocquery, addcompanylocvalues);
    var CompanylocID = addcompanylocvalue.insertId;
    console.log("Inserted row IDa:",CompanylocID );
    //var CompanylocID = '0';
}
  // const country_name_query = `SELECT name FROM countries WHERE shortname = "${reviewIfo.main_address_country}"`;
  // const country_name_value = await query(country_name_query);
  // if(country_name_value.length>0){
  //   var country_name = country_name_value[0].name;
  //   console.log("country_name",country_name);
  // }
  const create_review_query = 'INSERT INTO reviews (company_id, customer_id, company_location, company_location_id, review_title, rating, review_content, user_privacy, review_status, created_at, updated_at, labels, user_contact, category_id, sub_cat_id, product_id,temp_review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?)';
  const create_review_values = [CompanyID, userId, concatenatedAddress, CompanylocID, reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, formattedDate, reviewIfo.review_lable, reviewIfo.user_contact, reviewIfo.category_id, reviewIfo.review_sub_id, reviewIfo.product_id,temp_review_status];

  try {
    const create_review_results = await query(create_review_query, create_review_values);
    if (create_review_results.insertId) {
      if (Array.isArray(reviewIfo['tags[]']) && reviewIfo['tags[]'].length > 0) {
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
      } else {
        //-- user review count------//
        const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
        try {
          const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
          return create_review_results.insertId;
        } catch (error) {
          console.error('Error during user update_review_count_query:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error during user create_review_results:', error);
  }
}

// async function createreview(reviewIfo, userId, comInfo) {
//   console.log('Review Info', reviewIfo);
//   console.log('Company Info', comInfo);
//   // reviewIfo['tags[]'].forEach((tag) => {
//   //   console.log(tag);
//   // });

//   console.log("typeof reviewIfo['tags[]']",typeof reviewIfo['tags[]']);

//   const getcompanyidquery = `SELECT * FROM company WHERE company_name,main_address_country,main_address_state,main_address_city`


//   if (typeof reviewIfo['tags[]'] === 'string') {
//     // Convert it to an array containing a single element
//     reviewIfo['tags[]'] = [reviewIfo['tags[]']];
//   }
//   const currentDate = new Date();
//   // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
//   const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');


//   const country_name_query = `SELECT name,id FROM countries WHERE shortname = "${reviewIfo.main_address_country}"`;
//   const country_name_value = await query(country_name_query);
//   if (country_name_value.length > 0) {
//     var country_name = country_name_value[0].name;
//     console.log("country_name", country_name);
//     var country_id = country_name_value[0].id;
//     console.log("country_id", country_id);
//   }

//   const state_name_query = `SELECT * FROM states WHERE id = "${reviewIfo.main_address_state}"`;
//   const state_name_value = await query(state_name_query);
//   if (state_name_value.length > 0) {
//     var state_name = state_name_value[0].name;
//     console.log("state_name", state_name);
//   }

//   var city_value = reviewIfo['review-address'];
//   console.log("city_value", city_value);

//   // var concatenatedAddress = city_value + ', ' + state_name + ', ' + country_name;
//   // console.log(concatenatedAddress);

//   var concatenatedAddress = '';

//   if (city_value) {
//     concatenatedAddress += city_value;
//   }

//   if (state_name) {
//     if (concatenatedAddress) {
//       concatenatedAddress += ', ';
//     }
//     concatenatedAddress += state_name;
//   }

//   if (country_name) {
//     if (concatenatedAddress) {
//       concatenatedAddress += ', ';
//     }
//     concatenatedAddress += country_name;
//   }

//   console.log("concatenatedAddress", concatenatedAddress);

//   let CompanyID;

//   // Define the query for the company table
//   let queryParameters = [reviewIfo.company_name];
//   let sqlQuery = `SELECT ID AS company_id FROM company WHERE company_name = ?`;
  
//   if (reviewIfo.main_address_country) {
//       queryParameters.push(reviewIfo.main_address_country);
//       sqlQuery += ` AND main_address_country = ?`;
//   }
  
//   const rows = await query(sqlQuery, queryParameters);
//   console.log("Company query result:", rows);

//   if (rows && rows.length > 0) {
//       CompanyID = rows[0].company_id;
//       console.log("Company ID from company table:", CompanyID);
//       const getcompanylocquery = `SELECT ID FROM company_location WHERE company_id = ?`;
//       const getcompanylocvalue = await query(getcompanylocquery,[CompanyID]);
//       console.log("getcompanylocvalue",getcompanylocvalue);
//       if(getcompanylocvalue.length>0){
//           var CompanylocID = getcompanylocvalue[0].ID;
//           console.log("CompanylocID",CompanylocID);
//       }else{
//         const addcompanylocquery = 'INSERT INTO company_location (company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
//         const addcompanylocvalues = [CompanyID, concatenatedAddress, country_name, state_name, city_value, '', '2'];
//         const addcompanylocvalue = await query(addcompanylocquery, addcompanylocvalues);
//         var CompanylocID = addcompanylocvalue.insertId;
//         console.log("Inserted row IDa:",CompanylocID );
//         //var CompanylocID = '0';
//     }
//     const create_review_query = 'INSERT INTO reviews (company_id, customer_id, company_location, company_location_id, review_title, rating, review_content, user_privacy, review_status, created_at, updated_at, labels, user_contact, category_id, product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//     const create_review_values = [CompanyID, userId, concatenatedAddress, CompanylocID, reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, formattedDate, reviewIfo.review_lable, reviewIfo.user_contact, reviewIfo.category_id, reviewIfo.product_id];
  
//     try {
//       const create_review_results = await query(create_review_query, create_review_values);
//       if (create_review_results.insertId) {
//         if (Array.isArray(reviewIfo['tags[]']) && reviewIfo['tags[]'].length > 0) {
//           //insert review_tag_relation
//           const review_tag_relation_query = 'INSERT INTO review_tag_relation (review_id, tag_name) VALUES (?, ?)';
//           try {
//             for (const tag of reviewIfo['tags[]']) {
//               const review_tag_relation_values = [create_review_results.insertId, tag];
//               const review_tag_relation_results = await query(review_tag_relation_query, review_tag_relation_values);
//             }
  
//             //-- user review count------//
//             const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//             try {
//               const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//               return create_review_results.insertId;
//             } catch (error) {
//               console.error('Error during user update_review_count_query:', error);
//             }
  
//           } catch (error) {
//             console.error('Error during user review_tag_relation_results:', error);
//           }
//         } else {
//           //-- user review count------//
//           const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//           try {
//             const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//             return create_review_results.insertId;
//           } catch (error) {
//             console.error('Error during user update_review_count_query:', error);
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error during user create_review_results:', error);
//     }
//   } else {
//       console.log("Company not found in company table, querying temp_company table");
  
//       let tempQueryParameters = [reviewIfo.company_name];
//       let tempSqlQuery = `SELECT ID AS company_id FROM temp_company WHERE company_name = ?`;
      
//       if (reviewIfo.main_address_country) {
//           tempQueryParameters.push(reviewIfo.main_address_country);
//           tempSqlQuery += ` AND main_address_country = ?`;
//       }
      
//       try {
//           const tempRows = await query(tempSqlQuery, tempQueryParameters);
//           console.log("Temp company query result:", tempRows);
//           console.log("tempRows.length",tempRows.length);
      
//           if (tempRows && tempRows.length>0) {
//               CompanyID = tempRows[0].company_id;
//               console.log("Company ID from temp_company table:", CompanyID);
      
//               const getcompanylocquery = `SELECT ID FROM company_location WHERE temp_company_id = ?`;
//               const getcompanylocvalue = await query(getcompanylocquery, [CompanyID]);
//               console.log("getcompanylocvalue", getcompanylocvalue);
      
//               if (getcompanylocvalue && getcompanylocvalue.length > 0) {
//                   var CompanylocID = getcompanylocvalue[0].ID;
//                   console.log("CompanylocID:", CompanylocID);
//               } else {
//                   const addcompanylocquery = 'INSERT INTO company_location (temp_company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
//                   const addcompanylocvalues = [CompanyID, concatenatedAddress, country_name, state_name, city_value, '', '2'];
//                   const addcompanylocvalue = await query(addcompanylocquery, addcompanylocvalues);
//                   var CompanylocID = addcompanylocvalue.insertId;
//                   console.log("Inserted row ID Temp:", CompanylocID);
//               }
//               const create_review_query = 'INSERT INTO temp_reviews (company_id, customer_id, company_location, company_location_id, review_title, rating, review_content, user_privacy, review_status, created_at, updated_at, labels, user_contact, category_id, product_id, temp_review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//               const create_review_values = [CompanyID, userId, concatenatedAddress, CompanylocID, reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, formattedDate, reviewIfo.review_lable, reviewIfo.user_contact, reviewIfo.category_id, reviewIfo.product_id,'0'];
            
//               try {
//                 const create_review_results = await query(create_review_query, create_review_values);
//                 if (create_review_results.insertId) {
//                   if (Array.isArray(reviewIfo['tags[]']) && reviewIfo['tags[]'].length > 0) {
//                     //insert review_tag_relation
//                     const review_tag_relation_query = 'INSERT INTO temp_review_tag_relation (review_id, tag_name) VALUES (?, ?)';
//                     try {
//                       for (const tag of reviewIfo['tags[]']) {
//                         const review_tag_relation_values = [create_review_results.insertId, tag];
//                         const review_tag_relation_results = await query(review_tag_relation_query, review_tag_relation_values);
//                       }
            
//                       //-- user review count------//
//                       const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//                       try {
//                         const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//                         return create_review_results.insertId;
//                       } catch (error) {
//                         console.error('Error during user update_review_count_query:', error);
//                       }
            
//                     } catch (error) {
//                       console.error('Error during user temp_review_tag_relation_results:', error);
//                     }
//                   } else {
//                     //-- user review count------//
//                     const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//                     try {
//                       const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//                       return create_review_results.insertId;
//                     } catch (error) {
//                       console.error('Error during user update_review_count_query:', error);
//                     }
//                   }
//                 }
//               } catch (error) {
//                 console.error('Error during user create_review_results:', error);
//               }
//           } else {
//               console.log("Company not found in temp_company table");
//               CompanyID = null;
//           }
//       } catch (error) {
//           console.error("Error querying temp_company table:", error);
//       }
//   }
  
// //   const getcompanylocquery = `SELECT ID FROM company_location WHERE company_id = ?`;
// //   const getcompanylocvalue = await query(getcompanylocquery,[CompanyID]);
// //   console.log("getcompanylocvalue",getcompanylocvalue);
// //   if(getcompanylocvalue.length>0){
// //       var CompanylocID = getcompanylocvalue[0].ID;
// //       console.log("CompanylocID",CompanylocID);
// //   }else{
// //     const addcompanylocquery = 'INSERT INTO company_location (company_id, address, country, state, city, zip, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
// //     const addcompanylocvalues = [CompanyID, concatenatedAddress, country_name, state_name, city_value, '', '2'];
// //     const addcompanylocvalue = await query(addcompanylocquery, addcompanylocvalues);
// //     var CompanylocID = addcompanylocvalue.insertId;
// //     console.log("Inserted row IDa:",CompanylocID );
// //     //var CompanylocID = '0';
// // }

//   // const create_review_query = 'INSERT INTO reviews (company_id, customer_id, company_location, company_location_id, review_title, rating, review_content, user_privacy, review_status, created_at, updated_at, labels, user_contact, category_id, product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//   // const create_review_values = [CompanyID, userId, concatenatedAddress, CompanylocID, reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, '2', formattedDate, formattedDate, reviewIfo.review_lable, reviewIfo.user_contact, reviewIfo.category_id, reviewIfo.product_id];

//   // try {
//   //   const create_review_results = await query(create_review_query, create_review_values);
//   //   if (create_review_results.insertId) {
//   //     if (Array.isArray(reviewIfo['tags[]']) && reviewIfo['tags[]'].length > 0) {
//   //       //insert review_tag_relation
//   //       const review_tag_relation_query = 'INSERT INTO review_tag_relation (review_id, tag_name) VALUES (?, ?)';
//   //       try {
//   //         for (const tag of reviewIfo['tags[]']) {
//   //           const review_tag_relation_values = [create_review_results.insertId, tag];
//   //           const review_tag_relation_results = await query(review_tag_relation_query, review_tag_relation_values);
//   //         }

//   //         //-- user review count------//
//   //         const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//   //         try {
//   //           const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//   //           return create_review_results.insertId;
//   //         } catch (error) {
//   //           console.error('Error during user update_review_count_query:', error);
//   //         }

//   //       } catch (error) {
//   //         console.error('Error during user review_tag_relation_results:', error);
//   //       }
//   //     } else {
//   //       //-- user review count------//
//   //       const update_review_count_query = 'UPDATE user_customer_meta SET review_count = review_count + 1 WHERE user_id = ?';
//   //       try {
//   //         const [update_review_count_result] = await db.promise().query(update_review_count_query, [userId]);
//   //         return create_review_results.insertId;
//   //       } catch (error) {
//   //         console.error('Error during user update_review_count_query:', error);
//   //       }
//   //     }
//   //   }
//   // } catch (error) {
//   //   console.error('Error during user create_review_results:', error);
//   // }
// }


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
      //console.log(get_latest_review_results);
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
  let ratingTagsArray = '';
  if (req.rating_tags) {
    ratingTagsArray = JSON.parse(req.rating_tags);
  }
  const currentDate = new Date();
  // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  const update_review_values = [
    req.update_company_id ? req.update_company_id : req.company_id,
    req.company_location || null,
    req.review_title || null,
    req.rating,
    req.review_content,
    req.user_privacy,
    req.review_status,
    req.review_rejecting_comment || null,
    formattedDate,
    req.user_contact,
    req.category_id,
    req.product_id,
    req.review_id,
  ];
  const update_review_query =
    'UPDATE reviews SET ' +
    'company_id = ?, ' +
    'company_location = ?, ' +
    'review_title = ?, ' +
    'rating = ?, ' +
    'review_content = ?, ' +
    'user_privacy = ?, ' +
    'review_status = ?, ' +
    'rejecting_reason = ?, ' +
    'updated_at = ?, ' +
    'user_contact = ?, ' +
    'category_id = ?, ' +
    'product_id = ? ' +
    'WHERE id = ?';

  console.log(update_review_query);
  try {
    const update_review_result = await query(update_review_query, update_review_values);
    //console.log(update_review_result );
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

async function editCustomerComplaint(req) {
  let ratingTagsArray = [];
  if (req.tags) {
    try {
      ratingTagsArray = JSON.parse(req.tags);
      if (!Array.isArray(ratingTagsArray)) {
        throw new Error("Invalid tags format");
      }
    } catch (error) {
      console.error("Error parsing tags:", error);
      return 'Invalid tags format';
    }
  }

  const update_review_values = [
    req.update_company_id ? req.update_company_id : req.company_id,
    req.ticket_id || null,
    req.category_id || null,
    req.sub_cat_id,
    req.model_desc,
    req.purchase_date,
    req.purchase_place,
    req.message || null,
    JSON.stringify(ratingTagsArray), // Convert array to JSON string
    req.complaint_id,
  ];

  const update_review_query =
    'UPDATE complaint SET ' +
    'company_id = ?, ' +
    'ticket_id = ?, ' +
    'category_id = ?, ' +
    'sub_cat_id = ?, ' +
    'model_desc = ?, ' +
    'purchase_date = ?, ' +
    'purchase_place = ?, ' +
    'message = ?, ' +
    'tags = ? ' + 
    'WHERE id = ?';

  console.log("Update query:", update_review_query);
  try {
    const update_review_result = await query(update_review_query, update_review_values);
    console.log("Update result:", update_review_result);

    return true;
  } catch (error) {
    console.error("Error during update:", error);
    return 'Error during user update_review_query:' + error;
  }
}


async function newsearchCompany(keyword) {
  const get_company_query = `
    SELECT ID, company_name, logo, about_company, slug, main_address, main_address_pin_code FROM company
    WHERE company_name LIKE '%${keyword}%' AND status = '1'
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
//actual
// async function searchCompany(keyword,country) {
//   console.log("country",country);
//   const get_company_query = `
//     SELECT ID, company_name, logo, about_company, slug, main_address, main_address_pin_code FROM company
//     WHERE company_name LIKE '%${keyword}%' AND status = '1' AND main_address_country = ?
//     ORDER BY created_date DESC
//   `;
//   try {
//     const get_company_results = await query(get_company_query,[country]);
//     if (get_company_results.length > 0) {
//       console.log(get_company_results);
//       return { status: 'ok', data: get_company_results, message: get_company_results.length + ' company data recived' };
//     } else {
//       return { status: 'ok', data: '', message: 'No company data found' };
//     }
//   } catch (error) {
//     return { status: 'err', data: '', message: 'No company data found' };
//   }
// }


async function searchCompany(keyword, country) {
  const get_company_query = `
    SELECT ID, company_name, logo, about_company, slug, main_address, main_address_pin_code, review_display_type
    FROM company
    WHERE company_name LIKE '%${keyword}%' 
      AND status = '1' 
      AND main_address_country = ?
    ORDER BY created_date DESC
  `;
  
  try {
    const get_company_results = await query(get_company_query, [country]);

    console.log("get_company_results",get_company_results);

    if (get_company_results.length > 0) {
      const filteredCompanies = [];

      for (const company of get_company_results) {
        if (company.review_display_type == '1') {
          filteredCompanies.push(company);
          
          const childCompanies = await fetchChildCompanies(company.ID);
          filteredCompanies.push(...childCompanies);
        } else if (company.review_display_type == '0') {
          filteredCompanies.push(company);
        }
      }

      return { status: 'ok', data: filteredCompanies, message: `${filteredCompanies.length} company data received` };
    } else {
      return { status: 'ok', data: [], message: 'No company data found' };
    }
  } catch (error) {
    console.error('Error fetching companies:', error);
    return { status: 'err', data: [], message: 'An error occurred while fetching company data' };
  }
}

async function fetchChildCompanies(parentId) {
  const get_child_query = `
    SELECT ID, company_name, logo, about_company, slug, main_address, main_address_pin_code, review_display_type
    FROM company
    WHERE parent_id = ?
      AND status = '1'
    ORDER BY created_date DESC
  `;
  
  try {
    const childCompanies = await query(get_child_query, [parentId]);
    const allChildCompanies = [];
    
    for (const childCompany of childCompanies) {
      const grandChildCompanies = await fetchChildCompanies(childCompany.ID);
      allChildCompanies.push(childCompany, ...grandChildCompanies);
    }

    return allChildCompanies;
  } catch (error) {
    console.error('Error fetching child companies:', error);
    return [];
  }
}

const createStripeProductAndPrice = async (plan, billingCycle, memberCount) => {
  try {
      memberCount = parseInt(memberCount);
      if (isNaN(memberCount) || memberCount < 0) {
          throw new Error('Invalid memberCount');
      }
      console.log('Creating Stripe product with plan:', plan);

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
          console.log("user_addon_price", user_addon_price);
  
          AddonPrice = user_addon_price * memberCount;
          console.log("AddonPrice", AddonPrice);
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
              interval_count: billingCycle === 'yearly' ? 1 : 1, // Default to 1 for monthly, 13 for yearly handled below
          },
      };
      
      if (billingCycle === 'yearly') {
          priceParams.recurring.interval_count = 13; // Billing every 13 months for yearly subscription
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



async function getCompanyReviewNumbers(companyID) {
  const get_company_rewiew_count_query = `
    SELECT COUNT(*) AS total_review_count, AVG(rating) AS total_review_average
    FROM reviews
    WHERE company_id = ? AND review_status = ?`;
  const get_company_rewiew_count_value = [companyID, '1'];
  try {
    const get_company_rewiew_count_result = await query(get_company_rewiew_count_query, get_company_rewiew_count_value);
    const get_company_rewiew_rating_count_query = `
    SELECT rating,count(rating) AS cnt_rat, created_at
    FROM reviews
    WHERE company_id = ? AND review_status = '1'
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

async function getCompanyReviewNumberss(companyID){
  const get_company_rewiew_count_query = `
    SELECT COUNT(*) AS total_review_count, AVG(rating) AS total_review_average
    FROM reviews
    WHERE company_id = ? AND review_status = ?`;
  const get_company_rewiew_count_value = [companyID, '1'];
  try{
    const get_company_rewiew_count_result = await query(get_company_rewiew_count_query, get_company_rewiew_count_value);
    const get_company_rewiew_rating_count_query = `
    SELECT rating,count(rating) AS cnt_rat, created_at, review_rating_tags.rating_image
    FROM reviews
    LEFT JOIN review_rating_tags ON reviews.rating = review_rating_tags.review_rating_value
    WHERE company_id = ? AND review_status = '1'
    group by rating ORDER by rating DESC`;
    try{
      const get_company_rewiew_rating_count_result = await query(get_company_rewiew_rating_count_query, get_company_rewiew_count_value);
      return {rewiew_count:get_company_rewiew_count_result[0], rewiew_rating_count: get_company_rewiew_rating_count_result};
    }catch(error){
      return 'Error during user get_company_rewiew_rating_count_query:'+error;
    }
    
  }catch(error){
    return 'Error during user get_company_rewiew_count_query:'+error;
  }
}
function getDefaultFromDate() {
  const currentDate = new Date();
  return currentDate.toISOString().split('T')[0]; // Returns current date in 'YYYY-MM-DD' format
}

function getDefaultToDate() {
  const currentDate = new Date();
  const sevenDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return sevenDaysAgo.toISOString().split('T')[0]; // Returns date 30 days ago in 'YYYY-MM-DD' format
}

async function getCompanyReviewsBetween(companyID, from = getDefaultFromDate(), to = getDefaultToDate()) {

  const get_company_total_rewiew_count_query = `
    SELECT COUNT(*) AS total_review_count, AVG(rating) AS total_review_average
    FROM reviews
    WHERE company_id = ? AND review_status = ?`;
  const get_company_total_rewiew_count_value = [companyID, '1'];
  const get_company_total_rewiew_rating_result = await query(get_company_total_rewiew_count_query, get_company_total_rewiew_count_value);

  const get_company_rewiew_count_query = `
    SELECT COUNT(*) AS filter_review_count, AVG(rating) AS filter_review_average
    FROM reviews
    WHERE company_id = ? AND review_status = ? 
    AND created_at BETWEEN ? AND ?`;
  const get_company_rewiew_count_value = [companyID, '1', from, to];;
  try {
    const get_company_rewiew_rating_count_result = await query(get_company_rewiew_count_query, get_company_rewiew_count_value);
    const mergedResult = {
      ...get_company_total_rewiew_rating_result[0],
      ...get_company_rewiew_rating_count_result[0]
    };
    //console.log(mergedResult)
    return mergedResult;
  } catch (error) {
    return 'Error during user get_company_rewiew_rating_count_query:' + error;
  }

}

async function getCompanyReviews(companyID) {
  const get_company_reviews_query = `
    SELECT r.*, ur.first_name, ur.last_name, ur.alise_name, ur.email, ucm.profile_pic,
           rr.ID AS reply_id, rr.reply_by AS reply_by, rr.comment AS reply_comment , rr.created_at AS reply_created_at, rr.status AS reply_status
    FROM reviews r
    JOIN users ur ON r.customer_id = ur.user_id
    LEFT JOIN user_customer_meta ucm ON ur.user_id = ucm.user_id
    LEFT JOIN review_reply rr ON r.id = rr.review_id 
    WHERE r.company_id = ? AND r.review_status = "1" AND (r.flag_status != '0' OR r.flag_status IS NULL)
    ORDER BY r.created_at DESC, rr.created_at ASC
    LIMIT 20`;
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
          status: row.reply_status,
          created_at: row.reply_created_at
        });
      }
    }

    const finalResult = Array.from(reviewsMap.values());

    return finalResult;
  } catch (error) {
    return 'Error during user get_company_reviews_query:' + error;
  }
}

async function getReviewByID(reviewId) {
  const get_single_rewiew_query = `
    SELECT r.*, ur.first_name, ur.last_name, ur.email, ucm.profile_pic, ccreq.claimed_by as company_owner
    FROM reviews r
    JOIN users ur ON r.customer_id = ur.user_id
    LEFT JOIN user_customer_meta ucm ON ur.user_id = ucm.user_id
    LEFT JOIN company_claim_request ccreq ON r.company_id = ccreq.company_id
    WHERE r.id = ?`;
  const get_single_rewiew_value = [reviewId];
  try {
    const get_single_rewiew_result = await query(get_single_rewiew_query, get_single_rewiew_value);
    return get_single_rewiew_result;
    console.log('aaa', get_single_rewiew_result);
  } catch (error) {
    return 'Error during user get_single_rewiew_query:' + error;
  }
}

async function getReviewReplyDataByID(reviewId) {
  const get_single_rewiew_reply_query = `
    SELECT rpy.*, ur.first_name, ur.last_name, ur.email, ucm.profile_pic
    FROM review_reply rpy
    JOIN users ur ON rpy.reply_by = ur.user_id
    LEFT JOIN user_customer_meta ucm ON ur.user_id = ucm.user_id
    WHERE rpy.review_id = ?`;
  const get_single_rewiew_reply_value = [reviewId];
  try {
    const get_single_rewiew_reply_result = await query(get_single_rewiew_reply_query, get_single_rewiew_reply_value);
    return get_single_rewiew_reply_result;
  } catch (error) {
    return 'Error during user get_single_rewiew_query:' + error;
  }
}

async function reviewTagsCountByCompanyID(companyId) {
  const get_rewiew_tag_counts_query = `
    SELECT rtr.tag_name, COUNT(*) AS count
    FROM review_tag_relation AS rtr
    JOIN reviews AS r ON rtr.review_id = r.id
    WHERE r.company_id = ? AND r.review_status = '1'
    GROUP BY rtr.tag_name`;
  const get_rewiew_tag_counts_query_value = [companyId];
  try {
    const get_rewiew_tag_counts_query_result = await query(get_rewiew_tag_counts_query, get_rewiew_tag_counts_query_value);
    return get_rewiew_tag_counts_query_result;
  } catch (error) {
    return 'Error during user get_rewiew_tag_counts_query:' + error;
  }
}
//actual
// async function getPopularCategories() {
//   const get_popular_company_query = `
//   SELECT 
//   ccr.category_id,
//   cg.category_name,
//   cg.category_img,
//   cg.category_slug,
//   COUNT(*) AS review_count
//   FROM 
//     reviews r
//   INNER JOIN
//     company_cactgory_relation ccr ON r.company_id = ccr.company_id
//   INNER JOIN
//     category cg ON ccr.category_id = cg.ID
//   WHERE 
//     r.review_status = '1'
//   GROUP BY 
//     ccr.category_id
//   ORDER BY 
//     review_count DESC
//   LIMIT 4;
//   `;
//   try {
//     const get_popular_company_query_result = await query(get_popular_company_query);
//     console.log("get_popular_company_query_result",get_popular_company_query_result);
//     return get_popular_company_query_result;
//   } catch (error) {
//     return 'Error during user get_rewiew_tag_counts_query:' + error;
//   }
// }


 async function getPopularCategorieswithoutcoun() {
  const get_popular_company_query = `
  SELECT 
    ccr.category_id,
    cg.category_name,
    cg.category_img,
    cg.category_slug,
    GROUP_CONCAT(DISTINCT countries.shortname) AS country_shortnames,
    COUNT(*) AS review_count
  FROM 
    reviews r
  INNER JOIN
    company_cactgory_relation ccr ON r.company_id = ccr.company_id
  INNER JOIN
    category cg ON ccr.category_id = cg.ID
  INNER JOIN
    category_country_relation ccr_rel ON cg.ID = ccr_rel.cat_id
  INNER JOIN
    countries ON ccr_rel.country_id = countries.id
  WHERE 
    r.review_status = '1'
  GROUP BY 
    ccr.category_id, countries.shortname
  ORDER BY 
    review_count DESC
  LIMIT 4;
  `;
  try {
    const get_popular_company_query_result = await query(get_popular_company_query);
    //console.log("get_popular_company_query_result", get_popular_company_query_result);
    
    // Append the country shortname to the category name
    const popularCategories = get_popular_company_query_result.map(row => {
      // Ensure unique country shortnames
      const uniqueCountryShortnames = [...new Set(row.country_shortnames.split(','))].join(', ');
      return {
        ...row,
        country_shortnames: uniqueCountryShortnames,
        category_name: `${row.category_name}-${uniqueCountryShortnames}`
      };
    });

    return popularCategories;
  } catch (error) {
    return 'Error during user get_rewiew_tag_counts_query:' + error;
  }
}



async function getPopularCategories(country) {
  let queryParams = [];
  let get_popular_company_query = `
    SELECT 
      ccr.category_id,
      cg.category_name,
      cg.category_img,
      cg.category_slug,
      GROUP_CONCAT(DISTINCT countries.shortname) AS country_shortnames,
      COUNT(*) AS review_count
    FROM 
      reviews r
    INNER JOIN
      company_cactgory_relation ccr ON r.company_id = ccr.company_id
    INNER JOIN
      category cg ON ccr.category_id = cg.ID
    INNER JOIN
      category_country_relation ccr_rel ON cg.ID = ccr_rel.cat_id
    INNER JOIN
      countries ON ccr_rel.country_id = countries.id
    INNER JOIN 
      company ON r.company_id = company.ID
    WHERE 
      r.review_status = '1'
  `;

  // Append country condition if provided
  if (country) {
    get_popular_company_query += ' AND company.main_address_country = ?';
    queryParams.push(country);
  }

  get_popular_company_query += `
    GROUP BY 
      ccr.category_id
    ORDER BY 
      review_count DESC
    LIMIT 4;
  `;

  try {
    const get_popular_company_query_result = await query(get_popular_company_query, queryParams);
    //console.log("get_popular_company_query_result", get_popular_company_query_result);
    
    // Append the country shortname to the category name
    const popularCategories = get_popular_company_query_result.map(row => {
      // Ensure unique country shortnames
      const uniqueCountryShortnames = [...new Set(row.country_shortnames.split(','))].join(', ');
      return {
        ...row,
        country_shortnames: uniqueCountryShortnames,
        category_name: `${row.category_name}-${uniqueCountryShortnames}`
      };
    });

    return popularCategories;
  } catch (error) {
    console.error('Error during get_popular_company_query:', error);
    return 'Error fetching popular categories.';
  }
}



async function getReviewCount() {
  const get_review_count_query = `
  SELECT COUNT(*) AS total_reviews_count
  FROM reviews
  WHERE review_status = '1';
  `;
  try {
    const get_review_count_query_result = await query(get_review_count_query);
    return get_review_count_query_result;
  } catch (error) {
    return 'Error during user get_rewiew_tag_counts_query:' + error;
  }
}

async function getUserCount() {
  const get_user_count_query = `
  SELECT COUNT(*) AS total_user_count
  FROM users
  WHERE user_status = 1 AND user_type_id = 2;
  `;
  try {
    const get_user_count_query_result = await query(get_user_count_query);
    return get_user_count_query_result;
  } catch (error) {
    return 'Error during user get_rewiew_tag_counts_query:' + error;
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

// async function getPositiveReviewsCompany() {
//   const get_positive_reviews_company_query = `
//   SELECT company_id, COUNT(*) AS review_count, com.company_name, com.slug
//   FROM reviews
//   JOIN company com ON reviews.company_id = com.ID
//   WHERE rating >= 4 AND review_status = '1'
//   GROUP BY company_id
//   ORDER BY review_count DESC
//   LIMIT 5;
//   `;
//   try {
//     const get_positive_reviews_result = await query(get_positive_reviews_company_query);
//     return get_positive_reviews_result;
//   } catch (error) {
//     return 'Error during user get_positive_reviews_company_query:' + error;
//   }
// }

async function getPositiveReviewsCompany(country_code) {
  let queryParams = [];
  let get_positive_reviews_company_query = `
      SELECT company_id, COUNT(*) AS review_count, com.company_name, com.slug
      FROM reviews
      JOIN company com ON reviews.company_id = com.ID
      WHERE rating >= 4 AND review_status = '1'
  `;

  if (country_code) {
    console.log("dfgfdgf");
    get_positive_reviews_company_query += ' AND com.main_address_country = ?';
    queryParams.push(country_code);
  }

  get_positive_reviews_company_query += `
      GROUP BY company_id
      ORDER BY review_count DESC
      LIMIT 5;
  `;

  try {
      const get_positive_reviews_result = await query(get_positive_reviews_company_query, queryParams);
      //console.log("get_positive_reviews_result",get_positive_reviews_result);
      return get_positive_reviews_result;
  } catch (error) {
      console.error('Error during get_positive_reviews_company_query:', error);
      return 'Error fetching positive reviews.';
  }
}


// async function getNegativeReviewsCompany() {
//   const get_negative_reviews_company_query = `
//   SELECT company_id, COUNT(*) AS review_count, com.company_name, com.slug
//   FROM reviews
//   JOIN company com ON reviews.company_id = com.ID
//   WHERE rating <= 2 AND review_status = '1'
//   GROUP BY company_id
//   ORDER BY review_count DESC
//   LIMIT 5;
//   `;
//   try{
//     const get_negative_reviews_result = await query(get_negative_reviews_company_query);
//     return get_negative_reviews_result;
//   }catch(error){
//     return 'Error during user get_negative_reviews_company_query:'+error;
//   }
// }

// async function getNegativeReviewsCompany() {
//   const get_negative_reviews_company_query = `
//   SELECT
//   neg.ID, COUNT(*) AS review_count, neg.company_name, neg.slug
// FROM
//   (
//       SELECT com.ID, com.company_name, com.slug
//       FROM reviews
//           JOIN company com ON reviews.company_id = com.ID
//       WHERE rating <= 2 AND review_status = '1'
//       GROUP BY com.ID, com.company_name, com.slug
//   ) AS neg
// WHERE
//   neg.ID NOT IN (
//       SELECT
//           com.ID
//       FROM reviews
//           JOIN company com ON reviews.company_id = com.ID
//       WHERE rating >= 4 AND review_status = '1'
//       GROUP BY
//           com.ID
//   )
// GROUP BY
//   neg.ID
// ORDER BY
//   review_count DESC
// LIMIT 5;

//   `;
//   try {
//     const get_negative_reviews_result = await query(get_negative_reviews_company_query);
//     return get_negative_reviews_result;
//   } catch (error) {
//     return 'Error during user get_negative_reviews_company_query:' + error;
//   }
// }
async function getNegativeReviewsCompany(country) {
  let queryParams = [];
  let get_negative_reviews_company_query = `
      SELECT neg.ID, COUNT(*) AS review_count, neg.company_name, neg.slug
      FROM (
          SELECT com.ID, com.company_name, com.slug
          FROM reviews
          JOIN company com ON reviews.company_id = com.ID
          WHERE rating <= 2 AND review_status = '1'
  `;

  if (country) {
    get_negative_reviews_company_query += ' AND com.main_address_country = ?';
    queryParams.push(country);
  }

  get_negative_reviews_company_query += `
          GROUP BY com.ID, com.company_name, com.slug
      ) AS neg
      WHERE neg.ID NOT IN (
          SELECT com.ID
          FROM reviews
          JOIN company com ON reviews.company_id = com.ID
          WHERE rating >= 4 AND review_status = '1'
  `;

  if (country) {
    get_negative_reviews_company_query += ' AND com.main_address_country = ?';
    queryParams.push(country);
  }

  get_negative_reviews_company_query += `
          GROUP BY com.ID
      )
      GROUP BY neg.ID
      ORDER BY review_count DESC
      LIMIT 5;
  `;

  try {
    const get_negative_reviews_result = await query(get_negative_reviews_company_query, queryParams);
    return get_negative_reviews_result;
  } catch (error) {
    console.error('Error during get_negative_reviews_company_query:', error);
    return 'Error fetching negative reviews.';
  }
}


async function getVisitorCheck(ClientIp) {
  const chk_visitor_clientIp_query = `
  SELECT *
  FROM visitors
  WHERE IP_address = ?;
  `;
  const query_val = ClientIp;
  try {
    const chk_visitor_clientIp_query_result = await query(chk_visitor_clientIp_query, query_val);
    //console.log(chk_visitor_clientIp_query_result);
    //return chk_visitor_clientIp_query_result;
    if (chk_visitor_clientIp_query_result.length > 0) {
      return chk_visitor_clientIp_query_result.length;
    } else {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
      const queryValues = [ClientIp, formattedDate];
      const insertVisitorQuery = `
        INSERT INTO visitors (IP_address, visit_time)
        VALUES (?, ?);
      `;
      try {
        await query(insertVisitorQuery, queryValues);
        //console.log('Visitor inserted successfully');
        return chk_visitor_clientIp_query_result.length + 1;

      } catch (error) {
        //return 'Error during insertion: ' + error;
        chk_visitor_clientIp_query_result.length
      }
    }
  } catch (error) {
    return 'Error during user chk_visitor_clientIp_query: ' + error;
  }
}


async function getCompanySurveyDetails(companyID) {
  const get_company_survey_details_query = `
  SELECT survey.*
  FROM survey
  WHERE survey.company_id = ${companyID}
  ORDER BY survey.id DESC;
  `;
  try {
    const get_company_survey_details_result = await query(get_company_survey_details_query);
    return get_company_survey_details_result;
  } catch (error) {
    return 'Error during user get_company_survey_details_query:' + error;
  }
}

async function getCompanyOngoingSurveyDetails(companyID) {
  const get_company_survey_details_query = `
  SELECT survey.*
  FROM survey
  WHERE survey.company_id = ${companyID} AND CURDATE() <= expire_at AND invitation_type != 'Email'
  ORDER BY survey.id DESC;
  `;
  try {
    const get_company_survey_details_result = await query(get_company_survey_details_query);
    return get_company_survey_details_result;
  } catch (error) {
    return 'Error during user get_company_survey_details_query:' + error;
  }
}

async function getCompanySurveyDetailsBySurveyID(survey_unique_id) {
  const get_company_survey_details_query = `
  SELECT survey.*
  FROM survey
  WHERE survey.unique_id = ${survey_unique_id};
  `;
  try {
    const get_company_survey_details_result = await query(get_company_survey_details_query);
    return get_company_survey_details_result;
  } catch (error) {
    return 'Error during user get_company_survey_details_query:' + error;
  }
}

async function getCompanySurveySubmitionsCount() {
  const get_company_survey_submitions_count_query = `
  SELECT survey_unique_id, COUNT(ID) as total_submission
  FROM survey_customer_answers
  GROUP BY survey_unique_id;
  `;
  try {
    const get_company_survey_submitions_count_result = await query(get_company_survey_submitions_count_query);
    return get_company_survey_submitions_count_result;
  } catch (error) {
    return 'Error during user get_company_survey_submitions_count_query:' + error;
  }
}


async function getCompanySurveySubmissions(companyID, survey_unique_id) {
  console.log("companyID", companyID);
  console.log("survey_unique_id", survey_unique_id);
  const get_company_survey_submissions_query = `
  SELECT survey_customer_answers.*, survey_customer_answers.first_name invited_first_name, survey_customer_answers.last_name invited_last_name, users.first_name, users.last_name,users.phone, users.alise_name, users.email,survey_customer_answers.invitation_email
  FROM survey_customer_answers
  LEFT JOIN users ON survey_customer_answers.customer_id = users.user_id
  WHERE company_id = ${companyID} AND survey_unique_id = ${survey_unique_id}
  ORDER BY ID DESC;
  `;

  try {
    const get_company_survey_submissions_result = await query(get_company_survey_submissions_query);
    //console.log("get_company_survey_submissions_result",get_company_survey_submissions_result);
    return get_company_survey_submissions_result;
  } catch (error) {
    return 'Error during user get_company_survey_submissions_query:' + error;
  }
}


async function getCompanySurveyQuestions(survey_uniqueid, companyId) {
  const get_company_survey_question_query = `
  SELECT *
  FROM survey
  WHERE company_id = ${companyId} AND unique_id = ${survey_uniqueid};
  `;
  try {
    const get_company_survey_question_result = await query(get_company_survey_question_query);
    return get_company_survey_question_result;
  } catch (error) {
    return 'Error during user get_company_survey_question_query:' + error;
  }
}

async function getCompanySurveyAnswersByUser(survey_uniqueid, userID) {
  const get_company_survey_answer_query = `
  SELECT *
  FROM survey_customer_answers
  WHERE survey_unique_id = ${survey_uniqueid} AND customer_id = ${userID};
  `;
  try {
    const get_company_survey_question_result = await query(get_company_survey_answer_query);
    return get_company_survey_question_result;
  } catch (error) {
    return 'Error during user get_company_survey_answer_query:' + error;
  }
}

async function getCompanySurveyAnswersByID(survey_submission_id) {
  const get_company_survey_answer_query = `
  SELECT *
  FROM survey_customer_answers
  WHERE ID = ${survey_submission_id};
  `;
  try {
    const get_company_survey_question_result = await query(get_company_survey_answer_query);
    return get_company_survey_question_result;
  } catch (error) {
    return 'Error during user get_company_survey_answer_query:' + error;
  }
}

async function getCompanyReviewInvitationNumbers(companyId) {

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const get_company_review_invite_request_query = `
  SELECT *
  FROM review_invite_request
  WHERE company_id = ${companyId}
  AND YEAR(share_date) = ${currentYear}
  AND MONTH(share_date) = ${currentMonth}
  ORDER BY id DESC 
  `;
  try {
    const get_company_review_invite_request_result = await query(get_company_review_invite_request_query);
    let total_count = 0;
    if (get_company_review_invite_request_result.length > 0) {
      get_company_review_invite_request_result.forEach(count => {
        total_count = total_count + count.count;
      })
      return { 'thismonth_invitation': 1, thismonth_invitation_count: total_count, 'thismonth_invitation_data': get_company_review_invite_request_result };
    } else {
      return { 'thismonth_invitation': 0, thismonth_invitation_count: total_count, 'thismonth_invitation_data': [] };
    }
  } catch (error) {
    return 'Error during user get_company_review_invite_request_query:' + error;
  }
}

module.exports = {
  getUser,
  getUserMeta,
  getCountries,
  getUserRoles,
  getStatesByUserID,
  getStatesByCountryID,//
  getAllCompany,
  getCompany,
  getnewCompany,//
  getComplaint,//
  getCategorybyCompany,//
  getCompanyCategory,
  getParentCompany,
  getownparentcomp,//
  getCountriesList,
  renderCategoryTreeHTML,
  getCompanyCategoryBuID,
  getplans,//
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
  getTempReviews,//
  getCustomerReviewData,
  getCustomerReviewTagRelationData,
  editCustomerReview,
  editCustomerComplaint,//
  searchCompany,
  newsearchCompany,//
  fetchChildCompanies,//
  createStripeProductAndPrice,//
  getCompanyReviewNumbers,
  getCompanyReviewNumberss,//
  getCompanyReviews,
  getUsersByRole,
  getAllReviewsByCompanyID,
  getReviewByID,
  getReviewReplyDataByID,
  reviewTagsCountByCompanyID,
  getPopularCategorieswithoutcoun,//
  getPopularCategories,
  getReviewCount,
  getUserCount,
  getCategoryDetails,
  getParentCategories,
  getPositiveReviewsCompany,
  getNegativeReviewsCompany,
  getVisitorCheck,
  getAllTrashedCompany,
  getCompanySurveyDetails,
  getCompanySurveyQuestions,
  getCompanySurveyAnswersByUser,
  getCompanySurveySubmissions,
  getCompanySurveyAnswersByID,
  getCompanySurveySubmitionsCount,
  getCompanySurveyDetailsBySurveyID,
  getCompanyOngoingSurveyDetails,
  getCompanyReviewsBetween,
  getCompanyReviewInvitationNumbers,
  createcompany,
  createreview,
};
