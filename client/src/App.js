import React, { Component } from 'react';
import Peer from 'simple-peer'
import signalhub from 'signalhub'
import cuid from 'cuid'

import './App.css';

class App extends Component {
  constructor () {
    super()
    this.state = {
      channelName: '',
      peer: null,
      hub: signalhub('test-whiti', [ 'localhost:8080' ])
    }
  }

  createPeer = ({ isInitiator, signalCb }) => {
    return new Peer({ initiator: isInitiator, trickle: false })
    .on('error', function (err) { console.log('error', err) })

    .on('signal', (data) => {
      signalCb(data)
    })

    .on('connect', () => {
      console.log('CONNECT')
      this.state.peer.send('whatever' + Math.random())
    })

    .on('data', function (data) {
      console.log('data: ' + data)
    })
  }

  connectChannel = () => {
    console.log('connecting channel')
    const { hub, channelName } = this.state
    const cid = cuid()

    hub.subscribe(channelName + `_${cid}`)
      .on('data', (signal) => {
        const parsedSignal = JSON.parse(signal)
        console.log(new Date().toLocaleTimeString(), 'msg in connect', parsedSignal)
        this.state.peer.signal(parsedSignal)
      })

    const signalCb = (data) => {
      hub.broadcast(channelName, JSON.stringify(Object.assign(data, { sender: cid })))
    }

    const peer = this.createPeer({ isInitiator: true, signalCb })
    this.setState({ peer })
  }

  startChannel = () => {
    console.log('starting channel')
    const { hub, channelName } = this.state
    let sender

    hub.subscribe(channelName)
      .on('data', (signal) => {
        const parsedSignal = JSON.parse(signal)
        sender = parsedSignal.sender
        console.log(new Date().toLocaleTimeString(), 'msg in start', parsedSignal)
        this.state.peer.signal(parsedSignal)
      })

    const signalCb = (data) => {
      hub.broadcast(channelName + `_${sender}`, JSON.stringify(data))
    }

    const peer = this.createPeer({ isInitiator: false, signalCb })
    this.setState({ peer })
  }

  updateChannelName = (ev) => {
    this.setState({
      channelName: ev.target.value
    })
  }

  render() {
    return (
      <div className="App">
        <div style={{ display: 'flex', flexDirection: 'column', width: '200px' }}>
          <input value={this.state.channelName} onChange={this.updateChannelName}></input>
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <button onClick={this.connectChannel}>CONNECT</button>
            <button onClick={this.startChannel}>START</button>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
