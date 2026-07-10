(function () {
  function fitNavigationWidth(wrapper) {
    var links = wrapper.querySelectorAll('.page-section-navigation a');
    if (!links.length) {
      return;
    }

    var measurer = document.createElement('span');
    measurer.style.position = 'absolute';
    measurer.style.visibility = 'hidden';
    measurer.style.whiteSpace = 'nowrap';
    measurer.style.font = window.getComputedStyle(links[0]).font;
    document.body.appendChild(measurer);

    var longest = 0;
    Array.prototype.forEach.call(links, function (link) {
      measurer.textContent = link.textContent.trim();
      longest = Math.max(longest, measurer.getBoundingClientRect().width);
    });
    document.body.removeChild(measurer);

    var averageCharacter = longest ? longest / Math.max.apply(null, Array.prototype.map.call(links, function (link) {
      return Math.max(1, link.textContent.trim().length);
    })) : 8;
    var paddingAndBorder = 34;
    var oneCharacterSlack = Math.max(8, Math.min(14, averageCharacter));
    var minWidth = 96;
    var maxWidth = Math.min(320, Math.max(180, window.innerWidth * 0.22));
    var fitted = Math.ceil(Math.min(Math.max(longest + oneCharacterSlack + paddingAndBorder, minWidth), maxWidth));
    wrapper.style.width = fitted + 'px';
  }

  // ----------------------------------------------------------------------- //
  // Page classification.                                                     //
  //                                                                          //
  // A page can no longer be classified as a BaseRAG single-symbol API page   //
  // just because it contains a ``#methods`` section: Expansion package pages //
  // (e.g. shape_model) legitimately have many per-class ``Methods`` blocks.  //
  // We therefore classify by URL path first, then fall back to the generic   //
  // page-section navigation.                                                 //
  // ----------------------------------------------------------------------- //
  function currentPath() {
    return (window.location && window.location.pathname) || '';
  }

  function isExpansionExplorePage() {
    return currentPath().indexOf('/expansion/explore/') !== -1;
  }

  function isEnhancedRagIndexPage() {
    var path = currentPath();
    var looksLikeIndex = path.indexOf('/enhancedrag/') !== -1 && /\/index\.html$/.test(path);
    return looksLikeIndex && Boolean(document.getElementById('case-list'));
  }

  function isBaseRagApiPage() {
    var path = currentPath();
    var inReferenceApi =
      path.indexOf('/reference/generated/lib_code/') !== -1 ||
      path.indexOf('/reference/generated/molgen/') !== -1;
    if (!inReferenceApi) {
      return false;
    }
    return Boolean(
      document.getElementById('constructors') ||
      document.getElementById('methods') ||
      document.getElementById('inherited-methods')
    );
  }

  function buildPageSectionNavigation() {
    var body = document.querySelector('div.body');
    if (!body) {
      return null;
    }

    var items = [];
    var enhancedCasesIndex = document.getElementById('cases-by-type');

    if (enhancedCasesIndex) {
      items = Array.prototype.map.call(enhancedCasesIndex.querySelectorAll(':scope > section > h3'), function (heading) {
        return { level: 1, href: '#' + heading.parentElement.id, text: cleanHeadingText(heading) };
      });
    } else if (isEnhancedCasePage()) {
      items = Array.prototype.filter.call(body.querySelectorAll('section > h2, section > h3, section > h4'), function (heading) {
        var section = heading.parentElement;
        return section && section.id && section.id !== 'method-navigation';
      }).map(function (heading) {
        var tagName = heading.tagName.toLowerCase();
        var level = tagName === 'h4' ? 3 : (tagName === 'h3' ? 2 : 1);
        return {
          level: level,
          href: '#' + heading.parentElement.id,
          text: cleanHeadingText(heading)
        };
      });
    } else {
      items = buildToctreeNavigationItems(body);
      if (!items.length) {
        items = Array.prototype.filter.call(body.querySelectorAll('section > h2'), function (heading) {
          var section = heading.parentElement;
          return section && section.id && section.id !== 'method-navigation';
        }).map(function (heading) {
          return { level: 1, href: '#' + heading.parentElement.id, text: cleanHeadingText(heading) };
        });
      }
    }

    if (!items.length) {
      return null;
    }

    return buildNavigationFromItems(items);
  }

  function buildApiPageNavigation() {
    if (!document.getElementById('constructors') && !document.getElementById('methods') && !document.getElementById('inherited-methods')) {
      return null;
    }

    var items = [];
    addSectionItem(items, 'overview', 'Overview', 1);
    addSectionItem(items, 'minimal-example', 'Minimal Example', 1);
    addSectionItem(items, 'constructors', 'Constructors', 2);
    addCallableItems(items, 'constructors', 'constructor', 3);
    addSectionItem(items, 'methods', 'Methods', 2);
    addCallableItems(items, 'methods', 'method', 3);
    addSectionItem(items, 'inherited-methods', 'Inherited Methods', 2);
    addCallableItems(items, 'inherited-methods', 'method', 3);
    addSectionItem(items, 'python-enums', 'Python Enums', 2);
    addEnumItems(items, 'python-enums', 3);
    addSectionItem(items, 'literature-knowledge-zone', 'Literature Knowledge Zone', 1);
    // (addEnumItems is defined below; it lists each enum name under Python Enums.)
    addNestedHeadingItems(items, 'literature-knowledge-zone', 2);
    addSectionItem(items, 'api-usage-notes', 'API Usage Notes', 1);
    addNestedHeadingItems(items, 'api-usage-notes', 2);
    addSectionItem(items, 'documentation-gaps', 'Documentation Gaps', 1);

    return buildNavigationFromItems(items);
  }

  // ----------------------------------------------------------------------- //
  // Expansion explore navigation.                                            //
  //                                                                          //
  // Works for both the ``shape_model`` package page (h2 group sections, each //
  // with h3 class sections that contain their own ``Methods``) and the       //
  // single-file tool pages (Minimal Example / Entry Points / Classes /       //
  // I/O Contract / Functions). The Python-domain ``dt`` elements rendered by //
  // Sphinx do not always carry an id, so we mint a stable runtime id for any //
  // callable we link to. Generalised by structure, never hard-coded to a     //
  // specific class such as ``Box``.                                          //
  // ----------------------------------------------------------------------- //
  var expansionAnchorCounter = 0;

  function ensureCallableAnchor(dl) {
    var dt = dl.querySelector('dt.sig.sig-object.py') || dl.querySelector('dt');
    if (!dt) {
      return null;
    }
    if (!dt.id) {
      expansionAnchorCounter += 1;
      dt.id = 'nav-callable-' + expansionAnchorCounter;
    }
    return dt.id;
  }

  function callableName(dl) {
    var name = dl.querySelector('.sig-name.descname');
    return name ? name.textContent.replace('¶', '').trim() : '';
  }

  function addExpansionCallables(items, scope, level, skipName) {
    Array.prototype.forEach.call(scope.querySelectorAll('dl.py.class, dl.py.method, dl.py.function'), function (dl) {
      var name = callableName(dl);
      if (!name || (skipName && name === skipName)) {
        return;
      }
      var anchor = ensureCallableAnchor(dl);
      if (!anchor) {
        return;
      }
      items.push({ level: level, href: '#' + anchor, text: name });
    });
  }

  function buildExpansionExploreNavigation() {
    var body = document.querySelector('div.body');
    if (!body) {
      return null;
    }
    var root = body.querySelector(':scope > section') || body;
    var topSections = root.querySelectorAll(':scope > section');
    var items = [];

    Array.prototype.forEach.call(topSections, function (section) {
      var heading = section.querySelector(':scope > h2');
      if (!section.id || !heading) {
        return;
      }
      var headingText = cleanHeadingText(heading);
      items.push({ level: 1, href: '#' + section.id, text: headingText });

      var childSections = section.querySelectorAll(':scope > section');
      if (childSections.length) {
        Array.prototype.forEach.call(childSections, function (child) {
          var childHeading = child.querySelector(':scope > h3') || child.querySelector(':scope > h4');
          if (!child.id || !childHeading) {
            return;
          }
          var childText = cleanHeadingText(childHeading);
          items.push({ level: 2, href: '#' + child.id, text: childText });
          // List the class's own methods/functions; skip the class signature
          // itself (its name duplicates the section heading).
          addExpansionCallables(items, child, 3, childText);
        });
      } else {
        // Leaf top-section (Operation Functions, Functions, Classes, ...):
        // list its callables directly under the heading.
        addExpansionCallables(items, section, 2, headingText);
      }
    });

    return buildNavigationFromItems(items);
  }

  // ----------------------------------------------------------------------- //
  // EnhancedRAG case-index navigation.                                       //
  //                                                                          //
  // The index body stays a compact Case List; the right-hand navigation is   //
  // expanded from the ``cases/case_*.html`` links so a reader can jump        //
  // straight to a case_id (case_1, case_95, case_96, case_98, ...).          //
  // ----------------------------------------------------------------------- //
  function buildEnhancedRagIndexNavigation() {
    var items = [];
    addSectionItem(items, 'overview', 'Overview', 1);

    var caseList = document.getElementById('case-list');
    if (caseList) {
      var heading = caseList.querySelector(':scope > h2');
      items.push({ level: 1, href: '#case-list', text: heading ? cleanHeadingText(heading) : 'Case List' });

      var seen = {};
      Array.prototype.forEach.call(caseList.querySelectorAll('a[href]'), function (link) {
        var href = link.getAttribute('href') || '';
        // Only the clean per-case page link (no fragment) becomes a nav entry.
        var match = href.match(/(?:^|\/)cases\/case_(\d+)\.html$/);
        if (!match) {
          return;
        }
        var caseId = 'case_' + match[1];
        if (seen[caseId]) {
          return;
        }
        seen[caseId] = true;
        items.push({ level: 2, href: href, text: caseId });
      });
    }

    return buildNavigationFromItems(items);
  }

  function addSectionItem(items, id, text, level) {
    if (document.getElementById(id)) {
      items.push({ level: level, href: '#' + id, text: text });
    }
  }

  function addNestedHeadingItems(items, sectionId, baseLevel) {
    var section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    Array.prototype.forEach.call(section.querySelectorAll(':scope > section > h3, :scope > section > section > h4'), function (heading) {
      var nestedSection = heading.parentElement;
      if (!nestedSection || !nestedSection.id) {
        return;
      }
      var tagName = heading.tagName.toLowerCase();
      items.push({
        level: tagName === 'h4' ? baseLevel + 1 : baseLevel,
        href: '#' + nestedSection.id,
        text: cleanHeadingText(heading)
      });
    });
  }

  function addCallableItems(items, sectionId, token, level) {
    var section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    var selector = 'dl.py.method[id*="-' + token + '"], span.target[id*="-' + token + '"]';
    Array.prototype.forEach.call(section.querySelectorAll(selector), function (target) {
      var signature = target.matches && target.matches('dl.py.method') ? target : findNextSignature(target);
      if (!signature) {
        return;
      }
      items.push({
        level: level,
        href: '#' + target.id,
        text: signatureName(signature, target.id)
      });
    });
  }

  function addEnumItems(items, sectionId, level) {
    var section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    // Enum classes are rendered with ``:noindex:`` so the ``dl.py.class`` has no
    // own id; link each enum name to the Python Enums section anchor.
    Array.prototype.forEach.call(section.querySelectorAll('dl.py.class'), function (dl) {
      var name = dl.querySelector('.sig-name.descname');
      var text = name ? name.textContent.replace('¶', '').trim() : '';
      if (!text) {
        return;
      }
      items.push({ level: level, href: '#' + sectionId, text: text });
    });
  }

  function findNextSignature(target) {
    var signature = target.nextElementSibling;
    while (signature && !(signature.matches && signature.matches('dl.py.method'))) {
      signature = signature.nextElementSibling;
    }
    return signature;
  }

  function signatureName(signature, fallbackId) {
    var name = signature.querySelector('.sig-name.descname');
    if (name && name.textContent.trim()) {
      return name.textContent.trim();
    }
    return fallbackId.replace(/^.*-(constructor|method)-?/, '');
  }

  function buildNavigationFromItems(items) {
    items = items.filter(function (entry) {
      return entry && entry.href && entry.text;
    });
    if (!items.length) {
      return null;
    }

    var nav = document.createElement('nav');
    nav.className = 'page-section-navigation';
    var list = document.createElement('ul');
    nav.appendChild(list);

    items.forEach(function (entry) {
      var item = document.createElement('li');
      item.className = 'page-section-navigation__item page-section-navigation__item--level-' + entry.level;
      var link = document.createElement('a');
      link.href = entry.href;
      link.textContent = entry.text;
      item.appendChild(link);
      list.appendChild(item);
    });

    return nav;
  }

  function cleanHeadingText(heading) {
    return heading.textContent.replace('¶', '').trim();
  }

  function isEnhancedCasePage() {
    var caseSection = document.querySelector('div.body > section[id^="case-"], div.body section[id^="case-"]');
    if (!caseSection) {
      return false;
    }
    return Boolean(
      caseSection.querySelector('#run-instructions') ||
      caseSection.querySelector('#tree-views') ||
      caseSection.querySelector('#raw-evidence-and-source-files')
    );
  }

  function buildToctreeNavigationItems(body) {
    var links = Array.prototype.slice.call(body.querySelectorAll('li.toctree-l1 > a.reference.internal'));
    return links.map(function (link) {
      return {
        level: 1,
        href: link.getAttribute('href'),
        text: link.textContent.trim()
      };
    }).filter(function (entry) {
      return entry.href && entry.text;
    });
  }

  function buildNavigationForPage() {
    // Order matters: an Expansion page must win over the BaseRAG API builder
    // even though it contains ``Methods`` sections.
    if (isExpansionExplorePage()) {
      return buildExpansionExploreNavigation();
    }
    if (isEnhancedRagIndexPage()) {
      return buildEnhancedRagIndexNavigation();
    }
    if (isBaseRagApiPage()) {
      return buildApiPageNavigation();
    }
    return buildPageSectionNavigation();
  }

  function moveNavigationToFloatingPanel() {
    var nav = buildNavigationForPage();
    if (!nav) {
      return;
    }
    if (document.querySelector('.sidebar-method-navigation')) {
      return;
    }

    var wrapper = document.createElement('div');
    wrapper.className = 'sidebar-method-navigation';
    wrapper.setAttribute('aria-label', 'Page Navigation');

    var title = document.createElement('div');
    title.className = 'sidebar-method-navigation-title';
    title.textContent = 'Page Navigation';
    wrapper.appendChild(title);
    wrapper.appendChild(nav);

    document.body.appendChild(wrapper);
    fitNavigationWidth(wrapper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveNavigationToFloatingPanel);
  } else {
    moveNavigationToFloatingPanel();
  }
})();
