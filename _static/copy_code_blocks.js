(function () {
  "use strict";

  function textFromPre(pre) {
    var clone = pre.cloneNode(true);
    Array.prototype.forEach.call(
      clone.querySelectorAll(".linenos, .linenodiv, .lineno, td.linenos, span.linenos"),
      function (node) {
        node.parentNode.removeChild(node);
      }
    );
    return (clone.innerText || clone.textContent || "").replace(/\s+$/, "");
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function containerFor(pre) {
    return pre.closest("div.highlight") ||
      pre.closest("div.literal-block-wrapper") ||
      pre.parentElement;
  }

  function installButton(pre) {
    var container = containerFor(pre);
    if (!container || container.querySelector(":scope > .code-copy-button")) {
      return;
    }

    container.classList.add("code-copy-container");

    var button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code block");

    button.addEventListener("click", function () {
      copyText(textFromPre(pre)).then(function () {
        button.textContent = "Copied";
        button.classList.add("is-copied");
        window.setTimeout(function () {
          button.textContent = "Copy";
          button.classList.remove("is-copied");
        }, 1400);
      }).catch(function () {
        button.textContent = "Failed";
        button.classList.add("is-failed");
        window.setTimeout(function () {
          button.textContent = "Copy";
          button.classList.remove("is-failed");
        }, 1600);
      });
    });

    container.appendChild(button);
  }

  function installCopyButtons() {
    var seen = [];
    Array.prototype.forEach.call(
      document.querySelectorAll("div.highlight pre, pre.literal-block, .aiagent-panel pre"),
      function (pre) {
        if (seen.indexOf(pre) === -1 && textFromPre(pre).trim()) {
          seen.push(pre);
          installButton(pre);
        }
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installCopyButtons);
  } else {
    installCopyButtons();
  }
}());
