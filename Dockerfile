# Use an official Node runtime as a base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json .
COPY package-lock.json .

# Install dependencies
RUN npm install

# Copy the entire project to the working directory
COPY . .

# Expose port 3000 to the outside world
EXPOSE 3000

# Command to run the React application in development mode
CMD ["npm", "start"]