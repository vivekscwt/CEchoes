const util = require('util');
const db = require('./config');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const useragent = require('useragent');
const requestIp = require('request-ip');
const axios = require('axios');
const mdlconfig = require('./config-module');
const slugify = require('slugify');
const { emit } = require('process');
const base64url = require('base64url');
const dns = require('dns');
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const secretKey = process.env.ENCRYPT_DECRYPT_SECRET; 

dotenv.config({ path: './.env' });
const query = util.promisify(db.query).bind(db);

//-- Fetch faq_pages data --------//
async function getFaqPage() {
  try {
    // Check if the company Name already exists in the "company" table
    const faq_pages_fetch_query = "SELECT * FROM faq_pages";
    const faq_pages__results = await query(faq_pages_fetch_query);
    if (faq_pages__results.length > 0) {
      //return faq_pages info
      //return faq_pages__results[0];
      return faq_pages__results;
    } else {

    }
  }
  catch (error) {
    console.error('Error during fetching faq_pages:', error);
  }
};

async function getFaqPages(country) {
  try {
    // Check if the company Name already exists in the "company" table
    const faq_pages_fetch_query = `SELECT * FROM faq_pages WHERE country = "${country}"`;
    const faq_pages__results = await query(faq_pages_fetch_query);
    if (faq_pages__results.length > 0) {
      //return faq_pages info
      //return faq_pages__results[0];
      return faq_pages__results;
    } else {

    }
  }
  catch (error) {
    console.error('Error during fetching faq_pages:', error);
  }
};


//-- Fetch  faq_categories data --------//
async function getFaqCategories(country) {
  try {
    // Check if the company Name already exists in the "company" table
    const faq_categories_fetch_query = `SELECT * FROM faq_categories WHERE country = "${country}"`;
    const faq_categories__results = await query(faq_categories_fetch_query);
    if (faq_categories__results.length > 0) {
      //return faq_categories info
      return faq_categories__results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetching faq_categories:', error);
  }
};

//-- Fetch  faq_item data --------//
async function getFaqItems(country) {
  try {
    // Check if the company Name already exists in the "company" table
    const faq_items_fetch_query = `SELECT * FROM faq_item WHERE country = "${country}"`;
    const faq_items__results = await query(faq_items_fetch_query);
    if (faq_items__results.length > 0) {
      //return faq_categories info
      return faq_items__results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetching faq_item:', error);
  }
};



//Insert Business Fature content
function insertBusinessFeature(content, image) {
  try {
    const insert_query = `INSERT INTO business_features ( content, image, existing_or_upcoming) VALUES (?,?,'existing')`;
    const insert_data = [content, image];
    query(insert_query, insert_data);
  } catch (error) {
    console.error('Error during Inserting Business Fature content:', error);
  }
}

//Insert Business Upcoming Fature content
function insertBusinessUpcomingFeature(content) {
  try {
    const insert_query = `INSERT INTO business_features ( content,  existing_or_upcoming) VALUES (?,'upcoming')`;
    const insert_data = [content];
    query(insert_query, insert_data);
  } catch (error) {
    console.error('Error during Inserting Business Fature content:', error);
  }
}
//Delete Business Upcoming Fature content
function deleteBusinessUpcomingFeature(content) {
  try {
    const delete_query = `DELETE FROM business_features WHERE existing_or_upcoming = 'upcoming'`;
    query(delete_query);
  } catch (error) {
    console.error('Error during Inserting Business Fature content:', error);
  }
}

//Delete Business Fature content
function deleteBusinessFeature(content) {
  try {
    const delete_query = `DELETE FROM business_features WHERE existing_or_upcoming = 'existing'`;
    query(delete_query);
  } catch (error) {
    console.error('Error during Inserting Business Fature content:', error);
  }
}

//-- Fetch  Business Fature content --------//
async function getBusinessFeature() {
  try {
    // Check if the company Name already exists in the "company" table
    const faq_items_fetch_query = "SELECT * FROM business_features WHERE existing_or_upcoming = 'existing'";
    const faq_items__results = await query(faq_items_fetch_query);
    if (faq_items__results.length > 0) {
      //return faq_categories info
      return faq_items__results;
    } else {

    }
  }
  catch (error) {
    console.error('Error during fetching faq_item:', error);
  }
};

//-- Fetch Upcoming Business Fature content --------//
async function getUpcomingBusinessFeature() {
  try {
    // Check if the company Name already exists in the "company" table
    const faq_items_fetch_query = "SELECT * FROM business_features WHERE existing_or_upcoming = 'upcoming'";
    const faq_items__results = await query(faq_items_fetch_query);
    if (faq_items__results.length > 0) {
      //return faq_categories info
      return faq_items__results;
    } else {

    }
  }
  catch (error) {
    console.error('Error during fetching faq_item:', error);
  }
};

// Function to fetch user Reviewed Companies from the  reviews table
function getReviewedCompanies(userId) {
  return new Promise((resolve, reject) => {
    const reviewed_companies_query = `
            SELECT reviews.company_id, reviews.customer_id, c.company_name as company_name, c.logo as logo, c.slug
            FROM  reviews 
            JOIN company c ON reviews.company_id = c.ID
            WHERE reviews.customer_id = ?
            GROUP BY  reviews.company_id
        `;
    db.query(reviewed_companies_query, [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Function to fetch user All Companies Reviews  from the  reviews table
function getAllCompaniesReviews(userId) {
  return new Promise((resolve, reject) => {
    const reviewed_companies_query = `
            SELECT r.*, c.company_name as company_name, c.logo as logo, c.slug, COUNT(review_reply.id) as review_reply_count, cp.product_title  
            FROM  reviews r
            JOIN company c ON r.company_id = c.ID
            LEFT JOIN review_reply ON review_reply.review_id = r.id
            LEFT JOIN company_products cp ON r.product_id = cp.id 
            WHERE r.customer_id = ? AND r.review_status = '1'
            GROUP BY r.id
            ORDER BY updated_at DESC
        `;
    db.query(reviewed_companies_query, [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
function getCompaniesReviewsbyuserId(userId) {
  return new Promise((resolve, reject) => {
    const reviewed_companies_query = `
            SELECT r.*, c.company_name as company_name, c.logo as logo, c.slug, COUNT(review_reply.id) as review_reply_count, cp.product_title  
            FROM  reviews r
            JOIN company c ON r.company_id = c.ID
            LEFT JOIN review_reply ON review_reply.review_id = r.id
            LEFT JOIN company_products cp ON r.product_id = cp.id 
            WHERE r.customer_id = ?
            GROUP BY r.id
            ORDER BY updated_at DESC
        `;
    db.query(reviewed_companies_query, [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
// Function to fetch user All Companies Reviews tags from the  review_tag_relation table
function getAllReviewTags() {
  return new Promise((resolve, reject) => {
    const reviewed_companies_query = `
            SELECT review_id,tag_name
            FROM  review_tag_relation 
            WHERE 1 `;
    db.query(reviewed_companies_query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function getAlltempReviewTags() {
  return new Promise((resolve, reject) => {
    const reviewed_companies_query = `
            SELECT review_id,tag_name
            FROM  review_tag_relation 
            WHERE 1 `;
    db.query(reviewed_companies_query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}



async function getlatestReviews(reviewCount, country) {
  let get_latest_review_query = `
     SELECT r.*, c.company_name, c.logo, c.slug, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, 
    u.last_name,u.alise_name, u.user_id, u.user_status, ucm.profile_pic, COUNT(review_reply.id) as review_reply_count, cc.category_name, cp.product_title 
      FROM reviews r
      LEFT JOIN company c ON r.company_id = c.ID 
      LEFT JOIN company_location cl ON r.company_location_id = cl.ID 
       LEFT JOIN users u ON r.customer_id = u.user_id 
      LEFT JOIN user_customer_meta ucm ON ucm.user_id = u.user_id 
      LEFT JOIN review_reply ON review_reply.review_id = r.id
       LEFT JOIN complaint_category cc ON r.category_id = cc.id 
       LEFT JOIN company_products cp ON r.product_id = cp.id 
    WHERE r.review_status = "1" AND c.status = "1" AND (r.flag_status != '0' OR r.flag_status IS NULL) 
  `;

  if (country) {
    console.log("latestcountry", country);
    get_latest_review_query += ` AND c.main_address_country = '${country}'`;
  }

  get_latest_review_query += `
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ${reviewCount};
  `;

  //console.log("Constructed SQL Query:", get_latest_review_query); 
  try {
    const get_latest_review_results = await query(get_latest_review_query);
    console.log("get_latest_review_results", get_latest_review_results);
    if (get_latest_review_results.length > 0) {
      return get_latest_review_results;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error during user get_latest_review_query:', error);
  }
}




// async function getlatestReviews(reviewCount) {
//   const get_latest_review_query = `
//     SELECT r.*, c.company_name, c.logo, c.slug, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, 
//     u.last_name,u.alise_name, u.user_id, u.user_status, ucm.profile_pic, COUNT(review_reply.id) as review_reply_count, cc.category_name, cp.product_title 
//       FROM reviews r
//       LEFT JOIN company c ON r.company_id = c.ID 
//       LEFT JOIN company_location cl ON r.company_location_id = cl.ID 
//       LEFT JOIN users u ON r.customer_id = u.user_id 
//       LEFT JOIN user_customer_meta ucm ON ucm.user_id = u.user_id 
//       LEFT JOIN review_reply ON review_reply.review_id = r.id
//       LEFT JOIN complaint_category cc ON r.category_id = cc.id 
//       LEFT JOIN company_products cp ON r.product_id = cp.id 
//       WHERE r.review_status = "1" AND c.status = "1" AND (r.flag_status != '0' OR r.flag_status IS NULL) 
//       GROUP BY r.id
//       ORDER BY r.created_at DESC
//       LIMIT ${reviewCount};
//   `;
//   try {
//     const get_latest_review_results = await query(get_latest_review_query);
//     if (get_latest_review_results.length > 0) {
//       //console.log(get_latest_review_results);
//       return get_latest_review_results;
//     } else {
//       return [];
//     }
//   } catch (error) {
//     console.error('Error during user get_latest_review_query:', error);
//   }

// }

// async function getlatestReviews(reviewCount,country) {
//   console.log("latestReviewscountry",country);
//   const get_latest_review_query = `
//     SELECT r.*, c.company_name, c.logo, c.slug, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, 
//     u.last_name,u.alise_name, u.user_id, u.user_status, ucm.profile_pic, COUNT(review_reply.id) as review_reply_count, cc.category_name, cp.product_title 
//       FROM reviews r
//       LEFT JOIN company c ON r.company_id = c.ID 
//       LEFT JOIN company_location cl ON r.company_location_id = cl.ID 
//       LEFT JOIN users u ON r.customer_id = u.user_id 
//       LEFT JOIN user_customer_meta ucm ON ucm.user_id = u.user_id 
//       LEFT JOIN review_reply ON review_reply.review_id = r.id
//       LEFT JOIN complaint_category cc ON r.category_id = cc.id 
//       LEFT JOIN company_products cp ON r.product_id = cp.id 
//       WHERE r.review_status = "1" AND c.status = "1" AND (r.flag_status != '0' OR r.flag_status IS NULL) AND cl.country =?
//       GROUP BY r.id
//       ORDER BY r.created_at DESC
//       LIMIT ${reviewCount};
//   `;
//   try {
//     const get_latest_review_results = await query(get_latest_review_query,[country]);
//     if (get_latest_review_results.length > 0) {
//       //console.log(get_latest_review_results);
//       return get_latest_review_results;
//     } else {
//       return [];
//     }
//   } catch (error) {
//     console.error('Error during user get_latest_review_query:', error);
//   }

// }

//Function to fetch All Trending Reviews from the  reviews,company,company_location,users,user_customer_meta table
// async function getAllTrendingReviews() {
//   const get_latest_review_query = `
//     SELECT r.*, c.company_name, c.logo, c.slug, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, 
//     u.last_name, u.alise_name, u.user_id, u.user_status, ucm.profile_pic, COUNT(review_reply.id) as review_reply_count, cc.category_name, cp.product_title
//       FROM reviews r
//       LEFT JOIN company c ON r.company_id = c.ID 
//       LEFT JOIN company_location cl ON r.company_location_id = cl.ID 
//       LEFT JOIN users u ON r.customer_id = u.user_id 
//       LEFT JOIN user_customer_meta ucm ON ucm.user_id = u.user_id 
//       LEFT JOIN review_reply ON review_reply.review_id = r.id
//       LEFT JOIN complaint_category cc ON r.category_id = cc.id 
//       LEFT JOIN company_products cp ON r.product_id = cp.id 
//       WHERE r.review_status = "1" AND c.status = "1" AND c.trending = "1" AND (r.flag_status != '0' OR r.flag_status IS NULL)
//       GROUP BY r.id
//       ORDER BY r.created_at DESC
//   `;
//   try {
//     const get_latest_review_results = await query(get_latest_review_query);
//     if (get_latest_review_results.length > 0) {
//       //console.log(get_latest_review_results);
//       return get_latest_review_results;
//     } else {
//       return [];
//     }
//   } catch (error) {
//     console.error('Error during user get_latest_review_query:', error);
//   }

// }
async function getAllTrendingReviews(country) {
  let get_latest_review_query = `
    SELECT r.*, c.company_name, c.logo, c.slug, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, 
    u.last_name, u.alise_name, u.user_id, u.user_status, ucm.profile_pic, COUNT(review_reply.id) as review_reply_count, cc.category_name, cp.product_title
      FROM reviews r
      LEFT JOIN company c ON r.company_id = c.ID 
      LEFT JOIN company_location cl ON r.company_location_id = cl.ID 
      LEFT JOIN users u ON r.customer_id = u.user_id 
      LEFT JOIN user_customer_meta ucm ON ucm.user_id = u.user_id 
      LEFT JOIN review_reply ON review_reply.review_id = r.id
      LEFT JOIN complaint_category cc ON r.category_id = cc.id 
      LEFT JOIN company_products cp ON r.product_id = cp.id 
      WHERE r.review_status = "1" AND c.status = "1" AND c.trending = "1" AND (r.flag_status != '0' OR r.flag_status IS NULL)
  `;

  if (country) {
    console.log("latestcountry", country);
    get_latest_review_query += ` AND c.main_address_country = '${country}'`;
  }

  get_latest_review_query += `
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `;

  //console.log("Constructed SQL Query:", get_latest_review_query); 
  try {
    const get_latest_review_results = await query(get_latest_review_query,[country]);
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

//Function to fetch All  Reviews from the  reviews,company,company_location,users,user_customer_meta table
// async function getAllReviews() {
//   const get_latest_review_query = `
//     SELECT r.*, c.company_name, c.logo, c.slug, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, 
//     u.last_name, u.alise_name, u.user_id, u.user_status, ucm.profile_pic, COUNT(review_reply.id) as review_reply_count, cc.category_name, cp.product_title
//       FROM reviews r
//       LEFT JOIN company c ON r.company_id = c.ID 
//       LEFT JOIN company_location cl ON r.company_location_id = cl.ID 
//       LEFT JOIN users u ON r.customer_id = u.user_id 
//       LEFT JOIN user_customer_meta ucm ON ucm.user_id = u.user_id 
//       LEFT JOIN review_reply ON review_reply.review_id = r.id
//       LEFT JOIN complaint_category cc ON r.category_id = cc.id 
//       LEFT JOIN company_products cp ON r.product_id = cp.id 
//       WHERE r.review_status = "1" AND c.status = "1" AND (r.flag_status != '0' OR r.flag_status IS NULL)
//       GROUP BY r.id
//       ORDER BY r.created_at DESC
//   `;
//   try {
//     const get_latest_review_results = await query(get_latest_review_query);
//     if (get_latest_review_results.length > 0) {
//       //console.log(get_latest_review_results);
//       return get_latest_review_results;
//     } else {
//       return [];
//     }
//   } catch (error) {
//     console.error('Error during user get_latest_review_query:', error);
//   }

// }

async function getAllReviews(country) {
  let  get_latest_review_query = `
    SELECT r.*, c.company_name, c.logo, c.slug, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, 
    u.last_name, u.alise_name, u.user_id, u.user_status, ucm.profile_pic, COUNT(review_reply.id) as review_reply_count, cc.category_name, cp.product_title
      FROM reviews r
      LEFT JOIN company c ON r.company_id = c.ID 
      LEFT JOIN company_location cl ON r.company_location_id = cl.ID 
      LEFT JOIN users u ON r.customer_id = u.user_id 
      LEFT JOIN user_customer_meta ucm ON ucm.user_id = u.user_id 
      LEFT JOIN review_reply ON review_reply.review_id = r.id
      LEFT JOIN complaint_category cc ON r.category_id = cc.id 
      LEFT JOIN company_products cp ON r.product_id = cp.id 
      WHERE r.review_status = "1" AND c.status = "1" AND (r.flag_status != '0' OR r.flag_status IS NULL) `
     

      if (country) {
        console.log("allcountry", country);
        get_latest_review_query += ` AND c.main_address_country = '${country}'`;
      }
    
      get_latest_review_query += `
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `;
  try {
    const get_latest_review_results = await query(get_latest_review_query,[country]);
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

//Function to fetch Page Info Content from the  page_info table
async function getPageInfo(pageName) {
  try {
    const sql = `SELECT * FROM page_info where secret_Key = '${pageName}' `;
    const get_page_info_result = await query(sql);
    return get_page_info_result[0];
  } catch (error) {
    console.error('Error during user get_latest_review_query:', error);
  }
}

//Function to fetch Page Meta Values from the  page_meta table
async function getPageMetaValues(pageName) {
  const sql = `SELECT * FROM page_info where secret_Key = '${pageName}' `;
  const get_page_info_result = await query(sql);

  const meta_sql = `SELECT * FROM page_meta where page_id = ${get_page_info_result[0].id}`;
  const get_page_meta_result = await query(meta_sql);
  let meta_values_array = {};
  await get_page_meta_result.forEach((item) => {
    meta_values_array[item.page_meta_key] = item.page_meta_value;
  })
  return meta_values_array;
}

//Function to fetch Page Meta Values from the  page_meta table
async function getPageMetaValue(pageName,country) {
  const sql = `SELECT * FROM page_info where secret_Key = '${pageName}' AND country= "${country}"`;
  const get_page_info_result = await query(sql);

  console.log("get_page_info_resultsfsdf",get_page_info_result);

  const meta_sql = `SELECT * FROM page_meta where page_id = ${get_page_info_result[0].id}`;
  const get_page_meta_result = await query(meta_sql);
  let meta_values_array = {};
  await get_page_meta_result.forEach((item) => {
    meta_values_array[item.page_meta_key] = item.page_meta_value;
  })
  return meta_values_array;
}

//Function to send mail to client after approve
async function reviewApprovedEmail(req) {
  //console.log(req);

  const sql = `
    SELECT r.created_at, r.company_id, c.company_name, c.slug, u.first_name, u.email, claimed_user.email claimed_user_email, claimed_user.first_name claimed_user_name
    FROM reviews r
    LEFT JOIN company c ON r.company_id = c.ID 
    LEFT JOIN users u ON r.customer_id = u.user_id 
    LEFT JOIN company_claim_request ccr ON ccr.company_id = c.ID 
    LEFT JOIN users claimed_user ON ccr.claimed_by = claimed_user.user_id 
    WHERE r.review_status = "1" AND r.id = "${req.review_id}"
`;

  const approveReviewData = await query(sql);
  console.log("approveReviewData",approveReviewData);
  


  if (approveReviewData.length > 0) {
    const dateString = approveReviewData[0].created_at;
    const date = new Date(dateString);
    const reviewDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })

    //console.log('approve Function', reviewData)
    var mailOptions = {
      from: process.env.MAIL_USER,
      //to: 'pranab@scwebtech.com',
      to: approveReviewData[0].email,
      subject: 'Review Approval Email',
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
                         <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Review approved</h1>
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
                                  <strong>Hello ${approveReviewData[0].first_name},</strong>
                                  <p style="font-size:15px; line-height:20px">Your review for <i><b>"${approveReviewData[0].company_name} on ${reviewDate}"</b></i> has been approved. Now you can see your review on the <a href="${process.env.MAIN_URL}company/${approveReviewData[0].slug}">website</a>.</p>
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
          message: 'Review Approve'
        });
      }
    })

    if (approveReviewData[0].claimed_user_email != null) {
      var claimed_user_mail = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: approveReviewData[0].claimed_user_email,
        subject: 'Add a new review',
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
                         <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                          <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                             <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Review received</h1>
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
                                      <strong>Hello ${approveReviewData[0].claimed_user_name},</strong>
                                      <p style="font-size:15px; line-height:20px">A user reviewed on your organization <i><b>"on ${reviewDate}"</b></i>. Now you can see this review on the <a style="color:#FCCB06" href="${process.env.MAIN_URL}company/${approveReviewData[0].slug}">CEchoesTechnology</a> website.</p>
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
      await mdlconfig.transporter.sendMail(claimed_user_mail, function (err, info) {
        if (err) {
          console.log(err);
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send: ', info.response);
          // return res.send({
          //     status: 'ok',
          //     message: 'Review Approve'
          // });
        }
      })
    }

  }

  return true;
}

//Function to send mail to client after reject
async function reviewRejectdEmail(req) {
  const sql = `
    SELECT r.created_at,r.rejecting_reason, c.company_name, c.slug, u.first_name, u.email 
    FROM reviews r
    LEFT JOIN company c ON r.company_id = c.ID 
    LEFT JOIN users u ON r.customer_id = u.user_id 
    WHERE r.review_status = "0" AND r.id = "${req.review_id}"
`;

  const rejectReviewData = await query(sql);

  console.log(rejectReviewData[0])
  if (rejectReviewData.length > 0) {

    const dateString = rejectReviewData[0].created_at;
    const date = new Date(dateString);
    const reviewDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })

    //console.log('approve Function', reviewData)
    var mailOptions = {
      from: process.env.MAIL_USER,
      //to: 'pranab@scwebtech.com',
      to: rejectReviewData[0].email,
      subject: 'Review Rejected Email',
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
                         <h1 style="color: red; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Review Rejected</h1>
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
                                  <strong>Hello ${rejectReviewData[0].first_name},</strong>
                                  <p style="font-size:15px; line-height:20px">Your review for <i><b>"${rejectReviewData[0].company_name} on ${reviewDate}"</b></i> was unfortunately rejected because of the following reason:</p>
                                   <p style="font-size:15px; line-height:25px;">${rejectReviewData[0].rejecting_reason}</p>
                                   <p style="font-size:15px; line-height:25px;">You can submit a new review keeping the above comments in mind.</p>
                                   <small>For further details contact us at : <a href="mailto:support@CEchoesTechnology.com"><i>support@CEchoesTechnology.com</i></a></small>
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
     </div> `
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
          message: 'Review Rejected'
        });
      }
    })
  }

  return true;
}

//Function to fetch Premium company details Values from the  premium_company_data table
async function getPremiumCompanyData(companyId) {
  const sql = `SELECT * FROM premium_company_data where company_id = '${companyId}' `;
  const PremiumCompanyData = await query(sql);

  //console.log('PremiumCompanyData',PremiumCompanyData[0])
  //if(PremiumCompanyData.length>0){
  return PremiumCompanyData[0];
  //}else{
  //return {};
  //}
}

async function getComplaintAllLevelDetails(companyId) {
  const sql = `
  SELECT 
  complaint_level_management.id AS complaint_level_management_id,
  complaint_level_management.company_id  AS complaint_level_management_company_id,
  complaint_level_management.level AS complaint_level_management_level,
  complaint_level_management.emails AS complaint_level_management_emails,
  complaint_level_management.eta_days AS complaint_level_management_eta_days,
  complaint_level_management.category_id AS complaint_level_management_category_id,
  complaint_level_management.created_at AS complaint_level_management_created_at,
  company_level_manage_users.id AS company_level_manage_users_id,
  company_level_manage_users.company_id AS company_level_manage_users_company_id,
  company_level_manage_users.level AS company_level_manage_users_level,
  company_level_manage_users.emails AS company_level_manage_users_emails,
  company_level_manage_users.eta_days AS company_level_manage_users_eta_days,
  company_level_manage_users.level_user_type AS company_level_manage_users_level_user_type,
  company_level_manage_users.created_at AS company_level_manage_users_created_at
  FROM complaint_level_management 
  LEFT JOIN company_level_manage_users ON complaint_level_management.company_id = company_level_manage_users.company_id AND complaint_level_management.level = company_level_manage_users.level 
  WHERE complaint_level_management.company_id = '${companyId}';  
  `;
  try {
    const results = await query(sql);
    console.log("results", results);
    if (results.length > 0) {
      console.log("results", results);
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch All complaint level details: ', error);

  }
}

//get company categories
async function geCompanyCategories(companyId) {
  const sql = `
  SELECT complaint_category.id AS category_id,complaint_category.category_name,complaint_category.parent_id FROM 
  complaint_category
  WHERE complaint_category.company_id = '${companyId}' AND complaint_category.parent_id='0';  
  `;
  try {
    const results = await query(sql);
    //console.log("results", results);
    if (results.length > 0) {
      //console.log("results", results);
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch company categories details: ', error);

  }
}

async function getcategoriesUsers(company_id) {
  const get_company_categories_users = `
      SELECT 
      complaint_level_management.*,
      users.first_name,
      users.last_name,
      complaint_category.category_name,
      complaint_category.parent_id
      FROM complaint_level_management
      LEFT JOIN users ON complaint_level_management.emails = users.email
      LEFT JOIN complaint_category ON complaint_level_management.category_id = complaint_category.id
      WHERE complaint_level_management.company_id = ${company_id};
  `;
  try {
      const company_categories_users_result = await query(get_company_categories_users);
      
      if (company_categories_users_result.length == 0) {
          return []; 
      }else{
        return company_categories_users_result;
      }

  } catch (error) {
      return 'Error during getcategoriesUsers:' + error;
  }
}
async function getEtaDays(companyId) {
  const sql = `
  SELECT DISTINCT eta_days, level
  FROM complaint_level_management
  WHERE company_id = '${companyId}'
  ORDER BY eta_days IS NULL, eta_days
`;
  try {
    const results = await query(sql);
    if (results.length > 0) {
      const nonNullEtaDays = results.filter(entry => entry.eta_days !== null);
      console.log("nonNullEtaDays",nonNullEtaDays);
      return nonNullEtaDays;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch All complaint level details: ', error);

  }
}
async function geCompanyCategorieslength(companyId) {
  const sql = `
  SELECT COUNT(*) AS category_count
  FROM complaint_category
  WHERE company_id = ?
    AND parent_id = '0';  
`;

try {
  const results = await query(sql, [companyId]);
  if (results.length > 0) {
    var counts = results[0].category_count;
    // console.log("Category count:", results[0].category_count);
    // console.log("Category count:", results);
    return counts;
  } else {
    console.log("No categories found");
    return [];
  }
} catch (error) {
  console.error('Error during fetching company categories details:', error);
  throw error; 
}

}

async function getmanagementUsers(company_id) {
  const get_company_getmanagementUsers = `
      SELECT 
      company_level_manage_users.*,
      users.first_name,
      users.last_name
      FROM company_level_manage_users
      LEFT JOIN users ON company_level_manage_users.emails = users.email
      WHERE company_level_manage_users.company_id = ${company_id};
  `;
  try {
      const company_categories_users_result = await query(get_company_getmanagementUsers);
      
      if (company_categories_users_result.length == 0) {
          return []; 
      }else{
        return company_categories_users_result;
      }

  } catch (error) {
      return 'Error during getmanagementUsers:' + error;
  }
}


async function getCompanySurveyCount(companyId) {
  const sql = `SELECT COUNT(id) as surveycount FROM survey where company_id = '${companyId}' AND CURDATE() <= expire_at`;
  const CompanySurveyCountData = await query(sql);

  //console.log('SurveyCountData',CompanySurveyCountData)
  return CompanySurveyCountData;
}

async function getCompanySurveyListing(companyId) {
  const get_company_survey_listing_query = `
  SELECT survey.id, survey.unique_id, survey.title, COUNT(sca.ID) AS total_submission
  FROM survey
  LEFT JOIN survey_customer_answers sca ON survey.unique_id = sca.survey_unique_id
  WHERE survey.company_id = ${companyId} AND CURDATE() <= expire_at
  ORDER BY survey.id DESC;
  `;
  try {
    const get_company_survey_details_result = await query(get_company_survey_listing_query);
    return get_company_survey_details_result;
  } catch (error) {
    return 'Error during user get_company_survey_details_query:' + error;
  }
}

async function getCompanySurveyQuestions(surveyId, user_ID) {
  const get_company_survey_question_query = `
  SELECT survey.*
  FROM survey
  WHERE survey.unique_id = ${surveyId};
  `;
  try {
    const get_company_survey_question_result = await query(get_company_survey_question_query);

    const surveySubmitCheckQuery = `
        SELECT COUNT(ID) as user_submission
        FROM survey_customer_answers
        WHERE survey_unique_id = ${surveyId} AND customer_id = ${user_ID};
      `;
    try {
      const get_surveySubmitCheckQueryresult = await query(surveySubmitCheckQuery);
      //console.log('get_surveySubmitCheckQueryresult'+user_ID, get_surveySubmitCheckQueryresult[0].user_submission);

      if (get_surveySubmitCheckQueryresult[0].user_submission == 0) {
        get_company_survey_question_result[0].user_submission = false;
      } else {
        get_company_survey_question_result[0].user_submission = true;
      }
      return get_company_survey_question_result[0];
    } catch (error) {
      //return 'Error during insertion: ' + error;
      return 'Error during user surveySubmitCheckQuery:' + error;
    }
  } catch (error) {
    return 'Error during user get_company_survey_question_query:' + error;
  }
}

//Function to fetch User Name from the  users table
async function getUserName(email) {
  const sql = `SELECT user_id, first_name  FROM users WHERE email = '${email}' `;
  const get_user_name = await query(sql);
  if (get_user_name.length > 0) {
    return get_latest_review_results;
  } else {
    return [];
  }
}

//Function to fetch User email from the  users, review_reply table
async function ReviewReplyTo(Id) {
  const sql = `SELECT users.email, users.first_name, c.company_name, c.slug, c.ID as company_id, r.customer_id
              FROM users 
              LEFT JOIN review_reply rr ON rr.reply_to = users.user_id 
              LEFT JOIN reviews r ON r.id = rr.review_id 
              LEFT JOIN company c ON r.company_id = c.ID 
              WHERE rr.ID = '${Id}'  `;

  const get_user_email = await query(sql);
  if (get_user_email.length > 0) {
    return get_user_email;
  } else {
    return [];
  }
}

//Function to Send Reply To Company 
function ReviewReplyToCompany(mailReplyData) {
  var mailOptions = {
    from: process.env.MAIL_USER,
    //to: 'pranab@scwebtech.com',
    to: mailReplyData[0].email,
    subject: 'Message Reply',
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
                       <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Message Reply</h1>
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
                                <strong>Hello ${mailReplyData[0].first_name},</strong>
                                <p style="font-size:15px; line-height:20px">You got a reply from the customer for your message. 
                                <a  href="${process.env.MAIN_URL}company-review-listing/${mailReplyData[0].slug}">Click here</a> to view.</p>
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
      return res.send({
        status: 'not ok',
        message: 'Something went wrong'
      });
    } else {
      console.log('Mail Send: ', info.response);

    }
  })
}
//Function to Send Reply To Customer 
function ReviewReplyToCustomer(mailReplyData) {
  if (mailReplyData && mailReplyData.length > 0 && mailReplyData[0].email) {
    var mailOptions = {
      from: process.env.MAIL_USER,
      //to: 'pranab@scwebtech.com',
      to: mailReplyData[0].email,
      subject: 'Message Reply',
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
                       <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Message Reply</h1>
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
                                <strong>Hello ${mailReplyData[0].first_name},</strong>
                                <p style="font-size:15px; line-height:20px"><b>${mailReplyData[0].company_name}</b> has responded to your reviews, please visit <a  href="${process.env.MAIN_URL}company/${mailReplyData[0].slug}">the link</a> to view response.
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
        return res.send({
          status: 'not ok',
          message: 'Something went wrong'
        });
      } else {
        console.log('Mail Send: ', info.response);

      }
    })
  }
}

//Function to fetch User total replied from the  review_reply table
async function TotalReplied(Id) {
  const sql = `SELECT COUNT(ID) AS totalReplied, status AS replied
              FROM review_reply 
              WHERE reply_by = '${Id}'  `;

  const noOfReplied = await query(sql);
  //console.log(noOfReplied[0])
  return noOfReplied[0];
}

//Function to fetch User review data by Id from the  review table
async function reviewDataById(reviewId, userId) {
  const sql = `SELECT r.* , c.company_name, cc.category_name, cp.product_title
              FROM reviews r
              JOIN company c ON r.company_id = c.ID 
              LEFT JOIN complaint_category cc ON r.category_id = cc.id 
              LEFT JOIN company_products cp ON r.product_id = cp.id 
              WHERE r.id = '${reviewId}' AND r.customer_id = '${userId}' `;

  const reviewData = await query(sql);
  //console.log(noOfReplied[0]) 
  return reviewData;
}

//Function to Update User review data by Id from the  review table
async function updateReview(reviewIfo) {
  //console.log('Review Info', reviewIfo);
  //return false;
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

  const updateQuery = 'UPDATE reviews SET review_title = ?, rating = ?, review_content = ?, user_privacy = ?, user_contact = ?, updated_at = ?, review_status = ?, category_id = ?, product_id = ? WHERE id = ?';
  const updateData = [reviewIfo.review_title, reviewIfo.rating, reviewIfo.review_content, reviewIfo.user_privacy, reviewIfo.user_contact, formattedDate, '2', reviewIfo.category_id, reviewIfo.product_id, reviewIfo.review_id]

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

// Function to count review like
async function countLike(reviewId) {
  const sql = `SELECT COUNT(id) AS totalLike
    FROM review_voting WHERE review_id = '${reviewId}' AND voting = '1' `;

  const noOfLike = await query(sql);
  console.log('noOfLike', noOfLike)
  return noOfLike[0];
}

// Function to count review Dislike
async function countDislike(reviewId) {
  const sql = `SELECT COUNT(id) AS totalDislike
    FROM review_voting WHERE review_id = '${reviewId}' AND voting = '0' `;

  const noOfDislike = await query(sql);
  console.log('noOfDislike', noOfDislike)
  return noOfDislike[0];
}

// Function to fetch all review voting
async function getAllReviewVoting() {
  const sql = `SELECT *
    FROM review_voting WHERE 1 `;

  const ReviewVoting = await query(sql);
  //console.log('ReviewVoting',ReviewVoting)
  return ReviewVoting;
}

//Function to Update User reply data by Id from the  review table
async function updateCustomerReply(req) {
  //console.log(req)


  try {
    if (req.reply_id) {
      const currentDate = new Date();
      // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
      const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

      const update_reply_query = 'UPDATE review_reply SET  comment = ?, status = ? , reason = ?, updated_at = ? WHERE ID = ? ';

      const update_reply_values = [
        req.reply_content || null,
        req.reply_status || '2',
        req.reply_rejecting_comment || null,
        formattedDate,
        req.reply_id
      ];
      const update_reply_result = await query(update_reply_query, update_reply_values);

      return true;
    } else {
      return false;
    }
  } catch (error) {
    return 'Error during user update_reply_query:' + error;
  }
}

//Function to Update User reply data by Id from the  review table
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


// Function to generate a unique slug from a string
function generateUniqueSlug(companyName, callback) {
  // Check if the generated slug already exists in the database
  db.query('SELECT company_name, slug FROM company', (err, existingSlugs) => {
    if (err) {
      callback(err);
      return;
    }

    const baseSlug = slugify(companyName, {
      replacement: '-',  // replace spaces with hyphens
      lower: true,      // convert to lowercase
      strict: true,     // strip special characters
      remove: /[*+~.()'"!:@]/g,
    });

    let slug = baseSlug;
    let slugExists = false;
    let count = 1;
    // Check if the generated slug already exists in the existing slugs
    existingSlugs.forEach((value) => {
      if (value.slug === baseSlug) {
        slugExists = true;
      }
      if (value.company_name == companyName) {
        count++
      }
    });

    if (slugExists) {
      slug = `${baseSlug}-${count}`;
      //slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
    }

    callback(null, slug);
  });
}


// function generateUniqueSlug(companyName, country, callback) {
//   // Create a base slug from the company name
//   const baseSlug = slugify(companyName, {
//     replacement: '-',  // Replace spaces with hyphens
//     lower: true,       // Convert to lowercase
//     strict: true,      // Strip special characters
//   });

//   // Query to find existing slugs in the same country
//   db.query(
//     'SELECT slug FROM company WHERE main_address_country = ? AND slug LIKE ?',
//     [country, `${baseSlug}%`],
//     (err, existingSlugs) => {
//       if (err) {
//         return callback(err);
//       }

//       let slug = baseSlug;
//       let count = 1;

//       // Ensure the generated slug is unique within the same country
//       const existingSlugsSet = new Set(existingSlugs.map((s) => s.slug));
//       while (existingSlugsSet.has(slug)) {
//         slug = `${baseSlug}-${count}`;
//         count++;
//       }

//       callback(null, slug); // Return the unique slug
//     }
//   );
// }


// Function to generate a unique slug from a string
// function generateUniqueSlugCategory(catName, callback) {
//   // Check if the generated slug already exists in the database
//   db.query('SELECT category_name, category_slug  FROM category', (err, existingSlugs) => {
//     if (err) {
//       callback(err);
//       return;
//     }

//     const baseSlug = slugify(catName, {
//       replacement: '-',  // replace spaces with hyphens
//       lower: true,      // convert to lowercase
//       strict: true,     // strip special characters
//       remove: /[*+~.()'"!:@]/g,
//     });

//     let slug = baseSlug;
//     let slugExists = false;
//     let count = 1;
//     // Check if the generated slug already exists in the existing slugs
//     existingSlugs.forEach((value) => {
//       if (value.category_slug === baseSlug) {
//         slugExists = true;
//       }
//       if (value.category_name == catName) {
//         count++
//       }
//     });

//     if (slugExists) {
//       slug = `${baseSlug}-${count}`;
//       //slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
//     }

//     callback(null, slug);
//   });
// }

//new
function generateUniqueSlugCategory(catName, callback) {
  // Check if the generated slug already exists in the database
  db.query('SELECT category_slug FROM category', (err, existingSlugs) => {
    if (err) {
      callback(err);
      return;
    }

    const baseSlug = slugify(catName, {
      replacement: '-',  // replace spaces with hyphens
      lower: true,       // convert to lowercase
      strict: true,      // strip special characters
      remove: /[*+~.()'"!:@]/g,
    });

    let slug = baseSlug;
    let slugExists = false;
    let count = 1;

    // Check if the generated slug already exists in the existing slugs
    const existingSlugMap = existingSlugs.map(row => row.category_slug);

    while (existingSlugMap.includes(slug)) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    callback(null, slug);
  });
}


// Function to fetch Sub Category
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


async function getsubCategories(categorySlug) {
  const sql = `SELECT category.category_name,
                      category.category_slug, 
                      GROUP_CONCAT(DISTINCT c.category_name) AS subcategories, 
                      GROUP_CONCAT(DISTINCT c.category_slug) AS subcategoriesSlug, 
                      category_country_relation.country_id,
                      countries.shortname
               FROM category 
               LEFT JOIN category c ON category.ID = c.parent_id
               LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id
               LEFT JOIN countries ON category_country_relation.country_id = countries.id
               WHERE category.category_slug = '${categorySlug}'
               GROUP BY category.category_name, category.category_slug, category_country_relation.country_id, countries.name`;

  const result = await query(sql);
  if (result.length > 0) {
    return result;
  } else {
    return [];
  }
}


// Function to fetch  Category Company details
async function getCompanyDetails(categorySlug,country) {
  const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img,category.category_slug
                FROM category  
                JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
                LEFT JOIN company c ON c.ID = ccr.company_id
                LEFT JOIN reviews r ON r.company_id = c.ID
                LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
                WHERE category.category_slug = '${categorySlug}' AND c.status = '1' AND c.main_address_country = "${country}"
                GROUP BY c.ID, c.company_name `;

  const result = await query(sql);
  console.log("getCompanyDetails",result);
  if (result.length > 0) {
    return result;
  } else {
    return [];
  }

}

// async function getCompanyDetails(categorySlug,country) {
//   const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img,category.category_slug
//                 FROM category  
//                 JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
//                 LEFT JOIN company c ON c.ID = ccr.company_id
//                 LEFT JOIN reviews r ON r.company_id = c.ID
//                 LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
//                 WHERE category.category_slug = '${categorySlug}' AND c.status = '1'
//                 GROUP BY c.ID, c.company_name `;

//   const result = await query(sql);
//   console.log("getCompanyDetails",result);
//   if (result.length > 0) {
//     return result;
//   } else {
//     return [];
//   }

// }

// Function to fetch Category Filtered Company details
async function getFilteredCompanyDetails(categorySlug, filterValue, country) {
  console.log('filterValue', filterValue);
  console.log("country",country);
  if (filterValue == 'latest') {
    const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img
                FROM category  
                JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
                LEFT JOIN company c ON c.ID = ccr.company_id
                LEFT JOIN reviews r ON r.company_id = c.ID
                LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
                WHERE category.category_slug = '${categorySlug}' AND c.status = '1' AND c.main_address_country = "${country}"
                GROUP BY c.ID, c.company_name 
                ORDER BY c.created_date DESC 
                LIMIT 20`;

    const result = await query(sql);
    if (result.length > 0) {
      return result;
    } else {
      return [];
    }

  } else if (filterValue == 'trending') {
    const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.  rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img
                FROM category  
                JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
                LEFT JOIN company c ON c.ID = ccr.company_id
                LEFT JOIN reviews r ON r.company_id = c.ID
                LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
                WHERE category.category_slug = '${categorySlug}' AND c.status = '1' AND c.trending = '1' AND c.main_address_country = "${country}"
                GROUP BY c.ID, c.company_name `;

    const result = await query(sql);
    if (result.length > 0) {
      return result;
    } else {
      return [];
    }
  } else {
    const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.  rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img
                FROM category  
                JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
                LEFT JOIN company c ON c.ID = ccr.company_id
                LEFT JOIN reviews r ON r.company_id = c.ID
                LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
                WHERE category.category_slug = '${categorySlug}' AND c.status = '1' AND c.verified = '1' AND c.main_address_country = "${country}"
                GROUP BY c.ID, c.company_name `;

    const result = await query(sql);
    if (result.length > 0) {
      return result;
    } else {
      return [];
    }
  }




}

// async function getFilteredCompanyDetails(categorySlug, filterValue) {
//   console.log('filterValue', filterValue);
//   //console.log("country",country);
//   if (filterValue == 'latest') {
//     const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img
//                 FROM category  
//                 JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
//                 LEFT JOIN company c ON c.ID = ccr.company_id
//                 LEFT JOIN reviews r ON r.company_id = c.ID
//                 LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
//                 WHERE category.category_slug = '${categorySlug}' AND c.status = '1'
//                 GROUP BY c.ID, c.company_name 
//                 ORDER BY c.created_date DESC 
//                 LIMIT 20`;

//     const result = await query(sql);
//     if (result.length > 0) {
//       return result;
//     } else {
//       return [];
//     }

//   } else if (filterValue == 'trending') {
//     const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.  rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img
//                 FROM category  
//                 JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
//                 LEFT JOIN company c ON c.ID = ccr.company_id
//                 LEFT JOIN reviews r ON r.company_id = c.ID
//                 LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
//                 WHERE category.category_slug = '${categorySlug}' AND c.status = '1' AND c.trending = '1'
//                 GROUP BY c.ID, c.company_name `;

//     const result = await query(sql);
//     if (result.length > 0) {
//       return result;
//     } else {
//       return [];
//     }
//   } else {
//     const sql = `SELECT c.ID, c.company_name, c.logo, c.status, c.trending, c.main_address, c.verified, c.paid_status, c.about_company, c.slug , AVG(r.  rating) as comp_avg_rating, COUNT(r.id) as comp_total_reviews, pcd.cover_img
//                 FROM category  
//                 JOIN company_cactgory_relation ccr ON ccr.category_id = category.ID
//                 LEFT JOIN company c ON c.ID = ccr.company_id
//                 LEFT JOIN reviews r ON r.company_id = c.ID
//                 LEFT JOIN premium_company_data pcd ON pcd.company_id = c.ID
//                 WHERE category.category_slug = '${categorySlug}' AND c.status = '1' AND c.verified = '1'
//                 GROUP BY c.ID, c.company_name `;

//     const result = await query(sql);
//     if (result.length > 0) {
//       return result;
//     } else {
//       return [];
//     }
//   }




// }

// Function to fetch Company poll details
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

//Function to insert Invitation data into review_invite_request
async function insertInvitationDetails(req) {
  //console.log('insertInvitationDetails',req)
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

//Function to send Invitation email 
async function sendInvitationEmail(req) {
  //console.log('sendInvitationEmail',req)
  const { emails, email_body, user_id, company_id, company_name, company_slug } = req;
  if (emails.length > 0) {
    await emails.forEach((email) => {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: email,
        subject: 'Review Invitation Email',
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Review Invitation Email</h1>
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
                                    <p style="font-size:15px; line-height:20px">Please <a href="${process.env.MAIN_URL}company/${company_slug}?type=invitation">click here</a> to submit your opinion.</p>
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

//Function to count invitation label on current month 
async function countInvitationLabels(typeEnum, company_id) {
  const sql = `SELECT labels, COUNT(*) AS label_count
  FROM reviews
  WHERE 
      MONTH(created_at) = MONTH(CURRENT_DATE())
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
      AND labels = '${typeEnum}'
      AND company_id = '${company_id}'
      GROUP BY labels;
  `;
  const result = await query(sql);
  if (result.length > 0) {
    return result;
  } else {
    return [];
  }

}

//Function to add Flag details to the review table
async function addFlagDetails(req) {
  //console.log(req)
  try {
    if (req) {
      const currentDate = new Date();
      // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
      const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

      const update_flag_query = 'UPDATE reviews SET  flag_status = ?, flag_company_reason_radio = ? , flag_company_reason_details = ?  WHERE id  = ? ';

      const update_flag_values = [
        '2',
        req.flag_radio,
        req.flag_details || null,
        req.review_id
      ];
      const update_flag_result = await query(update_flag_query, update_flag_values);

      return true;
    } else {
      return false;
    }
  } catch (error) {
    return 'Error during user update_flag_query:' + error;
  }
}

//Function to send email to admin for add Flag details to the company user
async function sendFlagEmail(req) {
  //console.log(req)
  try {
    if (req) {
      const currentDate = new Date();
      // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
      const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

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
                                   <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Flag Raised</h1>
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
                                            <p style="font-size:15px; line-height:20px">A company user raised flag against a review. <a class="btn btn-primary" href="${process.env.MAIN_URL}edit-review/${req.review_id}">Click here </a>to check this review.</p>
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
        subject: 'Flag raised',
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

      return true;
    } else {
      return false;
    }
  } catch (error) {
    return 'Error during user update_flag_query:' + error;
  }
}

async function getAllFlaggedReviews() {
  const all_review_query = `
    SELECT r.*, c.company_name, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic, rr.status as reply_status
      FROM reviews r
      JOIN company c ON r.company_id = c.ID
      JOIN company_location cl ON r.company_location_id = cl.ID
      JOIN users u ON r.customer_id = u.user_id
      LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
      LEFT JOIN review_reply rr ON rr.review_id = r.id AND rr.reply_by = r.customer_id
      WHERE r.flag_status = '2' OR r.flag_status = '1' OR r.flag_status = '0'
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

//Function to add super admin Flag details to the review table
async function updateFlagDetails(req) {
  //console.log(req)
  try {
    if (req) {
      const currentDate = new Date();
      // Format the date in 'YYYY-MM-DD HH:mm:ss' format (adjust the format as needed)
      const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

      const update_flag_query = 'UPDATE reviews SET  flag_status = ?, flag_admin_reason = ?   WHERE id  = ? ';

      const update_flag_values = [
        req.flag_status,
        req.flag_admin_reason,
        req.review_id
      ];
      const update_flag_result = await query(update_flag_query, update_flag_values);

      return true;
    } else {
      return false;
    }
  } catch (error) {
    return 'Error during admin update_flag_query:' + error;
  }
}
//Function to send mail to company user after approve the flag
async function flagApprovedEmail(req) {
  //console.log(req);

  const sql = `
    SELECT r.created_at, r.company_id, r.review_content, c.company_name, c.slug, u.first_name, u.email, claimed_user.email claimed_user_email, claimed_user.first_name claimed_user_name
    FROM reviews r
    LEFT JOIN company c ON r.company_id = c.ID 
    LEFT JOIN users u ON r.customer_id = u.user_id 
    LEFT JOIN company_claim_request ccr ON ccr.company_id = c.ID 
    LEFT JOIN users claimed_user ON ccr.claimed_by = claimed_user.user_id 
    WHERE r.flag_status = "1" AND r.id = "${req.review_id}"
`;

  const approveReviewData = await query(sql);


  if (approveReviewData.length > 0) {
    const dateString = approveReviewData[0].created_at;
    const date = new Date(dateString);
    const reviewDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })

    //console.log('approve Function', reviewData)
    var mailOptions = {
      from: process.env.MAIL_USER,
      //to: 'pranab@scwebtech.com',
      to: approveReviewData[0].claimed_user_email,
      subject: 'Flag Approval Email',
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
                     <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                      <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                         <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Flag Approval Email</h1>
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
                                  <strong>Hello ${approveReviewData[0].claimed_user_name},</strong>
                                  <p style="font-size:15px; line-height:20px">Your flag against the review <i><b>"${approveReviewData[0].review_content} " </b></i> has been approved. Now the review has been removed from <a  href="${process.env.MAIN_URL}">our website</a> .</p>
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
          message: 'Flag Approve'
        });
      }
    })


  }

  return true;
}

//Function to send mail to comapny user after reject the flag
async function flagRejectdEmail(req) {
  const sql = `
  SELECT r.created_at, r.company_id, r.review_content, c.company_name, c.slug, u.first_name, u.email, claimed_user.email claimed_user_email, claimed_user.first_name claimed_user_name
  FROM reviews r
  LEFT JOIN company c ON r.company_id = c.ID 
  LEFT JOIN users u ON r.customer_id = u.user_id 
  LEFT JOIN company_claim_request ccr ON ccr.company_id = c.ID 
  LEFT JOIN users claimed_user ON ccr.claimed_by = claimed_user.user_id 
  WHERE r.flag_status = "0" AND r.id = "${req.review_id}"
`;

  const rejectReviewData = await query(sql);

  console.log(rejectReviewData[0])
  if (rejectReviewData.length > 0) {

    const dateString = rejectReviewData[0].created_at;
    const date = new Date(dateString);
    const reviewDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })

    //console.log('approve Function', reviewData)
    var mailOptions = {
      from: process.env.MAIL_USER,
      //to: 'pranab@scwebtech.com',
      to: rejectReviewData[0].claimed_user_email,
      subject: 'Flag Rejected Email',
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
                         <h1 style="color: red; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Flag Rejected Email</h1>
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
                                  <strong>Hello ${rejectReviewData[0].claimed_user_name},</strong>
                                  <p style="font-size:15px; line-height:20px">Your flag for <i><b>"${rejectReviewData[0].review_content} "</b></i> was unfortunately rejected because of the following reason:</p>
                                   <p style="font-size:15px; line-height:25px;">${req.flag_admin_reason}.</p>
                                   <small>For further details contact us at : <a href="mailto:${process.env.MAIL_SUPPORT}"><i>${process.env.MAIL_SUPPORT}</i></a></small>
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
     </div> `
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
          message: 'Review Rejected'
        });
      }
    })
  }

  return true;
}

//Function to get all review by company id from  reviews table
async function getAllReviewsByCompanyID(companyId) {
  const all_review_query = `
  SELECT r.*, c.company_name, c.slug, c.logo, c.status as company_status, c.verified as verified_status, cl.address, cl.country, cl.state, cl.city, cl.zip, u.first_name, u.last_name, ucm.profile_pic, count(rr.ID) as reply_count
  FROM reviews r
  JOIN company c ON r.company_id = c.ID
  JOIN company_location cl ON r.company_location_id = cl.ID
  JOIN users u ON r.customer_id = u.user_id
  LEFT JOIN user_customer_meta ucm ON u.user_id = ucm.user_id
  LEFT JOIN review_reply rr ON r.id = rr.review_id
  WHERE r.company_id = ? AND r.review_status = '1' 
  GROUP BY r.id
  ORDER BY r.created_at DESC;
  `;
  try {
    const all_review_results = await query(all_review_query, companyId);
    return all_review_results;
  }
  catch (error) {
    console.error('Error during all_review_query:', error);
  }
}

//Function to get latest discussion from discussions table
// async function getAllLatestDiscussion(limit,country) {
//   const sql = `
//     SELECT
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
//     WHERE comment_status = 1
//     GROUP BY discussion_id
//   ) comments ON discussions.id = comments.discussion_id
//   LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_views
//     FROM discussions_user_view
//     GROUP BY discussion_id
//   ) views ON discussions.id = views.discussion_id
//   WHERE discussions.discussion_status = 1 AND (discussions.location = "${country}" OR discussions.location = "Worldwide")
//   ORDER BY discussions.id DESC
//   LIMIT ${limit} ;
//   `;
//   try {
//     const results = await query(sql);
//     if (results.length > 0) {

//       return results;
//     } else {
//       return [];
//     }
//   }
//   catch (error) {
//     console.error('Error during fetch All Latest Discussion:', error);
//   }
// }

//ac
async function getAllLatestDiscussion(limit, country) {
  console.log("getAllLatestDiscussioncountry",country);
  let sql = `
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
      WHERE comment_status = 1
      GROUP BY discussion_id
    ) comments ON discussions.id = comments.discussion_id
    LEFT JOIN (
      SELECT discussion_id, COUNT(*) as total_views
      FROM discussions_user_view
      GROUP BY discussion_id
    ) views ON discussions.id = views.discussion_id
    WHERE discussions.discussion_status = 1
  `;

  if (country && country !== 'Worldwide') {
    sql += ` AND discussions.location = "${country}"`;
  }

  sql += `
    ORDER BY discussions.id DESC
    LIMIT ${limit};
  `;

  try {
    const results = await query(sql);
    return results.length > 0 ? results : [];
  } catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
    return [];
  }
}



// async function getAllLatestDiscussion(limit) {
//   let sql = `
//     SELECT
//       discussions.*,
//       u.first_name,
//       u.last_name,
//       COALESCE(comments.total_comments, 0) as total_comments,
//       COALESCE(views.total_views, 0) as total_views
//     FROM discussions
//     LEFT JOIN users u ON discussions.user_id = u.user_id
//     LEFT JOIN (
//       SELECT discussion_id, COUNT(*) as total_comments
//       FROM discussions_user_response
//       WHERE comment_status = 1
//       GROUP BY discussion_id
//     ) comments ON discussions.id = comments.discussion_id
//     LEFT JOIN (
//       SELECT discussion_id, COUNT(*) as total_views
//       FROM discussions_user_view
//       GROUP BY discussion_id
//     ) views ON discussions.id = views.discussion_id
//     WHERE discussions.discussion_status = 1
//   `;

//   sql += `
//     ORDER BY discussions.id DESC
//     LIMIT ${limit};
//   `;

//   try {
//     const results = await query(sql);
//     return results.length > 0 ? results : [];
//   } catch (error) {
//     console.error('Error during fetch All Latest Discussion:', error);
//     return [];
//   }
// }


//Function to get popular discussion from discussions table
// async function getAllPopularDiscussion(country) {
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
//   WHERE discussions.discussion_status = 1 AND (discussions.location = "${country}" OR discussions.location = "Worldwide")
//   ORDER BY total_comments DESC;
//   ;
//   `;
//   try {
//     const results = await query(sql);
//     if (results.length > 0) {

//       return results;
//     } else {
//       return [];
//     }
//   }
//   catch (error) {
//     console.error('Error during fetch  Latest Discussion:', error);
//   }
// }

async function getAllPopularDiscussion(country) {
  // const sql = `
  // SELECT
  //   discussions.*,
  //   u.first_name,
  //   u.last_name,
  //   COALESCE(comments.total_comments, 0) as total_comments,
  //   COALESCE(views.total_views, 0) as total_views
  // FROM discussions
  // LEFT JOIN users u ON discussions.user_id = u.user_id
  // LEFT JOIN (
  //   SELECT discussion_id, COUNT(*) as total_comments
  //   FROM discussions_user_response
  //   GROUP BY discussion_id
  // ) comments ON discussions.id = comments.discussion_id
  // LEFT JOIN (
  //   SELECT discussion_id, COUNT(*) as total_views
  //   FROM discussions_user_view
  //   GROUP BY discussion_id
  // ) views ON discussions.id = views.discussion_id
  // WHERE discussions.discussion_status = 1
  // ORDER BY total_comments DESC;
  // ;
  // `;

  let sql = `
  SELECT
    discussions.*,
    u.first_name,
    u.last_name,
    COALESCE(comments.total_comments, 0) as total_comments,
    COALESCE(views.total_views, 0) as total_views,
    discussions.location
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
  WHERE discussions.discussion_status = 1
  `;

  if (country && country !== 'Worldwide') {
    sql += ` AND discussions.location = "${country}"`;
  }

  sql += ' ORDER BY total_comments DESC;';


  try {
    const results = await query(sql);
    if (results.length > 0) {

      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch  Latest Discussion:', error);
  }
}

//Function to get viewed discussion from discussions table
async function getAllViewedDiscussion(country) {
  let sql = `
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
    WHERE comment_status = 1
    GROUP BY discussion_id
  ) comments ON discussions.id = comments.discussion_id
  LEFT JOIN (
    SELECT discussion_id, COUNT(*) as total_views
    FROM discussions_user_view
    GROUP BY discussion_id
  ) views ON discussions.id = views.discussion_id
  WHERE discussions.discussion_status = 1
  `;
  

  if (country) {
    sql += ` AND (discussions.location = "${country}" OR discussions.location = "Worldwide")`;
  }
  
  sql += ' ORDER BY total_views DESC;';
  
  
  try {
    const results = await query(sql);
    if (results.length > 0) {

      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch All viewed discussion Discussion:', error);
  }
}

// async function getAllViewedDiscussion() {
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
//     WHERE comment_status = 1
//     GROUP BY discussion_id
//   ) comments ON discussions.id = comments.discussion_id
//   LEFT JOIN (
//     SELECT discussion_id, COUNT(*) as total_views
//     FROM discussions_user_view
//     GROUP BY discussion_id
//   ) views ON discussions.id = views.discussion_id
//   WHERE discussions.discussion_status = 1
//   ORDER BY total_views DESC;
//   ;
//   `;
//   try {
//     const results = await query(sql);
//     if (results.length > 0) {

//       return results;
//     } else {
//       return [];
//     }
//   }
//   catch (error) {
//     console.error('Error during fetch All viewed discussion Discussion:', error);
//   }
// }

//Function to get latest discussion from discussions table
async function getAllDiscussions() {
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
  ORDER BY discussions.id DESC
  `;
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
//get all discussions when discussion_status =1 
async function getAllDiscussion(country) {

let sql = `
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
WHERE discussions.discussion_status = 1
`;

if (country) {
  sql += ` AND (discussions.location = "${country}" OR discussions.location = "Worldwide")`;
}

sql += ' ORDER BY discussions.id DESC;';


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

// async function getAllDiscussion() {
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
//   WHERE discussions.discussion_status = 1
//   ORDER BY discussions.id DESC
//   `;
//   try {
//     const results = await query(sql);
//     if (results.length > 0) {

//       return results;
//     } else {
//       return [];
//     }
//   }
//   catch (error) {
//     console.error('Error during fetch All Latest Discussion:', error);
//   }
// }


//Function to insert discussion response in discussions_user_response table
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

async function insertDiscussionResponse(discussion_id, IP_address) {
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
  const data = {
    discussion_id: discussion_id,
    ip_address: IP_address,
  };
  const checkQuery = `SELECT * FROM discussions_user_view WHERE discussion_id = '${discussion_id}'  AND ip_address = '${IP_address}'`;
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



//Function to get all comment by discussion from discussions and discussions_user_response table
async function getAllCommentByDiscusId(discussions_id) {
  const sql = `
  SELECT discussions.*, u.first_name, u.last_name 
  FROM discussions 
  LEFT JOIN users u ON discussions.user_id = u.user_id 
  WHERE discussions.id = ${discussions_id};
  `;
  const commentQuery = `SELECT discussions_user_response.*, u.first_name comment_first_name, u.last_name comment_last_name, ucm.profile_pic
  FROM discussions_user_response 
  LEFT JOIN users u ON discussions_user_response.user_id = u.user_id 
  LEFT JOIN user_customer_meta ucm ON discussions_user_response.user_id = ucm.user_id 
  WHERE discussions_user_response.discussion_id = ${discussions_id} AND discussions_user_response.comment_status ='1'
  ORDER BY created_at DESC;`
  try {
    const results = await query(sql);

    console.log("results",results);
    const commentResult = await query(commentQuery);
    const cmntData = JSON.stringify(commentResult);
    results[0].commentData = cmntData;
    //console.log('alldata',results)

    console.log("commentResult",commentResult);

    return results;
  }
  catch (error) {
    console.error('Error during fetching getAllCommentByDiscusId:', error);
  }
}



async function searchDiscussion(keyword) {
  const get_company_query = `
    SELECT id , topic FROM discussions
    WHERE topic LIKE '%${keyword}%' 
    ORDER BY id DESC
  `;
  try {
    const get_company_results = await query(get_company_query);
    if (get_company_results.length > 0) {
      //console.log(get_company_results);
      return { status: 'ok', data: get_company_results, message: ' Discussion data recived' };
    } else {
      return { status: 'ok', data: '', message: 'No Discussion data found' };
    }
  } catch (error) {
    return { status: 'err', data: '', message: 'No Discussion data found' };
  }
}

//Function to get user discussions from discussions table
async function getDiscussionsByUserId(userId) {
  const sql = `
  SELECT discussions.*,  COUNT(dur.id) as total_comments , COUNT(duv.id) as total_views 
  FROM discussions 
  LEFT JOIN discussions_user_response dur ON discussions.id = dur.discussion_id 
  LEFT JOIN discussions_user_view duv ON discussions.id = duv.discussion_id 
  WHERE discussions.user_id = ${userId}
  GROUP BY discussions.id
  ORDER BY discussions.id DESC
  `;
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

//Function to get company complaint_category from complaint_category table
async function getCompanyCategories(companyId) {
  const sql = `
  SELECT * FROM complaint_category WHERE company_id = '${companyId}'
  `;
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

//Function to get  getComplaintLevelDetails from complaint_level_management table
async function getComplaintLevelDetails(companyId) {
  const sql = `
  SELECT * FROM complaint_level_management WHERE company_id  = '${companyId}'
  `;
  try {
    const results = await query(sql);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch All complaint level details: ', error);

  }
}

//Function to get All Complaints By CompanyId from complaint table
async function getAllComplaintsByCompanyId(companyId) {
  const sql = `
  SELECT 
  complaint.*,
  c.company_name, 
  cc.category_name, 
  subcat.category_name AS sub_category_name,
  GROUP_CONCAT(cqr.notification_status) AS notification_statuses,
  GROUP_CONCAT(cqr.query) AS company_query,
  GROUP_CONCAT(cqr.response) AS user_response
  FROM complaint
  LEFT JOIN complaint_category cc ON complaint.category_id = cc.id
  LEFT JOIN complaint_category subcat ON complaint.sub_cat_id = subcat.id
  LEFT JOIN company c ON complaint.company_id = c.ID
  LEFT JOIN complaint_query_response cqr ON complaint.id = cqr.complaint_id
  WHERE complaint.company_id = '${companyId}'
  GROUP BY complaint.id
  ORDER BY complaint.id DESC;
  `;

  try {
    const results = await query(sql);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

async function getuserslistofcompanycategory(companyId) {
  const sql = `
  SELECT DISTINCT
  complaint_level_management.emails,
  complaint_level_management.level,
  complaint_level_management.category_id
  FROM 
    complaint_level_management
  WHERE complaint_level_management.company_id = "${companyId}"
  `;

  try {
    const results = await query(sql);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

async function getuserslistofescalatecategory(companyId,category_id) {
  const sql = `
  SELECT DISTINCT
  complaint_level_management.emails,
  complaint_level_management.level,
  complaint_level_management.category_id
  FROM 
    complaint_level_management
  WHERE complaint_level_management.company_id = "${companyId}" AND category_id = "${category_id}"
  `;

  try {
    const results = await query(sql);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

//Function to get Complaints By ComplaintId from complaint table
async function getAllComplaintsByComplaintId(ComplaintId) {
  const sql = `
  SELECT complaint.*,c.company_name,c.slug, cc.category_name, subcat.category_name AS sub_category_name, cr.rating user_complaint_rating, clm.eta_days 
  FROM complaint 
  LEFT JOIN complaint_category cc ON complaint.category_id = cc.id 
  LEFT JOIN complaint_category subcat ON complaint.sub_cat_id = subcat.id 
  LEFT JOIN company c ON complaint.company_id = c.ID 
  LEFT JOIN complaint_rating cr ON complaint.id = cr.complaint_id 
  LEFT JOIN complaint_level_management clm ON complaint.level_id = clm.level AND complaint.company_id = clm.company_id
  WHERE complaint.id  = '${ComplaintId}'
  ORDER BY complaint.id DESC
  `;

  const commentQuery = `SELECT *
  FROM complaint_query_response 
  WHERE complaint_id = '${ComplaintId}'
  ORDER BY id;`;

  try {
    const results = await query(sql);
    const commentResult = await query(commentQuery);
    //const cmntData = JSON.stringify(commentResult);
    results[0].queryResponseData = commentResult;
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

async function getAllComplaintsByCompanyuserId(companyId,usermail) {
  const sql = `
  SELECT 
  complaint.*,
  c.company_name, 
  cc.category_name, 
  subcat.category_name AS sub_category_name,
  GROUP_CONCAT(cqr.notification_status) AS notification_statuses,
  GROUP_CONCAT(cqr.query) AS company_query,
  GROUP_CONCAT(cqr.response) AS user_response
  FROM complaint
  LEFT JOIN complaint_category cc ON complaint.category_id = cc.id
  LEFT JOIN complaint_category subcat ON complaint.sub_cat_id = subcat.id
  LEFT JOIN company c ON complaint.company_id = c.ID
  LEFT JOIN complaint_query_response cqr ON complaint.id = cqr.complaint_id
  LEFT JOIN complaint_assigned_users ON complaint.id = complaint_assigned_users.complaint_id
  WHERE complaint.company_id = '${companyId}' AND complaint_assigned_users.user_email='${usermail}' 
  GROUP BY complaint.id
  ORDER BY complaint.id DESC;
  `;

  try {
    const results = await query(sql);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

//Function to get All Complaints By userID from complaint table
async function getAllComplaintsByUserId(user_id) {
  const sql = `
  SELECT 
  complaint.*,
  c.company_name, 
  cc.category_name, 
  subcat.category_name AS sub_category_name,
  GROUP_CONCAT(cqr.notification_status) AS notification_statuses,
  GROUP_CONCAT(cqr.query) AS company_query,
  GROUP_CONCAT(cqr.response) AS user_response
  FROM complaint
  LEFT JOIN complaint_category cc ON complaint.category_id = cc.id
  LEFT JOIN complaint_category subcat ON complaint.sub_cat_id = subcat.id
  LEFT JOIN company c ON complaint.company_id = c.ID
  LEFT JOIN complaint_query_response cqr ON complaint.id = cqr.complaint_id
  WHERE complaint.user_id = '${user_id}'
  GROUP BY complaint.id
  ORDER BY complaint.id DESC;

  `;

  try {
    const results = await query(sql);
    if (results.length > 0) {
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

//Function to update complaint status to complaint table
async function updateComplaintStatus(complaint_id, status) {

  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  const sql = `
  UPDATE complaint SET status='${status}', reopen_date = '${formattedDate}', level_id = '1', level_update_at = '${formattedDate}',assigned_status = '0', reopen_message= "${message}" WHERE id = '${complaint_id}'
  `;
  
  const deleteAssignedUsersSql = `DELETE FROM complaint_assigned_users WHERE complaint_id = ?`;//new

  try {
    const assignuservalue= await query(deleteAssignedUsersSql, [complaint_id]);
    const results = await query(sql);
    var history_details = `The complaint ${complaint_id} has reopend on "${formattedDate}".`
    //console.log("history_details",history_details);
    const updatequery = `INSERT INTO complaint_history SET history_details =?,complaint_id=?,created_at=?`;
    const updatevalue = await query(updatequery,[history_details,complaint_id,formattedDate]);
    return true;
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}
async function updateresolveComplaintStatus(complaint_id, status) {

  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  const sql = `
  UPDATE complaint SET status='${status}' WHERE id = '${complaint_id}'
  `;
  
  //const deleteAssignedUsersSql = `DELETE FROM complaint_assigned_users WHERE complaint_id = ?`;//new

  try {
    //const assignuservalue= await query(deleteAssignedUsersSql, [complaint_id]);
    const results = await query(sql);
    var history_details = `The complaint ${complaint_id} has resolved on "${formattedDate}".`
    //console.log("history_details",history_details);
    const updatequery = `INSERT INTO complaint_history SET history_details =?,complaint_id=?,created_at=?`;
    const updatevalue = await query(updatequery,[history_details,complaint_id,formattedDate]);
    return true;
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

//Function to update complaint notification status to complaint_query_response table
async function updateUserNotificationStatus(complaint_id) {
  const sql = `
  UPDATE complaint_query_response SET notification_status='1' WHERE complaint_id = '${complaint_id}' AND response = ''
  `;

  try {
    const results = await query(sql);
    return true;
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

//Function to update complaint notification status to complaint_query_response table
async function updateCompanyrNotificationStatus(complaint_id) {
  const sql = `
  UPDATE complaint_query_response SET notification_status='1' WHERE complaint_id = '${complaint_id}' AND query = ''
  `;

  try {
    const results = await query(sql);
    return true;
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

//Function send email to company by companyId 
async function complaintEmailToCompany(companyId, tokenId, insertId) {
  const sql = `
  SELECT users.email, users.first_name, c.slug
  FROM users 
  LEFT JOIN company_claim_request ccr ON ccr.claimed_by = users.user_id 
  LEFT JOIN company c ON c.ID = ccr.company_id
  WHERE ccr.company_id = '${companyId}'
  `;
  try {
    const results = await query(sql);
    if (results.length > 0) {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: results[0].email,
        subject: 'New Complaint Email',
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">New Complaint Email</h1>
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
                                    <strong>Hello ${results[0].first_name},</strong>
                                    <p style="font-size:15px; line-height:20px">A customer register a complaint to your company. It's Token Id is: <a  href="${process.env.MAIN_URL}company-compnaint-details/${results[0].slug}/${insertId}">${tokenId}</a>. 
                                    </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send: ', info.response);

        }
      })
    } else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

//Function send success complaint email to user by userID 
async function complaintSuccessEmailToUser(userId, tokenId, insertId, formattedDates) {
  console.log("complaintSuccessEmailToUserformattedDates",formattedDates);
  
  const sql = `
  SELECT users.email, users.first_name  
  FROM users 
  WHERE users.user_id = '${userId}'
  `;
  try {
    const results = await query(sql);
    if (results.length > 0) {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: results[0].email,
        subject: 'Complaint Registration',
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Complaint registration</h1>
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
                                    <strong>Dear Sir/Madam,</strong>
                                    <p style="font-size:15px; line-height:20px">This is to confirm that a Complaint has been registered by you with ticket id: <a  href="${process.env.MAIN_URL}user-compnaint-details/${insertId}">${tokenId}</a> on ${formattedDates}. It is now pending for resolution.
                                    </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send to user: ', info.response);

        }
      })
    } else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

async function complaintEmailToCompanylevelUsers(companyId, tokenId, insertId) {
  //console.log("companyIdss",companyId);
  // const sql = `
  // SELECT users.email, users.first_name, c.slug,c.manger_email,c.help_desk_email
  // FROM users 
  // LEFT JOIN company_level_manage_users ccr ON ccr.emails = users.email 
  // LEFT JOIN company c ON c.ID = ccr.company_id
  // WHERE ccr.company_id = '${companyId}'
  // `;
  const sql = `
  SELECT slug,manger_email,help_desk_email FROM company WHERE ID = ?;`
  try {
    const results = await query(sql,[companyId]);
    //console.log("SQL Query Results:", results);

    if(results.length>0){
      
    var manger_email = results[0].manger_email;
    console.log("manger_email",manger_email);

    var help_desk_email = results[0].help_desk_email;
    console.log("help_desk_email",help_desk_email);

    // console.log("manger_email",results[0].manger_email);
    // console.log("help_desk_email",results[0].help_desk_email);

    const managerquery = `SELECT first_name,last_name FROM users WHERE email = ?`;
    const managervalue = await query(managerquery,[manger_email]);
    console.log("managervalue",managervalue);

    if (managervalue.length === 0) {
      console.error("No user found with the given email:", manger_email);
  } else {
      var manager_first_name = managervalue[0].first_name;
      var manager_last_name = managervalue[0].last_name;
      console.log("Manager's First Name:", manager_first_name);
      console.log("Manager's Last Name:", manager_last_name);
    }
    // var manager_first_name = managervalue[0].first_name;
    // var manager_last_name = managervalue[0].last_name;

    const helpdeskquery = `SELECT first_name,last_name FROM users WHERE email = ?`;
    const helpdeskvalue = await query(helpdeskquery,[manger_email]);

    if (helpdeskvalue.length === 0) {
      console.error("No user found with the given email:", manger_email);
  } else {
    var helpdesk_first_name = helpdeskvalue[0].first_name;
    var helpdesk_last_name = helpdeskvalue[0].last_name;
      console.log("helpdesk_first_name", manager_first_name);
      console.log("Manager's Last Name:", manager_last_name);
    }

    
    // var helpdesk_first_name = helpdeskvalue[0].first_name;
    // var helpdesk_last_name = helpdeskvalue[0].last_name;

      if(help_desk_email.length> 0){
        console.log(("help_desk_emailsss"));
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: help_desk_email,
        //to: toEmails.join(', '),
        subject: 'New Complaint Email',
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
                     <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                      <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                         <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">New Complaint Email</h1>
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
                                  <strong>Hello ${helpdesk_first_name} ${helpdesk_last_name},</strong>
                                  <p style="font-size:15px; line-height:20px">A customer has registered a complaint to your company. It's Token Id is: <a  href="${process.env.MAIN_URL}company-compnaint-details/${results[0].slug}/${insertId}">${tokenId}</a>. 
                                  </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log("mail sending to level management users.");
          console.log('Mail Send: ', info.response);

        }
      })
    }
    if(manger_email.length> 0){
      console.log("manger_emailsss");
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: manger_email,
        //to: toEmails.join(', '),
        subject: 'New Complaint Email',
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
                     <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                      <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                         <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">New Complaint Email</h1>
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
                                  <strong>Hello ${manager_first_name} ${manager_last_name},</strong>
                                  <p style="font-size:15px; line-height:20px">A customer has registered a complaint to your company. It's Token Id is: <a  href="${process.env.MAIN_URL}company-compnaint-details/${results[0].slug}/${insertId}">${tokenId}</a>. 
                                  </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log("mail sending to level management users.");
          console.log('Mail Send: ', info.response);

        }
      })
    }
    } else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during sedning mail to level users:', error);
  }
}

/////new

async function getcomplaintHistory(complaint_id) {
  const sql = `
    SELECT history_details FROM complaint_history WHERE complaint_id = ?
  `;
  try {
    const results = await query(sql, [complaint_id]);
    if (results && results.length > 0) {
      console.log("complaintHistoryresults", results);
      return results;
    } else {
      console.log("No complaint history found for complaint_id:", complaint_id);
      return [];
    }
  } catch (error) {
    console.error('Error during fetch all complaint details: ', error);
    throw error;
  }
}
//resolved complaint 
async function getresolvedcomplaints() {
  const sql = `
  SELECT *
  FROM 
  complaint
  WHERE status = ?
  `;

  try {
    var currentDate = new Date();
    var formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const results = await query(sql,['1']);
    //console.log("resulttssss",results);
    if (results.length > 0) {
      for (const result of results) {
    var complaint_id = result.id;
    //console.log("complaint_idDD",complaint_id);
    var company_id = result.company_id;
    //console.log("company_id",company_id);
    var history_details = `The complaint ${complaint_id} has resolved.`
    //console.log("history_details",history_details);
    const updatequery = `INSERT INTO complaint_history SET history_details =?,complaint_id=?,created_at=?`;
    const updatevalue = await query(updatequery,[history_details,complaint_id,formattedDate]);
    //console.log("updatevalue",updatevalue[0]);
  }
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}
async function getreopencomplaints() {
  const sql = `
  SELECT *
  FROM 
  complaint
  WHERE status = ?
  `;

  try {
    var currentDate = new Date();
    var formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    const results = await query(sql,['0']);
    //console.log("resulttssss",results);
    if (results.length > 0) {
      for (const result of results) {
    var complaint_id = result.id;
    //console.log("complaint_idDD",complaint_id);
    var company_id = result.company_id;
    //console.log("company_id",company_id);
    var history_details = `The complaint ${complaint_id} has resolved.`
    //console.log("history_details",history_details);
    const updatequery = `INSERT INTO complaint_history SET history_details =?,complaint_id=?,created_at=?`;
    const updatevalue = await query(updatequery,[history_details,complaint_id,formattedDate]);
    //console.log("updatevalue",updatevalue[0]);
  }
      return results;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}
//
async function getlevelusersres(email){
  const sql = `
  SELECT *
  FROM 
  complaint_level_management
  WHERE emails = ?
  `;

  try {
  const sql_value = await query(sql,[email]);
  console.log("sql_value",sql_value);
  if(sql_value.length> 0){
      return sql_value;
    } else {
      return [];
    }
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}



//Function send Company Response Email email to customer by complaint_id 
async function complaintCompanyResponseEmail(complaint_id) {
  const sql = `
  SELECT u.email, u.first_name, c.company_name  
  FROM complaint 
  LEFT JOIN users u ON complaint.user_id = u.user_id 
  LEFT JOIN company c ON complaint.company_id = c.ID 
  WHERE complaint.id  = '${complaint_id}'
  `;
  try {
    const results = await query(sql);
    if (results.length > 0) {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: results[0].email,
        subject: `Email response from ${results[0].company_name}`,
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Email response from ${results[0].company_name}</h1>
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
                                    <strong>Hello ${results[0].first_name},</strong>
                                    <p style="font-size:15px; line-height:20px">${results[0].company_name} has responded on your complaint. <a  href="${process.env.MAIN_URL}user-compnaint-details/${complaint_id}">Click here</a> to view detaiis.
                                    </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send: ', info.response);

        }
      })
    } else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

//Function send User Response Email  to company by complaint_id 
async function complaintUserResponseEmail(complaint_id,fullName,maskedTicketId,dateOnly) {
  const sql = `
  SELECT users.email, users.first_name, c.slug, complaint.ticket_id
  FROM users 
  LEFT JOIN company_claim_request ccr ON ccr.claimed_by = users.user_id 
  LEFT JOIN company c ON c.ID = ccr.company_id
  LEFT JOIN complaint ON c.ID = complaint.company_id
  WHERE complaint.id = '${complaint_id}'

  `;
  try {
    const results = await query(sql);
    if (results.length > 0) {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'dev2.scwt@gmail.com',
        to: results[0].email,
        //subject: `Email response from customer`,
        subject: `Email response from ${fullName}`,
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
                       <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                        <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Email response from ${fullName} </h1>
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
                                    <strong>Dear Sir/Madam,</strong>
                                    <p style="font-size:15px; line-height:20px">This is to confirm that "${fullName}" has responded to the Complaint registered with ticket id: "${maskedTicketId}" on "${dateOnly}". <a href="${process.env.MAIN_URL}company-compnaint-details/${results[0].slug}/${complaint_id}">Click here</a> to view datails.
                                    </p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2">
                                      <p style="font-size:15px; line-height:20px; margin-top: 10px;">
                                        Thanks,
                                      </p>
                                      <p style="font-size:15px; line-height:20px; margin-top: 0;">
                                        Admin Desk
                                      </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send dev2.scwt@gmail.com: ', info.response);

        }
      })
    } else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

async function updateresolveComplaintStatus(complaint_id, status) {

  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  const sql = `
  UPDATE complaint SET status='${status}' WHERE id = '${complaint_id}'
  `;
  
  //const deleteAssignedUsersSql = `DELETE FROM complaint_assigned_users WHERE complaint_id = ?`;//new

  try {
    //const assignuservalue= await query(deleteAssignedUsersSql, [complaint_id]);
    const results = await query(sql);
    var history_details = `The complaint ${complaint_id} has resolved on "${formattedDate}".`
    //console.log("history_details",history_details);
    const updatequery = `INSERT INTO complaint_history SET history_details =?,complaint_id=?,created_at=?`;
    const updatevalue = await query(updatequery,[history_details,complaint_id,formattedDate]);
    return true;
  }
  catch (error) {
    console.error('Error during fetch all complaint details: ', error);

  }
}

async function complaintcompanyuserResponseEmail(complaint_id,fullName,maskedTicketId,dateOnly,email_val) {
  const sql = `
  SELECT users.email, users.first_name, c.slug, complaint.ticket_id
  FROM users 
  LEFT JOIN company_claim_request ccr ON ccr.claimed_by = users.user_id 
  LEFT JOIN company c ON c.ID = ccr.company_id
  LEFT JOIN complaint ON c.ID = complaint.company_id
  WHERE complaint.id = '${complaint_id}'

`
  console.log("email_val",email_val);
  
  try {
    const results = await query(sql);
    if (results.length > 0) {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'dev2.scwt@gmail.com',
        to: email_val,
        //subject: `Email response from customer`,
        subject: `Email response from ${fullName}`,
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
                       <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                        <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Email response from ${fullName} </h1>
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
                                    <strong>Dear Sir/Madam,</strong>
                                    <p style="font-size:15px; line-height:20px">This is to confirm that "${fullName}" has responded to the Complaint registered with ticket id: "${maskedTicketId}" on "${dateOnly}". <a href="${process.env.MAIN_URL}user-compnaint-details/${complaint_id}">Click here</a> to view datails.
                                    </p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2">
                                      <p style="font-size:15px; line-height:20px; margin-top: 10px;">
                                        Thanks,
                                      </p>
                                      <p style="font-size:15px; line-height:20px; margin-top: 0;">
                                        Admin Desk
                                      </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send dev2.scwt@gmail.com: ', info.response);

        }
      })
    } 
    else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

//Function send Company Resolved Email  to customer by complaint_id 
async function complaintCompanyResolvedEmail(complaint_id) {
  const sql = `
  SELECT u.email, u.first_name, c.company_name  
  FROM complaint 
  LEFT JOIN users u ON complaint.user_id = u.user_id 
  LEFT JOIN company c ON complaint.company_id = c.ID 
  WHERE complaint.id  = '${complaint_id}'
  `;
  try {
    const results = await query(sql);
    var history_details = `The complaint ${complaint_id} has resolved on "${formattedDate}".`
    //console.log("history_details",history_details);
    const updatequery = `INSERT INTO complaint_history SET history_details =?,complaint_id=?,created_at=?`;
    const updatevalue = await query(updatequery,[history_details,complaint_id,formattedDate]);
    if (results.length > 0) {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: results[0].email,
        subject: 'Complaint Resolved Email',
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Complaint Resolved Email</h1>
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
                                    <strong>Hello ${results[0].first_name},</strong>
                                    <p style="font-size:15px; line-height:20px">${results[0].company_name} has resolved on your complaint. Please <a  href="${process.env.MAIN_URL}user-compnaint-details/${complaint_id}">give us</a> feedback.
                                    </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send: ', info.response);

        }
      })
    } else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

//Function send User Response Email  to company by complaint_id 
async function complaintUserReopenEmail(complaint_id) {
  const sql = `
  SELECT users.email, users.first_name, c.slug, complaint.ticket_id
  FROM users 
  LEFT JOIN company_claim_request ccr ON ccr.claimed_by = users.user_id 
  LEFT JOIN company c ON c.ID = ccr.company_id
  LEFT JOIN complaint ON c.ID = complaint.company_id
  WHERE complaint.id = '${complaint_id}'

  `;
  try {
    const results = await query(sql);
    if (results.length > 0) {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: results[0].email,
        subject: `Complaint reopen email from customer`,
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Complaint reopen email from customer </h1>
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
                                    <strong>Hello ${results[0].first_name},</strong>
                                    <p style="font-size:15px; line-height:20px">Complaint <a href="${process.env.MAIN_URL}company-compnaint-details/${results[0].slug}/${complaint_id}">${results[0].ticket_id}</a> has been reopened by user. Please review and address the issue.
                                    </p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send: ', info.response);

        }
      })
    } else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

//Function send email to company by companyId 
async function complaintScheduleEmail(emailArr, result) {

  try {

    const createdateString = result.created_at;
    const createdate = new Date(createdateString);
    createdate.setHours(0, 0, 0, 0);
    const date2 = new Date();
    date2.setHours(0, 0, 0, 0);
    const daysDiff = Math.round((date2 - createdate) / (1000 * 60 * 60 * 24));
    const daysLeft = result.eta_days - daysDiff;


    var mailOptions = {
      from: process.env.MAIL_USER,
      //to: 'pranab@scwebtech.com',
      to: result.email,
      cc: emailArr,
      subject: 'Schedule Complaint Email',
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Schedule Complaint Email</h1>
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
                                    <p style="font-size:15px; line-height:20px">You have a pending complaint on ticket id: ${result.ticket_id}. Hurry up only ${daysLeft} days left.
                                    </p>
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
        return res.send({
          status: 'not ok',
          message: 'Something went wrong'
        });
      } else {
        console.log('Mail Send: ', info.response);

      }
    })
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

// Fetch all premium Company
function getAllPremiumCompany() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories
      FROM company c
      LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
      LEFT JOIN category cat ON cr.category_id = cat.ID
      WHERE c.status != '3' AND c.membership_type_id >=3 AND c.complaint_status = '1'
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

//Function to send Survey Invitation email 
async function sendSurveyInvitationEmail(req) {
  console.log('sendInvitationEmail', req)
  const { emails, email_body, user_id, company_id, company_name, company_slug, survey_id, unique_id } = req;
  if (emails.length > 0) {
    await emails.forEach((email) => {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: email,
        subject: 'Survey Invitation Email',
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Survey Invitation Email</h1>
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
                                    <p style="font-size:15px; line-height:20px">Please <a href="${process.env.MAIN_URL}${company_slug}/survey/${unique_id}">click here</a> to participate this survey.</p>
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

//Function to send Survey Invitation email 
// async function SurveyInvitationFile(req) {
//   console.log('SurveyInvitationFile',req)
//   //return false;
//   const { emails, email_body, user_id, company_id, company_name, company_slug, unique_id } = req;
//   const currentDate = new Date();
//   const year = currentDate.getFullYear();
//   const month = currentDate.getMonth() + 1; // Months are zero-based (0 = January, 11 = December), so add 1
//   const day = currentDate.getDate();
//   const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;

//   let uniqueIdValue;
//   if (Array.isArray(unique_id)) {
//     uniqueIdValue = unique_id[0];
//   } else {
//     uniqueIdValue = unique_id;
//   }
//   if (emails.length > 0) {
//     emails.forEach(async (email) => {

//       const encryptEmail = await bcrypt.hash(email, 8);
//       const hashedEmail = base64url(encryptEmail);
//       //console.log(hashedEmail);

//       const sql = `INSERT INTO suvey_invitation_details ( company_id, user_id, emails, encrypted_email, share_date, unique_id) VALUES (?, ?, ?, ?, ?, ?)`;
//       const data = [
//         company_id[0],
//         user_id[0],
//         email,
//         hashedEmail,
//         formattedDate,
//         uniqueIdValue
//       ]
//       const connection = await mysql.createConnection({
//         host: process.env.DATABASE_HOST,
//         user: process.env.DATABASE_USER,
//         password: process.env.DATABASE_PASSWORD,
//         database: process.env.DATABASE
//       });

//       var [insertRes] = await connection.query(sql, data);

//       var mailOptions = {
//         from: process.env.MAIL_USER,
//         //to: 'pranab@scwebtech.com',
//         to: email,
//         subject: 'Survey Invitation Email',
//         html: `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
//         <style>
//             body, table, td, p, a, h1, h2, h3, h4, h5, h6, div {
//                 font-family: Calibri, 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif !important;
//             }
//         </style>
//         <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
//         <tbody>
//           <tr>
//           <td align="center" valign="top">
//             <div id="template_header_image"><p style="margin-top: 0;"></p></div>
//             <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
//               <tbody>
//                 <tr>
//                 <td align="center" valign="top">
//                   <!-- Header -->
//                   <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
//                     <tbody>
//                       <tr>
//                       <td><img alt="Logo" src="${process.env.MAIN_URL}front-end/images/cechoes-logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
//                         <td id="header_wrapper" style="padding: 36px 48px; display: block;">
//                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Survey Invitation Email</h1>
//                         </td>
    
//                       </tr>
//                     </tbody>
//                   </table>
//             <!-- End Header -->
//             </td>
//                 </tr>
//                 <tr>
//                 <td align="center" valign="top">
//                   <!-- Body -->
//                   <table id="template_body" border="0" cellpadding="0" cellspacing="0" width="600">
//                     <tbody>
//                       <tr>
//                         <td id="body_content" style="background-color: #fdfdfd;" valign="top">
//                           <!-- Content -->
//                           <table border="0" cellpadding="20" cellspacing="0" width="100%">
//                           <tbody>
//                             <tr>
//                             <td style="padding: 48px;" valign="top">
//                               <div id="body_content_inner" style="color: #737373; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 150%; text-align: left;">
                                
//                                 <table border="0" cellpadding="4" cellspacing="0" width="90%">
//                                   <tr>
//                                     <td colspan="2">
//                                     <p style="font-size:15px; line-height:20px">Dear Sir / Madam,</p>
//                                     </td>
//                                   </tr>
//                                   <tr>
//                                     <td colspan="2">
//                                     <p style="font-size:15px; line-height:20px">${email_body[0]}</p>
//                                     </td>
//                                   </tr>
//                                   <tr>
//                                     <td colspan="2">
//                                     <p style="font-size:15px; line-height:20px">
//                                     “Please <a href="${process.env.MAIN_URL}${company_slug[0]}/survey/${uniqueIdValue}/${hashedEmail}">click on the link</a> to start the survey. Your feedback is important to “${company_name[0]}” and will help us improve our products and services.”
//                                     </p>
//                                     </td>
//                                   </tr>
//                                   <tr>
//                                     <td colspan="2">
//                                     <p style="font-size:15px; line-height:20px">
//                                     Thanking you, </p>
//                                     <p style="font-size:15px; line-height:20px">
//                                     “${company_name[0]}” & Team CEchoesTechnology </p>
//                                     </td>
//                                   </tr>
//                                 </table>
                                
//                               </div>
//                             </td>
//                             </tr>
//                           </tbody>
//                           </table>
//                         <!-- End Content -->
//                         </td>
//                       </tr>
//                     </tbody>
//                   </table>
//                 <!-- End Body -->
//                 </td>
//                 </tr>
//                 <tr>
//                 <td align="center" valign="top">
//                   <!-- Footer -->
//                   <table id="template_footer" border="0" cellpadding="10" cellspacing="0" width="600">
//                     <tbody>
//                     <tr>
//                       <td style="padding: 0; -webkit-border-radius: 6px;" valign="top">
//                       <table border="0" cellpadding="10" cellspacing="0" width="100%">
//                         <tbody>
//                           <tr>
//                             <td colspan="2" id="credit" style="padding: 20px 10px 20px 10px; -webkit-border-radius: 0px; border: 0; color: #fff; font-family: Arial; font-size: 12px; line-height: 125%; text-align: center; background:#000" valign="middle">
//                                 <p>This email was sent from <a style="color:#FCCB06" href="${process.env.MAIN_URL}">CEchoesTechnology</a></p>
//                             </td>
//                           </tr>
//                         </tbody>
//                       </table>
//                       </td>
//                     </tr>
//                     </tbody>
//                   </table>
//                 <!-- End Footer -->
//                 </td>
//                 </tr>
//               </tbody>
//             </table>
//           </td>
//           </tr>
//         </tbody>
//         </table>
//       </div>`
//       }
//       await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
//         if (err) {
//           console.log(err);
//           return false;
//         } else {
//           console.log('Mail Send: ', info.response);

//         }
//       })

//     })
//    // return true;
//     return insertRes
//   }

// }

async function SurveyInvitationFile(req) {
  console.log('SurveyInvitationFile', req);

  const { emails, email_body, user_id, company_id, company_name, company_slug, unique_id } = req;
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;

  let uniqueIdValue;
  if (Array.isArray(unique_id)) {
    uniqueIdValue = unique_id[0];
  } else {
    uniqueIdValue = unique_id;
  }

  if (emails.length === 0) {
    throw new Error('No emails provided');
  }

  const emailPromises = emails.map(async (email) => {
    const encryptEmail = await bcrypt.hash(email, 8);
    const hashedEmail = base64url(encryptEmail);

    
    const deletsqlquery = `DELETE FROM suvey_invitation_details WHERE unique_id="${uniqueIdValue}"`;
    const deletesqlval = await query(deletsqlquery);
    console.log("deletesqlval",deletesqlval);
    
    const sql = `INSERT INTO suvey_invitation_details (company_id, user_id, emails, encrypted_email, share_date, unique_id) VALUES (?, ?, ?, ?, ?, ?)`;
    const data = [
      company_id[0],
      user_id[0],
      email,
      hashedEmail,
      formattedDate,
      uniqueIdValue
    ];

    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE
    });

    const [insertRes] = await connection.query(sql, data);

    // Log the insertId and other details
    console.log("insertRes", insertRes);
    console.log("insertId", insertRes.insertId);

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: 'Survey Invitation Email',
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
                                <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Survey Invitation Email</h1>
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
                                          <p style="font-size:15px; line-height:20px">Dear Sir / Madam,</p>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td colspan="2">
                                          <p style="font-size:15px; line-height:20px">${email_body[0]}</p>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td colspan="2">
                                          <p style="font-size:15px; line-height:20px">
                                          “Please <a href="${process.env.MAIN_URL}${company_slug[0]}/survey/${uniqueIdValue}/${hashedEmail}">click on the link</a> to start the survey. Your feedback is important to “${company_name[0]}” and will help us improve our products and services.”
                                          </p>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td colspan="2">
                                          <p style="font-size:15px; line-height:20px">
                                          Thanking you, </p>
                                          <p style="font-size:15px; line-height:20px">
                                          “${company_name[0]}” & Team CEchoesTechnology </p>
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
      } else {
        console.log('Mail Send: ', info.response);
      }
    });

    return insertRes;
  });

  const results = await Promise.all(emailPromises);

  console.log("surveyresultsss", results);
  console.log("surveyresultsss[0]", results[0]);
  return results;
}




//Function to send Survey Invitation email 
async function SurveyInvitationByArray(req) {
  //console.log('SurveyInvitation',req)
  //return false;
  const { email, email_body, user_id, company_id, company_name, company_slug, unique_id } = req;
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // Months are zero-based (0 = January, 11 = December), so add 1
  const day = currentDate.getDate();
  const formattedDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
  let uniqueIdValue;
  if (Array.isArray(unique_id)) {
    // If it's an array, you might want to choose a specific value from the array or convert it to a string
    uniqueIdValue = unique_id[0]; // Change this according to your requirements
  } else {
    // If it's not an array, use the original value
    uniqueIdValue = unique_id;
  }
  if (email.length > 1) {
    email.forEach(async (email) => {
      if (email != '') {
        const encrypetdEmail = await bcrypt.hashSync(email, 8);
        const hashedEmail = base64url(encrypetdEmail);
        console.log(hashedEmail);

        const deletsqlquery = `DELETE FROM suvey_invitation_details WHERE unique_id="${uniqueIdValue}"`;
        const deletesqlval = await query(deletsqlquery);
        console.log("deletesqlval",deletesqlval);

        const sql = `INSERT INTO suvey_invitation_details ( company_id, user_id, emails, encrypted_email, share_date, unique_id) VALUES (?, ?, ?, ?, ?, ?)`;
        const data = [
          company_id[0],
          user_id[0],
          email,
          hashedEmail,
          formattedDate,
          uniqueIdValue
        ]
        const connection = await mysql.createConnection({
          host: process.env.DATABASE_HOST,
          user: process.env.DATABASE_USER,
          password: process.env.DATABASE_PASSWORD,
          database: process.env.DATABASE
        });

        const [insertRes] = await connection.query(sql, data);

        var mailOptions = {
          from: process.env.MAIL_USER,
          //to: 'pranab@scwebtech.com',
          to: email,
          subject: 'Survey Invitation Email',
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
                            <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Survey Invitation Email</h1>
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
                                      <p style="font-size:15px; line-height:20px">Dear Sir / Madam,</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colspan="2">
                                      <p style="font-size:15px; line-height:20px">${email_body[0]}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colspan="2">
                                      <p style="font-size:15px; line-height:20px">
                                      “Please <a href="${process.env.MAIN_URL}${company_slug[0]}/survey/${uniqueIdValue}/${hashedEmail}">click on the link</a> to start the survey. Your feedback is important to “${company_name[0]}” and will help us improve our products and services.”
                                      </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colspan="2">
                                      <p style="font-size:15px; line-height:20px">
                                      Thanking you, </p>
                                      <p style="font-size:15px; line-height:20px">
                                      “${company_name[0]}” & Team CEchoesTechnology </p>
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
            return false;
          } else {
            console.log('Mail Send: ', info.response);
            console.log("Mail Send to email: ",email);
            

          }
        })
      }

    })
    return true;
  }

}

// async function getPopularTags(limit = 20) {
//   try {
//     const sql = `
//       SELECT JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) as tags
//       FROM discussions
//       WHERE JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) IS NOT NULL
//       LIMIT ${limit};
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

//     // Sort the popularTags by tag_count in descending order
//     popularTags.sort((a, b) => b.tag_count - a.tag_count);

//     return popularTags;
//   } catch (error) {
//     console.error('Error getting popular tags:', error);
//     throw error;
//   }
// }

async function getPopularTags(country, limit = 20) {
  try {
    let sql = `
      SELECT JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) as tags
      FROM discussions
      WHERE JSON_UNQUOTE(JSON_EXTRACT(tags, '$[*]')) IS NOT NULL
    `;

    if (country) {
      sql += ` AND location = "${country}"`;
    }

    sql += `
      LIMIT ${limit};
    `;

    const rows = await query(sql);

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


async function getDiscussionListingByTag(tag) {
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
       ;
    `;

    const results = await query(sql, [tag]);
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

//Function to fetch company created tags from duscussions_company_tags table
async function getCompanyCreatedTags(company_id) {
  const sql = `SELECT * FROM duscussions_company_tags WHERE  company_id = '${company_id}'
  `;
  const result = await query(sql);
  if (result.length > 0) {
    return result;
  } else {
    return [];
  }

}

//Notification Content
async function duscussionQueryAlert() {
  const sql = `SELECT id, tags, topic FROM discussions WHERE query_alert_status = '0' `;
  const results = await query(sql);
  //console.log(results);
  if (results.length > 0) {
    results.forEach(async (result) => {
      const discussionTags = JSON.parse(result.tags);
      const discussionTopic_original = result.topic;
      const discussionTopic = result.topic.toLowerCase();
      const discussionTopic_id = result.id;
      //console.log(discussionTags)
      if (discussionTags.length > 0) {
        const companyTags = `SELECT tags, company_id FROM duscussions_company_tags LEFT JOIN company ON duscussions_company_tags.company_id = company.ID WHERE company.membership_type_id >=4 `;
        const companyResult = await query(companyTags);
        console.log('company Tag Results:', companyResult);
        if (companyResult.length > 0) {
          companyResult.forEach((companyTag) => {
            const companyTagsArr = JSON.parse(companyTag.tags);
            //console.log('companyTagsArr',companyTagsArr);
            const hasMatch = discussionTags.some(element => companyTagsArr.includes(element));
            const hasTagInDiscussion = companyTagsArr.some(tag => discussionTopic.includes(tag));
            const matchedTags = companyTagsArr.filter(tag => discussionTopic.includes(tag));
            if (hasMatch || hasTagInDiscussion) {
              comFunction2.discussionQueryAlertEmail(companyTag.company_id, discussionTopic_original, discussionTopic_id);
              //console.log('Match:', matchedTags);
            }
          })
        }
      }
    })
    const updateQuery = `UPDATE discussions SET query_alert_status='1' WHERE query_alert_status = '0' `;
    await query(updateQuery);
  }
}

//Function send Email to company for customer query alert
async function discussionQueryAlertEmail(companyId, TopicHeading, TopicID) {
  const sql = `
  SELECT users.email, users.first_name, c.slug
  FROM users 
  LEFT JOIN company_claim_request ccr ON ccr.claimed_by = users.user_id 
  LEFT JOIN company c ON c.ID = ccr.company_id
  WHERE c.ID = '${companyId}'

  `;
  try {
    const results = await query(sql);
    if (results.length > 0) {
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'pranab@scwebtech.com',
        to: results[0].email,
        subject: `Customer query alert email`,
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
                           <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">Customer query alert email </h1>
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
                                    <strong>Hello ${results[0].first_name},</strong>
                                    <p style="font-size:15px; line-height:20px">A customer has created your registered tags related discussion. 
                                    </p>
                                    <p style="font-size:15px; line-height:20px"><a href="${process.env.MAIN_URL}discussion-details/${TopicID}">${TopicHeading}</a></p>
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
          return res.send({
            status: 'not ok',
            message: 'Something went wrong'
          });
        } else {
          console.log('Mail Send: ', info.response);

        }
      })
    } else {
      return false;
    }
  }
  catch (error) {
    console.error('Error during fetch All Latest Discussion:', error);
  }
}

function getDefaultFromDate() {
  const currentDate = new Date();
  return currentDate.toISOString().split('T')[0]; // Returns current date in 'YYYY-MM-DD' format
}

function getDefaultToDate() {
  const currentDate = new Date();
  const sevenDaysAgo = new Date(currentDate.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  return sevenDaysAgo.toISOString().split('T')[0]; // Returns date 7 days ago in 'YYYY-MM-DD' format
}

//Function get historical graph chrat data
async function getCompanyHistoricalReviewBetween(companyID, from = getDefaultToDate(), to = getDefaultFromDate(), filter = "daily") {
  console.log('to', to);

  let dateGrouping = 'DAY(created_at)'; // Default grouping is daily

  if (filter === 'weekly') {
    dateGrouping = 'WEEK(created_at)';
  } else if (filter === 'monthly') {
    dateGrouping = 'MONTH(created_at)';
  } else if (filter === 'yearly') {
    dateGrouping = 'YEAR(created_at)';
  }

  const get_company_review_query = `
    SELECT ${dateGrouping} AS date_group, created_at, AVG(rating) AS average_rating
    FROM reviews
    WHERE company_id = ? AND review_status = ? 
    AND created_at BETWEEN ? AND ?
    GROUP BY date_group
    ORDER BY created_at ASC`;

  const get_company_review_values = [companyID, '1', from, to];

  try {
    const reviewData = await query(get_company_review_query, get_company_review_values);
    return reviewData;
  } catch (error) {
    console.error('Error during query execution:', error);
    throw error;
  }
}

// Fetch same categories company
function getSimilarCompany(companyId) {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT c.ID, c.company_name,c.slug, GROUP_CONCAT(ccr.company_id) AS companiesId
      FROM company c
      LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
      LEFT JOIN company_cactgory_relation ccr ON cr.category_id = ccr.category_id AND ccr.company_id != ${companyId}
      WHERE c.status != '3'  AND c.ID = ${companyId}
      GROUP BY c.ID`,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {

          const companiesId = result[0].companiesId ? result[0].companiesId.split(',') : [];
          result[0].companiesIdArr = companiesId
          resolve(result);

          // if (result.length > 0) {
          //   const companiesId = result[0].companiesId ? result[0].companiesId.split(',') : [];
          //   result[0].companiesIdArr = companiesId
          //   resolve(result);
          // } else {
          //   resolve([]);
          // }
        }
      });
  });
}

// Fetch company categories 
function getCompanyCategory(companyId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM complaint_category WHERE company_id = ? AND parent_id = 0 ', [companyId], async (err, results) => {
      if (err) {
        reject('An error occurred while processing your request ' + err);
      } else {
        resolve(results);
      }
    })
  });
}

// Fetch company categories by review id
function getCompanyCategoryByReviewId(reviewId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT cc.* FROM 
    reviews r
    LEFT JOIN complaint_category cc ON cc.company_id = r.company_id 
    WHERE r.id = ? AND cc.parent_id = 0 ` ;

    db.query(sql, [reviewId], async (err, results) => {
      if (err) {
        reject('An error occurred while processing your request ' + err);
      } else {
        resolve(results);
      }
    })
  });
}

// Fetch company categories product by review id
function getCompanyProductByReviewId(reviewId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT cp.* FROM 
    reviews r
    LEFT JOIN company_products cp ON cp.company_id = r.company_id 
    WHERE r.id = ? ` ;

    db.query(sql, [reviewId], async (err, results) => {
      //console.log(results);
      if (err) {
        reject('An error occurred while processing your request ' + err);
      } else {
        resolve(results);
      }
    })
  });
}

// Insert Company product
function insertCompanyProduct(body, file) {

  console.log('insertCompanyProduct', body);
  console.log('insertCompanyProduct', file);

  const { category_name, parent_category, company_id, product_title, product_desc } = body;

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

// Fetch company category Products
function getCompanyCategoryProducts(cat_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT cc.*, cp.id product_id, cp.product_title, cp.product_desc, cp.product_img  FROM complaint_category cc 
                LEFT JOIN company_products cp  ON cc.id = cp.category_id 
                WHERE cc.id = ?  
                ORDER BY cp.id DESC `;

    db.query(sql, [cat_id], (err, results) => {
      if (err) {
        reject('An error occurred while processing your request ' + err);
      } else {
        //console.log('results', results);
        resolve(results);
      }
    });
  });
}

//Check ongoing complaint level and update
async function complaintLevelUpdate() {
  const sql = `SELECT c.*, clm.eta_days, clm.emails, u.first_name, u.email, comp.slug FROM 
                complaint c
                LEFT JOIN complaint_level_management clm ON clm.company_id = c.company_id AND clm.level = '2'
                LEFT JOIN users u ON u.user_id = c.user_id 
                LEFT JOIN company comp ON comp.ID = c.company_id 
                WHERE c.level_id = '1' `;
  const results = await query(sql);

  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

  if (results.length > 0) {
    results.forEach(async (result) => {
      let date;
      let emails;

      if (result.level_update_at) {
        const dateString = result.level_update_at;
        date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        //console.log('level_update_at');
      } else {
        const dateString = result.created_at;
        date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        //console.log('created_at');
      }

      const date2 = new Date();
      date2.setHours(0, 0, 0, 0);
      const daysDiff = Math.round((date2 - date) / (1000 * 60 * 60 * 24));
      const daysLeft = result.eta_days - daysDiff;
      //console.log('daysLeft', daysLeft);
      if (daysLeft < 0) {
        emails = JSON.parse(result.emails);
        const updateQuery = `UPDATE complaint SET level_id= '${result.level_id + 1}', level_update_at ='${formattedDate}'  WHERE id = '${result.id}' `;
        const UpdateResults = await query(updateQuery);
        var mailOptions = {
          from: process.env.MAIL_USER,
          //to: 'pranab@scwebtech.com',
          to: result.email,
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
                                        <p style="font-size:15px; line-height:20px">Please review the complaint details and initiate the necessary steps to resolve the issue at the earliest. Your prompt attention to this matter is highly appreciated. Pending complaint ticket id:<a  href="${process.env.MAIN_URL}company-compnaint-details/${result.slug}/${result.id}">${result.ticket_id}</a> . Hurry up only ${daysLeft} days left.
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
      }
    });
  }
}

// Fetch membership plan
// function getmembershipPlans() {
//   return new Promise((resolve, reject) => {
//     db.query(
//       `SELECT *
//       FROM membership_plans 
//       WHERE 1`,
//       async (err, result) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(result);
//         }
//       });
//   });
// }
function getmembershipPlans() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT *
      FROM plan_management 
      WHERE 1`,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
  });
}

// Fetch one Payment details
// function getAllPayments() {
//   return new Promise((resolve, reject) => {
//     db.query(
//       `SELECT p.*, c.company_name , c.logo , c.comp_email , mp.plan_name
//       FROM payments p
//       LEFT JOIN company c ON c.ID = p.company_id  AND c.status != '3'
//       LEFT JOIN membership_plans mp ON p.membership_plan_id = mp.id  
//       ORDER BY p.id DESC`,
//       async (err, result) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(result);
//         }
//       });
//   });
// }



function getAllPayments() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT p.*, c.company_name, c.logo, c.comp_email, plan_management.name AS plan_name, plan_management.monthly_price, plan_management.yearly_price, users.email as company_user_email
       FROM order_history p
       LEFT JOIN company_claim_request ccr ON ccr.claimed_by = p.user_id 
       LEFT JOIN company c ON c.ID = ccr.company_id AND c.status != '3'
       LEFT JOIN plan_management ON p.plan_id = plan_management.id
       LEFT JOIN users ON ccr.claimed_by = users.user_id
       ORDER BY p.id DESC`,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {
          const payments = [];

          result.forEach(row => {
            let transactionId = null;
            let subscriptionAmount = null;
            let subscriptionInterval = null;

            try {
              const paymentDetails = JSON.parse(row.payment_details);
              transactionId = paymentDetails.latest_charge;
            } catch (error) {
              console.error('Error parsing payment details:', error);
            }

            try {
              const subscriptionDetails = JSON.parse(row.subscription_details);
              const subscriptionItem = subscriptionDetails.items.data[0];
              subscriptionAmount = subscriptionItem.plan.amount / 100;

              const interval = subscriptionItem.plan.interval;
              const intervalCount = subscriptionItem.plan.interval_count;

              if (interval === 'day') {
                subscriptionInterval = 'Daily';
              } else if (interval === 'week') {
                subscriptionInterval = 'Weekly';
              } else if (interval === 'month') {
                if (intervalCount === 1) {
                  subscriptionInterval = 'Monthly';
                } else {
                  subscriptionInterval = `Every ${intervalCount} Months`;
                }
              } else if (interval === 'year') {
                if (intervalCount === 1) {
                  subscriptionInterval = 'Yearly';
                } else {
                  subscriptionInterval = `Every ${intervalCount} Years`;
                }
              } else {
                subscriptionInterval = 'Unknown';
              }
            } catch (error) {
              console.error('Error parsing subscription details:', error);
            }

            const modifiedRow = {
              ...row,
              transaction_id: transactionId,
              subscription_amount: subscriptionAmount,
              subscription_interval: subscriptionInterval
            };
            payments.push(modifiedRow);
          });

          //console.log("resultv", payments);
          resolve(payments);
        }
      }
    );
  });
}



// function getAllPaymentHistory() {
//   return new Promise((resolve, reject) => {
//     db.query(
//       `SELECT p.*, c.company_name, c.logo, c.comp_email, plan_management.name AS plan_name, plan_management.monthly_price, plan_management.yearly_price, users.email as company_user_email
//        FROM order_history p
//        LEFT JOIN company_claim_request ccr ON ccr.claimed_by = p.user_id 
//        LEFT JOIN company c ON c.ID = ccr.company_id AND c.status != '3'
//        LEFT JOIN plan_management ON p.plan_id = plan_management.id
//        LEFT JOIN users ON ccr.claimed_by = users.user_id
//        ORDER BY p.id DESC`,
//       async (err, result) => {
//         if (err) {
//           reject(err);
//           return;
//         }

//         const payments = [];

//         result.forEach(row => {
//           let transactionId = null;
//           let subscriptionAmount = null;
//           let subscriptionInterval = null;
//           let formattedPaymentDate = null;

//           try {
//             const paymentDetails = JSON.parse(row.payment_details);
//             transactionId = paymentDetails.charge;

//             const paymentDate = new Date(paymentDetails.created * 1000);
//             formattedPaymentDate = paymentDate.toLocaleDateString('en-US');

//             console.log('Payment Date:', formattedPaymentDate);
//           } catch (error) {
//             console.error('Error parsing payment details:', error);
//           }

//           try {
//             const subscriptionDetails = JSON.parse(row.subscription_details);
//             const subscriptionItem = subscriptionDetails.items.data[0];
//             subscriptionAmount = subscriptionItem.plan.amount / 100;

//             const interval = subscriptionItem.plan.interval;
//             const intervalCount = subscriptionItem.plan.interval_count;

//             if (interval === 'day') {
//               subscriptionInterval = 'Daily';
//             } else if (interval === 'week') {
//               subscriptionInterval = 'Weekly';
//             } else if (interval === 'month') {
//               if (intervalCount === 1) {
//                 subscriptionInterval = 'Monthly';
//               } else {
//                 subscriptionInterval = `Every ${intervalCount} Months`;
//               }
//             } else if (interval === 'year') {
//               if (intervalCount === 1) {
//                 subscriptionInterval = 'Yearly';
//               } else {
//                 subscriptionInterval = `Every ${intervalCount} Years`;
//               }
//             } else {
//               subscriptionInterval = 'Unknown';
//             }
//           } catch (error) {
//             console.error('Error parsing subscription details:', error);
//           }

//           const modifiedRow = {
//             ...row,
//             transaction_id: transactionId,
//             subscription_amount: subscriptionAmount,
//             subscription_interval: subscriptionInterval,
//             formattedPaymentDate: formattedPaymentDate
//           };
//           payments.push(modifiedRow);
//         });

//         // Group payments by plan_name
//         const groupedPayments = {
//           Basic: [],
//           Standard: [],
//           Advanced: [],
//           Premium: [],
//           Enterprise: []
//         };

//         payments.forEach(payment => {
//           switch (payment.plan_name) {
//             case 'basic':
//               groupedPayments.Basic.push(payment);
//               break;
//             case 'standard':
//               groupedPayments.Standard.push(payment);
//               break;
//             case 'advanced':
//               groupedPayments.Advanced.push(payment);
//               break;
//             case 'premium':
//               groupedPayments.Premium.push(payment);
//               break;
//             case 'enterprise':
//               groupedPayments.Enterprise.push(payment);
//               break;
//             default:
//               break;
//           }
//         });

//         resolve(groupedPayments);
//       }
//     );
//   });
// }



// async function getAllPaymentHistory() {
//   return new Promise((resolve, reject) => {
//     db.query(
//       `SELECT p.*, c.company_name, c.logo, c.comp_email, plan_management.name AS plan_name, plan_management.monthly_price, plan_management.yearly_price, users.email as company_user_email
//           FROM order_history p
//           LEFT JOIN company_claim_request ccr ON ccr.claimed_by = p.user_id 
//          LEFT JOIN company c ON c.ID = ccr.company_id AND c.status != '3'
//          LEFT JOIN plan_management ON p.plan_id = plan_management.id
//            LEFT JOIN users ON ccr.claimed_by = users.user_id
//            ORDER BY p.id DESC`,
//       async (err, result) => {
//         if (err) {
//           reject(err);
//         } else {
//           const payments = [];

//           result.forEach(row => {
//             let transactionId = null;
//             let subscriptionAmount = null;
//             let subscriptionInterval = null;
//             let formattedPaymentDate = null;
//             let nextPaymentDate = null;

//             try {
//               const paymentDetails = JSON.parse(row.payment_details);
//               transactionId = paymentDetails.charge;

//               const paymentDate = new Date(paymentDetails.created * 1000);
//               formattedPaymentDate = paymentDate.toLocaleDateString('en-US');

//               console.log('Payment Date:', formattedPaymentDate);
//             } catch (error) {
//               console.error('Error parsing payment details:', error);
//             }

//             try {
//               const subscriptionDetails = JSON.parse(row.subscription_details);
//               const currentPeriodEnd = subscriptionDetails.current_period_end;
//               if (currentPeriodEnd) {
//                 const nextPaymentTimestamp = new Date(currentPeriodEnd * 1000);
//                 nextPaymentDate = nextPaymentTimestamp.toLocaleDateString('en-US');
//               } else {
//                 console.warn('No current_period_end found in subscription_details');
//               }

//               const subscriptionItem = subscriptionDetails.items.data[0];
//               subscriptionAmount = subscriptionItem.plan.amount / 100;

//               const interval = subscriptionItem.plan.interval;
//               const intervalCount = subscriptionItem.plan.interval_count;

//               if (interval === 'day') {
//                 subscriptionInterval = 'Daily';
//               } else if (interval === 'week') {
//                 subscriptionInterval = 'Weekly';
//               } else if (interval === 'month') {
//                 if (intervalCount === 1) {
//                   subscriptionInterval = 'Monthly';
//                 } else {
//                   subscriptionInterval = `Every ${intervalCount} Months`;
//                 }
//               } else if (interval === 'year') {
//                 if (intervalCount === 1) {
//                   subscriptionInterval = 'Yearly';
//                 } else {
//                   subscriptionInterval = `Every ${intervalCount} Years`;
//                 }
//               } else {
//                 subscriptionInterval = 'Unknown';
//               }
//             } catch (error) {
//               console.error('Error parsing subscription details:', error);
//             }

//             const modifiedRow = {
//               ...row,
//               transaction_id: transactionId,
//               subscription_amount: subscriptionAmount,
//               subscription_interval: subscriptionInterval,
//               formattedPaymentDate: formattedPaymentDate,
//               next_payment_date: nextPaymentDate
//             };
//             payments.push(modifiedRow);
//           });

//           console.log('All Payments:', payments); // Log payments for debugging

//           // Group payments by plan_name
//           const groupedPayments = {
//             Basic: payments.filter(payment => payment.plan_name === 'basic'),
//             Standard: payments.filter(payment => payment.plan_name === 'standard'),
//             Advanced: payments.filter(payment => payment.plan_name === 'advanced'),
//             Premium: payments.filter(payment => payment.plan_name === 'premium'),
//             Enterprise: payments.filter(payment => payment.plan_name === 'enterprise'),
//           };

//           console.log('Grouped Payments:', groupedPayments); // Log grouped payments for debugging

//           resolve(groupedPayments);
//         }
//       }
//     );
//   });
// }





async function getAllPaymentHistory() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT p.*, c.company_name, c.logo, c.comp_email, plan_management.name AS plan_name, plan_management.monthly_price, plan_management.yearly_price, users.email as company_user_email
       FROM order_history p
       LEFT JOIN company_claim_request ccr ON ccr.claimed_by = p.user_id 
       LEFT JOIN company c ON c.ID = ccr.company_id AND c.status != '3'
       LEFT JOIN plan_management ON p.plan_id = plan_management.id
       LEFT JOIN users ON ccr.claimed_by = users.user_id`,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {
          const payments = [];

          result.forEach(row => {
            let transactionId = null;
            let subscriptionAmount = null;
            let subscriptionInterval = null;
            let formattedPaymentDate = null;
            let nextPaymentDate = null;

            try {
              const paymentDetails = JSON.parse(row.payment_details);
              transactionId = paymentDetails.charge;

              const paymentDate = new Date(paymentDetails.created * 1000);
              formattedPaymentDate = paymentDate.toLocaleDateString('en-US');

              console.log('Payment Date:', formattedPaymentDate);
            } catch (error) {
              console.error('Error parsing payment details:', error);
            }

            try {
              const subscriptionDetails = JSON.parse(row.subscription_details);
              const currentPeriodEnd = subscriptionDetails.current_period_end;


              if (currentPeriodEnd) {
                const nextPaymentTimestamp = new Date(currentPeriodEnd * 1000);
                const interval = subscriptionDetails.items.data[0].plan.interval;
                const intervalCount = subscriptionDetails.items.data[0].plan.interval_count;

                if (interval === 'day') {
                  nextPaymentTimestamp.setDate(nextPaymentTimestamp.getDate() + intervalCount);
                } else if (interval === 'week') {
                  nextPaymentTimestamp.setDate(nextPaymentTimestamp.getDate() + intervalCount * 7);
                } else if (interval === 'month') {
                  nextPaymentTimestamp.setMonth(nextPaymentTimestamp.getMonth() + intervalCount);
                } else if (interval === 'year') {
                  nextPaymentTimestamp.setFullYear(nextPaymentTimestamp.getFullYear() + intervalCount);
                }

                nextPaymentDate = nextPaymentTimestamp.toLocaleDateString('en-US');
              } else {
                console.warn('No current_period_end found in subscription_details');
              }

              const subscriptionItem = subscriptionDetails.items.data[0];
              subscriptionAmount = subscriptionItem.plan.amount / 100;

              const interval = subscriptionItem.plan.interval;
              const intervalCount = subscriptionItem.plan.interval_count;

              if (interval === 'day') {
                subscriptionInterval = 'Daily';
              } else if (interval === 'week') {
                subscriptionInterval = 'Weekly';
              } else if (interval === 'month') {
                if (intervalCount === 1) {
                  subscriptionInterval = 'Monthly';
                } else {
                  subscriptionInterval = `Every ${intervalCount} Months`;
                }
              } else if (interval === 'year') {
                if (intervalCount === 1) {
                  subscriptionInterval = 'Yearly';
                } else {
                  subscriptionInterval = `Every ${intervalCount} Years`;
                }
              } else {
                subscriptionInterval = 'Unknown';
              }
            } catch (error) {
              console.error('Error parsing subscription details:', error);
            }

            const modifiedRow = {
              ...row,
              transaction_id: transactionId,
              subscription_amount: subscriptionAmount,
              subscription_interval: subscriptionInterval,
              formattedPaymentDate: formattedPaymentDate,
              next_payment_date: nextPaymentDate
            };
            payments.push(modifiedRow);
          });

         // console.log('All Payments:', payments); 
          const groupedPayments = {
            Basic: payments.filter(payment => payment.plan_name === 'basic'),
            Standard: payments.filter(payment => payment.plan_name === 'standard'),
            Advanced: payments.filter(payment => payment.plan_name === 'advanced'),
            Premium: payments.filter(payment => payment.plan_name === 'premium'),
            Enterprise: payments.filter(payment => payment.plan_name === 'enterprise'),
          };

          console.log('Grouped Payments:', groupedPayments); 

          resolve(groupedPayments);
        }
      }
    );
  });
}


async function getuserAllPaymentHistory(user_id) {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT p.*, c.company_name, c.logo, c.comp_email, plan_management.name AS plan_name, plan_management.monthly_price, plan_management.yearly_price, users.email as company_user_email
       FROM order_history p
       LEFT JOIN company_claim_request ccr ON ccr.claimed_by = p.user_id 
       LEFT JOIN company c ON c.ID = ccr.company_id AND c.status != '3'
       LEFT JOIN plan_management ON p.plan_id = plan_management.id
       LEFT JOIN users ON ccr.claimed_by = users.user_id
       WHERE p.user_id="${user_id}"AND p.payment_status='success'`,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {
          const payments = [];

          result.forEach(row => {
            let transactionId = null;
            let subscriptionAmount = null;
            let subscriptionInterval = null;
            let formattedPaymentDate = null;
            let nextPaymentDate = null;

            try {
              const paymentDetails = JSON.parse(row.payment_details);
              transactionId = paymentDetails.charge;

              const paymentDate = new Date(paymentDetails.created * 1000);
              formattedPaymentDate = paymentDate.toLocaleDateString('en-US');

              console.log('Payment Date:', formattedPaymentDate);
            } catch (error) {
              console.error('Error parsing payment details:', error);
            }

            try {
              const subscriptionDetails = JSON.parse(row.subscription_details);
              const currentPeriodEnd = subscriptionDetails.current_period_end;


              if (currentPeriodEnd) {
                const nextPaymentTimestamp = new Date(currentPeriodEnd * 1000);
                const interval = subscriptionDetails.items.data[0].plan.interval;
                const intervalCount = subscriptionDetails.items.data[0].plan.interval_count;

                if (interval === 'day') {
                  nextPaymentTimestamp.setDate(nextPaymentTimestamp.getDate() + intervalCount);
                } else if (interval === 'week') {
                  nextPaymentTimestamp.setDate(nextPaymentTimestamp.getDate() + intervalCount * 7);
                } else if (interval === 'month') {
                  nextPaymentTimestamp.setMonth(nextPaymentTimestamp.getMonth() + intervalCount);
                } else if (interval === 'year') {
                  nextPaymentTimestamp.setFullYear(nextPaymentTimestamp.getFullYear() + intervalCount);
                }

                nextPaymentDate = nextPaymentTimestamp.toLocaleDateString('en-US');
              } else {
                console.warn('No current_period_end found in subscription_details');
              }

              const subscriptionItem = subscriptionDetails.items.data[0];
              subscriptionAmount = subscriptionItem.plan.amount / 100;

              const interval = subscriptionItem.plan.interval;
              const intervalCount = subscriptionItem.plan.interval_count;

              if (interval === 'day') {
                subscriptionInterval = 'Daily';
              } else if (interval === 'week') {
                subscriptionInterval = 'Weekly';
              } else if (interval === 'month') {
                if (intervalCount === 1) {
                  subscriptionInterval = 'Monthly';
                } else {
                  subscriptionInterval = `Every ${intervalCount} Months`;
                }
              } else if (interval === 'year') {
                if (intervalCount === 1) {
                  subscriptionInterval = 'Yearly';
                } else {
                  subscriptionInterval = `Every ${intervalCount} Years`;
                }
              } else {
                subscriptionInterval = 'Unknown';
              }
            } catch (error) {
              console.error('Error parsing subscription details:', error);
            }

            const modifiedRow = {
              ...row,
              transaction_id: transactionId,
              subscription_amount: subscriptionAmount,
              subscription_interval: subscriptionInterval,
              formattedPaymentDate: formattedPaymentDate,
              next_payment_date: nextPaymentDate
            };
            payments.push(modifiedRow);
          });

         // console.log('All Payments:', payments); 
          const groupedPayments = {
            Basic: payments.filter(payment => payment.plan_name === 'basic'),
            Standard: payments.filter(payment => payment.plan_name === 'standard'),
            Advanced: payments.filter(payment => payment.plan_name === 'advanced'),
            Premium: payments.filter(payment => payment.plan_name === 'premium'),
            Enterprise: payments.filter(payment => payment.plan_name === 'enterprise'),
          };

          console.log('Grouped Payments:', groupedPayments); 

          resolve(groupedPayments);
        }
      }
    );
  });
}




// function getAllPayments() {
//   return new Promise((resolve, reject) => {
//     db.query(
//       `SELECT p.*, c.company_name , c.logo , c.comp_email , plan_management.name
//       FROM order_history p
//       LEFT JOIN company_claim_request ccr ON ccr.claimed_by = p.user_id 
//       LEFT JOIN company c ON c.ID = ccr.company_id  AND c.status != '3'
//       LEFT JOIN plan_management ON p.plan_id = plan_management.id
//       ORDER BY p.id DESC`,
//       async (err, result) => {
//         if (err) {
//           reject(err);
//         } else {
//           console.log(
//             "resultv",result
//           );
//           resolve(result);
//         }
//       });
//   });
// }

// Fetch a payment details
function getpaymentDetailsById(paymentId) {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT *
      FROM payments 
      WHERE id = ${paymentId}`,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
  });
}

//Function to get all polls from poll_company table
async function getAllPolls() {

  return new Promise((resolve, reject) => {
    const sql = `
    SELECT
    poll_company.*, c.company_name , c.logo , c.comp_email
    FROM poll_company
    LEFT JOIN company c ON c.ID = poll_company.company_id  AND c.status != '3'
    ORDER BY poll_company.id DESC
    `;
    try {
      db.query(sql, (err, results) => {
        if (err) {
          reject(err);
        }
        //console.log(results);
        if (results.length > 0) {

          resolve(results);
        } else {
          resolve([]);
        }
      });

    }
    catch (error) {
      console.error('Error during fetch All Latest Discussion:', error);
    }
  });

}

//Function to get all complaints from poll_company table
async function getAllComplaints() {

  return new Promise((resolve, reject) => {
    const sql = `
    SELECT
    complaint.*, c.company_name , c.logo , c.comp_email
    FROM complaint
    LEFT JOIN company c ON c.ID = complaint.company_id  AND c.status != '3'
    ORDER BY complaint.id DESC
    `;
    try {
      db.query(sql, (err, results) => {
        if (err) {
          reject(err);
        }
        //console.log(results);
        if (results.length > 0) {

          resolve(results);
        } else {
          resolve([]);
        }
      });

    }
    catch (error) {
      console.error('Error during fetch All Latest Discussion:', error);
    }
  });

}

//Function to get all survey from poll_company table
async function getAllSurveys() {

  return new Promise((resolve, reject) => {
    const sql = `
    SELECT
    survey.*, c.company_name , c.logo , c.comp_email
    FROM survey
    LEFT JOIN company c ON c.ID = survey.company_id  AND c.status != '3'
    ORDER BY survey.id DESC
    `;
    try {
      db.query(sql, (err, results) => {
        if (err) {
          reject(err);
        }
        //console.log(results);
        if (results.length > 0) {

          resolve(results);
        } else {
          resolve([]);
        }
      });

    }
    catch (error) {
      console.error('Error during fetch All Latest Discussion:', error);
    }
  });

}

//Function to get all survey from poll_company table
async function getSurveyInvitedEmail(encryptedEmail) {

  return new Promise((resolve, reject) => {
    const sql = `
    SELECT suvey_invitation_details.*
    FROM suvey_invitation_details
    WHERE suvey_invitation_details.encrypted_email = '${encryptedEmail}' `;
    try {
      db.query(sql, (err, results) => {
        if (err) {
          reject(err);
        }
        //console.log(results);
        if (results.length > 0) {

          resolve(results);
        } else {
          resolve([]);
        }
      });

    }
    catch (error) {
      console.error('Error during fetch All Latest Discussion:', error);
    }
  });

}

// Fetch a survey details by id
function getSurveyDetails(surveyId) {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT *
      FROM survey
      WHERE id = ${surveyId}; `,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
  });
}

async function getSurveyDetailsByUniqueId(unique_id) {
  const get_company_survey_details_query = `
  SELECT survey.*
  FROM survey
  WHERE survey.unique_id = ${unique_id};
  `;
  try {
    const get_company_survey_details_result = await query(get_company_survey_details_query);
    return get_company_survey_details_result;
  } catch (error) {
    return 'Error during user get_survey_details_query:' + error;
  }
}

async function getSurveyemailDetailsByUniqueId(unique_id) {
  const get_company_survey_details_query = `
  SELECT suvey_invitation_details.emails
  FROM survey
  LEFT JOIN suvey_invitation_details ON survey.unique_id = suvey_invitation_details.unique_id
  WHERE survey.unique_id = ${unique_id};
  `;
  try {
    const get_company_survey_details_result = await query(get_company_survey_details_query);
    console.log("get_company_survey_details_result",get_company_survey_details_result);
    
    return get_company_survey_details_result;
  } catch (error) {
    return 'Error during user get_survey_details_query:' + error;
  }
}

async function countSurveyAnswerByUniqueId(unique_id) {
  const get_company_survey_details_query = `
  SELECT COUNT(*) AS total_ans
  FROM survey_customer_answers
  WHERE survey_unique_id = ${unique_id};
  `;
  try {
    const get_company_survey_details_result = await query(get_company_survey_details_query);
    return get_company_survey_details_result;
  } catch (error) {
    return 'Error during user get_survey_details_query:' + error;
  }
}

//Function to get all comment by discussion from discussions and discussions_user_response table
async function getDiscussionByDiscusId(discussions_id) {
  const sql = `
  SELECT discussions.*, u.first_name, u.last_name 
  FROM discussions 
  LEFT JOIN users u ON discussions.user_id = u.user_id 
  WHERE discussions.id = ${discussions_id}
  `;
  const commentQuery = `SELECT discussions_user_response.*, u.first_name comment_first_name, u.last_name comment_last_name, ucm.profile_pic
  FROM discussions_user_response 
  LEFT JOIN users u ON discussions_user_response.user_id = u.user_id 
  LEFT JOIN user_customer_meta ucm ON discussions_user_response.user_id = ucm.user_id 
  WHERE discussions_user_response.discussion_id = ${discussions_id}
  ORDER BY created_at DESC;`
  try {
    const results = await query(sql);
    const commentResult = await query(commentQuery);
    const cmntData = JSON.stringify(commentResult);
    //console.log('commentResult',commentResult)
    results[0].commentData = cmntData;
    //console.log('results',results)
    return results;
  }
  catch (error) {
    console.error('Error during fetching getAllCommentByDiscusId:', error);
    
  }
}
//count for like and dislike
async function getcommentsCount(discussionId) {
  const getLikeCountQuery = `SELECT comment_id, user_id, COUNT(*) AS like_count FROM discussion_comment_liked_data WHERE discussion_id = ${discussionId} AND voting = '1' GROUP BY comment_id;`;

  const getDislikeCountQuery = `SELECT comment_id,user_id, COUNT(*) AS dislike_count FROM discussion_comment_liked_data WHERE discussion_id = ${discussionId} AND voting = '0' GROUP BY comment_id;`;

  try {
    const likeCounts = await query(getLikeCountQuery);
    const dislikeCounts = await query(getDislikeCountQuery);
    
    console.log('Like counts:', likeCounts);
    console.log('Dislike counts:', dislikeCounts);

    //return { likeCounts, dislikeCounts };
    return [likeCounts, dislikeCounts];
  } catch (error) {
    console.error('Error during fetching getcommentsCount:', error);
    throw new Error('Error during getcommentsCount:' + error);
  }
}
function getCompanyProducts(company_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT DISTINCT cc.*, cp.id product_id, cp.product_title, cp.product_desc, cp.product_img, company.company_name  FROM complaint_category cc 
                LEFT JOIN company_products cp  ON cc.id = cp.category_id AND cc.company_id = cp.company_id 
                LEFT JOIN company ON cc.company_id = company.ID
                WHERE cc.company_id = ?  
                ORDER BY cp.id DESC `;

    db.query(sql, [company_id], (err, results) => {
      if (err) {
        reject('An error occurred while processing your request ' + err);
      } else {
        //console.log('results', results);
        const filteredResults = results.filter(item => item.product_id !== null);
        //console.log("filteredResults",filteredResults);
        resolve(filteredResults);
      }
    });
  });
}
async function getcategories(company_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT DISTINCT * FROM complaint_category cc 
                WHERE cc.company_id = ?`;

    db.query(sql, [company_id], (err, results) => {
      if (err) {
        reject('An error occurred while processing your request ' + err);
      } else {
        //console.log('results', results);
        // const filteredResults = results.filter(item => item.product_id !== null);
        //console.log("filteredResults",filteredResults);
        resolve(results);
      }
    });
  });
}

async function getsubcategories(company_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT DISTINCT * FROM complaint_category cc 
                WHERE cc.company_id = ? AND cc.parent_id != 0`;
  
    db.query(sql, [company_id], (err, results) => {
      if (err) {
        reject('An error occurred while processing your request ' + err);
      } else {
        console.log('subresults', results);
        resolve(results);
      }
    });
  });
  
}


async function getUserLikedComments(discussionId, user_ID) {
  const getUserLikedCommentsQuery = `SELECT comment_id, voting FROM discussion_comment_liked_data WHERE discussion_id = ${discussionId} AND user_id = ${user_ID};`;

  try {
    const userLikedComments = await query(getUserLikedCommentsQuery);
    console.log("userLikedComments",userLikedComments);
    return userLikedComments;
  } catch (error) {
    console.error('Error during fetching userLikedComments:', error);
    throw new Error('Error during getUserLikedComments:' + error);
  }
}
// async function getDiscussionByDiscusId(discussions_id) {
//   const sql = `
//   SELECT discussions.* 
//   FROM discussions 
//   WHERE discussions.id = ${discussions_id}
//   `;
//   try {
//     const results = await query(sql);
//     return results;
//   }
//   catch (error) {
//     console.error('Error during fetching getAllCommentByDiscusId:', error);
    
//   }
// }
async function getCompanySurveyDetailsByID(survey_unique_id) {
  const get_company_survey_details_query = `
  SELECT survey.*
  FROM survey
  WHERE survey.unique_id = ${survey_unique_id};
  `;
  try{
    const get_company_survey_details_result = await query(get_company_survey_details_query);
    return get_company_survey_details_result;
  }catch(error){
    return 'Error during user get_company_survey_details_query:'+error;
  }
}

// async function getsurveyratingData(survey_unique_id){
//   const get_company_survey_details_query = `
//   SELECT *
//   FROM survey_customer_answers
//   WHERE survey_unique_id = ${survey_unique_id};
//   `;
//   try{
//       const get_company_survey_details_result = await query(get_company_survey_details_query);
//       //console.log("getsurveyratingData",get_company_survey_details_result);
  
//       const formattedResults = get_company_survey_details_result.map(entry => {
//           const parsedAnswer = JSON.parse(entry.answer);
//           return { ...entry, answer: parsedAnswer };
//       });
//       //console.log("formattedResults", formattedResults);
  
//       let ratingsCount = {
//           '0-2': 0,
//           '2.5-3.5': 0,
//           '4-5': 0
//       };
  
//       formattedResults.forEach(entry => {
//           const answer = entry.answer;
//           for (let key in answer) {
//               if (key.startsWith('question_')) {
//                   const rating = parseFloat(answer[key]);
//                   if (rating >= 0 && rating <= 2) {
//                       ratingsCount['0-2']++;
//                   } else if (rating >= 2.5 && rating <= 3.5) {
//                       ratingsCount['2.5-3.5']++;
//                   } else if (rating >= 4 && rating <= 5) {
//                       ratingsCount['4-5']++;
//                   }
//               }
//           }
//       });
  
//       const totalSubmissions = formattedResults.length;
  
//       for (let range in ratingsCount) {
//         ratingsCount[range] = Math.round((ratingsCount[range] / totalSubmissions) * 100);
//     }
    
//       //console.log('Ratingssssss percentage:', ratingsCount);
      
//       return ratingsCount;
  
//   }catch(error){
//     return 'Error during user get_company_survey_details_query:'+error;
//   }
// }


async function getsurveyratingData(survey_unique_id) {
  const get_company_survey_details_query = `
      SELECT *
      FROM survey_customer_answers
      WHERE survey_unique_id = ${survey_unique_id};
  `;
  try {
      const get_company_survey_details_result = await query(get_company_survey_details_query);
      const formattedResults = get_company_survey_details_result.map(entry => {
          const parsedAnswer = JSON.parse(entry.answer);
          return { ...entry, answer: parsedAnswer };
      });

      let ratingsCount = {
          detractors: 0,
          passives: 0,
          promoters: 0
      };

      formattedResults.forEach(entry => {
          const answer = entry.answer;
          for (let key in answer) {
              if (key.startsWith('question_')) {
                  const rating = parseFloat(answer[key]);
                  if (rating >= 0 && rating <= 2) {
                      ratingsCount.detractors++;
                  } else if (rating >= 2.5 && rating <= 3.5) {
                      ratingsCount.passives++;
                  } else if (rating >= 4 && rating <= 5) {
                      ratingsCount.promoters++;
                  }
              }
          }
      });

      const totalSubmissions = formattedResults.length;

      for (let category in ratingsCount) {
          ratingsCount[category] = Math.round((ratingsCount[category] / totalSubmissions) * 100);
      }

      return ratingsCount;

  } catch (error) {
      return 'Error during user get_company_survey_details_query:' + error;
  }
}


async function getcompaniesbyCountry(country_shortname){
  const get_company_query = `
      SELECT *
      FROM company
      WHERE main_address_country = ${country_shortname};
  `;
  try {
      const get_company_result = await query(get_company_query);
    if(get_company_result.length>0){
      return get_company_result;
    }
    else{
      return []
    }
      
  } catch (error) {
      return 'Error during user getcompaniesbyCountry:' + error;
  }
}
async function getCountryName(shortname) {
  var company_country_query = `SELECT name FROM countries WHERE shortname= ?`;
  var company_country_value = await query(company_country_query, [shortname]);
  
  if (company_country_value.length > 0) {
      return company_country_value[0].name;
  } else {
      return null;
  }
}
function getAllParentCompany() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories
      FROM company c
      LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
      LEFT JOIN category cat ON cr.category_id = cat.ID
      WHERE c.status != '3' AND c.parent_id = '0' AND c.temp_comp_status='0'
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

function getAllnewParentCompany() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories
      FROM company c
      LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
      LEFT JOIN category cat ON cr.category_id = cat.ID
      WHERE c.status != '3' AND c.parent_id = '0' AND c.temp_comp_status='1'
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

function getChildCompany(companyId) {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT c.*, GROUP_CONCAT(cat.category_name) AS categories, CONCAT(users.first_name, ' ', users.last_name) AS claimed_by_user_name, users.email AS claimed_by_user
      FROM company c
      LEFT JOIN company_cactgory_relation cr ON c.ID = cr.company_id
      LEFT JOIN category cat ON cr.category_id = cat.ID
      LEFT JOIN company_claim_request ccr ON ccr.company_id = c.ID
      LEFT JOIN users ON ccr.claimed_by = users.user_id
      WHERE c.status != '3' AND c.parent_id = "${companyId}"
      GROUP BY c.ID`,
      async (err, result) => {
        if (err) {
          reject(err);
        } else {
          console.log("result",result);
          resolve(result);
        }
      });
  });

}
// function getcountrybyIp(ipAddress,api_key) {
//   try {
//     //const ipAddress = req.ip; 
//     // const ipAddress = '45.64.221.211';
//     // console.log("ipAddress",ipAddress);
//     // const api_key = '9b38b399323e4d05a3bcbd1505e8e834'

//     const response = axios.get(`https://ipgeolocation.abstractapi.com/v1/?api_key=${api_key}&ip_address=${ipAddress}`)
//               .then(response => {
//                 var country_name = response.data;
//                 console.log("country_name",country_name);
//               })
//               .catch(error => {
//                   console.log(error);
//               });
//     return country_name;

// } catch (err) {
//     console.error(err);
//     res.status(500).send('An error occurred');
// }
// }

async function getPublicIpAddress() {
  try {
      const response = await axios.get('http://httpbin.org/ip');
      const ipAddress = response.data.origin;
      console.log('Public IP Address:', ipAddress);
      return ipAddress;
  } catch (error) {
      console.error('Error fetching public IP address:', error.message);
      throw new Error('Failed to fetch public IP address');
  }
}

async function getcountrybyIp(ipAddress, api_key) {
  try {
      //const response = await axios.get(`https://ipgeolocation.abstractapi.com/v1/?api_key=${api_key}&ip_address=${ipAddress}`);
      //const countryname = response.data.country_code;
     // const country_code = response.data.country_code;
      const country_code='IN';
      //console.log("country_name", country_name);
      //console.log("response.data", response.data);
      console.log("country_code", country_code);
      return country_code;


  } catch (error) {
      console.error(error);
      throw new Error('An error occurred');
  }
}
// async function getcountrynamebyIp(ipAddress, api_key) {
//   try {
//       const response = await axios.get(`https://ipgeolocation.abstractapi.com/v1/?api_key=${api_key}&ip_address=${ipAddress}`);
//       const country_name = response.data.country;
//       //const country_code = response.data.country_code;
//       //console.log("country_name", country_name);
//       console.log("response.data", response.data);
//       //console.log("country_code", country_code);
//       return country_name;


//   } catch (error) {
//       console.error(error);
//       throw new Error('An error occurred');
//   }
// }


//actual
// async function getcountrynamebyIp(ipAddress, api_key) {
//   try {
//       const response = await axios.get(`https://ipgeolocation.abstractapi.com/v1/?api_key=${api_key}&ip_address=${ipAddress}`);
//       const country_name = response.data.country;
//       const country_code = response.data.country_code;
//       console.log("country_name", country_name);
//       console.log("response.data", response.data);
//       console.log("country_code", country_code);
//       return { country_name, country_code };
//   } catch (error) {
//       console.error(error);
//       throw new Error('An error occurred');
//   }
// }


//actual
async function getcountrynamebyIp(ipAddress, api_key) {
  console.log("ipAddress",ipAddress);
  const url = `https://ipgeolocation.abstractapi.com/v1/?api_key=${api_key}&ip_address=${ipAddress}`;
  
  let attempts = 0;
  const maxAttempts = 5;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  while (attempts < maxAttempts) {
    try {
     // const response = await axios.get(url);
     // const country_name = response.data.country;
     // const country_code = response.data.country_code;
       const country_name='India';
       const country_code='IN';
      console.log("country_name", country_name);
     // console.log("response.data", response.data);
      console.log("country_code", country_code);
      return { country_name, country_code };
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        console.log(`Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
        await delay(retryAfter * 1000);
      } else {
        console.error('Error fetching country name by IP:', error);
        throw new Error('An error occurred while fetching the country name by IP');
      }
    }
    attempts++;
  }
  throw new Error('Failed to fetch country name by IP after several attempts');
}

// async function getCountryNamesByIp(ipAddress, apiKey) {
//   const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`;

//   try {
//     const response = await axios.post(url, {
//       considerIp: true,
//       wifiAccessPoints: [], 
//       cellTowers: [],
//     });

//     const { country, countryCode } = response.data.location;

//     console.log('Country Code:', countryCode);
//     console.log('Country Name:', country);

//     return { country_code: countryCode, country_name: country };
//   } catch (error) {
//     console.error('Error fetching country name by IP:', error);
//     throw new Error('An error occurred while fetching the country name by IP');
//   }
// }

// async function getcountrynamebyIp(ipAddress, apiKey) {
//   try {
//     const { country_code, country_name } = await getCountryNamesByIp(ipAddress, apiKey);
//     console.log('Country Code:', country_code);
//     console.log('Country Name:', country_name);

//     return {country_code, country_name}
//   } catch (error) {
//     console.error('Error:', error.message);
//     // Handle errors as needed
//   }
// }

//ac
// async function getplans() {
//     try {
//       const basic_query = `SELECT * FROM plan_management WHERE name = 'Basic'`;
//       const basic_value = await query(basic_query);
//       if (basic_value.length > 0) {
//           var basic_val = basic_value[0];
//           console.log("basic_val",basic_val);
//           //return res.status(500).json({ message: 'Already added for Basic Plan Managemnet.' });
//       }


//       const standard_query = `SELECT * FROM plan_management WHERE name = 'standard'`;
//       const standard_value = await query(standard_query);
//       if (standard_value.length > 0) {
//           var standard_val = standard_value[0];
//           //console.log("standard_val",standard_val);
//           //return res.status(500).json({ message: 'Already added for Standard Plan Managemnet.' });
//       }
  

//       const advanced_query = `SELECT * FROM plan_management WHERE name = 'advanced'`;
//       const advanced_value = await query(advanced_query);
//       if (advanced_value.length > 0) {
//           var advanced_val = advanced_value[0];
//           //console.log("advanced_val",advanced_val);
//           //return res.status(500).json({ message: 'Already added for Advanced Plan Managemnet.' });
//       }
  

//       const premium_query = `SELECT * FROM plan_management WHERE name = 'premium'`;
//       const premium_value = await query(premium_query);
//       if (premium_value.length > 0) {
//           var premium_val = premium_value[0];
//           //console.log("premium_value",premium_val);
//           //return res.status(500).json({ message: 'Already added for Premium Plan Managemnet.' });
//       }

//       const enterprise_query = `SELECT * FROM plan_management WHERE name = 'enterprise'`;
//       const enterprise_value = await query(enterprise_query);
//       if (enterprise_value.length > 0) {
//           var enterprise_val = enterprise_value[0];
//           //console.log("enterprise_val",enterprise_val);
//       }
//       return {basic_val,standard_val,advanced_val,premium_val,enterprise_val}
//     } catch (error) {
//       console.error(error);
//       throw new Error('An error occurred');
//   }
// }

// async function getplans(userCountry) {
//   try {
//       // Example SQL queries to fetch plans
//       const basic_query = `SELECT * FROM plan_management WHERE name = 'Basic'`;
//       const standard_query = `SELECT * FROM plan_management WHERE name = 'standard'`;
//       const advanced_query = `SELECT * FROM plan_management WHERE name = 'advanced'`;
//       const premium_query = `SELECT * FROM plan_management WHERE name = 'premium'`;
//       const enterprise_query = `SELECT * FROM plan_management WHERE name = 'enterprise'`;

//       // Execute SQL queries concurrently using Promise.all
//       const [
//           basic_value,
//           standard_value,
//           advanced_value,
//           premium_value,
//           enterprise_value
//       ] = await Promise.all([
//           query(basic_query),
//           query(standard_query),
//           query(advanced_query),
//           query(premium_query),
//           query(enterprise_query)
//       ]);

//       // Assuming query results are checked for length and have first element accessed
//       const basic_val = basic_value.length > 0 ? basic_value[0] : null;
//       const standard_val = standard_value.length > 0 ? standard_value[0] : null;
//       const advanced_val = advanced_value.length > 0 ? advanced_value[0] : null;
//       const premium_val = premium_value.length > 0 ? premium_value[0] : null;
//       const enterprise_val = enterprise_value.length > 0 ? enterprise_value[0] : null;

//       // Return plans with currency conversion applied based on user's country
//       const plansWithConvertedPrices = {
//           basic_val: convertPrices(basic_val, userCountry),
//           standard_val: convertPrices(standard_val, userCountry),
//           advanced_val: convertPrices(advanced_val, userCountry),
//           premium_val: convertPrices(premium_val, userCountry),
//           enterprise_val: convertPrices(enterprise_val, userCountry)
//       };

//       return plansWithConvertedPrices;
//   } catch (error) {
//       console.error(error);
//       throw new Error('An error occurred while fetching plans');
//   }
// }


// function convertPrices(plan, userCountry) {
//   if (!plan || !userCountry) return null;

//   const exchangeRates = {
//       USD: { INR: 83.4326, JPY: 158.11226}, 
//   };

//   const userCurrency = getUserCurrency(userCountry);

//   let monthlyPriceConverted = plan.monthly_price;
//   let yearlyPriceConverted = plan.yearly_price;
//   let perUserPriceConverted = plan.per_user_price;

//   if (userCurrency !== 'USD') {
//       if (!exchangeRates['USD'][userCurrency]) {
//           console.error(`Conversion rate for ${userCurrency} not defined`);
//           return plan; 
//       }

//       monthlyPriceConverted = (parseFloat(plan.monthly_price) * exchangeRates['USD'][userCurrency]).toFixed(2);
//       yearlyPriceConverted = (parseFloat(plan.yearly_price) * exchangeRates['USD'][userCurrency]).toFixed(2);
//       perUserPriceConverted = (parseFloat(plan.per_user_price) * exchangeRates['USD'][userCurrency]).toFixed(2);
//   }

//   const convertedPlan = {
//       ...plan,
//       monthly_price_local: monthlyPriceConverted,
//       yearly_price_local: yearlyPriceConverted,
//       per_user_price_local: perUserPriceConverted,
//       local_currency: userCurrency 
//   };

//   return convertedPlan;
// }
// function getUserCurrency(userCountry) {
//   const countryCurrencyMap = {
//       'India': 'INR',
//       'Japan': 'JPY',
//   };

//   return countryCurrencyMap[userCountry] || 'USD';
// }


// async function convertPrices(plan, userCountry) {
//   if (!plan || !userCountry) return null;

//   try {
//       const exchangeRatesResponse = await axios.get(`https://open.er-api.com/v6/latest/${plan.currency}`);
//       const exchangeRates = exchangeRatesResponse.data.rates;
      

//       const userCurrency = getUserCurrency(userCountry);

//       let monthlyPriceConverted = plan.monthly_price;
//       let yearlyPriceConverted = plan.yearly_price;
//       let perUserPriceConverted = plan.per_user_price;

//       if (userCurrency !== 'USD') {
//           if (!exchangeRates[userCurrency]) {
//               console.error(`Conversion rate for ${userCurrency} not available`);
//               return plan;
//           }

//           monthlyPriceConverted = (parseFloat(plan.monthly_price) * exchangeRates[userCurrency]).toFixed(2);
//           yearlyPriceConverted = (parseFloat(plan.yearly_price) * exchangeRates[userCurrency]).toFixed(2);
//           perUserPriceConverted = (parseFloat(plan.per_user_price) * exchangeRates[userCurrency]).toFixed(2);
//       }

//       const convertedPlan = {
//           ...plan,
//           monthly_price_local: monthlyPriceConverted,
//           yearly_price_local: yearlyPriceConverted,
//           per_user_price_local: perUserPriceConverted,
//           local_currency: userCurrency
//       };

//       return convertedPlan;
//   } catch (error) {
//       console.error('Error fetching exchange rates:', error.message);
//       return plan;
//   }
// }

async function getplans(userCountry) {
  try {
      // Example SQL queries to fetch plans
      const basic_query = `SELECT * FROM plan_management WHERE name = 'Basic'`;
      const standard_query = `SELECT * FROM plan_management WHERE name = 'standard'`;
      const advanced_query = `SELECT * FROM plan_management WHERE name = 'advanced'`;
      const premium_query = `SELECT * FROM plan_management WHERE name = 'premium'`;
      const enterprise_query = `SELECT * FROM plan_management WHERE name = 'enterprise'`;

      // Execute SQL queries concurrently using Promise.all
      const [
          basic_value,
          standard_value,
          advanced_value,
          premium_value,
          enterprise_value
      ] = await Promise.all([
          query(basic_query),
          query(standard_query),
          query(advanced_query),
          query(premium_query),
          query(enterprise_query)
      ]);

      // Assuming query results are checked for length and have first element accessed
      const basic_val = basic_value.length > 0 ? basic_value[0] : null;
      const standard_val = standard_value.length > 0 ? standard_value[0] : null;
      const advanced_val = advanced_value.length > 0 ? advanced_value[0] : null;
      const premium_val = premium_value.length > 0 ? premium_value[0] : null;
      const enterprise_val = enterprise_value.length > 0 ? enterprise_value[0] : null;

      // Convert prices based on user's country
      const convertedPlans = await Promise.all([
          convertPrices(basic_val, userCountry),
          convertPrices(standard_val, userCountry),
          convertPrices(advanced_val, userCountry),
          convertPrices(premium_val, userCountry),
          convertPrices(enterprise_val, userCountry)
      ]);

      // Return an object with converted plans
      return {
          basic_val: convertedPlans[0],
          standard_val: convertedPlans[1],
          advanced_val: convertedPlans[2],
          premium_val: convertedPlans[3],
          enterprise_val: convertedPlans[4]
      };
  } catch (error) {
      console.error('Error fetching plans:', error);
      throw new Error('An error occurred while fetching plans');
  }
}

async function getCurrency() {
  const getcurrencyquery = `SELECT * FROM currency_conversion`;
  const getcurrencyvalue = await query(getcurrencyquery);
  console.log("getcurrencyvalue", getcurrencyvalue);

  const exchangeRates = {};
  for (const row of getcurrencyvalue) {
      if (row.inr_currency) {
          exchangeRates['INR'] = row.inr_currency;
      }
      if (row.jpy_currency) {
          exchangeRates['JPY'] = row.jpy_currency;
      }
  }

  return exchangeRates;
}

async function convertPrices(plan, userCountry) {
  if (!plan || !userCountry) return null;

  const exchangeRates = await getCurrency();
  const userCurrency = getUserCurrency(userCountry);

  let monthlyPriceConverted = plan.monthly_price;
  let yearlyPriceConverted = plan.yearly_price;
  let perUserPriceConverted = plan.per_user_price;

  if (userCurrency !== 'USD') {
      if (!exchangeRates[userCurrency]) {
          console.error(`Conversion rate for ${userCurrency} not available`);
          return plan;
      }

      monthlyPriceConverted = (parseFloat(plan.monthly_price) * exchangeRates[userCurrency]).toFixed(2);
      yearlyPriceConverted = (parseFloat(plan.yearly_price) * exchangeRates[userCurrency]).toFixed(2);
      perUserPriceConverted = (parseFloat(plan.per_user_price) * exchangeRates[userCurrency]).toFixed(2);
  }

  const convertedPlan = {
      ...plan,
      monthly_price_local: monthlyPriceConverted,
      yearly_price_local: yearlyPriceConverted,
      per_user_price_local: perUserPriceConverted,
      local_currency: userCurrency
  };

  return convertedPlan;
}

function getUserCurrency(userCountry) {
  const countryCurrencyMap = {
      'India': 'INR',
      'Japan': 'JPY',
  };

  return countryCurrencyMap[userCountry] || 'USD';
}



async function getSubscribedUsers(userId){
  try {
    const querys = `SELECT order_history.*, plan_management.name as plan_name FROM order_history LEFT JOIN plan_management ON order_history.plan_id = plan_management.id WHERE user_id = "${userId}" AND payment_status= "success"`;
    const querys_val = await query(querys);

    if(querys_val.length>0){
      console.log("querys_val",querys_val);
    }
    
    return querys_val;
} catch (error) {
    console.error('Error fetching plans:', error);
    throw new Error('An error occurred while fetching plans');
}
}


async function getCompanyCategoriess(country) {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE
    });
    console.log("countryfse",country);

    // Query to fetch categories and their associated country_ids
    const [categories] = await connection.query(`
      SELECT category.*, GROUP_CONCAT(category_country_relation.country_id) AS country_ids
      FROM category
      LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id
      WHERE category_country_relation.country_id= "${country}"
      GROUP BY category.ID
    `);

    console.log("categoriessss", categories);
    connection.end();

    // Build category tree structure
    const nestedCategories = buildCategoryTree(categories);
    const nestedCategoriesHTML = renderCategoryTreeHTML(nestedCategories);

    return nestedCategoriesHTML;
  } catch (error) {
    console.error('Error fetching company categories:', error);
    throw new Error('Error fetching company categories');
  }
}

function renderCategoryTreeHTML(categories) {
  if (categories.length == 0) {
    return '<p>No categories found.</p>';
  }
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

async function getCompanyCategoryBuID(country,compID) {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE
    });

    // const [categories] = await connection.query('SELECT * FROM category');

    console.log("compIDssss",compID);
    console.log("countryaaa",country);

    const [categories] = await connection.query(`
      SELECT category.*, GROUP_CONCAT(category_country_relation.country_id) AS country_ids
      FROM category
      LEFT JOIN category_country_relation ON category.ID = category_country_relation.cat_id
      WHERE category_country_relation.country_id= "${country}"
      GROUP BY category.ID
    `);

    console.log("Fetched categories:", categories);

    const [com_categories] = await connection.query('SELECT category_id FROM company_cactgory_relation WHERE company_id = ?', [compID]);
    console.log("Fetched company categories:", com_categories);

    const com_category_array = com_categories.map((category) => category.category_id);

    console.log("com_category_array",com_category_array);
    connection.end();
    const nestedCategories = buildCategoryTree(categories);   // This is the Json Format Of All Categories
    const nestedCategoriesHTMLwithChecked = renderCategoryTreeHTMLforCompany(nestedCategories, com_category_array);

    return nestedCategoriesHTMLwithChecked;
  } catch (error) {
    throw new Error('Error fetching company categories');
  }
}
function renderCategoryTreeHTMLforCompany(categories, com_category_array) {
  if (categories.length == 0) {
    return '<p>No categories found.</p>';
}
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
 
function buildCategoryTree(categories, parentId = 0) {
  const categoryTree = [];

  categories.forEach((category) => {
    if (category.parent_id === parentId) {
      const children = buildCategoryTree(categories, category.ID);
      const categoryNode = {
        id: category.ID,
        name: category.category_name,
        img: category.category_img,
        country_ids: category.country_ids ? category.country_ids.split(',') : [], 
        children
      };
      categoryTree.push(categoryNode);
    }
  });

  return categoryTree;
}

function encryptEmail(email) {
    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(email, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    console.log("encrypted",encrypted);
    return encrypted;
}

function decryptEmail(encryptedEmail) {
    const decipher = crypto.createDecipher(algorithm, secretKey);
    let decrypted = decipher.update(encryptedEmail, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    console.log("decrypted",decrypted);
    return decrypted;
}

async function userActivation(name,email) {
  var mailOptions = {
    from: process.env.MAIL_USER,
    //to: 'dev2.scwt@gmail.com',
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
                   <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
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
                                    <strong>Hello ${name},</strong>
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
        console.log('Mail Send to user: ', info.response);
        return res.send({
            status: 'ok',
            message: ''
        });

    }
})
}




async function userActivationmailtoAdmin(name, email, phone) {
  var mailOptions = {
    from: process.env.MAIL_USER,
    //to: 'relok28728@furnato.com',
    to: process.env.MAIL_USER,
    subject: 'User Activation Email',
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
                   <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                    <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                       <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">New User Activation</h1>
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
                                    <strong>Hello Dear</strong>
                                    <p style="font-size:15px; line-height:20px">A new user has been successfully activated on CEchoes. Below are the details: </b>.</p>
                                    <p style="font-size:15px; line-height:20px"><strong>User Name:</strong> ${name}</p>
                                    <p style="font-size:15px; line-height:20px"><strong>User Email:</strong> ${email}</p>
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
}
await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
        console.log(err);
        return res.send({
            status: 'not ok',
            message: 'Something went wrong'
        });
    } else {
        console.log('Mail Send to admin: ', info.response);
        return res.send({
            status: 'ok',
            message: ''
        });

    }
})
}

async function companyActivationmailtoAdmin(name) {
  var mailOptions = {
    from: process.env.MAIL_USER,
    //to: 'relok28728@furnato.com',
    to: process.env.MAIL_USER,
    subject: 'Company Activation Email',
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
                   <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                    <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                       <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">New User Activation</h1>
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
                                    <strong>Hello Dear</strong>
                                    <p style="font-size:15px; line-height:20px">A new user has been successfully activated on CEchoes. Below are the details: </b>.</p>
                                    <p style="font-size:15px; line-height:20px"><strong>Company Name:</strong> ${name}</p>
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
}
await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
        console.log(err);
        return res.send({
            status: 'not ok',
            message: 'Something went wrong'
        });
    } else {
        console.log('Mail Send to admin: ', info.response);
        return res.send({
            status: 'ok',
            message: ''
        });

    }
})
}

async function reviewActivationmailtoAdmin(name) {
  var mailOptions = {
    from: process.env.MAIL_USER,
    //to: 'relok28728@furnato.com',
    to: process.env.MAIL_USER,
    subject: 'Review Activation Email',
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
                   <td><img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png"  style="padding: 30px 40px; display: block;  width: 70px;" /></td>
                    <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                       <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">New User Activation</h1>
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
                                    <strong>Hello Dear</strong>
                                    <p style="font-size:15px; line-height:20px">A new review has been successfully activated on CEchoes. Below are the details: </b>.</p>
                                    <p style="font-size:15px; line-height:20px"><strong>Company Name:</strong> ${name}</p>
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
}
await mdlconfig.transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
        console.log(err);
        return res.send({
            status: 'not ok',
            message: 'Something went wrong'
        });
    } else {
        console.log('Mail Send to admin: ', info.response);
        return res.send({
            status: 'ok',
            message: ''
        });

    }
})
}

//send email to levelUsers after expiring eta days 
async function sendemailtolevelUsers() {

  const currentDate = new Date();
  console.log("currentDate", currentDate);

//   const sql = `
//   SELECT *, DATEDIFF(NOW(), created_at) AS daysDifference
//   FROM complaint_level_management 
//   WHERE DATE(created_at) < '${currentDate.toISOString().slice(0, 19).replace('T', ' ')}';
// `;
    // const sql = `
    //   SELECT clm.*, DATEDIFF(NOW(), clm.created_at) AS daysDifference, c.status
    //   FROM complaint_level_management clm
    //   JOIN complaint c ON clm.complaint_id = c.id
    //   WHERE DATE(clm.created_at) < '${currentDate.toISOString().slice(0, 19).replace('T', ' ')}'
    //     AND c.status IN (0, 2);
    // `;
    const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    
    const sql = `
SELECT
    clm.id AS clm_id,
    clm.level,
    clm.eta_days,
    clm.emails,
    clm.company_id,
    DATEDIFF(NOW(), c.created_at) AS daysDifference,
    c.id AS complaint_id,
    c.status
FROM complaint_level_management clm
JOIN complaint c ON clm.company_id = c.company_id
WHERE DATE(c.created_at) < '${formattedDate}'
  AND DATEDIFF(NOW(), c.created_at) > clm.eta_days
  AND c.status IN (0, 2)
  AND c.id IS NOT NULL
GROUP BY clm.id
ORDER BY c.id;

    `;
  
  
  


  try {
    const results = await query(sql);
    if (results.length > 0) {
      console.log("results", results);
      let emailContent = '';
      for (const result of results) {
        var eta_days = result.eta_days;
        console.log("ETA days:", eta_days);
        var daysDifference = result.daysDifference;
        console.log("Days difference:", daysDifference);
        var level = result.level;
        console.log("level", level);
        var company_id = result.company_id;
        console.log("company_id", company_id);
        // var useremail = result.emails;
        // console.log("useremail",useremail);
        var expiration_days = daysDifference - eta_days;
        console.log("expiration_days", expiration_days);

        if (daysDifference > eta_days) {
          var userEmail = result.emails;
          console.log("userEmailsssss", userEmail);



          const complaint_query = `SELECT complaint_assigned_users.complaint_id, complaint.created_at 
        FROM complaint_assigned_users 
        LEFT JOIN complaint ON complaint_assigned_users.complaint_id = complaint.id 
        WHERE complaint_assigned_users.user_email = ?`;

          const complaint_value = await query(complaint_query, [userEmail]);
          console.log("complaint_value", complaint_value);

          if (complaint_value && complaint_value.length > 0) {
            // Accessing the first row of the result
            const firstRow = complaint_value[0];

            // Extracting complaint_id and created_at from the first row
            var complaintId = firstRow.complaint_id;
            console.log("complaintId", complaintId);

            var createdAt = firstRow.created_at;
            console.log("createdAt", createdAt);

            console.log(`Complaints found for useremail ${userEmail}:`, complaint_value);
          } else {
            console.log(`No complaints found for useremail ${userEmail}`);
          }




          const leveluseremails = `SELECT emails FROM company_level_manage_users WHERE company_id = "${company_id}" AND level_user_type = 'manager'`;
          const levelvalue = await query(leveluseremails);
          var level_email = levelvalue[0].emails;
          console.log("levelvalue", levelvalue[0].emails);
          var expirationdays = daysDifference - eta_days;
          console.log("expirationdays", expirationdays);

          // const complaint_query = `SELECT complaint_assigned_users.complaint_id,complaint.created_at FROM complaint_assigned_users LEFT JOIN complaint ON complaint_assigned_users.complaint_id = complaint.id WHERE complaint_assigned_users.user_email = "${useremail}"`;



          emailContent += `
        <tr>
            <td>${complaintId}</td>
            <td>${level}</td>
            <td>${userEmail}</td>
            <td>${createdAt}</td>
            <td>${expiration_days}</td>
        </tr>
    `;

          // Construct the final HTML content including the dynamic rows
          var htmlContent = `<div id="wrapper" dir="ltr" style="background-color: #f5f5f5; margin: 0; padding: 70px 0 70px 0; -webkit-text-size-adjust: none !important; width: 100%;">
        <table height="100%" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tbody>
                <tr>
                    <td align="center" valign="top">
                        <div id="template_header_image">
                            <p style="margin-top: 0;"></p>
                        </div>
                        <table id="template_container" style="box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important; background-color: #fdfdfd; border: 1px solid #dcdcdc; border-radius: 3px !important;" border="0" cellpadding="0" cellspacing="0" width="600">
                            <tbody>
                                <tr>
                                    <td align="center" valign="top">
                                        <!-- Header -->
                                        <table id="template_header" style="background-color: #000; border-radius: 3px 3px 0 0 !important; color: #ffffff; border-bottom: 0; font-weight: bold; line-height: 100%; vertical-align: middle; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif;" border="0" cellpadding="0" cellspacing="0" width="600">
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <img alt="Logo" src="${process.env.MAIN_URL}assets/media/logos/logo.png" style="padding: 30px 40px; display: block;  width: 70px;" />
                                                    </td>
                                                    <td id="header_wrapper" style="padding: 36px 48px; display: block;">
                                                        <h1 style="color: #FCCB06; font-family: &quot;Helvetica Neue&quot;, Helvetica, Roboto, Arial, sans-serif; font-size: 30px; font-weight: bold; line-height: 150%; margin: 0; text-align: left;">ETA date expiration email</h1>
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
                                                        <table border="1" cellpadding="4" cellspacing="0" width="100%">
                                                            <thead>
                                                                <tr>
                                                                    <th>Complaint ID</th>
                                                                    <th>Level</th>
                                                                    <th>Assigned User</th>
                                                                    <th>Complaint generation date</th>
                                                                    <th>Number of expired days</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${emailContent} <!-- Dynamic rows for each user -->
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


        }
      }
      var mailOptions = {
        from: process.env.MAIL_USER,
        //to: 'dev2.scwt@gmail.com',
        to: level_email,
        subject: 'ETA date expiration email',
        html: htmlContent
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
            message: 'Flag Approve'
          });
        }
      })
      console.log(`Email sent to ${level_email} because days difference (${daysDifference}) is greater than ETA days (${eta_days})`);
      return results;
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
//sendemailtolevelUsers()

module.exports = {
  getFaqPage,
  getFaqPages,
  getFaqCategories,
  getFaqItems,
  insertBusinessFeature,
  insertBusinessUpcomingFeature,
  deleteBusinessFeature,
  deleteBusinessUpcomingFeature,
  getBusinessFeature,
  getUpcomingBusinessFeature,
  getReviewedCompanies,
  getAllCompaniesReviews,
  getCompaniesReviewsbyuserId,//
  getAllReviewTags,
  getAlltempReviewTags,//
  getlatestReviews,
  getAllTrendingReviews,
  getAllReviews,
  getPageMetaValues,
  getPageInfo,
  getPageMetaValue,//
  reviewApprovedEmail,
  reviewRejectdEmail,
  getPremiumCompanyData,
  getComplaintAllLevelDetails,//
  geCompanyCategories,
  getcategoriesUsers,//
  getEtaDays,//
  geCompanyCategorieslength,//
  getmanagementUsers,//
  getUserName,
  ReviewReplyTo,
  TotalReplied,
  ReviewReplyToCompany,
  ReviewReplyToCustomer,
  reviewDataById,
  updateReview,
  countLike,
  countDislike,
  getAllReviewVoting,
  updateCustomerReply,
  getCompanyIdBySlug,
  generateUniqueSlug,
  getSubCategories,
  getsubCategories,//
  getCompanyDetails,
  getFilteredCompanyDetails,
  getCompanyPollDetails,
  insertInvitationDetails,
  sendInvitationEmail,
  countInvitationLabels,
  getCompanySurveyCount,
  getCompanySurveyListing,
  getCompanySurveyQuestions,
  addFlagDetails,
  sendFlagEmail,
  getAllFlaggedReviews,
  updateFlagDetails,
  flagApprovedEmail,
  flagRejectdEmail,
  getAllReviewsByCompanyID,
  getAllLatestDiscussion,
  insertDiscussionResponse,
  getAllCommentByDiscusId,
  getAllPopularDiscussion,
  getAllDiscussions,//
  getAllDiscussion,
  getAllViewedDiscussion,
  searchDiscussion,
  getDiscussionsByUserId,
  generateUniqueSlugCategory,
  getCompanyCategories,
  getComplaintLevelDetails,
  getAllComplaintsByCompanyId,
  getuserslistofcompanycategory,//
  getuserslistofescalatecategory,//
  getAllComplaintsByUserId,
  getAllComplaintsByComplaintId,
  getAllComplaintsByCompanyuserId,//
  updateComplaintStatus,
  updateresolveComplaintStatus,//
  complaintEmailToCompany,
  complaintCompanyResponseEmail,
  complaintScheduleEmail,
  getAllPremiumCompany,
  complaintSuccessEmailToUser,
  complaintEmailToCompanylevelUsers,//
  complaintCompanyResolvedEmail,
  updateUserNotificationStatus,
  updateCompanyrNotificationStatus,
  complaintUserResponseEmail,
  updateresolveComplaintStatus,//
  complaintcompanyuserResponseEmail,//
  complaintUserReopenEmail,
  sendSurveyInvitationEmail,
  getPopularTags,
  getDiscussionListingByTag,
  getCompanyCreatedTags,
  duscussionQueryAlert,
  discussionQueryAlertEmail,
  getCompanyHistoricalReviewBetween,
  getSimilarCompany,
  getCompanyCategory,
  insertCompanyProduct,
  getCompanyCategoryProducts,
  getCompanyCategoryByReviewId,
  getCompanyProductByReviewId,
  complaintLevelUpdate,
  getmembershipPlans,
  getAllPayments,
  getAllPaymentHistory,//
  getuserAllPaymentHistory,//
  getpaymentDetailsById,
  getAllPolls,
  getAllComplaints,
  getAllSurveys,
  SurveyInvitationFile,
  SurveyInvitationByArray,
  getSurveyInvitedEmail,
  getSurveyDetails,
  getSurveyDetailsByUniqueId,
  getSurveyemailDetailsByUniqueId,
  countSurveyAnswerByUniqueId,
  getDiscussionByDiscusId,
  getcommentsCount,
  getCompanyProducts,
  getcategories,//
  getsubcategories,//
  getUserLikedComments,
  getCompanySurveyDetailsByID,
  getsurveyratingData,
  getcompaniesbyCountry,
  getCountryName,
  getAllParentCompany,
  getAllnewParentCompany,//
  getChildCompany,
  getPublicIpAddress,//
  getcountrybyIp,
  getcountrynamebyIp,
  getplans,
  getSubscribedUsers,
  getCompanyCategoriess,
  getCompanyCategoryBuID,
  getCurrency,
  encryptEmail,
  decryptEmail,
  userActivation,
  userActivationmailtoAdmin,
  companyActivationmailtoAdmin,
  reviewActivationmailtoAdmin,
  getcomplaintHistory,//
  getresolvedcomplaints,
  getreopencomplaints,
  getlevelusersres,
  sendemailtolevelUsers,//
};
