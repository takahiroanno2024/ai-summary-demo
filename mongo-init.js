const username = process.env.MONGO_APP_USERNAME;
const password = process.env.MONGO_APP_PASSWORD;

db = db.getSiblingDB('comment-system');

db.createUser({
  user: username,
  pwd: password,
  roles: [
    { role: 'readWrite', db: 'comment-system' }
  ]
});