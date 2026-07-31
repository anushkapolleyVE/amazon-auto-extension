// background.js

const API_BASE = 'https://amazon-auto-extension.onrender.com';

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getProductData') {
        sendResponse({ status: 'received' });
    }
});

// Setup monitoring alarm
chrome.runtime.onInstalled.addListener(() => {
    console.log("Amazon Price Tracker Pro installed.");
    // Run every 1 minute for POC testing
    chrome.alarms.create("price_monitor", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "price_monitor") {
        await checkPrices();
    }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    // We embedded the URL in the notification ID format: "price-drop-{url}"
    if (notificationId.startsWith("price-drop-")) {
        const url = notificationId.replace("price-drop-", "");
        chrome.tabs.create({ url: url });
        chrome.notifications.clear(notificationId);
    }
});

async function checkPrices() {
    console.log("Checking prices...");
    try {
        const data = await chrome.storage.local.get(['token']);
        if (!data.token) return;

        const res = await fetch(`${API_BASE}/products/`, {
            headers: { 'Authorization': `Bearer ${data.token}` }
        });
        
        if (!res.ok) return;
        const products = await res.json();

        for (const product of products) {
            await checkSingleProduct(product, data.token);
        }
    } catch (err) {
        console.error("Error in checkPrices:", err);
    }
}

async function checkSingleProduct(product, token) {
    try {
        const res = await fetch(product.product_url);
        if (!res.ok) return;
        const html = await res.text();

        // Simple Regex to extract price from Amazon HTML
        // Looks for <span class="a-offscreen">$99.99</span> inside price blocks
        const priceMatch = html.match(/class="a-price[^>]*>.*?<span class="a-offscreen">[^0-9]*([0-9,.]+)/is);
        
        if (priceMatch && priceMatch[1]) {
            const priceStr = priceMatch[1].replace(/,/g, '');
            const currentPrice = parseFloat(priceStr);

            if (product.target_price && currentPrice <= product.target_price) {
                // Target met! Notify and log history
                const message = `Price dropped to $${currentPrice}! (Target: $${product.target_price})`;
                
                // Show OS notification
                const notifId = `price-drop-${product.product_url}`;
                chrome.notifications.create(notifId, {
                    type: "basic",
                    iconUrl: "images/icon128.png", // Or default extension icon if missing
                    title: "Price Drop Alert! 🚨",
                    message: `${product.title.substring(0, 40)}...\n${message}`,
                    priority: 2
                });

                // Log to backend history
                await fetch(`${API_BASE}/history/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        product_id: product.id,
                        status: "TARGET_MET",
                        message: message
                    })
                });
            }
        }
    } catch (err) {
        console.error("Error checking product:", product.title, err);
    }
}
