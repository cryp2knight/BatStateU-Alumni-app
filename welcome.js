var postPagination = 5;
var currentUser = null;
var database = firebase.database();
var enrolmentData = {}
readPosts(postPagination);
$(document).ready(function() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('user is logged in');
            $("#sign-in").hide('fast');
            $("#welcome").css('display', 'block');
            currentUser = user;
            welcome(user);
        } else {
            $("#sign-in").css('display', 'block');
            $("#welcome").css('display', 'none');
            console.log("nottt");
        }
        $(".pageloader").fadeOut("slow");
    });
    $("#sign-out").click(function() {
        signOut();
    });
    $("#btnPost").click(function() {
        writePost(currentUser);
    });
    $("#get-enrolment-records").click(function() {
        getEnrolmentRecords(currentUser);
    });
    $("#paginatePost").click(function(event) {
        postPagination += 50;
        readPosts(postPagination);
    });
    $("#delete-notification").click(function(event) {
        $(".notification").hide();
    });
});

function card(pd) {
    var like = "";
    var liked = "";
    if (pd.like.isLikedbyUser()) {
        like = "has-text-danger";
        liked = "liked";
    }
    var reps = "";
    var rps = pd.reply.count();
    if (rps > 1) reps = rps + " replies"
    else if (rps == 1) reps = rps + " reply"
    return `
<div class="box post is-mobile" id="` + pd.id + `">
            <article class="media">
            <div class="media-left">
              <figure class="image is-64x64">
             <img src="` + pd.photoURL + `" alt="Image">
              </figure>
            </div>
            <div class="media-content">
              <div class="content">
                <p>
                  <strong>` + pd.name + `</strong> <small>` + pd.email + `</small> <small>` + pd.time + `</small>
                  <br></p>
                  <div>
                ` + pd.post + `
                </div>
                
              </div>
              <nav class="level is-mobile">
                <div class="level-left">
                  <a class="level-item reply-post" data-target="modal-` + pd.id + `" id="` + pd.id + `" aria-label="reply">
                    <span class="icon is-small"> 
                      <i class="fas fa-reply" aria-hidden="true"></i>
                    </span>&nbsp; ` + reps + `
                  </a>
                  <a class="level-item like-post ` + liked + `" id="` + pd.id + `" aria-label="like">
                  
                    <span class="icon is-small ` + like + `">
                      <i class="fas fa-heart" aria-hidden="true"></i>
                    </span>
                    &nbsp;` + pd.like.count() + `
                  </a>
                </div>
              </nav>
            </div>
          </article> </div>

<div class="modal" id="modal-` + pd.id + `">
  <div class="modal-background"></div>
  <div class="modal-card">
    <header class="modal-card-head">
    <figure class="image is-48x48">
       <img class="is-rounded" id="avatar" src="` + pd.photoURL + `"></img></figure>
      <p class="modal-card-title">&nbsp;&nbsp;` + pd.name + `</p>
      <button class="delete" id="modal-close-` + pd.id + `" aria-label="close"></button>
    </header>
    <section class="modal-card-body">
      ` + pd.post + `
    </section>
    <div class="level-left has-background-white">
         <a class="level-item reply-post" data-target="modal-` + pd.id + `" id="` + pd.id + `" aria-label="reply">
           <span class="icon is-medium"> 
             <i class="fas fa-reply" aria-hidden="true"></i>
           </span>&nbsp; ` + reps + `
         </a>
         <a class="level-item like-post ` + liked + `" id="` + pd.id + `" aria-label="like">
         
           <span class="icon is-medium ` + like + `">
             <i class="fas fa-heart" aria-hidden="true"></i>
           </span>
           &nbsp;` + pd.like.count() + `
         </a>
       </div>
    <footer class="modal-card-foot">
    <figure class="image is-48x48"><img class="is-rounded" id="avatar" src="` + currentUser.photoURL + `"></img></figure>&nbsp;
    <input class="input is-rounded is-focused" id="text-reply-` + pd.id + `" placeholder="reply on post">&nbsp;
      <button class="button is-success is-rounded" id="reply-button-` + pd.id + `">Reply</button>
    </footer>
  </div>
</div>`
}

function readPosts(pp) {
    database.ref("/forum").orderByChild("/postedon").limitToFirst(pp).on("value", function(snapshot) {
        k = ""
        snapshot.forEach(function(childSnapshot) {
            var data = childSnapshot.val();
            var postData = {
                id: childSnapshot.key,
                photoURL: data.photo,
                name: data.postedby.lastname + ", " + data.postedby.firstname,
                email: data.email,
                time: prettyDate(new Date(), new Date(data.postedon)),
                post: data.post,
                like: {
                    count: function() {
                        if (data.likes) return Object.keys(data.likes).length
                        else return 0
                    },
                    isLikedbyUser: function() {
                        for (var likeUserId in data.likes) {
                            if (data.likes.hasOwnProperty(likeUserId)) {
                                if (likeUserId == currentUser.uid) return true;
                            } else {
                                return false;
                            }
                        }
                    }
                },
                reply: {
                    count: function() {
                        if (data.replies) return Object.keys(data.replies).length
                        else return 0
                    }
                }
            }
            k += card(postData);
        });
        $("#posts").html(k);
        $('.like-post').click(function() {
            var id = $(this).attr('id');
            if ($(this).hasClass('liked')) {
                unlikePost(id, currentUser);
            } else {
                likePost(id, currentUser);
            }
        });
        $('.reply-post').click(function() {
            var id = $(this).attr('id');
            $("#modal-" + id).addClass('is-active');
            $("#reply-button-" + id).click(function() {
                replyToPost(id, currentUser, $("#text-reply-" + id).val());
            });
            $("#modal-close-" + id).click(function(event) {
                $("#modal-" + id).removeClass('is-active');
            });
        });
    });
}

function replyToPost(postId, user, reply) {
    var replyData = {
        userId: user.uid,
        email: user.email,
        photoURL: user.photoURL,
        reply: reply,
        timestamp: new Date().getTime(),
    };
    database.ref("/forum/" + postId + "/replies/").push().set(replyData, function(error) {
        if (error) {} else {
            console.log("you replied to this post!");
        }
    });
}

function unlikePost(postId, user) {
    var data = {
        likedon: null
    };
    database.ref("/forum/" + postId + "/likes/" + user.uid).set(data, function(error) {
        if (error) {} else {
            console.log("Post unlike!");
        }
    });
    database.ref("/users/" + user.uid + "/likeposts/" + postId).set(data, function(error) {
        if (error) {} else {
            console.log("removed from your liked posts");
        }
    });
}

function likePost(postId, user) {
    var d = new Date();
    var data = {
        likedon: -d.getTime()
    };
    database.ref("/forum/" + postId + "/likes/" + user.uid).set(data, function(error) {
        if (error) {} else {
            console.log("Post like!");
        }
    });
    database.ref("/users/" + user.uid + "/likeposts/" + postId).set(data, function(error) {
        if (error) {} else {
            console.log("saved in your liked posts");
        }
    });
}

function signOut() {
    firebase.auth().signOut().then(function() {
        // Sign-out successful.
        console.log("signOut");
    }).catch(function(error) {
        // An error happened.
    });
}

function getEnrolmentRecords(currentUser) {
    var sr = $("#srcode").val();
    var f = $("#fyear").val("2018").val();
    var s = parseInt(f) + 1;
    var sem = "FIRST";
    const proxyurl = "https://cors-anywhere.herokuapp.com/";
    var targeturl = "http://dione.batstate-u.edu.ph/public/sites/apps/student/ajax.php?" + "do=fetch_enrollment_records&schoolyear=" + f + "-" + s + "&semester=" + sem + "&srcode=" + sr;
    var url = proxyurl + targeturl;
    $.ajax({
        url: url,
        type: "GET",
        success: function(response) {
            var enrolment = $.parseJSON(response)[0];
            writeUser(currentUser, enrolment);
            console.log(response);
            welcome(currentUser);
        },
        error: function(xhr, status) {
            console.log(xhr);
        }
    });
}
var vv = {}

function retrievePost() {
    database.ref("/forum").on("value", function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            var data = childSnapshot.val();
            vv = data
        });
    });
}

function writeUser(user, enr) {
    if (enr) {
        database.ref('users/' + user.uid + "/enrolment").set(enr, function(error) {
            if (error) {} else {
                console.log("Data save!");
            }
        });
    } else {
        console.log("no data found!");
    }
}

function writePost(user) {
    var d = new Date();
    var post = $("#post").val();
    var data = {
        uid: user.uid,
        email: user.email,
        photo: user.photoURL,
        post: post,
        dateposted: d,
        postedby: enrolmentData,
        postedon: -d.getTime()
    };
    database.ref("forum").push().set(data, function(error) {
        if (error) {
            console.log(error)
            showNotif(error, "is-danger");
        } else {
            $("#post").val("");
            showNotif("Your post is posted!", "is-success");
            console.log("Post save!");
        }
    });
}

function showNotif(msg, label) {
    $(".notification-message").text(msg);
    if (label == "is-success") $(".notification").removeClass('is-danger');
    else $(".notification").removeClass('is-success');
    $(".notification").addClass(label);
    $(".notification").removeClass('invisible');
    $(".notification").slideDown();
}

function welcome(user) {
    $("#avatar").attr('src', user.photoURL);
    firebase.database().ref('/users/' + user.uid + '/enrolment').once('value').then(function(snapshot) {
        if (snapshot.val()) {
            enrolmentData = snapshot.val();
            $("#enrolment").css("display", "none");
            $("#forum").show();
            $("#name").text(enrolmentData.lastname + ", " + enrolmentData.firstname);
        } else {
            $("#enrolment").css("display", "block");
        }
    });
}

function prettyDate(date, startDate) {
    var secs = Math.floor((date.getTime() - startDate.getTime()) / 1000);
    if (secs < 60) return secs + " sec(s) ago";
    if (secs < 3600) return Math.floor(secs / 60) + " min(s) ago";
    if (secs < 86400) return Math.floor(secs / 3600) + " hour(s) ago";
    if (secs < 604800) return Math.floor(secs / 86400) + " day(s) ago";
    return date.toDateString();
}