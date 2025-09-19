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
      // Click date picker
      const dateInput = page.locator('[data-testid="date-display-field"], .sb-date-field').first();
      await dateInput.click();
      await this.browserManager.randomDelay(1000, 2000);

      // This is a simplified date filling - in production, you'd need more robust date selection
      // For now, we'll skip complex date picking as it varies significantly between sites

    } catch (error) {
      console.log('Date filling failed, continuing without dates');
    }
  }

  private async fillGuestCount(page: Page, guests: number): Promise<void> {
    try {
      const guestButton = page.locator('[data-testid="occupancy-config"], .sb-group-field').first();
      await guestButton.click();
      await this.browserManager.randomDelay(1000, 2000);

      // Simplified guest count - would need more robust implementation

    } catch (error) {
      console.log('Guest count filling failed, continuing with default');
    }
  }

  private async fillAirbnbDates(page: Page, checkIn: string, checkOut: string): Promise<void> {
    try {
      // Airbnb date handling - simplified for now
      console.log('Airbnb date filling would be implemented here');
    } catch (error) {
      console.log('Airbnb date filling failed');
    }
  }

  private async fillAirbnbGuests(page: Page, guests: number): Promise<void> {
    try {
      // Airbnb guest handling - simplified for now
      console.log('Airbnb guest filling would be implemented here');
    } catch (error) {
      console.log('Airbnb guest filling failed');
    }
  }

  private async extractBookingProperties(page: Page): Promise<RawPropertyData[]> {
    const properties: RawPropertyData[] = [];

    try {
      // Wait for property listings to load
      await page.waitForSelector('[data-testid="property-card"], .sr_property_block', { timeout: 10000 });

      const propertyElements = page.locator('[data-testid="property-card"], .sr_property_block');
      const count = await propertyElements.count();
      const maxProperties = Math.min(count, 8); // Limit to 8 properties for thorough evaluation

      for (let i = 0; i < maxProperties; i++) {
        this.progressCallback(`Evaluating Booking.com property ${i + 1} of ${maxProperties}...`);

        const element = propertyElements.nth(i);

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
        await this.browserManager.randomDelay(2000, 4000);
      }
    } catch (error) {
      console.error('Error extracting Booking.com properties:', error);
    }

    return properties;
  }

  private async extractAirbnbProperties(page: Page): Promise<RawPropertyData[]> {
    const properties: RawPropertyData[] = [];

    try {
      await page.waitForSelector('[data-testid="card-container"], [itemprop="itemListElement"]', { timeout: 10000 });

      const propertyElements = page.locator('[data-testid="card-container"], [itemprop="itemListElement"]');
      const count = await propertyElements.count();
      const maxProperties = Math.min(count, 8);

      for (let i = 0; i < maxProperties; i++) {
        this.progressCallback(`Evaluating Airbnb property ${i + 1} of ${maxProperties}...`);

        const element = propertyElements.nth(i);

        try {
          const property: RawPropertyData = {
            name: await this.extractText(element, '[data-testid="listing-card-title"], .t1jojoys'),
            price: await this.extractPrice(element, '[data-testid="price-availability"], ._1jo4hgw'),
            rating: await this.extractRating(element, '[data-testid="listing-card-rating"], .r1dxllyb'),
            description: await this.extractText(element, '[data-testid="listing-card-subtitle"], .s1cjsi4j'),
            amenities: [], // Airbnb amenities would need separate extraction
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

        await this.browserManager.randomDelay(2000, 4000);
      }
    } catch (error) {
      console.error('Error extracting Airbnb properties:', error);
    }

    return properties;
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