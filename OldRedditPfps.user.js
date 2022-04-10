// ==UserScript==
// @name         Old Reddit Profile Pictures
// @version      3.0
// @description  Show profile pictures on reddit.
// @author       YukisCoffee
// @match        https://www.reddit.com/r/*/comments/*
// @match        https://old.reddit.com/r/*/comments/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
// Forked from https://github.com/LenAnderson/Reddit-Profile-Pictures/raw/master/reddit_profile_pictures.user.js

(function() {
    // Remember if mutations should call the lazy load handler
    var lazyLoadMutations = false;
    // Registry to remember user links already crawled.
    var userPfpRegistry = {};

    async function init()
    {
        // Wait for document head element
        while (null == document.head)
        {
            await new Promise(r => requestAnimationFrame(r));
        }

        // Inject some general CSS to elegantly display
        document.head.insertAdjacentHTML("beforeend",
            `<style>
                .reddit-profile-picture a, .reddit-profile-picture a.author::before, .reddit-profile-picture a.author::after {
                    all: revert;
                }
                .reddit-profile-picture, .reddit-profile-picture img,
                .reddit-profile-picture a
                {
                    width: 48px;
                    height: 48px;
                    border-radius: 3px;
                    display: inline-block;
                    transition: all 150ms;
                }
                .reddit-profile-picture a
                {
                    background: #ccc;
                }
                .reddit-profile-picture
                {
                    float: left;
                    margin-right: 7px;
                    border-radius: 2px;
                }
                .thing.collapsed .reddit-profile-picture a
                {
                    pointer-events: none;
                }
                .thing.collapsed .reddit-profile-picture
                {
                    width: 0;
                    height: 0;
                    opacity: 0;
                }
            </style>`
        );
    }
    init();

    async function addAvatars (root=document)
    {
		Array.from(root.querySelectorAll('.thing:not(.morechildren)')).forEach(async(thing)=>{
            // Kill myself if unnecessary (mood tbh)
			if (!thing) return;
			if (thing._hasProfilePicture) return;
            if (!thing.id) return;
            var a;
            if (a = thing.querySelector(`#${thing.id} > .entry > .tagline > .author`)) {} else return;

            // Little embedded "pixel" image to prevent ugly browser null image
            // placeholder
            const EMBEDDED_PIXEL_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

            // Please keep the class name the same! Rest of the code relies on this
            // reference...
            var html =
                `<div class="reddit-profile-picture">
                    <a class="${a.getAttribute('class')}" href="${a.href}">
                        <img src="${EMBEDDED_PIXEL_IMG}">
                    </a>
                </div>`;

            // Inject and create a reference
            thing.querySelector('.entry').insertAdjacentHTML("beforebegin", html);
            var img = document.querySelector(`#${thing.id} .reddit-profile-picture img`);

            // Remember I have a profile picture!
            thing._hasProfilePicture = true;

            // Lazy load to load photos on AJAX without
            // further user action
            if (lazyLoadMutations) lazyLoadHandler();
		});
	};
	addAvatars();

	var mo = new MutationObserver((muts) =>
    {
		muts.forEach(mut=>{
			Array.from(mut.addedNodes).forEach(node=>{
				if (node instanceof HTMLElement) {
					addAvatars();
				}
			});
		});
	});

    async function startObservation()
    {
        // Wait the "commentarea" element to load
        while (0 == document.getElementsByClassName("commentarea").length)
        {
            await new Promise(r => requestAnimationFrame(r));
        }

        mo.observe(document.getElementsByClassName("commentarea")[0], {childList: true, subtree: true});
    }
    startObservation();

    async function setProfilePicture(pfpDiv)
    {
        // Return and do nothing if already loaded
        if (pfpDiv._imgLoaded) return;

        var a = pfpDiv.getElementsByTagName("a")[0];
        var img = a.children[0];

        // Request the data if it was not already retrieved.
        // Otherwise, pull it from the registry!
        var data;
        if (null == userPfpRegistry[a.href])
        {
            var request = await fetch(a.href + "/about.json");
            data = (await request.json()).data;
            userPfpRegistry[a.href] = data;
        }
        else
        {
            data = userPfpRegistry[a.href];
        }

        console.log(data);

        // This hack is needed to prevent 403s when requesting the
        // profile image from the anchor. No clue why...? Origin
        // thing I guess?
        var hak = document.createElement("textarea");
        hak.innerHTML = data.icon_img;
        img.src = hak.value;

        // Remember we already loaded
        pfpDiv._imgLoaded = true;
    }

    // Lazy loading
    async function lazyLoadHandler(evt)
    {
        // Since the page already are loaded, assuredly,
        // I can safely allow mutations (such as from AJAX)
        // to automatically call me.
        lazyLoadMutations = true;

        var images = document.getElementsByClassName("reddit-profile-picture"), elm;

        for (var i = 0; i < images.length; i++)
        {
            elm = images[i].getElementsByTagName("img")[0];

            // Skip if not displayed (where offsetParent is null in JS)
            if (null == elm.offsetParent) continue;

            var bounds = elm.getBoundingClientRect();
            if (bounds.top < window.innerHeight)
            {
                setProfilePicture(images[i]);
            }
        }
    }

    // Automatically call lazy load handler on most
    // user interaction
    window.addEventListener("scroll", lazyLoadHandler);
    window.addEventListener("load", lazyLoadHandler);
    window.addEventListener("resize", lazyLoadHandler);
    window.addEventListener("click", lazyLoadHandler);
    window.addEventListener("resize", lazyLoadHandler);
})();
