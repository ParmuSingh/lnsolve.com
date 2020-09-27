var request = require('request');
var atob = require('atob');
var btoa = require('btoa');

// If you're cloning this repo make sure to replace wallet and API keys

module.exports = {
  request_invoice: function (lnsolve_res, amt, db, newProblem, memo="lnsolve"){

    var headers = {
      'Content-Type': 'application/json'
    };

    var dataString = '{"num_satoshis":'+amt+', "memo":"'+memo+'"}';
    //var dataString = '{"num_satoshis": 20, "memo": "lnsolve"}';

    var options = {
      url: 'https://lnpay.co/v1/user/wallet/<insert-wallet-key>/invoice',
      method: 'POST',
      headers: headers,
      body: dataString,
      auth: {
        'user': 'sak_...', // Your secret API key
        'pass': ''
      }
    };

    function callback(error, response, body) {
      body = JSON.parse(body)
      txid=body['id']
      newProblem['ln_txid'] = txid

      collection_puzzles = db.collection('unpaid_puzzles')
      collection_puzzles.insertOne(newProblem, function(err, docInserted){

        if(err){
          helpers.log("error agya: "+err)
          res.send("err")
          return
        }
        // Now if webhook recieves wallet_receive event with same txid then we publish the puzzle
        console.log(new Date() + ": new problem received")
        //lnpay.request_invoice(res, bounty)
        lnsolve_res.json({problem_id: docInserted['ops'][0]['_id'], lntx: body, message: 'success'})
      })
    }

    request(options, callback);
  },
  pay_invoice: function(lnsolve_res, pay_req){
    // https://lnpay.co/v1/wallet/:access_key/withdraw

    var headers = {
        'Content-Type': 'application/json'
    };

    var dataString = '{"payment_request":"'+pay_req+'"}';

    var options = {
        url: 'https://lnpay.co/v1/wallet/<insert-wallet-key>/withdraw',
        method: 'POST',
        headers: headers,
        body: dataString,
        auth: {
            'user': 'sak_...', // Your secret API key
            'pass': ''
        }
    };

    function callback(error, response, body) {
        lnsolve_res.send(body)
    }
    request(options, callback);
  },
  lnurl_withdraw: function(lnsolve_res, amt, memo, userName){

    // according to doc: https://docs.lnpay.co/wallet/lnurl-withdraw
    // passThru is base64 encoded json of data to use in webhooks, etc
    passThruData = btoa(JSON.stringify({username: userName})) // reverse by atob()
    var options = {
        url: 'https://lnpay.co/v1/wallet/<insert-wallet-key>/lnurl/withdraw?passThru='+passThruData+'&num_satoshis='+amt+'&memo='+memo,
        auth: {
            'user': 'sak_...', // Your secret API key
            'pass': ''
        }
    };

    function callback(error, response, body) {
        lnsolve_res.send(body)
    }

    request(options, callback);

  },
  publish_problem: function(res, txid, db){
    console.log(new Date() + ": publishing problem linked to txid "+txid)
    unpaid_puzzles = db.collection('unpaid_puzzles')
    unpaid_puzzles.find( {'ln_txid': txid} ).toArray(function(err, docs) {
      assert.equal(err, null)
      if(docs.length != 0){
        doc = docs[0]

        doc['isBountyPaid'] = true

        open_puzzles = db.collection('open_puzzles')
        open_puzzles.insertOne(doc, function(err, mongo_res){
          if(err){
            console.log("error agya: "+err)
            res.send("err")
            return
          }
          console.log(new Date() + ": payment confirmed. problem published"); // Now if webhook recieves wallet_receive event with same txid then we publish the puzzle
          //lnpay.request_invoice(res, bounty)
          res.send("success")
        })
      }
    })
  },
  log: function(message){
    var timestamp = new Date()
    console.log(timestamp+": "+message+"\n")
  }
};
