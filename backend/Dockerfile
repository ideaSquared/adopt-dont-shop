FROM node:18

WORKDIR /app

# Install necessary packages
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

# Command to run the application using wait-for
CMD ["/usr/local/bin/wait-for", "database:5432", "--", "npm", "run", "start"]
