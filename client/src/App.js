import React, { Component } from 'react';
import Peer from 'simple-peer'

import './App.css';

class App extends Component {
  constructor () {
    super()
    this.state = {
      peer: null,
      incoming: '',
      outgoing: ''
    }
  }

  componentDidMount () {
    const p = new Peer({ initiator: window.location.hash === '#1', trickle: false })
    p.on('error', function (err) { console.log('error', err) })
    p.on('signal', (data) => {
      console.log('SIGNAL', JSON.stringify(data))
      this.setState({
        outgoing: JSON.stringify(data)
      })
    })

    p.on('connect', function () {
      console.log('CONNECT')
      p.send('whatever' + Math.random())
    })

    p.on('data', function (data) {
      console.log('data: ' + data)
    })

    this.setState({
      peer: p
    })
  }

  handleSubmit = () => {
    this.state.peer.signal(JSON.parse(this.state.incoming))
  }

  updateIncoming = (ev) => {
    this.setState({
      incoming: ev.target.value
    })
  }

  render() {
    return (
      <div className="App">
        <div>
          <textarea value={this.state.incoming} onChange={this.updateIncoming}></textarea>
          <button onClick={this.handleSubmit}>submit</button>
        </div>
        <pre id="outgoing"></pre>
      </div>
    );
  }
}

export default App;
