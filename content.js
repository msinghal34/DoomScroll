/*
 * content.js - Content script for DoomScroll
 *
 * Copyright (C) 2025 Mayank Singhal
 *
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggle') {
        isEnabled = request.enabled;
        updateBlocking();
    }
});

// Listen for settings updates
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateSettings') {
        console.log('DoomScroll: Received settings update', request.settings);
        settings = { ...settings, ...request.settings };
        console.log('DoomScroll: Updated settings', settings);
        updateBlocking();
    }
    return true; // Keep the message channel open for async response if needed
});

// Default settings
let settings = {
    youtube: true,
    linkedin: true,
    facebook: true,
    twitter: true,
    reddit: true,
    instagram: true
};

let isEnabled = false;
let observer = null;

// Add debug logging
console.log('DoomScroll: Content script loaded');

// Function to handle initial setup
function initializeBlocking() {
    // Load settings and apply blocking
    chrome.storage.sync.get(settings, function(result) {
        console.log('DoomScroll: Loaded settings from storage', result);
        settings = { ...settings, ...result };
        console.log('DoomScroll: Current settings after load', settings);

        // Clear any previous blocking
        document.querySelectorAll('[data-doomscroll-blocked]').forEach(el => {
            el.style.display = '';
            el.removeAttribute('data-doomscroll-blocked');
            el.removeAttribute('data-doomscroll-original-display');
        });

        // Check if we should apply blocking for the current site
        const hostname = window.location.hostname;
        const shouldBlock = (hostname.includes('youtube.com') && settings.youtube) ||
                          (hostname.includes('linkedin.com') && settings.linkedin) ||
                          (hostname.includes('facebook.com') && settings.facebook) ||
                          (hostname.includes('x.com') && settings.twitter) ||
                          (hostname.includes('reddit.com') && settings.reddit) ||
                          (hostname.includes('instagram.com') && settings.instagram);

        if (shouldBlock) {
            // Apply blocking based on settings
            updateBlocking();

            // Set up mutation observer for dynamic content
            if (!observer) {
                observer = new MutationObserver(function(mutations) {
                    // Only trigger if we're not already updating
                    if (!window.doomscrollUpdating) {
                        window.doomscrollUpdating = true;
                        updateBlocking();
                        // Small debounce to prevent excessive updates
                        setTimeout(() => { window.doomscrollUpdating = false; }, 100);
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                    characterData: false
                });
                console.log('DoomScroll: MutationObserver started');
            }
        } else if (observer) {
            // If we shouldn't block but have an observer, clean it up
            observer.disconnect();
            observer = null;
        }
    });
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBlocking);
} else {
    initializeBlocking();
}

function updateBlocking() {
    const hostname = window.location.hostname;
    console.log('DoomScroll: Updating blocking for', hostname, 'with settings', settings);

    // First, unblock everything that was previously blocked
    document.body.style.overflow = 'auto';
    document.querySelectorAll('[data-doomscroll-blocked]').forEach(el => {
        const originalDisplay = el.getAttribute('data-doomscroll-original-display');
        if (originalDisplay) {
            el.style.display = originalDisplay === 'none' ? '' : originalDisplay;
        } else {
            el.style.display = '';
        }
        el.removeAttribute('data-doomscroll-blocked');
        el.removeAttribute('data-doomscroll-original-display');
    });

    // Only proceed with blocking if it's enabled for this specific site
    if ((hostname.includes('youtube.com') && !settings.youtube) ||
        (hostname.includes('linkedin.com') && !settings.linkedin) ||
        (hostname.includes('facebook.com') && !settings.facebook) ||
        (hostname.includes('x.com') && !settings.twitter) ||
        (hostname.includes('reddit.com') && !settings.reddit) ||
        (hostname.includes('instagram.com') && !settings.instagram)) {
        return;
    }

    // Then apply blocking only if the setting is enabled
    if (hostname.includes('youtube.com')) {
        console.log('DoomScroll: Checking YouTube - settings.youtube =', settings.youtube);
        if (settings.youtube) {
            console.log('DoomScroll: Blocking YouTube content');
            const elementsToBlock = [
                'ytd-rich-grid-renderer', // Main feed
                'ytd-rich-item-renderer', // Individual video cards
                'ytd-watch-next-secondary-results-renderer', // Suggested videos
                '#related' // Related videos
            ];
            blockElementsBySelectors(elementsToBlock);
        } else {
            console.log('DoomScroll: YouTube content should be visible');
        }
    }

    // LinkedIn
    if (hostname.includes('linkedin.com')) {
        console.log('DoomScroll: Checking LinkedIn - settings.linkedin =', settings.linkedin);
        if (settings.linkedin) {
            console.log('DoomScroll: Blocking LinkedIn content');
            const elementsToBlock = [
                '[aria-label="Main Feed"]', // Main feed
                '[aria-label="LinkedIn News"]' // Right Sidebar - News, Games and suggested profiles
            ];
            blockElementsBySelectors(elementsToBlock);
        } else {
            console.log('DoomScroll: LinkedIn content should be visible');
        }
    }

    // Facebook
    if (hostname.includes('facebook.com')) {
        console.log('DoomScroll: Checking Facebook - settings.facebook =', settings.facebook);
        if (settings.facebook) {
            console.log('DoomScroll: Blocking Facebook content');
            const elementsToBlock = [
                '[role="main"]' // Main content area
            ];
            blockElementsBySelectors(elementsToBlock);
        } else {
            console.log('DoomScroll: Facebook content should be visible');
        }
    }

    // Twitter
    if (hostname.includes('x.com')) {
        console.log('DoomScroll: Checking Twitter - settings.twitter =', settings.twitter);
        if (settings.twitter) {
            console.log('DoomScroll: Blocking Twitter content');
            const elementsToBlock = [
                'div[aria-label="Timeline: Your Home Timeline"]', // Timeline
                'div[aria-label="Trending"]' // Right Sidebar for Trending, Who to Follow
            ];
            blockElementsBySelectors(elementsToBlock);
        } else {
            console.log('DoomScroll: Twitter content should be visible');
        }
    }

    // Reddit
    if (hostname.includes('reddit.com')) {
        console.log('DoomScroll: Checking Reddit - settings.reddit =', settings.reddit);
        if (settings.reddit) {
            console.log('DoomScroll: Blocking Reddit content');
            const elementsToBlock = [
                '.masthead', // Top News
                '#right-sidebar-container', // Right sidebar
                'shreddit-feed' // Main feed and reddits
            ];
            blockElementsBySelectors(elementsToBlock);
        } else {
            console.log('DoomScroll: Reddit content should be visible');
        }
    }

    // Instagram
    if (hostname.includes('instagram.com')) {
        console.log('DoomScroll: Checking Instagram - settings.instagram =', settings.instagram);
        if (settings.instagram) {
            console.log('DoomScroll: Blocking Instagram content');
            const elementsToBlock = [
                'article' // Posts
            ];
            blockElementsBySelectors(elementsToBlock);
        } else {
            console.log('DoomScroll: Instagram content should be visible');
        }
    }
}

/**
 * Blocks elements matching the given CSS selectors
 * @param {string[]} selectors - Array of CSS selectors to block
 */
function blockElementsBySelectors(selectors) {
    // First, show all previously blocked elements
    document.querySelectorAll('[data-doomscroll-blocked]').forEach(el => {
        const originalDisplay = el.getAttribute('data-doomscroll-original-display');
        if (originalDisplay === 'none' || originalDisplay === '') {
            el.style.display = ''; // Reset to default
        } else {
            el.style.display = originalDisplay;
        }
        el.removeAttribute('data-doomscroll-blocked');
        el.removeAttribute('data-doomscroll-original-display');
    });

    // Then apply new blocking if needed
    if (selectors && selectors.length > 0) {
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element && element.parentNode && !element.hasAttribute('data-doomscroll-blocked')) {
                        // Store the original display value before hiding
                        const originalDisplay = window.getComputedStyle(element).display;
                        element.setAttribute('data-doomscroll-original-display', originalDisplay);

                        // Hide the element
                        element.style.display = 'none';
                        element.setAttribute('data-doomscroll-blocked', 'true');
                        console.log('DoomScroll: Blocked element with selector:', selector);
                    }
                });
            } catch (error) {
                console.error('Error blocking elements with selector:', selector, error);
            }
        });
    }
}
