[![Backend CI](https://github.com/ideaSquared/pet-adoption/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ideaSquared/pet-adoption/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/ideaSquared/pet-adoption/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/ideaSquared/pet-adoption/actions/workflows/frontend-ci.yml)

Next To-Do:

- Add front-end interactive validation
- Add testing for frontend
- Add testing for backend
- Build models
- Develop pets
- Develop rescues

```
pet-adoption-react
├─ .github
│  └─ workflows
│     ├─ backend-ci.yml
│     └─ frontend-ci.yml
├─ .gitignore
├─ backend
│  ├─ index.js
│  ├─ middleware
│  │  ├─ authenticateToken.js
│  │  └─ checkAdmin.js
│  ├─ models
│  │  ├─ Conversation.js
│  │  ├─ Message.js
│  │  ├─ Pet.js
│  │  ├─ Rating.js
│  │  ├─ Rescue.js
│  │  └─ User.js
│  ├─ mongoConnection.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ adminRoutes.js
│  │  └─ authRoutes.js
│  ├─ server.js
│  ├─ services
│  │  └─ emailService.js
│  ├─ test
│  │  ├─ adminRoutes.test.js
│  │  ├─ authRoutes.test.js
│  │  └─ database.js
│  └─ utils
│     └─ tokenGenerator.js
├─ index.html
├─ package-lock.json
├─ package.json
├─ public
│  └─ vite.svg
├─ README.md
├─ src
│  ├─ App.css
│  ├─ App.jsx
│  ├─ assets
│  │  └─ react.svg
│  ├─ components
│  │  ├─ AdminDashboard.jsx
│  │  ├─ AlertComponent.jsx
│  │  ├─ AuthContext.jsx
│  │  ├─ ChangeDetailsForm.jsx
│  │  ├─ CreateAccountForm.jsx
│  │  ├─ ForgotPasswordForm.jsx
│  │  ├─ HomePage.jsx
│  │  ├─ LoginForm.jsx
│  │  ├─ Navbar.jsx
│  │  ├─ ResetPasswordForm.jsx
│  │  └─ tests
│  │     ├─ AdminDashboard.test.jsx
│  │     ├─ ChangeDetailsForm.test.jsx
│  │     ├─ CreateAccountForm.test.jsx
│  │     ├─ ForgotPasswordForm.test.jsx
│  │     ├─ LoginForm.test.jsx
│  │     ├─ ResetPasswordForm.test.jsx
│  │     └─ setupTests.js
│  ├─ index.css
│  └─ main.jsx
└─ vite.config.js

```
