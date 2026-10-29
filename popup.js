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
        twitter: document.getElementById('twitterToggle'),
        reddit: document.getElementById('redditToggle'),
        facebook: document.getElementById('facebookToggle'),
        instagram: document.getElementById('instagramToggle')
    };

    // Default settings
    const defaultSettings = {
        youtube: true,
        linkedin: true,
        twitter: true,
        reddit: true,
        facebook: true,
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
                // Open tabs pick the change up through chrome.storage.onChanged, no reload needed
                chrome.storage.sync.set({ [site]: toggle.checked });
            });
        }
    });
});
