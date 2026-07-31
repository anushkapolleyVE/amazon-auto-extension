// content.js
// This script runs on Amazon product pages.

function extractProductData() {
    try {
        // Extract Product Title
        const titleElement = document.getElementById('productTitle');
        const product_title = titleElement ? titleElement.innerText.trim() : 'Unknown Product';

        // Extract Price (Amazon's DOM can be tricky, we try a few common selectors)
        let priceElement = document.querySelector('.a-price .a-offscreen') || 
                           document.getElementById('priceblock_ourprice') || 
                           document.getElementById('priceblock_dealprice');
        
        let last_price = priceElement ? priceElement.innerText.trim() : 'Price Not Found';

        // Extract Availability
        const availabilityElement = document.getElementById('availability');
        const availabilityText = availabilityElement ? availabilityElement.innerText.trim() : 'Unknown';
        
        // Simple heuristic for availability
        let availability = 'In Stock';
        if (availabilityText.toLowerCase().includes('currently unavailable') || 
            availabilityText.toLowerCase().includes('out of stock')) {
            availability = 'Out of Stock';
        }

        // Return the extracted data
        return {
            product_url: window.location.href.split('?')[0], // Clean URL without tracking params
            product_title,
            last_price,
            availability
        };
    } catch (error) {
        console.error("Error extracting product data:", error);
        return null;
    }
}

// Listen for messages from the popup to send the current product data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetch_product_info') {
        const productData = extractProductData();
        sendResponse(productData);
    }
    return true; // Keep the message channel open for async response
});
