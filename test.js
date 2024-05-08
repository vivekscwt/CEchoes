const mysql = require('mysql2/promise');
const dotenv = require('dotenv');


dotenv.config({ path: './.env' });
// Create a MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

async function buildCategoryTree() {
  const connection = await pool.getConnection();

  try {
    // Fetch categories from the database
    const [categories] = await connection.query('SELECT * FROM category');

    // Recursive function to build the category tree
    function buildTree(parentId = 0) {
      const categoryTree = [];

      categories.forEach((category) => {
        if (category.parent_id === parentId) {
          const children = buildTree(category.ID);
          const categoryNode = { id: category.ID, name: category.category_name, children };
          categoryTree.push(categoryNode);
        }
      });

      return categoryTree;
    }

    // Build the category tree
    const categoryTree = buildTree();

    return categoryTree;
  } finally {
    // Release the database connection
    connection.release();
  }
}

// Usage example
buildCategoryTree()
  .then((categoryTree) => {
    console.log(categoryTree);
  })
  .catch((error) => {
    console.error('Error building category tree:', error);
  });


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
          // Get User Info
          //return res.status(400).json({ message: 'Email ID already exists.' });
          const userAgent = req.headers['user-agent'];
          const agent = useragent.parse(userAgent);
  
          db.query('SELECT * FROM users WHERE email = ?', [userData.emails[0].value], async (err, results) => {
            if (err) {
              console.log('An error occurred while processing your request' + err);
            } else {
              if (results.length > 0) {
                const userMatch = results[0];
                const query = `SELECT user_meta.*, c.name as country_name, s.name as state_name
                              FROM user_customer_meta user_meta
                              JOIN countries c ON user_meta.country = c.id
                              JOIN states s ON user_meta.state = s.id
                              WHERE user_id = ?`;
                db.query(query, [userMatch.user_id], async (err, results) => {
                  
                  if (results.length > 0) {
                    const user_meta = results[0];
                    const dateString = user_meta.date_of_birth;
                    const date_of_birth_date = new Date(dateString);
                    const formattedDate = date_of_birth_date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  
                    let usercookieData = {
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
                      profile_pic: user_meta.profile_pic
                    };
                    const encodedUserData = JSON.stringify(usercookieData);
                    res.cookie('user', encodedUserData);
                    console.log(encodedUserData, 'login user data');                  
                  }else{
                    // Set a cookie
                    let usercookieData = {
                        user_id: userMatch.user_id,
                        first_name: userMatch.first_name,
                        last_name: userMatch.last_name,
                        email: userMatch.email,
                        phone: userMatch.phone,
                        user_type_id: userMatch.user_type_id,
                        profile_pic: userData.photos[0].value
                    };
                    const encodedUserData = JSON.stringify(usercookieData);
                    res.cookie('user', encodedUserData);
                  }
                  //-- check last Login Info-----//
                  const device_query = "SELECT * FROM user_device_info WHERE user_id = ?";
                  db.query(device_query, [userMatch.user_id], async (err, device_query_results) => {
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
                          const values = [agent.toAgent() + ' ' + agent.os.toString(), requestIp.getClientIp(req), formattedDate, userMatch.user_id];
                          db.query(device_update_query, values, (err, device_update_query_results) => {
                              //
                          })
                      } else {
                          // User doesnot exist Insert New Row.
  
                          const device_insert_query = 'INSERT INTO user_device_info (user_id, device_id, device_token, imei_no, model_name, make_name, IP_address, last_logged_in, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                          const values = [userMatch.user_id, agent.toAgent() + ' ' + agent.os.toString(), '', '', '', '', requestIp.getClientIp(req), formattedDate, formattedDate];
  
                          db.query(device_insert_query, values, (err, device_insert_query_results) => {
                              //
                          })
  
                      }
                  })
  
                  (async () => {
                      //---- Login to Wordpress Blog-----//
                      //let wp_user_data;
                      try {
                          const userLoginData = {
                              email: email,
                              password: 'a@Sm!In00#',
                          };
                          const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/login', userLoginData);
                          const wp_user_data = response.data.data;
  
                          
                      } catch (error) {
                          console.error('User login failed. Error:', error);
                          if (error.response && error.response.data) {
                            console.log('Error response data:', error.response.data);
                          }
                      }
                  })();
  
                })
              }
            }
          })
      }else{
        // Hash the password asynchronously
        const hashedPassword = await bcrypt.hash('a@Sm!In00#', 8);
        const currentDate = new Date();
  
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');
  
        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
        const userInsertQuery = 'INSERT INTO users (first_name, last_name, email, password, register_from, external_registration_id, user_registered, user_status, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(userInsertQuery, [userData.name.givenName, userData.name.familyName, userData.emails[0].value, hashedPassword, 'google', userData.id, formattedDate, 1, 2], (err, userResults) => {
            if (err) {
                console.error('Error inserting user into "users" table:', err);
            }
            const registeredUserID = userResults.insertId;
            // Insert the user into the "user_customer_meta" table
            const userMetaInsertQuery = 'INSERT INTO user_customer_meta (user_id, address, country, state, city, zip, review_count, date_of_birth, occupation, gender, profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            db.query(userMetaInsertQuery, [registeredUserID, '', '', '', '', '', 0, '', '', '', userData.photos[0].value], async (err, metaResults) => {
                if (err) {
                    console.log('An error occurred while processing your request' + err);
                }
                // Set a cookie
                // let userCookieData = {
                //   user_id: registeredUserID,
                //   first_name: userData.name.givenName,
                //   last_name: userData.name.familyName,
                //   email: userData.emails[0].value,
                //   user_type_id: 2,
                //   profile_pic: userData.photos[0].value
                // };
                //const encodedUserData = JSON.stringify(userCookieData);
                //res.cookie('user', encodedUserData);
                const userRegistrationData = {
                    username: userData.emails[0].value,
                    email: userData.emails[0].value,
                    password: 'a@Sm!In00#',
                    first_name: userData.name.givenName,
                    last_name: userData.name.familyName,
                    node_userID: registeredUserID,
                    profile_pic: userData.photos[0].value
                };
                

                try {
                  const response = await axios.post(process.env.BLOG_API_ENDPOINT + '/register', userRegistrationData);
                  console.log(userRegistrationData);
                  return userRegistrationData;
                } catch (error) {
                  console.error('Error during user registration:', error);
                  throw error; // Re-throw the error to be caught in the calling function if needed
                }
                
                
            })
        })
      }
    }
    catch (error) {
      console.error('Error during user registration:', error);
    }
  };