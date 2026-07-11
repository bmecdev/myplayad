FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY server.js ./

EXPOSE 58080

CMD ["node", "server.js"]
