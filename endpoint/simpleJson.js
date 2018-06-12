'use strict';

var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var app = express();
var curlify = require('request-as-curl');
var rp = require('request-promise-native');

const config = require('./config');

var timeout = process.env.TIMEOUT;

var hosts = config.hosts;

app.use(morgan('combined'));
app.use(bodyParser.json());

function setCORSHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "accept, content-type");
}

app.all('/', function(req, res) {
    setCORSHeaders(res);
    console.log(curlify(req, req.body));
    res.send('https://grafana.com/plugins/grafana-simple-json-datasource\n');
    res.end();
});

var search_result = [];
app.all('/search', function(req, res) {
    search_result = [];

    var results = hosts.map(
        function(host, index) {
            var options = {method: 'POST',uri: host + '/search',body: req.body,timeout: timeout,json: true};

            return rp(options)
                .then(function(parsedBody) {
                    if (search_result.length == 0) {
                        search_result = parsedBody;
                    } else {
                        var values = parsedBody;
                        for (var i = 0; i < values.length; i++) {
                            if (search_result.indexOf(values[i]) === -1) {
                                search_result.push(values[i]);
                            }
                        }
                        search_result.sort();
                    }

                    return search_result;
                })
                .catch(function(err) {
                    return err;
                });
        }
    );

    Promise.all(results).then(function(value) {
        setCORSHeaders(res);
        res.json(search_result);
        res.end();
    }, reason => {
        console.log(reason)
        res.status(500).send(reason);
    });
});

app.all('/query', function(req, res) {
    var query_result = [];

    var results = hosts.map(function(host) {
        var options = {method: 'POST',uri: host + '/query',body: req.body,timeout: timeout,json: true};

        return rp(options).then(function(parsedBody) {
            var c;
            if (parsedBody.length) {
                for (var x = 0; x < parsedBody.length; x++) {
                    c = false;
                    for (var y = 0; y < query_result.length; y++) {
                        if (query_result[y].target == parsedBody[x].target && parsedBody[x].datapoints.length) {
                            query_result[y].datapoints.push(parsedBody[x].datapoints);
                            c = true;
                        }
                    }
                    if (c == false && parsedBody[x].datapoints.length) {
                        query_result.push(parsedBody[x]);
                    }
                }
            }

            return query_result;
        }).catch(function(err) {
            return err;
        });
    });

    Promise.all(results).then(function(results) {
        setCORSHeaders(res);
        res.json(query_result);
        res.end();
    }, reason => {
        res.status(500).send(reason);
    });
});

app.listen(config.simpleJsonPort);

console.log(`Server is listening to port ${config.simpleJsonPort}`);
