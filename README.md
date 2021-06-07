# How to download any file from your Electron App to a custom location in 5 steps

We have all come across use cases where we want our user to be able to download a file from our application. I know that in the world of web applications this seemed a pretty straightforward thing. Below we'll see how we can achieve this in an electron application.

Before jumping straight to the task at hand please make sure you are aware of these few basic terms that we are going to use while discussing the solution -

1. Main Process
2. Renderer Process
3. ipcRenderer
4. ipcMain

*If you are new to electron I would suggest you to read the below explanation, but if you're already aware of the basics and have been developing electron apps then you can skip the next section.*

## Electron Basics
### Main Process
The Main process is commonly the main.js that we define in our package.json as the entry point for our electron app. Main Process is the controller for the application, from the time it is opened to closed. It is also responsible for creating the App Menus and the renderer process as when needed and deemed fit. 

>*In chromium it is refered to as the Browser Process, but to avoid confusion with Renderer Process it is renamed to Main Process in Electron.*

### Renderer Process
As we know that electron is doing nothing but providing a wrapper around a web application to be run like any other application. So the renderer process is that browser window that electron opens up in it's environment to render your web page.

>*One of the key difference between running web pages in browser environment and electron is that electron users have the ability to interact with the operating system on a lower level which are restricted from the browsers*

### IpcRenderer
ipcRenderer is an event emitter used by Renderer Process (from inside of web pages) to communicate with the Main process. It can send synchronous and asynchronous messages to the main process and listen to messages from the main process. 

We will be using the send method of ipcRenderer to send message from renderer process to main process.

### IpcMain
ipcMain is an event emitter which is used in main process to listen to sync/async messages from the renderer process.

We will use ipcMain.on method to listen to the message sent using ipcRenderer.

<!-- ## Download a file which is part of your app -->

## Downoad file from URL

Suppose you have a URL of the file that you wish to download, but you just cannot use anchor tag willy nilly for cross domain requests (You ask why? because modern day browsers only allow downloads from the same domain). 

Then, what else can we do here? Remember when we said that with electron we can perform low level os interactions. This would mean if we cannot do cross domain requests from our renderer process, we can ask electron to do it for us. And, since electron is in a node environment this should be an easy task for it.

So to break it into steps, we'd have the following-

1. From the onClick handler, send a message to main process (consisiting of the file url) with the help of `ipcRenderer.send()` method.

    ```javascript
    const onDownload = (url) => {
        ipcRenderer.send("download",{
            payload: {
                fileURL: url
            }
        })
    }
    ```

2. Add a event listener in the Main Process to listen the channel used by ipcRenderer to send download message.

    ```javascript
    ipcMain.on("download", (event, {payload}) => {
        //handle download
    })
    ```

3. Inside the event listener use electron's inbuilt mechanism to download files from url. You can use `webContents.downloadURL()` or `session.downloadURL()` to download your file. 

    > *I'll be using `webContents.downloadURL()` but make sure to use both and find out what's the difference between them.*

    ```javascript
    ipcMain.on("download", (event, {payload}) => {
        mainWindow.webContents.downloadURL(payload.url)
    })
    ```

    check `webContents.downloadURL()` for more info from the electron docs.
4. Step 3 will open a Save as Dialog box in native UI and then you can save the file to desired location.

**Note:** Save as dialog box opened by webContents.downloadURL() has fixed properties such as default download location will be the downlods folder of your system, filename will be prefilled from the url.

## Customized save as dialog and progress tracking

For this section we are going to use `electron-dl` library to download our files `electron.dialog` to display a saveAs dialog before downloading the file.

To install `electron-dl` run

```bash
npm install electron-dl --save 
```

import the `download` method from `electron-dl`

```javascript
const { download } = require('electron-dl');
```

Now let's modify the above 4 steps to add customization

1. Add custom fileName and default app-wide destination directory for downloads. (You can mantain a app-wide directory for downloads using a configuration menu in the UI). For the sake of explanation, I'll consider it as `documents` instead of `downloads`.

    Now, we'll send the custom fileName and directory to the main process as payload from ipcRenderer.

    ```javascript
    ipcRenderer.send("download", {
      payload: {
        url,
        properties: {
            fileName,
            directory
        }
      }
    });
    ```

    In the main process we'll update our event listener to achieve the following

    ```javascript
    ipcMain.on("download", async(event, {payload}) => {
        // Create a saveAs Dialog based on properties in payload.

        // If clicked on Save in the dialog, use the fileName & directory to save the file using download method from electron-dl.

        // give callbacks to download method to catch error, track progress & get completion state
    })
    ```

2. We'll check for the properties object recieved by the main process and show a save as dialog based on them.
    ```javascript
    //import dialog from electron
    const {dialog} = require('electron');
        Or
    const dialog = electron.dialog; //if electron is imported already;
    
    ipcMain.on("download", async(event, {payload}) => {
        let properties = payload.properties ? {...payload.properties} : {};
        const defaultPath = app.getPath("downloads");
        const defaultFileName = properties.filename ? 
            properties.filename : 
            payload.url.split('?')[0].split('/').pop();

        let customURL = dialog.showSaveDialogSync({
            defaultPath: `${defaultPath}/${defaultFileName}`
        });
    })
    ```
3. customURL will be undefined if the dialog was canceled, otherwise it will have the destination and filename as set by user. The structure of the cutom url will eb like this `"<directory-path>/<filename>"` Saving the file using download method.

    ```javascript
    if(customURL){
        let filePath = customURL.split('/');
        let filename = `${filePath.pop()}`;
        let directory = filePath.join('/');
        properties = {...properties, directory, filename};
        await download(BrowserWindow.getFocusedWindow(), payload.url, { ...properties } );
        
    } else { /*save cancelled*/ }
    ```
4. This much is enough to download the file but I'm guessing you'd want the user of your app to know the progress of downloalds. To do this we can add callbacks for certain events that are handled by `electron-dl`.
    ```javascript
    properties = {
        ...properties,
        onProgress: (progress) => {
            mainWindow.webContents.send("download-progress", progress)
        },
        onCompleted: (item) => {
            mainWindow.webContents.send("download-complete", item)
        }
    }
    ```

    By the end of Step 4 your event handler will look like this
    ```javascript
    ipcMain.on("download", async(event, {payload}) => {
        let properties = payload.properties ? {...payload.properties} : {};

        const defaultPath = app.getPath("downloads");
        const defaultFileName = properties.filename ? 
            properties.filename : 
            payload.url.split('?')[0].split('/').pop();

        let customURL = dialog.showSaveDialogSync({
            defaultPath: `${defaultPath}/${defaultFileName}`
        });
        if(customURL){
            let filePath = customURL.split('/');
            let filename = `${filePath.pop()}`;
            let directory = filePath.join('/');
            properties = {...properties, directory, filename};
            
            await download(BrowserWindow.getFocusedWindow(), payload.url, {
                ...properties,
                onProgress: (progress) => {
                    mainWindow.webContents.send("download-progress", progress)
                },
                onCompleted: (item) => {
                    mainWindow.webContents.send("download-complete", item)
                }
            });
            
        } else { /*save cancelled*/ }
    })
    ```
5. Finally you have to listen to the updates in the renderer process and make necessary changes. For that we'll listen to `download-progress` and `download-complete` channels with ipcRenderer.
    ```javascript
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadFileName, setFileName] = useState("");

    useEffect(() => {
        ipcRenderer.on("download-progress", (event, args) => {
            const progress = args[0];
            setDownloadProgress(progress.percent * 100);
        });
        ipcRenderer.on("download-complete", (event, args) => {
            const downloadedItem = args[0];
            setFileName(downloadedItem.path.split('/').pop());
        })
    }, []);
    ```
    With this you have the progress of the file when it is downloading and downloadedItem when the file has downloaded. Now it's up to you how you want to present it.

## Summary
You have various methods to download your file from urls and it's really up to you how much control do you want to have over every aspect of your app. In this article I have ust covered the bare minimum of these libraries and electron's factory classes. I trust you'll go through the official docs of these libraries and explore what other awesome features they have provided.

***There is a possibilty that you might be facing difficulty with accessing ipcRenderer inside of your UI Components with higher versions of Electron or some UI frameworks like React/Angular, keep an eye out for my upcoming article in which I'll discuss various techniques you can use to access ipcRenderer and other node modules inside your renderer process.***