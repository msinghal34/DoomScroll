/*
 * content.js - Content script for DoomScroll
 *
 * Copyright (C) 2025 Mayank Singhal
 *
 * The hiding itself is declarative, in content.css. This script tells that
 * stylesheet which site it is on, whether blocking is on for it, and which page
 * of the single-page app is showing, and does what CSS cannot: it links each site's
 * own feed of what you follow, or a "Show feed" button, in place of the hidden one, and pauses
 * videos it has hidden.
 */

const SITES = {
    youtube: 'youtube.com',
    linkedin: 'linkedin.com',
    facebook: 'facebook.com',
    twitter: 'x.com',
    reddit: 'reddit.com',
    instagram: 'instagram.com'
};

const hostname = window.location.hostname;
const site = Object.keys(SITES).find(key =>
    hostname === SITES[key] || hostname.endsWith('.' + SITES[key]));
const root = document.documentElement;

// content.css hides the suggested home feed; this is the link to the site's own feed of what you
// follow that each site puts in its place
function feedLink(href, title, detail) {
    const link = document.createElement('a');
    link.id = 'doomscroll-feed-link';
    link.href = href;
    link.textContent = title;
    const line = document.createElement('span');
    line.textContent = detail;
    link.append(line);
    return link;
}

// Where a site has no feed of only what you follow, a button that shows the normal one, for this
// visit to the page
function showFeedButton() {
    const button = feedLink('#', 'Show feed',
        'Doom Scroll keeps the feed out of sight until you ask for it.');
    button.setAttribute('role', 'button');
    button.addEventListener('click', event => {
        event.preventDefault();
        root.setAttribute('data-doomscroll-reveal', '');
    });
    return button;
}

// The block holding the Stories tray whose sibling holds the feed, found by climbing from the tray
// but never out of the main column: while the page loads, a post can sit elsewhere, and climbing
// past the column put the link at the bottom of the page. Not found yet, the next change retries.
function blockBeside(tray, feedSelector) {
    const column = tray.closest('main, [role="main"]');
    let block = tray;
    const isFeed = sibling => sibling !== block && sibling.querySelector(feedSelector);
    while (block.parentElement && block.parentElement !== column &&
        ![...block.parentElement.children].some(isFeed)) {
        block = block.parentElement;
    }
    return block.parentElement && block.parentElement !== column ? block : null;
}

// Home pages that need more than CSS, run whenever the page changes while it is on its home path
const HOME = {
    instagram: {
        path: '/',
        run: () => {
            const tray = document.querySelector('main [data-pagelet="story_tray"]');
            const block = tray && blockBeside(tray, 'article');
            if (block) {
                block.after(feedLink('/?variant=following', 'Open Following',
                    'Posts from accounts you follow, newest first. Doom Scroll hides the suggested feed.'));
            }
        }
    },
    facebook: {
        path: '/',
        run: () => {
            const tray = document.querySelector('[role="main"] [data-focus-target="stories_tray"]');
            const block = tray &&
                blockBeside(tray, '[aria-posinset], [data-visualcompletion="loading-state"]');
            if (block) {
                block.after(feedLink('/?filter=all&sk=h_chr', 'Open Feeds',
                    'Posts from friends, groups and pages you follow, newest first. ' +
                    'Doom Scroll hides the suggested feed.'));
            }
        }
    },
    // Below the composer, where the "For you" timeline was
    twitter: {
        path: '/home',
        run: () => {
            const timeline = document.querySelector('[data-testid="primaryColumn"] section[role="region"]');
            if (timeline) {
                timeline.before(showFeedButton());
            }
        }
    },
    // Right after "Start a post", the feed list's first child
    linkedin: {
        path: '/feed',
        run: () => {
            const composer = document.querySelector('[data-testid="mainFeed"] > :first-child');
            if (composer) {
                composer.after(showFeedButton());
            }
        }
    }
};

let homePending = false;

function runHome() {
    homePending = false;
    if (root.getAttribute('data-doomscroll-path') === HOME[site].path &&
        !document.getElementById('doomscroll-feed-link')) {
        HOME[site].run();
    }
}

function scheduleRunHome() {
    if (!homePending) {
        homePending = true;
        requestAnimationFrame(runHome);
    }
}

// CSS hides a feed but not its sound: its videos keep autoplaying, so pause any video out of sight
function pauseIfHidden(video) {
    if (root.hasAttribute('data-doomscroll') && !video.paused &&
        !video.checkVisibility({ visibilityProperty: true })) {
        video.pause();
    }
}

function pauseHiddenVideos() {
    document.querySelectorAll('video').forEach(pauseIfHidden);
}

function setBlocking(enabled) {
    // Turning a site off and on again starts it over, with the feed hidden behind "Show feed"
    root.removeAttribute('data-doomscroll-reveal');
    if (enabled) {
        root.setAttribute('data-doomscroll', site);
        pauseHiddenVideos();
    } else {
        root.removeAttribute('data-doomscroll');
    }
}

function updatePath() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path !== root.getAttribute('data-doomscroll-path')) {
        root.removeAttribute('data-doomscroll-reveal');
    }
    root.setAttribute('data-doomscroll-path', path);
    pauseHiddenVideos();
}

if (site) {
    // Every site defaults to blocked, so hide before storage answers rather than flash the feed
    setBlocking(true);
    updatePath();

    chrome.storage.sync.get({ [site]: true }, result => setBlocking(result[site]));
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && site in changes) {
            setBlocking(changes[site].newValue !== false);
        }
    });

    // These sites route client-side, so follow history changes without a reload
    window.navigation.addEventListener('currententrychange', updatePath);
    if (site in HOME) {
        // At document_start there is no body yet, so watch the whole document
        new MutationObserver(scheduleRunHome).observe(root, { childList: true, subtree: true });
    }
    // Media events do not bubble, so catch play in the capture phase
    document.addEventListener('play', event => {
        if (event.target instanceof HTMLVideoElement) {
            pauseIfHidden(event.target);
        }
    }, true);
}
