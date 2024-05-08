import puppeteer from "puppeteer";
import dotenv from 'dotenv';
import ac from "@antiadmin/anticaptchaofficial";
import { win32 } from "node:path";

dotenv.config();

ac.setAPIKey(process.env.ANTICAPTCHA_KEY);

async function init(browser, url) {
    try {
        const page = await browser.newPage();
        await page.goto(url, { timeout: 10000 });
        return page;
    } catch (error) {
        await browser.close();
        const newBrowser = await puppeteer.launch({ headless: true, timeout: 0  });
        return init(newBrowser, url);
    }
}

(async () => {
    const browser = await puppeteer.launch({ headless: true, timeout: 0 });
    const page =  await init(browser, process.env.URL);
    const client = await page.target().createCDPSession();

    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: win32.resolve(win32.normalize('./output'))
    });

    const textInput = '[name="text-input"]';

    // Aguarde até que o botão "Baixar minha fatura" esteja disponível e clique nele
    await page.waitForSelector('.qr-btn', { timeout: 0 });
    await page.click('.qr-btn');
  
    // Aguarde até que os campos do formulário estejam disponíveis e preencha-os
    await page.waitForSelector(textInput, { timeout: 0 });
    await page.type(textInput, process.env.CPF);
    await page.click('.btn-send');

    // se #recaptcha > fazer fluxo para quebrar o recaptcha
    let recaptcha = false;
    try{
        await page.waitForSelector('#recaptcha', { visible: true, timeout: 60000 });
        recaptcha = true;
    } catch(err){
        recaptcha = false;
    }
    
    if(recaptcha) {
        const solution = (await ac.solveRecaptchaV2Proxyless(process.env.URL, process.env.RECAPTCHA_SITE_KEY));
        console.log("recaptcha done.")
        await page.evaluate((solution) => {
            const element = document.querySelector('#g-recaptcha-response');
            element.value = solution;
            const changeEvent = new Event('change', { bubbles: true });
            element.dispatchEvent(changeEvent);
            sendReply({
                'message': 'captcha_pronto'+solution,
                'cognitive': false
            });
            hide_text_input();
        }, solution);
    }

    //Insere os dados do cartão no input
    await page.waitForSelector(textInput, { timeout: 0 });
    await page.type(textInput, process.env.CREDIT_CARD_FINAL_NUMBER);
    await page.click('.btn-send');

    //Baixa a fatura e salva na pasta download
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    await sleep(10000)
   
    const downloadElement = await page.$('text/Baixar Fatura');
    if(downloadElement) await downloadElement.click();
    
    // Aguarde um tempo suficiente para o download ser concluído antes de fechar o navegador
    await sleep(6000);
   
    await browser.close();
    process.exit();
  })();