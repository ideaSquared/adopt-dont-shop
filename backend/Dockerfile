FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y netcat-openbsd

COPY package*.json ./
RUN npm install

COPY . .

# Compile TypeScript before starting the application
RUN npm run build

# Ensure the dist directory exists
RUN ls -la /app/dist

# Copy the wait-for script
COPY wait-for /usr/local/bin/wait-for
RUN chmod +x /usr/local/bin/wait-for

EXPOSE 5000

# Use the script to wait for the database service before starting the app
CMD ["/usr/local/bin/wait-for", "db:5432", "--", "npm", "run", "start"]
