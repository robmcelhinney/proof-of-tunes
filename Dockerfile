# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install
RUN PUBLIC_URL=/ npm run build

# Remove secrets and source files from the image to prevent leaks
RUN rm -f .env .env.production
WORKDIR /app

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]