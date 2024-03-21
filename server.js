const express = require('express');  // Importing the Express framework
const { graphqlHTTP } = require('express-graphql');  // Importing GraphQL middleware for Express
const { buildSchema } = require('graphql');  // Importing function to build GraphQL schema
const mysql2 = require('mysql2');  // Importing MySQL client
const bcrypt = require('bcrypt');  // Importing bcrypt for password hashing
const jwt = require('jsonwebtoken');  // Importing jsonwebtoken for token generation

const app = express();  // Creating an Express application instance

// Connect to MySQL database
const db = mysql2.createConnection({
    host: 'localhost',  // MySQL host
    user: 'root',  // MySQL user
    password: 'root123',  // MySQL password
    database: 'nodejs'  // MySQL database name
});

// Automatically create database and tables if they don't exist
db.connect(err => {
    if (err) {  // If error occurred while connecting to the database
        console.error('Error connecting to MySQL database: ', err);  // Log the error
        return;
    }
    console.log('Connected to MySQL database');  // Log successful database connection

    // Creating the 'nodejs' database if it doesn't exist
    db.query('CREATE DATABASE IF NOT EXISTS nodejs', (err, result) => {
        if (err) {  // If error occurred while creating database
            console.error('Error creating database: ', err);  // Log the error
            return;
        }
        console.log('Database created or already exists');  // Log successful database creation
    });

    // Creating 'users' table if it doesn't exist
    db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL
        )
    `, (err, result) => {
        if (err) {  // If error occurred while creating table
            console.error('Error creating users table: ', err);  // Log the error
            return;
        }
        console.log('Users table created or already exists');  // Log successful table creation
    });

    // Creating 'posts' table if it doesn't exist
    db.query(`
        CREATE TABLE IF NOT EXISTS posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT,
            content TEXT,
            FOREIGN KEY (userId) REFERENCES users(id)
        )
    `, (err, result) => {
        if (err) {  // If error occurred while creating table
            console.error('Error creating posts table: ', err);  // Log the error
            return;
        }
        console.log('Posts table created or already exists');  // Log successful table creation
    });
});

// Define your GraphQL schema
const schema = buildSchema(`
    type User {
        id: Int
        username: String
        email: String
    }

    type Post {
        id: Int
        userId: Int
        content: String
    }

    type AuthPayload {
        token: String
    }

    type Query {
        users: [User]
        posts(userId: Int!): [Post]
    }

    type Mutation {
        signup(username: String!, email: String!, password: String!): String
        login(email: String!, password: String!): AuthPayload
        addPost(userId: Int!, content: String!): String
    }
`);

// Define your resolvers
const root = {
    // Resolver function for retrieving users
    users: () => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM users', (err, results) => {
                if (err) {  // If error occurred while querying database
                    reject(err);  // Reject the promise with the error
                    return;
                }
                resolve(results);  // Resolve the promise with the query results
            });
        });
    },
    // Resolver function for retrieving posts by userId
    posts: ({ userId }) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM posts WHERE userId = ?', [userId], (err, results) => {
                if (err) {  // If error occurred while querying database
                    reject(err);  // Reject the promise with the error
                    return;
                }
                resolve(results);  // Resolve the promise with the query results
            });
        });
    },
    // Resolver function for user signup
    signup: async ({ username, email, password }) => {
        // Check if any of the fields are empty
        if (!username || !email || !password) {
            return 'Please fill out the form completely'; // Returning an error message for missing fields
        }
    
        // Check if email already exists in the database
        const userExists = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results.length > 0);
            });
        });
    
        if (userExists) {
            return 'Email already in use';
        }
    
        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user data into the database
        return new Promise((resolve, reject) => {
            db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve('User registered successfully');
            });
        });
    },
    // Resolver function for user login
    login: async ({ email, password }) => {
        try {
            const user = await new Promise((resolve, reject) => {
                db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
                    if (err) {  // If error occurred while querying database
                        reject(err);  // Reject the promise with the error
                        return;
                    }
                    resolve(results[0]);  // Resolve with the first user object from the query results
                });
            });
    
            if (!user) {  // If user not found
                throw new Error('Invalid email');  // Throw an error for invalid email
            }
    
            // Compare password with hashed password using bcrypt
            const passwordMatch = await bcrypt.compare(password, user.password);
    
            if (!passwordMatch) {  // If passwords don't match
                throw new Error('Invalid password');  // Throw an error for incorrect password
            }
    
            // Generate JWT token
            const token = jwt.sign({ userId: user.id, username: user.username }, 'yourshreyas', { expiresIn: '1h' });
            return { message: 'User logged in successfully', token };  // Return success message and token
        } catch (error) {
            throw new Error(error.message);  // Throw the error
        }
    },
    // Resolver function for adding a new post
    addPost: ({ userId, content }) => {
        return new Promise((resolve, reject) => {
            // Insert new post into the 'posts' table
            db.query('INSERT INTO posts (userId, content) VALUES (?, ?)', [userId, content], (err, result) => {
                if (err) {  // If error occurred while inserting data
                    reject(err);  // Reject the promise with the error
                    return;
                }
                resolve('Post added successfully');  // Resolve with success message
            });
        });
    }
};

// User Registration Endpoint
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const result = await root.signup({ username, email, password });  // Call signup resolver with user data
    res.status(200).json({ message: result });  // Send response with the result
});

// User Login Endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await root.login({ email, password });  // Call login resolver with user credentials
    if (typeof result === 'string') {  // If result is a string, it means there was an error
        res.status(401).json({ message: result });  // Send unauthorized status with error message
    } else {
        res.status(200).json(result);  // If result is an object, it contains the token, send success status with token
    }
});

// Posting Content Endpoint
app.post('/post', (req, res) => {
    const { userId, content } = req.body;
    db.query('INSERT INTO posts (userId, content) VALUES (?, ?)', [userId, content], (err, result) => {
        if (err) {  // If error occurred while inserting data
            console.error('Error posting content: ', err);  // Log the error
            res.status(500).json({ error: 'Internal server error' });  // Send internal server error status with error message
            return;
        }
        res.status(201).json({ message: 'Post created successfully' });  // Send success status with success message
    });
});

// Following Users Endpoint
app.post('/follow', (req, res) => {
    // Placeholder for follow functionality
    res.status(501).json({ message: 'Not implemented' });  // Send not implemented status with message
});

// Retrieving Posts Endpoint
app.get('/posts', (req, res) => {
    const userId = req.query.userId; // Assuming userId is provided as a query parameter
    if (!userId) {  // If userId is not provided
        res.status(400).json({ error: 'Missing userId parameter' });  // Send bad request status with error message
        return;
    }
    db.query('SELECT * FROM posts WHERE userId = ?', [userId], (err, results) => {
        if (err) {  // If error occurred while querying database
            console.error('Error retrieving posts: ', err);  // Log the error
            res.status(500).json({ error: 'Internal server error' });  // Send internal server error status with error message
            return;
        }
        res.json({ posts: results });  // Send response with retrieved posts
    });
});

// Set up the GraphQL endpoint
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true // Enable GraphiQL interface
}));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
