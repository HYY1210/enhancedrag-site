(function () {
  "use strict";

  var palettes = {
    default: {
      label: "Default",
      swatch: "#1d4ed8",
      vars: {
        "--manual-h1-color": "#111827",
        "--manual-h2-color": "#1f2937",
        "--manual-h3-color": "#1d4ed8",
        "--manual-h4-color": "#0f766e",
        "--manual-api-signature-color": "#1d4ed8"
      }
    },
    teal: {
      label: "Teal",
      swatch: "#0f766e",
      vars: {
        "--manual-h1-color": "#111827",
        "--manual-h2-color": "#1f2937",
        "--manual-h3-color": "#0f766e",
        "--manual-h4-color": "#0369a1",
        "--manual-api-signature-color": "#0f766e"
      }
    },
    amber: {
      label: "Amber",
      swatch: "#b45309",
      vars: {
        "--manual-h1-color": "#111827",
        "--manual-h2-color": "#374151",
        "--manual-h3-color": "#b45309",
        "--manual-h4-color": "#7c2d12",
        "--manual-api-signature-color": "#b45309"
      }
    },
    rose: {
      label: "Rose",
      swatch: "#be123c",
      vars: {
        "--manual-h1-color": "#111827",
        "--manual-h2-color": "#374151",
        "--manual-h3-color": "#be123c",
        "--manual-h4-color": "#7e22ce",
        "--manual-api-signature-color": "#be123c"
      }
    },
    slate: {
      label: "Slate",
      swatch: "#334155",
      vars: {
        "--manual-h1-color": "#020617",
        "--manual-h2-color": "#334155",
        "--manual-h3-color": "#475569",
        "--manual-h4-color": "#64748b",
        "--manual-api-signature-color": "#334155"
      }
    }
  };

  function applyPalette(name) {
    var palette = palettes[name] || palettes.default;
    Object.keys(palette.vars).forEach(function (key) {
      document.documentElement.style.setProperty(key, palette.vars[key]);
    });
    window.localStorage.setItem("manual-heading-palette", name);
    Array.prototype.forEach.call(document.querySelectorAll(".heading-color-picker__swatch"), function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-palette") === name);
    });
  }

  function createPicker() {
    if (document.querySelector(".heading-color-picker")) {
      return;
    }
    var picker = document.createElement("div");
    picker.className = "heading-color-picker";
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", "Heading color palette");

    var label = document.createElement("span");
    label.className = "heading-color-picker__label";
    label.textContent = "Title";
    picker.appendChild(label);

    Object.keys(palettes).forEach(function (name) {
      var palette = palettes[name];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "heading-color-picker__swatch";
      button.setAttribute("data-palette", name);
      button.setAttribute("title", palette.label + " heading colors");
      button.setAttribute("aria-label", palette.label + " heading colors");
      button.style.backgroundColor = palette.swatch;
      button.addEventListener("click", function () {
        applyPalette(name);
      });
      picker.appendChild(button);
    });

    document.body.appendChild(picker);
    applyPalette(window.localStorage.getItem("manual-heading-palette") || "default");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createPicker);
  } else {
    createPicker();
  }
}());
