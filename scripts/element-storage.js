/**
 * Element Storage - Handles persisting element data to actor flags
 */

import { MODULE_ID } from "./constants.js";

/**
 * Configuration for element storage
 */
const STORAGE_CONFIG = {
  defaults: {
    elementColor: "#4a90e2",
    burnLevel: 0,
    numberOfElements: 0,
  },
};

/**
 * Generic helper to get a flag from an actor.
 *
 * @param {Actor5e} actor - The Foundry VTT actor object.
 * @param {string} key - The flag key to retrieve.
 * @param {any} defaultValue - The default value if the flag is not set.
 * @returns {Promise<any>} The flag value or the default.
 * @throws {Error} If actor is invalid.
 */
async function getFlag(actor, key, defaultValue = null) {
  if (!actor || typeof actor.getFlag !== "function") {
    throw new Error("Invalid actor provided");
  }
  return (await actor.getFlag(MODULE_ID, key)) ?? defaultValue;
}

/**
 * Generic helper to set a flag on an actor.
 *
 * @param {Actor5e} actor - The Foundry VTT actor object.
 * @param {string} key - The flag key to set.
 * @param {any} value - The value to set.
 * @returns {Promise<void>}
 * @throws {Error} If actor is invalid.
 */
async function setFlag(actor, key, value) {
  if (!actor || typeof actor.setFlag !== "function") {
    throw new Error("Invalid actor provided");
  }
  await actor.setFlag(MODULE_ID, key, value);
}

/**
 * Retrieve the stored element color for a specific actor.
 *
 * @param {Actor5e} actor - The Foundry VTT actor object.
 * @returns {Promise<string>} The element color in hex format (e.g., "#4a90e2").
 */
export async function getElementColor(actor) {
  return await getFlag(actor, "elementColor", STORAGE_CONFIG.defaults.elementColor);
}

/**
 * Set or update the element color for a specific actor.
 *
 * @param {Actor5e} actor - The Foundry VTT actor object.
 * @param {string} color - The color in hex format (e.g., "#4a90e2").
 * @returns {Promise<void>}
 */
export async function setElementColor(actor, color) {
  if (!/^#[0-9A-Fa-f]{6}$/i.test(color)) {
    throw new Error(`Invalid color: ${color}. Must be a hex color (e.g., "#4a90e2")`);
  }
  await setFlag(actor, "elementColor", color);
}

/**
 * Retrieve the stored burn level for a specific actor.
 *
 * @param {Actor5e} actor - The Foundry VTT actor object.
 * @returns {Promise<number>} The burn level (0-100).
 */
export async function getBurnLevel(actor) {
  return await getFlag(actor, "burnLevel", STORAGE_CONFIG.defaults.burnLevel);
}

/**
 * Set or update the burn level for a specific actor.
 *
 * @param {Actor5e} actor - The Foundry VTT actor object.
 * @param {number} level - The burn level (0-100).
 * @returns {Promise<void>}
 */
export async function setBurnLevel(actor, level) {
  const burnLevel = Math.max(0, Math.min(100, parseInt(level) || 0));
  await setFlag(actor, "burnLevel", burnLevel);
}

/**
 * Retrieve the number of elements for a specific actor.
 *
 * @param {Actor5e} actor - The Foundry VTT actor object.
 * @returns {Promise<number>} The number of elements.
 */
export async function getNumberOfElements(actor) {
  return await getFlag(actor, "numberOfElements", STORAGE_CONFIG.defaults.numberOfElements);
}

/**
 * Set or update the number of elements for a specific actor.
 *
 * @param {Actor5e} actor - The Foundry VTT actor object.
 * @param {number} count - The number of elements.
 * @returns {Promise<void>}
 */
export async function setNumberOfElements(actor, count) {
  const numberOfElements = Math.max(0, parseInt(count) || 0);
  await setFlag(actor, "numberOfElements", numberOfElements);
}
