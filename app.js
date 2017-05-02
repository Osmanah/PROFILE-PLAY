'use strict';

// postgresql et express

const express    = require('express');
const pg         = require('pg');
const bodyParser = require('body-parser');
const app        = express();
const client   = require('pg-client');
const pgURL      = process.env.DATABASE_URL || 'postgres://myfirstdb:12345@localhost/Datapromo';

// upload image dure

const Fs = require('fs');
const Path = require('path');
const Os = require('os');
const restify = require('restify');
const server = restify.createServer({name: 'Portfolio'});
const PHOTOS_DIR = 'photos';

app.use(restify.bodyParser({
  maxBodySize: 0,
  mapParams: true,
  mapFiles: false,
  overrideParams: false,
  keepExtensions: false,
  uploadDir: Os.tmpdir(),
  multiples: true,
  hash: 'sha1'
}));

// directory views
app.use(express.static(__dirname +'/views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true }));

// recuperer les datas de postgresql

app.get('/', (req, res) => {
    console.log(pgURL);
    pg.connect(pgURL, (error, client, done) => {
        console.log(error);
        client.query('SELECT * FROM promotable', [], (error, result) => {
            console.log(error);
             done();
             const userHandler = result.rows;
             console.log(userHandler);
             res.render('index', {userHandler})
        })
    })
});

// recuperer les image dure

app.get('/photos', (req, res, next) => {
  Fs.readdir(PHOTOS_DIR, (err, files) => {
     const photos = files.reduce((memo, file) => {
       if(!file.startsWith('.')) {
         memo.push({
           url: Path.join(PHOTOS_DIR, file),
           title: file.split('.')[0]
         });
       }
       return memo;
     }, []);
    res.send(photos);
  });
});

// envoyer les data au postgresql et les images dans le dossier photos

app.post('/photos', (req, res) => {
  const post = {Id: req.body.Id, Name: req.body.Name, Index: req.body.Index};
  console.log('Variables', post);
    console.log(pgURL);
    pg.connect(pgURL, (error, client, done) => {

        client.query('INSERT INTO promotable VALUES ($1, $2, $3);', [post.Id, post.Name, post.Index],  (error, result) => {
             done();
        })
    })
    let extension;
    switch(req.files.file.type) {
      case 'image/gif':
        extension = '.gif';
        break;
      case 'image/jpeg':
        extension = '.jpg';
        break;
      case 'image/png':
        extension = '.png';
        break;
      default:
        extension = null;
    }
    if(extension != null) {
      Fs.createReadStream(req.files.file.path)
        .pipe(Fs.createWriteStream(Path.join(PHOTOS_DIR, req.body.title + extension)))
        .on('error', (err) => {
          console.log('ERROR', err);
        })
        .on('finish', () => {
          console.log('Fini');
          res.send(201);
        });
    } else {
      res.send(400, `Not supported type: ${req.files.file.type}`);
    }
});


app.get('/photos/:title', (req, res, next) => {
  Fs.createReadStream(Path.join(PHOTOS_DIR, req.params.title))
  .pipe(res);
});

app.get(/\/.*/, (req, res) =>{

  res.render('index.ejs');
});

// porte

app.listen(3010, () => {
  console.log("server running on port 3010");
});
