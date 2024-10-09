import { env } from './config/env';
console.log(`Starting app in ${env.NODE_ENV} mode.`);

import { RecurrenceRule, scheduleJob } from 'node-schedule';
import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer';
import { delay } from './ts/delay';

const LOGIN_URL = 'https://tiss.tuwien.ac.at/admin/authentifizierung';

async function main() {
  const browser = await puppeteer.launch();

  const preloginRule = new RecurrenceRule(
    env.PRELOGIN_YEAR,
    env.PRELOGIN_MONTH ? env.PRELOGIN_MONTH - 1 : undefined,
    env.PRELOGIN_DATE,
    undefined,
    env.PRELOGIN_HOUR,
    env.PRELOGIN_MINUTE,
    env.PRELOGIN_SECOND,
  );
  scheduleJob(preloginRule, async () => {
    await retryInterval(
      () => login(browser),
      env.PRELOGIN_RETRY_INTERVAL,
      env.PRELOGIN_RETRY_MAX,
    );
  });
  console.log(`Prelogin scheduled.`);

  const signupRule = new RecurrenceRule(
    env.SIGNUP_YEAR,
    env.SIGNUP_MONTH - 1,
    env.SIGNUP_DATE,
    undefined,
    env.SIGNUP_HOUR,
    env.SIGNUP_MINUTE,
    env.SIGNUP_SECOND,
  );
  scheduleJob(signupRule, async () => {
    await retryInterval(
      () => signup(browser),
      env.SIGNUP_RETRY_INTERVAL,
      env.SIGNUP_RETRY_MAX,
    );
  });
  console.log(`Signup scheduled.`);

  process.on('beforeExit', () => browser.close());
}

async function login(browser: Browser) {
  const page = await browser.newPage();
  try {
    await page.goto(LOGIN_URL);

    await page.waitForSelector('#lehreLink, #samlloginbutton');

    if (await page.$('#lehreLink')) {
      console.log('Already logged in.');
      return;
    }

    const usernameInput = await page.$('#username');
    if (!usernameInput) {
      throw 'AAAH, no username input?!';
    }
    await usernameInput.type(env.LOGIN_USERNAME);

    const passwordInput = await page.waitForSelector('#password');
    if (!passwordInput) {
      throw 'AAAH, no password input!';
    }
    await passwordInput.type(env.LOGIN_PASSWORD);

    const loginBtn = await page.waitForSelector(
      'input#samlloginbutton, button#samlloginbutton',
    );
    if (!loginBtn) {
      throw 'AARGH, no login btn';
    }
    await loginBtn.evaluate((btn) => btn.click());
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Logged in.');
  } finally {
    await page.close();
  }
}

async function signupForGroup(page: Page, wrapper: ElementHandle<Element>) {
  const peopleCount = await wrapper.$eval('.rightLink', (el) => el.textContent);
  if (peopleCount) {
    const spl = peopleCount.split('/');
    const joined = parseInt(spl[0].trim());
    const max = parseInt(spl[1].trim());
    if (joined >= max) {
      throw `ALREADY FULL (${joined}/${max})`;
    }
  }

  const registerSelector = 'input[value="Anmelden"], input[value="Register"]';
  const submitBtn = await wrapper.$(registerSelector);
  if (!submitBtn) {
    throw 'No submit btn ://';
  }
  await submitBtn.evaluate((btn) => btn.click());

  const regForm = await page.waitForSelector('#regForm');
  if (!regForm) {
    throw 'no REG FORM????/??';
  }

  const confirmBtn = await regForm.$(registerSelector);
  if (!confirmBtn) {
    throw 'no confirm button...?';
  }

  await confirmBtn.evaluate((btn) => btn.click());
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  await page.waitForSelector('#confirmForm');
}

async function signup(browser: Browser) {
  const page = await browser.newPage();
  try {
    await page.goto(env.URL);
    await page.waitForSelector('.groupWrapper');

    const groupTexts = env.TRY_GROUPS.split(',');
    for (const groupText of groupTexts) {
      try {
        console.log(`Trying group: ${groupText}`);

        const wrapper = await page.evaluateHandle(
          (text: string) =>
            Array.from(document.getElementsByClassName('groupWrapper')).filter(
              (group) => group.textContent && group.textContent.includes(text),
            )[0],
          groupText,
        );
        if (!wrapper || !wrapper.$) {
          throw 'No group wrapper !!1! :/';
        }

        await signupForGroup(page, wrapper);
        console.log('SEEMS LIKE IT WORKED');
        return;
      } catch (error) {
        console.error(
          `Group signup for text ${groupText} failed with error:`,
          error,
        );
        continue;
      }
    }
    throw `No suitable group found. Tried ${groupTexts.length}.`;
  } finally {
    page.close();
  }
}

async function retryInterval<F extends (...args: any[]) => Promise<any>>(
  f: F,
  timeout: number,
  max: number,
): Promise<Awaited<ReturnType<F>>> {
  let tried = 0;
  while (true) {
    try {
      return await f();
    } catch (error) {
      tried++;

      console.error('Function failed:', error);
      if (tried >= max) {
        console.error(`Max retries reached. (${tried}/${max})`);
        throw 'THIS IS BAD';
      } else {
        console.error(`Will retry in ${timeout}ms. (${tried}/${max})`);
        await delay(timeout);
      }
    }
  }
}

await main();
