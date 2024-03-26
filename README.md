[![Backend CI](https://github.com/ideaSquared/pet-adoption/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ideaSquared/pet-adoption/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/ideaSquared/pet-adoption/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/ideaSquared/pet-adoption/actions/workflows/frontend-ci.yml)

# Pet Adoption Platform

The Pet Adoption Platform is a full-stack web application designed to facilitate pet adoption, manage rescue organizations, and foster a community around pet welfare. Built with React for the frontend and Node.js for the backend, this platform offers a comprehensive suite of features including user authentication, admin dashboard, pet management, conversations, ratings, and much more.

## Features

- **User Authentication**: Secure signup and login functionalities for adopters, rescues, and admins.
- **Admin Dashboard**: An interface for administrators to manage users, pets, rescues, conversations, and logs.
- **Pet Management**: Allows users and rescues to add, update, and adopt pets.
- **Messaging**: Enables users to communicate with rescues directly through the platform.
- **Ratings**: Users can rate pets, rescues can rate users to find the perfect match

## Getting Started

### Prerequisites

- Node.js
- MongoDB
- Git (optional)

### Installation

1. Clone the repository (if you're using Git):
   ```
   git clone https://yourrepositoryurl.com/pet-adoption-react.git
   ```
2. Navigate to the project directory:
   ```
   cd pet-adoption-react
   ```
3. Install dependencies for both frontend and backend:
   ```
   cd backend
   npm install
   cd ../
   npm install
   ```
4. Create a `.env` file in the `backend` directory with your MongoDB URI and other environment variables:

   ```
   MONGODB_URI=your_mongodb_uri
   SECRET_KEY=your_jwt_secret
   CHARITY_COMMISSION_API_KEY=your_charity_commission_api_key
   COMPANIES_HOUSE_API_KEY=your_company_house_api_key
   VALID_COMPANY_HOUSE_NUMBER=a_valid_company_house_number
   INVALID_COMPANY_HOUSE_NUMBER=an_invalid_company_house_number
   VALID_CHARITY_REGISTER_NUMBER=a_valid_charity_reference_number
   INVALID_CHARITY_REGISTER_NUMBER=an_invalid_charity_reference_number
   SENTRY_DSN=your_sentry_dsn
   SENTRY_ENVIRONMENT=local/production
   MAIL_HOST=your_mail_host
   MAIL_PORT=your_mail_port
   MAIL_USER=your_mail_user
   MAIL_PASS=your_mail_pass
   ```

   _Note: The CH/CR number should probably be coded in the tests directly - on the backlog_

5. Start the backend server:
   ```
   cd backend
   npm run dev
   ```
6. Start the frontend server (_in the root directory_):
   ```
   npm run dev
   ```
   This will open the application in your default web browser.

### Testing

Run the tests using the following command respective of the backend/frontend:
`npm test`

## Usage

After starting the application, navigate through the web interface to access its features. The platform is intuitive and designed for easy navigation.

## Contributing

Contributions to the Pet Adoption Platform are welcome! Here's how you can contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a pull request.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Alex Jenkinson - alexjenkinson@ideasquared.co.uk

Project Link: [https://github.com/yourusername/pet-adoption-react](https://github.com/yourusername/pet-adoption-react)
