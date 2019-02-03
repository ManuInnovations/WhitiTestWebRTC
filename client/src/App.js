import React, { Component } from 'react';
import Peer from 'simple-peer'

import './App.css';

class App extends Component {
  startBroadcasting () {
    const bPeer = new Peer({ initiator: true })
  }

  render() {
    return (
      <div className="App">
        <div>
          <button>start broadcasting</button>
        </div>
        <div>
          <h1>BROADCASTERS</h1>
        </div>
      </div>
    );
  }
}

export default App;
