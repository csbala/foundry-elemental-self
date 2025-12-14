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
 * Find and return the content container element (the div that holds all tab sections)
 * @param {jQuery} html - jQuery wrapped HTML element
 * @returns {jQuery|null} Content element or null
 */
function findContentContainer(html) {
  // Find the div with class "tab-body" that contains all the tab sections
  let content = html.find('div[data-container-id="tabs"].tab-body');
  console.log(`${MODULE_NAME} | Looking for div[data-container-id="tabs"].tab-body, found: ${content.length}`);
  
  if (content.length > 0) {
    console.log(`${MODULE_NAME} | Found tab container with ${content.children('section.tab').length} existing tabs`);
    return content;
  }

  // Fallback: just look for .tab-body
  content = html.find(".tab-body");
  console.log(`${MODULE_NAME} | Fallback: Looking for .tab-body, found: ${content.length}`);

  if (content.length === 0) {
    console.warn(`${MODULE_NAME} | Could not find tab container!`);
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
  console.log(`${MODULE_NAME} | addElementsTab called`);
  
  // Normalize HTML input to jQuery
  const html = normalizeHtml(htmlInput, app);
  console.log(`${MODULE_NAME} | HTML normalized, length: ${html.length}`);

  // Check if tab already exists
  if (tabAlreadyExists(html)) {
    console.log(`${MODULE_NAME} | Tab already exists, skipping`);
    return;
  }

  // Find tabs navigation
  const tabsNav = findTabsNavigation(html);
  if (!tabsNav) {
    console.warn(`${MODULE_NAME} | Failed to find tabs navigation`);
    return;
  }
  console.log(`${MODULE_NAME} | Found tabs navigation`);

  // Find content container
  const content = findContentContainer(html);
  if (!content) {
    console.warn(`${MODULE_NAME} | Failed to find content container`);
    return;
  }
  console.log(`${MODULE_NAME} | Found content container`);

  // Add tab button to navigation
  tabsNav.append(buildTabButton());
  console.log(`${MODULE_NAME} | Tab button added`);

  // Add tab content to body
  content.append(buildTabContent());
  console.log(`${MODULE_NAME} | Tab content added`);

  // Set initial states
  setInitialTabStates(html);
  console.log(`${MODULE_NAME} | Tab injection complete`);
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
