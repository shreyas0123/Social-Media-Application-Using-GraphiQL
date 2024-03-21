# Social Media Application
**Short project description goes here**

## Features
#### 1. User Authentication:
+ Users can securely sign up for accounts and log in using their credentials
+ The authentication process includes password hashing for enhanced security, ensuring that user passwords are not stored in plain text

#### 2. Posting Content:
+ Authenticated users have the ability to create posts
+ Posts are associated with the user who created them, allowing for personalized content creation and management

#### 3. Retrieving Posts:
+ Users can retrieve posts based on their user ID
+ This feature enables users to access their own posts or view posts created by others, depending on their access permissions

#### 4. GraphQL Endpoint:
+ The API provides a GraphQL endpoint accessible at /graphql
+ This endpoint offers a GraphiQL interface, allowing users to interactively explore and query the API's capabilities
+ GraphQL offers a flexible and efficient way to query and manipulate data, providing a more tailored experience compared to traditional RESTful APIs

## Technologies
+ Node.js
+ Express.js
+ GraphQL
+ MySQL
+ bcrypt
+ jsonwebtoken (JWT)
+ express-graphql

