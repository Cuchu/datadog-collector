const express = require('express');
const bodyParser = require('body-parser');

const config = require('./config');
const mongo  = require("./mongo");
const utils  = require("./utils");

const app = express()
app.use(bodyParser.json());

var countCheck = countIntake = countSeries = 0;
var client = mongo.connect(config.connectionMongo);

app.post('/api/v1/series', function(req, res) {

    res.sendStatus(200);

    file = `dataS${countSeries}.json`;
    console.log("Metrics received: "+req.body.series.length);
    
    client.then(function(db) {
        saveData = utils.saveData(req.body, db);
        saveData.then(function(count) {
            console.log("Metrics inserted: "+ count);
        });
    });
});

app.post('/api/v1/check_run', function(req, res) {
    file = `dataI${countCheck}.json`;
    utils.readAndWrite(req.body, file);
    countCheck++;
    res.sendStatus(200);
});

app.post('/intake', function(req, res) {
    file = `dataI${countIntake}.json`;
    utils.readAndWrite(req.body, file);
    countIntake++;
    res.sendStatus(200);
});

app.listen(8125, function () {
  console.log('OK, app listening on port 8125!')
});