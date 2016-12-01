var DB = {

  init: function(){

    this.mongoose = require('mongoose');
    this.ObjectId = require('mongoose').Types.ObjectId;
    this.Schema = this.mongoose.Schema;

    this.mongoose.connect('mongodb://memer:memesNdreams@ds119608.mlab.com:19608/heroku_bq1dm5vr');
    this.database = this.mongoose.connection;
    this.database.on('error', console.error.bind(console, 'connection error:'));

    //schema stuff
    this.memeSchema = {};
    this.meme = {};

    this.database.once('open', function (callback) {

        //create the meme schema
        DB.memeSchema = new DB.Schema({
          id: DB.Schema.ObjectId,
          image: { type: String, unique: true, required: true },
          upvotes: { type: Number, required: true },
          related: [{ type: String, required: false }],
        });
        DB.meme = DB.database.model('memes', DB.memeSchema);
      });
    },
    // functions for API
    //add team
    add_meme: function (image, upvotes, related, callback) {
        var instance = new DB.meme();
        //required fields
        instance.image = image;
        instance.upvotes = upvotes;
        instance.related = related;
        //unrequired fields

        instance.save(function (error) {
            if (error) {
                console.log(error);
                callback(false);
            }
            else {
                callback(instance);
            }
        });
    },
    get_memes: function(search, callback) {
        DB.database.collection('memes').find({"related": { $in: search }}).limit(100000).toArray(function(err,docs) {
            if (docs[0] != null) {
                callback(docs);
            }
            else {
                callback(err);
            }
        });
    },
};
module.exports = DB;
