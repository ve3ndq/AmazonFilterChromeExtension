# Amazon Product List View Extension

A Chrome extension that provides a clean, organized view of Amazon search results with real-time filtering and coupon highlighting.

![MIT License](https://img.shields.io/badge/License-MIT-green.svg)
![Chrome Web Store](https://img.shields.io/badge/Platform-Chrome-yellow.svg)

## Description

Transform Amazon's product grid into a streamlined, sortable list with automatic coupon detection and real-time filtering. Perfect for price comparison and deal hunting.

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](your_web_store_link_here)
2. Click "Add to Chrome"
3. Click "Add Extension" in the popup

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/ve3ndq/AmazonFilterChromeExtension.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the cloned repository folder

## Features

- **Clean Product List**: Converts Amazon's grid view into an easy-to-read table format
- **Price Sorting**: Products are automatically sorted by price (highest to lowest)
- **Coupon Integration**: 
  - Green indicators show which products have available coupons
  - Final prices after coupons are displayed in green
  - Supports percentage discounts, dollar amounts, and "You pay" prices
- **Real-time Filtering**: 
  - Filter products as you type
  - Case-insensitive search
  - Matches product titles
- **Dark Theme**: Easy on the eyes with a modern dark color scheme
- **Automatic Updates**: List updates automatically when opened

## How to Use

1. Navigate to any Amazon search results page
2. Click the extension icon
3. View the organized list of products
4. Use the filter box at the top to search within results
5. Click any product title to open it in a new tab

## Technical Details

### Price Detection
- Handles various Amazon price formats
- Supports comma-separated numbers
- Falls back gracefully for items without prices

### Coupon Detection
The extension detects coupons in multiple ways:
1. "You pay" exact prices
2. Percentage-off coupons
3. Dollar-amount coupons
4. Various coupon element classes

### Filtering System
- Real-time JavaScript filtering
- No page reloads needed
- Preserves sort order while filtering

### Dark Theme Colors
- Background: #1e1e1e
- Secondary Background: #2d2d2d
- Text: #e0e0e0
- Links: #89CFF0
- Coupon Indicators: #4CAF50
- Borders: #333, #444

## Implementation Notes

The extension uses:
- Chrome Extension Manifest V3
- Native JavaScript (no frameworks)
- CSS Grid and Flexbox
- Chrome's scripting API
- Event delegation for performance

## Development

### Prerequisites
- Google Chrome or Chromium-based browser
- Basic knowledge of JavaScript and Chrome Extensions

### Local Development
1. Fork and clone the repository
2. Make your changes
3. Test locally using "Load unpacked" in Chrome
4. Create a pull request with your changes

### Project Structure
```
amazon-listview-extension/
├── manifest.json        # Extension configuration
├── popup.html          # Extension popup interface
├── popup.js           # Main extension logic
└── README.md          # Documentation
```

### Building
No build step required - this extension uses vanilla JavaScript and CSS.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Privacy

This extension:
- Only runs on Amazon product pages
- Does not collect any user data
- Does not make any external network requests
- Does not store any information permanently

## Support

If you encounter any issues or have feature requests:
1. Check the [Issues](https://github.com/ve3ndq/AmazonFilterChromeExtension/issues) page
2. Create a new issue if needed
3. Provide detailed steps to reproduce any bugs

## Acknowledgments

- Thanks to Amazon's product page structure
- Chrome Extension documentation and examples
- Contributors and users who provide feedback
