/*
 * popup.js - Popup script for DoomScroll
 *
 * Copyright (C) 2025 Mayank Singhal
 *
 */

document.addEventListener('DOMContentLoaded', function() {
    const toggles = {
        youtube: document.getElementById('youtubeToggle'),
        linkedin: document.getElementById('linkedinToggle'),
        facebook: document.getElementById('facebookToggle'),
        twitter: document.getElementById('twitterToggle'),
        reddit: document.getElementById('redditToggle'),
        instagram: document.getElementById('instagramToggle')
    };

    // Default settings
    const defaultSettings = {
        youtube: true,
        linkedin: true,
        facebook: true,
        twitter: true,
        reddit: true,
        instagram: true
    };

    // Load saved state
    chrome.storage.sync.get(defaultSettings, function(settings) {
        // Update UI with saved settings
        Object.keys(toggles).forEach(site => {
            if (toggles[site]) {
                toggles[site].checked = settings[site];
            }
        });
    });

    // Handle toggle changes
    Object.entries(toggles).forEach(([site, toggle]) => {
        if (toggle) {
            toggle.addEventListener('change', function() {
                const settings = {};
                settings[site] = toggle.checked;

                // Save the updated settings
                chrome.storage.sync.set(settings, function() {
                    console.log('DoomScroll: Settings saved', settings);

                    // Get the current active tab
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        if (!tabs[0] || !tabs[0].id || !tabs[0].url) return;

                        const currentUrl = tabs[0].url.toLowerCase();
                        const siteDomains = {
                            'youtube': 'youtube.com',
                            'linkedin': 'linkedin.com',
                            'facebook': 'facebook.com',
                            'twitter': 'x.com',
                            'reddit': 'reddit.com',
                            'instagram': 'instagram.com'
                        };

                        // Only reload if the current tab is the site being toggled
                        if (site in siteDomains && currentUrl.includes(siteDomains[site])) {
                            console.log(`DoomScroll: Reloading ${site} tab`, tabs[0].id);
                            chrome.tabs.reload(tabs[0].id);
                        } else {
                            console.log(`DoomScroll: No need to reload tab (current site doesn't match ${site})`);
                        }
                    });
                });
            });
        }
    });
});
