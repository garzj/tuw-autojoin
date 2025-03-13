# tuw-autojoin

A script, that joins courses on TISS (TU Vienna).

## Don't rely on this

I quickly wrote this, because [this script](https://github.com/mangei/tissquickregistrationscript) does not run on a server (ok, maybe it could, but I didn't try).

For me my script worked, but there are surely cases where it does not.

## How to use

- Create a [.env](.env) file from [.env.template](.env.template) and suit it to your needs.
  - Use `LVA-Anmeldung` or the english equivalent for `SIGNUP_TRY_GROUPS` if it's not a group signup
  - You can specify multiple groups to try seperated a `,`
  - Use `DRY_RUN` to check some of the values
- Install docker and docker compose
- Run `docker compose up -d` to schedule signup and run in the background
- Run `docker compose logs -f` to check logs
- Run `docker compose down` to abort
