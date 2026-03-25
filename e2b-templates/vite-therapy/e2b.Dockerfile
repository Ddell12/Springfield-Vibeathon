FROM node:20-slim

WORKDIR /home/user/app

# Copy template files
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Start Vite dev server
CMD ["npm", "run", "dev"]
