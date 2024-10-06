const puppeteer = require("puppeteer");
const fsPromises = require("fs/promises");
const fs = require("fs");
const fetch = require("node-fetch");
const path = require("path");

const start = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://chitanka.info", { waitUntil: "networkidle2" });
    await page.screenshot({ path: "./screenshots/myScreen.png" });

    const names = await page.evaluate(() => {
        const books = Array.from(document.querySelectorAll(".book-title > a > i"));
        return books.map((book) => book.textContent);
    });

    await fsPromises.writeFile("books.txt", names.join("\n"));

    const pdfFileUrls = await page.$$eval("div.download-links > div > a.btn.btn-default.dl.dl-pdf.action", (as) => {
        return as.map((a) => a.href);
    });

    for (const pdfFileUrl of pdfFileUrls) {
        // Download all PDFs
        const filename = `file${pdfFileUrl.split("/").pop()}`;
        try {
            await downloadPdf(pdfFileUrl, filename);
            console.log(`Downloaded ${filename}`);
        } catch (error) {
            console.error(`Error downloading ${filename}:`, error);
        }
    }

    await browser.close();
};

async function downloadPdf(url, filename) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    const fileStream = fs.createWriteStream(path.join("./pdfs", filename));
    return new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
}

start();
