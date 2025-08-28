// dom-helpers-fix.js - Provides consistent DOM access across all files
'use strict';

/**
 * Consistent DOM helper functions to replace jQuery-style syntax
 * These functions provide a unified way to access DOM elements
 */

/**
 * Get element by ID (replacement for jQuery $())
 * @param {string} id - Element ID
 * @returns {Element|null} DOM element or null
 */
function $(id) {
  if (typeof id === 'string') {
    // Remove # if provided (for jQuery compatibility)
    const cleanId = id.startsWith('#') ? id.substring(1) : id;
    return document.getElementById(cleanId);
  }
  return id; // Return as-is if already an element
}

/**
 * Get element value safely
 * @param {string|Element} elementOrId - Element or element ID
 * @returns {string} Element value or empty string
 */
function getValue(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  return element && element.value !== undefined ? element.value : '';
}

/**
 * Set element value safely
 * @param {string|Element} elementOrId - Element or element ID
 * @param {any} value - Value to set
 */
function setValue(elementOrId, value) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element && element.value !== undefined) {
    element.value = value;
  }
}

/**
 * Get element text content safely
 * @param {string|Element} elementOrId - Element or element ID
 * @returns {string} Text content or empty string
 */
function getText(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  return element ? element.textContent : '';
}

/**
 * Set element text content safely
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} text - Text to set
 */
function setText(elementOrId, text) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element) {
    element.textContent = text;
  }
}

/**
 * Get element innerHTML safely
 * @param {string|Element} elementOrId - Element or element ID
 * @returns {string} HTML content or empty string
 */
function getHTML(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  return element ? element.innerHTML : '';
}

/**
 * Set element innerHTML safely
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} html - HTML to set
 */
function setHTML(elementOrId, html) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * Show element (set display to block)
 * @param {string|Element} elementOrId - Element or element ID
 */
function show(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element) {
    element.style.display = 'block';
    element.hidden = false;
  }
}

/**
 * Hide element (set display to none)
 * @param {string|Element} elementOrId - Element or element ID
 */
function hide(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element) {
    element.style.display = 'none';
    element.hidden = true;
  }
}

/**
 * Add class to element
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} className - Class to add
 */
function addClass(elementOrId, className) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element && element.classList) {
    element.classList.add(className);
  }
}

/**
 * Remove class from element
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} className - Class to remove
 */
function removeClass(elementOrId, className) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element && element.classList) {
    element.classList.remove(className);
  }
}

/**
 * Check if element has class
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} className - Class to check
 * @returns {boolean} True if element has class
 */
function hasClass(elementOrId, className) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  return element && element.classList ? element.classList.contains(className) : false;
}

/**
 * Get all elements by selector
 * @param {string} selector - CSS selector
 * @returns {NodeList} Node list of elements
 */
function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Get first element by selector
 * @param {string} selector - CSS selector
 * @returns {Element|null} First matching element or null
 */
function $1(selector) {
  return document.querySelector(selector);
}

/**
 * Add event listener safely
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} event - Event name
 * @param {Function} handler - Event handler function
 */
function on(elementOrId, event, handler) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element && typeof handler === 'function') {
