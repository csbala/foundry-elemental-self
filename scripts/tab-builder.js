/**
 * Tab Builder - Handles creating the Elements tab content and button
 */

import { TAB_CONFIG } from "./constants.js";
import { MODULE_NAME } from "./constants.js";

/**
 * Builds the tab button HTML
 * @returns {string} HTML string for the tab button
 */
export function buildTabButton() {
  return `
    <a class="item control" data-action="tab" data-group="primary" data-tab="${TAB_CONFIG.ID}" 
       data-tooltip="" aria-label="${TAB_CONFIG.LABEL}">
      <i class="${TAB_CONFIG.ICON}" inert=""></i>
      
    </a>
  `;
}

/**
 * Builds the tab content HTML
 * @returns {string} HTML string for the tab content
 */
export function buildTabContent() {
  return `
    <section class="tab elements" data-group="primary" data-tab="${TAB_CONFIG.ID}">
      <div class="elements-container">
        <div class="elements-controls">
          <h3 class="section-title">Elements</h3>
          
          <div class="form-group">
            <label for="element-color-picker">Element Color</label>
            <div class="color-input-group">
              <input type="color" 
                     id="element-color-picker" 
                     class="element-color-picker"
                     value="#4a90e2"
                     data-tooltip="Pick Element Color"
                     aria-label="Element Color Picker">
              <input type="text" 
                     id="element-color-hex" 
                     class="element-color-hex"
                     value="#4a90e2"
                     placeholder="#4a90e2"
                     maxlength="7"
                     pattern="^#[0-9A-Fa-f]{6}$"
                     data-tooltip="Hex Color Code"
                     aria-label="Hex Color Code">
            </div>
          </div>
        </div>
        
        <div class="elements-display">
          <div class="element-circle" data-element-color="#4a90e2">
            <div class="element-circle-inner"></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Converts various HTML input types to jQuery object
 * @param {*} htmlInput - HTML element in various formats
 * @param {Object} app - Application instance
 * @returns {jQuery} jQuery wrapped HTML
 */
export function normalizeHtml(htmlInput, app) {
  if (Array.isArray(htmlInput)) {
    return $(htmlInput[0]);
  } else if (htmlInput instanceof jQuery) {
    return htmlInput;
  } else if (htmlInput instanceof HTMLElement) {
    return $(htmlInput);
  } else {
    return $(app.element);
  }
}

/**
 * Sets up event listeners for interactive elements
 * @param {jQuery} html - jQuery wrapped HTML element
 */
export function setupElementInteractions(html) {
  const colorPicker = html.find("#element-color-picker");
  const colorHex = html.find("#element-color-hex");
  const elementCircle = html.find(".element-circle");

  /**
   * Updates the circle color with gradient
   * @param {string} hexColor - Hex color code
   */
  function updateCircleColor(hexColor) {
    // Validate hex color
    if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
      console.warn(`${MODULE_NAME} | Invalid hex color: ${hexColor}`);
      return;
    }

    // Convert hex to RGB for gradient calculation
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Create darker shade for gradient (multiply by 0.6)
    const darkR = Math.round(r * 0.6);
    const darkG = Math.round(g * 0.6);
    const darkB = Math.round(b * 0.6);

    const lightColor = hexColor;
    const darkColor = `#${darkR.toString(16).padStart(2, "0")}${darkG.toString(16).padStart(2, "0")}${darkB.toString(16).padStart(2, "0")}`;

    // Apply gradient and glow
    elementCircle.css({
      background: `linear-gradient(135deg, ${lightColor} 0%, ${darkColor} 100%)`,
      "box-shadow": `0 0 30px rgba(${r}, ${g}, ${b}, 0.6)`,
    });

    // Store color in data attribute
    elementCircle.attr("data-element-color", hexColor);

    console.log(`${MODULE_NAME} | Circle color updated to ${hexColor}`);
  }

  // Color picker change event
  colorPicker.on("input change", function () {
    const color = $(this).val();
    colorHex.val(color);
    updateCircleColor(color);
  });

  // Hex input change event
  colorHex.on("change", function () {
    let color = $(this).val().trim();

    // Add # if missing
    if (!color.startsWith("#")) {
      color = "#" + color;
    }

    // Validate and update
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      colorPicker.val(color);
      $(this).val(color);
      updateCircleColor(color);
    } else {
      // Reset to picker value if invalid
      $(this).val(colorPicker.val());
      ui.notifications.warn("Invalid hex color code. Use format: #RRGGBB");
    }
  });

  // Initialize with default color
  updateCircleColor(colorPicker.val());
}
