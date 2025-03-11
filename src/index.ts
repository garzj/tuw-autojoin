import { env } from './config/env';
console.log(`Starting app in ${env.NODE_ENV} mode.`);

import { CronJob } from 'cron';
import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer';
import { delay } from './ts/delay';

const LOGIN_URL = 'https://tiss.tuwien.ac.at/admin/authentifizierung';

async function main() {
  const browser = await puppeteer.launch();
  process.on('beforeExit', () => browser.close());

  await login(browser);

  if (env.DRY_RUN) {
    console.log('Starting dry run.');
    console.log('Testing signup.');
    signup(browser, true);
    return;
  }

  new CronJob(
    env.PRELOGIN_CRON,
    async () => {
      console.log('Starting pre login.');
      await retryInterval(
        () => login(browser),
        env.PRELOGIN_RETRY_INTERVAL,
        env.PRELOGIN_RETRY_MAX,
      );
    },
    null,
    true,
    env.PRELOGIN_TZ,
  );
  console.log(`Prelogin scheduled.`);

  new CronJob(
    env.SIGNUP_CRON,
    async () => {
      console.log('Starting signup.');
      await retryInterval(
        () => signup(browser),
        env.SIGNUP_RETRY_INTERVAL,
        env.SIGNUP_RETRY_MAX,
      );
    },
    null,
    true,
    env.SIGNUP_TZ,
  );
  console.log(`Signup scheduled.`);
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

async function signupForGroup(
  page: Page,
  wrapper: ElementHandle<Element>,
  dryRun = false,
) {
  const peopleCount = await wrapper.$eval('.rightLink', (el) => el.textContent);
  if (peopleCount) {
    const spl = peopleCount.split('/');
    const joined = parseInt(spl[0].trim());
    const max = parseInt(spl[1].trim());
    if (joined >= max) {
      throw `ALREADY FULL (${joined}/${max})`;
    }
  }

  if (dryRun) {
    console.log('Would have tried to submit now.');
    return;
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

async function signup(browser: Browser, dryRun = false) {
  const page = await browser.newPage();
  try {
    await page.goto(env.SIGNUP_URL);
    await page.waitForSelector('.groupWrapper');

    const groupTexts = env.SIGNUP_TRY_GROUPS.split(',');
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

        await signupForGroup(page, wrapper, dryRun);
        if (dryRun) {
          console.log('Dry run worked.');
        } else {
          console.log('SEEMS LIKE IT WORKED');
        }
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

type RetryResult<T> = { success: true; data: T } | { success: false };

async function retryInterval<F extends (...args: any[]) => Promise<any>>(
  f: F,
  timeout: number,
  max: number,
): Promise<RetryResult<Awaited<ReturnType<F>>>> {
  let tried = 0;
  while (true) {
    try {
      return {
        success: true,
        data: await f(),
      };
    } catch (error) {
      tried++;

      console.error('Function failed:', error);
      if (tried >= max) {
        console.error(`Max retries reached. (${tried}/${max})`);
        return { success: false };
      } else {
        console.error(`Will retry in ${timeout}ms. (${tried}/${max})`);
        await delay(timeout);
      }
    }
  }
}

await main();
