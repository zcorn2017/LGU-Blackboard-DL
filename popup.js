// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright (c) 2023 zcorn2017. All Rights reserved.
// The orginal source code of manifest v2 have been adapted to be compatible with v3. And some modifications have been made to meet the specific requirements of the extension.


var allLinks = [];
var visibleLinks = [];

// Display all visible links.
async function fetchFolderContents(folderUrl) {
  try {
    const response = await fetch(folderUrl);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const folderLinks = Array.from(doc.getElementsByTagName('a'))
      .filter(a => a.href.includes('bbcswebdav'))
      .map(a => ({
        href: a.href,
        text: a.textContent.trim() || a.href,
        isFolder: false
      }));
    return folderLinks;
  } catch (error) {
    console.error('Error fetching folder contents:', error);
    return [];
  }
}

function showLinks() {
  var linksTable = document.getElementById('links');
  while (linksTable.children.length > 1) {
    linksTable.removeChild(linksTable.children[linksTable.children.length - 1]);
  }

  // Keep track of visible items and their indices
  let visibleIndex = 0;
  let visibleItems = [];

  function createRow(link, indent = 0) {
    var row = document.createElement('tr');
    var col0 = document.createElement('td');
    var col1 = document.createElement('td');
    var checkbox = document.createElement('input');
    checkbox.checked = true;
    checkbox.type = 'checkbox';
    
    // Store the current index and add to visible items
    const currentIndex = visibleIndex++;
    visibleItems.push({ link, index: currentIndex });
    checkbox.id = 'check' + currentIndex;
    
    if (link.isFolder) {
      checkbox.onchange = function() {
        const isChecked = this.checked;
        if (link.expanded) {
          // Find the range of child items
          const startIndex = currentIndex + 1;
          const childItems = visibleItems.slice(startIndex, startIndex + (link.contents?.length || 0));
          
          // Update all child checkboxes
          childItems.forEach(item => {
            const childCheckbox = document.getElementById('check' + item.index);
            if (childCheckbox) {
              childCheckbox.checked = isChecked;
            }
          });
        }
      };
    }
    
    if (link.isFolder) {
      col1.style.paddingLeft = indent + 'px';
      col1.className = 'folder-row';
      
      const toggleButton = document.createElement('button');
      toggleButton.className = 'dropdown-btn';
      toggleButton.innerHTML = link.expanded ? '&#x25BC;' : '&#x25B6;'; // Using HTML entities
      toggleButton.onclick = function(e) {
        e.stopPropagation();
        link.expanded = !link.expanded;
        showLinks();
      };
      col1.appendChild(toggleButton);
      
      const folderIcon = document.createElement('span');
      folderIcon.className = 'folder-icon';
      folderIcon.innerHTML = link.expanded ? '&#x1F4C2;' : '&#x1F4C1;'; // Using HTML entities
      col1.appendChild(folderIcon);
    } else {
      col1.style.paddingLeft = (indent + 20) + 'px';
      col1.className = 'file-row';
    }
    
    col1.appendChild(document.createTextNode(link.text));
    col1.style.whiteSpace = 'nowrap';
    col1.onclick = function() {
      checkbox.checked = !checkbox.checked;
    }
    
    col0.appendChild(checkbox);
    row.appendChild(col0);
    row.appendChild(col1);
    return row;
  }

  // Reset visible items array before rendering
  visibleItems = [];
  visibleIndex = 0;

  for (let link of visibleLinks) {
    linksTable.appendChild(createRow(link));
    if (link.isFolder && link.expanded && link.contents) {
      link.contents.forEach(subLink => {
        linksTable.appendChild(createRow(subLink, 20));
      });
    }
  }
}

// Toggle the checked state of all visible links.
function toggleAll() {
  var checked = document.getElementById('toggle_all').checked;
  for (var i = 0; i < visibleLinks.length; ++i) {
    document.getElementById('check' + i).checked = checked;
  }
}

// Download all visible checked links.
async function downloadCheckedLinks() {
  for (let i = 0; i < visibleLinks.length; ++i) {
    if (document.getElementById('check' + i).checked) {
      const link = visibleLinks[i];
      if (link.isFolder) {
        link.contents.forEach(file => {
          chrome.downloads.download({url: file.href}, function(id) {});
        });
      } else {
        chrome.downloads.download({url: link.href}, function(id) {});
      }
    }
  }
  window.close();
}


// Add links to allLinks and visibleLinks, sort and show them.  send_links.js is
// injected into all frames of the active tab, so this listener may be called
// multiple times.
chrome.runtime.onMessage.addListener(function(links) {
  for (var index in links) {
    allLinks.push(links[index]);
  }
  allLinks.sort((a, b) => a.href.localeCompare(b.href));
  visibleLinks = allLinks;
  showLinks();
});

// Set up event handlers and inject send_links.js into all frames in the active
// tab.
window.onload = function() {
  document.getElementById('toggle_all').onchange = toggleAll;
  document.getElementById('download0').onclick = downloadCheckedLinks;

  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({active: true, windowId: currentWindow.id},
                      function(activeTabs) {
        chrome.scripting.executeScript(
        {target: {tabId: activeTabs[0].id, allFrames: true}, files: ['send_links.js']});
    });
  });
};
