import {
  app,
  BrowserWindow,
  session,
  desktopCapturer,
  ipcMain,
} from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Enable screen sharing features for Electron
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");
app.commandLine.appendSwitch("allow-http-screen-capture");
// Force use legacy screen capture to avoid WGC issues
app.commandLine.appendSwitch("disable-features", "WebRtcUseEchoCanceller3");
app.commandLine.appendSwitch("force-cpu-draw");

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Handle permissions for screen sharing
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      console.log("🔍 Permission requested:", permission);
      if (permission === "media") {
        callback(true); // Allow media permissions
      } else {
        callback(false);
      }
    }
  );
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle desktop capturer for screen sharing
ipcMain.handle("get-desktop-sources", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      thumbnailSize: { width: 150, height: 150 },
      fetchWindowIcons: false,
    });
    console.log("🔍 Desktop sources found:", sources.length);

    // Log source details for debugging
    sources.forEach((source, index) => {
      console.log(`  ${index}: ${source.name} (${source.id})`);
    });

    return sources;
  } catch (error) {
    console.error("❌ Error getting desktop sources:", error);
    return [];
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
