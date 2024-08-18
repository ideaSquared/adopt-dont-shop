[![Backend CI](https://github.com/ideaSquared/pet-adoption/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ideaSquared/pet-adoption/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/ideaSquared/pet-adoption/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/ideaSquared/pet-adoption/actions/workflows/frontend-ci.yml)

# Pet Adoption Platform

The Pet Adoption Platform is a full-stack web application designed to facilitate pet adoption, manage rescue organizations, and foster a community around pet welfare. Built with React for the frontend and Node.js for the backend, this platform offers a comprehensive suite of features including user authentication, admin dashboard, pet management, conversations, ratings, and much more.

## Docker commands

`docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build`

### Rebuild the database

```
docker-compose down --volumes
docker-compose up --build
```

_Note: You'll need to restart the backend as initialisation time is slower than the build/run of the backend container_
