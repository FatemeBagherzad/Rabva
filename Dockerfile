FROM 192.168.2.2:5000/node:24-alpine

ADD . /app
WORKDIR /app
RUN npm install

EXPOSE 3004
CMD ["npm", "run", "dev"]

