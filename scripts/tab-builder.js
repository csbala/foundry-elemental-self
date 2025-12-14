/**
 * Tab Builder - Handles creating the Elements tab content and button
 */

import { TAB_CONFIG } from "./constants.js";
import { MODULE_NAME } from "./constants.js";
import { getElementColor, setElementColor, getBurnLevel, setBurnLevel, getNumberOfElements, setNumberOfElements, getElementNodes, setElementNode, setElementNodes, removeElementNode } from "./element-storage.js";

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
            <label for="element-number">Number of Elements</label>
            <input type="number" 
                   id="element-number" 
                   class="element-number"
                   value="0"
                   min="0"
                   step="1"
                   data-tooltip="Number of Elements"
                   aria-label="Number of Elements">
          </div>

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

          <div class="form-group">
            <label for="element-burn-level">Burn Level</label>
            <input type="number" 
                   id="element-burn-level" 
                   class="element-burn-level"
                   value="0"
                   min="0"
                   max="100"
                   step="1"
                   data-tooltip="Burn Level (0-100)"
                   aria-label="Burn Level">
            <div class="burn-level-status" id="burn-level-status">
              All clear! Good job!
            </div>
          </div>
        </div>
        
        <div class="elements-display">
          <div class="element-circle" data-element-color="#4a90e2">
            <div class="element-circle-inner"></div>
            <div class="element-nodes-container" id="element-nodes-container">
              <!-- Small circles will be added here dynamically -->
            </div>
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
 * @param {Object} app - Application instance with actor reference
 */
export async function setupElementInteractions(html, app) {
  const colorPicker = html.find("#element-color-picker");
  const colorHex = html.find("#element-color-hex");
  const elementCircle = html.find(".element-circle");
  const numberOfElementsInput = html.find("#element-number");
  const actor = app.actor;

  if (!actor) {
    console.error(`${MODULE_NAME} | No actor found for element interactions`);
    return;
  }

  // Set up hook to clean node assignments when items are deleted
  const hookId = Hooks.on('deleteItem', async (item, options, userId) => {
    // Only process if this is our actor's item
    if (item.parent?.id === actor.id) {
      console.log(`${MODULE_NAME} | Item ${item.name} deleted from actor, cleaning node assignments`);
      
      // Find which node had this item
      const nodes = await getElementNodes(actor);
      for (const [nodeIndex, nodeData] of Object.entries(nodes)) {
        if (nodeData.itemId === item.id) {
          console.log(`${MODULE_NAME} | Removing item ${item.name} from node ${nodeIndex}`);
          await removeElementNode(actor, parseInt(nodeIndex));
          
          // Refresh the nodes display if this sheet is still open
          if (app.rendered) {
            const currentCount = parseInt(numberOfElementsInput.val()) || 0;
            await updateElementNodes(currentCount);
          }
          break;
        }
      }
    }
  });

  // Store hook ID for cleanup
  if (!app._elementNodeHooks) app._elementNodeHooks = [];
  app._elementNodeHooks.push(hookId);

  /**
   * Update element nodes (small circles around the main circle)
   * @param {number} count - Number of element nodes to display
   */
  async function updateElementNodes(count) {
    const nodesContainer = html.find("#element-nodes-container");
    nodesContainer.empty();

    if (count === 0) {
      return; // No nodes to display
    }

    // Get the current element color
    const currentColor = colorPicker.val();

    // Get saved node assignments and validate them
    const nodeAssignments = await getElementNodes(actor);
    let needsCleanup = false;
    
    // Validate that assigned items still exist on the actor
    for (const [nodeIndex, nodeData] of Object.entries(nodeAssignments)) {
      if (nodeData && nodeData.itemId) {
        const item = actor.items.get(nodeData.itemId);
        if (!item) {
          console.log(`${MODULE_NAME} | Item ${nodeData.name} (${nodeData.itemId}) no longer exists, removing from node ${nodeIndex}`);
          delete nodeAssignments[nodeIndex];
          needsCleanup = true;
        }
      }
    }
    
    // Save cleaned assignments if needed
    if (needsCleanup) {
      await setElementNodes(actor, nodeAssignments);
    }

    // Calculate positions for each node
    for (let i = 0; i < count; i++) {
      // Calculate angle in radians (starting from top, going clockwise)
      const angle = ((i * 360) / count - 90) * (Math.PI / 180);

      // Calculate position (50% is center, we position at edge of circle)
      // The circle has radius of 50% (relative to parent), small circles are positioned farther out
      const x = 50 + 52 * Math.cos(angle);
      const y = 50 + 52 * Math.sin(angle);

      // Check if this node has a feature assigned
      const assignedFeature = nodeAssignments[i];
      const featureImg = assignedFeature ? `<img src="${assignedFeature.img}" class="element-node-feature" data-node-index="${i}" draggable="true" title="${assignedFeature.name}"/>` : '';

      // Create small circle element
      const node = $(`
        <div class="element-node" data-node-index="${i}" style="
          left: ${x}%;
          top: ${y}%;
          border-color: ${currentColor} !important;
          box-shadow: 0 0 15px ${currentColor}, 0 0 30px ${currentColor} !important;
        ">${featureImg}</div>
      `);

      // Add drag-and-drop event handlers
      setupNodeDragDrop(node[0], i);

      nodesContainer.append(node);
    }

    console.log(`${MODULE_NAME} | Updated element nodes: ${count}`);
  }

  /**
   * Setup drag-and-drop handlers for an element node
   * @param {HTMLElement} nodeElement - The node DOM element
   * @param {number} nodeIndex - The index of this node
   */
  function setupNodeDragDrop(nodeElement, nodeIndex) {
    // Allow drop
    nodeElement.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.stopPropagation();
      nodeElement.classList.add('drag-over');
    });

    nodeElement.addEventListener('dragenter', (event) => {
      event.preventDefault();
      event.stopPropagation();
      nodeElement.classList.add('drag-over');
    });

    nodeElement.addEventListener('dragleave', (event) => {
      event.preventDefault();
      event.stopPropagation();
      nodeElement.classList.remove('drag-over');
    });

    // Handle drop
    nodeElement.addEventListener('drop', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      nodeElement.classList.remove('drag-over');

      try {
        // Get the dropped data
        const data = JSON.parse(event.dataTransfer.getData('text/plain'));
        
        if (data.type === 'Item') {
          // Get the item
          const item = await fromUuid(data.uuid);
          
          if (!item) {
            ui.notifications.warn("Could not find the dropped item");
            return;
          }

          // Add item to actor if not already present - get the ACTOR's item ID
          let actorItemId = null;
          const existingItem = actor.items.find(i => i.name === item.name && i.type === item.type);
          
          if (existingItem) {
            actorItemId = existingItem.id;
            console.log(`${MODULE_NAME} | Feature ${item.name} already on actor, using existing ID ${actorItemId}`);
          } else {
            // Create returns array of created items
            const createdItems = await actor.createEmbeddedDocuments('Item', [item.toObject()]);
            actorItemId = createdItems[0].id;
            console.log(`${MODULE_NAME} | Added feature ${item.name} to actor with ID ${actorItemId}`);
          }

          // Save feature assignment to this node with the ACTOR's item ID
          await setElementNode(actor, nodeIndex, {
            itemId: actorItemId, // Store the actor's item ID, not the source item ID
            img: item.img,
            name: item.name,
            uuid: `Actor.${actor.id}.Item.${actorItemId}` // Create proper UUID for actor's item
          });

          console.log(`${MODULE_NAME} | Assigned feature ${item.name} to node ${nodeIndex}`);
          ui.notifications.info(`Assigned ${item.name} to element node`);

          // Refresh nodes
          const currentCount = parseInt(numberOfElementsInput.val()) || 0;
          await updateElementNodes(currentCount);
        }
      } catch (error) {
        console.error(`${MODULE_NAME} | Error handling drop:`, error);
        ui.notifications.error("Failed to assign feature to node");
      }
    });

    // Setup drag-out for feature images
    const featureImg = nodeElement.querySelector('.element-node-feature');
    if (featureImg) {
      let dragStartPos = null;
      
      featureImg.addEventListener('dragstart', (event) => {
        const nodeIdx = parseInt(featureImg.dataset.nodeIndex);
        dragStartPos = { x: event.clientX, y: event.clientY };
        
        event.dataTransfer.setData('text/plain', JSON.stringify({
          type: 'ElementNodeFeature',
          nodeIndex: nodeIdx,
          actorId: actor.id
        }));
        event.dataTransfer.effectAllowed = 'move';
        
        // Mark as being dragged
        featureImg.classList.add('dragging');
      });

      featureImg.addEventListener('dragend', async (event) => {
        featureImg.classList.remove('dragging');
        
        // Check if dragged outside the node (remove)
        // Use screenX/screenY as clientX/Y might be 0
        const x = event.clientX || event.screenX;
        const y = event.clientY || event.screenY;
        
        // Only check if we have valid coordinates and they moved
        if (x !== 0 && y !== 0 && dragStartPos) {
          const rect = nodeElement.getBoundingClientRect();
          const isOutside = x < rect.left || x > rect.right ||
                           y < rect.top || y > rect.bottom;

          if (isOutside) {
            console.log(`${MODULE_NAME} | Dragged outside node ${nodeIndex}, removing feature`);
            await removeFeatureFromNode(nodeIndex);
          }
        }
        
        dragStartPos = null;
      });
    }
  }

  /**
   * Remove a feature from a node
   * @param {number} nodeIndex - The node index
   */
  async function removeFeatureFromNode(nodeIndex) {
    try {
      // Get the feature data before removing
      const nodes = await getElementNodes(actor);
      const featureData = nodes[nodeIndex];

      if (!featureData) return;

      // Remove from actor's items
      const item = actor.items.get(featureData.itemId);
      if (item) {
        await item.delete();
        console.log(`${MODULE_NAME} | Removed feature ${featureData.name} from actor`);
      }

      // Remove node assignment
      await removeElementNode(actor, nodeIndex);
      
      ui.notifications.info(`Removed ${featureData.name} from element node`);

      // Refresh nodes
      const currentCount = parseInt(numberOfElementsInput.val()) || 0;
      await updateElementNodes(currentCount);
    } catch (error) {
      console.error(`${MODULE_NAME} | Error removing feature:`, error);
      ui.notifications.error("Failed to remove feature");
    }
  }

  // Number of Elements interactions
  numberOfElementsInput.on("input", async function () {
    const count = parseInt($(this).val()) || 0;
    const validCount = Math.max(0, count);
    await updateElementNodes(validCount);
  });

  numberOfElementsInput.on("change", async function () {
    const count = parseInt($(this).val()) || 0;
    const validCount = Math.max(0, count);

    // Update input to valid value
    $(this).val(validCount);
    await updateElementNodes(validCount);

    try {
      await setNumberOfElements(actor, validCount);
      console.log(`${MODULE_NAME} | Saved number of elements ${validCount} to actor ${actor.name}`);
    } catch (error) {
      console.error(`${MODULE_NAME} | Failed to save number of elements:`, error);
      ui.notifications.error("Failed to save number of elements");
    }
  });

  // Load saved number of elements (but don't update nodes yet, wait for color to load)
  let savedCount = 0;
  try {
    savedCount = await getNumberOfElements(actor);
    numberOfElementsInput.val(savedCount);
    console.log(`${MODULE_NAME} | Loaded number of elements ${savedCount} from actor ${actor.name}`);
  } catch (error) {
    console.error(`${MODULE_NAME} | Failed to load number of elements:`, error);
  }

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

    // Apply glow effect both inward and outward
    elementCircle.css({
      "box-shadow": `0 0 40px rgba(${r}, ${g}, ${b}, 0.8), inset 0 0 40px rgba(${r}, ${g}, ${b}, 0.6)`,
      "border-color": `rgba(${r}, ${g}, ${b}, 0.4)`,
    });

    // Store color in data attribute
    elementCircle.attr("data-element-color", hexColor);

    console.log(`${MODULE_NAME} | Circle color updated to ${hexColor}`);
  }

  // Color picker change event (with live preview and save on change)
  colorPicker.on("input", async function () {
    const color = $(this).val();
    colorHex.val(color);
    updateCircleColor(color);
    // Update node colors in real-time
    const currentCount = parseInt(numberOfElementsInput.val()) || 0;
    await updateElementNodes(currentCount);
  });

  colorPicker.on("change", async function () {
    const color = $(this).val();
    try {
      await setElementColor(actor, color);
      console.log(`${MODULE_NAME} | Saved color ${color} to actor ${actor.name}`);
    } catch (error) {
      console.error(`${MODULE_NAME} | Failed to save color:`, error);
      ui.notifications.error("Failed to save element color");
    }
  });

  // Hex input change event (save when user finishes editing)
  colorHex.on("change", async function () {
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
      // Update node colors when hex is manually changed
      const currentCount = parseInt(numberOfElementsInput.val()) || 0;
      await updateElementNodes(currentCount);

      // Save to actor
      try {
        await setElementColor(actor, color);
        console.log(`${MODULE_NAME} | Saved color ${color} to actor ${actor.name}`);
      } catch (error) {
        console.error(`${MODULE_NAME} | Failed to save color:`, error);
        ui.notifications.error("Failed to save element color");
      }
    } else {
      // Reset to picker value if invalid
      $(this).val(colorPicker.val());
      ui.notifications.warn("Invalid hex color code. Use format: #RRGGBB");
    }
  });

  // Load saved color from actor and initialize
  try {
    const savedColor = await getElementColor(actor);
    colorPicker.val(savedColor);
    colorHex.val(savedColor);
    updateCircleColor(savedColor);
    console.log(`${MODULE_NAME} | Loaded color ${savedColor} from actor ${actor.name}`);
  } catch (error) {
    console.error(`${MODULE_NAME} | Failed to load saved color:`, error);
    // Fall back to default
    updateCircleColor(colorPicker.val());
  }

  // Now update element nodes with the loaded color and count
  await updateElementNodes(savedCount);

  // Burn Level interactions
  const burnLevelInput = html.find("#element-burn-level");
  const burnLevelStatus = html.find("#burn-level-status");

  /**
   * Get burn level color and status text based on level
   * @param {number} level - Burn level (0-100)
   * @returns {Object} { color, borderColor, text }
   */
  function getBurnLevelState(level) {
    if (level < 100 && level <= 15) {
      return {
        color: "#22c55e",
        borderColor: "rgba(34, 197, 94, 0.6)",
        text: "All clear! Good job!",
        bgTint: "rgba(34, 197, 94, 0.15)",
      };
    } else if (level <= 20) {
      return {
        color: "#eab308",
        borderColor: "rgba(234, 179, 8, 0.6)",
        text: "Average burn level",
        bgTint: "rgba(234, 179, 8, 0.15)",
      };
    } else if (level <= 35) {
      return {
        color: "#f59e0b",
        borderColor: "rgba(245, 158, 11, 0.6)",
        text: "Higher than average burn level - Try to get medication",
        bgTint: "rgba(245, 158, 11, 0.15)",
      };
    } else if (level <= 50) {
      return {
        color: "#f97316",
        borderColor: "rgba(249, 115, 22, 0.6)",
        text: "Nausea and headaches! Your burn level is too high",
        bgTint: "rgba(249, 115, 22, 0.15)",
      };
    } else if (level <= 60) {
      return {
        color: "#dc2626",
        borderColor: "rgba(220, 38, 38, 0.6)",
        text: "Unhealthy burn: health complications",
        bgTint: "rgba(220, 38, 38, 0.15)",
      };
    } else if (level <= 70) {
      return {
        color: "#ef4444",
        borderColor: "rgba(239, 68, 68, 0.6)",
        text: "Unusual burn activity: demonic whispers",
        bgTint: "rgba(239, 68, 68, 0.15)",
      };
    } else if (level <= 80) {
      return {
        color: "#991b1b",
        borderColor: "rgba(153, 27, 27, 0.8)",
        text: "COMPROMISED - Seek medical help immediately",
        bgTint: "rgba(153, 27, 27, 0.2)",
      };
    } else if (level < 100) {
      return {
        color: "#450a0a",
        borderColor: "rgba(69, 10, 10, 1)",
        text: "EXTREME DANGER - Critical burn levels!",
        bgTint: "rgba(69, 10, 10, 0.3)",
      };
    } else {
      // Level 100 - Special mysterious message
      return {
        color: "#ffffff",
        borderColor: "rgba(255, 255, 255, 0.9)",
        text: "Deus misereatur... Pray for your soul",
        bgTint: "rgba(255, 255, 255, 0.1)",
      };
    }
  }

  /**
   * Update burn level visual state
   * @param {number} level - Burn level (0-100)
   */
  function updateBurnLevelVisuals(level) {
    const state = getBurnLevelState(level);

    burnLevelInput.css({
      "border-color": state.borderColor,
      "box-shadow": `0 0 10px ${state.borderColor}`,
      background: `linear-gradient(to bottom, ${state.bgTint}, rgba(0, 0, 0, 0.3))`,
    });

    burnLevelStatus.css({
      color: state.color,
      "text-shadow": `0 0 8px ${state.borderColor}`,
    });

    burnLevelStatus.text(state.text);
  }

  // Update visuals on input (live preview)
  burnLevelInput.on("input", function () {
    const level = parseInt($(this).val()) || 0;
    const clampedLevel = Math.max(0, Math.min(100, level));
    updateBurnLevelVisuals(clampedLevel);
  });

  // Save burn level when it changes
  burnLevelInput.on("change", async function () {
    const level = parseInt($(this).val()) || 0;
    const clampedLevel = Math.max(0, Math.min(100, level));

    // Update input to clamped value
    $(this).val(clampedLevel);
    updateBurnLevelVisuals(clampedLevel);

    try {
      await setBurnLevel(actor, clampedLevel);
      console.log(`${MODULE_NAME} | Saved burn level ${clampedLevel} to actor ${actor.name}`);
    } catch (error) {
      console.error(`${MODULE_NAME} | Failed to save burn level:`, error);
      ui.notifications.error("Failed to save burn level");
    }
  });

  // Load saved burn level
  try {
    const savedBurnLevel = await getBurnLevel(actor);
    burnLevelInput.val(savedBurnLevel);
    updateBurnLevelVisuals(savedBurnLevel);
    console.log(`${MODULE_NAME} | Loaded burn level ${savedBurnLevel} from actor ${actor.name}`);
  } catch (error) {
    console.error(`${MODULE_NAME} | Failed to load burn level:`, error);
  }
}
