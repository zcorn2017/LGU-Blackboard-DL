// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright (c) 2023 zcorn2017. All Rights reserved.
// The orginal source code of manifest v2 has been adapted to be compatible with v3. And some modifications have been made to meet the specific requirements of the extension.

// Send back to the popup a sorted deduped list of valid link URLs on this page.
// The popup injects this script into all frames in the active tab.

var links = [].slice.apply(document.getElementsByTagName('a'));
links = links.map(function(element) {
  // Return an anchor's href attribute, stripping any URL fragment (hash '#').
  // If the html specifies a relative path, chrome converts it to an absolute
  // URL.
  var href = element.href;
  var hashIndex = href.indexOf('#');
  if (hashIndex >= 0) {
    href = href.substr(0, hashIndex);
  }
  return { href: href, text: element.textContent.trim() || href };
});

links.sort((a, b) => a.href.localeCompare(b.href));

// Remove duplicates and invalid URLs.
var kBadPrefix = 'javascript';
for (var i = 0; i < links.length;) {
  if (((i > 0) && (links[i].href == links[i - 1].href)) ||
      (links[i].href == '') ||
      (kBadPrefix == links[i].href.toLowerCase().substr(0, kBadPrefix.length)) ||
      !(links[i].href.includes('bbcswebdav'))) {
    links.splice(i, 1);
  } else {
    ++i;
  }
}

chrome.runtime.sendMessage(links);
