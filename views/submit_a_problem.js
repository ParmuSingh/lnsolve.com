root_domain = "https://"+window.location.href.split('/')[2]
newProblem_id = null
let publicApiKey = 'pak_t4n7Hdw2n5EfYye1TCueeehVGyXdhZ8a';
LNPay.Initialize(publicApiKey);

function sha256(plain_text){
  var md = forge.md.sha256.create();
  md.start();
  md.update(plain_text, "utf8");
  var hashText = md.digest().toHex();
  return hashText
}

// this function sends request to /submit_a_problem endpoint. gets an invoice in return and displays it as a qr code
function post_problem_with_bounty(){

  title = document.getElementById('title_field').value
  description = document.getElementById('description_field').value
  bounty_field = document.getElementById('bounty_field').value

  if(title == ''){
    document.getElementById('message').innerHTML = 'Title cannot be empty!'
    document.getElementById('message').style.display = 'flex'
    return
  }
  if(description == ''){
    document.getElementById('message').innerHTML = 'Description cannot be empty!'
    document.getElementById('message').style.display = 'flex'
    return
  }
  if(bounty_field == ''){
    document.getElementById('message').innerHTML = 'Prize cannot be empty!'
    document.getElementById('message').style.display = 'flex'
    return
  }
  document.getElementById('message').style.display = 'none'
  document.getElementById('post_problem_btn_message').style.display = 'flex'

  $.post(root_domain+'/submit_a_problem',   // url
     { title: title, description: description, bounty: bounty_field }, // data to be submit
     function(data, status, jqXHR) { // success callback

        console.log("response from server:")
        console.log(data)
        if(data['message'] == "success"){
          document.getElementById('post_problem_btn_message').style.display = 'flex'
          newProblem_id = data['problem_id']
          txid = data['lntx']['id']
          setInterval(check_tx_status, 2000, txid)
          // show qr code
          show_ln_request(data['lntx']['payment_request'])
        }else if(data=="less_bounty"){
          document.getElementById('post_problem_btn_message').style.display = 'none'
          document.getElementById('message').style.display = 'flex'
          document.getElementById('message').innerHTML = 'Bounty needs to be atleast 1000 sats'
        }else{
          document.getElementById('post_problem_btn_message').style.display = 'none'
          document.getElementById('message').style.display = 'flex'
          document.getElementById('message').innerHTML = 'Some problem occured'
        }
  })
}

// This function shows a pop window to show invoice as a QR code
function show_ln_request(pay_req){ // https://tingle.robinparisi.com/
  // instanciate new modal
  var modal = new tingle.modal({
      footer: true,
      stickyFooter: false,
      closeMethods: ['overlay', 'button', 'escape'],
      closeLabel: "Close",
      cssClass: ['custom-class-1', 'custom-class-2'],
      onOpen: function() {
          console.log('modal open');
      },
      onClose: function() {
          console.log('modal closed');
      },
      beforeClose: function() {
          // here's goes some logic
          // e.g. save content before closing the modal
          return true; // close the modal
          return false; // nothing happens
      }
  });

  // set content
  modal.setContent('<div class=\'modal-content\'><div class=\'modal-content-inner\'><h1>LN-Payment Request</h1><div class=\'modal-content-inner-row\'><div id=\'qr_code\'></div><textarea id=\'pay_req_text\'></textarea></div><br><p id=\'payment_message\'>Awating payment..</p></div></div>');

  pay_req_qrcode = new QRCode(document.getElementById('qr_code'), pay_req)
  document.getElementById('pay_req_text').innerHTML = pay_req
  document.getElementById('pay_req_text').readOnly = "true"
  // add a button
  modal.addFooterBtn('Go to Problem', 'tingle-btn tingle-btn--primary', function() {
      // here goes some logic
      // go to root_domain/problem/<newProblem_id>
      if(newProblem_id != null)
      window.location.replace(root_domain+'/problem/'+newProblem_id)
      modal.close();
  });


  // add another button
  modal.addFooterBtn('Cancel', 'tingle-btn tingle-btn--danger', function() {
      // here goes some logic
      document.getElementById('post_problem_btn_message').style.display = 'none'
      modal.close();
  });

  // open modal
  modal.open();

} // show_ln_request() - end

// This function checks of transaction is settled
function check_tx_status(txid){
  let lntx = new LNPayLnTx(txid);
  lntx.getInfo(function(result) {
    console.log("tx settled: "+result.settled)
    if(result.settled == 1){
      window.location.replace(root_domain+'/problem/'+newProblem_id)
      document.getElementById('payment_message').innerHTML = "Payment settled. Redirecting.."
      //modal.close();
      }
  }
  );
}
