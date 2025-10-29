// helpers/pdfHelper.js
import puppeteer from "puppeteer";

export const createDailySalesPdf = async (html) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({ path: "DailySalesReport.pdf" });
  await browser.close();
};
