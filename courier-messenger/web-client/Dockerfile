FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# В реальном проекте для продакшена лучше использовать nginx и билд,
# но для удобства разработки оставим dev server
EXPOSE 3000

CMD ["npm", "start"]
