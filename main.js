// some libraries/variables. I don't know which they actually are.
process.env.TZ = 'America/Chicago';

var app = require('express')();
var server = require('http').Server(app);

// our own singleton cloud objects
 var api = require('./api_handler.js');
 var database = require('./database.js');


// we give them access to eachother by a pseudo-init
database.init();
api.init(app, server, database);


// start the services!
api.start();


// this "process.env.PORT" is relatively specific to Heroku.
// BUT: when running on Heroku, it defaults to port 80.
server.listen(process.env.PORT || 3001);



//end
