/**
 * Elemental Self Module
 * Main entry point
 */

import { MODULE_NAME } from "./constants.js";
import { registerCharacterSheetHooks } from "./character-sheet-handler.js";

/**
 * Initialize the module
 */
Hooks.once("init", async function () {
  // Register character sheet hooks
  registerCharacterSheetHooks();
});
