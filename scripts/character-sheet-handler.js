/**
 * Character Sheet Handler - Manages injecting the Elements tab into character sheets
 */

import { MODULE_NAME, TAB_CONFIG } from "./constants.js";
import { buildTabButton, buildTabContent, normalizeHtml } from "./tab-builder.js";

// Store active watchers for each sheet
const sheetWatchers = new Map();

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
export function addElementsTab(app, htmlInput) {
  try {
    console.log(`${MODULE_NAME} | addElementsTab called`);
    console.log(`${MODULE_NAME} | Sheet mode: ${app?.options?.editable ? "EDITABLE" : "VIEW ONLY"}`);
    console.log(`${MODULE_NAME} | App class: ${app?.constructor?.name}`);

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
    const tabButton = $(buildTabButton());
    tabsNav.append(tabButton);
    console.log(`${MODULE_NAME} | Tab button added`);

    // Add tab content to body
    const tabContent = $(buildTabContent());
    content.append(tabContent);
    console.log(`${MODULE_NAME} | Tab content added`);

    // Manually set up click handler for our Elements tab (use .off to prevent duplicates)
    tabButton.off("click").on("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      // Remove active from all tabs and tab buttons
      html.find("nav.tabs .item.control").removeClass("active");
      html.find("section.tab").removeClass("active");

      // Add active to our tab and content
      tabButton.addClass("active");
      tabContent.addClass("active");

      console.log(`${MODULE_NAME} | Elements tab activated`);
    });

    // Re-enable native tab clicks for OTHER tabs when Elements is active
    html.find("nav.tabs a.item.control").not(tabButton).off("click.elemental").on("click.elemental", function (event) {
      // Only intervene if Elements tab is currently active
      if (tabButton.hasClass("active")) {
        const targetTab = $(this).data("tab");
        
        // Deactivate Elements tab
        tabButton.removeClass("active");
        tabContent.removeClass("active");
        
        // Manually activate the target tab and its content
        $(this).addClass("active");
        html.find(`section.tab[data-tab="${targetTab}"]`).addClass("active");
        
        console.log(`${MODULE_NAME} | Switching from Elements to ${targetTab} tab`);
      }
    });

    // Set up continuous monitoring for tab removal
    const sheetId = app.id;

    // Clear any existing watcher for this sheet
    if (sheetWatchers.has(sheetId)) {
      clearInterval(sheetWatchers.get(sheetId));
    }

    // Start a new watcher that checks every 500ms if tab still exists
    const watcherId = setInterval(() => {
      const currentButton = html.find(`nav.tabs a[data-tab="${TAB_CONFIG.ID}"]`);
      const currentContent = html.find(`section.tab[data-tab="${TAB_CONFIG.ID}"]`);

      // If either tab button or content is missing, re-inject
      if (currentButton.length === 0 || currentContent.length === 0) {
        console.log(`${MODULE_NAME} | Tab disappeared, re-injecting...`);

        // Find tabs navigation and content container again
        const tabsNav = findTabsNavigation(html);
        const content = findContentContainer(html);

        if (tabsNav && content) {
          // Remove any remnants first
          html.find(`nav.tabs a[data-tab="${TAB_CONFIG.ID}"]`).remove();
          html.find(`section.tab[data-tab="${TAB_CONFIG.ID}"]`).remove();

          // Re-add tab button
          const newTabButton = $(buildTabButton());
          tabsNav.append(newTabButton);

          // Re-add tab content
          const newTabContent = $(buildTabContent());
          content.append(newTabContent);

          // Re-attach click handler
          newTabButton.off("click").on("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            html.find("nav.tabs .item.control").removeClass("active");
            html.find("section.tab").removeClass("active");
            newTabButton.addClass("active");
            newTabContent.addClass("active");
          });

          // Re-attach handler for other tabs
          html.find("nav.tabs a.item.control").not(newTabButton).off("click.elemental").on("click.elemental", function (event) {
            if (newTabButton.hasClass("active")) {
              const targetTab = $(this).data("tab");
              
              // Deactivate Elements tab
              newTabButton.removeClass("active");
              newTabContent.removeClass("active");
              
              // Manually activate the target tab and its content
              $(this).addClass("active");
              html.find(`section.tab[data-tab="${targetTab}"]`).addClass("active");
              
              console.log(`${MODULE_NAME} | Switching from Elements to ${targetTab} tab`);
            }
          });

          console.log(`${MODULE_NAME} | Tab re-injected successfully`);
        }
      }
    }, 500);

    // Store the watcher ID
    sheetWatchers.set(sheetId, watcherId);
    console.log(`${MODULE_NAME} | Tab watcher started for sheet ${sheetId}`);

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

  // Clean up watchers when sheet is closed
  Hooks.on("closeCharacterActorSheet", (app) => {
    const sheetId = app.id;
    if (sheetWatchers.has(sheetId)) {
      clearInterval(sheetWatchers.get(sheetId));
      sheetWatchers.delete(sheetId);
      console.log(`${MODULE_NAME} | Cleaned up watcher for sheet ${sheetId}`);
    }
  });

  console.log(`${MODULE_NAME} | Character sheet hooks registered`);
}
