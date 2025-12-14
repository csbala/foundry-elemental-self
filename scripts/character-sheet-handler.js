/**
 * Character Sheet Handler - Manages injecting the Elements tab into character sheets
 */

import { MODULE_NAME, TAB_CONFIG } from "./constants.js";
import { buildTabButton, buildTabContent, normalizeHtml, setupElementInteractions } from "./tab-builder.js";

// Store active tab per sheet ID to preserve state across re-renders
const activeTabTracker = new Map();

/**
 * Check if the Elements tab already exists in the sheet
 * @param {jQuery} html - jQuery wrapped HTML element
 * @returns {boolean} True if tab exists
 */
function tabAlreadyExists(html) {
  // Check both the button and the content section
  const hasButton = html.find(`nav.tabs a[data-tab="${TAB_CONFIG.ID}"]`).length > 0;
  const hasContent = html.find(`section.tab[data-tab="${TAB_CONFIG.ID}"]`).length > 0;
  return hasButton || hasContent;
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
    console.log(`${MODULE_NAME} | Found tab container with ${content.children("section.tab").length} existing tabs`);
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
 * Main function to add the Elements tab to a character sheet
 * @param {Object} app - Application instance
 * @param {*} htmlInput - HTML element in various formats
 */
export async function addElementsTab(app, htmlInput) {
  try {
    console.log(`${MODULE_NAME} | addElementsTab called`);
    console.log(`${MODULE_NAME} | Sheet mode: ${app?.options?.editable ? "EDITABLE" : "VIEW ONLY"}`);
    console.log(`${MODULE_NAME} | App class: ${app?.constructor?.name}`);

    // Normalize HTML input to jQuery
    const html = normalizeHtml(htmlInput, app);
    console.log(`${MODULE_NAME} | HTML normalized, length: ${html.length}`);

    // Get the previously active tab from our tracker
    const sheetId = app.id;
    const previousActiveTab = activeTabTracker.get(sheetId) || "details";
    console.log(`${MODULE_NAME} | Previous active tab from tracker: ${previousActiveTab}`);

    // Remove any existing Elements tab to avoid duplicates
    html.find(`nav.tabs a[data-tab="${TAB_CONFIG.ID}"]`).remove();
    html.find(`section.tab[data-tab="${TAB_CONFIG.ID}"]`).remove();

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

    // ALWAYS inject tab button and content (on every render)
    const tabButton = $(buildTabButton());
    tabsNav.append(tabButton);
    console.log(`${MODULE_NAME} | Tab button added`);

    const tabContent = $(buildTabContent());
    content.append(tabContent);
    console.log(`${MODULE_NAME} | Tab content added`);

    // Set up interactive elements (color picker, etc.)
    await setupElementInteractions(html, app);
    console.log(`${MODULE_NAME} | Element interactions initialized`);

    // Track clicks on ALL tabs to know which one user selected
    html.find('nav.tabs a[data-action="tab"]').on("click", function () {
      const clickedTab = $(this).data("tab");
      activeTabTracker.set(sheetId, clickedTab);
      console.log(`${MODULE_NAME} | User clicked tab: ${clickedTab}`);
    });

    // Try to bind with Foundry's tab system if available (optional - manual restoration works regardless)
    const tryBindTabs = () => {
      if (app._tabs && app._tabs.length > 0) {
        const primaryTabs = app._tabs.find((t) => t.group === "primary");
        if (primaryTabs) {
          primaryTabs.bind(html[0] || html);
          console.log(`${MODULE_NAME} | Tabs re-bound with Foundry's system`);
          return true;
        }
      }
      return false;
    };

    // Try to bind, but don't worry if it fails - manual restoration handles everything
    if (!tryBindTabs()) {
      setTimeout(() => tryBindTabs(), 50);
    }

    // ALWAYS restore the active tab manually (don't rely on Foundry's system)
    setTimeout(() => {
      // Remove active from all
      html.find('nav.tabs a[data-action="tab"]').removeClass("active");
      html.find('section.tab[data-group="primary"]').removeClass("active");

      // Add active to the previously active tab
      const activeButton = html.find(`nav.tabs a[data-tab="${previousActiveTab}"]`);
      const activeContent = html.find(`section.tab[data-tab="${previousActiveTab}"]`);

      if (activeButton.length > 0 && activeContent.length > 0) {
        activeButton.addClass("active");
        activeContent.addClass("active");
        console.log(`${MODULE_NAME} | Manually restored active tab: ${previousActiveTab}`);
      } else {
        console.warn(`${MODULE_NAME} | Could not find tab elements for: ${previousActiveTab}`);
      }
    }, 100);

    console.log(`${MODULE_NAME} | Tab injection complete`);
  } catch (error) {
    console.error(`${MODULE_NAME} | Error injecting tab:`, error);
  }
}

/**
 * Register all character sheet related hooks
 */
export function registerCharacterSheetHooks() {
  console.log(`${MODULE_NAME} | Registering character sheet hooks`);

  // Primary hook for Application V2 (works for both edit and play mode)
  Hooks.on("render.dnd5e.applications.actor.CharacterActorSheet", (app, html) => {
    console.log(`${MODULE_NAME} | Application V2 hook fired`);
    addElementsTab(app, html);
  });

  // Fallback hook for compatibility
  Hooks.on("renderCharacterActorSheet", (app, html) => {
    console.log(`${MODULE_NAME} | Fallback hook fired`);
    addElementsTab(app, html);
  });

  // Additional hooks to catch re-renders and mode changes
  Hooks.on("renderActorSheet", (app, html) => {
    console.log(`${MODULE_NAME} | Generic ActorSheet render hook fired`);
    if (app.constructor.name === "CharacterActorSheet") {
      addElementsTab(app, html);
    }
  });

  Hooks.on("renderActorSheet5eCharacter", (app, html) => {
    console.log(`${MODULE_NAME} | Legacy ActorSheet5eCharacter hook fired`);
    addElementsTab(app, html);
  });

  // CATCH-ALL: Listen to ALL renders and filter for character sheets
  Hooks.on("render", (app, html) => {
    if (app.constructor.name === "CharacterActorSheet") {
      console.log(`${MODULE_NAME} | Catch-all render hook fired for CharacterActorSheet`);
      addElementsTab(app, html);
    }
  });

  // DON'T clean up tracker - keep it so we remember which tab was active
  // This allows reopening the sheet to restore the last active tab
  Hooks.on("closeCharacterActorSheet", (app) => {
    console.log(`${MODULE_NAME} | Character sheet ${app.id} closed (keeping tracker)`);
  });

  console.log(`${MODULE_NAME} | Character sheet hooks registered`);
}
