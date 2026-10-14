$(document).ready(function() {
   
   function hasClassUp() {
      return $('.logo-center').hasClass('up');
   }
   
   $(window).scroll(function() {
      if ($(document).scrollTop() > 50) {
         
         if (!hasClassUp()) {
            $(".logo-center").addClass("up");
         }
         
      } else {
         
         if (hasClassUp()) {
            $(".logo-center").removeClass("up");
         }
         
      }
   });
      
});

if (screen.width <= 699) {
  document.write('<link rel="import" href="mobile.html">');
}


const sections = [...document.querySelectorAll("section")];

let options = {
  rootMargin: "0px",
  threshold: 0.75,
};

const callback = (entries, observer) => {
  entries.forEach((entry) => {
    const { target } = entry;

    if (entry.intersectionRatio >= 0.75) {
      target.classList.add("is-visible");
    } else {
      target.classList.remove("is-visible");
    }
  });
};

const observer = new IntersectionObserver(callback, options);

// sections.forEach((section, index) => {
//   const sectionChildren = [...section.querySelector("[data-content]")];

  // sectionChildren.forEach((el, index) => {
  //   el.style.setProperty("--delay", `${index * 250}ms`);
  // });

  // observer.observe(section);

var elements;
var windowHeight;
// document.getElementById('content').innerText = "A lot of content to fill up the page. ".repeat(500)

const observered = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const square = entry.target.querySelector('.noanimfornow');

    if (entry.isIntersecting) {
      square.classList.add('animateme');
      return; // if we added the class, exit the function
    }

    // We're not intersecting, so remove the class!
    square.classList.remove('animateme');
  });
});

// observered.observe(document.querySelector('.animwrapper'));