// Global State Management

// Initial state
export const state = {
  isAuthenticated: false,
  user: null,
  loading: false,
  currentPage: 'home',
};

// State listeners
const listeners = [];

// Subscribe to state changes
export function subscribe(listener) {
  listeners.push(listener);

  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

// Notify all listeners
function notifyListeners() {
  listeners.forEach((listener) => listener(state));
}

// Update state
export function setState(newState) {
  Object.assign(state, newState);
  notifyListeners();
}

// Get state
export function getState() {
  return { ...state };
}

// Reset state
export function resetState() {
  Object.assign(state, {
    isAuthenticated: false,
    user: null,
    loading: false,
    currentPage: 'home',
  });
  notifyListeners();
}

