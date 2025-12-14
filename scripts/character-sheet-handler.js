/**
 * Character Sheet Handler - Manages injecting the Elements tab into character sheets
 */

import { MODULE_NAME, TAB_CONFIG } from "./constants.js";
import { buildTabButton, buildTabContent, normalizeHtml } from "./tab-builder.js";

/**
 * Check if the Elements tab already exists in the sheet
 * @param {jQuery} html - jQuery wrapped HTML element
 * @returns {boolean} True if tab exists
 */
function tabAlreadyExists(html) {
  return html.find(`[data-tab="${TAB_CONFIG.ID}"]`).length > 0 || html.find(`section.tab.${TAB_CONFIG.ID}`).length > 0;
}

/**
 * Find and return the tabs navigation element
 * @param {jQuery} html - jQuery wrapped HTML element
 * @returns {jQuery|null} Navigation element or null
 */
function findTabsNavigation(html) {
  const tabsNav = html.find('nav.tabs[data-group="primary"]');

  if (tabsNav.length === 0) {
    console.warn(`${MODULE_NAME} | Could not find tabs navigation!`);
    return null;
  }

  return tabsNav;
}

/**
 * Find and return the content container element
 * @param {jQuery} html - jQuery wrapped HTML element
 * @returns {jQuery|null} Content element or null
 */
function findContentContainer(html) {
  let content = html.find("section.window-content");

  if (content.length === 0) {
    content = html.find(".window-content");
  }

  if (content.length === 0) {
    console.warn(`${MODULE_NAME} | Could not find content container!`);
    return null;
  }

  return content;
}

/**
 * Set the initial tab states to ensure proper display
 * @param {jQuery} html - jQuery wrapped HTML element
 */
function setInitialTabStates(html) {
  // Make sure the details tab is active by default
  html.find('[data-tab="details"]').addClass("active");
  html.find('section.tab[data-tab="details"]').addClass("active");

  // Make sure Elements tab is hidden initially
  html.find(`section.tab.${TAB_CONFIG.ID}`).removeClass("active");
}

/**
 * Main function to add the Elements tab to a character sheet
 * @param {Object} app - Application instance
 * @param {*} htmlInput - HTML element in various formats
 */
export function addElementsTab(app, htmlInput) {
  // Normalize HTML input to jQuery
  const html = normalizeHtml(htmlInput, app);

  // Check if tab already exists
  if (tabAlreadyExists(html)) {
    return;
  }

  // Find tabs navigation
  const tabsNav = findTabsNavigation(html);
  if (!tabsNav) return;

  // Find content container
  const content = findContentContainer(html);
  if (!content) return;

  // Add tab button to navigation
  tabsNav.append(buildTabButton());

  // Add tab content to body
  content.append(buildTabContent());

  // Set initial states
  setInitialTabStates(html);
}

/**
 * Register all character sheet related hooks
 */
export function registerCharacterSheetHooks() {
  // Primary hook for Application V2
  Hooks.on("render.dnd5e.applications.actor.CharacterActorSheet", (app, html) => {
    addElementsTab(app, html);
  });

  // Fallback hook
  Hooks.on("renderCharacterActorSheet", (app, html) => {
    addElementsTab(app, html);
  });
}
