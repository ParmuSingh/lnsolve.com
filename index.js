// this is the main server file

server_domain = "https://localhost:10001" // use in development
//server_domain = "https://lnsolve.com" // use in production


var fs = require('fs');
var https = require('https');
var privateKey  = fs.readFileSync('./localsslkeys/cert.key', 'utf8');
var certificate = fs.readFileSync('./localsslkeys/cert.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var express = require('express')
var app = express()
assert = require('assert');

var bodyParser = require('body-parser');
var multer = require('multer');
const path = require("path");
var upload = multer();
var session = require('express-session');
var cookieParser = require('cookie-parser');

var helpers = require('./helpers.js')


// https://ourcodeworld.com/articles/read/261/how-to-create-an-http-server-with-express-in-node-js
app.use(express.static(__dirname + "/views"))
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array());
app.use(cookieParser());
app.use(session({secret: "your secret"}));

var httpsServer = https.createServer(credentials, app);
// mongodb (official): https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/#start-mongodb
// mongodb (ubuntu): https://linuxhint.com/install_mongodb_ubuntu_20_04/

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
// Connection URL
const url = 'mongodb://localhost:27017';
// Database Name
const dbName = 'solveforme'; // i origianlly wanted to keep the name solveforme but the domain was taken
// Create a new MongoClient
const client = new MongoClient(url);



// https://www.rosehosting.com/blog/how-to-generate-a-self-signed-ssl-certificate-on-linux/

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);

  // I am using a custom log function. This just prepends the message with the log time
  helpers.log("Connected successfully to database server");

  db = client.db(dbName);

  // root - returns home page
  app.get('/', (req, res) => {

    // Here we're accessing the 'open_puzzles' collection in our mongodb.
    // It says open_puzzles but it contains both open and closed (solved) puzzles.
    collection_puzzles = db.collection('open_puzzles')

    // .sort( {bounty: -1} ) sorts the results in descending order by bounty.
    collection_puzzles.find( {'isSolved': false} ).sort( {bounty: -1} ).toArray( (err, docs) => {
      assert.equal(err, null)

      // doc is a list of all puzzles
      for(var i=0; i< docs.length; i++){
        if(docs[i].title.length > 65) // since this is main page. puzzle data is truncated when displaying
          docs[i].title = docs[i].title.slice(0,65) + '...'
        if(docs[i].description.length > 65)
          docs[i].description = docs[i].description.slice(0,65) + '...'
      }

      // checking if user is authenticated. Some UI elements change on that.
      if(req.session.userAuthenticated === undefined || req.session.userAuthenticated === false){
        req.session.userAuthenticated = false;
        req.session.userName = null;

        // render a html using ./views/index.pug file. Some data is also passed.
        res.render('index', {root_domain: server_domain, data: docs,
                              userAuthenticated: req.session.userAuthenticated,
                              userName: req.session.userName,
                              unsolvedProblems: true})

      }else{ // user is authenticated

        users = db.collection('users')
        users.find( {"username": req.session.userName} ).toArray( (err, user) => {
          user = user[0]
          //helpers.log(user)
          balance = "balance: "+user['balance']+"sats"
          res.render('index', {root_domain: server_domain, data: docs,
                                userAuthenticated: req.session.userAuthenticated, balance: balance,
                                userName: req.session.userName,
                                unsolvedProblems: true})
        })
      } // user is authenticated


    })
  }) // app.get('/')

  // This is page where all solved problems are available.
  // It's like root endpoint but filters on 'isSolved': true
  app.get('/closed_puzzles', (req, res) => {
    collection_puzzles = db.collection('open_puzzles')
    collection_puzzles.find( {'isSolved': true} ).toArray( (err, docs) => {
      assert.equal(err, null)

      if(req.session.userAuthenticated === undefined){
        req.session.userAuthenticated = false;
        req.session.userName = null;
        //helpers.log("User isn't authenticated");
      }
      for(var i=0; i< docs.length; i++){
        if(docs[i].title.length > 65)
          docs[i].title = docs[i].title.slice(0,65) + '...'
        if(docs[i].description.length > 65)
          docs[i].description = docs[i].description.slice(0,65) + '...'
      }
      res.render('index', {root_domain: server_domain, data: docs,
                            userAuthenticated: req.session.userAuthenticated,
                            userName: req.session.userName,
                            unsolvedProblems: false})

    })
  }) // app.get('/closed_puzzles')

  // this returns a rendered html for problem depending on the problem_id. Their rendered from ./views/puzzle.pug
  app.get('/problem/:problem_id', (req, res) => {
    problem_id = req.params.problem_id

    collection_puzzles = db.collection('open_puzzles')
    collection_puzzles.find( {'_id': ObjectId(problem_id)} ).toArray(function(err, docs) {
      assert.equal(err, null)

      if(docs.length != 0){
        doc = docs[0]

        nAnswers = doc.answers.length
        hasAcceptedSolution = false // i can also use isSolved
        acceptedSolution = null
        answers = doc.answers
        for(i=0; i<nAnswers; i++){
          if(answers[i]["solution_accepted"]){
            hasAcceptedSolution = true
            acceptedSolution = answers[i]['_id']
            break
          }
        }


        // checking if client is the poster of the problem. If yes, display the "accept solution button"
        userIsProblemPoster = false
        if(doc.poster == req.session.userName){
          userIsProblemPoster = true
        }

        if(req.session.userAuthenticated == undefined || req.session.userAuthenticated == false){

          res.render('puzzle', {root_domain: server_domain, problem_id: doc._id, title: doc.title, poster: doc.poster,
                    description: doc.description, answers: answers, hasAcceptedSolution: hasAcceptedSolution,
                    acceptedSolution: acceptedSolution, bounty: doc.bounty,
                    nAnswers: nAnswers, userAuthenticated: req.session.userAuthenticated,
                    userName: req.session.userName, userIsProblemPoster: userIsProblemPoster})


        }else{ // user IS authenticated -> show balance
          users = db.collection('users')
          users.find( {"username": req.session.userName} ).toArray( (err, user) => {
            user = user[0]

            balance = "balance: "+user['balance']+"sats"

            res.render('puzzle', {root_domain: server_domain, problem_id: doc._id, title: doc.title, poster: doc.poster,
                      description: doc.description, answers: answers, hasAcceptedSolution: hasAcceptedSolution,
                      acceptedSolution: acceptedSolution, bounty: doc.bounty,
                      nAnswers: nAnswers, userAuthenticated: req.session.userAuthenticated,
                      userName: req.session.userName, userIsProblemPoster: userIsProblemPoster,
                      balance: balance})
          })
        }

      }else{
        res.status(404)
      }
    })
  }) // app.get('/problem/:problem_id')

  // if get request -> show html page
  app.get('/submit_a_problem', function(req, res){
    if(!req.session.userAuthenticated){
      res.redirect('/signin')
      return
    }
    res.render('submit_a_problem', {root_domain: server_domain, userName: req.session.userName,
                      userAuthenticated: req.session.userAuthenticated})
  }) // app.get('/submit_a_problem')

  // if post request -> accept problem and return ln invoice
  app.post('/submit_a_problem', function(req, res){
    if(!req.session.userAuthenticated){
      res.send('not authenticated')
      return
    }
    if(!req.body.title || !req.body.description || !req.body.bounty){
        res.status(400);
        res.send("Invalid details!");
        return
    }

    bounty = Number(req.body.bounty)
    if(bounty < 5){ // ToDo: change to 1000
        res.send({message:"less_bounty"})
        return
    }

    var timestamp = new Date()
    // this problem is goes into unpaid problems
    var newProblem = {title: req.body.title, poster: req.session.userName,
                  description: req.body.description, timestamp: timestamp,
                  answers: [], isSolved: false, isBountyPaid: false,
                  bounty: bounty};

    bounty = Math.ceil(bounty * 1.01)
    // get invoice and return to user
    helpers.request_invoice(res, bounty, db, newProblem, memo="posting problem in lnsolve")

    // res.send('success');
  }) // app.post('/submit_a_problem')

  // returns profile page
  app.get('/profile/:username', (req, res) => {

    var username = req.params.username

    // only visible to username
    if(req.session.userName != username){
      res.sendStatus(403)
      return
    }

    collection_puzzles = db.collection('users')
    collection_puzzles.find( {'username': username} ).toArray( (err, docs) => {
      assert.equal(err, null)
      doc = docs[0]
      balance = doc['balance']

      res.render('profile', {root_domain: server_domain,
                            userAuthenticated: true,
                            userName: username,
                            balance: balance})


    })
  }) // app.get('/profile/')

//------------------------------------------------- bitcoin -------------------------------------------------//
  app.get('/generate_invoice', function(req, res){
    if(!req.session.userAuthenticated){
      res.send('not authenticated')
      return
    }
    amt = req.query.amt
    amt = String(Math.ceil(amt * 1.01))

    helpers.request_invoice(res, amt)
  }) // app.get('generate_invoice_lnpay')

  // DISABLED - SECURITY CONCERN
  // What if user generates lnurl but doesn't use it. And then uses this method to withdraw and then use previously generated lnurl to withdraw more. Double withdraw.
  
  // app.post('/request_withdrawl', function(req, res){
  //   if(!req.session.userAuthenticated){
  //     res.send('not authenticated')
  //     return
  //   }
  //
  //   if(req.session.userName != req.query.username){
  //     res.send(403)
  //     return
  //   }
  //   userName = req.body.username
  //   pay_req = req.body.pay_req
  //
  //   helpers.pay_invoice(res, pay_req, userName)
  // }) // app.post('/request_withdrawl')

  app.get('/lnurl_withdraw', function(req, res){
    if(!req.session.userAuthenticated){
      res.send('not authenticated')
      return
    }

    if(req.session.userName != req.query.username){
      res.send(403)
      return
    }

    userName = req.query.username
    amt = req.query.amt

    users = db.collection('users')
    users.find( {"username": userName} ).toArray( (err, user) => {
      user = user[0]


      balance = user['balance']

      if(balance >= amt){
        memo = "lnsolve withdrawl for "+user['username']
        helpers.log("lnurl-withdraw requested")

        helpers.lnurl_withdraw(res, amt, memo, userName)
      }else{
        res.send('not enough balance')
        return
      }
    }) // users
  }) // app.get('lnurl_withdraw')

  app.post('/webhook', function(req, res){

    var created_at = req.body.created_at
    var id = req.body.id
    var event = req.body.event
    var data = req.body.data.wtx

    helpers.log("event: "+JSON.stringify(event))
    helpers.log("\ndata: "+JSON.stringify(data))

    if(data["wtxType"]["name"]=="ln_deposit"){
        txData = data["lnTx"]
        txId = txData["id"]
        isSettled = txData["settled"] // 1 for true
        numSatsPaid = txData["num_satoshis"]
        paymentRequest = txData["payment_request"]
        helpers.log("bitcoin deposited: "+numSatsPaid)

        if(isSettled == 1){
            helpers.log("Publishing problem..")
            helpers.publish_problem(res, txId, db)
        }
    }else if(data["wtxType"]["name"]=="ln_withdrawal"){

        txData = data["lnTx"]
        txId = txData["id"]
        isSettled = txData["settled"] // 1 for true
        numSatsPaid = txData["num_satoshis"]
        paymentRequest = txData["payment_request"]
        userName = data['passThru']['username']
        helpers.log("bitcoin withdrawn: "+numSatsPaid)

        if(isSettled == 1){
            users = db.collection('users')
            users.find( {'username': userName} ).toArray( (err, user)=>{
              user = user[0]

              balance = user['balance'] - numSatsPaid
              users.updateOne( {'username': userName}, {$set: {'balance': balance}})
            } )
            //users.updateOne( {'ln_txid': }, {$set: {'answers': answers}} )

        }

        res.send("success")
    }else{
        res.send("OK")
    }

    /*
    event: {"id":"520","type":"wallet","name":"wallet_receive","display_name":"Wallet Receive"}

    data: {"wtx":{"id":"wtx_A2o6sRS2KO2ljvI93ExaaPn","wal":{"id":"wal_Vkih3OPDfEWCva","balance":1037,"created_at":1598195618,"statusType":{"name":"active","type":"wallet","display_name":"Active"},"updated_at":1600111650,"user_label":"Paywall Wallet"},"lnTx":{"id":"lntx_KYrEuZ77djz6YxhybYNbjUM","memo":"posting problen in lnsolve","expiry":86400,"settled":1,"fee_msat":0,"created_at":1600111631,"expires_at":1600198031,"is_keysend":null,"ln_node_id":"lnod_2s4yfYA","settled_at":1600111650,"dest_pubkey":"033868c219bdb51a33560d854d500fe7d3898a1ad9e05dd89d0007e11313588500","num_satoshis":5,"custom_records":null,"r_hash_decoded":"09394a75a957bb184643be03084347c2c4e7b96a2bfd6866ed47a5efb6d06545","payment_request":"lnbc50n1p04l3q0pp5pyu55adf27a3s3jrhcpsss68ctzw0wt2907ksehdg7j7ldksv4zsdp2wphhxarfdenjqurjda3xcetwyp5kugrvdeek7mrkv5cqzpgxqyz5vqsp5e2cp3zxx3zjs3r7rkknfk0szpyl94mstajdkvvp2h0ahgpjzxetq9qy9qsqznfnm3893m7snklqnlc5uxgqs52k3y5eu3a6rtc07jh8sqp2zeun69dx330qaz8zdhrkl70z23ldd52qe3c3naez9sf4mxyef3yw9wgqcmqvzx","description_hash":null,"payment_preimage":"e7a672e91da4f1afab3bb5d66d4f06a2c45fccebcd90b981843e57624c6594b6"},"wtxType":{"name":"ln_deposit","layer":"ln","display_name":"LN Deposit"},"passThru":{"wallet_id":"wal_Vkih3OPDfEWCva"},"created_at":1600111650,"user_label":"posting problen in lnsolve","num_satoshis":5}}
    */

  }) // app.post('/webhook')

  // DELETE THIS - here to simulate webhook trigger locally
  app.get('/publish_problem', function(req, res){
    /*
      This is a test function that executes webhook code
    */
    txid = req.query.txid
    helpers.log("Publishing problem..")
    helpers.publish_problem(res, txid, db)

  }) // app.get('/publish_problem')

  // DELETE THIS - here to simulate webhook trigger locally
  app.get('/deduct_withdraw_amt', function(req, res){
    /*
      This is a test function that executes webhook code
    */

    numSatsPaid = req.query.amt
    userName = req.query.username
    helpers.log("bitcoin withdrawn: "+numSatsPaid)


    users = db.collection('users')
    users.find( {'username': userName} ).toArray( (err, user)=>{
      user = user[0]

      balance = user['balance'] - numSatsPaid
      users.updateOne( {'username': userName}, {$set: {'balance': balance}})
    } )
    //users.updateOne( {'ln_txid': }, {$set: {'answers': answers}} )

    res.send("success")

  }) // app.get('/deduct_withdraw_amt')

//------------------------------------------------- bitcoin -------------------------------------------------//


  app.get('/faq_page', function(req, res){
    res.sendFile('faq_page.html', {root : __dirname + '/views'})
  })// app.get('/faq_page')

  app.post('/submit_solution', function(req, res){
    if(!req.session.userAuthenticated){
      res.send('not authenticated')
      return
    }
    if(!req.body.problem_id || !req.body.description){
        res.status("400");
        res.send("Invalid details!");
        return
    }

    var timestamp = new Date()
    var newSolution = {'_id': ObjectId(), poster: req.session.userName, solution: req.body.description, 'timestamp': timestamp, solution_accepted: false};
    collection_puzzles = db.collection('open_puzzles')
    collection_puzzles.find( {'_id': ObjectId(req.body.problem_id)}).toArray(function(err, docs){
      if(err){

      }
      doc = docs[0]
      var answers = doc.answers
      answers.push(newSolution)
      //helpers.log(answers)
      collection_puzzles.updateOne( {'_id': ObjectId(req.body.problem_id)}, {$set: {'answers': answers}} )
      helpers.log("solution submitted");
      res.send('success')
    })
  }) // app.post('/submit_solution')

  app.post('/accept_solution', function(req, res){
    if(!req.session.userAuthenticated){
      res.send('not authenticated')
      return
    }
    if(!req.body.problem_id || !req.session.userName || !req.body.solution_id){
        res.status("400");
        res.send("Invalid details!");
        return
    }

    var timestamp = new Date()
    var solution_to_be_accepted
    collection_puzzles = db.collection('open_puzzles')
    collection_puzzles.find( {'_id': ObjectId(req.body.problem_id)}).toArray(function(err, docs){
      if(err){

      }
      doc = docs[0]
      var answers = doc.answers
      answer_index = 0
      // getting solution by _id
      for(i=0; i< answers.length; i++){
        answer = answers[i]
        if(answer['solution_accepted']){
          res.send('another_solution_already_accepted')
          return
        }
        if(answer['_id'] == req.body.solution_id){
          answer_index = i
        }else{
          answers[answer_index]['solution_accepted'] = false
        }
      }

      answers[answer_index]['solution_accepted'] = true

      //helpers.log(answers)
      collection_puzzles.updateOne( {'_id': ObjectId(req.body.problem_id)}, {$set: {'answers': answers}} )
      collection_puzzles.updateOne( {'_id': ObjectId(req.body.problem_id)}, {$set: {'isSolved': true}} )
      helpers.log("solution accepted");

      // add bounty to solution poster's balance
      solution_poster = answers[answer_index]['poster']

      users = db.collection('users')
      users.find( {'username': solution_poster} ).toArray( (err, user)=>{
        user = user[0]

        balance = user['balance'] + doc['bounty']
        users.updateOne( {'username': solution_poster}, {$set: {'balance': balance}})
      })

      res.send('success')
    })

  }) // app.post('/accept_solution')

  app.post('/signup', function(req, res){

    if(!req.body.id || !req.body.password){
        res.status("400");
        res.send("Invalid details!");
    } else {

      user_collection = db.collection('users')
      user_collection.find({'username': req.body.id}).toArray(function(err, docs){
        if(docs.length!=0){ // user already exists
          res.send("user already exists");
          return
        }else{// create user

          var newUser = {username: req.body.id,
                        password: req.body.password,
                        balance: 0
                };
          user_collection.insertOne(newUser, function(err, res){
            if(err){

            }
            helpers.log("user created");
          })

          req.session.userName = req.body.id;
          req.session.userAuthenticated = true;
          res.send('success');

        } // user created - end
      })

    }
  })// app.post('/signup')

  app.get('/signup', function(req, res){
    res.sendFile('signup.html', {root : __dirname + '/views'})
  }) // app.get('/signup')

  app.post('/signin', function(req, res){

    if(!req.body.id || !req.body.password){
        res.status("400");
        res.send("Invalid details!");
    } else {

      user_collection = db.collection('users')
      user_collection.find({'username': req.body.id}).toArray(function(err, docs){

        if(docs.length!=0){ // user exists
          user = docs[0]
          if(user.password === req.body.password){
            req.session.userName = req.body.id;
            req.session.userAuthenticated = true;
            res.send("success");
            return
          }else{
            res.send("incorrect password")
          }
        }else{
          res.send("doesn't exists");
        }
      })

    }
  })// app.post('/signin')

  app.get('/signin', function(req, res){
    res.sendFile('signin.html', {root : __dirname + '/views'})
  }) // app.get('/signin')

  app.get('/signout', function(req, res){
    req.session.destroy(function(){
      helpers.log("user logged out.")
    });
    res.redirect('/');
  }) // app.get('/signout')


  app.listen(10000, () => {
    helpers.log("listening on 10000..")
    collection_puzzles = db.collection('open_puzzles')
    collection_puzzles.find( {} ).toArray(function(err, docs) {
      assert.equal(err, null)
      //helpers.log(docs)
    })
  })
  httpsServer.listen(10001, ()=>{
    helpers.log("listening on 10001..")
  });

  //client.close();
});
