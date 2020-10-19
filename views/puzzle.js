root_domain = "https://"+window.location.href.split('/')[2]

function submit_solution(){
  description = document.getElementById('user_solution_description_field').value
  if(description == ''){
    document.getElementById('message').innerHTML = 'Solution cannot be empty'
    document.getElementById('message').style.display = 'flex'
    return
  }
  document.getElementById('message').style.display = 'none'

  url = window.location.href.split('/')
  if(url[url.length - 1] == "")
    problem_id = url[url.length - 2]
  else
    problem_id = url[url.length - 1]

  console.log("problem_id: "+problem_id)
  $.post(root_domain+'/submit_solution',   // url
     { problem_id: problem_id, description: description }, // data to be submit
     function(data, status, jqXHR) {// success callback
        //$('p').append('status: ' + status + ', data: ' + data);
        console.log("response from server:")
        console.log(data)
        if(data == "success"){
          document.getElementById('message').innerHTML = 'Puzzle submitted!!'
          document.getElementById('message').style.color = '#0b8970'
          document.getElementById('message').style.display = 'flex'
          document.getElementById('user_solution_description_field').value = ""
          window.location.reload(true);
        }else if(data == "not authenticated"){
          document.getElementById('message').innerHTML = 'You have to be logged in to answer.'
          document.getElementById('message').style.display = 'flex'

        }
  })
}

function accept_solution(solution_id){
  problem_id = document.getElementById('data_problem_id').innerHTML

  $.post(root_domain+'/accept_solution',   // url
     { problem_id: problem_id, solution_id: solution_id }, // data to be submit
     function(data, status, jqXHR) {// success callback
        //$('p').append('status: ' + status + ', data: ' + data);
        console.log("response from server:")
        console.log(data)
        if(data == "success"){
          document.getElementById('message-'+solution_id).innerHTML = 'Solution Accepted!!'
          document.getElementById('message-'+solution_id).style.color = '#0b8970'
          document.getElementById('message-'+solution_id).style.display = 'flex'
          window.location.reload(false);
        }else if(data == "not authenticated"){
          document.getElementById('message-'+solution_id).innerHTML = 'You have to be logged in to answer.'
          document.getElementById('message-'+solution_id).style.display = 'flex'
        }else if(data == "another_solution_already_accepted"){
          document.getElementById('message-'+solution_id).innerHTML = 'You\'ve already accepted an answer.'
          document.getElementById('message-'+solution_id).style.display = 'flex'
        }
  })
}

function vote(id, action){
  if(action == 'up'){
    if(document.getElementById(id+'_downvote').classList.contains('arrow-selected'))
      document.getElementById(id+'_downvote').classList.toggle('arrow-selected')
    document.getElementById(id+'_upvote').classList.toggle('arrow-selected')
  }else{ // downvote
    if(document.getElementById(id+'_upvote').classList.contains('arrow-selected'))
      document.getElementById(id+'_upvote').classList.toggle('arrow-selected')
    document.getElementById(id+'_downvote').classList.toggle('arrow-selected')
  }
}
