import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
// const { ipcRenderer } = window.electron;
const { api } = window;

function App() {

  const [isDownloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFileName, setFileName] = useState("");

  useEffect(() => {
    api.recieve("download-progress", (args) => {
      const progress = args[0];
      setDownloadProgress(progress.percent * 100);
    });
    api.recieve("download-complete", (args) => {
      const downloadedItem = args[0];
      setFileName(downloadedItem.path.split('/').pop());
    })
  }, []);

  const download = (url) => {
    setDownloading(true);
    api.send("download", {
      payload: {
        url
      }
    });
  }
  return (
    <div className="App">
      <header className="App-header">
        <button
          onClick={() => download("https://btweb-assets.bittorrent.com/installer/BitTorrentWeb.dmg")}
        >
          Download
        </button>
        {isDownloading && 
          downloadProgress < 100 ? <p>Download Progress: {downloadProgress}</p> : <p>Downloaded file {downloadFileName}</p>
        }
        {/* <a href="./assets/logo512.png" download>Download Local</a> */}
      </header>
    </div>
  );
}

export default App;
