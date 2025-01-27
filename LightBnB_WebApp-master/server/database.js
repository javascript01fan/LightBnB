const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Client } = require("pg");

//Database connection
const db = new Client({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb"
});

/* const dbQuery = `SELECT properties.*, avg(property_reviews.rating) as average_rating
FROM properties
JOIN property_reviews ON properties.id = property_id
LIMIT 3
`;
db.query(dbQuery).then(res => {
  console.log(res.rows)
}).catch(err=> console.log('Error',err)) */

db.connect(err => {
  if (err) {
    console.log("Error connecting to database", err);
  } else {
    console.log("Connected to database lightbnb");
  }
});
/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const dbQuery = `SELECT * FROM users WHERE email LIKE $1`;
  const values = [`%${email}%`];
  //Test query
  return db
    .query(dbQuery, values)
    .then(res => {
      if (res.rows[0]) {
        return res.rows[0]
      } else {
        return null
      }
    })
    .catch(err => {
      console.log("Query Error Getting user with email Function: ", err.stack);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  // return Promise.resolve(users[id]);
  const dbQuery = `SELECT * FROM users WHERE id = $1`;
  const values = [id];
  return db
    .query(dbQuery, values)
    .then(res => {
      res.rows.forEach(user => {
        return user;
      });
    })
    .catch(err => console.log("error getting user id", err.stack));
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const dbQuery = `INSERT INTO users (name,email, password) VALUES ($1,$2,$3)`
  values = [user.name, user.email, user.password]
  return db.query(dbQuery, values).then(res => {
    console.log('User added to databse!!')
  }).catch(err => console.log('Error inserting data', err.stack))
}
exports.addUser = addUser
/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  // return getAllProperties(null, 2);
  const dbQuery = `SELECT properties.*, reservations.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1
  AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2`;
  const values = [guest_id,limit]
  return db.query(dbQuery,values).then(res => {
    console.log(res.rows)
    return res.rows
  }).catch(err=> console.log('Error getting reservations',err))
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    if (queryParams.length === 1) {
      queryString += `WHERE owner_id = $${queryParams.length}`
    } else {
      queryString += `AND ownder_id = $${queryParams.length}`
    }
  }
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100, options.maximum_price_per_night * 100);
    if (queryParams.length === 2) {
      queryString += `WHERE cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
    } else {
      queryString += `AND cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
    }
  }

   // 4 Add any query that comes after the WHERE clause.
   queryString += `
   GROUP BY properties.id
   `;
   if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
   }
  
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id 
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log(queryString, queryParams);

  // 6
  return db.query(queryString, queryParams)
  .then(res => res.rows);
}
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street, city, province, post_code)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;
  const values = [property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, property.cost_per_night, property.parking_spaces, property.number_of_bathrooms, property.number_of_bedrooms, property.country, property.street, property.city, property.province, property.post_code];
  
  return db.query(queryString, values)
    .then(res => {
      return res.rows[0];
    })
    .catch(err => {
      return console.log('query error:', err);
    })
};
exports.addProperty = addProperty;
