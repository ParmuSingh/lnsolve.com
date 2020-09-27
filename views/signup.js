root_domain = "https://"+window.location.href.split('/')[2]

function sha256(plain_text){
  var md = forge.md.sha256.create();
  md.start();
  md.update(plain_text, "utf8");
  var hashText = md.digest().toHex();
  return hashText
}

function signup_user(){
  username = document.getElementById('username').value
  password = document.getElementById('password').value

  if(username == ''){
    document.getElementById('password_do_not_match_text').innerHTML = 'Username cannot be empty!'
    document.getElementById('password_do_not_match_text').style.display = 'flex'
    return
  }
  if(password == ''){
    document.getElementById('password_do_not_match_text').innerHTML = 'Password cannot be empty!'
    document.getElementById('password_do_not_match_text').style.display = 'flex'
    return
  }
  password_repeat = document.getElementById('password-repeat').value
  password = sha256(password)
  password_repeat = sha256(password_repeat)

  if(password === password_repeat){
    var patt = /^[a-z0-9_]+$/i
    if(!patt.test(username)){
      document.getElementById('password_do_not_match_text').innerHTML = 'Username should be alphanumeric'
      document.getElementById('password_do_not_match_text').style.display = 'flex'
      return
    }
    document.getElementById('password_do_not_match_text').style.display = 'none'
    $.post(root_domain+'/signup',   // url
       { id: username, password: password }, // data to be submit
       function(data, status, jqXHR) {// success callback
          //$('p').append('status: ' + status + ', data: ' + data);
          console.log("response from server:")
          console.log(data)
          console.log(status)
          if(data == "success"){
            document.getElementById('password_do_not_match_text').innerHTML = 'User Created!! Redirecting now..'
            document.getElementById('password_do_not_match_text').style.color = '#0b8970'
            document.getElementById('password_do_not_match_text').style.display = 'flex'
            window.location.replace(root_domain)
          }else if(data == "user already exists"){
            document.getElementById('password_do_not_match_text').innerHTML = 'Username already taken'
            document.getElementById('password_do_not_match_text').style.display = 'flex'
          }
    })


  }else{
    document.getElementById('password_do_not_match_text').innerHTML = 'Passwords do not match!'
    document.getElementById('password_do_not_match_text').style.display = 'flex'
  }

}
