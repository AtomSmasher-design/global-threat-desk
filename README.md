# Global Threat Desk

A free, single-file, offline emergency desk for the UK. One HTML file of about 1 MB. Open it in any browser, with or without a signal.

**[Download v3.13](https://github.com/AtomSmasher-design/global-threat-desk/raw/main/Global_Threat_Desk_UK_Emergency_PREP_v3.13.html)** (1.06 MB, SHA-256 below)

## What it covers

- **Major incidents:** cyber attacks on infrastructure and other incidents that affect countries, with official sources.
- **Blackout plan:** what to do in the first hour, the first day and the first three days, with a printable plan.
- **Water:** how much to store for your household, plus frozen and burst pipes and the 24-hour emergency line for every UK water company.
- **Food:** a 7-day hot-food menu cooked on a camping stove, with a shopping list, gas cartridge count, calories and protein worked out for your household.
- **Heat, medical, hygiene, power, documents and contacts:** checklists that work out quantities for your household and how many days you choose.
- **UK emergency numbers:** 999 and 112, 111, power cut 105 (Northern Ireland 03457 643 643), gas 0800 111 999 (Northern Ireland 0800 002 001), and Floodline.

## How to use it

1. Download `Global_Threat_Desk_UK_Emergency_PREP_v3.13.html` with the link at the top of this page.
2. Open it in your browser. No installation and no account are needed.
3. Keep a copy on your phone, on a USB stick, and print the survival pack.

Your settings are saved only in your own browser. Nothing is sent anywhere. Use the export button to back them up.

## Live warnings

Phone browsers are not allowed to read most official warning pages directly. A scheduled job in this repository (`collector/`) reads the Met Office, GOV.UK Emergency Alerts, Natural Resources Wales, SEPA and the news feeds every few minutes and publishes the replies to the `live` branch. The desk reads them from there, so the Brief stays live without relying on free public relays. The desk only downloads from that branch; it never uploads anything.

## Check your download is genuine

The SHA-256 fingerprint of v3.13 is:

```
357a4ed52dce902be8788085d57295f8b36a45ae57f6f7878b2210852f2f2d1a
```

- Windows: `certutil -hashfile Global_Threat_Desk_UK_Emergency_PREP_v3.13.html SHA256`
- Mac or Linux: `shasum -a 256 Global_Threat_Desk_UK_Emergency_PREP_v3.13.html`

If the result does not match, do not use the file.

## Important

This is guidance for preparing, not a replacement for the emergency services. In danger, ring 999. Phone numbers were checked on 13 November 2026 against each organisation's own website.

Free to use. No adverts, no tracking, no payment.