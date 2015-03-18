# Mozilla User Preferences

/* Don't start finding text when any input is typed */
user_pref("accessibility.typeaheadfind.autostart", false);

/* Start with a simple blank page */
user_pref("browser.startup.page", 1);
user_pref("browser.startup.homepage", "about:about");

/* Don't send every URL we visit to Google */
user_pref("browser.safebrowsing.enabled", false);
user_pref("browser.safebrowsing.malware.enabled", false);

/* Don't save information entered in web forms and search bars */
user_pref("browser.formfill.enable", false);

/* Backspace goes back one page in history */
user_pref("browser.backspace_action", 0);

/* Ask where to save downloads */
user_pref("browser.download.useDownloadDir", false);

/* When JavaScript wants to open a new window, open a tab instead */
user_pref("browser.link.open_newwindow.restriction", 0);

/* Always use Private Browsing Mode */
user_pref("browser.privatebrowsing.autostart", true);

/* Disable search suggestions */
user_pref("browser.search.suggest.enabled", false);

/* Limit state information saved between sessions */
user_pref("browser.sessionstore.max_tabs_undo", 5);
user_pref("browser.sessionstore.resume_from_crash", false);

/* Turn off tab animations */
user_pref("browser.tabs.animate", false);

/* Turn off URL bar funny business */
user_pref("browser.urlbar.autocomplete.enabled", false);
user_pref("browser.urlbar.trimURLs", false);

/* Disallow JavaScript access to potentially dangerous APIs */
user_pref("dom.event.clipboardevents.enabled", false);
user_pref("dom.battery.enabled", false);
user_pref("dom.disable_window_open_feature.menubar", true);
user_pref("dom.disable_window_open_feature.personalbar", true);
user_pref("dom.disable_window_open_feature.scrollbars", true);
user_pref("dom.disable_window_open_feature.toolbar", true);
user_pref("dom.popup_maximum", 10);
user_pref("dom.storage.default_quota", 0);

/* Override User-Agent data to mitigate browser fingerprinting.
 * See https://panopticlick.eff.org/
 */
user_pref("general.appname.override", "Netscape");
user_pref("general.appversion.override", "5.0 (Windows)");
user_pref("general.buildID.override", 0);
user_pref("general.oscpu.override", "Windows NT 6.2");
user_pref("general.platform.override", "Win32");
user_pref("general.productSub.override", "20100101");
user_pref("general.useragent.override", "Mozilla/5.0 (Windows NT 6.2; rv:36.0) Gecko/20100101 Firefox/36.0");
user_pref("general.useragent.vendor", "");
user_pref("general.useragent.vendorSub", "");
user_pref("general.warnOnAboutConfig", false);
user_pref("intl.accept_languages", "en-us,en;q=0.5");

/* Turn off "location aware browsing" */
user_pref("geo.enabled", false);

/* Turn off sending non-URL words entered in the URL bar to Google */
user_pref("keyword.enabled", false);

/* Turn off spell-checking */
user_pref("layout.spellcheckDefault", 0);

/* Disable cookies by default. Use an extension for site-specific
 * whitelisting.
 */
user_pref("network.cookie.cookieBehavior", 2);
user_pref("network.cookie.thirdparty.sessionOnly", true);

/* Disable IPv6 unless you want to use it. */
user_pref("network.dns.disableIPv6", true);

/* Don't "proactively" perform DNS resolution */
user_pref("network.dns.disablePrefetch", true);

/* Unneeded unless we're using v6 */
user_pref("network.http.fast-fallback-to-IPv4", false);

/* Enable pipelining for better performance */
user_pref("network.http.pipelining", true);
user_pref("network.http.pipelining.maxrequests", 15);
user_pref("network.http.pipelining.ssl", true);
user_pref("network.http.proxy.pipelining", true);
user_pref("network.http.redirection-limit", 5);

/* Don't "proactively" fetch pages that haven't been requested */
user_pref("network.prefetch-next", false);

/* Disable Websockets by default */
user_pref("network.websocket.enabled", false);

/* Enable the Do-Not-Track header in HTTP requests */
user_pref("privacy.donottrackheader.enabled", true);

/* Clear Private Data when closing the browser */
user_pref("privacy.sanitize.sanitizeOnShutdown", true);

/* Disable unsafe RC4 ciphers */
user_pref("security.ssl3.ecdhe_ecdsa_rc4_128_sha", false);
user_pref("security.ssl3.ecdhe_rsa_rc4_128_sha", false);
user_pref("security.ssl3.rsa_rc4_128_md5", false);
user_pref("security.ssl3.rsa_rc4_128_sha", false);

/* Disable WebGL by default */
user_pref("webgl.disabled", true);
