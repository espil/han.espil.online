$(document).ready(function() {
    function goToSection(id) {
        $("#section1").css({
            transform: $("#" + id).css("transform")
        });

        $("#" + id).css({
            transform: "translate(0, 0)"
        });

        $("#upButton, #downButton, #leftButton, #rightButton").prop("disabled", true);
    }

    function goToHome(id) {
        $("#" + id).css({
            transform: $("#" + id).data('original-transform')
        });

        $("#section1").css({
            transform: "none"
        });

        $("#upButton, #downButton, #leftButton, #rightButton").prop("disabled", false);
    }

    $(".section:not(#section1)").each(function() {
        $(this).data('original-transform', $(this).css('transform'));
    });

    $("#leftButton").click(function() {
        goToSection("section2");
    });

    $("#rightButton").click(function() {
        goToSection("section3");
    });

    $("#upButton").click(function() {
        goToSection("section4");
    });

    $("#downButton").click(function() {
        goToSection("section5");
    });

    $("#homeButton2").click(function() {
        goToHome("section2");
    });

    $("#homeButton3").click(function() {
        goToHome("section3");
    });

    $("#homeButton4").click(function() {
        goToHome("section4");
    });

    $("#homeButton5").click(function() {
        goToHome("section5");
    });
});
