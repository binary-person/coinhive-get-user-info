var request = require('request');
var express = require('express');
var app = express();
var config = require('./config.js');
// Also deasync

if(config.secretKey == ''){
    console.log('Secret key in the config file is missing');
}
if(config.timeLength == ''){
    console.log('Time length in the config file is missing');
}


function get(url) {
  var source;
  request({ url: url }, function (error, response, body) {
    source = body;
  });
  while (source === undefined) {
    require('deasync').runLoopOnce();
  }
  return source;

  // var request = require('sync-request');
  // var res = request('GET', url);
  // return res.body.toString('utf-8');
}

var newJsonData = JSON.parse(get('https://api.coinhive.com/user/top?secret='+config.secretKey));
if(newJsonData.success == false){
    console.log('');
    console.log('Error on getting coinhive user data. Error: '+newJsonData.error);
    process.exit(1);
}
function refreshData(){
    newJsonData = JSON.parse(get('https://api.coinhive.com/user/top?secret='+config.secretKey));
}

var port = config.port;
var oldJsonData = '';
var timesRan = 0;
var htmlFront = "<!DOCTYPE html>\n<html><head><title>Coinhive User Info</title><style>td{ border: 1px solid black; text-align: center; } h2{ text-align: center; } table{ border: 1px solid black; margin: auto; width: 50%; text-align: right;}</style></head><body><h2>Coinhive User Info</h2><table><tbody><tr> <td>Name</td> <td>Hashes</td> <td>Hashes Per Second</td> </tr>";
var htmlBack = "</tbody></table></body></html>";
var htmlMiddle = "";
var mainHtml = "";

function updateTable(names, totals, speed){ // In array! The arrays must match each other, for ex. : names[0] relates to totals[0]
    htmlMiddle = "";
    for(var i = 0; i < names.length; i++){
        htmlMiddle = htmlMiddle + '\n<tr><td>'+names[i]+'</td><td>'+totals[i]+'</td><td>'+speed[i]+'</td></tr>';
    }
    mainHtml = htmlFront+htmlMiddle+htmlBack;
}

function main(){
    var newNames = [];
    var newTotals = [];
    var newSpeed = [];
    for(var i = 0; i < newJsonData.users.length; i++){
        newNames[i] = newJsonData.users[i].name;
        newTotals[i] = (newJsonData.users[i].total).toLocaleString();
        newSpeed[i] = '';
    }
    if(oldJsonData == ''){
        refreshData();
        oldJsonData = newJsonData;
    }else{
        refreshData();
        for(var i = 0; i < newJsonData.users.length; i++){
            newSpeed[i] = (newJsonData.users[i].total - oldJsonData.users[i].total) / (config.timeLength / 1000) + ' Hashes/S';
        }
        oldJsonData = newJsonData;
    }
    updateTable(newNames, newTotals, newSpeed);
    
    //// Record number of times ran
    timesRan = timesRan + 1;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write('This had been run '+timesRan+' times!');
}
app.get('/', function(req, res){
    res.send(mainHtml);
});

app.listen(port, function(){
    console.log('Started server at port '+port);
    main();
});

setInterval(function(){
    main();
}, config.timeLength);

if(config.keepAliveUrl !== ''){
    setInterval(function(){get(config.keepAliveUrl)}, 60000);
}