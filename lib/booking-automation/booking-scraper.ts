import { Page } from 'playwright';
import { BookingSearchParams, RawPropertyData, ProgressCallback } from './types';
import { BrowserManager } from './browser-manager';

export class BookingScraper {
  private browserManager: BrowserManager;
  private progressCallback: ProgressCallback;

  constructor(browserManager: BrowserManager, progressCallback: ProgressCallback) {
    this.browserManager = browserManager;
    this.progressCallback = progressCallback;
  }

  async searchBookingCom(params: BookingSearchParams): Promise<RawPropertyData[]> {
    this.progressCallback('Navigating to Booking.com...');
    const page = await this.browserManager.createPage();

    try {
      await page.goto('https://www.booking.com', { waitUntil: 'domcontentloaded' });
      await this.browserManager.randomDelay(2000, 4000);

      // Handle cookie banners
      await this.handleCookieBanner(page);

      this.progressCallback('Filling search form on Booking.com...');

      // Fill destination
      const destinationInput = page.locator('[data-testid="destination-container"] input, #ss, [name="ss"]').first();
      await destinationInput.click();
      await this.browserManager.randomDelay(500, 1000);
      await destinationInput.fill(params.destination);
      await this.browserManager.randomDelay(1000, 2000);

      // Wait for and select the first suggestion
      try {
        await page.waitForSelector('[data-testid="autocomplete-results"] li, .c-autocomplete__item', { timeout: 5000 });
        await page.locator('[data-testid="autocomplete-results"] li, .c-autocomplete__item').first().click();
      } catch (error) {
        // If no suggestions appear, continue with the typed destination
        console.log('No autocomplete suggestions found, continuing...');
      }

      await this.browserManager.randomDelay(1000, 2000);

      // Fill dates if provided
      if (params.checkIn && params.checkOut) {
        await this.fillDates(page, params.checkIn, params.checkOut);
      }

      // Fill guest count if provided
      if (params.guests && params.guests > 1) {
        await this.fillGuestCount(page, params.guests);
      }

      // Submit search
      this.progressCallback('Submitting search on Booking.com...');
      const searchButton = page.locator('[data-testid="header-search-button"], button[type="submit"], .sb-searchbox__button').first();
      await searchButton.click();

      // Wait for results to load
      await page.waitForLoadState('networkidle');
      await this.browserManager.randomDelay(3000, 5000);

      this.progressCallback('Extracting property data from Booking.com...');
      const properties = await this.extractBookingProperties(page);

      await page.close();
      return properties;

    } catch (error) {
      console.error('Error scraping Booking.com:', error);
      await page.close();
      return [];
    }
  }

  async searchAirbnb(params: BookingSearchParams): Promise<RawPropertyData[]> {
    this.progressCallback('Navigating to Airbnb...');
    const page = await this.browserManager.createPage();

    try {
      await page.goto('https://www.airbnb.com', { waitUntil: 'domcontentloaded' });
      await this.browserManager.randomDelay(2000, 4000);

      this.progressCallback('Filling search form on Airbnb...');

      // Click on the search input
      const searchInput = page.locator('[data-testid="structured-search-input-field-query"], [placeholder*="Search"], input[name="query"]').first();
      await searchInput.click();
      await this.browserManager.randomDelay(500, 1000);

      // Fill destination
      await searchInput.fill(params.destination);
      await this.browserManager.randomDelay(1500, 3000);

      // Wait for and select suggestion
      try {
        await page.waitForSelector('[data-testid="search-option"], [role="option"]', { timeout: 5000 });
        await page.locator('[data-testid="search-option"], [role="option"]').first().click();
      } catch (error) {
        console.log('No Airbnb suggestions found, continuing...');
      }

      await this.browserManager.randomDelay(1000, 2000);

      // Add dates if provided
      if (params.checkIn && params.checkOut) {
        await this.fillAirbnbDates(page, params.checkIn, params.checkOut);
      }

      // Add guests if provided
      if (params.guests && params.guests > 1) {
        await this.fillAirbnbGuests(page, params.guests);
      }

      // Submit search
      this.progressCallback('Submitting search on Airbnb...');
      const searchButton = page.locator('[data-testid="structured-search-input-search-button"], button[type="submit"]').first();
      await searchButton.click();

      // Wait for results
      await page.waitForLoadState('networkidle');
      await this.browserManager.randomDelay(3000, 5000);

      this.progressCallback('Extracting property data from Airbnb...');
      const properties = await this.extractAirbnbProperties(page);

      await page.close();
      return properties;

    } catch (error) {
      console.error('Error scraping Airbnb:', error);
      await page.close();
      return [];
    }
  }

  private async handleCookieBanner(page: Page): Promise<void> {
    try {
      // Common cookie banner selectors
      const cookieSelectors = [
        'button[data-testid="cookie-banner-accept"]',
        'button[data-testid="accept-cookies"]',
        'button:has-text("Accept")',
        '#onetrust-accept-btn-handler',
        '.cookie-banner button',
      ];

      for (const selector of cookieSelectors) {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          await this.browserManager.randomDelay(500, 1000);
          break;
        }
      }
    } catch (error) {
      // Cookie banner handling is optional
    }
  }

  private async fillDates(page: Page, checkIn: string, checkOut: string): Promise<void> {
    try {
      this.progressCallback('Setting check-in and check-out dates...');
      
      // Click date picker
      const dateInput = page.locator('[data-testid="date-display-field"], .sb-date-field, [data-testid="date-picker"]').first();
      await dateInput.click();
      await this.browserManager.randomDelay(1000, 2000);

      // Wait for calendar to appear
      await page.waitForSelector('[data-testid="calendar"], .bui-calendar, .calendar', { timeout: 5000 });
      await this.browserManager.randomDelay(1000, 1500);

      // Parse dates
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      // Select check-in date
      await this.selectDate(page, checkInDate, 'checkin');
      await this.browserManager.randomDelay(1000, 2000);
      
      // Select check-out date
      await this.selectDate(page, checkOutDate, 'checkout');
      await this.browserManager.randomDelay(1000, 2000);

      // Close calendar if still open
      try {
        await page.keyboard.press('Escape');
        await this.browserManager.randomDelay(500, 1000);
      } catch (error) {
        // Calendar might already be closed
      }

    } catch (error) {
      console.log('Date filling failed, continuing without dates:', error);
    }
  }

  private async selectDate(page: Page, targetDate: Date, dateType: 'checkin' | 'checkout'): Promise<void> {
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // 0-indexed
      const day = targetDate.getDate();

      // Navigate to correct month/year if needed
      await this.navigateToMonth(page, year, month);
      
      // Find and click the specific date
      const dateSelector = `[data-date="${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}"]`;
      const dateButton = page.locator(dateSelector).first();
      
      if (await dateButton.isVisible({ timeout: 3000 })) {
        await dateButton.click();
        this.progressCallback(`Selected ${dateType} date: ${month}/${day}/${year}`);
      } else {
        // Fallback: try alternative date selectors
        const altSelector = `button:has-text("${day}"), [aria-label*="${day}"], .bui-calendar__date:has-text("${day}")`;
        await page.locator(altSelector).first().click();
      }
      
    } catch (error) {
      console.log(`Failed to select ${dateType} date:`, error);
    }
  }

  private async navigateToMonth(page: Page, year: number, month: number): Promise<void> {
    try {
      // Check if we need to navigate to a different month
      const currentMonthText = await page.locator('[data-testid="calendar-month"], .bui-calendar__month').first().textContent();
      
      if (currentMonthText && !currentMonthText.includes(month.toString())) {
        // Click next month button until we reach the target month
        const nextButton = page.locator('[data-testid="calendar-next"], .bui-calendar__next, [aria-label*="next"]').first();
        
        for (let i = 0; i < 12; i++) { // Max 12 months ahead
          const monthText = await page.locator('[data-testid="calendar-month"], .bui-calendar__month').first().textContent();
          if (monthText && monthText.includes(month.toString())) break;
          
          await nextButton.click();
          await this.browserManager.randomDelay(500, 1000);
        }
      }
    } catch (error) {
      console.log('Month navigation failed:', error);
    }
  }

  private async fillGuestCount(page: Page, guests: number): Promise<void> {
    try {
      this.progressCallback(`Setting guest count to ${guests}...`);
      
      const guestButton = page.locator('[data-testid="occupancy-config"], .sb-group-field, [data-testid="guest-count"]').first();
      await guestButton.click();
      await this.browserManager.randomDelay(1000, 2000);

      // Wait for guest selection dropdown
      await page.waitForSelector('[data-testid="guest-dropdown"], .bui-dropdown, [data-testid="adults"]', { timeout: 5000 });
      await this.browserManager.randomDelay(1000, 1500);

      // Set number of adults (assuming guests = adults for simplicity)
      const adultsInput = page.locator('[data-testid="adults"], input[name="adults"], [aria-label*="adult"]').first();
      if (await adultsInput.isVisible({ timeout: 3000 })) {
        await adultsInput.clear();
        await adultsInput.fill(guests.toString());
        await this.browserManager.randomDelay(500, 1000);
      } else {
        // Try using increment/decrement buttons
        const currentCount = await this.getCurrentGuestCount(page);
        const difference = guests - currentCount;
        
        for (let i = 0; i < Math.abs(difference); i++) {
          const button = difference > 0 
            ? page.locator('[data-testid="increment-adults"], .bui-button--increment, [aria-label*="increase"]').first()
            : page.locator('[data-testid="decrement-adults"], .bui-button--decrement, [aria-label*="decrease"]').first();
          
          await button.click();
          await this.browserManager.randomDelay(300, 600);
        }
      }

      // Close guest selection
      await page.keyboard.press('Escape');
      await this.browserManager.randomDelay(500, 1000);

    } catch (error) {
      console.log('Guest count filling failed, continuing with default:', error);
    }
  }

  private async getCurrentGuestCount(page: Page): Promise<number> {
    try {
      const countText = await page.locator('[data-testid="adults"], .bui-input__value').first().textContent();
      return countText ? parseInt(countText) : 1;
    } catch {
      return 1;
    }
  }

  private async fillAirbnbDates(page: Page, checkIn: string, checkOut: string): Promise<void> {
    try {
      this.progressCallback('Setting Airbnb check-in and check-out dates...');
      
      // Click on check-in date field
      const checkInField = page.locator('[data-testid="structured-search-input-field-checkin"], [data-testid="checkin"]').first();
      await checkInField.click();
      await this.browserManager.randomDelay(1000, 2000);

      // Wait for calendar to appear
      await page.waitForSelector('[data-testid="calendar"], ._1m8bb6v', { timeout: 5000 });
      await this.browserManager.randomDelay(1000, 1500);

      // Parse and select check-in date
      const checkInDate = new Date(checkIn);
      await this.selectAirbnbDate(page, checkInDate, 'checkin');
      await this.browserManager.randomDelay(1000, 2000);
      
      // Parse and select check-out date
      const checkOutDate = new Date(checkOut);
      await this.selectAirbnbDate(page, checkOutDate, 'checkout');
      await this.browserManager.randomDelay(1000, 2000);

      // Close calendar
      await page.keyboard.press('Escape');
      await this.browserManager.randomDelay(500, 1000);

    } catch (error) {
      console.log('Airbnb date filling failed:', error);
    }
  }

  private async selectAirbnbDate(page: Page, targetDate: Date, dateType: 'checkin' | 'checkout'): Promise<void> {
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();

      // Navigate to correct month
      await this.navigateToAirbnbMonth(page, year, month);
      
      // Find and click the specific date
      const dateSelector = `[data-testid="calendar-day-${day}"], [aria-label*="${day}"], ._1m8bb6v:has-text("${day}")`;
      const dateButton = page.locator(dateSelector).first();
      
      if (await dateButton.isVisible({ timeout: 3000 })) {
        await dateButton.click();
        this.progressCallback(`Selected Airbnb ${dateType} date: ${month}/${day}/${year}`);
      }
      
    } catch (error) {
      console.log(`Failed to select Airbnb ${dateType} date:`, error);
    }
  }

  private async navigateToAirbnbMonth(page: Page, year: number, month: number): Promise<void> {
    try {
      // Check current month and navigate if needed
      const currentMonthText = await page.locator('[data-testid="calendar-month"], ._1m8bb6v').first().textContent();
      
      if (currentMonthText && !currentMonthText.includes(month.toString())) {
        const nextButton = page.locator('[data-testid="calendar-next"], ._1m8bb6v[aria-label*="next"]').first();
        
        for (let i = 0; i < 12; i++) {
          const monthText = await page.locator('[data-testid="calendar-month"]').first().textContent();
          if (monthText && monthText.includes(month.toString())) break;
          
          await nextButton.click();
          await this.browserManager.randomDelay(500, 1000);
        }
      }
    } catch (error) {
      console.log('Airbnb month navigation failed:', error);
    }
  }

  private async fillAirbnbGuests(page: Page, guests: number): Promise<void> {
    try {
      this.progressCallback(`Setting Airbnb guest count to ${guests}...`);
      
      // Click on guest count field
      const guestField = page.locator('[data-testid="structured-search-input-field-guests"], [data-testid="guests"]').first();
      await guestField.click();
      await this.browserManager.randomDelay(1000, 2000);

      // Wait for guest selection panel
      await page.waitForSelector('[data-testid="guest-picker"], ._1m8bb6v', { timeout: 5000 });
      await this.browserManager.randomDelay(1000, 1500);

      // Set number of adults
      const adultsInput = page.locator('[data-testid="adults"], input[name="adults"]').first();
      if (await adultsInput.isVisible({ timeout: 3000 })) {
        await adultsInput.clear();
        await adultsInput.fill(guests.toString());
        await this.browserManager.randomDelay(500, 1000);
      } else {
        // Use increment/decrement buttons
        const currentCount = await this.getCurrentAirbnbGuestCount(page);
        const difference = guests - currentCount;
        
        for (let i = 0; i < Math.abs(difference); i++) {
          const button = difference > 0 
            ? page.locator('[data-testid="increment-adults"], button[aria-label*="increase"]').first()
            : page.locator('[data-testid="decrement-adults"], button[aria-label*="decrease"]').first();
          
          await button.click();
          await this.browserManager.randomDelay(300, 600);
        }
      }

      // Close guest selection
      await page.keyboard.press('Escape');
      await this.browserManager.randomDelay(500, 1000);

    } catch (error) {
      console.log('Airbnb guest filling failed:', error);
    }
  }

  private async getCurrentAirbnbGuestCount(page: Page): Promise<number> {
    try {
      const countText = await page.locator('[data-testid="adults"], ._1m8bb6v').first().textContent();
      return countText ? parseInt(countText) : 1;
    } catch {
      return 1;
    }
  }

  private async extractBookingProperties(page: Page): Promise<RawPropertyData[]> {
    const properties: RawPropertyData[] = [];

    try {
      // Wait for property listings to load
      await page.waitForSelector('[data-testid="property-card"], .sr_property_block', { timeout: 10000 });

      // Apply filters and sorting for better results
      await this.applyBookingFilters(page);
      await this.sortBookingResults(page);

      // Scroll and paginate to get more results
      const allProperties = await this.scrollAndPaginateBooking(page);
      
      // Limit to reasonable number for AI evaluation (20-30 properties)
      const maxProperties = Math.min(allProperties.length, 25);

      for (let i = 0; i < maxProperties; i++) {
        this.progressCallback(`Evaluating Booking.com property ${i + 1} of ${maxProperties}...`);

        const element = allProperties[i];

        try {
          const property: RawPropertyData = {
            name: await this.extractText(element, '[data-testid="title"], .sr-hotel__name, h3'),
            price: await this.extractPrice(element, '[data-testid="price-and-discounted-price"], .prco-valign-middle-helper'),
            rating: await this.extractRating(element, '[data-testid="review-score"], .bui-review-score__badge'),
            description: await this.extractText(element, '[data-testid="description"], .hotel_description'),
            amenities: await this.extractAmenities(element),
            location: await this.extractText(element, '[data-testid="address"], .sr_hotel_address'),
            imageUrl: await this.extractImage(element),
            bookingUrl: await this.extractBookingUrl(element),
            source: 'booking.com'
          };

          if (property.name && property.price > 0) {
            properties.push(property);
          }
        } catch (error) {
          console.log(`Error extracting property ${i + 1}:`, error);
        }

        // Human-like delay between property evaluations
        await this.browserManager.randomDelay(1000, 2000);
      }
    } catch (error) {
      console.error('Error extracting Booking.com properties:', error);
    }

    return properties;
  }

  private async applyBookingFilters(page: Page): Promise<void> {
    try {
      this.progressCallback('Applying filters for better results...');
      
      // Apply price range filter if available
      await this.applyPriceFilter(page);
      
      // Apply rating filter (4+ stars)
      await this.applyRatingFilter(page);
      
      // Apply amenity filters
      await this.applyAmenityFilters(page);
      
      // Wait for filters to apply
      await this.browserManager.randomDelay(2000, 3000);
      
    } catch (error) {
      console.log('Filter application failed, continuing with all results:', error);
    }
  }

  private async applyPriceFilter(page: Page): Promise<void> {
    try {
      // Look for price filter slider or input
      const priceFilter = page.locator('[data-testid="price-filter"], .filter_price, [aria-label*="price"]').first();
      if (await priceFilter.isVisible({ timeout: 3000 })) {
        await priceFilter.click();
        await this.browserManager.randomDelay(1000, 1500);
        
        // Set reasonable price range (e.g., $50-$300)
        const minPriceInput = page.locator('input[name="min_price"], [data-testid="min-price"]').first();
        const maxPriceInput = page.locator('input[name="max_price"], [data-testid="max-price"]').first();
        
        if (await minPriceInput.isVisible({ timeout: 2000 })) {
          await minPriceInput.fill('50');
          await this.browserManager.randomDelay(500, 1000);
        }
        
        if (await maxPriceInput.isVisible({ timeout: 2000 })) {
          await maxPriceInput.fill('300');
          await this.browserManager.randomDelay(500, 1000);
        }
        
        // Apply price filter
        const applyButton = page.locator('button:has-text("Apply"), [data-testid="apply-filter"]').first();
        if (await applyButton.isVisible({ timeout: 2000 })) {
          await applyButton.click();
        }
      }
    } catch (error) {
      console.log('Price filter failed:', error);
    }
  }

  private async applyRatingFilter(page: Page): Promise<void> {
    try {
      // Look for rating filter (4+ stars)
      const ratingFilter = page.locator('[data-testid="rating-filter"], .filter_rating, [aria-label*="rating"]').first();
      if (await ratingFilter.isVisible({ timeout: 3000 })) {
        await ratingFilter.click();
        await this.browserManager.randomDelay(1000, 1500);
        
        // Select 4+ star rating
        const fourStarOption = page.locator('[data-testid="rating-4"], input[value="4"], label:has-text("4")').first();
        if (await fourStarOption.isVisible({ timeout: 2000 })) {
          await fourStarOption.click();
          await this.browserManager.randomDelay(500, 1000);
        }
      }
    } catch (error) {
      console.log('Rating filter failed:', error);
    }
  }

  private async applyAmenityFilters(page: Page): Promise<void> {
    try {
      // Look for amenity filters
      const amenityFilter = page.locator('[data-testid="amenity-filter"], .filter_amenities').first();
      if (await amenityFilter.isVisible({ timeout: 3000 })) {
        await amenityFilter.click();
        await this.browserManager.randomDelay(1000, 1500);
        
        // Select common amenities
        const commonAmenities = ['wifi', 'parking', 'breakfast', 'gym', 'pool'];
        for (const amenity of commonAmenities) {
          const amenityOption = page.locator(`[data-testid*="${amenity}"], input[value*="${amenity}"], label:has-text("${amenity}")`).first();
          if (await amenityOption.isVisible({ timeout: 1000 })) {
            await amenityOption.click();
            await this.browserManager.randomDelay(300, 600);
          }
        }
      }
    } catch (error) {
      console.log('Amenity filter failed:', error);
    }
  }

  private async sortBookingResults(page: Page): Promise<void> {
    try {
      this.progressCallback('Sorting results by relevance...');
      
      // Look for sort dropdown
      const sortDropdown = page.locator('[data-testid="sort-dropdown"], .sort-dropdown, select[name="sort"]').first();
      if (await sortDropdown.isVisible({ timeout: 3000 })) {
        await sortDropdown.click();
        await this.browserManager.randomDelay(1000, 1500);
        
        // Select "Best match" or "Relevance" sorting
        const bestMatchOption = page.locator('option[value="relevance"], option:has-text("Best match"), option:has-text("Relevance")').first();
        if (await bestMatchOption.isVisible({ timeout: 2000 })) {
          await bestMatchOption.click();
          await this.browserManager.randomDelay(1000, 2000);
        }
      }
    } catch (error) {
      console.log('Sorting failed:', error);
    }
  }

  private async scrollAndPaginateBooking(page: Page): Promise<any[]> {
    const allElements: any[] = [];
    let pageNumber = 1;
    const maxPages = 3; // Limit to 3 pages to avoid too many results

    try {
      while (pageNumber <= maxPages) {
        this.progressCallback(`Scrolling and collecting results from page ${pageNumber}...`);
        
        // Scroll down to load more results
        await this.scrollToLoadMore(page);
        
        // Get current page elements
        const propertyElements = page.locator('[data-testid="property-card"], .sr_property_block');
        const currentCount = await propertyElements.count();
        
        // Add new elements to our collection
        for (let i = allElements.length; i < currentCount; i++) {
          allElements.push(propertyElements.nth(i));
        }
        
        // Try to go to next page
        const nextPageButton = page.locator('[data-testid="pagination-next"], .pagination-next, a:has-text("Next")').first();
        if (await nextPageButton.isVisible({ timeout: 3000 }) && pageNumber < maxPages) {
          await nextPageButton.click();
          await page.waitForLoadState('networkidle');
          await this.browserManager.randomDelay(2000, 3000);
          pageNumber++;
        } else {
          break; // No more pages or reached max
        }
      }
      
      this.progressCallback(`Collected ${allElements.length} properties from ${pageNumber} pages`);
      return allElements;
      
    } catch (error) {
      console.log('Pagination failed, returning current results:', error);
      return allElements;
    }
  }

  private async scrollToLoadMore(page: Page): Promise<void> {
    try {
      // Scroll down gradually to trigger lazy loading
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await this.browserManager.randomDelay(1000, 2000);
      }
      
      // Scroll back to top
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.browserManager.randomDelay(1000, 1500);
      
    } catch (error) {
      console.log('Scrolling failed:', error);
    }
  }

  private async extractAirbnbProperties(page: Page): Promise<RawPropertyData[]> {
    const properties: RawPropertyData[] = [];

    try {
      await page.waitForSelector('[data-testid="card-container"], [itemprop="itemListElement"]', { timeout: 10000 });

      // Apply Airbnb filters and sorting
      await this.applyAirbnbFilters(page);
      await this.sortAirbnbResults(page);

      // Scroll and paginate to get more results
      const allProperties = await this.scrollAndPaginateAirbnb(page);
      
      // Limit to reasonable number for AI evaluation
      const maxProperties = Math.min(allProperties.length, 20);

      for (let i = 0; i < maxProperties; i++) {
        this.progressCallback(`Evaluating Airbnb property ${i + 1} of ${maxProperties}...`);

        const element = allProperties[i];

        try {
          const property: RawPropertyData = {
            name: await this.extractText(element, '[data-testid="listing-card-title"], .t1jojoys'),
            price: await this.extractPrice(element, '[data-testid="price-availability"], ._1jo4hgw'),
            rating: await this.extractRating(element, '[data-testid="listing-card-rating"], .r1dxllyb'),
            description: await this.extractText(element, '[data-testid="listing-card-subtitle"], .s1cjsi4j'),
            amenities: await this.extractAirbnbAmenities(element),
            location: await this.extractText(element, '[data-testid="listing-card-subtitle"], .s1cjsi4j'),
            imageUrl: await this.extractImage(element),
            bookingUrl: await this.extractAirbnbUrl(element),
            source: 'airbnb.com'
          };

          if (property.name && property.price > 0) {
            properties.push(property);
          }
        } catch (error) {
          console.log(`Error extracting Airbnb property ${i + 1}:`, error);
        }

        await this.browserManager.randomDelay(1000, 2000);
      }
    } catch (error) {
      console.error('Error extracting Airbnb properties:', error);
    }

    return properties;
  }

  private async applyAirbnbFilters(page: Page): Promise<void> {
    try {
      this.progressCallback('Applying Airbnb filters for better results...');
      
      // Apply price range filter
      await this.applyAirbnbPriceFilter(page);
      
      // Apply property type filter
      await this.applyAirbnbPropertyTypeFilter(page);
      
      // Apply amenity filters
      await this.applyAirbnbAmenityFilters(page);
      
      // Wait for filters to apply
      await this.browserManager.randomDelay(2000, 3000);
      
    } catch (error) {
      console.log('Airbnb filter application failed, continuing with all results:', error);
    }
  }

  private async applyAirbnbPriceFilter(page: Page): Promise<void> {
    try {
      // Look for price filter
      const priceFilter = page.locator('[data-testid="price-filter"], [aria-label*="price"]').first();
      if (await priceFilter.isVisible({ timeout: 3000 })) {
        await priceFilter.click();
        await this.browserManager.randomDelay(1000, 1500);
        
        // Set price range
        const minPriceInput = page.locator('input[name="min_price"]').first();
        const maxPriceInput = page.locator('input[name="max_price"]').first();
        
        if (await minPriceInput.isVisible({ timeout: 2000 })) {
          await minPriceInput.fill('50');
          await this.browserManager.randomDelay(500, 1000);
        }
        
        if (await maxPriceInput.isVisible({ timeout: 2000 })) {
          await maxPriceInput.fill('300');
          await this.browserManager.randomDelay(500, 1000);
        }
      }
    } catch (error) {
      console.log('Airbnb price filter failed:', error);
    }
  }

  private async applyAirbnbPropertyTypeFilter(page: Page): Promise<void> {
    try {
      // Look for property type filter
      const propertyTypeFilter = page.locator('[data-testid="property-type-filter"]').first();
      if (await propertyTypeFilter.isVisible({ timeout: 3000 })) {
        await propertyTypeFilter.click();
        await this.browserManager.randomDelay(1000, 1500);
        
        // Select common property types
        const propertyTypes = ['entire_home', 'private_room'];
        for (const type of propertyTypes) {
          const typeOption = page.locator(`[data-testid*="${type}"], input[value*="${type}"]`).first();
          if (await typeOption.isVisible({ timeout: 1000 })) {
            await typeOption.click();
            await this.browserManager.randomDelay(300, 600);
          }
        }
      }
    } catch (error) {
      console.log('Airbnb property type filter failed:', error);
    }
  }

  private async applyAirbnbAmenityFilters(page: Page): Promise<void> {
    try {
      // Look for amenity filters
      const amenityFilter = page.locator('[data-testid="amenity-filter"]').first();
      if (await amenityFilter.isVisible({ timeout: 3000 })) {
        await amenityFilter.click();
        await this.browserManager.randomDelay(1000, 1500);
        
        // Select common amenities
        const commonAmenities = ['wifi', 'kitchen', 'parking', 'pool', 'gym'];
        for (const amenity of commonAmenities) {
          const amenityOption = page.locator(`[data-testid*="${amenity}"], input[value*="${amenity}"]`).first();
          if (await amenityOption.isVisible({ timeout: 1000 })) {
            await amenityOption.click();
            await this.browserManager.randomDelay(300, 600);
          }
        }
      }
    } catch (error) {
      console.log('Airbnb amenity filter failed:', error);
    }
  }

  private async sortAirbnbResults(page: Page): Promise<void> {
    try {
      this.progressCallback('Sorting Airbnb results by relevance...');
      
      // Look for sort dropdown
      const sortDropdown = page.locator('[data-testid="sort-dropdown"], select[name="sort"]').first();
      if (await sortDropdown.isVisible({ timeout: 3000 })) {
        await sortDropdown.click();
        await this.browserManager.randomDelay(1000, 1500);
        
        // Select "Relevance" or "Best match" sorting
        const relevanceOption = page.locator('option[value="relevance"], option:has-text("Relevance")').first();
        if (await relevanceOption.isVisible({ timeout: 2000 })) {
          await relevanceOption.click();
          await this.browserManager.randomDelay(1000, 2000);
        }
      }
    } catch (error) {
      console.log('Airbnb sorting failed:', error);
    }
  }

  private async scrollAndPaginateAirbnb(page: Page): Promise<any[]> {
    const allElements: any[] = [];
    let pageNumber = 1;
    const maxPages = 2; // Limit to 2 pages for Airbnb

    try {
      while (pageNumber <= maxPages) {
        this.progressCallback(`Scrolling and collecting Airbnb results from page ${pageNumber}...`);
        
        // Scroll down to load more results
        await this.scrollToLoadMore(page);
        
        // Get current page elements
        const propertyElements = page.locator('[data-testid="card-container"], [itemprop="itemListElement"]');
        const currentCount = await propertyElements.count();
        
        // Add new elements to our collection
        for (let i = allElements.length; i < currentCount; i++) {
          allElements.push(propertyElements.nth(i));
        }
        
        // Try to go to next page
        const nextPageButton = page.locator('[data-testid="pagination-next"], a:has-text("Next")').first();
        if (await nextPageButton.isVisible({ timeout: 3000 }) && pageNumber < maxPages) {
          await nextPageButton.click();
          await page.waitForLoadState('networkidle');
          await this.browserManager.randomDelay(2000, 3000);
          pageNumber++;
        } else {
          break; // No more pages or reached max
        }
      }
      
      this.progressCallback(`Collected ${allElements.length} Airbnb properties from ${pageNumber} pages`);
      return allElements;
      
    } catch (error) {
      console.log('Airbnb pagination failed, returning current results:', error);
      return allElements;
    }
  }

  private async extractAirbnbAmenities(element: any): Promise<string[]> {
    try {
      // Look for amenity indicators in Airbnb listings
      const amenityElements = element.locator('[data-testid*="amenity"], ._1m8bb6v');
      const count = await amenityElements.count();
      const amenities: string[] = [];

      for (let i = 0; i < Math.min(count, 5); i++) {
        const amenity = await amenityElements.nth(i).textContent();
        if (amenity) amenities.push(amenity.trim());
      }

      return amenities;
    } catch {
      return [];
    }
  }

  private async extractText(element: any, selector: string): Promise<string> {
    try {
      const textElement = element.locator(selector).first();
      return await textElement.textContent() || '';
    } catch {
      return '';
    }
  }

  private async extractPrice(element: any, selector: string): Promise<number> {
    try {
      const priceText = await this.extractText(element, selector);
      const price = priceText.match(/\d+/);
      return price ? parseInt(price[0]) : 0;
    } catch {
      return 0;
    }
  }

  private async extractRating(element: any, selector: string): Promise<number> {
    try {
      const ratingText = await this.extractText(element, selector);
      const rating = ratingText.match(/\d+\.?\d*/);
      return rating ? parseFloat(rating[0]) : 0;
    } catch {
      return 0;
    }
  }

  private async extractAmenities(element: any): Promise<string[]> {
    try {
      // Simplified amenity extraction
      const amenityElements = element.locator('.sr-hotel__facility, .bui-badge');
      const count = await amenityElements.count();
      const amenities: string[] = [];

      for (let i = 0; i < Math.min(count, 5); i++) {
        const amenity = await amenityElements.nth(i).textContent();
        if (amenity) amenities.push(amenity.trim());
      }

      return amenities;
    } catch {
      return [];
    }
  }

  private async extractImage(element: any): Promise<string | undefined> {
    try {
      const img = element.locator('img').first();
      return await img.getAttribute('src') || undefined;
    } catch {
      return undefined;
    }
  }

  private async extractBookingUrl(element: any): Promise<string | undefined> {
    try {
      const link = element.locator('a').first();
      const href = await link.getAttribute('href');
      return href ? `https://www.booking.com${href}` : undefined;
    } catch {
      return undefined;
    }
  }

  private async extractAirbnbUrl(element: any): Promise<string | undefined> {
    try {
      const link = element.locator('a').first();
      const href = await link.getAttribute('href');
      return href ? `https://www.airbnb.com${href}` : undefined;
    } catch {
      return undefined;
    }
  }
}