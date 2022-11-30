const { app, BrowserWindow, Menu , ipcMain, shell} = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const resizeImg = require("resize-img");

process.env.NODE_ENV = 'production'

const isMac = process.platform === "darwin" ? true : false;
const isDev = process.env.NODE_ENV !== "production";

let mainWindow;

//Create the main window
function createMainWindow() {
   mainWindow = new BrowserWindow({
    title: 'Image Resizer',
    width: isDev ? 1000 : 600,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  //Open devtools if in dev env
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));
}

//Create about window
function createAboutWindow(){
    const aboutWindow = new BrowserWindow({
        title: 'About Image Resizer',
        width: 300,
        height: 300,
      });
    
      aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));
}


//App is ready
app.whenReady().then(() => {
  createMainWindow();

  //Implement menu
  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)

  //Remove mainWindow from memory on closee
  mainMenu.on('closed', () => {
    mainMenu = null;
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

//Menu template
// const menu = [
//   {
//     label: "File",
//     submenu: [
//       {
//         label: "Quit",
//         click: () => app.quit(),
//         accelerator: 'CmdOrCtrl+W'
//       }
//     ]
//   }
// ];

//Different menus for each platform
const menu = [
    ...(isMac ? [{label: app.name, submenu: [{label:'About', click: ()=>createAboutWindow()}]}] : []),
    {
        role: 'fileMenu'
    },
    ...(!isMac ? [{label: 'Help', submenu:[{
        label: 'About',
        click: () => createAboutWindow()
    }] }]: [])
];

//Respond to ipcRender resize
ipcMain.on('image:resize', (e, options) => {
  options.dest = path.join(os.homedir(), "image-resizer")
  resizeImage(options)
})

//Resize Image
async function resizeImage({imgPath, width, height, dest}) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height
    })

    const newFileName = path.basename(imgPath);

    if(!fs.existsSync('dest')){
      fs.mkdirSync(dest);
    }

    fs.writeFileSync(path.join(dest, newFileName), newPath);

    mainWindow.webContents.send('image:done');

    shell.openPath(dest)


    


  } catch (error) {
    console.log(error)
  }
}

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});
