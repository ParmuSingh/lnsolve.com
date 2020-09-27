root_domain = "https://"+window.location.href.split('/')[2]

function sha256(plain_text){
  var md = forge.md.sha256.create();
  md.start();
  md.update(plain_text, "utf8");
  var hashText = md.digest().toHex();
  return hashText
}

function login_user(){
  username = document.getElementById('username').value
  password = document.getElementById('password').value
  password = sha256(password)


  document.getElementById('password_do_not_match_text').style.display = 'none'
  $.post(root_domain+'/signin',   // url
     { id: username, password: password }, // data to be submit
     function(data, status, jqXHR) {// success callback
        //$('p').append('status: ' + status + ', data: ' + data);
        console.log("response from server:")
        console.log(data)
        console.log(status)
        if(data == "success"){
          document.getElementById('password_do_not_match_text').innerHTML = 'Logged in!! Redirecting now..'
          document.getElementById('password_do_not_match_text').style.color = '#0b8970'
          document.getElementById('password_do_not_match_text').style.display = 'flex'
          window.location.replace(root_domain)
        }else if(data == "incorrect password"){
          document.getElementById('password_do_not_match_text').innerHTML = 'Incorrect password!'
          document.getElementById('password_do_not_match_text').style.display = 'flex'
        }else if(data == "doesn't exists"){
          document.getElementById('password_do_not_match_text').innerHTML = "Username doesn't exist"
          document.getElementById('password_do_not_match_text').style.display = 'flex'
        }
  })
}
