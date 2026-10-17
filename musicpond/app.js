"use strict";
/* Music Pond - interactive web revival of the 2018 React Native app.
   Firebase is bypassed by design: no account or password is needed,
   all state lives in this browser (localStorage). */

var TEACHERS = [
  { id:"lorenzo", name:"Lorenzo de Sequera", instrument:"Guitar",
    genre:"Rock, Metal, and Blues", cost:"$40 per 60 minute lesson", years:10,
    avail:"Every Friday", days:[4],
    bio:"My name is Lorenzo, and I have been teaching guitar for over 10 years. I have experience playing and touring with many bands. I also post video game covers on YouTube.",
    photo:"assets/LorenzoHeadshotSmall.jpg", location:"Vancouver, BC" },
  { id:"pond", name:"Firstname Lastname", instrument:"Piano",
    genre:"Classical and Contemporary", cost:"$35 per 60 minute lesson", years:5,
    avail:"Wednesdays and Saturdays", days:[2,5],
    bio:"Piano lessons for every level, from first notes to exam preparation. Lessons are built around the music you actually want to play.",
    photo:"assets/Profile.png", location:"Burnaby, BC" }
];
var TIMES = ["4:00PM - 4:30PM","4:30PM - 5:00PM","5:00PM - 5:30PM","5:30PM - 6:00PM","6:00PM - 6:30PM","6:30PM - 7:00PM"];
var DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

var S = load();
function load(){ try{ return JSON.parse(localStorage.getItem("mp_state")) || {}; }catch(e){ return {}; } }
function save(){ try{ localStorage.setItem("mp_state", JSON.stringify(S)); }catch(e){} }
S.profile = S.profile || {}; S.bookings = S.bookings || []; S.availability = S.availability || {days:[],slots:[]};

var screen = document.getElementById("screen");
var appbar = document.getElementById("appbar");
var tabbar = document.getElementById("tabbar");
var drawer = document.getElementById("drawer");
var barTitle = document.getElementById("barTitle");
var current = "splash";

function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function toast(msg){ var t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.getElementById("phone").appendChild(t); setTimeout(function(){ t.remove(); },2200); }

function setChrome(title, tabs){
  var inApp = !!S.role;
  appbar.hidden = !inApp;
  tabbar.hidden = !(inApp && tabs);
  drawer.hidden = true;
  if(inApp){ barTitle.textContent = title || "Music Pond"; renderTabs(tabs); }
}
function renderTabs(active){
  var defs = S.role==="student"
    ? [["studentHome","Home.png","Home"],["sProfile","Profile.png","Profile"],["findTeacher","Teacher_Search.png","Find"],["myBookings","Booking.png","Bookings"],["sCalendar","CalendarGreen.png","Calendar"]]
    : [["teacherHome","Home.png","Home"],["tProfile","Profile.png","Profile"],["availability","CalendarGreen.png","Avail."],["tCalendar","CalendarBlank.png","Calendar"],["signout","Sign_Out_Icon.png","Sign Out"]];
  tabbar.innerHTML = defs.map(function(d){
    return '<button class="'+(d[0]===active?"on":"")+'" data-go="'+d[0]+'"><img src="assets/'+d[1]+'" alt="">'+d[2]+"</button>";
  }).join("");
}
function renderDrawer(){
  var items = S.role==="student"
    ? [["studentHome","Home.png","Home"],["sProfile","Profile.png","Profile"],["findTeacher","Teacher_Search.png","Find Teacher"],["myBookings","Booking.png","Bookings"],["signout","Sign_Out_Icon.png","Sign Out"]]
    : [["teacherHome","Home.png","Home"],["tProfile","Profile.png","Profile"],["availability","CalendarGreen.png","Availability"],["signout","Sign_Out_Icon.png","Sign Out"]];
  drawer.innerHTML = items.map(function(d){ return '<button data-go="'+d[0]+'"><img src="assets/'+d[1]+'" alt="">'+d[2]+"</button>"; }).join("");
}
document.getElementById("menuBtn").addEventListener("click", function(){ renderDrawer(); drawer.hidden = !drawer.hidden; });
document.getElementById("outBtn").addEventListener("click", function(){ go("signout"); });
document.addEventListener("click", function(e){
  var b = e.target.closest("[data-go]"); if(!b) return;
  go(b.getAttribute("data-go"), b.getAttribute("data-id") || undefined);
});

function go(name, arg){
  screen.onclick = null;
  drawer.hidden = true;
  current = name;
  window.scrollTo(0,0); screen.scrollTop = 0;
  var V = VIEWS[name]; if(!V) return;
  V(arg);
  screen.querySelectorAll("[data-act]").forEach(function(el){
    el.addEventListener("click", function(){ ACT[el.getAttribute("data-act")](el); });
  });
}

/* ---------- shared bits ---------- */
function teacherOfDay(){ return TEACHERS[0]; }
function nextDates(days, n){
  var out=[], d=new Date(); d.setHours(0,0,0,0);
  while(out.length<n){ d.setDate(d.getDate()+1); var jsDay=d.getDay(); var mon0=(jsDay+6)%7; if(days.indexOf(mon0)>=0) out.push(new Date(d)); }
  return out;
}
function fmtDate(d){ return d.toLocaleDateString("en-US",{weekday:"long", month:"long", day:"numeric", year:"numeric"}); }
function monthGrid(year, month, marked){
  var first=new Date(year, month, 1); var startDay=(first.getDay()+6)%7;
  var dim=new Date(year, month+1, 0).getDate(); var today=new Date();
  var h='<div class="cal">'+DOW.map(function(x){return '<div class="dow">'+x+"</div>";}).join("");
  for(var i=0;i<startDay;i++) h+='<div class="d" style="visibility:hidden"></div>';
  for(var d=1; d<=dim; d++){
    var iso=year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    var cls="d"+(marked[iso]?" booked":"")+((today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===d)?" today":"");
    h+='<div class="'+cls+'" data-iso="'+iso+'">'+d+"</div>";
  }
  return h+"</div>";
}

/* ---------- views ---------- */
var VIEWS = {

splash: function(){
  setChrome("", false);
  screen.innerHTML = '<div class="center"><img class="splashLogo" src="assets/MusicPondlogo.png" alt="Music Pond">'
    + '<p class="sub">Where music students meet their teachers.</p>'
    + '<p class="note" style="margin-top:26px">Loading the pond...</p></div>';
  setTimeout(function(){ if(current==="splash") go("signin"); }, 1200);
  screen.onclick = function(){ go("signin"); };
},

signin: function(){
  S.role = null; save(); setChrome("", false);
  screen.innerHTML = '<div class="center"><img class="logoBig" src="assets/MusicPondlogo.png" alt="Music Pond"></div>'
    + '<div class="card"><label class="f">Email</label><input type="email" id="em" value="guest@musicpond.demo">'
    + '<label class="f">Password</label><input type="password" id="pw" value="demo">'
    + '<button class="imgbtn wide" data-act="enter"><img src="assets/SignInButton.png" alt="Sign In"></button>'
    + '<p class="note center">Archive build: Firebase sign-in is bypassed. Leave the fields as they are, or type anything - no real account is used and nothing leaves this browser.</p></div>'
    + '<p class="center note">New to the pond?</p>'
    + '<button class="imgbtn wide" data-act="enter"><img src="assets/SignUpButton.png" alt="Sign Up"></button>';
},

role: function(){
  setChrome("", false);
  screen.innerHTML = '<div class="center"><img class="logoBig" src="assets/MusicPondlogo.png" alt="Music Pond">'
    + '<h1 class="t">Teacher or Student</h1><p class="sub">Every account starts here. Pick your side of the pond.</p></div>'
    + '<button class="imgbtn wide" data-go="sSignup"><img src="assets/IamStudent_Button.png" alt="I am a Student"></button>'
    + '<button class="imgbtn wide" data-go="tSignup"><img src="assets/IamTeacher_Button.png" alt="I am a Teacher"></button>'
    + '<p class="center" style="margin-top:14px"><a class="link" href="#" data-go="signin">Back to sign in</a></p>';
},

sSignup: function(){ signupForm("student"); },
tSignup: function(){ signupForm("teacher"); },

sSetup: function(){ setupForm("student"); },
tSetup: function(){ setupForm("teacher"); },

sSuccess: function(){ successScreen("student"); },
tSuccess: function(){ successScreen("teacher"); },

studentHome: function(){
  setChrome("Student Home", "studentHome");
  var t = teacherOfDay();
  screen.innerHTML = '<h2 class="t">Teacher of the Day</h2>'
    + '<div class="card"><div class="row"><img class="headshot" src="'+t.photo+'" alt=""><div class="col"><b style="font-size:17px;color:#14532d">'+esc(t.name)+'</b><div class="kv">'+esc(t.instrument)+' - '+esc(t.genre)+'</div><span class="badge">'+esc(t.avail)+'</span></div></div>'
    + '<p class="kv" style="margin-top:10px">'+esc(t.bio)+'</p>'
    + '<button class="imgbtn wide" data-go="teacherProfile" data-id="lorenzo"><img src="assets/ViewProfile_Button.png" alt="View Profile"></button>'
    + '<button class="btn" data-go="bookLesson" data-id="lorenzo">Book a Lesson</button></div>'
    + '<button class="imgbtn wide" data-go="findTeacher"><img src="assets/TeacherList_Button.png" alt="Teacher List"></button>'
    + '<button class="imgbtn wide" data-go="myBookings"><img src="assets/MyBookingButton.png" alt="My Bookings"></button>';
},

teacherHome: function(){
  setChrome("Teacher Home", "teacherHome");
  var mine = S.availability.days.length
    ? "You are available on "+S.availability.days.map(function(d){return DOW[d];}).join(", ")+(S.availability.slots.length? " at "+S.availability.slots.join(", "):"")+"."
    : "You have not set your availability yet.";
  screen.innerHTML = '<h2 class="t">Upcoming Lessons</h2>'
    + '<div class="card"><div class="row"><img class="headshot sm" src="assets/Profile.png" alt=""><div class="col"><b style="color:#14532d">Firstname Lastname</b><div class="kv">Piano<br>October 10th, 2018<br>5:30PM - 6:00PM</div></div></div>'
    + '<p class="note" style="margin-top:8px">The standing sample lesson from the original 2018 demo.</p></div>'
    + '<div class="card"><b style="color:#14532d">Your availability</b><p class="kv" style="margin-top:4px">'+esc(mine)+'</p>'
    + '<button class="btn small" data-go="availability">Set Availability</button></div>'
    + '<div class="card"><b style="color:#14532d">Your public profile</b><p class="kv" style="margin-top:4px">Students see your bio, lesson info, location and video tabs.</p>'
    + '<button class="btn small ghost" data-go="tProfile">View Profile</button></div>';
},

sProfile: function(){
  setChrome("My Profile", "sProfile");
  var p = S.profile;
  screen.innerHTML = '<div class="card center"><img class="headshot" src="'+(p.photo||"assets/Profile.png")+'" alt="">'
    + '<h2 class="t">'+esc(p.name||"Guest Student")+'</h2><p class="kv">Learning: <b>'+esc(p.instrument||"Piano")+'</b><br>'+esc(p.email||"guest@musicpond.demo")+'</p></div>'
    + '<div class="card"><b style="color:#14532d">My bookings</b><p class="kv">'+(S.bookings.length? S.bookings.length+" lesson(s) booked." : "No lessons booked yet.")+'</p>'
    + '<button class="btn small" data-go="myBookings">Open My Bookings</button></div>'
    + '<button class="btn ghost" data-go="sSetup">Edit Profile</button>';
},

tProfile: function(){
  setChrome("Teacher Profile", "tProfile");
  profileTabs(teacherSelf(), true);
},

findTeacher: function(){
  setChrome("Find a Teacher", "findTeacher");
  screen.innerHTML = '<h2 class="t">Find a Teacher</h2>' + TEACHERS.map(function(t){
    return '<div class="card"><div class="row"><img class="headshot sm" src="'+t.photo+'" alt=""><div class="col"><b style="color:#14532d;font-size:16px">'+esc(t.name)+'</b><div class="kv">'+esc(t.instrument)+' - '+esc(t.genre)+'<br>'+esc(t.cost)+'</div></div></div>'
      + '<button class="btn small" data-go="teacherProfile" data-id="'+t.id+'">View Profile</button></div>';
  }).join("");
},

teacherProfile: function(id){
  setChrome("Teacher Profile", "findTeacher");
  var t = TEACHERS.filter(function(x){return x.id===id;})[0] || TEACHERS[0];
  profileTabs(t, false);
},

bookLesson: function(id){
  setChrome("Lesson Booking", "findTeacher");
  var t = TEACHERS.filter(function(x){return x.id===id;})[0] || TEACHERS[0];
  var dates = nextDates(t.days, 4);
  screen.innerHTML = '<button class="imgbtn" data-go="teacherProfile" data-id="'+t.id+'" style="margin:0"><img src="assets/Back_Button.png" alt="Back" style="height:34px"></button>'
    + '<h2 class="t">Book a Lesson</h2><div class="card"><div class="row"><img class="headshot sm" src="'+t.photo+'" alt=""><div class="col"><b style="color:#14532d">'+esc(t.name)+'</b><div class="kv">'+esc(t.instrument)+' - '+esc(t.cost)+'</div></div></div></div>'
    + '<label class="f">Pick a day ('+esc(t.avail)+')</label><div class="slots" id="dSlots">'
    + dates.map(function(d,i){ return '<button data-d="'+d.toISOString().slice(0,10)+'" data-label="'+esc(fmtDate(d))+'" class="'+(i===0?"on":"")+'">'+d.toLocaleDateString("en-US",{weekday:"short", month:"short", day:"numeric"})+"</button>"; }).join("") + "</div>"
    + '<label class="f">Pick a time</label><div class="slots" id="tSlots">'
    + TIMES.map(function(x,i){ return '<button data-t="'+x+'" class="'+(i===2?"on":"")+'">'+x+"</button>"; }).join("") + "</div>"
    + '<button class="imgbtn wide" data-act="confirmBook" data-id="'+t.id+'"><img src="assets/BookLesson_Button.png" alt="Book Lesson"></button>';
  pickWire("dSlots"); pickWire("tSlots");
},

bookingSuccess: function(){
  setChrome("Booking Success", "myBookings");
  var b = S.bookings[S.bookings.length-1] || {};
  screen.innerHTML = '<div class="center"><img class="check" src="assets/CheckMark.png" alt=""><h1 class="t">Booking Success</h1>'
    + '<p class="sub">Your lesson is in the pond.</p></div>'
    + '<div class="card"><p class="kv"><b>'+esc(b.teacherName||"")+'</b> - '+esc(b.instrument||"")+'<br>'+esc(b.dateLabel||"")+'<br>'+esc(b.time||"")+'</p></div>'
    + '<button class="btn" data-go="myBookings">Go to My Bookings</button>'
    + '<button class="btn ghost" data-go="studentHome">Back to Home</button>';
},

myBookings: function(){
  setChrome("My Bookings", "myBookings");
  if(!S.bookings.length){
    screen.innerHTML = '<h2 class="t">My Bookings</h2><div class="card"><p class="kv">No lessons booked yet. Find a teacher and book your first lesson.</p><button class="btn small" data-go="findTeacher">Find a Teacher</button></div>';
    return;
  }
  screen.innerHTML = '<h2 class="t">My Bookings</h2>' + S.bookings.map(function(b,i){
    return '<div class="card"><div class="row"><img class="headshot sm" src="assets/CalendarGreen.png" alt="" style="border:0;border-radius:0;object-fit:contain;background:none"><div class="col"><b style="color:#14532d">'+esc(b.teacherName)+'</b><div class="kv">'+esc(b.instrument)+'<br>'+esc(b.dateLabel)+'<br>'+esc(b.time)+'</div></div></div>'
      + '<button class="btn small ghost" data-act="cancelBooking" data-i="'+i+'">Cancel Booking</button></div>';
  }).join("");
},

sCalendar: function(){
  setChrome("Calendar", "sCalendar");
  var now=new Date(), marked={};
  S.bookings.forEach(function(b){ marked[b.dateISO]=b; });
  screen.innerHTML = '<h2 class="t">'+now.toLocaleDateString("en-US",{month:"long", year:"numeric"})+'</h2>'
    + monthGrid(now.getFullYear(), now.getMonth(), marked)
    + '<div id="calList"><p class="note" style="margin-top:10px">Days with lessons are highlighted. Tap one to see the lesson.</p></div>';
  screen.querySelectorAll(".cal .d.booked").forEach(function(el){
    el.addEventListener("click", function(){
      var b = marked[el.getAttribute("data-iso")];
      document.getElementById("calList").innerHTML = '<div class="card"><b style="color:#14532d">'+esc(b.teacherName)+'</b><p class="kv">'+esc(b.instrument)+'<br>'+esc(b.dateLabel)+'<br>'+esc(b.time)+"</p></div>";
    });
  });
},

availability: function(){
  setChrome("Availability", "availability");
  var days = S.availability.days.slice(), slots = S.availability.slots.slice();
  screen.innerHTML = '<h2 class="t">Set Your Availability</h2><p class="sub">Pick the days and times you teach. Students will be able to book these times.</p>'
    + '<label class="f">Days</label><div class="days" id="aDays">'
    + DOW.map(function(d,i){ return '<button data-d="'+i+'" class="'+(days.indexOf(i)>=0?"on":"")+'">'+d[0]+"</button>"; }).join("") + "</div>"
    + '<label class="f">Times</label><div class="slots" id="aSlots">'
    + TIMES.map(function(x){ return '<button data-t="'+x+'" class="'+(slots.indexOf(x)>=0?"on":"")+'">'+x+"</button>"; }).join("") + "</div>"
    + '<button class="btn" data-act="saveAvail">Confirm Availability</button>';
  document.getElementById("aDays").addEventListener("click", function(e){ var b=e.target.closest("button"); if(!b) return; b.classList.toggle("on"); });
  document.getElementById("aSlots").addEventListener("click", function(e){ var b=e.target.closest("button"); if(!b) return; b.classList.toggle("on"); });
},

availConfirm: function(){
  setChrome("Confirm Availability", "availability");
  var a = S.availability;
  screen.innerHTML = '<h2 class="t">Confirm Availability</h2><div class="card"><p class="kv">Days: <b>'+a.days.map(function(d){return DOW[d];}).join(", ")+'</b><br>Times: <b>'+a.slots.join(", ")+'</b></p></div>'
    + '<button class="btn" data-go="availSuccess">Confirm</button><button class="btn ghost" data-go="availability">Back</button>';
},

availSuccess: function(){
  setChrome("Availability Success", "availability");
  screen.innerHTML = '<div class="center"><img class="check" src="assets/CheckMark.png" alt=""><h1 class="t">Availability Success</h1><p class="sub">Students can now book you at these times.</p></div>'
    + '<button class="btn" data-go="teacherHome">Go to Home</button>';
},

tCalendar: function(){
  setChrome("Calendar", "tCalendar");
  var now=new Date(), marked={};
  var sample = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-10"; marked[sample]=true;
  screen.innerHTML = '<h2 class="t">'+now.toLocaleDateString("en-US",{month:"long", year:"numeric"})+'</h2>'
    + monthGrid(now.getFullYear(), now.getMonth(), marked)
    + '<div class="card"><b style="color:#14532d">October 10th sample lesson</b><p class="kv">Firstname Lastname - Piano<br>5:30PM - 6:00PM</p><p class="note">Shown on the 10th of this month, as in the original demo data.</p></div>';
},

signout: function(){
  S.role = null; save();
  toast("Signed out. See you at the pond.");
  go("signin");
}
};

function signupForm(role){
  setChrome("", false);
  var isS = role==="student";
  screen.innerHTML = '<button class="imgbtn" data-go="role" style="margin:0"><img src="assets/Back_Button.png" alt="Back" style="height:34px"></button>'
    + '<div class="center"><img src="assets/'+(isS?"Student_Icon.png":"Teacher_Icon.png")+'" alt="" style="height:74px;width:auto"></div>'
    + '<h1 class="t center">Sign Up - I am a '+(isS?"Student":"Teacher")+'</h1>'
    + '<div class="card"><label class="f">Full name</label><input type="text" id="su_name" placeholder="Your name">'
    + '<label class="f">Email</label><input type="email" id="su_email" placeholder="you@example.com">'
    + '<label class="f">Password</label><input type="password" id="su_pw" placeholder="Anything - sign-in is bypassed">'
    + '<button class="imgbtn wide" data-act="doSignup" data-role="'+role+'"><img src="assets/Submit_Button.png" alt="Submit"></button>'
    + '<p class="note center">Bypass is on: every field is optional. Nothing is sent anywhere.</p></div>';
}

function setupForm(role){
  setChrome("", false);
  var isS = role==="student"; var p = S.profile;
  screen.innerHTML = '<h1 class="t center">'+(isS?"My Profile Set Up":"Create Profile")+'</h1>'
    + '<div class="card"><div class="center"><img id="phPrev" class="headshot" src="'+(p.photo||"assets/AddProfilePhoto.png")+'" alt="">'
    + '<label class="f center">Profile Photo Upload</label><input type="file" id="ph" accept="image/*"></div>'
    + '<label class="f">Name</label><input type="text" id="pf_name" value="'+esc(p.name||"")+'" placeholder="Your name">'
    + '<label class="f">'+(isS?"Instrument I want to learn":"Instrument I teach")+'</label>'
    + '<select id="pf_inst">'+["Piano","Guitar","Violin","Vocals","Flute","Drums","Cello","Trumpet"].map(function(x){ return '<option '+(p.instrument===x?"selected":"")+">"+x+"</option>"; }).join("")+"</select>"
    + (isS ? "" : '<label class="f">Genre</label><input type="text" id="pf_genre" value="'+esc(p.genre||"")+'" placeholder="Rock, Classical, Jazz...">'
      + '<label class="f">Lesson cost</label><input type="text" id="pf_cost" value="'+esc(p.cost||"")+'" placeholder="$40 per 60 minute lesson">'
      + '<label class="f">Bio</label><textarea id="pf_bio" placeholder="Tell students about your teaching...">'+esc(p.bio||"")+"</textarea>")
    + '<button class="btn" data-act="saveSetup" data-role="'+role+'">Save and Continue</button></div>';
  document.getElementById("ph").addEventListener("change", function(e){
    var f = e.target.files[0]; if(!f) return;
    var r = new FileReader(); r.onload = function(){ S.profile.photo = r.result; save(); document.getElementById("phPrev").src = r.result; }; r.readAsDataURL(f);
  });
}

function successScreen(role){
  setChrome("", false);
  screen.innerHTML = '<div class="center"><img class="check" src="assets/CheckMark.png" alt=""><h1 class="t">Set Up Complete</h1>'
    + '<p class="sub">Welcome to Music Pond, '+esc(S.profile.name||(role==="student"?"Student":"Teacher"))+'.</p></div>'
    + '<button class="btn" data-go="'+(role==="student"?"studentHome":"teacherHome")+'">Enter Music Pond</button>';
}

function teacherSelf(){
  var p = S.profile;
  return { id:"self", name:p.name||"Your Teacher Profile", instrument:p.instrument||"Piano",
    genre:p.genre||"All genres", cost:p.cost||"$40 per 60 minute lesson", years:10,
    avail: S.availability.days.length? S.availability.days.map(function(d){return DOW[d];}).join(", ") : "Every Friday",
    bio:p.bio||"This is your public teacher profile. Edit it from Create Profile to tell students about your teaching.",
    photo:p.photo||"assets/Teacher_Icon.png", location:"Vancouver, BC" };
}

function profileTabs(t, isSelf){
  var tabs = isSelf? ["Bio","Info","Map","Video"] : ["Bio","Lesson & Availability","Location","Video"];
  var html = '<div class="card"><div class="row"><img class="headshot" src="'+t.photo+'" alt=""><div class="col"><b style="font-size:17px;color:#14532d">'+esc(t.name)+'</b><div class="kv">'+esc(t.instrument)+'</div><span class="badge">'+esc(t.location)+'</span></div></div></div>'
    + '<div class="tabs">'+tabs.map(function(x,i){ return '<button data-tab="'+i+'" class="'+(i===0?"on":"")+'">'+x+"</button>"; }).join("")+"</div>"
    + '<div id="tabBody"></div>'
    + (isSelf? '<button class="btn ghost" data-go="tSetup">Edit Profile</button>' : '<button class="btn" data-go="bookLesson" data-id="'+t.id+'">Book a Lesson with '+esc(t.name.split(" ")[0])+"</button>");
  screen.innerHTML = html;
  function body(i){
    var el = document.getElementById("tabBody");
    if(i===0) el.innerHTML = '<div class="card"><p class="kv">'+esc(t.bio)+"</p></div>";
    if(i===1) el.innerHTML = '<div class="card"><p class="kv">Instrument: <b>'+esc(t.instrument)+'</b><br>Genre: <b>'+esc(t.genre)+'</b><br>Cost: <b>'+esc(t.cost)+'</b><br>Years taught: <b>'+esc(t.years)+'</b><br>Availability: <b>'+esc(t.avail)+"</b></p></div>";
    if(i===2) el.innerHTML = '<div class="card center"><img src="assets/DaySelectionLily.png" alt="" style="width:110px;height:auto"><p class="kv" style="margin-top:8px"><b>'+esc(t.location)+'</b><br>Studio lessons and local house calls. The exact address is shared once a lesson is booked, as in the original app.</p></div>';
    if(i===3) el.innerHTML = '<div class="card center"><p class="kv"><b>Introduction Video</b></p><p class="note" style="margin-top:6px">The 2018 demo carried a teacher introduction video slot here. The video file was not part of the archived source, so the slot is shown empty.</p></div>';
  }
  body(0);
  screen.querySelectorAll("[data-tab]").forEach(function(b){
    b.addEventListener("click", function(){
      screen.querySelectorAll("[data-tab]").forEach(function(x){ x.classList.remove("on"); });
      b.classList.add("on"); body(parseInt(b.getAttribute("data-tab"),10));
    });
  });
}

function pickWire(id){
  var box = document.getElementById(id); if(!box) return;
  box.addEventListener("click", function(e){ var b=e.target.closest("button"); if(!b) return;
    box.querySelectorAll("button").forEach(function(x){ x.classList.remove("on"); }); b.classList.add("on"); });
}

var ACT = {
  enter: function(){ go("role"); },
  doSignup: function(el){
    var role = el.getAttribute("data-role");
    S.profile.name = (document.getElementById("su_name").value||"").trim();
    S.profile.email = (document.getElementById("su_email").value||"").trim();
    save(); go(role==="student" ? "sSetup" : "tSetup");
  },
  saveSetup: function(el){
    var role = el.getAttribute("data-role");
    S.profile.name = (document.getElementById("pf_name").value||"").trim() || S.profile.name;
    S.profile.instrument = document.getElementById("pf_inst").value;
    if(role==="teacher"){
      S.profile.genre = document.getElementById("pf_genre").value;
      S.profile.cost = document.getElementById("pf_cost").value;
      S.profile.bio = document.getElementById("pf_bio").value;
    }
    S.role = role; save();
    go(role==="student" ? "sSuccess" : "tSuccess");
  },
  confirmBook: function(el){
    var t = TEACHERS.filter(function(x){ return x.id===el.getAttribute("data-id"); })[0] || TEACHERS[0];
    var dBtn = document.querySelector("#dSlots button.on"), tBtn = document.querySelector("#tSlots button.on");
    if(!dBtn || !tBtn){ toast("Pick a day and a time first."); return; }
    var m = document.createElement("div"); m.className="modal";
    m.innerHTML = '<div class="box"><h2 class="t">Would You Like To Book?</h2><p class="kv"><b>'+esc(t.name)+'</b> - '+esc(t.instrument)+'<br>'+esc(dBtn.getAttribute("data-label"))+'<br>'+esc(tBtn.getAttribute("data-t"))+'</p>'
      + '<div class="yn"><button class="btn" id="mYes" style="margin:0">Yes</button><button class="btn ghost" id="mNo" style="margin:0">No</button></div></div>';
    document.getElementById("phone").appendChild(m);
    document.getElementById("mNo").addEventListener("click", function(){ m.remove(); });
    document.getElementById("mYes").addEventListener("click", function(){
      S.bookings.push({ teacherId:t.id, teacherName:t.name, instrument:t.instrument,
        dateISO:dBtn.getAttribute("data-d"), dateLabel:dBtn.getAttribute("data-label"), time:tBtn.getAttribute("data-t") });
      save(); m.remove(); go("bookingSuccess");
    });
  },
  cancelBooking: function(el){
    S.bookings.splice(parseInt(el.getAttribute("data-i"),10),1); save(); go("myBookings"); toast("Booking cancelled.");
  },
  saveAvail: function(){
    var days=[], slots=[];
    document.querySelectorAll("#aDays button.on").forEach(function(b){ days.push(parseInt(b.getAttribute("data-d"),10)); });
    document.querySelectorAll("#aSlots button.on").forEach(function(b){ slots.push(b.getAttribute("data-t")); });
    if(!days.length || !slots.length){ toast("Pick at least one day and one time."); return; }
    S.availability = {days:days, slots:slots}; save(); go("availConfirm");
  }
};

go("splash");
