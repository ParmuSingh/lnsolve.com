root_domain = "https://"+window.location.href.split('/')[2]


function withdraw(username, balance){
  if(balance == 0){
    document.getElementById('message').style.display = 'flex'
    document.getElementById('message').innerHTML = 'you cannot withdraw with 0 balance!'
    return
  }

  show_ln_request()
  // withdraw has to be server side to avoid user changing client-side code and withdrawing more than he owns
  $.get(root_domain+'/lnurl_withdraw?amt='+balance+"&username="+username,   // url
     function(data, status, jqXHR) {// success callback
        //$('p').append('status: ' + status + ', data: ' + data);
        data = JSON.parse(data)
        console.log("response from server:")
        console.log(data)
        console.log(status)

        if(status == "success"){
          pay_req = data['lnurl']
          pay_req_qrcode = new QRCode(document.getElementById('qr_code'), pay_req)
          // document.getElementById('message').innerHTML = 'Puzzle submitted!!'
          // document.getElementById('message').style.color = '#0b8970'
          // document.getElementById('message').style.display = 'flex'

          // window.location.replace('https://'+root_domain)
        }
        if(data == "not enough balance"){
          document.getElementById('message').style.display = 'flex'
          document.getElementById('message').innerHTML = 'you don\'t have enought balance'
        }
  })
}

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
  modal.setContent('<div class=\'modal-content\'><div class=\'modal-content-inner\'><h1>LN-URL Request</h1><div id="qr_code"></div><br><p>Use your lnurl enabled lightning wallet to scan this qr code to withdraw your balance</p></div></div>');

  // add a button
  modal.addFooterBtn('Done', 'tingle-btn tingle-btn--primary', function() {
      // here goes some logic
      window.location.reload(false);
      modal.close();

  });

  // open modal
  modal.open();

} // show_ln_request() - end
