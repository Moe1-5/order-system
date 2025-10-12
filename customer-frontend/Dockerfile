#customer-frontend 


FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
# COPY yarn.lock ./ # If using yarn
RUN npm install # Or: RUN yarn install --frozen-lockfile
COPY . .
RUN npm run build # Creates /app/dist (or /app/build)

# Stage 2: Serve static files with Nginx
FROM nginx:1.25-alpine-slim
RUN rm -rf /usr/share/nginx/html/*
# !!! CRITICAL: Change '/app/dist' if this frontend's build output is different (e.g., '/app/build') !!!
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]