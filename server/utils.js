const fs = require('fs');

function readAndWrite(data, file) {
    data = JSON.stringify(data,null,'\t');
    file = `tmp/${file}`;
    fs.writeFile(file, data, function (err,data) {if (err) {return console.log(err);}});
}

function saveData(data, db) {
    return new Promise(function(resolve, reject) {
        var count = 0;
        data.series.forEach(function(metric) {
            aux = {
                "metric": metric.metric,
                "timestamp": metric.points[0][0],
                "value": metric.points[0][1],
                "tags": metric.tags,
                "host": metric.host,
                "device": metric.device
                };
            count++;
            db.collection("_"+metric.metric).insert(aux);
            
        });
        resolve(count);
    })
}

module.exports.readAndWrite = readAndWrite;
module.exports.saveData = saveData;