Object.defineProperty(global, "navigator", {value: {}});
Object.defineProperty(global.navigator, "appName", {value: "Netscape"});
console.log("global.navigator.appName was set to Netscape");
