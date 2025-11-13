const express = require('express');
const app = express();
__path = process.cwd()
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000;
let server = require('./qr'),
    code = require('./pair');
require('events').EventEmitter.defaultMaxListeners = 500;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/server', server);
app.use('/code', code);
app.use('/', async (req, res, next) => {
    res.sendFile(__path + '/pair.html')
})

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║   JawadTechX WhatsApp Session Generator   ║
║   Server running on port ${PORT}              ║
╚════════════════════════════════════════╝
    `)
})

module.exports = app
