[![Backend CI](https://github.com/ideaSquared/pet-adoption/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ideaSquared/pet-adoption/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/ideaSquared/pet-adoption/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/ideaSquared/pet-adoption/actions/workflows/frontend-ci.yml)

To-Do:

- Input type validation across backend, with tests
- Input type validation on front-end

```
pet-adoption-react
├─ .github
│  └─ workflows
│     ├─ backend-ci.yml
│     └─ frontend-ci.yml
├─ .gitignore
├─ backend
│  ├─ .env
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
│  │  ├─ AccountTypeSelection.jsx
│  │  ├─ AdminDashboard.jsx
│  │  ├─ AlertComponent.jsx
│  │  ├─ AuthContext.jsx
│  │  ├─ ChangeDetailsForm.jsx
│  │  ├─ CharityForm.jsx
│  │  ├─ CompanyForm.jsx
│  │  ├─ ContactUs.jsx
│  │  ├─ CreateAccountForm.jsx
│  │  ├─ ForgotPasswordForm.jsx
│  │  ├─ HomePage.jsx
│  │  ├─ LoginForm.jsx
│  │  ├─ Navbar.jsx
│  │  ├─ PetActionSelection.jsx
│  │  ├─ ResetPasswordForm.jsx
│  │  └─ tests
│  │     ├─ AdminDashboard.test.jsx
│  │     ├─ ChangeDetailsForm.test.jsx
│  │     ├─ CreateAccountForm.test.jsx
│  │     ├─ ForgotPasswordForm.test.jsx
│  │     ├─ LoginForm.test.jsx
│  │     └─ setupTests.js
│  ├─ index.css
│  └─ main.jsx
└─ vite.config.js

```
