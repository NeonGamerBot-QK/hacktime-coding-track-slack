require('dotenv').config();
const { Database } = require('secure-db');
const db = new Database('userdata');
const heartStore = new Database('hearts');
console.log(db.all())
console.log(heartStore.all())