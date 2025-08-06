/**
 * Main function to handle the extraction of product information from Amazon pages.
 * This function is called automatically when the popup opens and:
 *   1. Verifies we're on an Amazon page
 *   2. Injects the product extraction script into the active tab
 *   3. Processes the results and displays them in the popup
 *
 * This is the entry point for the extension's popup logic.
 *
 * @async
 * @returns {void}
 */
async function handleExtract() {
  console.log('Extracting product list');
  const resultsDiv = document.getElementById('results');
  if (!resultsDiv) {
    console.error('No #results element found in popup.');
    return;
  }
  try {
  // Get the currently active tab in the current window
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab) {
      console.error('No active tab found.');
      resultsDiv.innerText = 'No active tab found.';
      return;
    }
    console.log('Active tab:', tab);
    if (!tab.url) {
      console.error('Tab has no URL.');
      resultsDiv.innerText = 'Tab has no URL.';
      return;
    }
    // Only proceed if the tab is an Amazon page
    if (!tab.url.match(/^https?:\/\/(www\.)?amazon\./)) {
      resultsDiv.innerText = 'Please navigate to an Amazon search results page.';
      return;
    }
    // Inject the extraction function into all frames of the active tab
    chrome.scripting.executeScript({
      target: {tabId: tab.id, allFrames: true},
      func: extractAmazonResultsWithFrameInfo,
    }, (results) => {
      console.log('Script execution results:', results);
      if (chrome.runtime.lastError) {
        console.error('chrome.runtime.lastError:', chrome.runtime.lastError);
        resultsDiv.innerText = 'Error: ' + chrome.runtime.lastError.message;
        return;
      }
      if (!results || results.length === 0) {
        console.error('No result returned from content script');
        resultsDiv.innerText = 'No results found or script failed.';
        return;
      }
      // Loop through all frames' results and use the first one with valid HTML output
      let found = false;
      let output = '';
      for (const frame of results) {
        const {result} = frame;
        if (result && result.html && result.html !== '<ul></ul>') {
          found = true;
          output = result.html;
          break;  // Use the first frame with results
        }
      }
      // Display the extracted HTML or a message if nothing was found
      if (found) {
        resultsDiv.innerHTML = output;
      } else {
        resultsDiv.innerHTML = 'No results found.';
      }
    });
    // Warn if popup is about to close (common Chrome extension issue)
    // This is a workaround for Chrome's popup auto-close behavior
    setTimeout(() => {
      if (!document.hasFocus()) {
        console.warn('Popup likely closed before script finished.');
      }
    }, 1000);
  } catch (e) {
    console.error('Exception in extractBtn handler:', e);
    resultsDiv.innerText = 'Exception: ' + e.message;
  }
}

// Start extraction and set up UI when the popup opens
/**
 * Setup function that runs when the popup is opened.
 * Initializes the UI and sets up event handlers for filtering.
 *
 * Responsibilities:
 *   1. Hides the extract button (now automated)
 *   2. Sets up real-time filtering and delivery filter buttons
 *   3. Triggers initial product extraction
 */
document.addEventListener('DOMContentLoaded', () => {
  // Hide the extract button with CSS (the extension now auto-extracts)
  const style = document.createElement('style');
  style.textContent = '#extractBtn { display: none; }';
  document.head.appendChild(style);

  // Set up real-time filter functionality for the text input
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'filter-input') {
      applyFilters();
    }
  });

  // Set up delivery filter buttons and clear button
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'delivery-today-filter') {
      // Toggle 'Today' delivery filter
      e.target.classList.toggle('active');
      applyFilters();
    }

    if (e.target && e.target.id === 'delivery-tomorrow-filter') {
      // Toggle 'Tomorrow' delivery filter
      e.target.classList.toggle('active');
      applyFilters();
    }

    if (e.target && e.target.id === 'clear-filters') {
      // Clear all filters (text and delivery)
      const filterInput = document.getElementById('filter-input');
      const deliveryTodayFilter = document.getElementById('delivery-today-filter');
      const deliveryTomorrowFilter = document.getElementById('delivery-tomorrow-filter');

      if (filterInput) filterInput.value = '';
      if (deliveryTodayFilter) deliveryTodayFilter.classList.remove('active');
      if (deliveryTomorrowFilter) deliveryTomorrowFilter.classList.remove('active');

      applyFilters();
    }
  });

  /**
   * Function to apply all active filters to the product table.
   * Handles both text and delivery filters.
   */
  function applyFilters() {
    const filterInput = document.getElementById('filter-input');
    const deliveryTodayFilter = document.getElementById('delivery-today-filter');
    const deliveryTomorrowFilter = document.getElementById('delivery-tomorrow-filter');
    const rows = document.querySelectorAll('.product-row');

    const textFilter = filterInput ? filterInput.value.toLowerCase() : '';
    const deliveryTodayActive = deliveryTodayFilter ? deliveryTodayFilter.classList.contains('active') : false;
    const deliveryTomorrowActive = deliveryTomorrowFilter ? deliveryTomorrowFilter.classList.contains('active') : false;

    rows.forEach(row => {
      // Get the product title and delivery attributes for each row
      const title = row.querySelector('a') ? row.querySelector('a').textContent.toLowerCase() : '';
      const isDeliveryToday = row.getAttribute('data-delivery-today') === 'true';
      const isDeliveryTomorrow = row.getAttribute('data-delivery-tomorrow') === 'true';

      let showRow = true;

      // Apply text filter (case-insensitive substring match)
      if (textFilter && !title.includes(textFilter)) {
        showRow = false;
      }

      // Apply delivery filters (OR logic - show if matches any active delivery filter)
      if (deliveryTodayActive || deliveryTomorrowActive) {
        let matchesDeliveryFilter = false;

        if (deliveryTodayActive && isDeliveryToday) {
          matchesDeliveryFilter = true;
        }

        if (deliveryTomorrowActive && isDeliveryTomorrow) {
          matchesDeliveryFilter = true;
        }

        if (!matchesDeliveryFilter) {
          showRow = false;
        }
      }

      // Show or hide the row based on filter results
      if (showRow) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  }

  // Automatically trigger extraction when popup opens
  handleExtract();
});

/**
 * Content script function that runs in the context of the Amazon page.
 * Extracts product information, processes prices and coupons, and generates
 * the HTML for the product table.
 * 
 * Features:
 * - Finds products using multiple possible DOM selectors
 * - Extracts titles, URLs, and prices
 * - Processes different coupon formats
 * - Calculates final prices after coupons
 * - Sorts products by price
 * - Generates styled HTML table with dark theme
 * 
 * @returns {Object} Object containing the page URL and generated HTML
 */
function extractAmazonResultsWithFrameInfo() {
  try {
    const url = document.location.href;
    console.log('extractAmazonResultsWithFrameInfo called on', url);
    
    // Try different possible selectors for Amazon products
    let items = Array.from(document.querySelectorAll('[data-component-type="s-search-result"]'));
    if (items.length === 0) {
      items = Array.from(document.querySelectorAll('.s-result-item'));
    }
    if (items.length === 0) {
      items = Array.from(document.querySelectorAll('.sg-col-inner'));
    }
    
    console.log('Found items:', items.length, 'on', url);
    console.log('Page content:', document.body.innerHTML.substring(0, 200) + '...'); // Debug info
    
    // First collect and process all valid items
    const processedItems = [];
    for (const item of items) {
      let titleElem = item.querySelector('h2 a span') || 
                     item.querySelector('.a-text-normal') ||
                     item.querySelector('.a-link-normal span');
      let urlElem = item.querySelector('h2 a') ||
                   item.querySelector('.a-link-normal');
      
      const priceWhole = item.querySelector('.a-price-whole')?.innerText?.trim().replace('.', '') || 
                        item.querySelector('.a-price')?.innerText || '';
      const priceFraction = item.querySelector('.a-price-fraction')?.innerText?.trim() || '';
      const priceStr = priceWhole ? `$${priceWhole}${priceFraction ? '.' + priceFraction : ''}` : 'No Price';
      
      // Convert price to number for sorting
      const priceNum = priceStr === 'No Price' ? -1 : 
                      parseFloat(priceStr.replace('$', '').replace(/,/g, ''));
      
      // Extract delivery information
      // Look for various delivery time indicators on Amazon
      let deliveryText = '';
      let isDeliveryToday = false;
      let isDeliveryTomorrow = false;
      
      const deliverySelectors = [
        '[data-test-id="delivery-time"]',
        '.a-color-base.a-text-bold',
        '.a-color-success',
        '.a-size-base.a-color-base',
        '[data-csa-c-type="link"][data-csa-c-content*="delivery"]'
      ];
      
      for (const selector of deliverySelectors) {
        const deliveryElem = item.querySelector(selector);
        if (deliveryElem && deliveryElem.textContent) {
          const text = deliveryElem.textContent.toLowerCase();
          if (text.includes('today') || text.includes('same day') || 
              text.includes('within') && text.includes('hour')) {
            deliveryText = 'Today';
            isDeliveryToday = true;
            break;
          } else if (text.includes('tomorrow') || text.includes('next day')) {
            deliveryText = 'Tomorrow';
            isDeliveryTomorrow = true;
            break;
          }
        }
      }
      
      // Also check the broader item text for delivery information
      if (!isDeliveryToday && !isDeliveryTomorrow) {
        const itemText = item.textContent.toLowerCase();
        if (itemText.includes('get it today') || 
            itemText.includes('delivery today') ||
            itemText.includes('same-day delivery')) {
          isDeliveryToday = true;
          deliveryText = 'Today';
        } else if (itemText.includes('get it tomorrow') || 
                   itemText.includes('delivery tomorrow') ||
                   itemText.includes('next-day delivery') ||
                   itemText.includes('1-day delivery')) {
          isDeliveryTomorrow = true;
          deliveryText = 'Tomorrow';
        }
      }
      const couponElem = item.querySelector('.s-coupon-unclipped') || 
                        item.querySelector('[data-csa-c-element-type="coupon"]');
      let couponAmount = null;
      let priceWithCoupon = null;
      let priceWithCouponNum = null;

      // Calculate final price after applying coupon
      // Handles three cases:
      // 1. "You pay" exact prices
      // 2. Percentage discounts
      // 3. Dollar amount discounts
      let finalPrice = priceStr;
      let finalPriceNum = priceNum;

      if (couponElem && priceNum > 0) {
        // First check for explicit "You pay" text
        const youPayMatch = item.textContent.match(/You pay \$(\d+\.?\d*)/i);
        if (youPayMatch) {
          // Use the exact price shown in "You pay"
          finalPriceNum = parseFloat(youPayMatch[1]);
          finalPrice = '$' + finalPriceNum.toFixed(2);
        } else {
          // Try to find coupon amount from various possible elements and formats
          const couponText = couponElem.textContent;
          const matchPercent = couponText.match(/(\d+)%/);
          const matchDollar = couponText.match(/\$(\d+(\.\d{2})?)/);
          
          if (matchPercent) {
            const percentOff = parseInt(matchPercent[1]);
            // Calculate discount amount
            const discountAmount = priceNum * (percentOff/100);
            finalPriceNum = priceNum - discountAmount;
            finalPrice = '$' + finalPriceNum.toFixed(2);
          } else if (matchDollar) {
            const dollarOff = parseFloat(matchDollar[1]);
            finalPriceNum = Math.max(0, priceNum - dollarOff);
            finalPrice = '$' + finalPriceNum.toFixed(2);
          }
        }
      }

      if (titleElem && urlElem) {
        
        processedItems.push({
          title: titleElem.innerText,
          url: urlElem.href,
          price: finalPrice,
          priceNum: finalPriceNum,
          hasCoupon: !!couponElem,
          deliveryText: deliveryText,
          isDeliveryToday: isDeliveryToday,
          isDeliveryTomorrow: isDeliveryTomorrow
        });
      }
    }
    
    // Sort items by price (lowest to highest)
    processedItems.sort((a, b) => a.priceNum - b.priceNum);
    
    let html = `
      <style>
        body { 
          background-color: #1e1e1e;
          color: #e0e0e0;
          min-width: 600px;
          width: 600px;
        }
        #filter-input {
          width: 100%;
          padding: 8px;
          margin-bottom: 10px;
          background-color: #2d2d2d;
          border: 1px solid #444;
          color: #e0e0e0;
          border-radius: 4px;
          box-sizing: border-box;
        }
        #filter-input:focus {
          outline: none;
          border-color: #89CFF0;
        }
        .filter-controls {
          margin-bottom: 10px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .delivery-filter {
          background-color: #2d2d2d;
          border: 1px solid #444;
          color: #e0e0e0;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        .delivery-filter:hover {
          background-color: #3d3d3d;
        }
        .delivery-filter.active {
          background-color: #4CAF50;
          border-color: #4CAF50;
        }
        table { 
          border-collapse: collapse; 
          width: 100%;
          background-color: #1e1e1e;
        }
        th, td { 
          padding: 6px 8px; 
          text-align: left; 
          border-bottom: 1px solid #333; 
        }
        th { 
          background-color: #2d2d2d;
          color: #e0e0e0;
        }
        tr:hover { 
          background-color: #2d2d2d; 
        }
        .hidden {
          display: none;
        }
        a {
          color: #89CFF0;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .price-col { 
          text-align: right; 
          width: 80px;
        }
        .delivery-col {
          text-align: center;
          width: 70px;
          font-size: 12px;
        }
        .coupon-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          background-color: #4CAF50;
          margin-right: 8px;
          vertical-align: middle;
          border-radius: 2px;
        }
        .coupon-price {
          color: #4CAF50;
          font-weight: bold;
        }
      </style>
      <input type="text" id="filter-input" placeholder="Filter products...">
      <div class="filter-controls">
        <button id="delivery-today-filter" class="delivery-filter">Del. Today</button>
        <button id="delivery-tomorrow-filter" class="delivery-filter">Del. Tomorrow</button>
        <button id="clear-filters" class="delivery-filter">Clear Filters</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th class="delivery-col">Delivery</th>
            <th class="price-col">Price</th>
          </tr>
        </thead>
        <tbody id="product-list">
    `;    for (const item of processedItems) {
      html += `
        <tr class="product-row" data-delivery-today="${item.isDeliveryToday}" data-delivery-tomorrow="${item.isDeliveryTomorrow}">
          <td>${item.hasCoupon ? '<span class="coupon-indicator" title="Coupon Available"></span>' : ''}<a href="${item.url}" target="_blank">${item.title}</a></td>
          <td class="delivery-col" style="color: #4CAF50;">${item.deliveryText || '-'}</td>
          <td class="price-col ${item.hasCoupon ? 'coupon-price' : ''}">
            ${item.price}
          </td>
        </tr>`;
      }
    html += '</tbody></table>';
    return { url, html };
  } catch (err) {
    console.error('Error in extractAmazonResultsWithFrameInfo:', err);
    return { url: document.location.href, html: 'Error extracting results: ' + err.message };
  }
}
