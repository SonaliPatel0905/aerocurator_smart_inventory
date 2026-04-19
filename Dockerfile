FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Load backend dependencies
WORKDIR /usr/src/app/backend
COPY backend/package*.json ./
RUN npm install --production

# Bundle app source (Backend and Frontend)
WORKDIR /usr/src/app
COPY backend ./backend
COPY frontend ./frontend

EXPOSE 5000

# Start Native Node Environment
WORKDIR /usr/src/app/backend
CMD [ "node", "server.js" ]
