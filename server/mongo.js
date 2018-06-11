const MongoClient = require('mongodb').MongoClient;

module.exports.connect = (connectionString) => {
    return new Promise(function(resolve, reject) {
        MongoClient.connect(connectionString, function(err, client) {
            if(err) {
                console.log(err);
                reject(err);
            } else {
                resolve(client.db());
            }
        })
    });
}

module.exports.disconnect = (client) => {
    client.close();
}

module.exports.insert = (data,coll,db) => {
    var collection = db.collection(coll);
    collection.insertMany(data, function(err, res) {
        if (err) throw err;
        console.log("Number of documents inserted: " + res.insertedCount);
    });
}