import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/schedule');
  // Wait for the page to load tasks
  await new Promise(r => setTimeout(r, 3000));
  
  // click the first action menu
  const menuBtn = await page.$('div[aria-label="Mở menu thao tác"]');
  if (menuBtn) {
    console.log("Found menu button!");
    await menuBtn.click();
    await new Promise(r => setTimeout(r, 500));
    
    // Check if menu is open
    const isMenuOpen = await page.evaluate(() => {
      const menu = document.querySelector('.menu-item-btn');
      return !!menu;
    });
    console.log("Menu open?", isMenuOpen);
  } else {
    console.log("No menu button found");
  }
  await browser.close();
})();
