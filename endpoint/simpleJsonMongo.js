'use strict';

var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var _ = require('lodash');
var app = express();
var curlify = require('request-as-curl');

var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

const config = require('./config');

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

app.all('/search', function (req, res) {
    console.log(curlify(req, req.body));
    mongo.connect(config.connectionMongo, function (err, db) {
        if (err) {
    	    res.status(500).send(reason);
        }
        if (config.debug) {
            console.log("Connected successfully to server");
        }
	    
        db.listCollections().toArray(function(err, collInfos) {
            var mongo_search_result = [];
            _.each(collInfos, function(collInfo) {

		        var names = collInfo.name.split(".");
		        names = names.join(".");
                if ( names.indexOf(req.body.target) !== -1 && mongo_search_result.indexOf(names) === -1) {
                    mongo_search_result.push(names);
                }
            });
            
            setCORSHeaders(res);
            res.json(mongo_search_result);
            res.end();
        });
    });
});

app.all('/query', function (req, res) {
    console.log(curlify(req, req.body));
    var mongo_query_result = [];
    var from = new Date(req.body.range.from);
    var to = new Date(req.body.range.to);
    var from_str = Math.floor(from.getTime() / 1000);
    var to_str = Math.floor(to.getTime() / 1000);
    var names = _.map(req.body.targets, function (t) {
        return t.target;
    });
    var interval = req.body.intervalMs / 1000;
    var maxDataPoints = req.body.maxDataPoints;

    mongo.connect(config.connectionMongo, function (err, db) {
        if (err) {console.log(err);}
//        https://docs.mongodb.com/manual/reference/method/db.collection.find/#db.collection.find
	    var collections = []

        _.each(names, function(name) {
            try {
                //{"c":"_system.net.bytes_rcvd","f":{"device":"wlp2s7"}}
                var data = JSON.parse(name);
                var name = data.c;
                filter = {device: data.f.device, timestamp: { $gte: from_str, $lte: to_str }}
            } catch(e) {
                var filter = {timestamp: { $gte: from_str, $lte: to_str }};
            }

	        collections.push({coll : name, prefix: null, name: name, filter: filter});
        });
    
	    var results = collections.map(function(coll) {
	        return  new Promise((resolve, reject) => {
            
                db.collection(coll.coll).find(coll.filter, {_id: 0, timestamp: 1, value: 1, $slice: maxDataPoints }).sort({ timestamp: 1 }).toArray(function (err, docs) {
                    if (err) {console.log(err); reject(err);}

                    var result = {};
                    console.log("query success " + coll.coll + " found " + docs.length);

                    var name = coll.name;
                    result[name] = new Array();

                    console.time('loop');
                    docs.forEach(function(doc) {result[name].push([doc.value, 1000 * doc.timestamp]);});
                    console.timeEnd('loop');

                    var data = {target: name, datapoints: result[name]};

    		        resolve(data);
                })
    	    });
	    });

    	Promise.all(results).then(mongo_query_result=> { 
    		setCORSHeaders(res);
    		var rtr = [];
    		for(var i = 0; i < mongo_query_result.length; i++){
    			rtr = rtr.concat(mongo_query_result[i]);
    		}
    		rtr = rtr.filter(function(v){ return v.datapoints.length > 0;});
    		res.json(rtr);
    		res.end();

        }, reason => { res.status(500).send(reason);});
        
	});
});

app.listen(config.simpleJsonMongoPort);

console.log(`Server is listening to port ${config.simpleJsonMongoPort}`);