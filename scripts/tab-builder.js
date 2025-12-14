/**
 * Tab Builder - Handles creating the Elements tab content and button
 */

import { TAB_CONFIG } from "./constants.js";

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
      <div class="elemental-self-container">
        <div class="element-circle-container">
          <div class="element-circle blue">
            <div class="element-circle-inner"></div>
          </div>
        </div>
        <h2>Elemental Self System</h2>
        <p>Your elemental powers will appear here...</p>
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
