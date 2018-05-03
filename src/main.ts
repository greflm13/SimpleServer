import * as express from 'express';
import * as path from 'path';
import * as bodyparser from 'body-parser';
import * as debugsx from 'debug-sx';

import * as http from 'http';
import * as https from 'https';
import * as child from 'child_process';
import * as fs from 'fs';

process.env['DEBUG'] = '*';
process.env['DEBUG_COLORS'] = 'true';
process.env['DEBUG_STREAM'] = 'stdout';
let date = new Date().toLocaleDateString();
let time = new Date();
const debug: debugsx.IFullLogger = debugsx.createFullLogger('main');
let consolelogger: debugsx.IHandler = debugsx.createConsoleHandler('stdout', '*', '-*', [
  { level: /INFO*/, color: 'cyan', inverse: true },
  { level: /FINE*/, color: 'white', inverse: true },
  { level: /SEVERE*/, color: 'red', inverse: true },
  { level: 'ERR', color: 'red', inverse: true },
  { level: 'WARN', color: 'magenta', inverse: true }
]);
let filelogger: debugsx.IHandler = debugsx.createFileHandler(
  path.join(
    __dirname,
    '../logs/' + date + '_' + time.getHours() + '-' + time.getMinutes() + '-' + time.getSeconds() + '-' + time.getMilliseconds() + '.log'
  ),
  '*',
  '-*',
  [
    { level: /INFO*/, color: 'cyan', inverse: true },
    { level: /FINE*/, color: 'white', inverse: true },
    { level: /SEVERE*/, color: 'red', inverse: true },
    { level: 'ERR', color: 'red', inverse: true },
    { level: 'WARN', color: 'magenta', inverse: true }
  ]
);
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
app.use(express.static(path.join(__dirname, '../www')));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));
app.use(error404Handler);
app.use(errorHandler);

const httpport: number = parseInt(fs.readFileSync(path.join(__dirname, '../http')).toString());
const httpsport: number = parseInt(fs.readFileSync(path.join(__dirname, '../https')).toString());
const appredirect = express();
appredirect.get('*', function(req, res) {
  res.redirect('https://' + req.headers.host + ':' + httpsport + '/' + req.url);
});

const privKey = fs.readFileSync('/home/pi/privkey.pem', 'utf8');
const cert = fs.readFileSync('/home/pi/fullchain.pem', 'utf8');
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

function error404Handler(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientSocket = req.socket.remoteAddress + ':' + req.socket.remotePort;
  debug.warn('Error 404 for %s %s from %s', req.method, req.url, clientSocket);
  res.status(404).sendFile(path.join(__dirname, 'views/error404.html'));
}

function errorHandler(err: express.Errback, req: express.Request, res: express.Response, next: express.NextFunction) {
  const ts = new Date().toLocaleString();
  if (err.toString().startsWith('Error: ENOENT')) {
    res.sendFile(path.join(__dirname, './views/update.html'));
    debug.warn('Update deploying...');
  } else {
    debug.severe('Error %s\n%e', ts, err);
    res.status(500).render('error500.pug', {
      time: ts,
      err: err,
      href: 'mailto:greflm13@htl-kaindorf.ac.at?subject=Füttr server failed ' + ts + ' with Error: ' + err,
      serveradmin: 'Florian Greistorfer'
    });
  }
}

function logger(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientSocket = req.socket.remoteAddress + ':' + req.socket.remotePort;
  debug.info(req.method, req.url, clientSocket);
  next();
}
