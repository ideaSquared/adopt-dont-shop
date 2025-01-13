FROM node:18

WORKDIR /app

# Install necessary packages
RUN apt-get update && apt-get install -y netcat-openbsd

COPY package*.json ./
RUN npm install

COPY . .

# Compile TypeScript before starting the application
RUN npm run build

EXPOSE 5000

# Command to run the application using wait-for
CMD ["npm", "run", "dev"]
