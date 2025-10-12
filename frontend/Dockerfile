#frontend 

# Dockerfile for Your Vite Frontend

# ----- Stage 1: Build the Vite application -----
# Use an official Node.js image as a parent image.
# 'alpine' versions are smaller. Choose a Node version compatible with your project.
FROM node:18-alpine AS build-stage

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
# This step is separate to leverage Docker's layer caching.
# If only your code changes, Docker can reuse the unchanged dependency layer.
COPY package*.json ./
# If using yarn, also copy yarn.lock:
# COPY yarn.lock ./

# Install project dependencies
# If using npm:
RUN npm install
# If using yarn:
# RUN yarn install --frozen-lockfile

# Copy the rest of your application source code into the container
COPY . .

# Build your Vite application for production
# This runs the 'build' script from your package.json (e.g., "vite build")
# The output will typically be in a 'dist' folder inside /app (so /app/dist)
RUN npm run build

# ----- Stage 2: Serve the static files with Nginx -----
# Use an official Nginx image. 'alpine-slim' is very lightweight.
FROM nginx:1.25-alpine-slim

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the build output (static files) from the 'build-stage'
# from /app/dist (where Vite put them) into Nginx's default web server directory.
# !!! IMPORTANT: If your Vite build output folder is NOT 'dist', change '/app/dist' below !!!
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy your custom Nginx configuration file (nginx.conf) into the Nginx configuration directory.
# This will overwrite the default Nginx configuration.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Tell Docker that the container will listen on port 80 at runtime
# (Nginx listens on port 80 by default)
EXPOSE 80

# Command to run when the container starts: Start Nginx in the foreground.
# "daemon off;" is important so Docker knows the main process is Nginx and keeps the container running.
CMD ["nginx", "-g", "daemon off;"]