// --- Polyfills for SockJS / STOMP ---
window.global = window;
window.process = { env: { DEBUG: undefined } };
window.Buffer = window.Buffer || [];
