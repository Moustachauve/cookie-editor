(function(){
    document.addEventListener('DOMContentLoaded', function () {
        var header = document.getElementById("main-header");
        var navbar = document.getElementById("main-nav");
        var resizeTimeout;

        // Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
        function onScroll() {
            console.log('yo');
            if (window.pageYOffset >= header.offsetHeight) {
                navbar.classList.add("sticky")
            } else {
                navbar.classList.remove("sticky");
            }
        }

        window.onscroll = onScroll;
        window.onresize = function () {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }

            resizeTimeout = setTimeout(onScroll, 50);
        };
        onScroll();
    });
})();