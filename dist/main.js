"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const bodyparser = require("body-parser");
const debugsx = require("debug-sx");
const http = require("http");
const https = require("https");
const fs = require("fs");
process.env['DEBUG'] = '*';
process.env['DEBUG_COLORS'] = 'true';
process.env['DEBUG_STREAM'] = 'stdout';
let date = new Date().toLocaleDateString();
let time = new Date();
const debug = debugsx.createFullLogger('main');
let consolelogger = debugsx.createConsoleHandler('stdout', '*', '-*', [
    { level: /INFO*/, color: 'cyan', inverse: true },
    { level: /FINE*/, color: 'white', inverse: true },
    { level: /SEVERE*/, color: 'red', inverse: true },
    { level: 'ERR', color: 'red', inverse: true },
    { level: 'WARN', color: 'magenta', inverse: true }
]);
let filelogger = debugsx.createFileHandler(path.join(__dirname, '../logs/' + date + '_' + time.getHours() + '-' + time.getMinutes() + '-' + time.getSeconds() + '-' + time.getMilliseconds() + '.log'), '*', '-*', [
    { level: /INFO*/, color: 'cyan', inverse: true },
    { level: /FINE*/, color: 'white', inverse: true },
    { level: /SEVERE*/, color: 'red', inverse: true },
    { level: 'ERR', color: 'red', inverse: true },
    { level: 'WARN', color: 'magenta', inverse: true }
]);
debugsx.addHandler(consolelogger, filelogger);
const app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, '/views'));
const pugEngine = app.set('view engine', 'pug');
pugEngine.locals.pretty = true;
app.use(logger);
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, './public/favicon.ico')));
app.use(express.static(path.join(__dirname, './public')));
app.use(express.static(path.join(__dirname, '../../www')));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));
app.use(error404Handler);
app.use(errorHandler);
const appredirect = express();
appredirect.get('*', function (req, res) {
    res.redirect('https://' + req.headers.host + req.url);
});
const httpport = 8080;
const httpsport = 8443;
const privKey = fs.readFileSync(path.join(__dirname, '../privkey.pem'), 'utf8');
const cert = fs.readFileSync(path.join(__dirname, '../fullchain.pem'), 'utf8');
const credentials = { key: privKey, cert: cert };
const server = http.createServer(appredirect).listen(httpport, () => {
    debug.info('HTTP Server running on port ' + httpport);
    server.on('close', () => {
        debug.fine('HTTP Server stopped.');
    });
    server.on('err', err => {
        debug.severe(err);
    });
});
const sserver = https.createServer(credentials, app).listen(httpsport, () => {
    debug.info('HTTPS Server running on port ' + httpsport);
    sserver.on('close', () => {
        debug.fine('HTTPS Server stopped.');
    });
    sserver.on('err', err => {
        debug.severe(err);
    });
});
function error404Handler(req, res, next) {
    const clientSocket = req.socket.remoteAddress + ':' + req.socket.remotePort;
    debug.warn('Error 404 for %s %s from %s', req.method, req.url, clientSocket);
    res.status(404).sendFile(path.join(__dirname, 'views/error404.html'));
}
function errorHandler(err, req, res, next) {
    const ts = new Date().toLocaleString();
    if (err.toString().startsWith('Error: ENOENT')) {
        res.sendFile(path.join(__dirname, './views/update.html'));
        debug.warn('Update deploying...');
    }
    else {
        debug.severe('Error %s\n%e', ts, err);
        res.status(500).render('error500.pug', {
            time: ts,
            err: err,
            href: 'mailto:greflm13@htl-kaindorf.ac.at?subject=Füttr server failed ' + ts + ' with Error: ' + err,
            serveradmin: 'Florian Greistorfer'
        });
    }
}
function logger(req, res, next) {
    const clientSocket = req.socket.remoteAddress + ':' + req.socket.remotePort;
    debug.info(req.method, req.url, clientSocket);
    next();
}

//# sourceMappingURL=main.js.map
