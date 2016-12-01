var fs = require('fs');
var request = require('request');
var http = require('http');
var os = require('os');

var Game = require('../Game').Game;

const baseURL = 'http://limitless-fortress-25456.herokuapp.com'


var teams = []
var conferences = []
var gamesObj = []

function loadTeams(){
	fs.readFile( __dirname + '/conferences.txt', function (err, data) {
		
		if (err) {
			throw err; 
		}

		var dataArr = data.toString().split(/\n/);
		var index = 0;
		while(index < dataArr.length){

			var conferenceName = dataArr[index++];
			conferences.push(conferenceName);
			conferencesPost(conferenceName);

			while(dataArr[index++].charAt(0) == "*"){
				var team = new Team(dataArr[index - 1].substring(1), conferenceName);
				teams.push(team);
				teamsPost(team);
			}

		}

		//Takes all teams and puts them into their conferences in the db
		teams.forEach(function(team){
			teamsToConferencesPost(team);
		});

		//passed function is a callback called when loading games is finished
		loadGames(function(){
			var homeWins = 0;
			var homeLosses = 0;
			gamesObj.forEach(function(game){
				if(game.hasBeenPlayed() && !game.isNeutral){
					if(game.winningTeam() === game.homeTeamLookupName){
						homeWins++;
					}else{
						homeLosses++;
					}
				}
			})
			console.log("Home record on the season: " + (homeWins / (homeWins + homeLosses)));
		});

		
	});
}

function loadIntoFile(input){
	var inp = input.substring(input.indexOf("<pre>") + 5, input.indexOf("</pre>"));
	gamesArray = inp.split(os.EOL);

	gamesArray.forEach(function(item, index){
		var array = item.trim().split(/\s+/);
		if(array.length > 4){
			var newGame = new Game(array);
			gamesObj.push(newGame);
			gamePost(newGame);
			if(newGame.hasBeenPlayed()){
				
				//console.log(newGame.toString());
			}else{
				//console.log(newGame.toString());
			}
		}
	});

	//Push games to teams??
	//LOAD TEAMS FROM API?
	//console.log(teams);
	gamesObj.forEach(function(game){
		if(game.hasBeenPlayed()){
			var winningTeamName = game.winningTeam();
			var losingTeamName = game.losingTeam();
			//console.log(`${winningTeamName} > ${losingTeamName}`)
			//console.log("GAME: " + game.toString());
			//console.log(`${winningTeamName} > ${losingTeamName}`)
			var winningTeam = teams.filter(function(team){
				return team.matchesLookup(winningTeamName);
			})[0];

			var losingTeam = teams.filter(function(team){
				return team.matchesLookup(losingTeamName);
			})[0];

			if(winningTeam || losingTeam){
				if(winningTeam && losingTeam){
					//console.log(`${winningTeam.teamName} (${winningTeam.conference}) BEAT ${losingTeam.teamName} (${losingTeam.conference})`);
					winningTeam.wins++;
					winningTeam.games.push(game);
					losingTeam.losses++;
					losingTeam.games.push(game);
					if(winningTeam.conference.trim().toLowerCase() === losingTeam.conference.trim().toLowerCase()){
						winningTeam.confWins++;
						losingTeam.confLosses++;
					}
				}else if(!losingTeam){
					//Winning team beat a non FBS team
					winningTeam.wins++;
					winningTeam.games.push(game);
				}else{
					//Winning team lost to a non FBS team
					losingTeam.losses++;
					losingTeam.games.push(game);
				}
			}
		}else{
			var homeTeamLookupName = game.homeTeamLookupName;
			var awayTeamLookupName = game.awayTeamLookupName;

			var homeTeam = teams.filter(function(team){
				return team.matchesLookup(homeTeamLookupName);
			})[0];

			var awayTeam = teams.filter(function(team){
				return team.matchesLookup(awayTeamLookupName);
			})[0];

			if(homeTeam){
				homeTeam.games.push(game);
			}
			if(awayTeam){
				awayTeam.games.push(game);
			}
		}
		
	});
}


function loadGames(callback){

	var options = {
	  host: 'www.masseyratings.com',
	  //path: '/scores.php?s=286577&sub=11604&all=1'
	  path: '/scores.php?s=286577&sub=11604&all=1&mode=3&sch=on&format=0'
	  //path: '/scores.php?s=286577&sub=12801&all=1&mode=2&sch=on&format=0'
	};

	var req = http.request(options, 
		function(response) {
			var str = '';

			//another chunk of data has been recieved, so append it to `str`
			response.on('data', function (chunk) {
				str += chunk;
			});

			//the whole response has been recieved, so we just print it out here
			response.on('end', function () {
			loadIntoFile(str);
			callback();
		});
	}).end();

}

function gamePost(game){
	// if(game.score.homeTeam() === game.score.awayTeam()){
	// 	console.log(game.toString());
	// }
	var headers = {
	    'Content-Type':     'application/x-www-form-urlencoded'
	}

	var homeTeamObj = teams.filter(function(thisTeam){
		//console.log(thisTeam);
		return thisTeam.matchesLookup(game.homeTeamLookupName);
	});
	var homeTeamRealName = undefined;
	if(homeTeamObj.length > 0){
		homeTeamRealName = homeTeamObj[0].teamName;
	}

	var gameInputHomeName = homeTeamRealName ? homeTeamRealName : game.homeTeamLookupName;

	var awayTeamObj = teams.filter(function(thisTeam){
		return thisTeam.matchesLookup(game.awayTeamLookupName);
	});
	var awayTeamRealName = undefined;
	if(awayTeamObj.length > 0){
		awayTeamRealName = awayTeamObj[0].teamName;
	}

	var gameInputAwayName = awayTeamRealName ? awayTeamRealName : game.awayTeamLookupName;

	var options = {
	    url: `${baseURL}/game/add`,
	    method: 'POST',
	    headers: headers,
	    form: { 
	    		'season':'2016-2017',
				'date' : `${game.date}`,
				'home': `${gameInputHomeName}`,
				'away': `${gameInputAwayName}`,
				'home_score': game.homePoints,
				'away_score': game.awayPoints
			}
	}

	request(options, function (error, response, body) {
	    if (!error && response.statusCode == 200) {
	        console.log(body)
	    }
	})
}

function conferencesPost(conferenceName){
	var headers = {
	    'Content-Type':     'application/x-www-form-urlencoded'
	}

	var options = {
	    url: `${baseURL}/conference/add`,
	    method: 'POST',
	    headers: headers,
	    form: {'name': `${conferenceName}`}
	}

	request(options, function (error, response, body) {
	    if (!error && response.statusCode != 200) {
	        console.log(body)
	    }
	})
}

function teamsPost(team){
	var headers = {
	    'Content-Type':     'application/x-www-form-urlencoded'
	}

	var options = {
	    url: `${baseURL}/team/add`,
	    method: 'POST',
	    headers: headers,
	    form: {'nickname': `${team.lookupName}`, 
	    'mascot': `${team.mascot}`, 
	    'school':`${team.teamName}`, 
	    'conference':`${team.conference}`}
	}

	request(options, function (error, response, body) {
	    if (!error && response.statusCode != 200) {
	        console.log(body)
	    }
	});
}

function teamsToConferencesPost(team){
	var headers = {
	    'Content-Type':     'application/x-www-form-urlencoded'
	}

	var options = {
	    url: `${baseURL}/conference/add/team`,
	    method: 'POST',
	    headers: headers,
	    form: {'school':`${team.teamName}`,
	    'conference':`${team.conference}`}
	}
	request(options, function (error, response, body) {
	    if (!error && response.statusCode != 200) {
	        console.log(body);
	    }
	});
}

//Local class to help with db setup
class Team{
	constructor(name, conference){
		var arr = name.split(':');
		this.lookupNames = arr[0].split(',');
		this.teamName = arr[1];
		this.mascot = arr[2];
		this.conference = conference;
		this.wins = 0;
		this.losses = 0;
		this.confWins = 0;
		this.confLosses = 0;
		this.games = []
	}

	matchesLookup(teamNameIn){
		return this.lookupNames.filter(function(lookupName){
			//console.log(teamNameIn);
			return lookupName.toLowerCase().trim() === teamNameIn.toLowerCase().trim();
		}).length > 0;
	}

	toStringWithRecord(){
		return `${this.toString()} ${this.wins}-${this.losses} (${this.confWins}-${this.confLosses})`;
	}

	toString(){
		return `${this.teamName} ${this.mascot}`;
	}

	confWinPct(){
		return this.confWins / (this.confWins + this.confLosses);
	}

	winPct(){
		return this.wins / (this.wins + this.losses);
	}
}

loadTeams();
